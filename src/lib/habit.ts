import { cadenceLabel, isTargetDay, type Cadence } from '@/lib/schedule';
import type { EntryMap, EntryState } from '@/lib/streak';
import type { Habit, HabitKind, NudgeWindow } from '@/types/habit';

/**
 * Labels and per-day judgement for one habit. Pure, and deliberately the only
 * place that decides what "done" means — a component that re-derives it drifts.
 */

export const KIND_LABELS: Record<HabitKind, { label: string; sub: string }> = {
  do: { label: 'do it', sub: 'check in once a day' },
  avoid: { label: 'avoid it', sub: 'a clean day is the win' },
  count: { label: 'count it', sub: 'hit a number' },
  timer: { label: 'time it', sub: 'put minutes in' },
};

export const WINDOW_LABELS: Record<NudgeWindow, string> = {
  exact: 'at a time',
  morning: 'morning',
  evening: 'evening',
  anytime: 'anytime',
};

/** Default nudge times a window implies, used when the user picks a window and no clock. */
export const WINDOW_TIMES: Record<NudgeWindow, string[]> = {
  exact: [],
  morning: ['08:00'],
  evening: ['19:00'],
  anytime: [],
};

/** "8 glasses", "20 min", "" — the target in words, empty when the habit is binary. */
export function targetLabel(habit: Pick<Habit, 'kind' | 'target' | 'unit'>): string {
  if (habit.kind === 'count') return `${habit.target} ${habit.unit}`;
  if (habit.kind === 'timer') return `${habit.target} min`;
  if (habit.kind === 'avoid') return 'clean day';
  return '';
}

/** The meta line under a habit's name: target · cadence · when. */
export function habitMeta(habit: Habit): string {
  const parts = [targetLabel(habit), cadenceLabel(habit.cadence)];
  if (habit.window === 'exact' && habit.times.length > 0) parts.push(habit.times[0]);
  else if (habit.window !== 'exact' && habit.window !== 'anytime') parts.push(WINDOW_LABELS[habit.window]);
  return parts.filter(Boolean).join(' · ');
}

/** Whether a habit ever nudges. `anytime` and an empty time list both mean no. */
export function hasReminders(habit: Pick<Habit, 'window' | 'times'>): boolean {
  return habit.window !== 'anytime' && habit.times.length > 0;
}

/**
 * Hard mode is not a separate rule so much as an override of two: no freeze
 * token may be spent on the habit, and the streak rule is forced to strict.
 * Keeping it as one flag rather than two fields means the two can never
 * disagree, and the builder can hide the rule picker when it is on.
 */
export function effectiveRule(habit: Pick<Habit, 'hard' | 'rule'>) {
  return habit.hard ? ('strict' as const) : habit.rule;
}

export function canFreeze(habit: Pick<Habit, 'hard'>, tokens: number): boolean {
  return !habit.hard && tokens > 0;
}

/** 0–1 of the day's target. Binary habits jump straight to 1 on a hold. */
export function dayProgress(habit: Pick<Habit, 'kind' | 'target'>, amount: number): number {
  if (habit.kind === 'do' || habit.kind === 'avoid') return amount > 0 ? 1 : 0;
  if (habit.target <= 0) return amount > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, amount / habit.target));
}

/** Whether what was logged clears the day. Partial progress on a counter is not a hold. */
export function meetsTarget(habit: Pick<Habit, 'kind' | 'target'>, amount: number): boolean {
  return dayProgress(habit, amount) >= 1;
}

/**
 * What Today should say about one habit on one day.
 *
 * `rest` is the state the design had no word for and the app needs most: a day
 * the habit was never owed. Without it a Mon/Wed/Fri habit reads as "due" every
 * Tuesday, and the only way to clear it is to lie.
 */
export function dayState(
  habit: Pick<Habit, 'cadence' | 'archivedAt'>,
  entries: EntryMap,
  day: string,
): EntryState | 'due' | 'rest' {
  if (habit.archivedAt) return 'rest';
  if (!isTargetDay(habit.cadence as Cadence, day)) return 'rest';
  return entries[day] ?? 'due';
}

/**
 * Whether today's answer can simply be taken back.
 *
 * Only the two that cost nothing. A freeze and a repair each spent a token, and
 * the token is gone — offering to un-spend it would be a lie about what the
 * ledger did, which is the same reason the check-in toast never offers Undo on
 * them. A day that is still `due` or a `rest` day has nothing to undo.
 */
export function canUndoToday(state: EntryState | 'due' | 'rest'): boolean {
  return state === 'held' || state === 'skipped';
}

/**
 * The gesture hint under the Today heading.
 *
 * It names only a gesture that will actually work right now: no undoable row
 * means no undo hint, and a day with nothing left open drops the check-in half
 * rather than telling someone to swipe rows that are all already done.
 */
export function todayHint(mode: 'swipe' | 'hold', open: number, undoable: number): string | undefined {
  const checkIn = open > 0 ? (mode === 'hold' ? 'press and hold a row' : 'swipe a row across') : null;
  const undo = undoable > 0 ? 'swipe a done row back to undo' : null;
  return [checkIn, undo].filter(Boolean).join(' · ') || undefined;
}

/**
 * A challenge that has run its course. The habit stops asking and the detail
 * screen offers to extend it rather than quietly continuing to count, which
 * would make "66-day challenge" a label with no end.
 */
export function challengeComplete(habit: Pick<Habit, 'challenge'>, heldDays: number): boolean {
  if (habit.challenge === 'open') return false;
  return heldDays >= Number(habit.challenge);
}

export function challengeLabel(challenge: Habit['challenge']): string {
  return challenge === 'open' ? 'open-ended' : `${challenge}-day challenge`;
}
