import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SheetDialog } from '@/components/ui/SheetDialog';
import type { ChangeScope } from '@/lib/phases';

/**
 * How far back a rule change reaches.
 *
 * The question only looks pedantic until you have kept a habit for a hundred
 * days. Dropping Sundays is a change to what you are doing next week; saying
 * you never owed Sundays is a correction to a wall you have been looking at
 * since May. Both are real requests, the app cannot tell them apart, and
 * picking one silently rewrites history the other way.
 *
 * `from now on` leads, because it is the one that leaves the record alone.
 */

type ChangeScopeSheetProps = {
  open: boolean;
  /** Which rules moved, in words — "when it is due", "the target". */
  changed: string[];
  onApply: (scope: ChangeScope) => void;
  onDismiss: () => void;
};

const CHOICES: { value: ChangeScope; label: string; sub: string }[] = [
  {
    value: 'from-now',
    label: 'from today on',
    sub: 'the wall behind you keeps the rules it was kept under.',
  },
  {
    value: 'whole-run',
    label: 'the whole run',
    sub: 'every day since day one is judged again. the streak can move.',
  },
];

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? 'the rules';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

export function ChangeScopeSheet({ open, changed, onApply, onDismiss }: ChangeScopeSheetProps) {
  const [scope, setScope] = useState<ChangeScope>('from-now');

  return (
    <SheetDialog
      open={open}
      title={`you changed ${joinWords(changed)}`}
      body="how far back does that go?"
      confirmLabel="save the changes"
      dismissLabel="keep editing"
      onConfirm={() => onApply(scope)}
      onDismiss={onDismiss}
    >
      <View className="mt-3 gap-2">
        {CHOICES.map((option) => {
          const active = scope === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              onPress={() => setScope(option.value)}
              className={[
                'rounded-2xl border px-4 py-3',
                active ? 'border-primary bg-primary/15' : 'border-border',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-sm font-bold',
                  active ? 'text-primary' : 'text-foreground',
                ].join(' ')}
              >
                {option.label}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">{option.sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </SheetDialog>
  );
}
