import { Text, View } from 'react-native';

import { CardActionButton, CardCounter } from '@/features/habits/HabitCardActions';
import { ShapeMeter } from '@/features/habits/ShapeMeter';
import { StepControl } from '@/features/habits/StepControl';
import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { jumps, type CardAction } from '@/lib/habitCard';
import type { StepStyle } from '@/store/cardLook';

type CardTrailingProps = {
  row: BoardHabit;
  /** What the corner is for right now, decided by the card. */
  mode: 'count' | 'steps' | 'action' | 'summary';
  action: CardAction;
  tagged: boolean;
  stepStyle: StepStyle;
  onAction?: () => void;
  onAdd?: (delta: number) => void;
  onStep?: (step: number) => void;
};

/**
 * The right-hand end of a habit card: the stepper on a counter, one control per
 * check on a habit done twice a day, the single answer button on everything
 * else — and, on the read-only Habits tab, the streak, with the habit's shape
 * meter beside it when the row is tagged.
 */
export function CardTrailing({ row, mode, action, tagged, stepStyle, onAction, onAdd, onStep }: CardTrailingProps) {
  const { habit } = row;

  if (mode === 'count' && onAdd) {
    const weekly = row.weekTarget > 0;
    const owed = weekly ? row.weekTarget : habit.target;
    return (
      <CardCounter
        name={habit.name}
        unit={habit.kind === 'timer' ? 'min' : habit.unit}
        canLess={row.amount > 0}
        canMore={row.headroom > 0}
        jumpsMore={jumps(owed, 'more', row.amount, row.headroom)}
        jumpsLess={jumps(owed, 'less', row.amount, row.headroom)}
        onAdd={onAdd}
      />
    );
  }
  if (mode === 'steps' && onStep) {
    return (
      <StepControl
        name={habit.name}
        checks={habit.checksPerDay}
        named={habit.checksNamed}
        amount={row.amount}
        look={stepStyle}
        onToggle={onStep}
      />
    );
  }
  if (mode === 'action') return <CardActionButton action={action} name={habit.name} onPress={onAction} />;

  return (
    <View className="items-end gap-1">
      {tagged && <ShapeMeter row={row} stepStyle={stepStyle} />}
      <Text className="text-sm font-bold text-primary">{row.streak.current}d</Text>
    </View>
  );
}
