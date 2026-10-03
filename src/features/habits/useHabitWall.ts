import { useMemo } from 'react';

import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { progressByDay } from '@/lib/habit';
import { buildWall, type WallWeek } from '@/lib/wall';

/**
 * One habit's wall, `weeks` long, ending today.
 *
 * Each day's progress is scored against the target that was in force that day,
 * so a counter whose target was raised last month does not repaint its old
 * full days as partial ones.
 */
export function useHabitWall(row: BoardHabit, weeks: number): WallWeek[] {
  const { habit, entries, amounts } = row;
  return useMemo(() => {
    const progress = progressByDay(habit, amounts);
    return buildWall(entries, habit, { weeks, startedOn: habit.startedOn, progress });
  }, [entries, amounts, habit, weeks]);
}
