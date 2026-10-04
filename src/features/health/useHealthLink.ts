import { useCallback } from 'react';

import { grantedSources, openHealthSettings, requestSources } from '@/features/health/healthConnect';
import { useHealthStatus } from '@/features/health/healthStatus';
import { useHealthAccess, useReadAgo } from '@/features/health/useHealthAccess';
import { useUpdateHabit } from '@/features/habits/useHabits';
import { cleanLink, type HealthLink } from '@/lib/healthLink';
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
  const access = useHealthAccess();
  const readAgo = useReadAgo();

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
    readAgo,
    openSettings: openHealthSettings,
  };
}
