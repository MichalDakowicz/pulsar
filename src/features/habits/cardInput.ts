import type { BoardHabit } from '@/features/habits/useHabitBoard';
import type { CardInput } from '@/lib/habitCard';
import { isWeeklyTarget } from '@/lib/weekTarget';

/** A board row, reduced to what the card rules in `lib/habitCard` read. */
export function toCardInput(row: BoardHabit): CardInput {
  const { habit } = row;
  return {
    today: row.today,
    atRisk: row.atRisk,
    undoable: row.undoable,
    counter: habit.kind === 'count' || habit.kind === 'timer',
    weekly: isWeeklyTarget(habit),
    amount: row.amount,
    target: habit.target,
    weekAmount: row.weekAmount,
    weekTarget: row.weekTarget,
    avoid: row.asksYesterday,
  };
}
