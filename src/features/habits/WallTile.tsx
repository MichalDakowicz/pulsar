import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Wall } from '@/features/habits/Wall';
import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { dayProgress } from '@/lib/habit';
import { targetOn } from '@/lib/phases';
import { buildWall, wallRate } from '@/lib/wall';

const WEEKS = 5;

/**
 * One habit's last five weeks, as a tappable tile.
 *
 * The percentage under it is held-over-due, not held-over-days: a weekday habit
 * is scored out of weekdays. Scoring it out of calendar days would cap a
 * perfectly-kept Mon–Fri habit at 71%, which is the kind of number that makes
 * people stop looking at the screen.
 */
export function WallTile({ row, onPress }: { row: BoardHabit; onPress: () => void }) {
  const { habit, entries, amounts, streak } = row;

  const weeks = useMemo(() => {
    const progress: Record<string, number> = {};
    for (const [day, amount] of Object.entries(amounts)) {
      progress[day] = dayProgress({ kind: habit.kind, target: targetOn(habit, day) }, amount);
    }
    return buildWall(entries, habit, {
      weeks: WEEKS,
      startedOn: habit.startedOn,
      progress,
    });
  }, [entries, amounts, habit]);

  const rate = useMemo(() => wallRate(weeks), [weeks]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${streak.current} day streak, ${rate}% of days held`}
      onPress={onPress}
      className="min-w-[45%] flex-1 gap-2.5 rounded-xl border border-border/50 p-3"
    >
      <View className="flex-row items-baseline justify-between gap-1.5">
        <Text className="min-w-0 flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>
          {habit.name}
        </Text>
        <Text className="text-[11px] font-bold text-primary">{streak.current}d</Text>
      </View>
      <Wall weeks={weeks} layout="day" gap={3} label={`${habit.name} wall`} />
      <Text className="text-[10px] text-muted-foreground">{rate}% of days held</Text>
    </Pressable>
  );
}
