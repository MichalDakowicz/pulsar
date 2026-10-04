import { Pressable, Text, View } from 'react-native';

import { Mark } from '@/components/marks';
import { MARK_GROUPS, marksIn } from '@/components/markTable';
import { COLORS } from '@/theme/colors';

type MarkPickerProps = {
  value: string;
  onPick: (key: string) => void;
};

/**
 * Every mark on screen at once, row after row, under a word for what it is
 * about — a strip that scrolls sideways hides most of them behind the edge,
 * and fifty in one block is a search rather than a glance.
 */
export function MarkPicker({ value, onPick }: MarkPickerProps) {
  return (
    <View className="gap-3">
      {MARK_GROUPS.map((group) => (
        <View key={group} className="gap-1.5">
          <Text className="text-xs text-muted-foreground">{group}</Text>
          <View className="flex-row flex-wrap gap-2">
            {marksIn(group).map((mark) => {
              const active = value === mark.key;
              return (
                <Pressable
                  key={mark.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${mark.key} mark`}
                  onPress={() => onPick(mark.key)}
                  className={['h-11 w-11 items-center justify-center rounded-lg', active ? 'bg-primary' : 'bg-secondary'].join(' ')}
                >
                  <Mark mark={mark.key} size={20} color={active ? COLORS.accentInk : COLORS.muted} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
