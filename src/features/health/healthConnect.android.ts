import {
  aggregateGroupByPeriod,
  aggregateRecord,
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
import type { DistanceSession, ExerciseReading, HealthReadings, SleepReading } from '@/lib/healthDays';
import type { HealthAccess, HealthSource } from '@/lib/healthLink';

export type { HealthAccess };

/**
 * The Android side of Health Connect reads: the one file that asks the native
 * module for data. Everything it returns is plain data for lib/healthDays to
 * judge; nothing here decides what a reading means for a habit. Writes are in
 * `healthWrite.android.ts`.
 *
 * Metro picks this file on Android and `healthConnect.ts` everywhere else, so
 * the web build never bundles a module that has nothing to talk to.
 */

/**
 * What each source reads. The first is the one that decides whether the source
 * is shared at all; distance also asks for workouts, so a link narrowed to
 * running can find the runs.
 */
const READS: Record<HealthSource, RecordType[]> = {
  steps: ['Steps'],
  exercise: ['ExerciseSession'],
  sleep: ['SleepSession'],
  distance: ['Distance', 'ExerciseSession'],
  hydration: ['Hydration'],
  mindfulness: ['MindfulnessSession'],
};

/** What each source writes back. Only what you log by hand in Pulsar. */
export const WRITES: Partial<Record<HealthSource, RecordType>> = {
  hydration: 'Hydration',
  mindfulness: 'MindfulnessSession',
};

type Granted = { recordType?: string; accessType?: string }[];

// Health Connect must be initialised once per process before any other call.
let ready: Promise<boolean> | null = null;
export function init(): Promise<boolean> {
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

async function granted(): Promise<Granted> {
  if (!(await init())) return [];
  return (await getGrantedPermissions()) as Granted;
}

const has = (list: Granted, access: 'read' | 'write', recordType: string) =>
  list.some((permission) => permission.accessType === access && permission.recordType === recordType);

export async function grantedSources(): Promise<Set<HealthSource>> {
  const list = await granted();
  return new Set((Object.keys(READS) as HealthSource[]).filter((source) => has(list, 'read', READS[source][0])));
}

/** Whether Pulsar may write this source back. Water and mindfulness only. */
export async function canWrite(source: HealthSource): Promise<boolean> {
  const recordType = WRITES[source];
  return !!recordType && has(await granted(), 'write', recordType);
}

/**
 * Asks for what these sources need — reading, and writing back where a source
 * does — and returns every source that can now be read. A refused write still
 * leaves the source readable; it just keeps what you log to Pulsar.
 */
export async function requestSources(sources: HealthSource[]): Promise<Set<HealthSource>> {
  if (!(await init())) return new Set();
  const reads = sources.flatMap((source) => READS[source].map((recordType) => ({ accessType: 'read' as const, recordType })));
  const writes = sources.flatMap((source) => {
    const recordType = WRITES[source];
    return recordType ? [{ accessType: 'write' as const, recordType }] : [];
  });
  try {
    await requestPermission([...reads, ...writes]);
  } catch {
    // A record type this phone's Health Connect does not have yet — mindfulness
    // before Android 14's module update — refuses the whole request.
  }
  return grantedSources();
}

export function openHealthSettings(): void {
  openHealthConnectSettings();
}

const iso = (day: string) => parseDay(day).toISOString();

// A month of workouts or nights is a page or two; the cap stops a source that
// writes a record a minute from turning one sync into a thousand round trips.
const MAX_PAGES = 10;

async function readAll<T extends 'ExerciseSession' | 'SleepSession' | 'MindfulnessSession'>(recordType: T, startTime: string, endTime: string) {
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

type DailyType = 'Steps' | 'Distance' | 'Hydration';

/** A daily aggregate, de-duplicated across apps by Health Connect itself. */
async function daily(recordType: DailyType, from: string, end: string) {
  const groups = await aggregateGroupByPeriod({
    recordType,
    timeRangeFilter: { operator: 'between', startTime: iso(from), endTime: end },
    timeRangeSlicer: { period: 'DAYS', length: 1 },
  });
  return groups.map((group) => {
    const result = group.result as Record<string, unknown>;
    const value =
      recordType === 'Steps'
        ? (result.COUNT_TOTAL as number)
        : recordType === 'Distance'
          ? (result.DISTANCE as { inKilometers: number }).inKilometers
          : (result.VOLUME_TOTAL as { inMilliliters: number }).inMilliliters;
    return { startTime: group.startTime, value: value ?? 0 };
  });
}

/** The kilometres covered inside each workout, for a distance link narrowed to some kinds. */
async function sessionDistances(sessions: ExerciseReading[]): Promise<DistanceSession[]> {
  const out: DistanceSession[] = [];
  for (const session of sessions) {
    const result = await aggregateRecord({
      recordType: 'Distance',
      timeRangeFilter: { operator: 'between', startTime: session.start, endTime: session.end },
    });
    out.push({ ...session, km: result.DISTANCE?.inKilometers ?? 0 });
  }
  return out;
}

/**
 * Everything the given sources hold from `from` (a day key) to the end of
 * `to`. Sleep is read from noon the day before, so the night that ends on
 * `from` comes in whole rather than cut at midnight.
 */
export async function readHealth(
  sources: Set<HealthSource>,
  from: string,
  to: string,
  options: { distanceBySession?: boolean } = {},
): Promise<HealthReadings> {
  if (!(await init())) return {};
  const end = iso(addDays(to, 1));
  const out: HealthReadings = {};
  const bySession = sources.has('distance') && !!options.distanceBySession;

  if (sources.has('steps')) out.steps = await daily('Steps', from, end);
  if (sources.has('distance')) out.distance = await daily('Distance', from, end);
  if (sources.has('hydration')) out.hydration = await daily('Hydration', from, end);

  if (sources.has('exercise') || bySession) {
    const sessions = await readAll('ExerciseSession', iso(from), end);
    out.exercise = sessions.map(
      (session): ExerciseReading => ({ start: session.startTime, end: session.endTime, type: session.exerciseType }),
    );
    if (bySession) out.distanceSessions = await sessionDistances(out.exercise);
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

  if (sources.has('mindfulness')) {
    const sessions = await readAll('MindfulnessSession', iso(from), end);
    out.mindfulness = sessions.map((session) => ({ start: session.startTime, end: session.endTime }));
  }

  return out;
}
