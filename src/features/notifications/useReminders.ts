import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { hasReminders, targetLabel } from '@/lib/habit';
import { planReminders, type ReminderHabit } from '@/lib/reminderPlan';
import { clearReminders, syncReminders } from '@/lib/reminderScheduler';

/**
 * Keeps Android's reminder queue in step with the habits.
 *
 * Mounted once, app-wide. It has to be app-wide rather than on Today: the queue
 * is wrong the moment a habit is edited, archived or checked off from the habit
 * detail screen, and a reminder that survives the habit it belonged to is the
 * kind of bug people notice at 8am.
 *
 * The board it reads is the same one Today renders — react-query hands both the
 * same cached rows, so this costs a derivation, not a round trip.
 */
export function useReminders() {
  const { user } = useAuth();
  const board = useHabitBoard();
  const { settings, loading: settingsLoading } = useHabitSettings();

  // Waiting for both reads matters: planning against an empty board would
  // cancel every pending reminder and then schedule nothing, so a cold start
  // would quietly empty the queue before the habits arrived.
  const ready = !!user && !board.loading && !settingsLoading && !board.error;

  const habits = useMemo<ReminderHabit[]>(
    () =>
      board.rows.map((row) => ({
        id: row.habit.id,
        name: row.habit.name,
        cadence: row.habit.cadence,
        startedOn: row.habit.startedOn,
        // `hasReminders` is the habit's own opt-out: an `anytime` habit keeps
        // its times in the row but must never be nudged about.
        times: hasReminders(row.habit) ? row.habit.times : [],
        escalate: row.habit.escalate,
        target: targetLabel(row.habit),
        pledge: row.habit.pledge,
        streak: row.streak.current,
        // An avoid habit's row resolves itself — its clean day is inferred, not
        // logged — so reading the row state here would silence its nudges
        // forever. What settles today for it is today's own answer: a slip.
        doneToday: row.asksYesterday ? board.today in row.entries : row.today !== 'due',
        dueToday: row.today !== 'rest',
      })),
    [board.rows, board.today],
  );

  const plan = useMemo(
    () => (ready ? planReminders({ habits, settings }) : []),
    [ready, habits, settings],
  );

  useEffect(() => {
    if (!ready) return;
    void syncReminders(plan);
  }, [ready, plan]);

  // A reboot drains the queue without telling anyone, and a plan whose horizon
  // has rolled past is stale rather than different. Foregrounding is the one
  // moment both are cheap to fix, so it forces a rewrite.
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncReminders(planRef.current, true);
    });
    return () => subscription.remove();
  }, [ready]);

  // Signing out must not leave someone else's habits buzzing on the device.
  useEffect(() => {
    if (!user) void clearReminders();
  }, [user]);
}
