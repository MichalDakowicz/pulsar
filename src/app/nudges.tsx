import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline, Segmented, SwitchRow } from '@/components/ui/controls';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { usePacts } from '@/features/social/usePacts';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { hasReminders } from '@/lib/habit';
import { NUDGE_COPY, type NudgeLevel } from '@/lib/habitSettings';

/**
 * How hard Pulsar pushes.
 *
 * Every switch here is hidden when it could not change anything: escalation
 * needs a level that escalates, partner nudges need a pact, and the whole
 * reminder section needs at least one habit with a clock on it. A settings
 * screen full of switches that do nothing is a settings screen nobody believes.
 */
export default function Nudges() {
  const { settings, updateSettings } = useHabitSettings();
  const board = useHabitBoard();
  const { pacts } = usePacts();
  const bottom = useNavBarSpace();

  const anyReminders = board.rows.some((row) => hasReminders(row.habit));
  const hasPacts = pacts.some((pact) => pact.state === 'active');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            how hard should pulsar push?
          </Text>
        </View>

        <View className="gap-3 px-4 pt-5">
          <Segmented<NudgeLevel>
            label="nudge level"
            value={settings.nudgeLevel}
            onChange={(value) => void updateSettings({ nudgeLevel: value })}
            options={[
              { value: 'gentle', label: 'gentle' },
              { value: 'firm', label: 'firm' },
              { value: 'relentless', label: 'relentless' },
            ]}
          />
          <Text className="text-sm text-muted-foreground">{NUDGE_COPY[settings.nudgeLevel]}</Text>
        </View>

        <View className="mt-6 border-y border-border/50 px-4">
          {/* Escalation is meaningless at gentle, where there are no follow-ups
              to escalate — so the switch is not there rather than there and
              ignored. */}
          {settings.nudgeLevel !== 'gentle' && anyReminders && (
            <SwitchRow
              label="escalating reminders"
              sub="a second nudge two hours later, and a last one with three hours left"
              value={settings.escalate}
              onChange={(value) => void updateSettings({ escalate: value })}
            />
          )}

          <SwitchRow
            label="risk alerts"
            sub="tell me when a streak can still be saved"
            value={settings.riskAlerts}
            onChange={(value) => void updateSettings({ riskAlerts: value })}
          />

          {/* Nothing to nudge and nobody to be nudged by until a pact exists. */}
          {hasPacts && (
            <SwitchRow
              label="partner nudges"
              sub="let a pact partner ping you, and you them"
              value={settings.partnerNudges}
              onChange={(value) => void updateSettings({ partnerNudges: value })}
            />
          )}

          <SwitchRow
            label="quiet hours"
            sub={`nothing between ${String(settings.quietStart).padStart(2, '0')}:00 and ${String(settings.quietEnd).padStart(2, '0')}:00`}
            value={settings.quietHours}
            onChange={(value) => void updateSettings({ quietHours: value })}
          />
        </View>

        {!anyReminders && (
          <View className="px-4 pt-5">
            <Overline>no reminders set</Overline>
            <Text className="mt-2 text-sm text-muted-foreground">
              none of your habits has a clock on it yet, so most of the above has nothing to act on. give a
              habit a window other than “anytime” and it starts reminding you.
            </Text>
          </View>
        )}

        <View className="px-4 py-6">
          <Text className="text-xs text-muted-foreground">
            pulsar never nudges about a habit you have already held. the one reminder that does not turn off
            is the last-hours warning when a streak is genuinely on the line — turn risk alerts off above if
            you do not want even that.
          </Text>
        </View>
      </ContentShell>
    </ScrollView>
  );
}
