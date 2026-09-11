# Pulsar

Habit tracker. React Native / Expo app, Android-first, with a web build on Firebase
Hosting.

Sibling to [Radar](https://github.com/MichalDakowicz/radar) (movies & shows),
[Lidar](https://github.com/MichalDakowicz/lidar) (books) and
[Sonar](https://github.com/MichalDakowicz/sonar) (music) — all four share one Supabase
project, so an account, its profile, friends and theme are the same everywhere.

## Status

Scaffolding. No app code yet — `CLAUDE.md` holds the working agreement the build will
follow.

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
| Deploy web     | `npm run deploy:web`            |
