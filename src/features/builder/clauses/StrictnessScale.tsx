import { Pressable, Text, View } from 'react-native';

import { STRICTNESS, type Strictness } from '@/lib/builderEdits';

/**
 * Four stops on one track, gentlest to hardest. The track fills up to the stop
 * picked, so "how much a miss costs" reads as a quantity rather than a list of
 * rules to compare.
 */
export function StrictnessScale({ value, onChange }: { value: Strictness; onChange: (value: Strictness) => void }) {
  const position = STRICTNESS.indexOf(value);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="how strict" className="relative flex-row">
      <View className="absolute left-[12.5%] right-[12.5%] top-[9px] h-1 rounded-full bg-white/15">
        <View className="h-1 rounded-full bg-primary" style={{ width: `${(position / (STRICTNESS.length - 1)) * 100}%` }} />
      </View>
      {STRICTNESS.map((stop, index) => {
        const active = index === position;
        const lit = index <= position;
        return (
          <Pressable
            key={stop}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={stop}
            hitSlop={6}
            onPress={() => onChange(stop)}
            className="flex-1 items-center gap-2"
          >
            <View
              className={['h-[22px] w-[22px] rounded-full border-[3px] border-background', lit ? 'bg-primary' : 'bg-secondary'].join(' ')}
              style={active ? { transform: [{ scale: 1.25 }] } : null}
            />
            <Text className={['text-xs font-semibold', active ? 'text-primary' : 'text-muted-foreground'].join(' ')}>{stop}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
