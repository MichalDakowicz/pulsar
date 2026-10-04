import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { grantedSources, healthAccess, readHealth } from '@/features/health/healthConnect';
import { useHealthStatus } from '@/features/health/healthStatus';
import { entriesKey, useEntries } from '@/features/habits/useEntries';
import { useHabits } from '@/features/habits/useHabits';
import { dateKey } from '@/lib/dates';
import { linkedHabits, linkedSources, planSync, readFrom } from '@/lib/healthSync';
import { supabase } from '@/lib/supabase';
import type { HabitEntry } from '@/types/habit';

/**
 * Reads Health Connect and lifts the linked habits' days to what it says.
 *
 * It runs when the app comes to the front and whenever a link changes, at most
 * every couple of minutes otherwise. There is no background read: a habit only
 * moves while you are looking, which is also the only time a moving number is
 * worth anything.
 *
 * Every rule about what a reading may do lives in lib/healthSync; this hook
 * fetches, hands over, and writes what it is told.
 */

const MIN_GAP_MS = 2 * 60 * 1000;

export function useHealthSync() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const { loading: entriesLoading } = useEntries();
  const queryClient = useQueryClient();
  const nudge = useHealthStatus((state) => state.nudge);
  const finished = useHealthStatus((state) => state.finished);
  const running = useRef(false);
  const lastRun = useRef(0);

  const linked = useMemo(() => linkedHabits(habits), [habits]);
  // What the links say, as one string — a new or changed link reads at once.
  const linkKey = useMemo(() => linked.map((habit) => `${habit.id}:${JSON.stringify(habit.healthLink)}`).join('|'), [linked]);

  const run = useCallback(
    async (force: boolean) => {
      if (!user || linked.length === 0 || running.current) return;
      if (!force && Date.now() - lastRun.current < MIN_GAP_MS) return;
      // Without the entries in hand an empty day and an unread day look the
      // same, and the sync would write over a frozen or higher one.
      const entries = queryClient.getQueryData<HabitEntry[]>(entriesKey(user.id));
      if (!entries) return;

      running.current = true;
      lastRun.current = Date.now();
      try {
        if ((await healthAccess()) !== 'ready') return;
        const wanted = linkedSources(linked);
        const granted = await grantedSources();
        const reading = new Set([...wanted].filter((source) => granted.has(source)));
        const today = dateKey();
        const readings = reading.size > 0 ? await readHealth(reading, readFrom(linked, today), today) : {};
        const writes = planSync(linked, entries, readings, granted, today);
        finished([...wanted].filter((source) => !granted.has(source)));
        if (writes.length === 0) return;

        const rows = writes.map((write) => ({
          user_id: user.id,
          habit_id: write.habitId,
          day: write.day,
          state: 'held',
          amount: write.amount,
        }));
        const { error } = await supabase.from('habit_entries').upsert(rows, { onConflict: 'habit_id,day' });
        if (error) throw error;

        const at = new Date().toISOString();
        queryClient.setQueryData<HabitEntry[]>(entriesKey(user.id), (previous = []) => {
          const written = new Set(writes.map((write) => `${write.habitId}|${write.day}`));
          const kept = previous.filter((entry) => !written.has(`${entry.habitId}|${entry.day}`));
          return [...kept, ...writes.map((write) => ({ habitId: write.habitId, day: write.day, state: 'held' as const, amount: write.amount, at }))];
        });
      } catch (error) {
        // A failed read leaves the wall as it was, which is exactly what a sync
        // that cannot see anything should do. The next foreground tries again.
        console.warn('health connect sync failed', error);
      } finally {
        running.current = false;
      }
    },
    [user, linked, queryClient, finished],
  );

  const entriesReady = !!user && !entriesLoading;

  useEffect(() => {
    if (entriesReady) void run(true);
    // linkKey, not linked: a refetch that returns the same links is not a reason to read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey, entriesReady, nudge]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run(false);
    });
    return () => subscription.remove();
  }, [run]);
}
