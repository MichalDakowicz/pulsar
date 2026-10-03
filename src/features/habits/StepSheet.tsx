import { useEffect } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Jump } from '@/lib/habitCard';

type StepSheetProps = {
  open: boolean;
  /** Which button was held: the sheet adds for the plus and takes off for the minus. */
  direction: 'more' | 'less';
  name: string;
  unit: string;
  jumps: Jump[];
  onPick: (delta: number) => void;
  onDismiss: () => void;
};

/**
 * The bigger steps behind a long press on a counter's plus or minus.
 *
 * It is a pick, not a confirmation, so it has no confirm button: one tap on a
 * jump applies it and closes the sheet. SheetDialog is the sheet for questions
 * that need a yes; this one only has to be quicker than tapping twenty times.
 */
export function StepSheet({ open, direction, name, unit, jumps, onPick, onDismiss }: StepSheetProps) {
  const insets = useSafeAreaInsets();
  const adding = direction === 'more';

  // Escape closes it on web, same as every other sheet.
  useEffect(() => {
    if (Platform.OS !== 'web' || !open || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="close"
        onPress={onDismiss}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
      >
        {/* The sheet swallows its own taps so a press inside does not dismiss. */}
        <Pressable onPress={() => {}} accessible={false}>
          <Animated.View
            entering={SlideInDown.duration(240)}
            className="rounded-t-[20px] border-t border-border bg-popover px-6 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
              {adding ? `add to ${name}` : `take off ${name}`}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">{unit}</Text>
            <View className="mt-4 flex-row gap-2">
              {jumps.map((jump) => (
                <Pressable
                  key={jump.delta}
                  accessibilityRole="button"
                  accessibilityLabel={`${adding ? 'add' : 'take off'} ${Math.abs(jump.delta)} ${unit}`}
                  accessibilityState={{ disabled: !jump.enabled }}
                  disabled={!jump.enabled}
                  onPress={() => onPick(jump.delta)}
                  className={[
                    'flex-1 items-center rounded-2xl border border-border py-4 active:bg-secondary',
                    jump.enabled ? '' : 'opacity-30',
                  ].join(' ')}
                >
                  <Text className="text-xl font-bold text-foreground">
                    {jump.delta > 0 ? `+${jump.delta}` : `−${Math.abs(jump.delta)}`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="cancel"
              onPress={onDismiss}
              className="mt-2 items-center rounded-full border border-border py-3.5"
            >
              <Text className="text-sm font-semibold text-muted-foreground">cancel</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
