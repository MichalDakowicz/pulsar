import { asksAboutYesterday, canUndoToday, dayProgress, dayState, effectiveRule, judgedDay } from '@/lib/habit';
import { isMultiStep, stepEntries, stepNames, stepStartsOn } from '@/lib/steps';
import { headroom, isWeeklyTarget, weekAmount, weekTarget } from '@/lib/weekTarget';
import {
  computeStreak,
  hitRate,
  isAtRisk,
  repairableDays,
  silenceIsClean,
  type EntryMap,
  type StreakResult,
} from '@/lib/streak';
import type { Habit } from '@/types/habit';

/**
 * One habit as every screen reads it: its streak, the state of the day it is
 * being asked about, and the numbers its card and wall draw. Built by
 * `useHabitBoard` for each habit, once.
 */

export type BoardHabit = {
  habit: Habit;
  streak: StreakResult;
  /** The resolution of the day being asked about: an entry state, `due`, or `rest`. */
  today: 'held' | 'frozen' | 'repaired' | 'skipped' | 'broke' | 'due' | 'rest';
  /** The day this row is actually about — yesterday for an avoid habit. */
  judged: string;
  /** Whether the row is asking about a day that has already ended. */
  asksYesterday: boolean;
  /**
   * Whether the answer on screen can be taken back. An avoid habit's clean day
   * is inferred rather than logged, so there is nothing to give back — offering
   * undo on it would be a gesture that clears an entry which was never written.
   */
  undoable: boolean;
  /** 0–1 of today's target, for the row fill on a counter habit. */
  progress: number;
  amount: number;
  /**
   * What the Monday-anchored week the judged day falls in has logged so far, and
   * what it owes. Both 0 on a habit whose target is not week-scoped.
   *
   * The week is the row's real subject on such a habit: today's number is only
   * interesting as a contribution, and a row that showed 5 without saying 5 of
   * what would be a row that has to be tapped to be read.
   */
  weekAmount: number;
  weekTarget: number;
  /**
   * The most the logger will still accept in one go — `Infinity` when the habit
   * allows exceeding. Computed here so the stepper never has to know the rule.
   */
  headroom: number;
  rate: number;
  atRisk: boolean;
  /** Recent misses that could still be filled in — empty when there is nothing to repair. */
  repairable: string[];
  /**
   * The scored record (`lib/scoring`): a counter day under its target and a
   * multi-step day with a check left open read as unanswered here, though the
   * amounts still paint them. Everything that judges a day reads this one.
   */
  entries: EntryMap;
  amounts: Record<string, number>;
  /**
   * One streak per check on a habit checked more than once a day — the morning
   * dose and the night dose are kept, and lost, separately. `name` is null on
   * plain checks, which are drawn unlabelled. Empty on a habit checked once.
   */
  steps: { name: string | null; streak: number }[];
};

type RowInput = {
  /** Every entry as written — what each step's own streak is walked over. */
  raw: EntryMap;
  /** The scored record (`lib/scoring`) — what everything else judges by. */
  entries: EntryMap;
  amounts: Record<string, number>;
  today: string;
  hoursLeft: number;
};

export function boardRow(habit: Habit, { raw, entries, amounts: habitAmounts, today, hoursLeft }: RowInput): BoardHabit {
  // Everything about this row keys off the day it is asking about, not off
  // the calendar: for an avoid habit those are different days, and mixing
  // them is how a clean day gets scored twice or not at all.
  const judged = judgedDay(habit, today);
  // `effectiveRule` rather than the raw field, so hard mode still forces
  // strict on the current phase; the sealed ones already carry their own.
  const timeline = { ...habit, rule: effectiveRule(habit) };
  const streak = computeStreak(entries, timeline, judged, habitAmounts);
  const state = dayState(habit, entries, judged);
  const amount = habitAmounts[judged] ?? 0;
  const weekly = isWeeklyTarget(habit);

  return {
    habit,
    streak,
    today: state,
    judged,
    asksYesterday: asksAboutYesterday(habit),
    undoable: entries[judged] !== undefined && canUndoToday(state),
    // A held day is full whatever the counter says — except on a weekly
    // target, where a logged day is a contribution rather than a finish and
    // painting it full would say the week was done on its first evening.
    progress: weekly
      ? dayProgress(habit, amount)
      : state === 'held' || state === 'repaired'
        ? 1
        : dayProgress(habit, amount),
    amount,
    weekAmount: weekly ? weekAmount(habitAmounts, judged) : 0,
    weekTarget: weekTarget(habit),
    headroom: headroom(habit, amount, habitAmounts, judged),
    rate: hitRate(streak),
    // An avoid habit has no deadline to warn about: the day it is judged on
    // has already ended, and it ended clean unless a slip was logged.
    atRisk:
      !silenceIsClean(habit, judged) &&
      isAtRisk(entries, habit.cadence, streak.current, judged, hoursLeft, 6, {
        habit,
        amounts: habitAmounts,
      }),
    repairable: repairableDays(streak, judged),
    entries,
    amounts: habitAmounts,
    // Walked over the raw record: a step's day is kept by its own bit, not
    // by the full day the habit's streak waits for — and only from the day
    // the check existed, so a habit made twice a day starts its night at zero.
    steps: isMultiStep(habit)
      ? stepNames(habit.checksPerDay, habit.checksNamed).map((name, step) => ({
          name: habit.checksNamed ? name : null,
          streak: computeStreak(
            stepEntries(raw, habitAmounts, step),
            { ...timeline, startedOn: stepStartsOn(habit, step) ?? habit.startedOn },
            judged,
          ).current,
        }))
      : [],
  };
}
