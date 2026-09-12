import { useMemo } from 'react';

import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { addDays, dateKey, weekKey, WEEKDAY_INITIALS } from '@/lib/dates';
import { dayProgress } from '@/lib/habit';
import { isTargetDay } from '@/lib/schedule';
import { buildWall, weekdayShape } from '@/lib/wall';
import { RANGE_WEEKS, useStatsRange } from '@/store/statsRange';

/**
 * Everything the Stats screen draws, derived in one pass over the same board
 * the rest of the app reads. The screen itself does no maths — a route file
 * that walks a calendar is a route file whose numbers drift from the wall.
 */
export function useStatsView() {
  const board = useHabitBoard();
  const range = useStatsRange((state) => state.range);
  const weeks = RANGE_WEEKS[range];

  return useMemo(() => {
    const today = dateKey();
    const monday = weekKey(today);

    // The combined wall across every habit, which is what the weekday shape and
    // the totals are scored from.
    const allWeeks = board.rows.flatMap((row) => {
      const progress: Record<string, number> = {};
      for (const [day, amount] of Object.entries(row.amounts)) {
        progress[day] = dayProgress(row.habit, amount);
      }
      return buildWall(row.entries, row.habit.cadence, {
        weeks,
        startedOn: row.habit.startedOn,
        progress,
      });
    });

    // This week, day by day: how many habits were held against how many were due.
    const weekHeld: number[] = [];
    const weekDue: number[] = [];
    for (let index = 0; index < 7; index++) {
      const day = addDays(monday, index);
      let held = 0;
      let due = 0;
      for (const row of board.rows) {
        if (day < row.habit.startedOn) continue;
        if (!isTargetDay(row.habit.cadence, day)) continue;
        due += 1;
        const state = row.entries[day];
        if (state === 'held' || state === 'repaired') held += 1;
      }
      weekHeld.push(held);
      weekDue.push(due);
    }

    const checkIns = board.rows.reduce((total, row) => total + row.streak.heldCount, 0);
    const weekTotalHeld = weekHeld.reduce((a, b) => a + b, 0);
    const weekTotalDue = weekDue.reduce((a, b) => a + b, 0);

    return {
      loading: board.loading,
      hasHistory: checkIns > 0,
      totals: [
        { key: 'check-ins', value: String(checkIns) },
        { key: 'perfect days', value: String(board.perfectCount) },
        { key: 'longest ever', value: `${board.bestStreak}d` },
        { key: 'freezes used', value: String(board.tokensSpent) },
      ],
      weekHeld,
      weekLabels: [...WEEKDAY_INITIALS],
      weekSummary: `${weekTotalHeld} of ${weekTotalDue} held`,
      shape: weekdayShape(allWeeks),
      consistency: board.rows
        .map((row) => ({ name: row.habit.name, rate: row.rate }))
        .sort((a, b) => b.rate - a.rate),
      rangeWeeks: weeks,
    };
  }, [board, weeks]);
}
