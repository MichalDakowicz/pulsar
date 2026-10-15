import { dateKey, dayRange, weekKey } from '@/lib/dates';
import { counts } from '@/lib/healthActivities';
import { BEDTIME_GRACE_MINUTES, MIN_NIGHT_MINUTES } from '@/lib/healthDays';
import { activeLink, WATER_ML } from '@/lib/healthLink';
import { syncFrom } from '@/lib/healthSync';
import { isTargetDayOn } from '@/lib/phases';
import type { EntryMap } from '@/lib/streak';
import { isWeeklyTarget } from '@/lib/weekTarget';
import type { Habit } from '@/types/habit';

/** Data the Android receiver needs without starting React or signing in again. */
export function healthReminderGate(habit: Habit, entries: EntryMap, amounts: Record<string, number>, at: number) {
  const link = activeLink(habit);
  if (!link) return null;
  const day = dateKey(at);
  const weekly = isWeeklyTarget(habit);
  const from = weekly ? weekKey(day) : day;
  const floor = syncFrom(habit, day);
  return {
    version: 1,
    source: link.source,
    kind: habit.kind,
    target: habit.kind === 'do' ? 1 : habit.target,
    from,
    through: day,
    bedtime: habit.kind === 'do' ? link.bedtime : undefined,
    bedtimeGrace: BEDTIME_GRACE_MINUTES,
    minNight: MIN_NIGHT_MINUTES,
    minimumMinutes: habit.kind === 'do' ? link.minimumMinutes : undefined,
    minimumMode: link.minimumMode,
    filtered: link.mode !== 'all',
    // Unknown future exercise types follow the same `other` rule as the app.
    exerciseTypes: Array.from({ length: 84 }, (_, type) => counts(link, type)),
    otherExercise: counts(link, -1),
    waterMl: WATER_ML[habit.unit] ?? 250,
    days: dayRange(from, day).map((key) => ({
      day: key,
      amount: entries[key] === 'held' ? (amounts[key] ?? 0) : 0,
      read: key >= floor && (weekly || isTargetDayOn(habit, key)) && (!entries[key] || entries[key] === 'held'),
    })),
  };
}
