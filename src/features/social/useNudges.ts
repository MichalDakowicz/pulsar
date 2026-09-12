import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { dateKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

/**
 * Nudges — one pact partner poking the other about one habit, once a day.
 *
 * The once-a-day limit is a unique index rather than a check in this file
 * (schema.sql), so the constraint holds even against a second device. Here the
 * only job is to turn the resulting conflict into a sentence rather than a
 * stack trace.
 */

export type Nudge = {
  id: string;
  fromId: string;
  habitId: string;
  day: string;
  seenAt: string | null;
  createdAt: string;
};

type NudgeRow = {
  id: string;
  from_id: string;
  habit_id: string;
  day: string;
  seen_at: string | null;
  created_at: string;
};

function key(userId: string | undefined) {
  return ['nudges', userId] as const;
}

/** Nudges pointed at you today, unseen first. */
export function useNudges() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: key(user?.id),
    queryFn: async (): Promise<Nudge[]> => {
      const { data, error } = await supabase
        .from('habit_nudges')
        .select('id, from_id, habit_id, day, seen_at, created_at')
        .eq('to_id', user!.id)
        .eq('day', dateKey())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as NudgeRow[]).map((row) => ({
        id: row.id,
        fromId: row.from_id,
        habitId: row.habit_id,
        day: row.day,
        seenAt: row.seen_at,
        createdAt: row.created_at,
      }));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const nudges = query.data ?? [];
  return { nudges, unseen: nudges.filter((nudge) => !nudge.seenAt), loading: query.isLoading };
}

export function useSendNudge() {
  const { user } = useAuth();
  const { settings } = useHabitSettings();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ toId, habitId }: { toId: string; habitId: string }) => {
      if (!user) throw new Error('Not signed in');
      // Someone who has turned partner nudges off has opted out of both
      // directions; sending while muted would be taking something you refused
      // to give.
      if (!settings.partnerNudges) {
        throw new Error('Turn partner nudges back on to send one.');
      }
      const { error } = await supabase
        .from('habit_nudges')
        .insert({ from_id: user.id, to_id: toId, habit_id: habitId, day: dateKey() });
      if (error) {
        if (error.code === '23505') throw new Error('Already nudged today. One is enough.');
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(user?.id) }),
  });
}

export function useMarkNudgesSeen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('habit_nudges')
        .update({ seen_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(user?.id) }),
  });
}
