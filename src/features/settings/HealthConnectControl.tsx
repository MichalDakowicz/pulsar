import { useRouter } from 'expo-router';
import { Platform, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { useHabits } from '@/features/habits/useHabits';
import { ConnectionRow } from '@/features/health/ConnectionRow';
import { openHealthSettings } from '@/features/health/healthConnect';
import { useHealthStatus } from '@/features/health/healthStatus';
import { useHealthAccess, useReadAgo } from '@/features/health/useHealthAccess';
import { ACCESS_LINES, linkLine } from '@/lib/healthLink';

/**
 * Health Connect from Settings: which habits it fills and how each is doing,
 * and the way into Health Connect's own permissions.
 *
 * Linking stays on the habit's page, where the habit's shape decides which
 * sources it can take — this lists and points. Off the phone it only appears
 * when something is linked, since there is nothing to manage from a browser.
 */
export function HealthConnectControl() {
  const router = useRouter();
  const { active } = useHabits();
  const access = useHealthAccess();
  const readAgo = useReadAgo();
  const missing = useHealthStatus((state) => state.missing);
  const onPhone = Platform.OS === 'android';
  const linked = active.filter((habit) => habit.healthLink);

  if (!onPhone && linked.length === 0) return null;

  return (
    <View className="gap-3 px-4 pt-7">
      <Overline>health connect</Overline>
      {onPhone && access && access !== 'ready' && <Text className="text-sm text-foreground">{ACCESS_LINES[access]}</Text>}

      {linked.map((habit) => (
        <ConnectionRow
          key={habit.id}
          title={habit.name}
          sub={linkLine(habit, {
            onPhone,
            unshared: !!habit.healthLink && missing.includes(habit.healthLink.source),
            readAgo,
          })}
          onPress={() => router.navigate(`/habit/${habit.id}`)}
        />
      ))}

      {onPhone && access && access !== 'unavailable' && (
        <ConnectionRow title="what pulsar may read" sub="steps, workouts, distance, sleep, water and mindfulness — managed in health connect" onPress={openHealthSettings} />
      )}

      <Text className="text-xs text-muted-foreground">
        {linked.length === 0
          ? 'no habit is filled from it yet. open a steps, workout or sleep habit and link it under connections.'
          : 'pulsar reads it when you open the app and only ever adds to a day. link or change a habit from its page.'}
      </Text>
    </View>
  );
}
