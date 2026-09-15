import { useMemo, useState } from 'react';

import { backfillDays } from '@/lib/backfill';
import { dateKey } from '@/lib/dates';
import { isTargetDayOn } from '@/lib/phases';
import type { EntryMap, EntryState } from '@/lib/streak';
import { useLastOpened } from '@/store/lastOpened';
import type { Habit } from '@/types/habit';

/**
 * Which squares on this habit's wall are still open, and which one is being
 * answered.
 *
 * Three filters, and dropping any one of them puts a tappable square on a day
 * that cannot have an answer: the free window (`lib/backfill`), the days this
 * habit existed for, and the days it was actually owed. A Mon/Wed/Fri habit
 * offering to fill in a Tuesday is the same lie the wall spent five states
 * avoiding.
 */
export function useBackfill(habit: Habit | null, entries: EntryMap) {
  const lastOpenedOn = useLastOpened((state) => state.lastOpenedOn);
  const [day, setDay] = useState<string | null>(null);

  const editable = useMemo(() => {
    if (!habit || habit.archivedAt) return new Set<string>();
    const days = backfillDays(dateKey(), lastOpenedOn).filter(
      (candidate) => candidate >= habit.startedOn && isTargetDayOn(habit, candidate),
    );
    return new Set(days);
  }, [habit, lastOpenedOn]);

  return {
    editable,
    day,
    current: day ? (entries[day] as EntryState | undefined) : undefined,
    open: (next: string) => setDay(next),
    close: () => setDay(null),
  };
}
