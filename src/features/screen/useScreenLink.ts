import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useUpdateHabit } from '@/features/habits/useHabits';
import { hasUsageAccess, openUsageAccess, topApps, type TopApp } from '@/features/screen/usageStats';
import type { ScreenLink } from '@/lib/screenTime';
import type { Habit } from '@/types/habit';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_APPS = 12;

/**
 * Setting a screen-time limit on one avoid habit: usage access, the apps to
 * choose from, and the write.
 *
 * Usage access is a switch in Android's settings, not a dialog, so it is
 * looked at again every time Pulsar comes back to the front — the way back
 * from that switch.
 */
export function useScreenLink(habit: Habit, open: boolean) {
  const update = useUpdateHabit();
  const [access, setAccess] = useState(hasUsageAccess);
  const [apps, setApps] = useState<TopApp[]>([]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAccess(hasUsageAccess());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!open || !access) return;
    let live = true;
    const now = Date.now();
    void topApps(now - WEEK_MS, now, TOP_APPS).then((list) => {
      if (live) setApps(list);
    });
    return () => {
      live = false;
    };
  }, [open, access]);

  const save = useCallback(
    async (link: ScreenLink | null) => {
      await update.mutateAsync({ id: habit.id, patch: { screenLink: link } });
    },
    [habit.id, update],
  );

  return { access, apps, save, saving: update.isPending, openAccess: openUsageAccess };
}
