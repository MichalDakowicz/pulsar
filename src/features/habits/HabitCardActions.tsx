import { Check, Minus, Plus, Snowflake, Undo2, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import type { CardAction } from '@/lib/habitCard';
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

  const done = action === 'undo-done' || action === 'held';
  const color = done || action === 'frozen' ? COLORS.accent : COLORS.muted;
  const edge = done ? 'border-primary/35' : 'border-border';
  const icon =
    action === 'skip' ? (
      <X size={20} color={color} strokeWidth={2} />
    ) : done ? (
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
    action === 'skip'
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
 * Minus and plus on a counter. Tapping the plus adds one; holding it adds the
 * biggest jump the target warrants, so two hundred press-ups are not two
 * hundred taps. Exhausted room greys the plus rather than hiding it: a control
 * that vanishes at the target reads as a bug, a dead one as the job done.
 */
export function CardCounter({
  name,
  canLess,
  canMore,
  bigStep,
  onAdd,
}: {
  name: string;
  canLess: boolean;
  canMore: boolean;
  bigStep: number;
  onAdd: (delta: number) => void;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`one fewer on ${name}`}
        disabled={!canLess}
        onPress={() => onAdd(-1)}
        className={`${SLOT} border border-border active:bg-secondary ${canLess ? '' : 'opacity-30'}`}
      >
        <Minus size={20} color={COLORS.muted} strokeWidth={2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`one more on ${name}`}
        accessibilityHint={bigStep > 1 ? `hold to add ${bigStep}` : undefined}
        disabled={!canMore}
        onPress={() => onAdd(1)}
        onLongPress={bigStep > 1 ? () => onAdd(bigStep) : undefined}
        className={`${SLOT} bg-primary active:opacity-80 ${canMore ? '' : 'opacity-30'}`}
      >
        <Plus size={20} color={COLORS.accentInk} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
