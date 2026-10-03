import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCreateHabit, useUpdateHabit, type NewHabit } from '@/features/habits/useHabits';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toHabitDraft, type BuilderState } from '@/lib/builder';
import { suggestedPledge } from '@/lib/builderWords';
import { dateKey } from '@/lib/dates';
import { changedRules, phasesAfterChange, type ChangeScope } from '@/lib/phases';
import { sharesAnything } from '@/lib/userSettings';
import { readError } from '@/lib/utils';
import type { Habit } from '@/types/habit';

/**
 * Saving the builder: a new habit straight in, an edit through the question of
 * how far back it reaches.
 *
 * `habit` is the whole saved row rather than its id, because a rule change is
 * sealed against the rules and phases it replaces, and those are only on it.
 */
export function useBuilderSave(habit?: Habit) {
  const router = useRouter();
  const { say } = useToast();
  const create = useCreateHabit();
  const update = useUpdateHabit();
  const { settings } = useUserSettings();
  const canShare = sharesAnything(settings);
  // An edit whose rules moved, held back until the sheet says how far the
  // change reaches. Null the rest of the time, which is most of the time.
  const [pending, setPending] = useState<{ draft: NewHabit; changed: string[] } | null>(null);

  const saveEdit = async (draft: NewHabit, scope: ChangeScope | null) => {
    if (!habit) return;
    try {
      // An edit never moves the day the habit started and never clears its
      // phases by accident. The check fields go only when they changed, so an
      // edit to anything else saves on a database without those columns.
      const { startedOn: _startedOn, phases: _phases, checksPerDay, checksNamed, ...rest } = draft;
      const patch = {
        ...rest,
        ...(checksPerDay !== habit.checksPerDay ? { checksPerDay } : {}),
        ...(checksNamed !== habit.checksNamed ? { checksNamed } : {}),
      };
      await update.mutateAsync({
        id: habit.id,
        patch: scope ? { ...patch, phases: phasesAfterChange(habit, scope, dateKey()) } : patch,
      });
      say(`${draft.name} updated.`);
      router.back();
    } catch (error) {
      say(readError(error));
    }
  };

  const commit = async (state: BuilderState) => {
    const draft = toHabitDraft({
      ...state,
      pledge: state.pledge.trim() || suggestedPledge(state),
      // The shelf flag cannot be true when the account shares nothing; saving
      // it as true would have it quietly switch on the day privacy opens up.
      publicShelf: canShare ? state.publicShelf : false,
    });
    if (habit) {
      // Only a rule the past is judged by asks the question. A renamed habit or
      // a moved reminder saves the moment the button is held.
      const changed = changedRules(habit, draft);
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
      say(readError(error));
    }
  };

  return {
    canShare,
    commit,
    pending,
    applyScope: (scope: ChangeScope) => {
      const draft = pending?.draft;
      setPending(null);
      if (draft) void saveEdit(draft, scope);
    },
    dismiss: () => setPending(null),
  };
}
