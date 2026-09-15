import { dayRange } from '@/lib/dates';
import { isTargetDay, type Cadence } from '@/lib/schedule';
import type { EntryMap } from '@/lib/streak';

/**
 * Perfect days — every habit that was due got held.
 *
 * This is the currency freeze tokens are bought with (lib/tokens), so the rule
 * has to be strict about two things. A day where nothing was due is not
 * perfect, it is empty: a habit tracker that pays out a token for a Sunday with
 * no habits on it is paying you to schedule nothing. And a frozen day is not
 * perfect either — spending a token to survive a day cannot also earn one back.
 */

export type HabitSchedule = {
  id: string;
  cadence: Cadence;
  startedOn: string;
  archivedAt: string | null;
  /** Only `avoid` behaves differently here — see `heldOn`. */
  kind?: string;
};

/**
 * Whether one habit's day counts as held.
 *
 * An avoid habit is not asked about a day until the day after, so on the last
 * day of a walk the most it can say is that it has not been blown. Scoring it
 * as unheld instead would mean an account with a single avoid habit never has a
 * perfect day at all — the token tap would simply stop, one day behind forever.
 */
function heldOn(habit: HabitSchedule, state: string | undefined, day: string, last: string): boolean {
  if (habit.kind === 'avoid' && day === last) return state !== 'broke';
  return state === 'held' || state === 'repaired';
}

function dueOn(habits: HabitSchedule[], day: string): HabitSchedule[] {
  return habits.filter(
    (habit) =>
      day >= habit.startedOn &&
      (!habit.archivedAt || day < habit.archivedAt.slice(0, 10)) &&
      isTargetDay(habit.cadence, day),
  );
}

export type PerfectResult = {
  /** Days where everything due was held, oldest first. */
  days: string[];
  count: number;
  /** Longest run of consecutive perfect days with no freeze token spent. */
  cleanRun: number;
};

export function perfectDays(
  habits: HabitSchedule[],
  entries: Map<string, EntryMap>,
  from: string,
  to: string,
): PerfectResult {
  const days: string[] = [];
  let run = 0;
  let cleanRun = 0;

  for (const day of dayRange(from, to)) {
    const due = dueOn(habits, day);
    if (due.length === 0) {
      // A day that asked nothing neither earns nor breaks: the run carries over
      // a rest day rather than resetting on it.
      continue;
    }
    let allHeld = true;
    let froze = false;
    for (const habit of due) {
      const state = entries.get(habit.id)?.[day];
      if (state === 'frozen') froze = true;
      if (!heldOn(habit, state, day, to)) allHeld = false;
    }

    if (allHeld && !froze) {
      days.push(day);
      run += 1;
      if (run > cleanRun) cleanRun = run;
    } else {
      run = 0;
    }
  }

  return { days, count: days.length, cleanRun };
}

/**
 * Whether today is already perfect. Drives the Today copy — "nothing left to
 * lose today" is only true when something was owed and all of it is done.
 */
export function isPerfectToday(habits: HabitSchedule[], entries: Map<string, EntryMap>, today: string): boolean {
  const due = dueOn(habits, today);
  if (due.length === 0) return false;
  return due.every((habit) => heldOn(habit, entries.get(habit.id)?.[today], today, today));
}

/**
 * Whether a habit has been rebuilt past a week after breaking from a week or
 * more — the comeback award. Walking the best-run history is the only way to
 * know the difference between "never got going" and "got going twice".
 */
export function hasRebuilt(entries: EntryMap, cadence: Cadence, from: string, to: string): boolean {
  let run = 0;
  let brokeFromSeven = false;
  for (const day of dayRange(from, to)) {
    if (!isTargetDay(cadence, day)) continue;
    const state = entries[day];
    if (state === 'held' || state === 'repaired') {
      run += 1;
      if (brokeFromSeven && run >= 7) return true;
    } else if (state === 'frozen' || state === 'skipped') {
      continue;
    } else {
      if (run >= 7) brokeFromSeven = true;
      run = 0;
    }
  }
  return false;
}
