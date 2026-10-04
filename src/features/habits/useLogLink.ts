import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCheckIn } from '@/features/habits/useCheckIn';
import { useHabitBoard, type BoardHabit } from '@/features/habits/useHabitBoard';
import { holdAmount } from '@/lib/habit';
import { isRepeat, logAction, type LogTarget } from '@/lib/logLink';
import { isWeeklyTarget } from '@/lib/weekTarget';

// Per process, which is the span a tag's double fire happens in.
const lastTaps = new Map<string, number>();

function targetOf(row: BoardHabit): LogTarget {
  const { habit } = row;
  const weekly = isWeeklyTarget(habit);
  return {
    name: habit.name,
    kind: habit.kind,
    checksPerDay: habit.checksPerDay,
    unit: habit.unit,
    archived: !!habit.archivedAt,
    today: row.today,
    amount: row.amount,
    headroom: row.headroom,
    weekly,
    weekAmount: row.weekAmount,
    owed: weekly ? row.weekTarget : habit.target,
  };
}

/**
 * Carries out one `pulsar://log/<habit>` tap, once, then hands the screen to
 * Today, where the row shows what changed. What the tap is worth is
 * lib/logLink's call; the check-in itself is the same one the row's gesture
 * makes, toasts and undo included.
 */
export function useLogLink(id: string | undefined, requested: number | null) {
  const router = useRouter();
  const { user } = useAuth();
  const board = useHabitBoard();
  const checkIn = useCheckIn(board.perfectCount);
  const { say } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !user || !id || board.loading) return;
    handled.current = true;
    const home = () => router.replace('/' as Href);

    const now = Date.now();
    if (isRepeat(lastTaps.get(id), now)) return home();
    lastTaps.set(id, now);

    const row = board.rows.find((candidate) => candidate.habit.id === id);
    if (!row) {
      say('that habit is archived, or not on this account.');
      return home();
    }

    const { habit } = row;
    const action = logAction(targetOf(row), requested);
    const done = (async () => {
      switch (action.kind) {
        case 'hold':
          return checkIn.hold(habit, row.streak.current + 1, holdAmount(habit, row.weekAmount), row.judged);
        case 'tick':
          return checkIn.tick(habit, row.judged, row.amount, action.step);
        case 'add':
          await checkIn.add(habit, row.judged, row.amount, action.delta, row.headroom, row.weekAmount);
          if (action.say) say(action.say);
          return;
        case 'none':
          say(action.say);
      }
    })();
    void done.catch(() => say(`${habit.name} did not save. try the tag again.`)).finally(home);
  }, [user, id, board.loading, board.rows, requested, checkIn, say, router]);
}
