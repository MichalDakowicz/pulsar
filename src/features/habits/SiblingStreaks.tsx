import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useHabitSettings } from '@/hooks/useHabitSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  faceOrFirst,
  lidarStreak,
  nextFace,
  radarFaces,
  visibleSiblings,
  type SiblingStreak,
} from '@/lib/siblingStreaks';
import { useRadarFace } from '@/store/radarFace';

/**
 * The streaks you already have in the other apps.
 *
 * Read-only, and nothing here writes a row (docs/shared-database.md). Every
 * figure is a snapshot its own app publishes to `user_settings` — Radar to
 * `movie_streak` and `tv_streak`, Lidar to `lidar_streak` — so Pulsar asks the
 * apps rather than second-guessing them.
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

const FLIP_PX = 40;

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

/**
 * Radar's slot, which turns over.
 *
 * The swipe is horizontal and short, and it only exists when there is a second
 * face to turn to — a gesture that does nothing is worse than no gesture, and
 * on an account with no television streak there is nothing on the other side.
 * A tap does the same thing, because a card that can only be turned by a swipe
 * is a card half the people using it never find.
 */
function RadarSlot({ faces }: { faces: SiblingStreak[] }) {
  const face = useRadarFace((state) => state.face);
  const setFace = useRadarFace((state) => state.setFace);
  const showing = faceOrFirst(faces, face);
  const dx = useSharedValue(0);

  const turnable = faces.length > 1;
  const turn = () => setFace(nextFace(faces, showing?.face ?? null));

  const pan = Gesture.Pan()
    .enabled(turnable)
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      dx.value = Math.max(-FLIP_PX, Math.min(FLIP_PX, event.translationX));
    })
    .onEnd(() => {
      // Either direction turns it over: with two faces there is no "back", and
      // a swipe that only works one way reads as a dead gesture half the time.
      if (Math.abs(dx.value) > FLIP_PX * 0.5) runOnJS(turn)();
      dx.value = withTiming(0, { duration: 160 });
    });

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));

  if (!showing) return null;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View className="flex-1 overflow-hidden rounded-xl border border-border/50" style={slideStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            turnable
              ? `radar, ${showing.days} days of ${showing.unit}. turn over`
              : `radar, ${showing.days} days of ${showing.unit}`
          }
          disabled={!turnable}
          onPress={turn}
          className="px-3 py-2.5"
        >
          <StreakSlot row={showing} />
          {turnable && (
            <View className="mt-1.5 flex-row gap-1">
              {faces.map((option) => (
                <View
                  key={option.face}
                  className={[
                    'h-[3px] flex-1 rounded-full',
                    option.face === showing.face ? 'bg-primary' : 'bg-border',
                  ].join(' ')}
                />
              ))}
            </View>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function SiblingStreaks() {
  const { settings } = useUserSettings();
  const { settings: habitSettings } = useHabitSettings();

  if (!habitSettings.showSiblingStreaks) return null;

  const faces = radarFaces(
    settings.radarMovieStreak,
    settings.radarTvStreak,
    settings.radarStreakUpdatedAt,
  );
  const others = visibleSiblings([lidarStreak(settings.lidarStreak, settings.lidarStreakUpdatedAt)]);

  if (faces.length === 0 && others.length === 0) return null;

  return (
    <View className="px-4 pb-4">
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        elsewhere
      </Text>
      <View className="mt-2 flex-row gap-2">
        {faces.length > 0 && <RadarSlot faces={faces} />}
        {others.map((row) => (
          <View key={row.app} className="flex-1 rounded-xl border border-border/50 px-3 py-2.5">
            <StreakSlot row={row} />
          </View>
        ))}
      </View>
    </View>
  );
}
