import { Text, View } from 'react-native';

import { Mark } from '@/components/marks';
import { TypeTags } from '@/features/habits/TypeTags';
import { draftShape, type BuilderState, type Clause } from '@/lib/builder';
import { sentence } from '@/lib/builderWords';
import { COLORS } from '@/theme/colors';

type SentenceCardProps = {
  state: BuilderState;
  onPick: (clause: Clause) => void;
};

/**
 * The habit as one sentence, and the tabs it is built with.
 *
 * Every underlined clause is a way back into the question that wrote it, so the
 * whole commitment is on screen while any one part of it is being changed — the
 * preview and the navigation are the same thing.
 */
export function SentenceCard({ state, onPick }: SentenceCardProps) {
  const words = sentence(state);
  const token = (clause: Clause) => {
    const active = state.clause === clause;
    const placeholder = clause === 'name' && !state.name.trim();
    return (
      <Text
        key={clause}
        accessibilityRole="button"
        accessibilityLabel={`change ${clause}: ${words[clause]}`}
        onPress={() => onPick(clause)}
        suppressHighlighting
        className={[
          'underline',
          active ? 'bg-primary/15 text-primary' : placeholder ? 'text-muted-foreground' : 'text-foreground',
        ].join(' ')}
      >
        {words[clause]}
      </Text>
    );
  };

  return (
    <View className="rounded-2xl bg-secondary/60 p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Mark mark={state.mark} size={16} color={COLORS.accentInk} />
        </View>
        <View className="min-w-0 flex-1">
          <TypeTags habit={draftShape(state)} />
        </View>
        <Text className="text-xs font-semibold text-muted-foreground">day 0</Text>
      </View>
      <Text className="mt-3 text-xl font-semibold leading-relaxed text-muted-foreground">
        {token('name')} — {token('measure')}, {token('rhythm')}. {token('nudge')}. {token('stakes')}.
      </Text>
    </View>
  );
}
