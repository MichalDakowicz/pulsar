import { useCallback, useEffect, useState } from 'react';

import { grantedSources, healthAccess, openHealthSettings, requestSources, type HealthAccess } from '@/features/health/healthConnect';
import { useHealthStatus } from '@/features/health/healthStatus';
import { useUpdateHabit } from '@/features/habits/useHabits';
import { cleanLink, readLine, type HealthLink } from '@/lib/healthLink';
import type { Habit } from '@/types/habit';

export type LinkOutcome = 'saved' | 'denied';

/**
 * Linking one habit to Health Connect: whether it can be asked at all, the
 * permission for the chosen source, and the write.
 *
 * The permission is asked for at the moment of linking and for that source
 * only — asking for steps, workouts and sleep up front, for a habit that only
 * wants one of them, is the kind of request people rightly refuse.
 */
export function useHealthLink(habit: Habit) {
  const update = useUpdateHabit();
  const requestRead = useHealthStatus((state) => state.requestRead);
  const missing = useHealthStatus((state) => state.missing);
  const lastRead = useHealthStatus((state) => state.lastRead);
  const [access, setAccess] = useState<HealthAccess | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // A minute hand for "read 4m ago". A read that lands after the last tick is
  // "just now" by itself, since the age is never allowed below zero.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let live = true;
    void healthAccess().then((next) => {
      if (live) setAccess(next);
    });
    return () => {
      live = false;
    };
  }, []);

  const save = useCallback(
    async (link: HealthLink | null): Promise<LinkOutcome> => {
      if (link) {
        const granted = await grantedSources();
        const now = granted.has(link.source) ? granted : await requestSources([link.source]);
        if (!now.has(link.source)) return 'denied';
      }
      await update.mutateAsync({ id: habit.id, patch: { healthLink: link ? cleanLink(link) : null } });
      requestRead();
      return 'saved';
    },
    [habit.id, update, requestRead],
  );

  const source = habit.healthLink?.source;

  return {
    access,
    save,
    saving: update.isPending,
    /** The link is there and Health Connect is not sharing its source. */
    unshared: !!source && missing.includes(source),
    readAgo: readLine(lastRead, Math.max(now, lastRead ?? 0)),
    openSettings: openHealthSettings,
  };
}
