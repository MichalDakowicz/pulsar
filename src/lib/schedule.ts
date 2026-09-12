import { addDays, daysBetween, weekdayIndex, WEEKDAY_SHORT } from '@/lib/dates';

/**
 * When a habit is actually owed.
 *
 * This is the spine of every other rule in the app: a streak only walks target
 * days, the wall only paints target days, and Today only lists what is due. Get
 * this wrong and a Mon/Wed/Fri habit silently breaks every Tuesday — which is
 * the single most expensive bug a habit tracker can have, because the user
 * finds out by losing a streak they had actually kept.
 */

export type Cadence =
  | { kind: 'daily' }
  | { kind: 'weekdays' }
  /** Explicit weekday set, 0 = Monday … 6 = Sunday. */
  | { kind: 'days'; days: number[] }
  /** Every `every` days counting from `anchor` (the day the habit started). */
  | { kind: 'interval'; every: number; anchor: string };

export type CadenceKind = Cadence['kind'];

export function isTargetDay(cadence: Cadence, day: string): boolean {
  switch (cadence.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return weekdayIndex(day) < 5;
    case 'days':
      return cadence.days.includes(weekdayIndex(day));
    case 'interval': {
      const span = daysBetween(cadence.anchor, day);
      if (span < 0) return false;
      const every = Math.max(1, cadence.every);
      return span % every === 0;
    }
  }
}

/** The next target day strictly after `day`. Bounded, so a days:[] cadence cannot spin. */
export function nextTargetDay(cadence: Cadence, day: string): string | null {
  for (let i = 1; i <= 366; i++) {
    const candidate = addDays(day, i);
    if (isTargetDay(cadence, candidate)) return candidate;
  }
  return null;
}

/** Every target day in `[from, to]`, oldest first. */
export function targetDaysBetween(cadence: Cadence, from: string, to: string): string[] {
  const out: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) {
    const day = addDays(from, i);
    if (isTargetDay(cadence, day)) out.push(day);
  }
  return out;
}

/** How many days a week this cadence asks for — 0 when the user picked no days. */
export function targetsPerWeek(cadence: Cadence): number {
  switch (cadence.kind) {
    case 'daily':
      return 7;
    case 'weekdays':
      return 5;
    case 'days':
      return cadence.days.length;
    case 'interval':
      return 7 / Math.max(1, cadence.every);
  }
}

/**
 * A cadence with no days selected can never come due, so it can never build a
 * streak. The builder refuses to leave the target step while this is true
 * rather than letting someone commit to a habit that will never ask anything.
 */
export function isEmptyCadence(cadence: Cadence): boolean {
  return cadence.kind === 'days' && cadence.days.length === 0;
}

export function cadenceLabel(cadence: Cadence): string {
  switch (cadence.kind) {
    case 'daily':
      return 'every day';
    case 'weekdays':
      return 'weekdays';
    case 'days': {
      if (cadence.days.length === 0) return 'no days picked';
      if (cadence.days.length === 7) return 'every day';
      const names = [...cadence.days].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]);
      // Past three days the list stops being readable and the count says more.
      return names.length > 3 ? `${names.length} days a week` : names.join(' · ');
    }
    case 'interval':
      return cadence.every === 2 ? 'every other day' : `every ${cadence.every} days`;
  }
}
