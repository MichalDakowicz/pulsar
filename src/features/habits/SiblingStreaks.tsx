import { Text, View } from 'react-native';

import { useHabitSettings } from '@/hooks/useHabitSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { lidarStreak, radarStreak, visibleSiblings } from '@/lib/siblingStreaks';

/**
 * The streaks you already have in the other apps.
 *
 * Read-only, and nothing here writes a row (docs/shared-database.md). Both
 * figures are snapshots their own app publishes to `user_settings` — Radar to
 * `current_streak` for its evening notification, Lidar to `lidar_streak` for
 * this strip — so Pulsar asks the apps rather than second-guessing them.
 *
 * There is no query here any more. Lidar's streak used to be derived from its
 * page ledger, which meant two of Lidar's tables fetched on every Today render
 * for a number that was wrong anyway: the threshold and the reset epoch it is
 * scored against live in Lidar's device storage, not in the database. Now it is
 * one field of the settings row Today already reads, kept live by the realtime
 * subscription in `useUserSettings`.
 *
 * The strip renders nothing at all when neither sibling has anything to say. An
 * empty row of zeroes on Today would be worse than no row: it reads as two
 * broken streaks rather than as two apps you do not use.
 */
export function SiblingStreaks() {
  const { settings } = useUserSettings();
  const { settings: habitSettings } = useHabitSettings();

  if (!habitSettings.showSiblingStreaks) return null;

  const rows = visibleSiblings([
    radarStreak(settings.radarStreak, settings.radarStreakUpdatedAt),
    lidarStreak(settings.lidarStreak, settings.lidarStreakUpdatedAt),
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
