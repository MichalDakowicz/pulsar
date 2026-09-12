import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export const HOLD_MS = 1200;

type HoldButtonProps = {
  label: string;
  onComplete: () => void;
  disabled?: boolean;
  /** Shown under the button when `disabled`, so the block has a stated reason. */
  disabledReason?: string;
};

/**
 * Press and hold until the bar fills.
 *
 * Reserved for the two commitments that should cost something to make: starting
 * a habit, and taking the pledge. A tap is free, and a promise that took one tap
 * is a promise you do not remember making — the second of resistance is the
 * whole feature, not a flourish.
 */
export function HoldButton({ label, onComplete, disabled, disabledReason }: HoldButtonProps) {
  const [pct, setPct] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPct(0);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    if (disabled) return;
    stop();
    startedAt.current = Date.now();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    timer.current = setInterval(() => {
      const next = Math.min(100, ((Date.now() - startedAt.current) / HOLD_MS) * 100);
      if (next >= 100) {
        stop();
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      } else {
        setPct(next);
      }
    }, 30);
  }, [disabled, onComplete, stop]);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="press and hold"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={start}
        onPressOut={stop}
        className={[
          'overflow-hidden rounded-full border py-4',
          disabled ? 'border-border bg-secondary' : 'border-primary/50 bg-secondary',
        ].join(' ')}
      >
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 top-0 bg-primary/35"
          style={{ width: `${pct}%` }}
        />
        <Text
          className={['text-center text-sm font-bold', disabled ? 'text-muted-foreground' : 'text-foreground'].join(' ')}
        >
          {label}
        </Text>
      </Pressable>
      {disabled && !!disabledReason && (
        <Text className="mt-2 text-center text-xs text-muted-foreground">{disabledReason}</Text>
      )}
    </View>
  );
}
