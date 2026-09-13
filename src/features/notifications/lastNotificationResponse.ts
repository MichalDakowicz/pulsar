import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * expo-notifications' hook is native-only: on web it calls
 * `ExpoNotifications.getLastNotificationResponse`, which does not exist there and
 * throws during render, taking the whole app down before the first screen paints.
 *
 * Picking the implementation once at module load keeps the call site an ordinary
 * unconditional hook — `Platform.OS` cannot change between renders.
 */
export const useLastNotificationResponse: () => Notifications.NotificationResponse | null | undefined =
  Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;
