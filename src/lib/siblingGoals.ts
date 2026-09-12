/**
 * Lidar's reading goal, as Pulsar has to guess it.
 *
 * Lidar keeps `weeklyPages` in device-local MMKV rather than on the shared
 * `user_settings` row, so there is nothing in the database for Pulsar to read.
 * Its default is the honest starting point, and Settings lets it be corrected —
 * an approximate number with a dial beats a missing row, and beats silently
 * scoring someone's reading against a goal that is not theirs.
 */

export const DEFAULT_WEEKLY_PAGES = 150;
export const MIN_WEEKLY_PAGES = 1;
export const MAX_WEEKLY_PAGES = 20_000;

export function clampWeeklyPages(pages: number): number {
  if (!Number.isFinite(pages)) return DEFAULT_WEEKLY_PAGES;
  return Math.min(MAX_WEEKLY_PAGES, Math.max(MIN_WEEKLY_PAGES, Math.round(pages)));
}
