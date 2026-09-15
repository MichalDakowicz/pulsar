import { addDays } from '@/lib/dates';
import { isTargetDayOn, type Phase } from '@/lib/phases';
import { cadenceLabel, type Cadence } from '@/lib/schedule';
import { silenceIsClean, type EntryMap, type EntryState } from '@/lib/streak';
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
 * The day a habit is currently being asked about.
 *
 * For an `avoid` habit that is yesterday, and the reason is in the word: a
 * clean day is only clean once it is over. Asking at 09:00 whether you stayed
 * off it today is asking you to promise, not to report, and a wall built out
 * of promises is a wall that says nothing. Everything else is asked about
 * today, where the day is the thing you are filling in as you go.
 */
export function judgedDay(habit: Pick<Habit, 'kind'>, today: string): string {
  return habit.kind === 'avoid' ? addDays(today, -1) : today;
}

/**
 * Whether a habit's open question is about a day that has already ended, which
 * is what lets a row say "yesterday" instead of pretending it means now.
 */
export function asksAboutYesterday(habit: Pick<Habit, 'kind'>): boolean {
  return habit.kind === 'avoid';
}

/**
 * What Today should say about one habit on one day.
 *
 * `rest` is the state the design had no word for and the app needs most: a day
 * the habit was never owed. Without it a Mon/Wed/Fri habit reads as "due" every
 * Tuesday, and the only way to clear it is to lie.
 *
 * `day` is the day the habit is being asked about — `judgedDay`, not the date.
 * That is what makes the avoid case safe: the day handed in has already ended,
 * so an empty one is a day come through rather than a day still running.
 */
export function dayState(
  habit: Pick<Habit, 'cadence' | 'archivedAt'> & { kind?: HabitKind; phases?: Phase[] },
  entries: EntryMap,
  day: string,
): EntryState | 'due' | 'rest' {
  if (habit.archivedAt) return 'rest';
  if (!isTargetDayOn(habit as { cadence: Cadence; phases?: Phase[] }, day)) return 'rest';
  const logged = entries[day];
  if (logged) return logged;
  return silenceIsClean(habit) ? 'held' : 'due';
}

/**
 * Whether today's answer can simply be taken back.
 *
 * Only the ones that cost nothing. A freeze and a repair each spent a token, and
 * the token is gone — offering to un-spend it would be a lie about what the
 * ledger did, which is the same reason the check-in toast never offers Undo on
 * them. A day that is still `due` or a `rest` day has nothing to undo. A
 * `broke` day is undoable on purpose: taking the slip back is exactly what
 * unblocks answering that day clean.
 */
export function canUndoToday(state: EntryState | 'due' | 'rest'): boolean {
  return state === 'held' || state === 'skipped' || state === 'broke';
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
 * A side of the day switch, carrying what is still open on it.
 *
 * The count is the whole reason the switch is worth its height: the point of
 * moving avoid habits off today is that they stop being seen, and a bare
 * "yesterday" would finish the job. A side with nothing waiting says only its
 * name, so the number means something when it is there.
 */
export function dayTabLabel(day: string, open: number): string {
  return open > 0 ? `${day} · ${open}` : day;
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
