import {
  aggregateGroupByPeriod,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type RecordType,
} from 'react-native-health-connect';

import { addDays, parseDay } from '@/lib/dates';
import type { ExerciseReading, HealthReadings, SleepReading } from '@/lib/healthDays';
import type { HealthAccess, HealthSource } from '@/lib/healthLink';

export type { HealthAccess };

/**
 * The Android side of Health Connect: the one file that touches the native
 * module. Everything it returns is plain data for lib/healthDays to judge;
 * nothing here decides what a reading means for a habit.
 *
 * Metro picks this file on Android and `healthConnect.ts` everywhere else, so
 * the web build never bundles a module that has nothing to talk to.
 */

const RECORD: Record<HealthSource, RecordType> = {
  steps: 'Steps',
  exercise: 'ExerciseSession',
  sleep: 'SleepSession',
};

const SOURCE_OF = new Map<string, HealthSource>(Object.entries(RECORD).map(([source, record]) => [record, source as HealthSource]));

// Health Connect must be initialised once per process before any other call.
let ready: Promise<boolean> | null = null;
function init(): Promise<boolean> {
  ready ??= initialize().catch(() => {
    ready = null;
    return false;
  });
  return ready;
}

export async function healthAccess(): Promise<HealthAccess> {
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return 'unavailable';
    return (await init()) ? 'ready' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

function toSources(granted: { recordType?: string; accessType?: string }[]): Set<HealthSource> {
  const out = new Set<HealthSource>();
  for (const permission of granted) {
    const source = permission.accessType === 'read' && permission.recordType ? SOURCE_OF.get(permission.recordType) : undefined;
    if (source) out.add(source);
  }
  return out;
}

export async function grantedSources(): Promise<Set<HealthSource>> {
  if (!(await init())) return new Set();
  return toSources((await getGrantedPermissions()) as { recordType?: string; accessType?: string }[]);
}

/** Asks for read access to these sources and returns every source that is now granted. */
export async function requestSources(sources: HealthSource[]): Promise<Set<HealthSource>> {
  if (!(await init())) return new Set();
  await requestPermission(sources.map((source) => ({ accessType: 'read' as const, recordType: RECORD[source] })));
  return grantedSources();
}

export function openHealthSettings(): void {
  openHealthConnectSettings();
}

const iso = (day: string) => parseDay(day).toISOString();

// A month of workouts or nights is a page or two; the cap stops a source that
// writes a record a minute from turning one sync into a thousand round trips.
const MAX_PAGES = 10;

async function readAll<T extends 'ExerciseSession' | 'SleepSession'>(recordType: T, startTime: string, endTime: string) {
  const records = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await readRecords(recordType, { timeRangeFilter: { operator: 'between', startTime, endTime }, pageToken });
    records.push(...result.records);
    pageToken = result.pageToken || undefined;
    if (!pageToken) break;
  }
  return records;
}

/**
 * Everything the given sources hold from `from` (a day key) to the end of
 * `to`. Sleep is read from noon the day before, so the night that ends on
 * `from` comes in whole rather than cut at midnight.
 */
export async function readHealth(sources: Set<HealthSource>, from: string, to: string): Promise<HealthReadings> {
  if (!(await init())) return {};
  const end = iso(addDays(to, 1));
  const out: HealthReadings = {};

  if (sources.has('steps')) {
    const groups = await aggregateGroupByPeriod({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: iso(from), endTime: end },
      timeRangeSlicer: { period: 'DAYS', length: 1 },
    });
    out.steps = groups.map((group) => ({ startTime: group.startTime, count: group.result.COUNT_TOTAL }));
  }

  if (sources.has('exercise')) {
    const sessions = await readAll('ExerciseSession', iso(from), end);
    out.exercise = sessions.map(
      (session): ExerciseReading => ({ start: session.startTime, end: session.endTime, type: session.exerciseType }),
    );
  }

  if (sources.has('sleep')) {
    const noon = parseDay(addDays(from, -1));
    noon.setHours(12);
    const nights = await readAll('SleepSession', noon.toISOString(), end);
    out.sleep = nights.map(
      (night): SleepReading => ({
        start: night.startTime,
        end: night.endTime,
        stages: (night.stages ?? []).map((stage) => ({ start: stage.startTime, end: stage.endTime, stage: stage.stage })),
      }),
    );
  }

  return out;
}
