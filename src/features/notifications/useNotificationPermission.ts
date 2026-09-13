import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import {
  ensureNotificationPermission,
  hasNotificationPermission,
  supportsNotifications,
} from '@/lib/notificationSetup';

/**
 * OS-level notification permission, kept honest across a trip to system
 * settings. The only way back from Android's app-info screen is the app
 * foregrounding again, so that is what triggers the re-check — polling would
 * either be too slow to feel connected or too fast to be free.
 *
 * `null` while the first check is in flight, so the settings banner can stay
 * quiet rather than flashing "blocked" at someone who allowed it.
 */
export function useNotificationPermission() {
  const [granted, setGranted] = useState<boolean | null>(supportsNotifications ? null : false);

  const check = useCallback(async () => {
    const allowed = await hasNotificationPermission();
    setGranted(allowed);
  }, []);

  useEffect(() => {
    let alive = true;
    // Reading the OS is subscribing to an external system, so the state lands in
    // the callback rather than in the effect body — and a check still in flight
    // when the screen closes must not set state on the way out.
    const read = async () => {
      const allowed = await hasNotificationPermission();
      if (alive) setGranted(allowed);
    };
    void read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void read();
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  /**
   * Ask, or send the user to system settings when Android has stopped honouring
   * the prompt. A second refusal is silent — pestering someone who has already
   * said no twice is how an app gets uninstalled.
   */
  const request = useCallback(async () => {
    const allowed = await ensureNotificationPermission();
    setGranted(allowed);
    if (!allowed) await Linking.openSettings().catch(() => undefined);
    return allowed;
  }, []);

  return { granted, request, recheck: check };
}
