import { isMeasured, type BuilderState } from '@/lib/builder';
import { WINDOW_TIMES } from '@/lib/habit';
import type { Cadence } from '@/lib/schedule';
import { clampChecks, stepDefaultTimes, stepTimeOptions } from '@/lib/steps';
import type { HabitKind, NudgeWindow } from '@/types/habit';

/**
 * The builder's moves: every change that has to drag something else along with
 * it. Picking a kind can take a rhythm off the table, checking twice a day turns
 * one reminder into two, and a target moved onto the week has to change its
 * number. Each move returns a whole new draft, so no screen ever sets one field
 * and forgets the other.
 */

/* ── rhythm ──────────────────────────────────────────────────────────────── */

/**
 * When a habit is due, with the weekly total folded in as one more answer.
 *
 * It used to be a second question after the cadence — "every day" and then
 * "every day or every week" — which asked the same thing twice and let the two
 * answers contradict each other. Underneath it is still a period on the target
 * and a cadence of any day, which is how the streak walker reads it.
 */
export type Rhythm = Cadence['kind'] | 'total';

export const RHYTHM_COPY: Record<Rhythm, { label: string; sub: string }> = {
  daily: { label: 'every day', sub: 'due all seven days' },
  weekdays: { label: 'weekdays', sub: 'monday to friday' },
  days: { label: 'pick days', sub: 'only the days you choose' },
  interval: { label: 'every few days', sub: 'every other day, every 3…' },
  weekly: { label: 'times a week', sub: 'any days — the week adds up' },
  total: { label: 'a weekly total', sub: 'the amount adds up over the week' },
};

const RHYTHMS: Rhythm[] = ['daily', 'weekdays', 'days', 'interval', 'weekly', 'total'];

export function rhythmOf(state: Pick<BuilderState, 'kind' | 'targetPeriod' | 'cadence'>): Rhythm {
  return isMeasured(state.kind) && state.targetPeriod === 'week' ? 'total' : state.cadence.kind;
}

/**
 * Which rhythms this habit can take. A counter gets the weekly total instead of
 * a quota of days — "times a week" beside "a weekly total" is two answers to one
 * question — unless it already has one, so an older habit is never changed by
 * opening it.
 */
export function rhythmOptions(state: BuilderState): Rhythm[] {
  const current = rhythmOf(state);
  return RHYTHMS.filter((rhythm) => {
    if (rhythm === 'total') return isMeasured(state.kind);
    if (rhythm === 'weekly') {
      if (state.kind === 'avoid' || state.checksPerDay > 1) return false;
      return !isMeasured(state.kind) || current === 'weekly';
    }
    if (rhythm === 'interval') return state.kind !== 'avoid';
    return true;
  });
}

/** How many days a week a cadence asks for, so a number can move between a day and a week. */
function daysPerWeek(cadence: Cadence): number {
  switch (cadence.kind) {
    case 'daily':
      return 7;
    case 'weekdays':
      return 5;
    case 'days':
      return Math.max(1, cadence.days.length);
    case 'interval':
      return Math.max(1, Math.round(7 / Math.max(1, cadence.every)));
    case 'weekly':
      return Math.max(1, cadence.perWeek);
  }
}

function cadenceFor(rhythm: Exclude<Rhythm, 'total'>, current: Cadence): Cadence {
  switch (rhythm) {
    case 'days':
      return current.kind === 'days' && current.days.length > 0 ? current : { kind: 'days', days: [0, 2, 4] };
    case 'interval':
      return current.kind === 'interval' ? current : { kind: 'interval', every: 2, anchor: '' };
    case 'weekly':
      return current.kind === 'weekly' ? current : { kind: 'weekly', perWeek: 3 };
    default:
      return { kind: rhythm };
  }
}

/**
 * Moves the habit to another rhythm, carrying the number across: eight glasses
 * every day is fifty-six a week, and a weekly total of twenty on weekdays is
 * four a day. Asking the user to redo that sum is how a target quietly changes
 * meaning when only its period was meant to.
 */
export function withRhythm(state: BuilderState, rhythm: Rhythm): BuilderState {
  const from = rhythmOf(state);
  if (rhythm === from && rhythm !== 'total') return state;
  const scale = (value: number, factor: number) => Math.max(1, Math.min(999, Math.round(value * factor)));
  if (rhythm === 'total') {
    if (from === 'total') return state;
    const factor = daysPerWeek(state.cadence);
    return {
      ...state,
      targetPeriod: 'week',
      cadence: { kind: 'daily' },
      amount: scale(state.amount, factor),
      minutes: scale(state.minutes, factor),
    };
  }
  const cadence = cadenceFor(rhythm, state.cadence);
  if (from !== 'total') return { ...state, cadence };
  const factor = 1 / daysPerWeek(cadence);
  return {
    ...state,
    targetPeriod: 'day',
    cadence,
    amount: scale(state.amount, factor),
    minutes: scale(state.minutes, factor),
  };
}

/** Keeps the rhythm one this habit can take, after its kind or its checks changed. */
function settleRhythm(state: BuilderState): BuilderState {
  const rhythm = rhythmOf(state);
  if (state.targetPeriod === 'week' && !isMeasured(state.kind)) {
    // A total left behind by a kind that can no longer add up: walk it back to
    // a day as the counter it was, then hand the new kind back.
    return { ...withRhythm({ ...state, kind: 'count' }, 'daily'), kind: state.kind };
  }
  if (rhythmOptions(state).includes(rhythm)) return state;
  if (rhythm === 'weekly' && isMeasured(state.kind)) return withRhythm(state, 'total');
  return withRhythm(state, 'daily');
}

export function withKind(state: BuilderState, kind: HabitKind): BuilderState {
  const next = { ...state, kind, checksPerDay: kind === 'do' ? state.checksPerDay : 1 };
  // A habit switched from checks to a counter would otherwise carry a quota
  // week with nothing to fill it with.
  if (isMeasured(kind) && rhythmOf(state) === 'weekly' && !isMeasured(state.kind)) return withRhythm(next, 'total');
  return withTimes(settleRhythm(next));
}

/** Once, or two or three checks — named for the parts of the day, or plain. */
export function withChecks(state: BuilderState, checks: number, named = true): BuilderState {
  return withTimes(settleRhythm({ ...state, checksPerDay: clampChecks(checks), checksNamed: named }));
}

/* ── nudges ──────────────────────────────────────────────────────────────── */

/**
 * The reminder times the window implies. A habit checked twice a day gets one
 * time per check, in the order of the day; a habit with no clock gets none.
 */
function withTimes(state: BuilderState): BuilderState {
  if (state.window === 'anytime') return { ...state, times: [] };
  if (state.checksPerDay > 1) {
    const defaults = stepDefaultTimes(state.checksPerDay, state.checksNamed);
    // A time the check does not offer would leave its row with nothing selected.
    const times = defaults.map((fallback, i) =>
      stepTimeOptions(state.checksPerDay, state.checksNamed, i).includes(state.times[i]) ? state.times[i] : fallback,
    );
    return { ...state, window: 'exact', times };
  }
  if (state.window === 'morning' || state.window === 'evening') {
    return { ...state, times: state.times.length > 0 ? state.times : WINDOW_TIMES[state.window] };
  }
  return state;
}

export function withWindow(state: BuilderState, window: NudgeWindow): BuilderState {
  if (window === 'anytime') return { ...state, window, times: [] };
  if (state.checksPerDay > 1) {
    return { ...state, window: 'exact', times: stepDefaultTimes(state.checksPerDay, state.checksNamed) };
  }
  if (window === 'exact') return { ...state, window, times: state.times.length > 0 ? state.times : ['08:00'] };
  return { ...state, window, times: WINDOW_TIMES[window] };
}

export function toggleTime(state: BuilderState, time: string): BuilderState {
  const times = state.times.includes(time) ? state.times.filter((t) => t !== time) : [...state.times, time].sort();
  return { ...state, times };
}

export function withStepTime(state: BuilderState, step: number, time: string): BuilderState {
  const times = [...state.times];
  times[step] = time;
  return { ...state, times };
}

/* ── stakes ──────────────────────────────────────────────────────────────── */

/**
 * What a miss costs, as one scale. Strict, grace, decay and hard mode were two
 * questions — a rule, and a switch that overrode it — and hard mode hid the rule
 * it overrode. As four stops they are one answer, from gentlest to hardest.
 */
export type Strictness = 'gentle' | 'fair' | 'strict' | 'hard';

export const STRICTNESS: Strictness[] = ['gentle', 'fair', 'strict', 'hard'];

export function strictnessOf(state: Pick<BuilderState, 'hard' | 'rule'>): Strictness {
  if (state.hard) return 'hard';
  return state.rule === 'strict' ? 'strict' : state.rule === 'grace' ? 'fair' : 'gentle';
}

export function withStrictness(state: BuilderState, level: Strictness): BuilderState {
  if (level === 'hard') return { ...state, hard: true, rule: 'strict' };
  return { ...state, hard: false, rule: level === 'gentle' ? 'decay' : level === 'fair' ? 'grace' : 'strict' };
}

/* ── the chips each clause offers ────────────────────────────────────────── */

/** Offered reminder times. Not a clock picker: good defaults beat a spinner. */
export const TIME_OPTIONS = ['07:00', '07:30', '08:00', '12:00', '17:30', '19:00', '21:00', '22:30'];

/** The current value always has a chip, so a habit built some other way still shows what it is. */
function withCurrent(options: number[], current: number): number[] {
  return options.includes(current) ? options : [...options, current].sort((a, b) => a - b);
}

export function amountOptions(state: Pick<BuilderState, 'amount' | 'targetPeriod'>): number[] {
  const base = state.targetPeriod === 'week' ? [5, 10, 15, 20, 30, 50, 70, 100] : [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  return withCurrent(base, state.amount);
}

export function minuteOptions(state: Pick<BuilderState, 'minutes' | 'targetPeriod'>): number[] {
  const base = state.targetPeriod === 'week' ? [30, 60, 90, 120, 180, 300] : [5, 10, 15, 20, 30, 45, 60];
  return withCurrent(base, state.minutes);
}
