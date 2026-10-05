import { addDays } from '@/lib/dates';
import type { Phase } from '@/lib/phases';
import type { EntryMap } from '@/lib/streak';

/**
 * Habits checked more than once a day — meds in the morning and at night.
 *
 * One habit, up to three steps. A day's entry keeps which steps were ticked as a
 * bitmask in `amount`: bit 0 is the first step, bit 1 the second. The three bits
 * above those say which steps were set aside (`ASIDE_SHIFT`) — the night dose
 * a doctor stopped for a day is answered, not missed. A bitmask
 * rather than a count, because the steps are not interchangeable — the night
 * dose does not stand in for a missed morning one, and each step walks a streak
 * of its own (`stepEntries`). The habit's own streak is the full day: every step
 * in, or the day does not count (`lib/scoring`).
 */

export const MAX_CHECKS = 3;

/** Where a step's set-aside bit sits: step 0 at bit 3, step 1 at bit 4. */
export const ASIDE_SHIFT = MAX_CHECKS;

/** 1–3, whatever a row or a draft says. */
export function clampChecks(checks: number | null | undefined): number {
  if (typeof checks !== 'number' || !Number.isFinite(checks)) return 1;
  return Math.max(1, Math.min(MAX_CHECKS, Math.round(checks)));
}

export function isMultiStep(habit: { kind?: string; checksPerDay?: number }): boolean {
  return habit.kind === 'do' && clampChecks(habit.checksPerDay) > 1;
}

/**
 * What each check is called. A named habit splits the day — morning and night,
 * a sun and a moon on its card. A plain one is just done that many times, and
 * its checks are only ever numbered: "1st" and "2nd" exist for screen readers
 * and nothing else draws them.
 */
const NAMED: Record<number, string[]> = {
  1: ['once'],
  2: ['morning', 'night'],
  3: ['morning', 'midday', 'night'],
};

const PLAIN = ['1st', '2nd', '3rd'];

export function stepNames(checks: number, named = true): string[] {
  const n = clampChecks(checks);
  if (named || n === 1) return NAMED[n];
  return PLAIN.slice(0, n);
}

/** Reminder times a named check can take — five good defaults beat a spinner, here as everywhere. */
const NAMED_TIMES: Record<string, string[]> = {
  morning: ['06:30', '07:00', '08:00', '09:00'],
  midday: ['12:00', '13:00', '14:00'],
  night: ['21:00', '22:00', '22:30', '23:00'],
};

const NAMED_DEFAULT: Record<string, string> = { morning: '08:00', midday: '13:00', night: '22:00' };

/** A plain check belongs to no part of the day, so any of these will do for it. */
const PLAIN_TIMES = ['07:00', '08:00', '09:00', '12:00', '13:00', '17:30', '19:00', '21:00', '22:00'];

const PLAIN_DEFAULTS: Record<number, string[]> = { 2: ['08:00', '19:00'], 3: ['08:00', '13:00', '19:00'] };

export function stepTimeOptions(checks: number, named: boolean, step: number): string[] {
  if (!named) return PLAIN_TIMES;
  return NAMED_TIMES[stepNames(checks, true)[step]] ?? PLAIN_TIMES;
}

export function stepDefaultTimes(checks: number, named: boolean): string[] {
  const n = clampChecks(checks);
  if (!named) return PLAIN_DEFAULTS[n] ?? ['08:00'];
  return stepNames(n, true).map((step) => NAMED_DEFAULT[step] ?? '08:00');
}

/** The checks in words, for the sentence: "morning & night", or "twice a day" when they are plain. */
export function checksWords(checks: number, named: boolean): string {
  const n = clampChecks(checks);
  if (n === 1) return 'once a day';
  if (named) return n === 2 ? 'morning & night' : 'morning, midday & night';
  return n === 2 ? 'twice a day' : 'three times a day';
}

const mask = (checks: number) => (1 << clampChecks(checks)) - 1;

export function hasStep(amount: number, step: number): boolean {
  return (Math.max(0, amount) & (1 << step)) !== 0;
}

/** How many of the day's steps are in. */
export function stepsDone(amount: number, checks: number): number {
  let bits = Math.max(0, amount) & mask(checks);
  let count = 0;
  while (bits) {
    count += bits & 1;
    bits >>= 1;
  }
  return count;
}

export function allStepsDone(amount: number, checks: number): boolean {
  return stepsDone(amount, checks) >= clampChecks(checks);
}

export function isAside(amount: number, step: number): boolean {
  return (Math.max(0, amount) & (1 << (step + ASIDE_SHIFT))) !== 0;
}

/** Whether every step is either in or set aside — the day has its whole answer. */
export function allStepsAnswered(amount: number, checks: number): boolean {
  for (let step = 0; step < clampChecks(checks); step++) {
    if (!hasStep(amount, step) && !isAside(amount, step)) return false;
  }
  return true;
}

/**
 * Whether a multi-step day was kept: something was done, and nothing is still
 * open. A step set aside is owed nothing, but a day with every step set aside
 * is a day set aside, and is written as one (`skipped`) rather than as held.
 */
export function stepsKept(amount: number, checks: number): boolean {
  return stepsDone(amount, checks) > 0 && allStepsAnswered(amount, checks);
}

/** Flips a step in or out. Ticking one that was set aside takes it off the aside list. */
export function toggleStep(amount: number, step: number): number {
  return (Math.max(0, amount) ^ (1 << step)) & ~(1 << (step + ASIDE_SHIFT));
}

/** Sets aside every step still open, keeping the ones already in. */
export function setRestAside(amount: number, checks: number): number {
  let next = Math.max(0, amount);
  for (let step = 0; step < clampChecks(checks); step++) {
    if (!hasStep(next, step)) next |= 1 << (step + ASIDE_SHIFT);
  }
  return next;
}

/** The first step still open, which is what a swipe ticks. Null once the day is answered. */
export function nextOpenStep(amount: number, checks: number): number | null {
  for (let step = 0; step < clampChecks(checks); step++) {
    if (!hasStep(amount, step) && !isAside(amount, step)) return step;
  }
  return null;
}

/** The latest step ticked, which is what a swipe back takes off. Null on an empty day. */
export function lastDoneStep(amount: number, checks: number): number | null {
  for (let step = clampChecks(checks) - 1; step >= 0; step--) if (hasStep(amount, step)) return step;
  return null;
}

/**
 * One step's own record — what its streak is walked over.
 *
 * A held day is held for the step only if its bit is set, and set aside for it
 * if its aside bit is. Everything else a day can say applies to all of them at
 * once: a freeze, a repair or a set-aside day is about the day, and a step
 * cannot have been frozen while its sibling was not.
 */
export function stepEntries(entries: EntryMap, amounts: Record<string, number>, step: number): EntryMap {
  const out: EntryMap = {};
  for (const [day, state] of Object.entries(entries)) {
    if (state === 'held') {
      const amount = amounts[day] ?? 0;
      if (hasStep(amount, step)) out[day] = 'held';
      else if (isAside(amount, step)) out[day] = 'skipped';
    } else {
      out[day] = state;
    }
  }
  return out;
}

/**
 * The first day a check existed — what its own streak is walked from. A habit
 * made twice a day last week has a morning check as old as the habit (its one
 * check always was the morning's bit) and a night check as old as the change.
 * Null when the habit no longer has that check at all.
 */
export function stepStartsOn(
  timeline: { startedOn: string; checksPerDay?: number; phases?: Phase[] },
  step: number,
): string | null {
  if (clampChecks(timeline.checksPerDay) <= step) return null;
  let start = timeline.startedOn;
  for (const phase of timeline.phases ?? []) {
    if (clampChecks(phase.checksPerDay ?? 1) <= step) start = addDays(phase.to, 1);
  }
  return start;
}
