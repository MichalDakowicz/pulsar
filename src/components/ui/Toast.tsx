import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { NAV_ISLAND_GAP, NAV_ISLAND_HEIGHT } from '@/hooks/useNavBarSpace';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DURATION_MS = 3600;

type ToastAction = { label: string; onPress: () => void };

type ToastContextValue = {
  /** `action` is the undo affordance. Omit it for anything that cannot be undone. */
  say: (message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue>({ say: () => {} });

/**
 * One toast at a time, above the nav islands.
 *
 * The action slot is the point: a check-in is undoable and shows Undo, a spent
 * freeze token is not and shows nothing. A permanently-present Undo that
 * sometimes does nothing is how a user learns to stop trusting the row.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; action?: ToastAction } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((message: string, action?: ToastAction) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, action });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ say }), [say]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(160)}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + NAV_ISLAND_HEIGHT + NAV_ISLAND_GAP * 3,
          }}
        >
          <View className="flex-row items-center gap-3 rounded-lg border border-border bg-popover px-3.5 py-3">
            <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
                hitSlop={8}
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
              >
                <Text className="text-sm font-bold text-primary">{toast.action.label}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
