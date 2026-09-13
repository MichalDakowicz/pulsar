# Pulsar

Habit tracker. React Native / Expo app, Android-first, with a web build on Firebase
Hosting.

Sibling to [Radar](https://github.com/MichalDakowicz/radar) (movies & shows),
[Lidar](https://github.com/MichalDakowicz/lidar) (books) and
[Sonar](https://github.com/MichalDakowicz/sonar) (music) — all four share one Supabase
project, so an account, its profile, friends and theme are the same everywhere. Today
also shows the streaks you already have in Radar and Lidar, read-only
(`docs/shared-database.md`).

## What it does

- **Today** — check a habit off with a swipe or a hold. The ring counts only what was
  actually due, so a habit you do three days a week does not read as missed on the other
  four.
- **Streaks** — strict, one forgiven miss a week, or a miss that costs three days. Freeze
  tokens hold a streak through one missed day; you earn one every 14 perfect days and
  cannot buy them.
- **Pacts** — one habit each with a friend, both sides visible, either side can end it.
- **The wall** — every day since the habit started, with rest days drawn as rest rather
  than as holes.
- **The pledge** — the sentence you wrote about why, read back to you on the night a
  streak is about to break. Nothing in Pulsar costs money; your word is the whole stake.

## Setup

1. Run Radar's `supabase/schema.sql` first — it owns the shared tables.
2. Run this repo's `supabase/schema.sql` (Dashboard → SQL Editor → paste → Run). It
   raises early if step 1 has not happened.
3. `.env` needs `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Stack

Expo Router · NativeWind · Supabase · TanStack Query · Zustand + MMKV

## Commands

| Task           | Command                         |
| -------------- | ------------------------------- |
| Dev server     | `npm start`                     |
| Android device | `npx expo run:android --device` |
| Tests          | `npm test`                      |
| Lint           | `npm run lint`                  |
| Types          | `npx tsc --noEmit`              |
| Icons          | `npm run icons`                 |
| Deploy web     | `npm run deploy:web`            |
