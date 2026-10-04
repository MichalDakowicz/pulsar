import { deleteRecordsByUuids, insertRecords, readRecords, type HealthConnectRecord } from 'react-native-health-connect';

import { init } from '@/features/health/healthConnect';
import { addDays, parseDay } from '@/lib/dates';
import { ownRecord, type WriteBackSource } from '@/lib/healthWriteBack';

/**
 * Writing Pulsar's own records back to Health Connect — water and mindful
 * minutes logged by hand. What a record holds is lib/healthWriteBack's call;
 * this finds Pulsar's record for a day, replaces it, or removes it.
 */

const OWN_PACKAGE = 'com.michaldakowicz.pulsar';

const TYPE = { hydration: 'Hydration', mindfulness: 'MindfulnessSession' } as const;

/** What Pulsar's own record for this habit and day holds: millilitres, or minutes. 0 when there is none. */
export async function readOwn(source: WriteBackSource, day: string, clientRecordId: string): Promise<number> {
  if (!(await init())) return 0;
  const result = await readRecords(TYPE[source], {
    timeRangeFilter: {
      operator: 'between',
      startTime: parseDay(day).toISOString(),
      endTime: parseDay(addDays(day, 1)).toISOString(),
    },
    dataOriginFilter: [OWN_PACKAGE],
  });
  const own = (result.records as { metadata?: { clientRecordId?: string } }[]).find(
    (record) => record.metadata?.clientRecordId === clientRecordId,
  );
  if (!own) return 0;
  if (source === 'hydration') return (own as unknown as { volume: { inMilliliters: number } }).volume.inMilliliters;
  const session = own as unknown as { startTime: string; endTime: string };
  return Math.round((Date.parse(session.endTime) - Date.parse(session.startTime)) / 60_000);
}

/** Replaces Pulsar's record for the day — Health Connect keeps the highest version of a client id. */
export async function writeOwn(source: WriteBackSource, habitId: string, day: string, value: number): Promise<void> {
  if (!(await init())) return;
  await insertRecords([ownRecord(source, habitId, day, value, new Date()) as HealthConnectRecord]);
}

export async function removeOwn(source: WriteBackSource, clientRecordId: string): Promise<void> {
  if (!(await init())) return;
  await deleteRecordsByUuids(TYPE[source], [], [clientRecordId]);
}
