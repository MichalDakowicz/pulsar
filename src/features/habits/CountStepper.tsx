import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { stepSizes } from '@/lib/weekTarget';
import { COLORS } from '@/theme/colors';

/**
 * The number, and the way to move it.
 *
 * A counter habit is the one shape a swipe cannot answer: "did you?" has no
 * yes on a habit whose answer is eight, and until this existed the row could
 * only ever log a one. So the gesture is a stepper rather than a check — you
 * put in what you actually did, whenever you did it, and the row carries the
 * running total in between.
 *
 * It reads the period it is owed over from the row rather than deciding: on a
 * weekly target the headline is the *week*, because that is what has to add up
 * and today's five is only interesting as a contribution to it.
 */

type CountStepperProps = {
  row: BoardHabit;
  /** Positive or negative; the clamp against `allowExceed` lives in `useCheckIn`. */
  onAdd: (delta: number) => void;
};

export function CountStepper({ row, onAdd }: CountStepperProps) {
  const { habit, amount, weekAmount, weekTarget } = row;
  const weekly = weekTarget > 0;
  const owed = weekly ? weekTarget : habit.target;
  const done = weekly ? weekAmount : amount;
  const unit = habit.kind === 'timer' ? 'min' : habit.unit;
  // Room is computed on the board so the rule lives in one place. Exhausted
  // room greys the plus rather than hiding it: a control that vanishes at the
  // target reads as a bug, while a dead one reads as "that is the job done".
  const full = row.headroom <= 0;

  return (
    <View className="gap-2.5 rounded-xl border border-border/50 p-3">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`one fewer on ${habit.name}`}
          disabled={amount <= 0}
          onPress={() => onAdd(-1)}
          className={[
            'h-11 w-11 items-center justify-center rounded-full bg-secondary',
            amount <= 0 ? 'opacity-30' : '',
          ].join(' ')}
        >
          <Minus size={18} color={COLORS.foreground} />
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            {done}
            <Text className="text-base font-semibold text-muted-foreground">{` / ${owed}`}</Text>
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            {/* The period is said out loud on every counter, not only the weekly
                one. "12 / 20 exercises" with no period is the label someone
                reads as a day and plans a week around. */}
            {`${unit} ${weekly ? 'this week' : 'today'}`}
            {weekly && amount > 0 ? ` · ${amount} today` : ''}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`one more on ${habit.name}`}
          disabled={full}
          onPress={() => onAdd(1)}
          className={['h-11 w-11 items-center justify-center rounded-full bg-primary', full ? 'opacity-30' : ''].join(
            ' ',
          )}
        >
          <Plus size={18} color={COLORS.accentInk} />
        </Pressable>
      </View>

      {/* One tap per rep is fine for eight glasses and absurd for two hundred
          press-ups, so the jumps scale with the target. */}
      <View className="flex-row justify-center gap-2">
        {stepSizes(owed)
          .filter((step) => step > 1)
          .map((step) => (
            <Pressable
              key={step}
              accessibilityRole="button"
              accessibilityLabel={`add ${step} to ${habit.name}`}
              disabled={full}
              onPress={() => onAdd(step)}
              className={[
                'rounded-full border border-border px-3 py-1',
                full ? 'opacity-30' : '',
              ].join(' ')}
            >
              <Text className="text-xs font-semibold text-foreground">{`+${step}`}</Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}
