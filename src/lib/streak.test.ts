import type { Cadence } from '@/lib/schedule';
import { computeStreak, hitRate, isAtRisk, repairableDays, type EntryMap } from '@/lib/streak';

const DAILY: Cadence = { kind: 'daily' };
const WEEKDAYS: Cadence = { kind: 'weekdays' };

/** Mon 2026-09-07 … Sun 2026-09-13, then Mon 2026-09-14. */
const MON = '2026-09-07';

function held(...days: string[]): EntryMap {
  return Object.fromEntries(days.map((day) => [day, 'held' as const]));
}

describe('computeStreak', () => {
  it('counts consecutive held days', () => {
    const entries = held('2026-09-07', '2026-09-08', '2026-09-09');
    const result = computeStreak(entries, DAILY, 'strict', MON, '2026-09-09');
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
  });

  it('does not treat today as a miss — the day is not over', () => {
    const entries = held('2026-09-07', '2026-09-08');
    const result = computeStreak(entries, DAILY, 'strict', MON, '2026-09-09');
    expect(result.current).toBe(2);
    expect(result.missed).toEqual([]);
  });

  it('breaks on a missed day under strict', () => {
    const entries = held('2026-09-07', '2026-09-09');
    const result = computeStreak(entries, DAILY, 'strict', MON, '2026-09-10');
    expect(result.current).toBe(1);
    expect(result.best).toBe(1);
    expect(result.missed).toEqual(['2026-09-08']);
  });

  it('does not break on a day the habit was never owed', () => {
    // Saturday and Sunday are not weekday targets, so an empty weekend is fine.
    const entries = held('2026-09-10', '2026-09-11', '2026-09-14');
    const result = computeStreak(entries, WEEKDAYS, 'strict', '2026-09-10', '2026-09-14');
    expect(result.current).toBe(3);
    expect(result.missed).toEqual([]);
  });

  it('a freeze holds the count without adding to it', () => {
    const entries: EntryMap = { ...held('2026-09-07', '2026-09-09'), '2026-09-08': 'frozen' };
    const result = computeStreak(entries, DAILY, 'strict', MON, '2026-09-09');
    expect(result.current).toBe(2);
  });

  it('a repaired day counts as held', () => {
    const entries: EntryMap = { ...held('2026-09-07', '2026-09-09'), '2026-09-08': 'repaired' };
    expect(computeStreak(entries, DAILY, 'strict', MON, '2026-09-09').current).toBe(3);
  });

  it('grace forgives the first miss of each week but not the second', () => {
    const entries = held('2026-09-07', '2026-09-09', '2026-09-11');
    const result = computeStreak(entries, DAILY, 'grace', MON, '2026-09-11');
    // 08 is forgiven; 10 is the second miss of the same week and resets.
    expect(result.current).toBe(1);
  });

  it('grace refreshes at the week boundary', () => {
    const entries = held('2026-09-07', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-15');
    const result = computeStreak(entries, DAILY, 'grace', MON, '2026-09-15');
    // 08 forgiven in week one, 14 forgiven in week two; the run never resets.
    expect(result.current).toBe(7);
  });

  it('decay takes three days off instead of everything', () => {
    const entries = held('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-07');
    const result = computeStreak(entries, DAILY, 'decay', '2026-09-01', '2026-09-07');
    // Five held, 06 missed costs three, 07 held adds one.
    expect(result.current).toBe(3);
    expect(result.best).toBe(5);
  });

  it('decay cannot drive the count below zero', () => {
    const entries = held('2026-09-07');
    const result = computeStreak(entries, DAILY, 'decay', MON, '2026-09-11');
    expect(result.current).toBe(0);
  });

  it('an explicit skip neither holds nor breaks', () => {
    const entries: EntryMap = { ...held('2026-09-07', '2026-09-09'), '2026-09-08': 'skipped' };
    const result = computeStreak(entries, DAILY, 'strict', MON, '2026-09-09');
    expect(result.current).toBe(2);
    expect(result.dueCount).toBe(2);
  });

  it('reports the best run even after it is broken', () => {
    const entries = held('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-05');
    const result = computeStreak(entries, DAILY, 'strict', '2026-09-01', '2026-09-07');
    expect(result.best).toBe(3);
    expect(result.current).toBe(0);
  });

  it('lists missed days newest first', () => {
    const entries = held('2026-09-07');
    const result = computeStreak(entries, DAILY, 'strict', MON, '2026-09-11');
    expect(result.missed).toEqual(['2026-09-10', '2026-09-09', '2026-09-08']);
  });
});

describe('hitRate', () => {
  it('is zero when nothing has come due yet', () => {
    expect(hitRate({ heldCount: 0, dueCount: 0 })).toBe(0);
  });

  it('scores held against due', () => {
    expect(hitRate({ heldCount: 3, dueCount: 4 })).toBe(75);
  });
});

describe('isAtRisk', () => {
  const today = '2026-09-09';

  it('needs a streak worth losing', () => {
    expect(isAtRisk({}, DAILY, 1, today, 2)).toBe(false);
    expect(isAtRisk({}, DAILY, 2, today, 2)).toBe(true);
  });

  it('stays quiet early in the day', () => {
    expect(isAtRisk({}, DAILY, 9, today, 11)).toBe(false);
  });

  it('stays quiet once the day is resolved', () => {
    expect(isAtRisk({ [today]: 'held' }, DAILY, 9, today, 1)).toBe(false);
    expect(isAtRisk({ [today]: 'frozen' }, DAILY, 9, today, 1)).toBe(false);
  });

  it('stays quiet on a day the habit was never owed', () => {
    expect(isAtRisk({}, WEEKDAYS, 9, '2026-09-12', 1)).toBe(false);
  });
});

describe('repairableDays', () => {
  it('offers recent misses only', () => {
    const result = {
      current: 0,
      best: 0,
      heldCount: 0,
      dueCount: 0,
      missed: ['2026-09-10', '2026-09-01'],
    };
    expect(repairableDays(result, '2026-09-11')).toEqual(['2026-09-10']);
  });
});
