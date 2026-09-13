import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useLastNotificationResponse } from '@/features/notifications/lastNotificationResponse';
import type { ReminderKind } from '@/lib/reminderPlan';

type ReminderData = { habitId?: string; kind?: ReminderKind };

/**
 * Tapping a reminder opens the habit it was about.
 *
 * useLastNotificationResponse rather than an event listener, because the two
 * cases are not the same event: a warm tap fires a listener, a cold start does
 * not — the response is already waiting by the time any JS runs. This covers
 * both, and remembers what it has acted on so a re-render does not navigate
 * twice.
 */
export function useReminderTaps(enabled: boolean) {
  const router = useRouter();
  const response = useLastNotificationResponse();
  // The root navigator has no key until it has mounted, and a push before then
  // is dropped — which on a cold start is exactly when the tap arrives.
  const navigationReady = !!useRootNavigationState()?.key;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !navigationReady || !response) return;

    const request = response.notification.request;
    if (handled.current === request.identifier) return;

    const data = request.content.data as ReminderData | null | undefined;
    if (!data?.habitId) return;
    handled.current = request.identifier;

    // A warning is tapped to rescue the streak, not to read about it, so it goes
    // to the screen that can actually save it.
    router.navigate(data.kind === 'risk' ? `/save/${data.habitId}` : `/habit/${data.habitId}`);
  }, [enabled, navigationReady, response, router]);
}
