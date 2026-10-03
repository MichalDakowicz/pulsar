import { Pressable, View } from 'react-native';

import { Mark } from '@/components/marks';
import { hasStep, stepNames } from '@/lib/steps';
import type { StepStyle } from '@/store/cardLook';
import { COLORS } from '@/theme/colors';

type StepControlProps = {
  name: string;
  checks: number;
  /** The day's checks as a bitmask (`lib/steps`). */
  amount: number;
  /** Morning and night (a sun and a moon), or plain checks with nothing on them. */
  named: boolean;
  look: StepStyle;
  /** Left out, the control only shows — the Habits tab summary. */
  onToggle?: (step: number) => void;
};

/**
 * The checks of a habit done more than once a day, one control each, so the
 * night dose can be ticked without the morning one standing in for it. Drawn as
 * bars or as a sun and a moon, by the setting.
 */
export function StepControl({ name, checks, amount, named, look, onToggle }: StepControlProps) {
  const steps = stepNames(checks, named);

  return (
    <View className="flex-row items-center gap-1.5">
      {steps.map((step, index) => {
        const done = hasStep(amount, index);
        const label = `${step} on ${name}, ${done ? 'done' : 'open'}`;
        return (
          <Pressable
            key={step}
            accessibilityRole={onToggle ? 'checkbox' : undefined}
            accessibilityState={{ checked: done }}
            accessibilityLabel={label}
            disabled={!onToggle}
            hitSlop={4}
            onPress={() => onToggle?.(index)}
            className={look === 'pips' ? 'h-11 w-5 items-center justify-center' : ''}
          >
            {look === 'pips' ? (
              <View className={['h-6 w-[9px] rounded-full', done ? 'bg-primary' : 'bg-white/15'].join(' ')} />
            ) : (
              <View
                className={[
                  'h-10 w-10 items-center justify-center rounded-full border-2',
                  done ? 'border-primary bg-primary' : 'border-border',
                ].join(' ')}
              >
                {named ? (
                  <Mark mark={step === 'night' ? 'moon' : 'sun'} size={16} color={done ? COLORS.accentInk : COLORS.muted} />
                ) : (
                  done && <Mark mark="check" size={16} color={COLORS.accentInk} />
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
