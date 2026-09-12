import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SheetDialog } from '@/components/ui/SheetDialog';
import { RANGE_LABELS, useStatsRange, useStatsRangeSheet, type StatsRange } from '@/store/statsRange';

const RANGES: StatsRange[] = ['4w', '12w', '1y'];

/**
 * How far back Stats looks. Mounted once in the tabs layout and opened by the
 * nav island's left action, the way every Ping screen's one action works.
 */
export function StatsRangeSheet() {
  const [open, setOpen] = useState(false);
  const range = useStatsRange((state) => state.range);
  const setRange = useStatsRange((state) => state.setRange);
  const setPresent = useStatsRangeSheet((state) => state.setPresent);

  useEffect(() => {
    setPresent(() => setOpen(true));
    return () => setPresent(null);
  }, [setPresent]);

  return (
    <SheetDialog
      open={open}
      title="how far back?"
      body="the weekday shape and the per-habit rates are scored over this window."
      confirmLabel="done"
      dismissLabel="cancel"
      onConfirm={() => setOpen(false)}
      onDismiss={() => setOpen(false)}
    >
      <View className="mt-3 gap-2">
        {RANGES.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: range === option }}
            accessibilityLabel={RANGE_LABELS[option]}
            onPress={() => setRange(option)}
            className={[
              'rounded-xl border px-3.5 py-3',
              range === option ? 'border-primary bg-primary/10' : 'border-border',
            ].join(' ')}
          >
            <Text
              className={['text-sm font-semibold', range === option ? 'text-primary' : 'text-foreground'].join(' ')}
            >
              {RANGE_LABELS[option]}
            </Text>
          </Pressable>
        ))}
      </View>
    </SheetDialog>
  );
}
