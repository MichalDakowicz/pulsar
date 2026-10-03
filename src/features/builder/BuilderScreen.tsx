import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { HoldButton } from '@/components/ui/HoldButton';
import { useToast } from '@/components/ui/Toast';
import { ChangeScopeSheet } from '@/features/builder/ChangeScopeSheet';
import { ClauseRail } from '@/features/builder/ClauseRail';
import { MeasureClause } from '@/features/builder/clauses/MeasureClause';
import { NameClause } from '@/features/builder/clauses/NameClause';
import { NudgeClause } from '@/features/builder/clauses/NudgeClause';
import { RhythmClause } from '@/features/builder/clauses/RhythmClause';
import { StakesClause } from '@/features/builder/clauses/StakesClause';
import { SentenceCard } from '@/features/builder/SentenceCard';
import { useBuilder } from '@/features/builder/useBuilder';
import { useBuilderSave } from '@/features/builder/useBuilderSave';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import type { BuilderState } from '@/lib/builder';
import type { Habit } from '@/types/habit';

type BuilderScreenProps = {
  initial?: BuilderState;
  /** Present when editing; absent when building something new. */
  habit?: Habit;
};

/**
 * The habit builder, for new habits and edits alike: the habit as one sentence,
 * each clause a tab.
 *
 * Editing reuses the same screen rather than a separate form, so a rule the
 * builder enforces cannot be walked around by going in the back way.
 */
export function BuilderScreen({ initial, habit }: BuilderScreenProps) {
  const router = useRouter();
  const { say } = useToast();
  const editing = !!habit;
  const builder = useBuilder(initial, editing);
  const save = useBuilderSave(habit);
  const bottom = useNavBarSpace();
  const { state } = builder;
  const props = { state, apply: builder.apply, choose: builder.choose, editing };

  const moveOn = () => {
    if (builder.stuck) {
      say(builder.stuck);
      return;
    }
    if (builder.next) builder.go(builder.next);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="flex-row items-center justify-between px-4 pt-3">
          <Pressable accessibilityRole="button" accessibilityLabel="cancel" hitSlop={8} onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-muted-foreground">cancel</Text>
          </Pressable>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {editing ? 'edit habit' : 'new habit'}
          </Text>
        </View>

        <View className="px-4 pt-4">
          <SentenceCard state={state} onPick={builder.go} />
        </View>
        <View className="px-4 pt-3">
          <ClauseRail clause={state.clause} seen={state.seen} onPick={builder.go} />
        </View>

        <View className="px-4 pt-6">
          {state.clause === 'name' && <NameClause {...props} onSubmit={moveOn} />}
          {state.clause === 'measure' && <MeasureClause {...props} />}
          {state.clause === 'rhythm' && <RhythmClause {...props} />}
          {state.clause === 'nudge' && <NudgeClause {...props} />}
          {state.clause === 'stakes' && <StakesClause {...props} canShare={save.canShare} />}
        </View>

        {/* A new habit walks the clauses and holds at the end; an edit can be
            held from any clause, since every clause already has its answer. */}
        <View className="px-4 pb-6 pt-7">
          {editing || !builder.next ? (
            <HoldButton
              label={editing ? 'hold to save the changes' : 'hold to start the streak'}
              disabled={!!builder.blocked}
              disabledReason={builder.blocked ?? undefined}
              onComplete={() => void save.commit(state)}
            />
          ) : (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`next: ${builder.next}`}
                accessibilityState={{ disabled: !!builder.stuck }}
                onPress={moveOn}
                className={['items-center rounded-full py-3.5', builder.stuck ? 'bg-secondary' : 'bg-primary'].join(' ')}
              >
                <Text className={['text-sm font-bold', builder.stuck ? 'text-muted-foreground' : 'text-primary-foreground'].join(' ')}>
                  next: {builder.next}
                </Text>
              </Pressable>
              {!!builder.stuck && <Text className="mt-1.5 text-center text-xs text-muted-foreground">{builder.stuck}</Text>}
            </View>
          )}
        </View>
      </ContentShell>

      {/* Keyed on the change so a second pass at the sheet opens on its own
          default rather than on whatever was picked and then cancelled. */}
      <ChangeScopeSheet
        key={save.pending?.changed.join('+') ?? 'none'}
        open={!!save.pending}
        changed={save.pending?.changed ?? []}
        onApply={save.applyScope}
        onDismiss={save.dismiss}
      />
    </ScrollView>
  );
}
