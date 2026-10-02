import type { HabitEntry } from '@/types/habit';

// The entries query holds every check-in inside the history window, for every
// habit. A day of a habit is one row (the table is unique on habit_id + day), so
// these patch that one row into the cached list instead of refetching the window.

/** Replaces the day's entry, or appends it when the day was empty. */
export function upsertEntry(list: HabitEntry[], entry: HabitEntry): HabitEntry[] {
  const at = list.findIndex((e) => e.habitId === entry.habitId && e.day === entry.day);
  if (at < 0) return [...list, entry];
  const next = list.slice();
  next[at] = entry;
  return next;
}

/** Returns the same array when the day had no entry, so no subscriber re-renders. */
export function removeEntry(list: HabitEntry[], habitId: string, day: string): HabitEntry[] {
  return list.some((e) => e.habitId === habitId && e.day === day)
    ? list.filter((e) => !(e.habitId === habitId && e.day === day))
    : list;
}
