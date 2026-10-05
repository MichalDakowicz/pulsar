import { Pressable, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { Mark } from '@/components/marks';
import { CardTrailing } from '@/features/habits/CardTrailing';
import { toCardInput } from '@/features/habits/cardInput';
import { CounterBar } from '@/features/habits/CounterBar';
import { rowMeta } from '@/features/habits/rowMeta';
import { TypeTags } from '@/features/habits/TypeTags';
import { useCardGesture } from '@/features/habits/useCardGesture';
import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { useHabitWall } from '@/features/habits/useHabitWall';
import { Wall } from '@/features/habits/Wall';
import { habitMeta } from '@/lib/habit';
import { cardAction, cardTone, counterLine, openDayRing } from '@/lib/habitCard';
import type { CheckinMode } from '@/lib/habitSettings';
import { isMultiStep } from '@/lib/steps';
import type { CardLayout } from '@/store/cardLook';
import { COLORS } from '@/theme/colors';

/** Eighteen weeks is four months: long enough to see a habit's shape, short enough to read on a phone. */
const WEEKS = 18;

/** Days whose answer is already in, so nothing on the card should offer another. */
const SETTLED = ['rest', 'frozen', 'skipped'];

type HabitCardProps = {
  row: BoardHabit;
  onOpen: () => void;
  /** The check-in setting. Left out, the card is a read-only summary (Habits). */
  mode?: CheckinMode;
  /** How the card is drawn — with its wall, as a tagged row, or both (Settings). */
  layout?: CardLayout;
  onHold?: () => void;
  /** Only passed on a card that can still be set aside. */
  onSkip?: () => void;
  /** Only passed on a card whose answer is free to take back — see `canUndoToday`. */
  onUndo?: () => void;
  /** Only on an avoid habit: log or clear a slip on the day still running. */
  onSlip?: () => void;
  /** A counter's stepper. Only passed where the card should count. */
  onAdd?: (delta: number) => void;
  /** One check of a habit done more than once a day. */
  onStep?: (step: number) => void;
  /** False when something above already names the day — the day switch on Today does. */
  namesDay?: boolean;
};

const TONE_CLASS = {
  open: 'border-border bg-card',
  done: 'border-primary/30 bg-primary/10',
  aside: 'border-border bg-card opacity-50',
  risk: 'border-border',
} as const;

/**
 * One habit: its mark, its name, how today stands, and — unless it is drawn as
 * a tagged row — four months of its wall underneath. The wall is what makes a
 * card worth looking at twice; the tags are what make a list of them readable
 * at a glance. Settings decides which the user would rather have.
 */
export function HabitCard({
  row,
  onOpen,
  mode,
  layout = 'calendar',
  onHold,
  onSkip,
  onUndo,
  onSlip,
  onAdd,
  onStep,
  namesDay = true,
}: HabitCardProps) {
  const { habit, today } = row;
  const weeks = useHabitWall(row, WEEKS);
  const input = toCardInput(row);
  const tone = cardTone(input);
  const live = !!mode;
  const tagged = layout !== 'calendar';
  // A counter is answered a bit at a time, so it carries a stepper; a habit
  // checked twice a day carries one control per check. Not on a day that was
  // frozen, set aside or never owed — those already have an answer.
  const counting = live && !!onAdd && input.counter && !SETTLED.includes(today);
  const stepping = live && !!onStep && isMultiStep(habit) && !SETTLED.includes(today);
  const open = today === 'due';
  const action = live && !counting && !stepping ? cardAction(input, !!onSkip) : 'none';
  const ringTone = live ? openDayRing(input) : null;

  const gesture = useCardGesture({ mode: mode ?? 'swipe', open: live && open, onCommit: onHold, onUndo });

  const unit = habit.kind === 'timer' ? 'min' : habit.unit;
  const sub = counting
    ? counterLine({ weekly: input.weekly, amount: row.amount, target: habit.target, weekAmount: row.weekAmount, weekTarget: row.weekTarget, unit })
    : live
      ? rowMeta(row, namesDay)
      : habitMeta(habit);

  const actionPress =
    action === 'slip' || action === 'unslip' ? onSlip : action === 'skip' ? onSkip : action === 'undo-done' || action === 'undo-skip' || action === 'undo-slip' ? onUndo : undefined;
  const iconDone = tone === 'done';

  return (
    <View
      className={`overflow-hidden rounded-2xl border ${TONE_CLASS[tone]}`}
      style={tone === 'risk' ? { backgroundColor: COLORS.dangerSoft } : null}
    >
      <Animated.View
        pointerEvents="none"
        className={`absolute bottom-0 top-0 bg-primary/15 ${gesture.swipesBack ? 'right-0' : 'left-0'}`}
        style={gesture.fillStyle}
      />
      {gesture.holdPct > 0 && (
        <View pointerEvents="none" className="absolute bottom-0 left-0 h-[3px] bg-primary" style={{ width: `${gesture.holdPct}%` }} />
      )}

      <GestureDetector gesture={gesture.pan}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${habit.name}, ${sub}`}
          accessibilityHint={
            live && open && !counting
              ? mode === 'hold'
                ? 'press and hold to check in, double tap to open'
                : 'swipe right to check in, double tap to open'
              : 'double tap to open the habit'
          }
          onPress={onOpen}
          onLongPress={gesture.startHold}
          onPressOut={gesture.stopHold}
          delayLongPress={120}
          className={tagged ? 'gap-3 p-3' : 'gap-3.5 p-3.5'}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: iconDone ? COLORS.accent : COLORS.thumbGround }}
            >
              <Mark mark={habit.mark} size={20} color={iconDone ? COLORS.accentInk : COLORS.foreground} />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-base font-semibold tracking-tight text-foreground" numberOfLines={1}>
                {habit.name}
              </Text>
              {tagged ? (
                <TypeTags habit={habit} />
              ) : (
                !counting && (
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {sub}
                  </Text>
                )
              )}
              {counting && (
                <CounterBar
                  amount={input.weekly ? row.weekAmount : row.amount}
                  target={input.weekly ? row.weekTarget : habit.target}
                  caption={`${unit} ${input.weekly ? 'this week' : 'today'}`}
                />
              )}
            </View>
            <CardTrailing
              row={row}
              mode={counting ? 'count' : stepping ? 'steps' : live ? 'action' : 'summary'}
              action={action}
              tagged={tagged}
              onAction={actionPress}
              onAdd={onAdd}
              onStep={onStep}
              onAside={stepping ? onSkip : undefined}
            />
          </View>

          {layout !== 'tagged' && (
            <Wall
              weeks={weeks}
              layout="week"
              gap={3}
              ring={ringTone ? { day: row.judged, color: ringTone === 'accent' ? COLORS.accent : COLORS.mutedDeep } : undefined}
              label={`${habit.name}, last ${WEEKS} weeks`}
            />
          )}
        </Pressable>
      </GestureDetector>
    </View>
  );
}
