import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { entriesKey, useEntries } from '@/features/habits/useEntries';
import { useHabits } from '@/features/habits/useHabits';
import { hasUsageAccess, usageSessions } from '@/features/screen/usageStats';
import { addDays, dateKey, parseDay } from '@/lib/dates';
import type { DayEntry } from '@/lib/healthSync';
import { activeScreenLink, SCREEN_DAYS, slipDays, slipLine, usageByDay } from '@/lib/screenTime';
import { supabase } from '@/lib/supabase';
import { useScreenSlips } from '@/store/screenSlips';
import type { HabitEntry } from '@/types/habit';

const MIN_GAP_MS = 2 * 60 * 1000;

/**
 * Reads screen time and logs a slip on each linked avoid habit's days that
 * went over its limit — on foreground, at most every couple of minutes.
 *
 * Every slip is said out loud in a toast, because it is the one thing in
 * Pulsar that ends a streak without a tap: a slip that lands silently would
 * read as the app breaking it.
 */
export function useScreenSync() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const { loading: entriesLoading } = useEntries();
  const queryClient = useQueryClient();
  const { say } = useToast();
  const written = useScreenSlips((state) => state.written);
  const mark = useScreenSlips((state) => state.mark);
  const running = useRef(false);
  const lastRun = useRef(0);

  const linked = useMemo(() => habits.filter((habit) => activeScreenLink(habit)), [habits]);
  const linkKey = useMemo(() => linked.map((habit) => `${habit.id}:${JSON.stringify(habit.screenLink)}`).join('|'), [linked]);

  const run = useCallback(
    async (force: boolean) => {
      if (!user || linked.length === 0 || running.current || !hasUsageAccess()) return;
      if (!force && Date.now() - lastRun.current < MIN_GAP_MS) return;
      const entries = queryClient.getQueryData<HabitEntry[]>(entriesKey(user.id));
      if (!entries) return;

      running.current = true;
      lastRun.current = Date.now();
      try {
        const today = dateKey();
        // A day earlier than the window, so an app already open at its first
        // midnight is caught from where it opened.
        const from = parseDay(addDays(today, -SCREEN_DAYS)).getTime();
        const pkgs = [...new Set(linked.flatMap((habit) => habit.screenLink!.apps.map((app) => app.pkg)))];
        const sessions = await usageSessions(pkgs, from, Date.now());

        for (const habit of linked) {
          const link = habit.screenLink!;
          const usage = usageByDay(sessions, link.apps.map((app) => app.pkg));
          const existing: Record<string, DayEntry> = {};
          for (const entry of entries) if (entry.habitId === habit.id) existing[entry.day] = entry;
          const days = slipDays(habit, link, usage, existing, today, written[habit.id] ?? []);
          if (days.length === 0) continue;

          const rows = days.map((day) => ({ user_id: user.id, habit_id: habit.id, day, state: 'broke', amount: 0 }));
          const { error } = await supabase.from('habit_entries').upsert(rows, { onConflict: 'habit_id,day' });
          if (error) throw error;
          mark(habit.id, days);

          const at = new Date().toISOString();
          queryClient.setQueryData<HabitEntry[]>(entriesKey(user.id), (previous = []) => [
            ...previous.filter((entry) => !(entry.habitId === habit.id && days.includes(entry.day))),
            ...days.map((day) => ({ habitId: habit.id, day, state: 'broke' as const, amount: 0, at })),
          ]);
          say(slipLine(habit.name, link, days, usage, today));
        }
      } catch (error) {
        console.warn('screen time sync failed', error);
      } finally {
        running.current = false;
      }
    },
    [user, linked, queryClient, written, mark, say],
  );

  const entriesReady = !!user && !entriesLoading;

  useEffect(() => {
    if (entriesReady) void run(true);
    // linkKey, not linked: a refetch that returns the same links is not a reason to read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey, entriesReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run(false);
    });
    return () => subscription.remove();
  }, [run]);
}
