import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { CLAUSES, type Clause } from '@/lib/builder';
import { COLORS } from '@/theme/colors';

type ClauseRailProps = {
  clause: Clause;
  seen: Clause[];
  onPick: (clause: Clause) => void;
};

/** The five clauses as numbered tabs. An answered one wears a tick instead of its number. */
export function ClauseRail({ clause, seen, onPick }: ClauseRailProps) {
  return (
    <View accessibilityRole="tablist" className="flex-row gap-1">
      {CLAUSES.map((item, index) => {
        const active = item === clause;
        const done = !active && seen.includes(item);
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item}
            onPress={() => onPick(item)}
            className={['flex-1 items-center gap-1 rounded-xl py-2', active ? 'bg-secondary' : ''].join(' ')}
          >
            <View
              className={[
                'h-5 w-5 items-center justify-center rounded-full',
                active ? 'bg-primary' : done ? 'bg-primary/20' : 'bg-white/10',
              ].join(' ')}
            >
              {done ? (
                <Check size={11} color={COLORS.accent} strokeWidth={3} />
              ) : (
                <Text className={['text-[10px] font-bold', active ? 'text-primary-foreground' : 'text-foreground'].join(' ')}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              className={['text-[11px] font-semibold', active ? 'text-foreground' : 'text-muted-foreground'].join(' ')}
              numberOfLines={1}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
