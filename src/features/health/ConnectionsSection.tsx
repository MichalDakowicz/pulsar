import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { SectionHeader } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { ConnectionRow } from '@/features/health/ConnectionRow';
import { HealthLinkSheet } from '@/features/health/HealthLinkSheet';
import { useHealthLink } from '@/features/health/useHealthLink';
import { ScreenTimeRow } from '@/features/screen/ScreenTimeRow';
import { HEALTH_SOURCES, linkLine, linkMisfit } from '@/lib/healthLink';
import { logLink } from '@/lib/logLink';
import type { Habit } from '@/types/habit';

/**
 * What else can answer for this habit: Health Connect filling it in, screen
 * time slipping it, and a link that checks it in from an NFC tag or a shortcut.
 *
 * Each row only appears when it can do something. Health Connect is offered on
 * the phone for a habit one of its sources can fill, and shown on the web only
 * as a fact about the phone; screen time only on an avoid habit, the one kind
 * with a slip to log; the link is left off an avoid habit, which a tap could
 * only ever answer with a slip.
 */
export function ConnectionsSection({ habit }: { habit: Habit }) {
  const health = useHealthLink(habit);
  const { say } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const link = habit.healthLink ?? null;
  const android = Platform.OS === 'android';
  const fits = HEALTH_SOURCES.some((source) => !linkMisfit(habit, source));
  const showHealth = !habit.archivedAt && ((android && fits) || !!link);
  const showTag = !habit.archivedAt && habit.kind !== 'avoid';
  const showScreen = !habit.archivedAt && habit.kind === 'avoid' && (android || !!habit.screenLink);

  if (!showHealth && !showTag && !showScreen) return null;

  const healthSub = linkLine(habit, { onPhone: android, unshared: health.unshared, readAgo: health.readAgo });

  const copyLink = async () => {
    await Clipboard.setStringAsync(logLink(habit.id));
    say('link copied. write it to an nfc tag as a url, or put it behind a shortcut.');
  };

  return (
    <View className="border-b border-border/50 px-4 py-5">
      <SectionHeader title="connections" />
      <View className="mt-3.5 gap-2">
        {showHealth && (
          <ConnectionRow title="health connect" sub={healthSub} onPress={android ? () => setSheetOpen(true) : undefined} />
        )}
        {showScreen && <ScreenTimeRow habit={habit} />}
        {showTag && <ConnectionRow title="nfc tag or shortcut" sub="copy a link that checks it in" onPress={() => void copyLink()} />}
      </View>

      {android && (
        <HealthLinkSheet
          key={sheetOpen ? 'open' : 'closed'}
          open={sheetOpen}
          habit={habit}
          access={health.access}
          saving={health.saving}
          onDismiss={() => setSheetOpen(false)}
          onSave={async (next) => {
            const outcome = await health.save(next).catch(() => 'failed' as const);
            if (outcome === 'failed') {
              say('the link did not save. try again in a moment.');
              return;
            }
            if (outcome === 'denied') {
              say('health connect did not share it. allow pulsar there, then link it again.', {
                label: 'open',
                onPress: health.openSettings,
              });
              return;
            }
            setSheetOpen(false);
            say(next ? `${habit.name} fills in from health connect.` : `${habit.name} is yours to check by hand again.`);
          }}
        />
      )}
    </View>
  );
}
