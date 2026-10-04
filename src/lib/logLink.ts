import { nextOpenStep, isMultiStep } from '@/lib/steps';
import type { HabitKind } from '@/types/habit';

/**
 * `pulsar://log/<habit>` — a check-in that does not need the app opened first.
 *
 * Written to an NFC tag on the water bottle or the gym bag, or behind a
 * home-screen shortcut, it does what the row's own gesture would: holds a
 * check, adds one to a counter, ticks the next of two checks. What one tap is
 * worth is decided here so the route only carries it out.
 */

export const LOG_PREFIX = 'pulsar://log/';

export function logLink(habitId: string, amount?: number): string {
  return amount ? `${LOG_PREFIX}${habitId}?amount=${amount}` : `${LOG_PREFIX}${habitId}`;
}

/** Biggest amount a link may carry — a typo of 50000 glasses should not land. */
const MAX_LINK_AMOUNT = 100_000;

/** `?amount=` read back: a positive whole number, or nothing. */
export function parseLogAmount(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return null;
  const amount = Number(value);
  return amount > 0 && amount <= MAX_LINK_AMOUNT ? amount : null;
}

/**
 * A tag held to the phone can fire twice in a breath. A second tap on the same
 * habit inside this gap is the same tap.
 */
export const REPEAT_MS = 4000;

export function isRepeat(last: number | undefined, now: number): boolean {
  return last !== undefined && now - last < REPEAT_MS;
}

export type LogTarget = {
  name: string;
  kind: HabitKind;
  checksPerDay: number;
  unit: string;
  archived: boolean;
  /** The day's resolution, as the board has it. */
  today: string;
  amount: number;
  /** How much more the habit will take today; Infinity when it allows exceeding. */
  headroom: number;
  weekly: boolean;
  weekAmount: number;
  /** The day's target, or the week's on a week-scoped habit. */
  owed: number;
};

export type LogAction =
  | { kind: 'hold' }
  | { kind: 'tick'; step: number }
  | { kind: 'add'; delta: number; say: string | null }
  | { kind: 'none'; say: string };

/**
 * What one tap of the link does.
 *
 * A counter takes one by default — a glass, a set — and a timer takes what is
 * left of its target, since nobody tags a bottle to log one minute. `?amount=`
 * overrides both. An avoid habit is refused: the link can only say "I did it",
 * and on an avoid habit that is a slip nobody meant to log with a tag.
 */
export function logAction(target: LogTarget, requested: number | null): LogAction {
  const { name } = target;
  if (target.archived) return { kind: 'none', say: `${name} is archived.` };
  if (target.kind === 'avoid') return { kind: 'none', say: `${name} is an avoid habit — open it to log a slip.` };
  if (target.today === 'rest') return { kind: 'none', say: `${name} is not due today.` };

  if (isMultiStep(target)) {
    const step = nextOpenStep(target.amount, target.checksPerDay);
    return step === null ? { kind: 'none', say: `${name} — every check is already in.` } : { kind: 'tick', step };
  }

  if (target.kind === 'do') {
    if (target.today === 'due') return { kind: 'hold' };
    const said = target.today === 'held' ? 'is already held today' : 'already has its answer today';
    return { kind: 'none', say: `${name} ${said}.` };
  }

  if (target.today !== 'due' && target.today !== 'held') {
    return { kind: 'none', say: `${name} already has its answer today.` };
  }
  if (target.headroom <= 0) return { kind: 'none', say: `${name} is already at its target.` };

  const before = target.weekly ? target.weekAmount : target.amount;
  const wanted = requested ?? (target.kind === 'timer' ? Math.max(1, target.owed - before) : 1);
  const delta = Math.min(wanted, target.headroom);
  const after = before + delta;
  const unit = target.kind === 'timer' ? 'min' : target.unit;
  // Crossing the target is announced by the check-in itself; saying it twice
  // would bury the one toast that matters under a second one.
  const crosses = before < target.owed && after >= target.owed;
  const per = target.weekly ? ' this week' : '';
  return { kind: 'add', delta, say: crosses ? null : `${name} · ${after} of ${target.owed} ${unit}${per}.` };
}
