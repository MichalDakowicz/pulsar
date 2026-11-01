import { Text, View } from 'react-native';

import { useHabitSettings } from '@/hooks/useHabitSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { lidarStreak, visibleSiblings, type SiblingStreak } from '@/lib/siblingStreaks';

// Only repeat streaks published on this backend. Radar remains a separate cloud app.
function StreakSlot({ row }: { row: SiblingStreak }) {
  return (
    <>
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
    </>
  );
}

export function SiblingStreaks() {
  const { settings } = useUserSettings();
  const { settings: habitSettings } = useHabitSettings();

  if (!habitSettings.showSiblingStreaks) return null;

  const others = visibleSiblings([lidarStreak(settings.lidarStreak, settings.lidarStreakUpdatedAt)]);

  if (others.length === 0) return null;

  return (
    <View className="px-4 pb-4">
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        elsewhere
      </Text>
      <View className="mt-2 flex-row gap-2">
        {others.map((row) => (
          <View key={row.app} className="flex-1 rounded-xl border border-border/50 px-3 py-2.5">
            <StreakSlot row={row} />
          </View>
        ))}
      </View>
    </View>
  );
}
