import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { CounterBar } from '@/features/habits/CounterBar';
import { StepControl } from '@/features/habits/StepControl';
import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { weekFilled } from '@/lib/habitCard';
import { judgesByWeek } from '@/lib/schedule';
import { isMultiStep } from '@/lib/steps';
import { isWeeklyTarget } from '@/lib/weekTarget';
import type { StepStyle } from '@/store/cardLook';
import { COLORS } from '@/theme/colors';

/**
 * Where a habit stands today, drawn in its own shape: a tick for a check, a bar
 * for a counter, one pip per day a quota week owes, one per check on a habit
 * done twice a day. Read-only — the summary on the Habits tab, where a glance
 * should say which kind of habit each row is before the name is read.
 */
export function ShapeMeter({ row, stepStyle }: { row: BoardHabit; stepStyle: StepStyle }) {
  const { habit } = row;

  if (isMultiStep(habit)) {
    return (
      <StepControl name={habit.name} checks={habit.checksPerDay} named={habit.checksNamed} amount={row.amount} look={stepStyle} />
    );
  }
  if (habit.kind === 'count' || habit.kind === 'timer') {
    const weekly = isWeeklyTarget(habit);
    return (
      <View className="w-24">
        <CounterBar amount={weekly ? row.weekAmount : row.amount} target={weekly ? row.weekTarget : habit.target} />
      </View>
    );
  }
  if (judgesByWeek(habit.cadence) && habit.cadence.kind === 'weekly') {
    const filled = weekFilled(row.entries, row.judged);
    return (
      <View className="flex-row gap-1" accessibilityLabel={`${filled} of ${habit.cadence.perWeek} this week`}>
        {Array.from({ length: habit.cadence.perWeek }, (_, index) => (
          <View
            key={index}
            className={['h-2.5 w-2.5 rounded-full border-[1.5px] border-primary', index < filled ? 'bg-primary' : ''].join(' ')}
          />
        ))}
      </View>
    );
  }
  if (row.today === 'rest') return <Text className="text-[11px] font-semibold text-muted-foreground">rest day</Text>;
  if (habit.kind === 'avoid') {
    const slipped = row.today === 'broke';
    return (
      <Text className={['text-[11px] font-bold', slipped ? 'text-muted-foreground' : 'text-primary'].join(' ')}>
        {slipped ? 'slipped' : 'clean'}
      </Text>
    );
  }
  const done = row.today === 'held' || row.today === 'repaired';
  return (
    <View
      accessibilityLabel={done ? 'held today' : 'open today'}
      className={['h-7 w-7 items-center justify-center rounded-full border-2', done ? 'border-primary bg-primary' : 'border-border'].join(' ')}
    >
      {done && <Check size={14} color={COLORS.accentInk} strokeWidth={3} />}
    </View>
  );
}
