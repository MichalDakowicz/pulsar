import { Check, Snowflake } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Mark } from '@/components/marks';
import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { HOLD_MS } from '@/components/ui/HoldButton';
import type { CheckinMode } from '@/lib/habitSettings';
import { targetLabel } from '@/lib/habit';
import { COLORS } from '@/theme/colors';

/** How far a row has to travel before the swipe counts. */
const COMMIT_PX = 130;
const MAX_PX = 200;

type HabitRowProps = {
  row: BoardHabit;
  mode: CheckinMode;
  onHold: () => void;
  onOpen: () => void;
  /** Only passed on a row that can still be set aside, so the control can vanish. */
  onSkip?: () => void;
};

/**
 * One habit on Today.
 *
 * Two ways to check in, because they fail differently: a swipe is fast and
 * occasionally accidental, a hold is deliberate and slower. The setting picks
 * one and the row shows only that one's affordance — a row that says "swipe"
 * and also responds to a long press is a row nobody trusts.
 *
 * A resolved row is inert. There is nothing to swipe, the fill is already full,
 * and the only control left is the one that opens the habit.
 */
export function HabitRow({ row, mode, onHold, onOpen, onSkip }: HabitRowProps) {
  const { habit, streak, today } = row;
  const resolved = today !== 'due';
  const dx = useSharedValue(0);
  const [holdPct, setHoldPct] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldPct(0);
  }, []);

  useEffect(() => stopHold, [stopHold]);

  const startHold = useCallback(() => {
    if (resolved || mode !== 'hold') return;
    stopHold();
    const at = Date.now();
    holdTimer.current = setInterval(() => {
      const next = Math.min(100, ((Date.now() - at) / HOLD_MS) * 100);
      if (next >= 100) {
        stopHold();
        onHold();
      } else {
        setHoldPct(next);
      }
    }, 30);
  }, [resolved, mode, stopHold, onHold]);

  const pan = Gesture.Pan()
    .enabled(!resolved && mode === 'swipe')
    .activeOffsetX(12)
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      dx.value = Math.max(0, Math.min(MAX_PX, event.translationX));
    })
    .onEnd(() => {
      if (dx.value > COMMIT_PX) runOnJS(onHold)();
      dx.value = withTiming(0, { duration: 180 });
    });

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));
  const fillStyle = useAnimatedStyle(() => ({
    width: resolved ? '100%' : `${Math.min(100, (dx.value / COMMIT_PX) * 100)}%`,
  }));

  const held = today === 'held' || today === 'repaired';
  const frozen = today === 'frozen';

  // No rule down the edge (PING.md §6): the ground carries the state. `held`
  // already says itself three times over - the accent tile, the tick and the
  // streak count - so only a streak on the line changes the ground, in the same
  // tint RiskBanner uses.
  return (
    <View
      className="overflow-hidden rounded-xl bg-secondary"
      style={row.atRisk ? { backgroundColor: COLORS.dangerSoft } : null}
    >
      {/* The travelled distance, painted behind the row so the gesture has a
          progress bar rather than just a position. */}
      <Animated.View
        pointerEvents="none"
        className="absolute bottom-0 left-0 top-0 bg-primary/15"
        style={fillStyle}
      />
      {mode === 'hold' && holdPct > 0 && (
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 h-[3px] bg-primary"
          style={{ width: `${holdPct}%` }}
        />
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={slideStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              resolved ? `${habit.name}, done` : `${habit.name}, ${mode === 'hold' ? 'hold to check in' : 'swipe right to check in'}`
            }
            accessibilityHint="double tap to open the habit"
            onPress={onOpen}
            onLongPress={startHold}
            onPressOut={stopHold}
            delayLongPress={120}
            className="flex-row items-center gap-3 p-3"
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: held ? COLORS.accent : COLORS.thumbGround }}
            >
              <Mark mark={habit.mark} size={20} color={held ? COLORS.accentInk : '#fafafa'} />
            </View>

            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                {habit.name}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {rowMeta(row)}
              </Text>
            </View>

            {held && (
              <View className="flex-row items-center gap-1">
                <Check size={17} color={COLORS.accent} strokeWidth={3} />
                <Text className="text-sm font-bold text-primary">{streak.current}</Text>
              </View>
            )}
            {frozen && <Snowflake size={17} color={COLORS.accent} strokeWidth={2.4} />}
            {!resolved && (
              <Text className="text-xs font-semibold text-muted-foreground">
                {mode === 'hold' ? 'hold' : 'swipe'}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {/* Set-aside only exists while the day is still open and the habit allows
          it; on a resolved row there is nothing to set aside. */}
      {!resolved && onSkip && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`set ${habit.name} aside for today`}
          hitSlop={6}
          onPress={onSkip}
          className="border-t border-border/50 py-2"
        >
          <Text className="text-center text-[11px] font-semibold text-muted-foreground">not today</Text>
        </Pressable>
      )}
    </View>
  );
}

function rowMeta(row: BoardHabit): string {
  const { habit, streak, today, amount } = row;
  if (today === 'held' || today === 'repaired') return `held · ${streak.current} day streak`;
  if (today === 'frozen') return `frozen · streak held at ${streak.current}`;
  if (today === 'skipped') return 'set aside for today';
  if (row.atRisk) return `${streak.current} days on the line`;

  const target = targetLabel(habit);
  const parts: string[] = [];
  if (habit.times.length > 0) parts.push(`due ${habit.times[0]}`);
  if (target && habit.kind === 'count') parts.push(`${amount}/${habit.target} ${habit.unit}`);
  else if (target) parts.push(target);
  parts.push(streak.current > 0 ? `${streak.current} day streak` : 'day one');
  return parts.join(' · ');
}
