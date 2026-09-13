import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { NavIslands } from '@/components/layout/NavIslands';
import { useAuth } from '@/features/auth/AuthProvider';
import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { StatsRangeSheet } from '@/features/stats/StatsRangeSheet';
import { useStatsRangeSheet } from '@/store/statsRange';

/**
 * The tab shell. The bar is the nav islands on every viewport, phone and
 * desktop web alike — it is the app's only navigation chrome, and it drives
 * itself off the route rather than off this navigator so it can also render on
 * screens pushed out of the tabs.
 */
export default function TabsLayout() {
  const { user } = useAuth();
  const setPresent = useStatsRangeSheet((state) => state.setPresent);

  // The range picker mounts once here rather than on Stats, so the nav island's
  // left action can open it from any route.
  useEffect(() => {
    // The sheet registers its own opener; this just clears it on unmount.
    return () => setPresent(null);
  }, [setPresent]);

  if (!user) return <Redirect href="/login" />;

  return (
    <>
      <Tabs
        tabBar={() => <NavIslands />}
        // No scene animation: react-navigation cross-fades over the navigator's
        // own background, which flashes white on every swap. The movement that
        // makes a tab change feel smooth lives in the bar, where the marker
        // slides between destinations.
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'hsl(0 0% 3.9%)' } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
        <Tabs.Screen name="social" options={{ title: 'Social' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <StatsRangeSheet />
      <OnboardingGate />
    </>
  );
}
