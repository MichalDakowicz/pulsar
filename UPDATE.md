# Update notes

## 1.5.0 — Unreleased

### Added

- Sign-in screen: continue with bazaar when it is installed on this phone
- Builder: type any unit for a counter, with the common ones underneath to tap
- Habits: check a habit twice or three times a day, each check with its own streak

### Changed

- Builder: a habit is one sentence, and tapping any part of it changes that part
- Builder: a weekly total is an answer to when it is due, and each habit says what a miss is
- Streaks: a counter day that ends under its target is a miss from today; the wall still shades it
- Sign-in screen: ping apps on this phone sit behind one choose an app button
- Today: holding plus or minus on a counter opens a sheet of bigger steps, like +5 and +10

### Fixed

- Today: the bars under radar's streak are blue for films and purple for episodes, not amber
- Sign-in screen: continuing with an app that is already open now signs you in
- The app icon, splash and web favicon are the same size as the other Ping apps

## 1.4.0 — 2026-10-01

### Added

- Sign-in screen: scan a QR code shown by a signed-in phone to get in, or show one on the web
- Settings: show a code that signs another device in, or scan a browser's code to let it in

### Changed

- Android: signed with a new key, so remove the old version once before installing

## 1.3.0 — 2026-09-30

### Added

- Sign-in screen can continue with a Ping app already signed in on this phone
- Android: a new-version notice shows release notes and remembers Later for that version
- Settings: check for updates and download the latest Android build from About

### Changed

- Today and Habits: each habit is a card with four months of its wall and a corner button
- Today: counters take a tap on plus for one and a long press for a bigger jump
- Today: the wall section is gone, since every card now carries its own
- Today: open habits list first, then counters, done, full counters and set aside
- Today: an avoid habit's corner check logs a slip today, and tapping it again takes it back
- Settings: signing out asks whether to leave just Pulsar or every Ping app

### Fixed

- Walls and Stats charts show part-done and frozen days in amber instead of blank squares
- Android notification icons are larger and show the mark without a background

## 1.2.1 — 2026-09-16

### Fixed

- A habit that fails to save now says why, instead of only that it did not
- A missing table or column now names the migration to run, on writes as well as reads

## 1.2.0 — 2026-09-16

### Added

- Builder: a count or timer habit can owe its target over the week instead of the day
- Today: a counter habit has a stepper, so you log what you did as you do it
- Builder: choose whether a counter stops at its target or keeps taking more
- Streaks: a weekly target only breaks on a week that finished short, never on a quiet day
- Streaks: the wall fills a day by how much of the week it did

### Fixed

- Checking off a counter habit now logs the whole target instead of a single one

## 1.1.0 — 2026-09-15

### Added

- Today: a today / yesterday switch, so an avoid habit is answered under the day it is about
- Builder: pick a habit that runs n times a week — any days, the week is what adds up
- Streaks: a weekly habit only breaks on a week that finished short, never on a quiet day
- Today: swipe the radar streak to turn it over between films and episodes
- Editing a habit's cadence, target or miss rule now asks how far back the change goes

### Fixed

- Editing a habit no longer moves the day it started, which cut the wall short
- An avoid habit counts a quiet day as clean from now on — only a logged slip breaks it

## 1.0.0 — 2026-09-15

### Added

- A pulsar scope for a mark, the same ring and blip radar, lidar and sonar wear
- Sign in with google, or with the email and password you already use in the other three
- Today: check a habit off with a swipe or a press and hold, and undo it from the toast
- Today: a ring that counts only the habits actually due today, so a rest day is not a miss
- Today: habits that are not scheduled today collapse under a "not due today" row
- Today: an avoid habit is asked about yesterday — a clean day is only clean once it is over
- Today: log a slip the day it happens, and that day stays broken until you clear it
- Today: your radar and lidar streaks appear alongside your habit ones, as each app reports them
- Habits: every habit in one list, with an archive you can restore from
- Habit detail: the twelve-week wall, the ladder, freeze tokens and repairs
- Habit detail: fill in yesterday, or days you were away, without spending a token
- Builder: 24 marks to pick a habit by, from the abstract ones to flame, book, weight and ban
- Builder: five steps to a habit — name, target, nudges, what a miss costs, and your word
- Streaks: pick strict, one forgiven miss a week, or a miss costing three days
- Streaks: freeze tokens, one earned every 14 perfect days, capped at three
- Social: pacts — one habit each with a friend, both sides visible, either side can end it
- Stats: the week, your weakest weekday, and a hit rate per habit
- Reminders: habits with a time now actually nudge you, on the schedule you set them
- Reminders: a habit you have already checked off today goes quiet for the rest of the day
- Reminders: a streak warning at 21:00 that reads your pledge back to you
- Settings: how hard pulsar pushes, follow-ups, streak warnings and quiet hours
- Tapping a reminder opens the habit; tapping a streak warning opens the rescue screen
- Today: swipe a checked-off row back the other way to undo it, in either check-in mode
- Settings: privacy and theme, shared with radar, lidar and sonar
