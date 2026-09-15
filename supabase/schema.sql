-- ============================================================================
-- Pulsar — schema
--
-- Idempotent, and applied by hand: Supabase Dashboard -> SQL Editor -> paste ->
-- Run. It never drops a table, a column or a row.
--
-- This project is shared with Radar, Lidar and Sonar (docs/shared-database.md).
-- Everything Pulsar creates is namespaced `habit_*` so it cannot collide with a
-- sibling, every table has RLS keyed to auth.uid(), and every read that is not
-- the owner's own goes through Radar's private.can_view().
--
-- Adding a column later means an `alter table ... add column if not exists`
-- under COLUMN MIGRATIONS at the bottom — editing a `create table` does nothing
-- on a live database.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Prerequisites
--
-- Radar's schema.sql is the foundation: it owns profiles, friendships,
-- user_settings and private.can_view, and Pulsar reads all four. Running this
-- file first would create tables whose policies reference a function that does
-- not exist, which fails late and half-applied — so it fails early instead.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.friendships') is null
     or to_regclass('public.user_settings') is null then
    raise exception
      'Pulsar requires the shared tables. Run the Radar supabase/schema.sql first.';
  end if;

  if to_regprocedure('private.can_view(uuid)') is null then
    raise exception
      'private.can_view(uuid) is missing. Run the Radar supabase/schema.sql first.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Habits
--
-- The cadence is three columns rather than one jsonb blob because the schedule
-- is queried, not just rendered: `cadence_days` is what a server-side reminder
-- generator would filter on, and a blob would make that a sequential scan over
-- every habit in the table.
-- ----------------------------------------------------------------------------
create table if not exists public.habits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  -- Key into the mark table (src/components/marks). Text, not an enum: adding
  -- a glyph should not need a migration.
  mark           text not null default 'pulse',
  -- do | avoid | count | timer. `count` and `timer` can be part-done, which is
  -- the only reason the distinction exists in the data.
  kind           text not null default 'do',
  target         int  not null default 1,
  unit           text not null default '',
  -- daily | weekdays | days | interval
  cadence_kind   text not null default 'daily',
  -- 0 = Monday .. 6 = Sunday. Only read when cadence_kind = 'days'.
  cadence_days   int[] not null default '{}',
  -- Only read when cadence_kind = 'interval'; counted from started_on.
  cadence_every  int  not null default 2,
  -- open | 30 | 66 | 100
  challenge      text not null default 'open',
  -- exact | morning | evening | anytime. `anytime` means no clock and no nudge.
  nudge_window   text not null default 'exact',
  -- 'HH:MM', sorted. Empty when the habit has no clock.
  times          text[] not null default '{}',
  escalate       boolean not null default true,
  -- strict | grace | decay. Forced to strict when hard is true; the client keeps
  -- the two in step (lib/habit.effectiveRule) so they cannot disagree.
  streak_rule    text not null default 'strict',
  hard           boolean not null default false,
  public_shelf   boolean not null default false,
  -- The "mark my word" line, read back on the night a streak is about to break.
  pledge         text not null default '',
  why            text not null default '',
  started_on     date not null default current_date,
  archived_at    timestamptz,
  sort           int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists habits_user_id_sort_idx     on public.habits (user_id, sort);
create index if not exists habits_user_id_archived_idx on public.habits (user_id, archived_at);

-- ----------------------------------------------------------------------------
-- 2. Entries — one row per habit per day it was resolved
--
-- `state` carries the whole day, and the four values are not interchangeable:
--   held     — done.
--   frozen   — a token was spent. The streak survives; the day stays empty.
--   repaired — a past miss filled in. Counts as held.
--   skipped  — an explicit "not today". Neither holds nor breaks.
-- A day with no row is a miss once it is over, and nothing while it is not.
--
-- The unique constraint on (habit_id, day) is what makes a double tap idempotent
-- rather than a second streak day.
-- ----------------------------------------------------------------------------
create table if not exists public.habit_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  habit_id   uuid not null references public.habits(id) on delete cascade,
  day        date not null,
  state      text not null default 'held',
  -- What was logged, for count/timer habits. 1 for a plain hold.
  amount     int  not null default 1,
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);

create index if not exists habit_entries_user_day_idx  on public.habit_entries (user_id, day desc);
create index if not exists habit_entries_habit_day_idx on public.habit_entries (habit_id, day desc);

-- ----------------------------------------------------------------------------
-- 3. Freeze token ledger
--
-- A ledger rather than a counter, because "you have 2 tokens" is a claim the app
-- has to be able to justify: the balance is earned minus spent, and both halves
-- keep the day they happened on, so a token spent last Tuesday still shows on
-- the wall next to the day it saved.
-- ----------------------------------------------------------------------------
create table if not exists public.habit_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- +1 earned, -1 spent. Never anything else.
  delta      int  not null,
  -- earned | freeze | repair
  reason     text not null,
  habit_id   uuid references public.habits(id) on delete set null,
  day        date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists habit_tokens_user_idx on public.habit_tokens (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Pacts
--
-- Two people, one habit each, watching one another. The partner habit is
-- nullable so a pact can be offered before the other side has made their half of
-- it — accepting is what fills `partner_habit_id` in.
--
-- Friendship is the prerequisite, enforced in the policy below rather than by a
-- constraint: friendships live in Radar's table, and a foreign key across an
-- ownership boundary is exactly the coupling docs/shared-database.md warns off.
-- ----------------------------------------------------------------------------
create table if not exists public.habit_pacts (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  partner_id       uuid not null references auth.users(id) on delete cascade,
  habit_id         uuid not null references public.habits(id) on delete cascade,
  partner_habit_id uuid references public.habits(id) on delete set null,
  -- pending | active | declined | ended
  state            text not null default 'pending',
  created_at       timestamptz not null default now(),
  responded_at     timestamptz,
  ended_at         timestamptz,
  -- One live pact per habit per partner; a re-invite updates rather than stacks.
  unique (habit_id, partner_id)
);

create index if not exists habit_pacts_owner_idx   on public.habit_pacts (owner_id, state);
create index if not exists habit_pacts_partner_idx on public.habit_pacts (partner_id, state);

-- ----------------------------------------------------------------------------
-- 5. Nudges — one person poking another about one habit
--
-- Rate limiting is a unique index on the day rather than application logic: a
-- partner who can nudge you eleven times before lunch is a partner you block,
-- and the constraint is the only place that cannot be forgotten.
-- ----------------------------------------------------------------------------
create table if not exists public.habit_nudges (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references auth.users(id) on delete cascade,
  to_id      uuid not null references auth.users(id) on delete cascade,
  habit_id   uuid not null references public.habits(id) on delete cascade,
  day        date not null default current_date,
  seen_at    timestamptz,
  created_at timestamptz not null default now(),
  unique (from_id, habit_id, day)
);

create index if not exists habit_nudges_to_idx on public.habit_nudges (to_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 6. Pulsar's own settings
--
-- Not columns on user_settings: that row is Radar's, and the contract lets
-- Pulsar write exactly two of its columns. These are account facts rather than
-- device ones — a nudge level set on the phone should hold on the web build —
-- which is why they are here and not in MMKV.
-- ----------------------------------------------------------------------------
create table if not exists public.habit_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  -- gentle | firm | relentless
  nudge_level          text not null default 'firm',
  escalate             boolean not null default true,
  risk_alerts          boolean not null default true,
  partner_nudges       boolean not null default true,
  quiet_hours          boolean not null default true,
  quiet_start          int not null default 23,
  quiet_end            int not null default 7,
  -- swipe | hold
  checkin_mode         text not null default 'swipe',
  -- Pages a week the Lidar streak is scored against. Lidar keeps its own goal in
  -- device-local storage, so Pulsar cannot read it and keeps an estimate here.
  reading_weekly_goal  int not null default 150,
  show_sibling_streaks boolean not null default true,
  onboarded_at         timestamptz,
  updated_at           timestamptz not null default now()
);

-- ============================================================================
-- RLS
--
-- Owner writes, visible reads. The read half calls the Radar private.can_view,
-- so one privacy switch closes the film shelf, the bookshelf, the record shelf
-- and the habit wall together — which is the point of sharing the column.
-- ============================================================================

alter table public.habits         enable row level security;
alter table public.habit_entries  enable row level security;
alter table public.habit_tokens   enable row level security;
alter table public.habit_pacts    enable row level security;
alter table public.habit_nudges   enable row level security;
alter table public.habit_settings enable row level security;

-- A pact's rows have to be readable by both sides regardless of the habit's own
-- shelf setting: agreeing to be watched is consent, and a partner who cannot see
-- whether you held today is not a partner. Security definer so the lookup sees
-- the pact row even when the caller's own RLS would filter it.
create or replace function private.in_pact_over(p_habit uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.habit_pacts p
    where p.state = 'active'
      and (p.habit_id = p_habit or p.partner_habit_id = p_habit)
      and (p.owner_id = auth.uid() or p.partner_id = auth.uid())
  );
$$;
revoke all on function private.in_pact_over(uuid) from public;
grant execute on function private.in_pact_over(uuid) to authenticated;

-- CREATE POLICY has no `if not exists` and no `or replace`, so each is dropped
-- and re-created. The pair runs inside the SQL Editor single transaction, so
-- there is no window where a table sits unprotected.

drop policy if exists habits_owner_all on public.habits;
create policy habits_owner_all on public.habits for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Only habits the owner put on the shelf, and only to someone the shared privacy
-- switch lets in. A private habit is invisible even to a friend — except to a
-- pact partner, who was told about that habit by name when they accepted.
drop policy if exists habits_visible_read on public.habits;
create policy habits_visible_read on public.habits for select
  to anon, authenticated using (
    (public_shelf and archived_at is null and private.can_view(user_id))
    or private.in_pact_over(id)
  );

drop policy if exists habit_entries_owner_all on public.habit_entries;
create policy habit_entries_owner_all on public.habit_entries for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- An entry inherits its habit's visibility. The subquery is against habits,
-- whose own policy has already decided the question.
drop policy if exists habit_entries_visible_read on public.habit_entries;
create policy habit_entries_visible_read on public.habit_entries for select
  to anon, authenticated using (
    exists (select 1 from public.habits h where h.id = habit_id)
  );

drop policy if exists habit_tokens_owner_all on public.habit_tokens;
create policy habit_tokens_owner_all on public.habit_tokens for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Either side of a pact may read it; only the owner may offer one, and only the
-- partner may answer. `with check` on insert also demands the friendship, so a
-- pact cannot be used to reach someone who never accepted you.
drop policy if exists habit_pacts_read on public.habit_pacts;
create policy habit_pacts_read on public.habit_pacts for select
  to authenticated using ((select auth.uid()) in (owner_id, partner_id));

drop policy if exists habit_pacts_insert on public.habit_pacts;
create policy habit_pacts_insert on public.habit_pacts for insert
  to authenticated with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.friendships f
      where f.user_id = owner_id and f.friend_id = partner_id
    )
  );

drop policy if exists habit_pacts_update on public.habit_pacts;
create policy habit_pacts_update on public.habit_pacts for update
  to authenticated using ((select auth.uid()) in (owner_id, partner_id))
  with check ((select auth.uid()) in (owner_id, partner_id));

drop policy if exists habit_pacts_delete on public.habit_pacts;
create policy habit_pacts_delete on public.habit_pacts for delete
  to authenticated using ((select auth.uid()) = owner_id);

-- You may nudge someone you are in an active pact with, and nobody else.
drop policy if exists habit_nudges_read on public.habit_nudges;
create policy habit_nudges_read on public.habit_nudges for select
  to authenticated using ((select auth.uid()) in (from_id, to_id));

drop policy if exists habit_nudges_insert on public.habit_nudges;
create policy habit_nudges_insert on public.habit_nudges for insert
  to authenticated with check (
    (select auth.uid()) = from_id
    and exists (
      select 1 from public.habit_pacts p
      where p.state = 'active'
        and (p.habit_id = habit_id or p.partner_habit_id = habit_id)
        and ((p.owner_id = from_id and p.partner_id = to_id)
          or (p.partner_id = from_id and p.owner_id = to_id))
    )
  );

-- Marking a nudge seen is the recipient write, not the sender one.
drop policy if exists habit_nudges_update on public.habit_nudges;
create policy habit_nudges_update on public.habit_nudges for update
  to authenticated using ((select auth.uid()) = to_id)
  with check ((select auth.uid()) = to_id);

drop policy if exists habit_settings_owner_all on public.habit_settings;
create policy habit_settings_owner_all on public.habit_settings for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

create or replace function public.habits_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists habits_touch on public.habits;
create trigger habits_touch before update on public.habits
  for each row execute function public.habits_touch_updated_at();

drop trigger if exists habit_settings_touch on public.habit_settings;
create trigger habit_settings_touch before update on public.habit_settings
  for each row execute function public.habits_touch_updated_at();

-- ============================================================================
-- Realtime
--
-- The tabs subscribe to their own rows so a check-in on the phone lands on the
-- web build without a refetch, and so a partner hold appears on your pact card
-- the moment it happens.
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.habits;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.habit_entries;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.habit_pacts;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.habit_nudges;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ============================================================================
-- COLUMN MIGRATIONS
--
-- Everything added after the first deploy goes here, newest last. Never edit a
-- create table above — on a live database the create is skipped entirely.
-- ============================================================================

-- Stretches of a habit's past still judged by rules it has since changed.
-- jsonb rather than a table: it is read on every habit fetch and never queried
-- across rows, and a habit that has had its cadence changed twice is unusual
-- enough that a join to find that out would cost every habit that has not.
-- Shape: [{"from":"YYYY-MM-DD","to":"YYYY-MM-DD","cadence":{...},"rule":"strict","target":1}]
-- Written and read only by Pulsar (src/lib/phases.ts), which drops anything in
-- here it cannot make sense of rather than trusting the column.
alter table public.habits
  add column if not exists phases jsonb not null default '[]'::jsonb;

-- How many days a week a `weekly` cadence owes. Its own column rather than
-- reusing cadence_every: that one means "every N days", and a single int
-- carrying two unrelated meanings is how a 3-times-a-week habit ends up being
-- read as every-third-day by the next thing that touches it.
alter table public.habits
  add column if not exists cadence_per_week int not null default 3;
