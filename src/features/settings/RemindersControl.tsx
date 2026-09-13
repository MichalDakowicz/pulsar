import { BellOff } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Overline, Segmented, SwitchRow } from '@/components/ui/controls';
import { useNotificationPermission } from '@/features/notifications/useNotificationPermission';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { NUDGE_COPY, type NudgeLevel } from '@/lib/habitSettings';
import { supportsNotifications } from '@/lib/notificationSetup';

import { QuietHoursControl } from './QuietHoursControl';

/**
 * Everything that decides whether a reminder reaches you.
 *
 * Per-habit times live in the builder, not here — this is the floor the whole
 * app obeys. Turning the level down genuinely removes reminders from the queue
 * rather than hiding them after the fact, because the queue is rebuilt from
 * these values every time they change.
 */
export function RemindersControl() {
  const { settings, updateSettings } = useHabitSettings();
  const { granted, request } = useNotificationPermission();

  return (
    <View>
      <View className="gap-3 px-4 pt-7">
        <Overline>reminders</Overline>

        {supportsNotifications && granted === false && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="allow notifications"
            onPress={() => void request()}
            className="flex-row items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3"
          >
            <BellOff size={18} color="#f59e0b" />
            <Text className="flex-1 text-xs text-foreground">
              android is blocking pulsar&apos;s reminders. everything below is set up and will start landing
              the moment you allow them — tap to fix it.
            </Text>
          </Pressable>
        )}

        {/* The web build has no queue to schedule into, and pretending otherwise
            with a full set of switches is how someone ends up waiting for a
            reminder that was never going to fire. */}
        {!supportsNotifications && (
          <Text className="text-xs text-muted-foreground">
            reminders need the android app. these settings are saved to your account and will apply there.
          </Text>
        )}

        <Segmented<NudgeLevel>
          label="how hard pulsar pushes"
          value={settings.nudgeLevel}
          onChange={(nudgeLevel) => void updateSettings({ nudgeLevel })}
          options={[
            { value: 'gentle', label: 'gentle' },
            { value: 'firm', label: 'firm' },
            { value: 'relentless', label: 'relentless' },
          ]}
        />
        <Text className="text-xs text-muted-foreground">{NUDGE_COPY[settings.nudgeLevel]}</Text>
      </View>

      <View className="mt-3 px-4">
        {/* Escalation is what `gentle` turns off, so the switch is absent there
            rather than greyed out — a switch that does nothing is worse than
            no switch. */}
        {settings.nudgeLevel !== 'gentle' && (
          <View className="border-t border-border/50">
            <SwitchRow
              label="follow up if ignored"
              sub="a second nudge two hours later, and a last one with three hours left"
              value={settings.escalate}
              onChange={(escalate) => void updateSettings({ escalate })}
            />
          </View>
        )}

        <View className="border-t border-border/50">
          <SwitchRow
            label="streak warnings"
            sub="at 21:00, when a running streak still has nothing against it"
            value={settings.riskAlerts}
            onChange={(riskAlerts) => void updateSettings({ riskAlerts })}
          />
        </View>

        <QuietHoursControl />
      </View>
    </View>
  );
}
