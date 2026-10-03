import { Pressable, View } from 'react-native';

import { Mark } from '@/components/marks';
import { hasStep, stepNames } from '@/lib/steps';
import { COLORS } from '@/theme/colors';

type StepControlProps = {
  name: string;
  checks: number;
  /** The day's checks as a bitmask (`lib/steps`). */
  amount: number;
  /** Morning and night — a sun and a moon — or plain checks, drawn as bars. */
  named: boolean;
  /** Left out, the control only shows: the Habits tab summary and the builder's preview. */
  onToggle?: (step: number) => void;
};

/**
 * The checks of a habit done more than once a day, one control each, so the
 * night dose can be ticked without the morning one standing in for it.
 *
 * The habit decides how they look. A morning-and-night habit gets a sun and a
 * moon, because which half of the day is still open is the whole question; a
 * plain one gets a tight row of bars, because only how many are in matters.
 */
export function StepControl({ name, checks, amount, named, onToggle }: StepControlProps) {
  const steps = stepNames(checks, named);

  return (
    <View className={['flex-row items-center', named ? 'gap-1.5' : 'gap-1'].join(' ')}>
      {steps.map((step, index) => {
        const done = hasStep(amount, index);
        return (
          <Pressable
            key={step}
            accessibilityRole={onToggle ? 'checkbox' : undefined}
            accessibilityState={{ checked: done }}
            accessibilityLabel={`${step} on ${name}, ${done ? 'done' : 'open'}`}
            disabled={!onToggle}
            // A bar is narrow, so its target reaches up and down rather than
            // sideways into the next one.
            hitSlop={named ? 4 : { top: 12, bottom: 12, left: 2, right: 2 }}
            onPress={() => onToggle?.(index)}
          >
            {named ? (
              <View
                className={[
                  'h-10 w-10 items-center justify-center rounded-full border-2',
                  done ? 'border-primary bg-primary' : 'border-border',
                ].join(' ')}
              >
                <Mark mark={step === 'night' ? 'moon' : 'sun'} size={17} color={done ? COLORS.accentInk : COLORS.muted} />
              </View>
            ) : (
              <View className={['h-7 w-2.5 rounded-full', done ? 'bg-primary' : 'bg-white/15'].join(' ')} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
