import { addDays, parseDay } from '@/lib/dates';
import { WATER_ML, type HealthSource } from '@/lib/healthLink';

/**
 * What Pulsar writes back to Health Connect when you log water or mindful
 * minutes by hand, so the band's app and the calorie tracker see it too.
 *
 * Pulsar keeps exactly one record of its own per habit per day, found again by
 * a client id, and rewrites it with the day's total of what was logged *here*.
 * Never the day's whole amount: that already includes what other apps wrote
 * (the sync lifted it in), and writing it back would add their water to
 * itself on every glass, until a litre read as a lake.
 */

export type WriteBackSource = Extract<HealthSource, 'hydration' | 'mindfulness'>;

export function isWriteBack(source: HealthSource): source is WriteBackSource {
  return source === 'hydration' || source === 'mindfulness';
}

export function ownRecordId(habitId: string, day: string): string {
  return `pulsar:${habitId}:${day}`;
}

/** One of the habit's units, in what Health Connect stores: millilitres, or minutes. */
export function unitValue(source: WriteBackSource, unit: string): number {
  return source === 'hydration' ? (WATER_ML[unit] ?? 250) : 1;
}

/**
 * Pulsar's own figure after a change from `before` to `after` on the habit.
 * Only the difference is what was logged here; it is added to what Pulsar had
 * already written, and never taken below nothing.
 */
export function nextOwnValue(own: number, before: number, after: number, perUnit: number): number {
  return Math.max(0, own + (after - before) * perUnit);
}

/** When on `day` the record sits: from midnight to now, or to the end of a day already over. */
export function recordSpan(day: string, now: Date): { start: Date; end: Date } {
  const start = parseDay(day);
  const nextMidnight = parseDay(addDays(day, 1));
  const end = now < nextMidnight ? now : new Date(nextMidnight.getTime() - 1000);
  // Health Connect refuses a record that ends where it starts.
  return { start, end: end > start ? end : new Date(start.getTime() + 60_000) };
}

const MANUAL_ENTRY = 3;
const MEDITATION = 1;

/**
 * The record itself. Water fills the span; a mindful session is the minutes
 * logged, ending at the end of the span, since a session has a length and a
 * glass of water does not.
 */
export function ownRecord(source: WriteBackSource, habitId: string, day: string, value: number, now: Date) {
  const { start, end } = recordSpan(day, now);
  const metadata = {
    clientRecordId: ownRecordId(habitId, day),
    clientRecordVersion: now.getTime(),
    recordingMethod: MANUAL_ENTRY,
  };
  if (source === 'hydration') {
    return {
      recordType: 'Hydration' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      volume: { value, unit: 'milliliters' as const },
      metadata,
    };
  }
  const from = new Date(Math.max(start.getTime(), end.getTime() - value * 60_000));
  return {
    recordType: 'MindfulnessSession' as const,
    startTime: from.toISOString(),
    endTime: end.toISOString(),
    mindfulnessSessionType: MEDITATION,
    metadata,
  };
}
