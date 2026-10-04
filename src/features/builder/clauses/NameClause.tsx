import { View } from 'react-native';

import { Field, Overline } from '@/components/ui/controls';
import { MarkPicker } from '@/features/builder/clauses/MarkPicker';
import { Question, type ClauseProps } from '@/features/builder/clauses/shared';

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
        <MarkPicker value={state.mark} onPick={(mark) => apply((current) => ({ ...current, mark }))} />
      </View>
    </View>
  );
}
