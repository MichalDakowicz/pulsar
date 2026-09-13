import { useMemo } from 'react';

import { useEntries } from '@/features/habits/useEntries';
import { useHabits } from '@/features/habits/useHabits';
import { useTokens } from '@/features/habits/useTokens';
import { addDays, dateKey, hoursToMidnight } from '@/lib/dates';
import { canUndoToday, dayProgress, dayState, effectiveRule } from '@/lib/habit';
import { hasRebuilt, isPerfectToday, perfectDays, type HabitSchedule } from '@/lib/perfect';
import { isTargetDay } from '@/lib/schedule';
import { computeStreak, hitRate, isAtRisk, repairableDays, type EntryMap, type StreakResult } from '@/lib/streak';
import type { Habit } from '@/types/habit';

/**
 * Everything derived from the habit set, computed once.
 *
 * Today, Habits, Stats and Awards all want the same figures, and four screens
 * each walking their own calendar is both four times the work and four chances
 * for the ladder to disagree with the ring. So the walk happens here and the
 * screens read it.
 */

export type BoardHabit = {
  habit: Habit;
  streak: StreakResult;
  /** Today's resolution: an entry state, `due`, or `rest` when nothing was owed. */
  today: 'held' | 'frozen' | 'repaired' | 'skipped' | 'due' | 'rest';
  /** 0–1 of today's target, for the row fill on a counter habit. */
  progress: number;
  amount: number;
  rate: number;
  atRisk: boolean;
  /** Recent misses that could still be filled in — empty when there is nothing to repair. */
  repairable: string[];
  entries: EntryMap;
  amounts: Record<string, number>;
};

export type HabitBoard = {
  rows: BoardHabit[];
  /** Due today and not yet resolved, in sort order. */
  open: BoardHabit[];
  /** Due today and resolved. */
  done: BoardHabit[];
  /** Not due today at all. Collapsed on Today rather than listed as pending. */
  resting: BoardHabit[];
  dueCount: number;
  doneCount: number;
  /** Rows whose answer can still be taken back for free — drives the undo hint. */
  undoableCount: number;
  /** The one habit whose streak can still be saved tonight, or null. */
  atRisk: BoardHabit | null;
  bestStreak: number;
  longestLive: number;
  perfectCount: number;
  cleanRun: number;
  rebuilt: boolean;
  perfectToday: boolean;
  tokens: number;
  tokensToNext: number;
  tokensSpent: number;
  today: string;
  hoursLeft: number;
  loading: boolean;
  /** A failed read — most often the schema has not been applied yet. */
  error: unknown;
};

export function useHabitBoard(): HabitBoard {
  const { active, loading: habitsLoading, error: habitsError } = useHabits();
  const { byHabit, amounts, loading: entriesLoading, error: entriesError } = useEntries();

  const today = dateKey();
  // Recomputed on every render rather than held in state: the only consumer is
  // the risk window, and a countdown that needs a timer to stay honest would
  // re-render the whole board once a second to move a label by one minute.
  const hoursLeft = hoursToMidnight();

  const schedules = useMemo<HabitSchedule[]>(
    () =>
      active.map((habit) => ({
        id: habit.id,
        cadence: habit.cadence,
        startedOn: habit.startedOn,
        archivedAt: habit.archivedAt,
      })),
    [active],
  );

  const perfect = useMemo(() => {
    if (schedules.length === 0) return { days: [], count: 0, cleanRun: 0 };
    const earliest = schedules.reduce((min, h) => (h.startedOn < min ? h.startedOn : min), today);
    return perfectDays(schedules, byHabit, earliest, today);
  }, [schedules, byHabit, today]);

  const tokens = useTokens(perfect.count);

  const rows = useMemo<BoardHabit[]>(() => {
    return active.map((habit) => {
      const entries = byHabit.get(habit.id) ?? {};
      const habitAmounts = amounts.get(habit.id) ?? {};
      const streak = computeStreak(entries, habit.cadence, effectiveRule(habit), habit.startedOn, today);
      const state = dayState(habit, entries, today);
      const amount = habitAmounts[today] ?? 0;

      return {
        habit,
        streak,
        today: state,
        // A held day is full whatever the counter says: the target was met, and
        // a bar that stops at 97% on a day you finished reads as a failure.
        progress: state === 'held' || state === 'repaired' ? 1 : dayProgress(habit, amount),
        amount,
        rate: hitRate(streak),
        atRisk: isAtRisk(entries, habit.cadence, streak.current, today, hoursLeft),
        repairable: repairableDays(streak, today),
        entries,
        amounts: habitAmounts,
      };
    });
  }, [active, byHabit, amounts, today, hoursLeft]);

  const open = rows.filter((row) => row.today === 'due');
  const done = rows.filter((row) => row.today === 'held' || row.today === 'repaired' || row.today === 'frozen' || row.today === 'skipped');
  const resting = rows.filter((row) => row.today === 'rest');

  // The most valuable streak on the line, not the first one found — if only one
  // banner can be shown, it should be the one that costs most to lose.
  const atRisk = rows
    .filter((row) => row.atRisk)
    .sort((a, b) => b.streak.current - a.streak.current)[0] ?? null;

  const rebuilt = useMemo(
    () =>
      rows.some((row) =>
        hasRebuilt(row.entries, row.habit.cadence, row.habit.startedOn, today),
      ),
    [rows, today],
  );

  return {
    rows,
    open,
    done,
    resting,
    dueCount: open.length + done.length,
    doneCount: done.filter((row) => row.today === 'held' || row.today === 'repaired').length,
    undoableCount: done.filter((row) => canUndoToday(row.today)).length,
    atRisk,
    bestStreak: rows.reduce((max, row) => Math.max(max, row.streak.best, row.streak.current), 0),
    longestLive: rows.reduce((max, row) => Math.max(max, row.streak.current), 0),
    perfectCount: perfect.count,
    cleanRun: perfect.cleanRun,
    rebuilt,
    perfectToday: isPerfectToday(schedules, byHabit, today),
    tokens: tokens.tokens,
    tokensToNext: tokens.toNext,
    tokensSpent: tokens.spent,
    today,
    hoursLeft,
    loading: habitsLoading || entriesLoading,
    error: habitsError ?? entriesError ?? null,
  };
}

/**
 * The next day a habit comes due, as a sentence. Used on a resting row, where
 * "not today" without a "then when" is a dead end.
 */
export function nextDueLabel(habit: Habit, today: string): string {
  for (let i = 1; i <= 14; i++) {
    const day = addDays(today, i);
    if (isTargetDay(habit.cadence, day)) {
      if (i === 1) return 'due tomorrow';
      if (i < 7) return `due in ${i} days`;
      return 'due next week';
    }
  }
  return 'not scheduled';
}
