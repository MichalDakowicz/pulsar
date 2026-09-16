import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useClearEntry, useSetEntry } from '@/features/habits/useEntries';
import { useTokens } from '@/features/habits/useTokens';
import { formatDayShort } from '@/lib/dates';
import { isWeeklyTarget, weekTarget } from '@/lib/weekTarget';
import type { EntryState } from '@/lib/streak';
import { clearedTier, TIER_NAMES } from '@/lib/tiers';
import type { Habit } from '@/types/habit';

/**
 * Everything that can happen to a day, and what each one says afterwards.
 *
 * Undo is offered on exactly one of them. Checking in is reversible and people
 * fat-finger a swipe; spending a freeze token is not, because the token is
 * gone and offering to un-spend it would be a lie about what the ledger did.
 */
export function useCheckIn(perfectCount: number) {
  const { say } = useToast();
  const setEntry = useSetEntry();
  const clearEntry = useClearEntry();
  const { spendToken, tokens } = useTokens(perfectCount);

  const hold = useCallback(
    async (habit: Habit, nextStreak: number, amount = 1, day?: string) => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setEntry.mutateAsync({ habitId: habit.id, day, state: 'held', amount });

      const tier = clearedTier(nextStreak);
      if (tier) {
        // A rung cleared is the one moment worth interrupting for, so it takes
        // the toast on its own — no Undo competing with it.
        say(`${TIER_NAMES[tier as keyof typeof TIER_NAMES]}. ${tier} days on ${habit.name}.`);
        return;
      }
      say(`${habit.name} held — day ${nextStreak}.`, {
        label: 'undo',
        onPress: () => void clearEntry.mutateAsync({ habitId: habit.id, day }),
      });
    },
    [setEntry, clearEntry, say],
  );

  /**
   * Putting a number in, a bit at a time — the answer a counter habit has
   * always needed and never had.
   *
   * A counter is not a thing you finish in one gesture: eight glasses happen
   * across a day and twenty exercises across a week, so the only honest logger
   * is one that takes what you did just now and adds it to what is already
   * there. `delta` is that increment, positive or negative, and the entry is
   * rewritten to the running total rather than appended to — the day is one row
   * and it always says where the day stands.
   *
   * `room` is how much more the habit will accept, which is `allowExceed`'s
   * whole effect (lib/weekTarget). Clamped here rather than in the stepper so
   * the rule lives in one place and a caller cannot route around it.
   *
   * Dropping to zero clears the day instead of writing a nought: a day with an
   * entry of 0 and a day with no entry are the same fact, and keeping both
   * shapes means every reader downstream has to know that.
   */
  const add = useCallback(
    async (habit: Habit, day: string, current: number, delta: number, room: number, weekBefore = 0) => {
      const step = delta > 0 ? Math.min(delta, room) : delta;
      const next = Math.max(0, current + step);
      if (next === current) return;
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (next === 0) {
        await clearEntry.mutateAsync({ habitId: habit.id, day });
        return;
      }
      await setEntry.mutateAsync({ habitId: habit.id, day, state: 'held', amount: next });

      // Only the crossing is worth saying out loud. A toast on every press turns
      // a counter into a slot machine, and the one moment that actually matters
      // — the target coming in — would be lost among the others.
      const weekly = isWeeklyTarget(habit);
      const owed = weekly ? weekTarget(habit) : habit.target;
      const before = weekly ? weekBefore : current;
      const after = before + (next - current);
      if (before < owed && after >= owed) {
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        say(weekly ? `${habit.name} — the week is in at ${after}.` : `${habit.name} done — ${after} ${habit.unit}.`);
      }
    },
    [setEntry, clearEntry, say],
  );

  const freeze = useCallback(
    async (habit: Habit, day?: string) => {
      if (habit.hard) {
        say('hard mode. this habit does not take freeze tokens.');
        return;
      }
      if (tokens < 1) {
        say('no tokens left. one lands every 14 perfect days.');
        return;
      }
      await setEntry.mutateAsync({ habitId: habit.id, day, state: 'frozen', amount: 0 });
      await spendToken({ reason: 'freeze', habitId: habit.id, day });
      say('frozen. the streak survives, the day does not count.');
    },
    [setEntry, spendToken, tokens, say],
  );

  const repair = useCallback(
    async (habit: Habit, day: string) => {
      if (habit.hard) {
        say('hard mode. a missed day on this habit stays missed.');
        return;
      }
      if (tokens < 1) {
        say('repairing a day costs a token, and you have none.');
        return;
      }
      await setEntry.mutateAsync({ habitId: habit.id, day, state: 'repaired', amount: 1 });
      await spendToken({ reason: 'repair', habitId: habit.id, day });
      say('day repaired. one token spent.');
    },
    [setEntry, spendToken, tokens, say],
  );

  /**
   * An explicit "not today" — neither held nor missed.
   *
   * It exists so an honest answer is available on a day that genuinely did not
   * happen. Without it the only two options are lying to the wall or losing a
   * streak, and people pick the lie, which makes the whole wall worthless.
   */
  const skip = useCallback(
    async (habit: Habit, day?: string) => {
      await setEntry.mutateAsync({ habitId: habit.id, day, state: 'skipped', amount: 0 });
      say(`${habit.name} set aside.`, {
        label: 'undo',
        onPress: () => void clearEntry.mutateAsync({ habitId: habit.id, day }),
      });
    },
    [setEntry, clearEntry, say],
  );

  /**
   * "I did the thing I am avoiding" — logged while the day is still running.
   *
   * It is the only answer an avoid habit can give about today, because the
   * clean one is not knowable until midnight. Saying it early is what blocks
   * tomorrow's confirmation: the day already has an answer, and taking the slip
   * back is the only way to give it a different one.
   */
  const did = useCallback(
    async (habit: Habit, day?: string) => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setEntry.mutateAsync({ habitId: habit.id, day, state: 'broke', amount: 0 });
      say(`${habit.name} broken today. the day is logged, not hidden.`, {
        label: 'undo',
        onPress: () => void clearEntry.mutateAsync({ habitId: habit.id, day }),
      });
    },
    [setEntry, clearEntry, say],
  );

  /**
   * Answering a day that has already ended, for free.
   *
   * Only `held` and `skipped` are on offer, and that is the whole difference
   * from a repair: those are the two answers you are giving late, while
   * `frozen` and `repaired` are answers you bought. Which days get here at all
   * is `lib/backfill`'s decision, not this hook's — it writes what it is told.
   */
  const backfill = useCallback(
    async (habit: Habit, day: string, state: EntryState | null) => {
      if (state === null) {
        await clearEntry.mutateAsync({ habitId: habit.id, day });
        say(`${formatDayShort(day)} is empty again.`);
        return;
      }
      await setEntry.mutateAsync({
        habitId: habit.id,
        day,
        state,
        amount: state === 'held' ? 1 : 0,
      });
      say(state === 'held' ? `${formatDayShort(day)} held.` : `${formatDayShort(day)} set aside.`);
    },
    [setEntry, clearEntry, say],
  );

  const clear = useCallback(
    async (habit: Habit, day?: string) => {
      await clearEntry.mutateAsync({ habitId: habit.id, day });
    },
    [clearEntry],
  );

  /**
   * Taking today's answer back from the row itself, rather than from a toast
   * that has already gone. Lighter haptic than the check-in on purpose: undoing
   * is a correction, and it should not feel like an achievement.
   *
   * Only ever reached for a held or set-aside day — `canUndoToday` is what
   * decides that, and a frozen or repaired day never offers the gesture.
   */
  const undo = useCallback(
    async (habit: Habit, day?: string) => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await clearEntry.mutateAsync({ habitId: habit.id, day });
      say(`${habit.name} is open again.`);
    },
    [clearEntry, say],
  );

  return { hold, add, freeze, repair, skip, did, backfill, clear, undo, tokens };
}
