import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { addDays, dateKey } from '@/lib/dates';
import { amountsByHabit, entriesByHabit, normalizeEntry, type HabitEntryRow } from '@/lib/habitRow';
import { supabase } from '@/lib/supabase';
import type { EntryState } from '@/lib/streak';
import type { HabitEntry } from '@/types/habit';

/**
 * Every entry inside the history window, for every habit at once.
 *
 * One query rather than one per habit: Today, the wall, Stats and the ladder all
 * want the same rows, and four habits on four screens is sixteen round trips the
 * moment this is split. The window is bounded because the wall never looks back
 * further than a year and an unbounded fetch grows with the account.
 */

export const HISTORY_DAYS = 400;

function entriesKey(userId: string | undefined) {
  return ['habit-entries', userId] as const;
}

async function fetchEntries(userId: string): Promise<HabitEntry[]> {
  const since = addDays(dateKey(), -HISTORY_DAYS);
  const { data, error } = await supabase
    .from('habit_entries')
    .select('habit_id, day, state, amount, created_at')
    .eq('user_id', userId)
    .gte('day', since);
  if (error) throw error;
  return (data as HabitEntryRow[]).map(normalizeEntry);
}

export function useEntries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = entriesKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchEntries(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`habit_entries:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habit_entries', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const entries = useMemo(() => query.data ?? [], [query.data]);
  const byHabit = useMemo(() => entriesByHabit(entries), [entries]);
  const amounts = useMemo(() => amountsByHabit(entries), [entries]);

  return { entries, byHabit, amounts, loading: query.isLoading, error: query.error };
}

export type SetEntryInput = {
  habitId: string;
  day?: string;
  state: EntryState;
  amount?: number;
};

/**
 * Writes one day of one habit.
 *
 * An upsert on the (habit_id, day) unique index rather than an insert, so a
 * double tap is idempotent — the constraint is what makes a fat-fingered second
 * press land on the same day instead of on a second streak day.
 */
export function useSetEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = entriesKey(user?.id);

  return useMutation({
    mutationFn: async ({ habitId, day, state, amount = 1 }: SetEntryInput) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('habit_entries').upsert(
        { user_id: user.id, habit_id: habitId, day: day ?? dateKey(), state, amount },
        { onConflict: 'habit_id,day' },
      );
      if (error) throw error;
    },
    // Optimistic, because the ring and the row fill are the feedback for the
    // gesture: waiting on a round trip makes a swipe feel like it failed.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HabitEntry[]>(queryKey) ?? [];
      const day = input.day ?? dateKey();
      const next = previous.filter((entry) => !(entry.habitId === input.habitId && entry.day === day));
      next.push({
        habitId: input.habitId,
        day,
        state: input.state,
        amount: input.amount ?? 1,
        at: new Date().toISOString(),
      });
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

/** Takes a day back off the wall. What Undo on the check-in toast calls. */
export function useClearEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = entriesKey(user?.id);

  return useMutation({
    mutationFn: async ({ habitId, day }: { habitId: string; day?: string }) => {
      const { error } = await supabase
        .from('habit_entries')
        .delete()
        .eq('habit_id', habitId)
        .eq('day', day ?? dateKey());
      if (error) throw error;
    },
    onMutate: async ({ habitId, day }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HabitEntry[]>(queryKey) ?? [];
      const target = day ?? dateKey();
      queryClient.setQueryData(
        queryKey,
        previous.filter((entry) => !(entry.habitId === habitId && entry.day === target)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
