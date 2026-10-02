import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { entriesKey } from '@/features/habits/useEntries';
import { habitsKey } from '@/features/habits/useHabits';
import { pactsKey } from '@/features/social/usePacts';
import { normalizeEntry, type HabitEntryRow } from '@/lib/habitRow';
import { removeEntry, upsertEntry } from '@/lib/entryList';
import { supabase } from '@/lib/supabase';
import type { HabitEntry } from '@/types/habit';

/**
 * The one realtime channel for habits, mounted from the root layout. It used to
 * live inside useHabits, useEntries and usePacts, which meant a channel per
 * mounted screen - and every one refetched its whole table for each event, the
 * entries among them being a 400-day window across every habit.
 *
 * A check-in arrives complete in the payload (a handful of small columns, nothing
 * TOASTed), so it is patched into the cached window with no read at all. Habits
 * and pacts are short lists and simply refetch.
 *
 * Realtime does not deliver a DELETE for a filtered subscription unless the table
 * has REPLICA IDENTITY FULL; when one does arrive with the day on it, it is
 * dropped, and without it the window is refetched.
 */
export function useHabitsRealtime() {
  const { user } = useAuth();
  const uid = user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const filter = `user_id=eq.${uid}`;
    const entries = entriesKey(uid);
    // Random suffix per the dev-mode double mount note: supabase-js caches
    // channels by name and a re-subscribed one throws on `.on()`.
    const channel = supabase
      .channel(`habits:${uid}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_entries', filter }, (payload) => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Partial<HabitEntryRow>;
        if (!row?.habit_id || !row.day) {
          queryClient.invalidateQueries({ queryKey: entries });
        } else if (payload.eventType === 'DELETE') {
          const { habit_id: habitId, day } = row;
          queryClient.setQueryData<HabitEntry[]>(entries, (list) => (list ? removeEntry(list, habitId, day) : list));
        } else {
          const entry = normalizeEntry(row as HabitEntryRow);
          queryClient.setQueryData<HabitEntry[]>(entries, (list) => (list ? upsertEntry(list, entry) : list));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter }, () =>
        queryClient.invalidateQueries({ queryKey: habitsKey(uid) }),
      )
      // A partner accepting should land on your pact card without a pull to
      // refresh. Unfiltered: a pact is yours as owner or as partner, and RLS
      // already decides which rows reach this socket.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_pacts' }, () =>
        queryClient.invalidateQueries({ queryKey: pactsKey(uid) }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);
}
