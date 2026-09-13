import { type Href } from 'expo-router';
import { Activity, BarChart3, CircleUserRound, ListChecks, Users } from 'lucide-react-native';
import { type ReactNode } from 'react';

/**
 * The five destinations, in bar order.
 *
 * Habits is the second slot rather than Awards, which is where the source
 * design put it. Awards is a screen you visit when something happens; Habits is
 * where you archive, restore and reorder — and the design had no route to an
 * archived habit at all, so "archive this habit" was a one-way door. Awards is
 * reachable from Profile and from the ladder on any habit instead.
 */
export type NavDestination = {
  href: Href;
  label: string;
  /** Route name in (tabs) — the key the navigator uses. */
  tabName: string;
  icon: (color: string, size: number) => ReactNode;
  /**
   * Route-driven, because the bar also renders on routes pushed *out* of the
   * tabs. Those keep their parent destination lit — you have not left Profile
   * just because you opened its settings.
   */
  isActive: (pathname: string) => boolean;
};

export const NAV_DESTINATIONS: NavDestination[] = [
  {
    href: '/',
    label: 'Today',
    tabName: 'index',
    icon: (color, size) => <Activity color={color} size={size} />,
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/habits',
    label: 'Habits',
    tabName: 'habits',
    icon: (color, size) => <ListChecks color={color} size={size} />,
    // A habit's detail page and its editor are pushed from here.
    isActive: (pathname) => pathname.startsWith('/habits') || pathname.startsWith('/habit'),
  },
  {
    href: '/stats',
    label: 'Stats',
    tabName: 'stats',
    icon: (color, size) => <BarChart3 color={color} size={size} />,
    isActive: (pathname) => pathname.startsWith('/stats'),
  },
  {
    href: '/social',
    label: 'Social',
    tabName: 'social',
    icon: (color, size) => <Users color={color} size={size} />,
    isActive: (pathname) => pathname.startsWith('/social') || pathname.startsWith('/inbox'),
  },
  {
    href: '/profile',
    label: 'Profile',
    tabName: 'profile',
    icon: (color, size) => <CircleUserRound color={color} size={size} />,
    isActive: (pathname) =>
      pathname.startsWith('/profile') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/nudges') ||
      pathname.startsWith('/awards'),
  },
];

/** Which destination owns the current route, or null on a route no tab claims. */
export function activeTabFor(pathname: string): string | null {
  return NAV_DESTINATIONS.find((destination) => destination.isActive(pathname))?.tabName ?? null;
}
