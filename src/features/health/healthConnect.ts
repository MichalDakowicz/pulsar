import type { HealthReadings } from '@/lib/healthDays';
import type { HealthSource } from '@/lib/healthLink';

/**
 * Health Connect everywhere it does not exist: the web build and the tests.
 *
 * It is an Android service with no web API, so off Android every call answers
 * "unavailable" and the habit's page says the link is kept from the phone.
 * The real calls are in `healthConnect.android.ts`, which Metro picks on
 * Android; the two must keep the same exports.
 */

/** Whether Health Connect can be asked anything on this device. */
export type HealthAccess = 'unavailable' | 'needs-update' | 'ready';

export async function healthAccess(): Promise<HealthAccess> {
  return 'unavailable';
}

export async function grantedSources(): Promise<Set<HealthSource>> {
  return new Set();
}

export async function requestSources(_sources: HealthSource[]): Promise<Set<HealthSource>> {
  return new Set();
}

export function openHealthSettings(): void {}

export async function readHealth(_sources: Set<HealthSource>, _from: string, _to: string): Promise<HealthReadings> {
  return {};
}
