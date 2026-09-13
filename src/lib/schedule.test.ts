import {
  cadenceLabel,
  isEmptyCadence,
  isTargetDay,
  nextTargetDay,
  targetDaysBetween,
  targetsPerWeek,
  type Cadence,
} from '@/lib/schedule';

// 2026-09-07 is a Monday, 2026-09-13 the Sunday that closes the same week.
const MON = '2026-09-07';
const SAT = '2026-09-12';
const SUN = '2026-09-13';

describe('isTargetDay', () => {
  it('daily takes every day', () => {
    expect(isTargetDay({ kind: 'daily' }, MON)).toBe(true);
    expect(isTargetDay({ kind: 'daily' }, SUN)).toBe(true);
  });

  it('weekdays stops at Friday', () => {
    expect(isTargetDay({ kind: 'weekdays' }, MON)).toBe(true);
    expect(isTargetDay({ kind: 'weekdays' }, '2026-09-11')).toBe(true);
    expect(isTargetDay({ kind: 'weekdays' }, SAT)).toBe(false);
    expect(isTargetDay({ kind: 'weekdays' }, SUN)).toBe(false);
  });

  it('an explicit day set is Monday-indexed', () => {
    const cadence: Cadence = { kind: 'days', days: [0, 2, 4] };
    expect(isTargetDay(cadence, MON)).toBe(true);
    expect(isTargetDay(cadence, '2026-09-08')).toBe(false);
    expect(isTargetDay(cadence, '2026-09-09')).toBe(true);
    expect(isTargetDay(cadence, '2026-09-11')).toBe(true);
  });

  it('an interval counts from its anchor and never before it', () => {
    const cadence: Cadence = { kind: 'interval', every: 3, anchor: MON };
    expect(isTargetDay(cadence, MON)).toBe(true);
    expect(isTargetDay(cadence, '2026-09-08')).toBe(false);
    expect(isTargetDay(cadence, '2026-09-10')).toBe(true);
    expect(isTargetDay(cadence, '2026-09-06')).toBe(false);
  });
});

describe('nextTargetDay', () => {
  it('skips the weekend for a weekday habit', () => {
    expect(nextTargetDay({ kind: 'weekdays' }, '2026-09-11')).toBe('2026-09-14');
  });

  it('returns null rather than spinning on a cadence with no days', () => {
    expect(nextTargetDay({ kind: 'days', days: [] }, MON)).toBeNull();
  });
});

describe('targetDaysBetween', () => {
  it('counts only the days the habit is owed', () => {
    expect(targetDaysBetween({ kind: 'weekdays' }, MON, SUN)).toHaveLength(5);
    expect(targetDaysBetween({ kind: 'daily' }, MON, SUN)).toHaveLength(7);
  });

  it('is empty when the range runs backwards', () => {
    expect(targetDaysBetween({ kind: 'daily' }, SUN, MON)).toEqual([]);
  });
});

describe('targetsPerWeek', () => {
  it('describes the weekly load', () => {
    expect(targetsPerWeek({ kind: 'daily' })).toBe(7);
    expect(targetsPerWeek({ kind: 'weekdays' })).toBe(5);
    expect(targetsPerWeek({ kind: 'days', days: [0, 3] })).toBe(2);
    expect(targetsPerWeek({ kind: 'interval', every: 2, anchor: MON })).toBe(3.5);
  });
});

describe('isEmptyCadence', () => {
  it('catches the habit that can never come due', () => {
    expect(isEmptyCadence({ kind: 'days', days: [] })).toBe(true);
    expect(isEmptyCadence({ kind: 'days', days: [1] })).toBe(false);
    expect(isEmptyCadence({ kind: 'daily' })).toBe(false);
  });
});

describe('cadenceLabel', () => {
  it('names days up to three and counts past that', () => {
    expect(cadenceLabel({ kind: 'days', days: [0, 2] })).toBe('mon · wed');
    expect(cadenceLabel({ kind: 'days', days: [0, 1, 2, 3] })).toBe('4 days a week');
    expect(cadenceLabel({ kind: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('every day');
    expect(cadenceLabel({ kind: 'days', days: [] })).toBe('no days picked');
    expect(cadenceLabel({ kind: 'interval', every: 2, anchor: MON })).toBe('every other day');
  });
});
