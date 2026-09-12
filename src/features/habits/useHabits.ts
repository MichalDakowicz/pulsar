import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { dateKey } from '@/lib/dates';
import { habitToRow, normalizeHabit, type HabitRow } from '@/lib/habitRow';
import { supabase } from '@/lib/supabase';
import type { Habit } from '@/types/habit';

/**
 * Every habit you own, archived ones included. One query rather than two: the
 * archive is a filter over the same list, and an archived habit still has to be
 * reachable from a wall that was drawn before it was archived.
 */

function habitsKey(userId: string | undefined) {
  return ['habits', userId] as const;
}

async function fetchHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as HabitRow[]).map(normalizeHabit);
}

export function useHabits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = habitsKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchHabits(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`habits:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const habits = query.data ?? [];
  const active = useMemo(() => habits.filter((habit) => !habit.archivedAt), [habits]);
  const archived = useMemo(() => habits.filter((habit) => habit.archivedAt), [habits]);

  return {
    habits,
    active,
    archived,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useHabit(id: string | undefined) {
  const { habits, loading, error } = useHabits();
  const habit = habits.find((candidate) => candidate.id === id) ?? null;
  return { habit, loading, error };
}

export type NewHabit = Omit<Habit, 'id' | 'userId' | 'sort' | 'archivedAt'>;

export function useCreateHabit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { habits } = useHabits();

  return useMutation({
    mutationFn: async (habit: NewHabit): Promise<Habit> => {
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          ...habitToRow({ ...habit, startedOn: habit.startedOn || dateKey() }),
          // New habits land at the bottom rather than the top: the order you
          // built them in is the order you check them off in.
          sort: habits.length,
        })
        .select('*')
        .single();
      if (error) throw error;
      return normalizeHabit(data as HabitRow);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitsKey(user?.id) }),
  });
}

export function useUpdateHabit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Habit> }) => {
      const row = habitToRow(patch);
      if (Object.keys(row).length === 0) return;
      const { error } = await supabase.from('habits').update(row).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitsKey(user?.id) }),
  });
}

/**
 * Archive and restore, never delete.
 *
 * A deleted habit takes its wall with it, and the wall is the only evidence the
 * streak ever happened. Archiving stops it asking for anything (lib/habit
 * `dayState` reads `archivedAt` first) and leaves the history intact — which is
 * also why the Habits tab has an archive section rather than a delete button.
 */
export function useArchiveHabit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('habits')
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitsKey(user?.id) }),
  });
}

/** Writes a whole new order in one round trip, so a drag cannot half-apply. */
export function useReorderHabits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!user) throw new Error('Not signed in');
      const updates = orderedIds.map((id, index) =>
        supabase.from('habits').update({ sort: index }).eq('id', id),
      );
      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitsKey(user?.id) }),
  });
}
