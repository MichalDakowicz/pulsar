import { Pressable, View } from 'react-native';

import { MARKS, Mark } from '@/components/marks';
import { Field, Overline } from '@/components/ui/controls';
import { Question, type ClauseProps } from '@/features/builder/clauses/shared';
import { COLORS } from '@/theme/colors';

/** The name, and the mark it is found by at a glance. */
export function NameClause({ state, apply, onSubmit }: ClauseProps & { onSubmit: () => void }) {
  return (
    <View className="gap-4">
      <Question>what is it called?</Question>
      <Field
        value={state.name}
        onChangeText={(name) => apply((current) => ({ ...current, name }))}
        placeholder="walk after lunch"
        maxLength={60}
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        accessibilityLabel="habit name"
      />
      <View className="gap-2.5">
        <Overline>its mark</Overline>
        {/* Every mark on screen at once, row after row: a strip that scrolls
            sideways hides most of them behind the edge. */}
        <View className="flex-row flex-wrap gap-2">
          {MARKS.map((mark) => {
            const active = state.mark === mark.key;
            return (
              <Pressable
                key={mark.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${mark.key} mark`}
                onPress={() => apply((current) => ({ ...current, mark: mark.key }))}
                className={['h-11 w-11 items-center justify-center rounded-lg', active ? 'bg-primary' : 'bg-secondary'].join(' ')}
              >
                <Mark mark={mark.key} size={20} color={active ? COLORS.accentInk : COLORS.muted} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
