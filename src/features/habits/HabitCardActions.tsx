import { Check, Minus, Plus, Snowflake, Undo2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { StepSheet } from '@/features/habits/StepSheet';
import type { CardAction, Jump } from '@/lib/habitCard';
import { COLORS } from '@/theme/colors';

const SLOT = 'h-11 w-11 items-center justify-center rounded-xl';

/**
 * The single button in a card's corner. It is the answer when there is one and
 * the way to take it back when that is free; a spent answer (a freeze, a
 * repair) is shown in the same slot but is not a button.
 */
export function CardActionButton({
  action,
  name,
  onPress,
}: {
  action: CardAction;
  name: string;
  onPress?: () => void;
}) {
  if (action === 'none') return null;

  // A logged slip is the checked state of its box: filled, so a mis-tap is
  // obvious at a glance and the same tap takes it back.
  const slipped = action === 'unslip';
  const done = action === 'undo-done' || action === 'held';
  const tick = done || action === 'slip' || slipped;
  const color = slipped ? COLORS.accentInk : done || action === 'frozen' ? COLORS.accent : COLORS.muted;
  const edge = slipped ? 'border-primary bg-primary' : done ? 'border-primary/35' : 'border-border';
  const icon =
    action === 'skip' ? (
      <X size={20} color={color} strokeWidth={2} />
    ) : tick ? (
      <Check size={20} color={color} strokeWidth={2.4} />
    ) : action === 'frozen' ? (
      <Snowflake size={19} color={color} strokeWidth={2.2} />
    ) : (
      <Undo2 size={18} color={color} strokeWidth={2} />
    );

  if (action === 'held' || action === 'frozen') {
    return (
      <View className={`${SLOT} border ${edge}`} accessibilityLabel={action === 'held' ? 'held' : 'frozen'}>
        {icon}
      </View>
    );
  }

  const label =
    action === 'slip'
      ? `log a slip on ${name} today`
      : action === 'unslip'
      ? `clear today's slip on ${name}`
      : action === 'skip'
      ? `not today on ${name}`
      : action === 'undo-done'
        ? `undo ${name}`
        : action === 'undo-skip'
          ? `take back setting ${name} aside`
          : `clear the slip on ${name}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      className={`${SLOT} border ${edge} active:bg-secondary`}
    >
      {icon}
    </Pressable>
  );
}

/**
 * Minus and plus on a counter. Tapping the plus adds one and tapping the minus
 * takes one off; holding either opens a sheet of the bigger jumps the target
 * warrants, so two hundred press-ups are not two hundred taps. Exhausted room
 * greys the plus rather than hiding it: a control that vanishes at the target
 * reads as a bug, a dead one as the job done.
 */
export function CardCounter({
  name,
  unit,
  canLess,
  canMore,
  jumpsMore,
  jumpsLess,
  onAdd,
}: {
  name: string;
  unit: string;
  canLess: boolean;
  canMore: boolean;
  jumpsMore: Jump[];
  jumpsLess: Jump[];
  onAdd: (delta: number) => void;
}) {
  const [sheet, setSheet] = useState<'more' | 'less' | null>(null);
  const shown = sheet === 'less' ? jumpsLess : jumpsMore;

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`one fewer on ${name}`}
        accessibilityHint={jumpsLess.length > 0 ? 'hold to take off more' : undefined}
        disabled={!canLess}
        onPress={() => onAdd(-1)}
        onLongPress={jumpsLess.length > 0 ? () => setSheet('less') : undefined}
        className={`${SLOT} border border-border active:bg-secondary ${canLess ? '' : 'opacity-30'}`}
      >
        <Minus size={20} color={COLORS.muted} strokeWidth={2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`one more on ${name}`}
        accessibilityHint={jumpsMore.length > 0 ? 'hold to add more' : undefined}
        disabled={!canMore}
        onPress={() => onAdd(1)}
        onLongPress={jumpsMore.length > 0 ? () => setSheet('more') : undefined}
        className={`${SLOT} bg-primary active:opacity-80 ${canMore ? '' : 'opacity-30'}`}
      >
        <Plus size={20} color={COLORS.accentInk} strokeWidth={2.4} />
      </Pressable>
      <StepSheet
        open={sheet !== null}
        direction={sheet ?? 'more'}
        name={name}
        unit={unit}
        jumps={shown}
        onPick={(delta) => {
          setSheet(null);
          onAdd(delta);
        }}
        onDismiss={() => setSheet(null)}
      />
    </View>
  );
}
