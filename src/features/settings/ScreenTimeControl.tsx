import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { useHabits } from '@/features/habits/useHabits';
import { ConnectionRow } from '@/features/health/ConnectionRow';
import { hasUsageAccess, openUsageAccess } from '@/features/screen/usageStats';
import { screenSummary } from '@/lib/screenTime';

/**
 * Screen time from Settings: which avoid habits it slips, and the usage-access
 * switch it depends on. Limits are set on the habit's page; this lists and
 * points, the same as the Health Connect section above it.
 */
export function ScreenTimeControl() {
  const router = useRouter();
  const { active } = useHabits();
  const onPhone = Platform.OS === 'android';
  const [access, setAccess] = useState(hasUsageAccess);
  const linked = active.filter((habit) => habit.screenLink);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAccess(hasUsageAccess());
    });
    return () => subscription.remove();
  }, []);

  if (!onPhone && linked.length === 0) return null;

  return (
    <View className="gap-3 px-4 pt-7">
      <Overline>screen time</Overline>
      {linked.map((habit) => (
        <ConnectionRow
          key={habit.id}
          title={habit.name}
          sub={onPhone ? screenSummary(habit.screenLink!) : `${screenSummary(habit.screenLink!)} · read on your phone`}
          onPress={() => router.navigate(`/habit/${habit.id}`)}
        />
      ))}
      {onPhone && (
        <ConnectionRow
          title="usage access"
          sub={access ? 'on — pulsar reads time on screen only' : 'off — screen-time limits need it'}
          onPress={openUsageAccess}
        />
      )}
      <Text className="text-xs text-muted-foreground">
        {linked.length === 0
          ? 'no avoid habit has a screen-time limit yet. open one and set it under connections.'
          : 'going over a limit logs a slip for that day. set or change a limit from the habit page.'}
      </Text>
    </View>
  );
}
