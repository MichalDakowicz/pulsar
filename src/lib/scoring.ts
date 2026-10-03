import { checksOn, targetOn, targetPeriodOn, type Phased } from '@/lib/phases';
import { allStepsDone } from '@/lib/steps';
import type { EntryMap } from '@/lib/streak';
import type { TargetPeriod } from '@/types/habit';

/**
 * The record the streak is walked over: what a day was *worth*, not just
 * whether something was logged.
 *
 * A counter's entry is `held` the moment anything is in it, which is right for
 * the logger and the wall — a half-done day is painted half full — and wrong for
 * the streak: three glasses of eight is not a kept day. So the scored record
 * drops a held day that did not reach its target, and the walker reads it as
 * the miss it was. The raw entries and the amounts are untouched, which is what
 * keeps the wall's gradient on that day.
 *
 * A multi-step habit is the same question asked of its steps: the day is kept
 * once every step is in (`lib/steps`). Each step still keeps its own streak.
 */

/**
 * The day an under-target counter day started counting as a miss.
 *
 * Dated rather than retroactive, the way `CLEAN_DAY_FROM` and `lib/phases` are:
 * before it, any amount held the streak, and rereading a year of half days
 * under a rule that did not exist yet would end streaks people kept honestly by
 * the rules they were shown. Multi-step habits are newer than the rule, so they
 * are scored by it from their first day.
 */
export const PARTIAL_MISS_FROM = '2026-10-03';

type Scorable = Phased & {
  kind?: string;
  target?: number;
  targetPeriod?: TargetPeriod;
  checksPerDay?: number;
};

/** Whether a held day reached what it owed. Week-scoped targets are the week's business, not the day's. */
export function dayReachedTarget(habit: Scorable, day: string, amount: number): boolean {
  // The checks that day owed, not today's: a habit made twice a day keeps the
  // days it lived as once a day, unless the change was applied to the whole run.
  if (habit.kind === 'do') {
    const checks = checksOn(habit, day);
    return checks > 1 ? allStepsDone(amount, checks) : true;
  }
  if (habit.kind !== 'count' && habit.kind !== 'timer') return true;
  if (day < PARTIAL_MISS_FROM) return true;
  if (targetPeriodOn(habit, day) === 'week') return true;
  return amount >= targetOn(habit, day);
}

export function scoredEntries(habit: Scorable, entries: EntryMap, amounts: Record<string, number>): EntryMap {
  const everMulti =
    habit.kind === 'do' && ((habit.checksPerDay ?? 1) > 1 || (habit.phases ?? []).some((phase) => (phase.checksPerDay ?? 1) > 1));
  const counts = habit.kind === 'count' || habit.kind === 'timer' || everMulti;
  if (!counts) return entries;
  const out: EntryMap = {};
  for (const [day, state] of Object.entries(entries)) {
    if (state === 'held' && !dayReachedTarget(habit, day, amounts[day] ?? 0)) continue;
    out[day] = state;
  }
  return out;
}
