import { useRouter } from 'expo-router';
import { ArrowLeft, CalendarRange, Inbox, Plus, Settings, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';

import { usePendingPacts } from '@/features/social/usePacts';
import { useStatsRangeSheet } from '@/store/statsRange';

export type NavAction = {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge: number;
};

/**
 * The left island: the *one* thing the current screen wants you to do.
 *
 * On a route pushed out of the tabs it is Back, which is why no pushed screen
 * in this app draws a back button of its own — the bar already has one, in the
 * same place every time.
 */
export function useNavAction(pathname: string, activeTab: string | null): NavAction {
  const router = useRouter();
  const openRange = useStatsRangeSheet((state) => state.present);
  const { pending } = usePendingPacts();

  return useMemo(() => {
    const pushed = activeTab === null || isPushedRoute(pathname);
    if (pushed) {
      return {
        Icon: ArrowLeft,
        label: 'back',
        badge: 0,
        onPress: () => (router.canGoBack() ? router.back() : router.navigate('/')),
      };
    }

    switch (activeTab) {
      case 'stats':
        return {
          Icon: CalendarRange,
          label: 'change the range',
          badge: 0,
          onPress: () => openRange?.(),
        };
      case 'social':
        return {
          Icon: Inbox,
          label: 'pact invites',
          badge: pending.length,
          onPress: () => router.navigate('/inbox'),
        };
      case 'profile':
        return {
          Icon: Settings,
          label: 'settings',
          badge: 0,
          onPress: () => router.navigate('/settings'),
        };
      default:
        return {
          Icon: Plus,
          label: 'new habit',
          badge: 0,
          onPress: () => router.navigate('/habit/new'),
        };
    }
  }, [activeTab, pathname, router, openRange, pending.length]);
}

/** Routes that live above a tab rather than in it, where the action is Back. */
function isPushedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/habit/') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/nudges') ||
    pathname.startsWith('/awards') ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/save/') ||
    pathname.startsWith('/friend/')
  );
}
