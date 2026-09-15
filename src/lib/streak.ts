import { weekKey } from '@/lib/dates';
import { isTargetDay, targetDaysBetween, type Cadence } from '@/lib/schedule';

/**
 * The streak rules — the one piece of this app that has to be right.
 *
 * A streak is walked over *target days only* (lib/schedule): a Mon/Wed/Fri
 * habit is not broken by an empty Tuesday, because Tuesday was never owed.
 * Everything is computed forward from the day the habit started rather than
 * backwards from today, because `decay` has to know what the run was worth
 * before the miss took three days off it, and because one forward pass gives
 * the personal best for free.
 */

/**
 * What happened on one target day. A day with no entry is a miss, once it is
 * over — `broke` is the same outcome said out loud, which is what makes it
 * scoreable before the day is.
 */
export type EntryState = 'held' | 'frozen' | 'repaired' | 'skipped' | 'broke';

/** `YYYY-MM-DD` → what happened. Only target days are ever consulted. */
export type EntryMap = Record<string, EntryState | undefined>;

/**
 * What a miss costs.
 * - `strict` — one miss and the count is gone.
 * - `grace`  — the first miss in any Monday-anchored week is forgiven.
 * - `decay`  — a miss takes three days off the count instead of all of them.
 */
export type StreakRule = 'strict' | 'grace' | 'decay';

export const DECAY_COST = 3;

export type StreakResult = {
  current: number;
  best: number;
  /** Target days that came due and were not held — newest first, capped. */
  missed: string[];
  /** Target days held or repaired, over the window walked. */
  heldCount: number;
  /** Target days that came due at all (today excluded while it is still open). */
  dueCount: number;
};

function counts(state: EntryState | undefined): boolean {
  return state === 'held' || state === 'repaired';
}

/**
 * Walk `[startedOn, today]` and score it.
 *
 * `today` is deliberately never counted as a miss: the day is not over, and an
 * app that tells you at 09:00 that you have broken a 47-day streak you still
 * have fifteen hours to keep is an app you delete. A `frozen` day holds the
 * count without adding to it — the streak survives, the day stays empty on the
 * wall, which is exactly what a freeze token buys.
 */
export function computeStreak(
  entries: EntryMap,
  cadence: Cadence,
  rule: StreakRule,
  startedOn: string,
  today: string,
  missedCap = 30,
): StreakResult {
  const days = targetDaysBetween(cadence, startedOn, today);
  let run = 0;
  let best = 0;
  let heldCount = 0;
  let dueCount = 0;
  const missed: string[] = [];
  let graceWeek: string | null = null;
  let graceSpent = false;

  for (const day of days) {
    const state = entries[day];
    const week = weekKey(day);
    if (week !== graceWeek) {
      graceWeek = week;
      graceSpent = false;
    }

    if (counts(state)) {
      run += 1;
      heldCount += 1;
      dueCount += 1;
      if (run > best) best = run;
      continue;
    }
    if (state === 'frozen') {
      dueCount += 1;
      continue;
    }
    // `skipped` is an explicit "not today" — the user said so, so it is not a
    // miss and not a hold. It leaves the run exactly where it was.
    if (state === 'skipped') continue;

    // No entry. Today is still open, so it is not yet anything. `broke` is the
    // exception, and the only state that settles the open day: the rest of them
    // are the app guessing what an empty square means, while this one is the
    // user having already said it. An avoid habit whose slip was logged at noon
    // should not read as still holding until midnight.
    if (state !== 'broke' && day === today) continue;

    dueCount += 1;
    missed.push(day);
    if (rule === 'grace' && !graceSpent) {
      graceSpent = true;
      continue;
    }
    run = rule === 'decay' ? Math.max(0, run - DECAY_COST) : 0;
  }

  return {
    current: run,
    best,
    missed: missed.reverse().slice(0, missedCap),
    heldCount,
    dueCount,
  };
}

/** Share of due days actually held, 0–100. A habit with nothing due yet reads 0. */
export function hitRate(result: Pick<StreakResult, 'heldCount' | 'dueCount'>): number {
  if (result.dueCount === 0) return 0;
  return Math.round((result.heldCount / result.dueCount) * 100);
}

/**
 * Whether today can still take the streak down.
 *
 * Three things have to be true at once, and every one of them gates a piece of
 * UI: today has to be a target day, it has to be unresolved, and there has to
 * be a streak worth losing. A habit on day zero is not "at risk" — there is
 * nothing to save, and saying so is the crying-wolf bug that makes people mute
 * the app.
 */
export function isAtRisk(
  entries: EntryMap,
  cadence: Cadence,
  streak: number,
  today: string,
  hoursLeft: number,
  riskWindowHours = 6,
): boolean {
  if (streak < 2) return false;
  if (!isTargetDay(cadence, today)) return false;
  if (entries[today]) return false;
  return hoursLeft <= riskWindowHours;
}

/**
 * Days that could still be filled in with a repair, newest first.
 *
 * Only a miss inside `windowDays` is offered: repairing a gap from six weeks ago
 * rewrites history nobody remembers, and an unbounded list turns the repair
 * sheet into a wall of every day you ever missed.
 */
export function repairableDays(result: StreakResult, today: string, windowDays = 7): string[] {
  return result.missed.filter((day) => {
    const span = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000);
    return span > 0 && span <= windowDays;
  });
}
