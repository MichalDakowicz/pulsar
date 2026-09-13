import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureNotificationChannels } from '@/lib/notificationChannels';

// The one place setNotificationHandler is called. It is a global, last-write-wins
// registration, so a second module setting its own would silently decide the
// behaviour of every notification in the app.

export const supportsNotifications = Platform.OS !== 'web';

if (supportsNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Every notification Pulsar schedules is a nudge to do something, so all
      // of them are banners. There is no status-line kind to suppress.
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Asks once for POST_NOTIFICATIONS (Android 13+), creating the channels first so
 * the system prompt has something to describe. A refusal is never fatal — the
 * habits, the wall and the streaks all work without a single reminder.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    await ensureNotificationChannels();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (error) {
    console.warn('Notification permission check failed', error);
    return false;
  }
}

/** Whether notifications are already allowed, without prompting for them. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}
