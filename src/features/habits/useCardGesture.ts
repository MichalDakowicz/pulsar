import { useCallback, useEffect, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { HOLD_MS } from '@/components/ui/HoldButton';
import type { CheckinMode } from '@/lib/habitSettings';

/** How far a card has to travel before the swipe counts. */
const COMMIT_PX = 130;
const MAX_PX = 200;

type CardGestureOptions = {
  mode: CheckinMode;
  /** Whether the card still takes a check-in. False once answered. */
  open: boolean;
  /** What a completed forward swipe or hold does. */
  onCommit?: () => void;
  /** What a completed backward swipe does — only passed when the answer is free to take back. */
  onUndo?: () => void;
};

/**
 * The swipe and the hold on a habit card.
 *
 * Two ways to check in, because they fail differently: a swipe is fast and
 * occasionally accidental, a hold is deliberate and slower. The setting picks
 * one and the card answers only to that one — a card that answers to a swipe
 * and a long press both is a card nobody trusts.
 *
 * Undo is the same swipe backwards, offered in both modes: it is a different
 * action rather than a second way to check in, so it competes with nothing.
 */
export function useCardGesture({ mode, open, onCommit, onUndo }: CardGestureOptions) {
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
    if (!open || mode !== 'hold' || !onCommit) return;
    stopHold();
    const at = Date.now();
    holdTimer.current = setInterval(() => {
      const next = Math.min(100, ((Date.now() - at) / HOLD_MS) * 100);
      if (next >= 100) {
        stopHold();
        onCommit();
      } else {
        setHoldPct(next);
      }
    }, 30);
  }, [open, mode, onCommit, stopHold]);

  // An answered card travels the other way, and only if its answer was free to
  // give back. One const keeps the gesture and the fill agreeing on direction.
  const undo = open ? undefined : onUndo;
  const forward = open && mode === 'swipe' && !!onCommit;

  const pan = Gesture.Pan()
    .enabled(!!undo || forward)
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
      } else if (dx.value > COMMIT_PX && onCommit) {
        runOnJS(onCommit)();
      }
      dx.value = withTiming(0, { duration: 180 });
    });

  // The card stays put and the travelled distance is painted across it, so
  // the wall under the name never slides out from under the eye. Forward fills
  // from the left, undo from the right — the direction the finger is going.
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, (Math.abs(dx.value) / COMMIT_PX) * 100)}%`,
  }));

  return { pan, fillStyle, holdPct, startHold, stopHold, swipesBack: !!undo };
}
