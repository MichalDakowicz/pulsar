import { useMemo, useState } from 'react';

import { dateKey } from '@/lib/dates';
import { cadenceLabel, isEmptyCadence, type Cadence } from '@/lib/schedule';
import { challengeLabel, targetLabel } from '@/lib/habit';
import type { StreakRule } from '@/lib/streak';
import type { Challenge, Habit, HabitKind, NudgeWindow } from '@/types/habit';

/**
 * The habit builder's state and its gates.
 *
 * Every "can I move on" question lives here rather than in the screen, so the
 * Next button, the step rail and the summary all read the same answer. The
 * gates are the point: the design let you walk past an unnamed habit and a
 * cadence with no days selected, and both produce a habit that can never come
 * due — a streak that will never start and never break.
 */

export type BuilderState = {
  step: number;
  name: string;
  mark: string;
  kind: HabitKind;
  amount: number;
  unit: string;
  minutes: number;
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

export const BUILDER_STEPS = ['habit', 'target', 'nudges', 'commitment', 'commit'] as const;

export const STEP_TITLES = [
  'what is the habit?',
  'what counts as a day?',
  'when should pulsar push?',
  'what does a miss cost?',
  'read it back',
];

export const STEP_SUBS = [
  'the name goes on the wall. the mark is how you find it at a glance.',
  'a target pulsar can judge. anything vaguer than this cannot hold a streak.',
  'reminders land before the window, not after it closes.',
  'a streak you can drop for free is a streak you will drop. nothing here costs money — the only thing on the line is your word.',
  'this is the deal. hold the button and pulsar starts counting.',
];

export function blankBuilder(): BuilderState {
  return {
    step: 0,
    name: '',
    mark: 'pulse',
    kind: 'do',
    amount: 8,
    unit: 'glasses',
    minutes: 10,
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
    step: 0,
    name: habit.name,
    mark: habit.mark,
    kind: habit.kind,
    amount: habit.kind === 'count' ? habit.target : 8,
    unit: habit.unit || 'glasses',
    minutes: habit.kind === 'timer' ? habit.target : 10,
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

/** The target the habit will be judged against, whichever kind it is. */
export function builderTarget(state: BuilderState): number {
  if (state.kind === 'count') return Math.max(1, state.amount);
  if (state.kind === 'timer') return Math.max(1, state.minutes);
  return 1;
}

export function toHabitDraft(state: BuilderState): Omit<Habit, 'id' | 'userId' | 'sort' | 'archivedAt'> {
  return {
    name: state.name.trim(),
    mark: state.mark,
    kind: state.kind,
    target: builderTarget(state),
    unit: state.kind === 'count' ? state.unit : '',
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

/** Why this step cannot be left, or null when it can. Shown, never silently enforced. */
export function stepBlocker(state: BuilderState): string | null {
  if (state.step === 0 && !state.name.trim()) return 'give it a name first.';
  if (state.step === 1 && isEmptyCadence(state.cadence)) return 'pick at least one day, or it can never come due.';
  if (state.step === 1 && state.kind === 'count' && state.amount < 1) return 'a target of zero is not a target.';
  if (state.step === 2 && state.window === 'exact' && state.times.length === 0) {
    return 'pick a time, or switch the window to anytime.';
  }
  return null;
}

export type SummaryRow = { key: string; value: string };

export function builderSummary(state: BuilderState): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const target = targetLabel({ kind: state.kind, target: builderTarget(state), unit: state.unit });
  rows.push({ key: 'target', value: [target, cadenceLabel(state.cadence)].filter(Boolean).join(' · ') });
  rows.push({ key: 'length', value: challengeLabel(state.challenge) });
  rows.push({
    key: 'reminders',
    value:
      state.window === 'anytime'
        ? 'none — no clock on this one'
        : `${state.times.length > 0 ? state.times.join(', ') : 'none'}${state.escalate ? ' · escalating' : ''}`,
  });
  rows.push({ key: 'a miss', value: RULE_LABELS[state.hard ? 'strict' : state.rule] });
  rows.push({ key: 'freezes', value: state.hard ? 'hard mode — no freeze tokens' : 'freeze tokens allowed' });
  rows.push({ key: 'visibility', value: state.publicShelf ? 'on your shelf, to whoever you let see it' : 'private' });
  return rows;
}

export const RULE_LABELS: Record<StreakRule, string> = {
  strict: 'strict — one miss ends it',
  grace: 'one forgiven miss a week',
  decay: 'a miss costs three days',
};

export const RULE_SUBS: Record<StreakRule, string> = {
  strict: 'one miss and the streak is gone. the ladder resets to tier one.',
  grace: 'the first miss of each week is forgiven automatically.',
  decay: 'a miss takes three days off the count, not everything.',
};

/**
 * The pledge, written for you when you have not written your own.
 *
 * It is a sentence about your word rather than about money — there is no
 * payment in Pulsar and there never was one to take. The line is read back on
 * the night a streak is about to break, which is the only moment it has to be
 * in your own words to be worth anything.
 */
export function suggestedPledge(state: BuilderState): string {
  const name = state.name.trim() || 'this habit';
  const verb = state.kind === 'avoid' ? 'stay off' : 'do';
  const consequence =
    state.hard || state.rule === 'strict'
      ? 'and if i miss one, it goes back to zero and i start again'
      : state.rule === 'grace'
        ? 'and i get one forgiven miss a week, not two'
        : 'and a miss costs me three days off the count';
  return `i will ${verb} ${name} ${cadenceLabel(state.cadence)}, ${consequence}.`;
}

export function useBuilder(initial?: BuilderState) {
  const [state, setState] = useState<BuilderState>(() => initial ?? blankBuilder());

  const set = useMemo(
    () =>
      <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
        setState((current) => ({ ...current, [key]: value })),
    [],
  );

  const blocker = stepBlocker(state);

  return {
    state,
    set,
    setState,
    blocker,
    isLast: state.step === BUILDER_STEPS.length - 1,
    next: () => {
      if (stepBlocker(state)) return false;
      setState((current) => ({ ...current, step: Math.min(BUILDER_STEPS.length - 1, current.step + 1) }));
      return true;
    },
    back: () => {
      setState((current) => ({ ...current, step: Math.max(0, current.step - 1) }));
    },
  };
}
