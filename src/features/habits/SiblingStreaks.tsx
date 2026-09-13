import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { dateKey } from '@/lib/dates';
import {
  lidarStreak,
  radarStreak,
  visibleSiblings,
  type PageEntry,
  type ReadEntry,
  type SiblingStreak,
} from '@/lib/siblingStreaks';
import { supabase } from '@/lib/supabase';

/**
 * The streaks you already have in the other apps.
 *
 * Read-only, and nothing here writes a row (docs/shared-database.md). Radar
 * publishes its own figure to `user_settings.current_streak` for its evening
 * notification, so that one is just read. Lidar publishes nothing, so its
 * figure is derived from the page ledger it does write, scored against the
 * assumed weekly goal in `lib/siblingGoals` — a second-hand number, and read
 * as one: this strip is a glance at another app, not a scoreboard.
 *
 * The strip renders nothing at all when neither sibling has anything to say. An
 * empty row of zeroes on Today would be worse than no row: it reads as two
 * broken streaks rather than as two apps you do not use.
 */
export function SiblingStreaks() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { settings: habitSettings } = useHabitSettings();

  const lidar = useQuery({
    queryKey: ['lidar-streak', user?.id, habitSettings.readingWeeklyGoal],
    queryFn: async (): Promise<SiblingStreak> => {
      // Lidar's own tables, read as the same account. Owner-only RLS lets this
      // through precisely because it is the same person.
      const [progress, reads] = await Promise.all([
        supabase
          .from('book_progress')
          .select('recorded_at, pages_delta, book_id')
          .eq('user_id', user!.id),
        supabase.from('book_reads').select('finished_at, page_count, book_id').eq('user_id', user!.id),
      ]);
      // Lidar may simply not be installed on this project yet; that is an empty
      // slot, not an error worth surfacing on Today.
      if (progress.error || reads.error) {
        return lidarStreak([], [], habitSettings.readingWeeklyGoal);
      }
      const pages: PageEntry[] = (progress.data as { recorded_at: string; pages_delta: number; book_id: string | null }[]).map(
        (row) => ({ recordedAt: row.recorded_at, pages: row.pages_delta, bookId: row.book_id }),
      );
      const finished: ReadEntry[] = (reads.data as { finished_at: string; page_count: number | null; book_id: string | null }[]).map(
        (row) => ({ finishedAt: row.finished_at, pageCount: row.page_count, bookId: row.book_id }),
      );
      return lidarStreak(finished, pages, habitSettings.readingWeeklyGoal, dateKey());
    },
    enabled: !!user && habitSettings.showSiblingStreaks,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (!habitSettings.showSiblingStreaks) return null;

  const rows = visibleSiblings([
    radarStreak(settings.radarStreak, settings.radarStreakUpdatedAt),
    ...(lidar.data ? [lidar.data] : []),
  ]);

  if (rows.length === 0) return null;

  return (
    <View className="px-4 pb-4">
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        elsewhere
      </Text>
      <View className="mt-2 flex-row gap-2">
        {rows.map((row) => (
          <View key={row.app} className="flex-1 rounded-xl border border-border/50 px-3 py-2.5">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {row.label}
            </Text>
            <Text className="text-lg font-bold text-foreground">
              {row.days}
              <Text className="text-xs font-semibold text-muted-foreground">
                {' '}
                {row.days === 1 ? 'day' : 'days'}
              </Text>
            </Text>
            <Text className="text-[10px] text-muted-foreground">{row.unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
