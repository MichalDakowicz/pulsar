import * as Clipboard from 'expo-clipboard';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { HealthLinkSheet } from '@/features/health/HealthLinkSheet';
import { useHealthLink } from '@/features/health/useHealthLink';
import { HEALTH_SOURCES, linkMisfit, linkSummary } from '@/lib/healthLink';
import { logLink } from '@/lib/logLink';
import { COLORS } from '@/theme/colors';
import type { Habit } from '@/types/habit';

type ConnectionRowProps = { title: string; sub: string; onPress?: () => void };

function ConnectionRow({ title, sub, onPress }: ConnectionRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}: ${sub}`}
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border p-3.5"
    >
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">{sub}</Text>
      </View>
      {onPress && <ChevronRight size={18} color={COLORS.muted} />}
    </Pressable>
  );
}

/**
 * What else can answer for this habit: Health Connect filling it in, and a
 * link that checks it in from an NFC tag or a shortcut.
 *
 * Each row only appears when it can do something. Health Connect is offered on
 * the phone for a habit one of its sources can fill, and shown on the web only
 * as a fact about the phone; the link is left off an avoid habit, which a tap
 * could only ever answer with a slip.
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

  if (!showHealth && !showTag) return null;

  const misfit = link ? linkMisfit(habit, link.source) : null;
  const healthSub = !link
    ? 'fill it from steps, a workout or sleep'
    : misfit
      ? `paused — ${link.source} ${misfit}`
      : !android
        ? `${linkSummary(link)} · read on your phone`
        : health.unshared
          ? `${linkSummary(link)} · health connect is not sharing it`
          : [linkSummary(link), health.readAgo].filter(Boolean).join(' · ');

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
            const outcome = await health.save(next);
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
