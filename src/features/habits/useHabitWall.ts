import { useMemo } from 'react';

import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { dayProgress } from '@/lib/habit';
import { targetOn } from '@/lib/phases';
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
    const progress: Record<string, number> = {};
    for (const [day, amount] of Object.entries(amounts)) {
      progress[day] = dayProgress({ kind: habit.kind, target: targetOn(habit, day) }, amount);
    }
    return buildWall(entries, habit, { weeks, startedOn: habit.startedOn, progress });
  }, [entries, amounts, habit, weeks]);
}
