import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { StepControl } from '@/features/habits/StepControl';
import { COLORS } from '@/theme/colors';

/**
 * How many checks a day, and how they read: named for the parts of the day or
 * plain. Each choice carries a preview of the control it puts on the card, so
 * the sun and the moon are picked by sight rather than by a word in a chip.
 */
const CHOICES: { checks: number; named: boolean; label: string }[] = [
  { checks: 1, named: true, label: 'once' },
  { checks: 2, named: true, label: 'morning & night' },
  { checks: 2, named: false, label: 'twice' },
  { checks: 3, named: true, label: 'morning to night' },
  { checks: 3, named: false, label: '3 times' },
];

type ChecksPickerProps = {
  checks: number;
  named: boolean;
  onPick: (checks: number, named: boolean) => void;
};

export function ChecksPicker({ checks, named, onPick }: ChecksPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {CHOICES.map((choice) => {
        const active = choice.checks === checks && (choice.checks === 1 || choice.named === named);
        return (
          <Pressable
            key={choice.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={choice.label}
            onPress={() => onPick(choice.checks, choice.named)}
            className={[
              'min-w-[47%] flex-1 flex-row items-center gap-3 rounded-xl border px-3 py-2.5 active:opacity-80',
              active ? 'border-primary bg-primary/10' : 'border-transparent bg-white/5',
            ].join(' ')}
          >
            {choice.checks === 1 ? (
              // One check is the ordinary tick every habit already has.
              <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary">
                <Check size={17} color={COLORS.accentInk} strokeWidth={3} />
              </View>
            ) : (
              // The first check filled, so done and open are both in the preview.
              <StepControl name={choice.label} checks={choice.checks} named={choice.named} amount={1} />
            )}
            <Text className={['shrink text-sm font-semibold', active ? 'text-primary' : 'text-foreground'].join(' ')}>
              {choice.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
