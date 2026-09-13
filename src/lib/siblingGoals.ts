/**
 * Lidar's reading goal, as Pulsar has to assume it.
 *
 * Lidar keeps `weeklyPages` in device-local MMKV rather than on the shared
 * `user_settings` row, so there is nothing in the database for Pulsar to read
 * and no way to ask. Its default is the honest starting point and the only one
 * Pulsar uses — the cross-app strip is a glance at another app's progress, not
 * a scoreboard, and a dial asking someone to retype a number they already set
 * in Lidar bought less than it cost in settings clutter.
 *
 * `habit_settings.reading_weekly_goal` still backs it, so a per-account goal
 * can come back without a migration if the strip ever earns one.
 */

export const DEFAULT_WEEKLY_PAGES = 150;
