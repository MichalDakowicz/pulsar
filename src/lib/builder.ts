import { dateKey } from '@/lib/dates';
import { isEmptyCadence, type Cadence } from '@/lib/schedule';
import { clampChecks } from '@/lib/steps';
import type { StreakRule } from '@/lib/streak';
import { cleanUnit } from '@/lib/units';
import type { Challenge, Habit, HabitKind, NudgeWindow, TargetPeriod } from '@/types/habit';

/**
 * The habit builder, as one sentence.
 *
 * "water — 8 glasses, every day. nudged at 08:00. a miss ends it." Each clause
 * is a tab, and each tab asks one question with chips. The rules that decide
 * what a clause may offer live here, so the screen, the sentence and the saved
 * habit cannot disagree: a weekly total only on something that adds up, a quota
 * week never on a habit checked twice a day, no clock on a habit that says it
 * has none.
 */

export const CLAUSES = ['name', 'measure', 'rhythm', 'nudge', 'stakes'] as const;
export type Clause = (typeof CLAUSES)[number];

export type BuilderState = {
  clause: Clause;
  /** Clauses already opened, so the rail can mark them as answered. */
  seen: Clause[];
  name: string;
  mark: string;
  kind: HabitKind;
  /** 2 or 3 for a do habit checked more than once a day. Set at build time only. */
  checksPerDay: number;
  amount: number;
  unit: string;
  minutes: number;
  targetPeriod: TargetPeriod;
  allowExceed: boolean;
  cadence: Cadence;
  challenge: Challenge;
  window: NudgeWindow;
  times: string[];
  escalate: boolean;
  rule: StreakRule;
  hard: boolean;
  publicShelf: boolean;
  pledge: string;
  why: string;
};

export function blankBuilder(): BuilderState {
  return {
    clause: 'name',
    seen: ['name'],
    name: '',
    mark: 'pulse',
    kind: 'do',
    checksPerDay: 1,
    amount: 8,
    unit: 'glasses',
    minutes: 10,
    targetPeriod: 'day',
    allowExceed: false,
    cadence: { kind: 'daily' },
    challenge: 'open',
    window: 'exact',
    times: ['07:30'],
    escalate: true,
    rule: 'strict',
    hard: false,
    publicShelf: false,
    pledge: '',
    why: '',
  };
}

export function builderFromHabit(habit: Habit): BuilderState {
  return {
    clause: 'name',
    seen: [...CLAUSES],
    name: habit.name,
    mark: habit.mark,
    kind: habit.kind,
    checksPerDay: clampChecks(habit.checksPerDay),
    amount: habit.kind === 'count' ? habit.target : 8,
    unit: habit.unit || 'glasses',
    minutes: habit.kind === 'timer' ? habit.target : 10,
    targetPeriod: habit.targetPeriod,
    allowExceed: habit.allowExceed,
    cadence: habit.cadence,
    challenge: habit.challenge,
    window: habit.window,
    times: habit.times,
    escalate: habit.escalate,
    rule: habit.rule,
    hard: habit.hard,
    publicShelf: habit.publicShelf,
    pledge: habit.pledge,
    why: habit.why,
  };
}

export const isMeasured = (kind: HabitKind) => kind === 'count' || kind === 'timer';

/** The target the habit will be judged against, whichever kind it is. */
export function builderTarget(state: BuilderState): number {
  if (state.kind === 'count') return Math.max(1, state.amount);
  if (state.kind === 'timer') return Math.max(1, state.minutes);
  return 1;
}

/** The habit as the fields `lib/habitType` reads, without saving it. */
export function draftShape(state: BuilderState): Pick<Habit, 'kind' | 'target' | 'unit' | 'cadence' | 'targetPeriod' | 'checksPerDay'> {
  return {
    kind: state.kind,
    target: builderTarget(state),
    unit: cleanUnit(state.unit),
    cadence: state.cadence,
    targetPeriod: isMeasured(state.kind) ? state.targetPeriod : 'day',
    checksPerDay: state.kind === 'do' ? clampChecks(state.checksPerDay) : 1,
  };
}

/* ── gates ───────────────────────────────────────────────────────────────── */

/** Why this clause cannot be left, or null. Shown, never silently enforced. */
export function clauseBlocker(state: BuilderState, clause: Clause): string | null {
  if (clause === 'name') return state.name.trim() ? null : 'give it a name first.';
  if (clause === 'measure') return state.kind === 'count' && !cleanUnit(state.unit) ? 'say what you are counting.' : null;
  if (clause === 'rhythm') return isEmptyCadence(state.cadence) ? 'pick at least one day, or it can never come due.' : null;
  if (clause === 'nudge') {
    return state.window !== 'anytime' && state.times.length === 0 ? 'pick a time, or switch nudges off.' : null;
  }
  return null;
}

/** The first thing standing between this draft and a habit, or null. */
export function blocker(state: BuilderState): string | null {
  for (const clause of CLAUSES) {
    const reason = clauseBlocker(state, clause);
    if (reason) return reason;
  }
  return null;
}

export function nextClause(clause: Clause): Clause | null {
  const index = CLAUSES.indexOf(clause);
  return index < CLAUSES.length - 1 ? CLAUSES[index + 1] : null;
}

export function toHabitDraft(state: BuilderState): Omit<Habit, 'id' | 'userId' | 'sort' | 'archivedAt'> {
  const shape = draftShape(state);
  return {
    // A new habit has no past to have judged differently. An edit's phases are
    // decided by the scope sheet (lib/phases) and patched over this.
    phases: [],
    name: state.name.trim(),
    mark: state.mark,
    kind: state.kind,
    target: shape.target,
    targetPeriod: shape.targetPeriod,
    allowExceed: isMeasured(state.kind) ? state.allowExceed : false,
    checksPerDay: shape.checksPerDay,
    unit: state.kind === 'count' ? shape.unit : '',
    cadence: state.cadence,
    challenge: state.challenge,
    window: state.window,
    // A habit with no clock keeps no times: leaving them would schedule
    // reminders for a window that says it does not want any.
    times: state.window === 'anytime' ? [] : [...state.times].sort(),
    escalate: state.escalate,
    rule: state.hard ? 'strict' : state.rule,
    hard: state.hard,
    publicShelf: state.publicShelf,
    pledge: state.pledge.trim(),
    why: state.why.trim(),
    startedOn: dateKey(),
  };
}
