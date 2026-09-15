import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SheetDialog } from '@/components/ui/SheetDialog';
import { formatDayLong } from '@/lib/dates';
import type { EntryState } from '@/lib/streak';

/**
 * Answering a day after it has ended.
 *
 * Three answers, no more: held, set aside, or nothing. A frozen or repaired day
 * cost a token, so it is not on offer here — the sheet would otherwise read as
 * a way to mint one. Picking the answer a day already has is how you take it
 * back off, which is the only shape that does not need a fourth button.
 */

export type BackfillChoice = EntryState | null;

type BackfillSheetProps = {
  open: boolean;
  day: string | null;
  /** What that day says right now, so the current answer reads as selected. */
  current: EntryState | undefined;
  onApply: (choice: BackfillChoice) => void;
  onDismiss: () => void;
};

const CHOICES: { value: BackfillChoice; label: string }[] = [
  { value: 'held', label: 'held it' },
  { value: 'skipped', label: 'set aside' },
  { value: null, label: 'leave it empty' },
];

export function BackfillSheet({ open, day, current, onApply, onDismiss }: BackfillSheetProps) {
  // Seeded once per mount. The caller keys this component on the day, so a
  // different square remounts it rather than opening on the last day's answer —
  // which is the same reason there is no effect here re-seeding the selection.
  const [choice, setChoice] = useState<BackfillChoice>(current ?? 'held');

  const locked = current === 'frozen' || current === 'repaired';

  return (
    <SheetDialog
      open={open}
      title={day ? `${formatDayLong(day)}` : 'fill a day in'}
      body={
        locked
          ? 'a token was spent on this day. it stays as it is.'
          : 'you can still answer this one — it costs nothing.'
      }
      confirmLabel="save the day"
      dismissLabel="leave it"
      confirmDisabledReason={locked ? 'this day was bought with a token' : null}
      onConfirm={() => onApply(choice)}
      onDismiss={onDismiss}
    >
      {!locked && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {CHOICES.map((option) => {
            const active = choice === option.value;
            return (
              <Pressable
                key={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
                onPress={() => setChoice(option.value)}
                className={[
                  'rounded-full border px-3 py-1.5',
                  active ? 'border-primary bg-primary/15' : 'border-border',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-xs font-semibold',
                    active ? 'text-primary' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </SheetDialog>
  );
}
