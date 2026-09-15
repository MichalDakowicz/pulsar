import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Mark } from '@/components/marks';
import { HoldButton } from '@/components/ui/HoldButton';
import { Overline } from '@/components/ui/controls';
import { useToast } from '@/components/ui/Toast';
import {
  StepCommitment,
  StepHabit,
  StepNudges,
  StepTarget,
} from '@/features/builder/BuilderSteps';
import { ChangeScopeSheet } from '@/features/builder/ChangeScopeSheet';
import {
  BUILDER_STEPS,
  builderSummary,
  builderTarget,
  STEP_SUBS,
  STEP_TITLES,
  suggestedPledge,
  toHabitDraft,
  useBuilder,
  type BuilderState,
} from '@/features/builder/useBuilder';
import { useCreateHabit, useUpdateHabit, type NewHabit } from '@/features/habits/useHabits';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { useUserSettings } from '@/hooks/useUserSettings';
import { dateKey } from '@/lib/dates';
import { targetLabel } from '@/lib/habit';
import { changedRules, phasesAfterChange, type ChangeScope } from '@/lib/phases';
import { cadenceLabel } from '@/lib/schedule';
import { sharesAnything } from '@/lib/userSettings';
import { COLORS } from '@/theme/colors';
import type { Habit } from '@/types/habit';

type BuilderScreenProps = {
  initial?: BuilderState;
  /**
   * Present when editing; absent when building something new. The whole habit
   * rather than its id: a rule change is sealed against the rules and the
   * phases it is replacing, and those are only on the saved row.
   */
  habit?: Habit;
};

/**
 * The five-step builder, used for both new habits and edits.
 *
 * Editing reuses the same flow rather than a separate form, so a rule the
 * builder enforces cannot be walked around by going in the back way — which is
 * exactly how a habit ends up with a cadence of no days or an exact-time window
 * and no time.
 */
export function BuilderScreen({ initial, habit }: BuilderScreenProps) {
  const router = useRouter();
  const { say } = useToast();
  const builder = useBuilder(initial);
  const create = useCreateHabit();
  const update = useUpdateHabit();
  const { settings } = useUserSettings();
  const bottom = useNavBarSpace();

  const { state, set, blocker, isLast } = builder;
  const editing = !!habit;
  const canShare = sharesAnything(settings);
  // An edit whose rules moved, held back until the sheet says how far the
  // change reaches. Null the rest of the time, which is most of the time.
  const [pending, setPending] = useState<{ draft: NewHabit; changed: string[] } | null>(null);

  const saveEdit = async (draft: NewHabit, scope: ChangeScope | null) => {
    if (!habit) return;
    try {
      // An edit never moves the day the habit started, and never clears its
      // phases by accident: `toHabitDraft` fills both in for a new habit, and
      // patching them over a saved one would take the wall with them.
      const { startedOn: _startedOn, phases: _phases, ...patch } = draft;
      await update.mutateAsync({
        id: habit.id,
        patch: scope ? { ...patch, phases: phasesAfterChange(habit, scope, dateKey()) } : patch,
      });
      say(`${draft.name} updated.`);
      router.back();
    } catch (error) {
      say(error instanceof Error ? error.message : 'that did not save.');
    }
  };

  const commit = async () => {
    const draft = toHabitDraft({
      ...state,
      pledge: state.pledge.trim() || suggestedPledge(state),
      // The shelf flag cannot be true when the account shares nothing; saving it
      // as true would have it quietly switch on the day privacy is opened up.
      publicShelf: canShare ? state.publicShelf : false,
    });
    if (habit) {
      const changed = changedRules(habit, draft);
      // Only a rule the past is judged by asks the question. A renamed habit or
      // a moved reminder saves the moment the button is held, as it always did.
      if (changed.length > 0) {
        setPending({ draft, changed });
        return;
      }
      await saveEdit(draft, null);
      return;
    }
    try {
      await create.mutateAsync(draft);
      say('committed. day one starts now.');
      router.navigate('/');
    } catch (error) {
      say(error instanceof Error ? error.message : 'that did not save.');
    }
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="cancel"
            hitSlop={8}
            onPress={() => router.back()}
          >
            <Text className="text-sm font-semibold text-muted-foreground">cancel</Text>
          </Pressable>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {editing ? 'edit habit' : 'new habit'}
          </Text>
        </View>

        <View className="flex-row gap-1 px-4 pt-4">
          {BUILDER_STEPS.map((label, index) => (
            <View key={label} className="flex-1 gap-1.5">
              <View
                className="h-[3px] rounded-full"
                style={{ backgroundColor: index <= state.step ? COLORS.accent : 'rgba(255,255,255,0.12)' }}
              />
              <Text
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: index === state.step ? COLORS.accent : COLORS.muted }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* The preview is the habit as it will appear on Today. It updates as
            you build, so the thing being committed to is visible before the
            commitment, not after it. */}
        <View className="px-4 pt-4">
          <Overline>preview</Overline>
          <View className="mt-2 flex-row items-center gap-3 rounded-xl bg-secondary p-3">
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Mark mark={state.mark} size={22} color={COLORS.accentInk} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className={['text-base font-bold', state.name ? 'text-foreground' : 'text-muted-foreground'].join(' ')}
                numberOfLines={1}
              >
                {state.name || 'name it'}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {[
                  targetLabel({ kind: state.kind, target: builderTarget(state), unit: state.unit }),
                  cadenceLabel(state.cadence),
                  state.window === 'anytime' ? 'no reminder' : state.times[0],
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-muted-foreground">day 0</Text>
          </View>
        </View>

        <View className="px-4 pt-6">
          <Text className="text-2xl font-bold tracking-tight text-foreground">{STEP_TITLES[state.step]}</Text>
          <Text className="mt-1.5 text-sm text-muted-foreground">{STEP_SUBS[state.step]}</Text>

          {state.step === 0 && <StepHabit state={state} set={set} />}
          {state.step === 1 && <StepTarget state={state} set={set} />}
          {state.step === 2 && <StepNudges state={state} set={set} />}
          {state.step === 3 && <StepCommitment state={state} set={set} canShare={canShare} />}
          {state.step === 4 && (
            <View className="gap-4 pt-5">
              <View className="rounded-2xl border border-border px-4">
                {builderSummary(state).map((row) => (
                  <View
                    key={row.key}
                    className="flex-row items-baseline justify-between gap-3 border-b border-border/50 py-3"
                  >
                    <Overline>{row.key}</Overline>
                    <Text className="flex-1 text-right text-sm font-semibold text-foreground">{row.value}</Text>
                  </View>
                ))}
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">
                  “{state.pledge.trim() || suggestedPledge(state)}”
                </Text>
                {!!state.why.trim() && (
                  <Text className="mt-2 text-xs text-muted-foreground">{state.why.trim()}</Text>
                )}
              </View>
              <HoldButton
                label={editing ? 'hold to save the changes' : 'hold to start the streak'}
                onComplete={() => void commit()}
              />
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-2 px-4 pb-6 pt-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.step === 0 ? 'cancel' : 'back a step'}
            onPress={() => (state.step === 0 ? router.back() : builder.back())}
            className="rounded-full border border-border px-5 py-3.5"
          >
            <Text className="text-sm font-semibold text-muted-foreground">back</Text>
          </Pressable>
          {/* The Next button disappears on the last step rather than sitting
              disabled beside the hold — two ways to finish is one too many. */}
          {!isLast && (
            <View className="flex-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="next step"
                accessibilityState={{ disabled: !!blocker }}
                onPress={() => {
                  if (blocker) {
                    say(blocker);
                    return;
                  }
                  builder.next();
                }}
                className={['items-center rounded-full py-3.5', blocker ? 'bg-secondary' : 'bg-primary'].join(' ')}
              >
                <Text
                  className={['text-sm font-bold', blocker ? 'text-muted-foreground' : 'text-primary-foreground'].join(' ')}
                >
                  next
                </Text>
              </Pressable>
              {!!blocker && <Text className="mt-1.5 text-center text-xs text-muted-foreground">{blocker}</Text>}
            </View>
          )}
        </View>
      </ContentShell>

      {/* Keyed on the change so a second pass at the sheet opens on its own
          default rather than on whatever was picked and then cancelled. */}
      <ChangeScopeSheet
        key={pending?.changed.join('+') ?? 'none'}
        open={!!pending}
        changed={pending?.changed ?? []}
        onApply={(scope) => {
          const draft = pending?.draft;
          setPending(null);
          if (draft) void saveEdit(draft, scope);
        }}
        onDismiss={() => setPending(null)}
      />
    </ScrollView>
  );
}
