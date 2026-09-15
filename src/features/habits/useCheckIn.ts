import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useClearEntry, useSetEntry } from '@/features/habits/useEntries';
import { useTokens } from '@/features/habits/useTokens';
import { clearedTier, TIER_NAMES } from '@/lib/tiers';
import type { Habit } from '@/types/habit';

/**
 * The four things that can happen to a day, and what each one says afterwards.
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

  return { hold, freeze, repair, skip, did, clear, undo, tokens };
}
