/**
 * Local-calendar helpers. Everything a habit tracker asks — "did I hold it
 * today", "is this a Monday" — is a local question, so nothing here touches UTC
 * and every key is `YYYY-MM-DD` in the device's own zone.
 *
 * Free of React and react-native on purpose (CLAUDE.md): the streak rules are
 * the part most worth testing, and they are only testable if their clock is.
 */

/** `YYYY-MM-DD` in local time. */
export function dateKey(input: string | number | Date = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A `YYYY-MM-DD` key back to local midnight. `new Date('2026-09-11')` is UTC — this is not. */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Monday-anchored, 0 = Monday … 6 = Sunday. The whole app treats weeks as starting Monday. */
export function weekdayIndex(key: string): number {
  const day = parseDay(key).getDay();
  return day === 0 ? 6 : day - 1;
}

/** The Monday of the week `key` falls in, as a key. */
export function weekKey(key: string): string {
  return addDays(key, -weekdayIndex(key));
}

/** Whole days from `from` to `to`, positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** Every key from `from` to `to` inclusive, oldest first. Empty when `to` precedes `from`. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) out.push(addDays(from, i));
  return out;
}

/** Hours left in the local day, as a float. Drives "3h 18m left" and the risk window. */
export function hoursToMidnight(now: Date = new Date()): number {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return (end.getTime() - now.getTime()) / 3_600_000;
}

/** "3h 18m", or "18m" under the hour. What is left of tonight, in words. */
export function formatCountdown(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** "friday · 11 sep" — the Today header. Lowercase, like every other title. */
export function formatDayLong(key: string): string {
  const d = parseDay(key);
  return `${WEEKDAYS[weekdayIndex(key)]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "11 sep" — compact, for a wall tooltip or a repair row. */
export function formatDayShort(key: string): string {
  const d = parseDay(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** `m t w t f s s`, Monday first — the day toggles and the week chart share it. */
export const WEEKDAY_INITIALS = ['m', 't', 'w', 't', 'f', 's', 's'] as const;
export const WEEKDAY_SHORT = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
