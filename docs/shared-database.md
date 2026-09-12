# One database, four apps

Radar (films), Sonar (records), Lidar (books) and Pulsar (habits) run on the **same
Supabase project**. Not copies, not a sync — the same rows. This is a deliberate
constraint: the free plan is one project, and all four apps belong to the same person, so
the alternative was four accounts and four friend lists for one human.

The cost is a coupling that has to be respected. This file is Pulsar's half of the
contract; `../../lidar/docs/shared-database.md` and `../../sonar/docs/shared-database.md`
are the siblings' halves, and say the same things.

## What is shared

| Table / function                                                                     | Owner | Pulsar's use                                                                  |
| ------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------- |
| `public.profiles`                                                                    | Radar | Read; writes username / display name. **Never** touches `favorites`.          |
| `public.friendships`                                                                 | Radar | Read only. A pact requires one, and the insert policy checks it.              |
| `public.friend_requests`                                                             | Radar | Not used — Pulsar has no friend-management surface of its own.                |
| `public.user_settings`                                                               | Radar | Reads the row; writes **only** `friends_visibility` and `theme`.              |
| `public.book_progress`, `public.book_reads`                                          | Lidar | Read, own rows only, to derive the cross-app reading streak. Never written.   |
| `private.can_view(uuid)`                                                             | Radar | Every Pulsar shelf-read policy calls it.                                      |

Consequences worth stating plainly, because they are user-visible:

- **One identity.** Renaming yourself in Pulsar renames you in Radar, Sonar and Lidar.
  The login is the same login — the same account, the same session on web.
- **One friend list.** Accepting a request in any of the four makes you friends in all
  four. Pulsar never writes `friendships`; it only builds pacts on top of them.
- **One privacy switch.** `friends_visibility` gates the film shelf, the record shelf, the
  bookshelf and the habit wall together. "Friends only" meaning four different things in
  four apps would be a way to leak something you thought you had closed, so it
  deliberately does not.
- **One theme preference.** `user_settings.theme` is shared for the same reason.

## The cross-app streak strip

Today shows the streaks you already have in the other apps. It is **read-only in both
directions and one-way by design**:

- **Radar** already publishes its own figure to `user_settings.current_streak` and
  `streak_updated_at`, for its 20:00 streak-risk notification. Pulsar reads those two
  columns and never writes them — overwriting Radar's film streak with a habit count
  would silently break that notification. `lib/userSettings.settingsToRow` can only ever
  emit `theme` and `friends_visibility`, so this is enforced rather than remembered.
  A snapshot older than 48 hours is hidden rather than shown, because by then it may
  describe a streak that is already over.
- **Lidar** publishes nothing. Its weekly-pages streak is computed on the device and its
  goal lives in device-local MMKV, so there is no row for Pulsar to read. Pulsar derives
  the figure instead, from the page ledger Lidar does write (`book_progress`, plus
  `book_reads` for untracked finishes), using Lidar's own rule ported into
  `src/lib/siblingStreaks.ts`. The goal it is scored against is a setting in Pulsar,
  defaulting to Lidar's own default of 150 pages a week — an approximation with a dial,
  which is the honest version of not knowing.
- **Sonar** contributes nothing yet. When it starts publishing a streak, add it to
  `SIBLING_LABELS` and the strip picks it up.

If Lidar ever snapshots its own streak the way Radar does, the derivation in
`siblingStreaks.ts` is the thing to delete.

## What is Pulsar's own

Created by `supabase/schema.sql`, all namespaced so they cannot collide with a sibling,
all RLS'd with the same owner-writes / visible-reads shape the others use:

| Table                   | Holds                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `public.habits`         | One row per habit: name, kind, cadence, rule, pledge.              |
| `public.habit_entries`  | One row per habit per resolved day (`held`/`frozen`/`repaired`/`skipped`). |
| `public.habit_tokens`   | The freeze-token ledger. Spends only; earning is derived.          |
| `public.habit_pacts`    | Two people, one habit each, mutual visibility.                     |
| `public.habit_nudges`   | One partner poking another, capped at one a day by a unique index. |
| `public.habit_settings` | Pulsar's own account preferences.                                  |

`private.in_pact_over(uuid)` is Pulsar's, and it is the one thing that makes a *private*
habit visible to somebody else: a pact is explicit, named, two-sided consent, which is a
different thing from putting a habit on a public shelf.

## Rules

- Radar's `supabase/schema.sql` is the prerequisite. Pulsar's file starts by checking the
  shared tables and `private.can_view` exist, and raises if they do not.
- `supabase/schema.sql` is idempotent and applied by hand (Dashboard → SQL Editor → paste
  → Run). It never drops a table, a column or a row.
- Adding a column means an `alter table ... add column if not exists` under the COLUMN
  MIGRATIONS heading — editing the `create table` does nothing on a live database.
- Never write a sibling's table. The only writes outside Pulsar's own tables are the two
  shared `user_settings` columns and the profile fields listed above.
- A new Pulsar table gets RLS enabled in the same statement block that creates it, keyed
  to `auth.uid()`, with any non-owner read gated by `private.can_view`.
