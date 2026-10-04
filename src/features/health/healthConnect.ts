import type { HealthReadings } from '@/lib/healthDays';
import type { HealthAccess, HealthSource } from '@/lib/healthLink';

export type { HealthAccess };

/**
 * Health Connect everywhere it does not exist: the web build and the tests.
 *
 * It is an Android service with no web API, so off Android every call answers
 * "unavailable" and the habit's page says the link is kept from the phone.
 * The real calls are in `healthConnect.android.ts`, which Metro picks on
 * Android; the two must keep the same exports.
 */

export const WRITES: Partial<Record<HealthSource, string>> = {};

export async function init(): Promise<boolean> {
  return false;
}

export async function healthAccess(): Promise<HealthAccess> {
  return 'unavailable';
}

export async function grantedSources(): Promise<Set<HealthSource>> {
  return new Set();
}

export async function canWrite(_source: HealthSource): Promise<boolean> {
  return false;
}

export async function requestSources(_sources: HealthSource[]): Promise<Set<HealthSource>> {
  return new Set();
}

export function openHealthSettings(): void {}

export async function readHealth(
  _sources: Set<HealthSource>,
  _from: string,
  _to: string,
  _options: { distanceBySession?: boolean } = {},
): Promise<HealthReadings> {
  return {};
}
