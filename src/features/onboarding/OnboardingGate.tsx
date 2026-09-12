import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useHabits } from '@/features/habits/useHabits';
import { useHabitSettings } from '@/hooks/useHabitSettings';

/**
 * Sends a genuinely new account to the walkthrough, once.
 *
 * Two conditions, not one. The stamp on its own would drag someone who cleared
 * their settings row back through the tour with four running habits; the empty
 * habit list on its own would re-run it for anyone who archived everything. It
 * takes both, and it fires at most once per mount so a slow settings fetch
 * cannot bounce the router twice.
 */
export function OnboardingGate() {
  const router = useRouter();
  const { settings, loading: settingsLoading } = useHabitSettings();
  const { habits, loading: habitsLoading } = useHabits();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || settingsLoading || habitsLoading) return;
    if (settings.onboardedAt) return;
    if (habits.length > 0) return;
    sent.current = true;
    router.navigate('/onboarding');
  }, [settings.onboardedAt, settingsLoading, habits.length, habitsLoading, router]);

  return null;
}
