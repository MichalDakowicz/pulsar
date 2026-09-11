# One database, four apps

Radar (films), Sonar (records), Lidar (books) and Pulsar (habits) run on the **same
Supabase project**. Not copies, not a sync — the same rows. This is a deliberate
constraint: the free plan is one project, and all four apps belong to the same person, so
the alternative was four accounts and four friend lists for one human.

The cost is a coupling that has to be respected. This file is Pulsar's half of the
contract; `../../lidar/docs/shared-database.md` and `../../sonar/docs/shared-database.md`
are the siblings' halves, and say the same things.

## What is shared

| Table / function                                                                   | Owner | Pulsar's use                                                                     |
| ---------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `public.profiles`                                                                  | Radar | Read; writes username / display name / avatar. **Never** touches `favorites`.    |
| `public.friendships`                                                               | Radar | Read; writes via the RPCs below.                                                 |
| `public.friend_requests`                                                           | Radar | Read; inserts its own requests.                                                  |
| `public.user_settings`                                                             | Radar | Reads and writes **only** `friends_visibility` and `theme`.                      |
| `private.can_view(uuid)`                                                           | Radar | Every Pulsar read policy calls it.                                               |
| `accept_friend_request`, `decline_friend_request`, `remove_friend`, `can_view_user` | Radar | Called as-is.                                                                    |

Consequences worth stating plainly, because they are user-visible:

- **One identity.** Renaming yourself or changing your avatar in Pulsar renames you in
  Radar, Sonar and Lidar. The login is the same login — the same account, the same session
  on web.
- **One friend list.** Accepting a request in any of the four makes you friends in all
  four. A friend you remove is removed everywhere.
- **One privacy switch.** `friends_visibility` gates the film shelf, the record shelf, the
  bookshelf and the habit streaks together. "Friends only" meaning four different things
  in four apps would be a way to leak something you thought you had closed, so it
  deliberately does not.
- **One theme preference.** `user_settings.theme` is shared for the same reason.

## What is Pulsar's own

Planned: `habits`, `habit_entries`, and whatever social surface follows (activity,
reactions). All to be created by `supabase/schema.sql`, all RLS'd with the same
owner-writes / visible-reads shape Radar, Sonar and Lidar use.

Nothing has been applied to the project yet — this section is the intent, not the state.
Update it in the same commit that adds the schema.

## Rules

- Radar's `supabase/schema.sql` is the prerequisite. Pulsar's file starts by checking the
  shared tables exist and raising if they do not.
- `supabase/schema.sql` is idempotent and applied by hand (Dashboard → SQL Editor → paste
  → Run). It never drops a table, a column or a row.
- Adding a column means an `alter table ... add column if not exists` under the COLUMN
  MIGRATIONS heading — editing the `create table` does nothing on a live database.
- Never write a sibling's table. The only writes outside Pulsar's own tables are the two
  shared `user_settings` columns and the profile fields listed above.
- A new Pulsar table gets RLS enabled in the same statement block that creates it, keyed
  to `auth.uid()`, with reads gated by `private.can_view`.
