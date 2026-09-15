import { Check, Snowflake, X } from 'lucide-react-native';
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
  /**
   * Only passed on a row whose answer can be taken back for free — see
   * `canUndoToday`. A frozen or repaired day spent a token and is not one.
   */
  onUndo?: () => void;
  /**
   * Only on an avoid habit: logging a slip on the day that is still running,
   * which is a different day from the one this row is asking about.
   */
  onDid?: () => void;
  /** Whether today already carries a slip, so the control offers to take it back. */
  didToday?: boolean;
  /**
   * False when whatever is above the row already names the day it is about —
   * the day switch on Today does. A row under a heading that says "yesterday"
   * repeating the word on every line is noise, and noise on the one screen
   * that has to work in four seconds is expensive.
   */
  namesDay?: boolean;
};

/**
 * One habit on Today.
 *
 * Two ways to check in, because they fail differently: a swipe is fast and
 * occasionally accidental, a hold is deliberate and slower. The setting picks
 * one and the row shows only that one's affordance — a row that says "swipe"
 * and also responds to a long press is a row nobody trusts.
 *
 * Undo is the same gesture backwards, and it is offered in both modes: it is a
 * different action rather than a second way to check in, so it competes with
 * nothing, and without it someone in hold mode has to open the habit to take
 * back a mis-tap.
 */
export function HabitRow({
  row,
  mode,
  onHold,
  onOpen,
  onSkip,
  onUndo,
  onDid,
  didToday,
  namesDay = true,
}: HabitRowProps) {
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

  // A resolved row travels the other way, and only if its answer was free to
  // give back. Holding it in one const keeps the gesture, the fill and the hint
  // from disagreeing about which direction this row moves in.
  const undo = resolved ? onUndo : undefined;

  const pan = Gesture.Pan()
    .enabled(!!undo || (!resolved && mode === 'swipe'))
    .activeOffsetX(undo ? [-12, 12] : 12)
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      dx.value = undo
        ? Math.min(0, Math.max(-MAX_PX, event.translationX))
        : Math.max(0, Math.min(MAX_PX, event.translationX));
    })
    .onEnd(() => {
      if (undo) {
        if (dx.value < -COMMIT_PX) runOnJS(undo)();
      } else if (dx.value > COMMIT_PX) {
        runOnJS(onHold)();
      }
      dx.value = withTiming(0, { duration: 180 });
    });

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));
  const fillStyle = useAnimatedStyle(() => {
    // Checking in fills the row; undoing drains the fill it left behind, so the
    // gesture visibly runs the same bar backwards.
    if (!resolved) return { width: `${Math.min(100, (dx.value / COMMIT_PX) * 100)}%` };
    return { width: `${Math.max(0, 100 - (Math.abs(dx.value) / COMMIT_PX) * 100)}%` };
  });

  const held = today === 'held' || today === 'repaired';
  const frozen = today === 'frozen';
  const broke = today === 'broke';

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
              resolved
                ? `${habit.name}, done${undo ? ', swipe left to undo' : ''}`
                : `${habit.name}, ${mode === 'hold' ? 'hold to check in' : 'swipe right to check in'}`
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
                {rowMeta(row, namesDay)}
              </Text>
            </View>

            {held && (
              <View className="flex-row items-center gap-1">
                <Check size={17} color={COLORS.accent} strokeWidth={3} />
                <Text className="text-sm font-bold text-primary">{streak.current}</Text>
              </View>
            )}
            {frozen && <Snowflake size={17} color={COLORS.accent} strokeWidth={2.4} />}
            {broke && <X size={17} color={COLORS.muted} strokeWidth={2.6} />}
            {!resolved && (
              <Text className="text-xs font-semibold text-muted-foreground">
                {mode === 'hold' ? 'hold' : 'swipe'}
              </Text>
            )}
            {/* The affordance sits in the same slot as the check-in hint, so a
                resolved row says how to take it back rather than looking inert. */}
            {undo && <Text className="text-xs font-semibold text-muted-foreground">undo</Text>}
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {/* Two footer actions, and they are about two different days. Set-aside
          answers the day the row is asking about; the slip answers the day that
          is still running, which on an avoid habit is not the same one — so the
          slip stays available even on a row that is already resolved. */}
      {((!resolved && onSkip) || onDid) && (
        <View className="flex-row border-t border-border/50">
          {!resolved && onSkip && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`set ${habit.name} aside`}
              hitSlop={6}
              onPress={onSkip}
              className="flex-1 py-2"
            >
              <Text className="text-center text-[11px] font-semibold text-muted-foreground">
                {row.asksYesterday ? 'set it aside' : 'not today'}
              </Text>
            </Pressable>
          )}
          {onDid && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                didToday ? `clear today's slip on ${habit.name}` : `log a slip on ${habit.name} today`
              }
              hitSlop={6}
              onPress={onDid}
              className="flex-1 border-l border-border/50 py-2"
            >
              <Text className="text-center text-[11px] font-semibold text-muted-foreground">
                {didToday ? "clear today's slip" : 'did it today'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function rowMeta(row: BoardHabit, namesDay: boolean): string {
  const { habit, streak, today, amount, asksYesterday } = row;
  // An avoid row is answering a day that has already ended, and saying so is the
  // whole point of moving it: "clean day" with no day named reads as a promise
  // about the next sixteen hours. Unless something above it has already said
  // which day this is, in which case repeating it on every row is noise.
  const when = asksYesterday && namesDay ? 'yesterday' : null;
  if (today === 'held' || today === 'repaired') {
    return [when && `${when} held`, `${streak.current} day streak`].filter(Boolean).join(' · ');
  }
  if (today === 'frozen') return `frozen · streak held at ${streak.current}`;
  if (today === 'skipped') {
    if (when) return `${when} set aside`;
    return asksYesterday ? 'set aside' : 'set aside for today';
  }
  if (today === 'broke') return when ? `${when} broken · back to day one` : 'broken · back to day one';

  if (row.atRisk) return `${streak.current} days on the line`;

  const target = targetLabel(habit);
  const parts: string[] = [];
  if (when) parts.push(when);
  if (habit.times.length > 0 && !when) parts.push(`due ${habit.times[0]}`);
  if (target && habit.kind === 'count') parts.push(`${amount}/${habit.target} ${habit.unit}`);
  else if (target) parts.push(target);
  parts.push(streak.current > 0 ? `${streak.current} day streak` : 'day one');
  return parts.join(' · ');
}
