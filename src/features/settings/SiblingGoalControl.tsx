import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useHabitSettings } from '@/hooks/useHabitSettings';
import { clampWeeklyPages } from '@/lib/siblingGoals';

const STEP = 25;

/**
 * The pages-a-week figure Lidar's streak is scored against.
 *
 * It exists because Lidar keeps its own goal in device-local storage and never
 * writes it to the shared database, so Pulsar genuinely cannot know it. Guessing
 * silently would mean showing a reading streak scored against somebody else's
 * target; the dial is the honest version of not knowing.
 */
export function SiblingGoalControl() {
  const { settings, updateSettings } = useHabitSettings();
  const goal = settings.readingWeeklyGoal;

  const set = (next: number) => void updateSettings({ readingWeeklyGoal: clampWeeklyPages(next) });

  return (
    <View className="border-t border-border/50 py-4">
      <Text className="text-base font-semibold text-foreground">pages a week, for lidar</Text>
      <Text className="mb-3 text-xs text-muted-foreground">
        lidar keeps its reading goal on the device rather than in the shared database, so pulsar cannot read
        it. set it to match and the reading streak here matches the one there.
      </Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${STEP} fewer pages a week`}
          onPress={() => set(goal - STEP)}
          className="h-11 w-11 items-center justify-center rounded-full bg-secondary"
        >
          <Minus size={18} color="#fafafa" />
        </Pressable>
        <Text className="min-w-[64px] text-center text-2xl font-bold tracking-tight text-foreground">{goal}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${STEP} more pages a week`}
          onPress={() => set(goal + STEP)}
          className="h-11 w-11 items-center justify-center rounded-full bg-secondary"
        >
          <Plus size={18} color="#fafafa" />
        </Pressable>
        <Text className="flex-1 text-sm text-muted-foreground">pages a week</Text>
      </View>
    </View>
  );
}
