import { useRouter } from 'expo-router';

import { HabitCard } from '@/features/habits/HabitCard';
import type { useCheckIn } from '@/features/habits/useCheckIn';
import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { holdAmount } from '@/lib/habit';
import type { CheckinMode } from '@/lib/habitSettings';
import { isMultiStep, lastDoneStep, nextOpenStep } from '@/lib/steps';
import { useCardLook } from '@/store/cardLook';

type TodayCardProps = {
  row: BoardHabit;
  mode: CheckinMode;
  checkIn: ReturnType<typeof useCheckIn>;
  /** The calendar date, which is not the day an avoid habit's row is about. */
  today: string;
  namesDay: boolean;
};

/**
 * A habit card on Today, with every answer wired to the check-in.
 *
 * A habit checked twice a day answers one check at a time: the swipe ticks the
 * first one still open and the swipe back takes off the latest, so the gesture
 * still means "done" and "not done" — just for this check rather than the day.
 */
export function TodayCard({ row, mode, checkIn, today, namesDay }: TodayCardProps) {
  const router = useRouter();
  const { layout, stepStyle } = useCardLook();
  const { habit, judged } = row;
  const multi = isMultiStep(habit);

  const tick = (step: number | null) => {
    if (step !== null) void checkIn.tick(habit, judged, row.amount, step);
  };

  return (
    <HabitCard
      row={row}
      mode={mode}
      layout={layout}
      stepStyle={stepStyle}
      namesDay={namesDay}
      onOpen={() => router.navigate(`/habit/${habit.id}`)}
      onHold={() =>
        multi
          ? tick(nextOpenStep(row.amount, habit.checksPerDay))
          : void checkIn.hold(habit, row.streak.current + 1, holdAmount(habit, row.weekAmount), judged)
      }
      onSkip={row.today === 'due' ? () => void checkIn.skip(habit, judged) : undefined}
      onUndo={
        row.undoable
          ? () => (multi ? tick(lastDoneStep(row.amount, habit.checksPerDay)) : void checkIn.undo(habit, judged))
          : undefined
      }
      onSlip={
        row.asksYesterday
          ? () =>
              void (row.entries[today] === 'broke' ? checkIn.clear(habit, today) : checkIn.did(habit, today))
          : undefined
      }
      onAdd={(delta) => void checkIn.add(habit, judged, row.amount, delta, row.headroom, row.weekAmount)}
      onStep={multi ? (step) => tick(step) : undefined}
    />
  );
}
