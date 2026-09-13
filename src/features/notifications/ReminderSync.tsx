import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useReminders } from '@/features/notifications/useReminders';
import { useReminderTaps } from '@/features/notifications/useReminderTaps';
import { ensureNotificationChannels } from '@/lib/notificationChannels';
import { supportsNotifications } from '@/lib/notificationSetup';

/**
 * Renders nothing. Mounted from the root layout so the reminder queue is kept
 * in step on every route, not only on the one screen that remembered to ask.
 */
export function ReminderSync() {
  const { user } = useAuth();

  // Channels first and unconditionally: Android shows their names in the system
  // permission sheet, so creating them after the prompt describes nothing.
  useEffect(() => {
    if (supportsNotifications) void ensureNotificationChannels();
  }, []);

  useReminders();

  // Only route a tapped reminder once there is somebody to route it for: a cold
  // start from a notification resolves auth and the tap at about the same moment.
  useReminderTaps(!!user?.id);

  return null;
}
