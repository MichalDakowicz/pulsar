import { addDays, dayRange } from "@/lib/dates";

/**
 * Which past days may still be answered.
 *
 * Yesterday is always open: people check in the next morning, and an app that
 * makes you spend a repair token for a day you did hold — and remember holding
 * — teaches you that the wall is a record of when you opened the app rather
 * than of what you did.
 *
 * Past yesterday the window is the stretch the app was never opened. A phone
 * left in a drawer for a week is not seven missed days, and asking for seven
 * tokens to say so is the version people answer by lying to the wall. Anything
 * older than that is history someone else's memory wrote, and stays behind the
 * repair token.
 *
 * Days are `YYYY-MM-DD`, so plain string comparison is chronological.
 */

/** The furthest back a gap can reach. A phone lost for a year is not a backfill. */
export const MAX_BACKFILL_DAYS = 30;

/**
 * The oldest day still open for a free edit.
 *
 * `lastOpenedOn` is the day the app was last opened *before this session* — the
 * store keeps the previous value rather than stamping today, because a window
 * computed after the stamp is always exactly one day wide.
 */
export function backfillFrom(
  today: string,
  lastOpenedOn: string | null | undefined,
  maxDays: number = MAX_BACKFILL_DAYS,
): string {
  const yesterday = addDays(today, -1);
  const floor = addDays(today, -Math.max(1, maxDays));
  if (!lastOpenedOn) return yesterday;
  // The gap starts the day after the last visit: that day was seen.
  const afterLast = addDays(lastOpenedOn, 1);
  const from = afterLast < yesterday ? afterLast : yesterday;
  return from < floor ? floor : from;
}

/** Every day open for a free edit, newest first. Today is not one of them. */
export function backfillDays(
  today: string,
  lastOpenedOn: string | null | undefined,
  maxDays: number = MAX_BACKFILL_DAYS,
): string[] {
  const yesterday = addDays(today, -1);
  const from = backfillFrom(today, lastOpenedOn, maxDays);
  if (from > yesterday) return [];
  return dayRange(from, yesterday).reverse();
}

/**
 * Whether one day can be edited for free. Today is excluded on purpose: it is
 * not a backfill, it is the check-in, and it has its own gesture.
 */
export function isBackfillable(
  day: string,
  today: string,
  lastOpenedOn: string | null | undefined,
  maxDays: number = MAX_BACKFILL_DAYS,
): boolean {
  if (day >= today) return false;
  return day >= backfillFrom(today, lastOpenedOn, maxDays);
}

/** "yesterday", "the 4 days you were away" — what the window is, in words. */
export function backfillLabel(days: string[]): string {
  if (days.length === 0) return "nothing to fill in";
  if (days.length === 1) return "yesterday";
  return `the ${days.length} days you were away`;
}
