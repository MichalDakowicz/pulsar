import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Android routes every notification through a channel, and the channel — not the
// message — owns whether it makes a sound, vibrates, or is allowed to interrupt.
// Splitting reminders from streak warnings is what lets someone mute the daily
// nudge in the system settings while keeping the one that says a streak is about
// to go, without Pulsar needing its own setting for it.

export const CHANNELS = {
  reminders: 'reminders',
  risk: 'risk',
} as const;

export type ChannelId = (typeof CHANNELS)[keyof typeof CHANNELS];

/** Pulsar's amber. The one place a hex is allowed outside theme/colors. */
export const NOTIFICATION_ACCENT = '#f59e0b';

const { AndroidImportance } = Notifications;

type ChannelSpec = {
  id: ChannelId;
  name: string;
  description: string;
  importance: number;
  showBadge: boolean;
};

const SPECS: ChannelSpec[] = [
  {
    id: CHANNELS.reminders,
    name: 'Reminders',
    description: 'When a habit comes due, and the follow-ups if you let it escalate',
    importance: AndroidImportance.DEFAULT,
    showBadge: true,
  },
  {
    id: CHANNELS.risk,
    name: 'Streak warnings',
    // The only channel that earns HIGH: it is the one notification with a
    // deadline, and it is worthless if it arrives after midnight.
    description: 'Late in the evening, when a streak can still be saved',
    importance: AndroidImportance.HIGH,
    showBadge: true,
  },
];

let ready: Promise<void> | null = null;

/**
 * Create every channel. Idempotent both here (the promise is memoized) and in
 * Android, where re-declaring a channel only updates its name and description —
 * importance is frozen after first creation, because it belongs to the user
 * once they have touched it.
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  ready ??= Promise.all(
    SPECS.map((spec) =>
      Notifications.setNotificationChannelAsync(spec.id, {
        name: spec.name,
        description: spec.description,
        importance: spec.importance,
        showBadge: spec.showBadge,
        lightColor: NOTIFICATION_ACCENT,
      }),
    ),
  )
    .then(() => undefined)
    .catch((error) => {
      // A failed channel is not worth blocking a sign-in over; the reminder
      // still lands, just on Android's default channel.
      console.warn('Could not create notification channels', error);
      ready = null;
    });
  return ready;
}
