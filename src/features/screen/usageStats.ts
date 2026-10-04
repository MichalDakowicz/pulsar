import { requireOptionalNativeModule } from 'expo-modules-core';

import type { UsageSession } from '@/lib/screenTime';

/**
 * JS side of modules/usage-stats. Android only — on the web and in tests the
 * native module is absent, every call answers "no access", and screen-time
 * links are shown as kept from the phone.
 */

export type TopApp = { pkg: string; label: string; minutes: number };

type UsageStatsNativeModule = {
  hasAccess(): boolean;
  openAccessSettings(): void;
  sessions(packages: string[], from: number, to: number): Promise<UsageSession[]>;
  topApps(from: number, to: number, limit: number): Promise<TopApp[]>;
};

const native = requireOptionalNativeModule<UsageStatsNativeModule>('UsageStats');

/** Whether this build can read usage at all — false off Android. */
export const USAGE_SUPPORTED = !!native;

export function hasUsageAccess(): boolean {
  return native?.hasAccess() ?? false;
}

export function openUsageAccess(): void {
  native?.openAccessSettings();
}

export async function usageSessions(packages: string[], from: number, to: number): Promise<UsageSession[]> {
  if (!native || packages.length === 0) return [];
  return native.sessions(packages, from, to);
}

export async function topApps(from: number, to: number, limit: number): Promise<TopApp[]> {
  if (!native) return [];
  return native.topApps(from, to, limit);
}
