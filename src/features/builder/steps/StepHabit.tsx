import { Pressable, Text, View } from 'react-native';

import { MARKS, Mark } from '@/components/marks';
import { Field, Overline } from '@/components/ui/controls';
import type { StepProps } from '@/features/builder/steps/shared';
import { KIND_LABELS } from '@/lib/habit';
import { COLORS } from '@/theme/colors';
import type { HabitKind } from '@/types/habit';

/** Step 1 — the name, how it is judged, and the mark. */
export function StepHabit({ state, set }: StepProps) {
  return (
    <View className="gap-5 pt-5">
      <Field
        value={state.name}
        onChangeText={(value) => set('name', value)}
        placeholder="walk after lunch"
        maxLength={60}
        accessibilityLabel="habit name"
      />

      <View className="gap-2.5">
        <Overline>how it is judged</Overline>
        <View className="flex-row flex-wrap gap-1.5">
          {(Object.keys(KIND_LABELS) as HabitKind[]).map((kind) => {
            const active = state.kind === kind;
            return (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={KIND_LABELS[kind].label}
                onPress={() => set('kind', kind)}
                className={[
                  'min-w-[47%] flex-1 rounded-lg border px-3 py-2.5',
                  active ? 'border-primary bg-primary/10' : 'border-border',
                ].join(' ')}
              >
                <Text className={['text-sm font-semibold', active ? 'text-primary' : 'text-foreground'].join(' ')}>
                  {KIND_LABELS[kind].label}
                </Text>
                <Text className="text-[11px] text-muted-foreground">{KIND_LABELS[kind].sub}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2.5">
        <Overline>its mark</Overline>
        <View className="flex-row flex-wrap gap-2">
          {MARKS.map((mark) => {
            const active = state.mark === mark.key;
            return (
              <Pressable
                key={mark.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${mark.key} mark`}
                onPress={() => set('mark', mark.key)}
                className={['h-11 w-11 items-center justify-center rounded-lg', active ? 'bg-primary' : 'bg-secondary'].join(' ')}
              >
                <Mark mark={mark.key} size={20} color={active ? COLORS.accentInk : COLORS.muted} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2.5">
        <Overline>why (pulsar reads this back at you)</Overline>
        <Field
          value={state.why}
          onChangeText={(value) => set('why', value)}
          placeholder="because the mornings i skip it are the bad ones"
          multiline
          numberOfLines={2}
          maxLength={200}
          accessibilityLabel="why this habit matters"
        />
      </View>
    </View>
  );
}
