import { addDays, weekKey } from '@/lib/dates';
import { judgesByWeek, type Cadence } from '@/lib/schedule';
import type { Habit, TargetPeriod } from '@/types/habit';

/**
 * A target owed over the week rather than the day.
 *
 * "20 exercises a week" is a different question from "3 exercises a day", and
 * the difference is the whole point: the week has no opinion about Tuesday, so
 * nothing on Tuesday is not a miss, and twenty on Saturday clears it. The
 * existing `weekly` cadence already scores a week at a time, but it fills the
 * week with *days* — this fills it with *amounts*, which is the shape a counter
 * habit actually has.
 *
 * Kept out of `lib/schedule` on purpose: a cadence answers "which days can take
 * an answer", and that stays true whatever the target is owed over. Everything
 * here reads the habit, not the cadence.
 */

/**
 * Anything with a target that might be week-scoped. The minimum every helper
 * needs, and every field is optional: a `do` habit has no amount at all, and a
 * row written before these columns existed has neither. Missing reads as the
 * daily, non-exceeding habit that was the only kind there used to be.
 */
export type Targeted = {
  kind?: string;
  target?: number;
  targetPeriod?: TargetPeriod;
  allowExceed?: boolean;
};

/**
 * Whether this habit's target is owed over the week.
 *
 * Only `count` and `timer` can be: a `do` habit has no amount to add up, and an
 * `avoid` habit's target is a clean day, which is not a quantity. A row that
 * says otherwise is read as daily rather than trusted — the alternative is a
 * binary habit that silently needs a week to clear.
 */
export function isWeeklyTarget(habit: Targeted): boolean {
  if (habit.targetPeriod !== 'week') return false;
  return habit.kind === 'count' || habit.kind === 'timer';
}

/** The amount the week owes, or 0 when the target is not week-scoped. */
export function weekTarget(habit: Targeted): number {
  return isWeeklyTarget(habit) ? Math.max(1, Math.round(habit.target ?? 1)) : 0;
}

/**
 * Whether this habit is scored a week at a time, for any reason.
 *
 * Two roads lead here and they must not be confused: a `weekly` cadence owes
 * *days*, a week-scoped target owes an *amount*. Both settle at the end of the
 * week and both forgive an empty day, which is why one predicate gates the
 * branch — but what the week is measured in is `weekOwes`, not this.
 */
export function judgesWeekly(habit: Targeted & { cadence: Cadence }): boolean {
  return isWeeklyTarget(habit) || judgesByWeek(habit.cadence);
}

/**
 * Everything one habit logged inside the Monday-anchored week `day` falls in.
 *
 * Days with no entry contribute nothing rather than being skipped: the sum is
 * the week's answer, and an unanswered day is a zero, not a gap.
 */
export function weekAmount(amounts: Record<string, number>, day: string): number {
  const monday = weekKey(day);
  let total = 0;
  for (let i = 0; i < 7; i++) total += amounts[addDays(monday, i)] ?? 0;
  return total;
}

/**
 * How much of the week is still owed after what has been logged. Never negative
 * — a week run past its target is finished, not owed a negative amount.
 */
export function weekRemaining(habit: Targeted, amounts: Record<string, number>, day: string): number {
  return Math.max(0, weekTarget(habit) - weekAmount(amounts, day));
}

/**
 * The most the logger will accept on top of what is already there.
 *
 * `allowExceed` is the whole of the rule. Off, the stepper stops at the target
 * and the last press is dead: the target was the job, and a counter that keeps
 * climbing past it makes the number the point instead of the habit. On, there
 * is no ceiling — 24 of 20 is a real answer and the app should be able to hold
 * it rather than quietly dropping the four.
 *
 * `Infinity` rather than a large number so a caller that forgets to clamp fails
 * loudly instead of at some arbitrary wall.
 */
export function headroom(habit: Targeted, logged: number, amounts: Record<string, number>, day: string): number {
  if (habit.allowExceed) return Infinity;
  const ceiling = isWeeklyTarget(habit)
    ? weekRemaining(habit, amounts, day) + (amounts[day] ?? 0)
    : Math.max(1, Math.round(habit.target ?? 1));
  return Math.max(0, ceiling - logged);
}

/**
 * What one day's amount is worth on the wall, 0–1.
 *
 * Measured against the *week's* target, not a seventh of it. Ten of twenty
 * fills the cell half, which is the honest reading: that day did half the
 * week's work. Dividing by seven first would paint a day that carried the whole
 * week as 700% and a perfectly kept uneven week as five holes, which is exactly
 * the thing a weekly target exists to stop.
 */
export function dayShareOfWeek(habit: Targeted, amount: number): number {
  const owed = weekTarget(habit);
  if (owed <= 0) return 0;
  const share = amount / owed;
  if (habit.allowExceed) return Math.max(0, share);
  return Math.min(1, Math.max(0, share));
}

/** Whether the week has already cleared its target. */
export function weekMet(habit: Targeted, amounts: Record<string, number>, day: string): boolean {
  return weekAmount(amounts, day) >= weekTarget(habit);
}

/**
 * Whether the week can still absorb today being empty.
 *
 * The at-risk banner is only honest when the answer is no. A week that owes 4
 * with five days left has not failed and will not fail tonight; saying it might
 * is the crying-wolf bug that makes people mute the app. So it warns only once
 * every day left is needed — `left` counts today and the days after it.
 */
export function weekOnTheLine(habit: Targeted, amounts: Record<string, number>, today: string): boolean {
  const owed = weekTarget(habit);
  if (owed <= 0) return false;
  const monday = weekKey(today);
  let logged = 0;
  let left = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    if (day < today) logged += amounts[day] ?? 0;
    else left += 1;
  }
  const remaining = owed - logged;
  if (remaining <= 0) return false;
  // The most that could still be done is one full day's worth per day left, and
  // a day's worth of a weekly target is the target itself — any one day can
  // carry the whole week. So the week is only truly on the line on its last day.
  return left <= 1;
}

/**
 * The quick-add buttons a counter should offer, smallest first.
 *
 * Scaled to the target rather than fixed, because the same three chips cannot
 * serve eight glasses and two hundred press-ups: on the first, +10 is absurd;
 * on the second, +1 means twenty taps. One is always offered — every counter
 * needs a way to add exactly one — and the rest are a quarter and a half of
 * what is owed, which is the granularity someone actually thinks in.
 */
export function stepSizes(target: number): number[] {
  const owed = Math.max(1, Math.round(target));
  const sizes = [1, Math.round(owed / 4), Math.round(owed / 2)];
  return [...new Set(sizes)].filter((n) => n >= 1 && n <= owed).sort((a, b) => a - b);
}

/** "20 exercises a week", "20 min a week", or "" when the target is not week-scoped. */
export function weekTargetLabel(habit: Pick<Habit, 'kind' | 'target' | 'unit' | 'targetPeriod'>): string {
  if (!isWeeklyTarget(habit)) return '';
  if (habit.kind === 'timer') return `${weekTarget(habit)} min a week`;
  return `${weekTarget(habit)} ${habit.unit} a week`;
}
