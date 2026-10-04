import { linkedHabits, linkedSources, planSync, readFrom, syncFrom, syncWrites, SYNC_DAYS } from '@/lib/healthSync';
import type { Habit } from '@/types/habit';

const TODAY = '2026-10-04';

const steps = {
  kind: 'count' as const,
  target: 10000,
  cadence: { kind: 'daily' as const },
  startedOn: '2026-09-01',
  targetPeriod: 'day' as const,
  allowExceed: false,
  phases: [],
} satisfies Partial<Habit>;

describe('syncFrom', () => {
  it('reaches back as far as Health Connect will answer', () => {
    expect(syncFrom({ startedOn: '2026-01-01' }, TODAY)).toBe('2026-09-05');
    expect(SYNC_DAYS).toBe(30);
  });

  it('never reaches before the habit started', () => {
    expect(syncFrom({ startedOn: '2026-10-01' }, TODAY)).toBe('2026-10-01');
  });

  it('never reaches into days judged by rules the habit has since changed', () => {
    const phases = [{ from: '2026-01-01', to: '2026-09-30', cadence: { kind: 'daily' as const }, rule: 'strict' as const, target: 1 }];
    expect(syncFrom({ startedOn: '2026-01-01', phases }, TODAY)).toBe('2026-10-01');
  });
});

describe('syncWrites', () => {
  it('lifts an empty day to what was walked', () => {
    expect(syncWrites(steps, { [TODAY]: 6200 }, {}, TODAY)).toEqual([{ day: TODAY, amount: 6200 }]);
  });

  it('lifts a lower amount and leaves a higher one alone', () => {
    const existing = { '2026-10-03': { state: 'held' as const, amount: 3000 }, [TODAY]: { state: 'held' as const, amount: 9000 } };
    expect(syncWrites(steps, { '2026-10-03': 5000, [TODAY]: 4000 }, existing, TODAY)).toEqual([{ day: '2026-10-03', amount: 5000 }]);
  });

  it('stops at the target unless the habit takes more', () => {
    expect(syncWrites(steps, { [TODAY]: 14000 }, {}, TODAY)).toEqual([{ day: TODAY, amount: 10000 }]);
    expect(syncWrites({ ...steps, allowExceed: true }, { [TODAY]: 14000 }, {}, TODAY)).toEqual([{ day: TODAY, amount: 14000 }]);
  });

  it('never overrules a day you froze, repaired, set aside or broke', () => {
    const existing = {
      '2026-10-01': { state: 'frozen' as const, amount: 0 },
      '2026-10-02': { state: 'repaired' as const, amount: 1 },
      '2026-10-03': { state: 'skipped' as const, amount: 0 },
      [TODAY]: { state: 'broke' as const, amount: 0 },
    };
    const found = { '2026-10-01': 9000, '2026-10-02': 9000, '2026-10-03': 9000, [TODAY]: 9000 };
    expect(syncWrites(steps, found, existing, TODAY)).toEqual([]);
  });

  it('writes nothing for a day with no reading', () => {
    expect(syncWrites(steps, { [TODAY]: 0 }, {}, TODAY)).toEqual([]);
  });

  it('skips a day the cadence never owed', () => {
    // 2026-10-04 is a Sunday; Mon/Wed/Fri only.
    const mwf = { ...steps, cadence: { kind: 'days' as const, days: [0, 2, 4] } };
    expect(syncWrites(mwf, { '2026-10-02': 9000, [TODAY]: 9000 }, {}, TODAY)).toEqual([{ day: '2026-10-02', amount: 9000 }]);
  });

  it('fills any day of a week-judged habit', () => {
    const gym = { ...steps, kind: 'do' as const, target: 1, cadence: { kind: 'weekly' as const, perWeek: 3 } };
    expect(syncWrites(gym, { [TODAY]: 1 }, {}, TODAY)).toEqual([{ day: TODAY, amount: 1 }]);
  });

  it('holds a check once and leaves it', () => {
    const gym = { ...steps, kind: 'do' as const, target: 1 };
    expect(syncWrites(gym, { [TODAY]: 1 }, { [TODAY]: { state: 'held', amount: 1 } }, TODAY)).toEqual([]);
  });

  it('writes nothing before the window opens', () => {
    expect(syncWrites(steps, { '2026-08-31': 9000 }, {}, TODAY)).toEqual([]);
  });
});

describe('planSync', () => {
  const link = { source: 'steps' as const, mode: 'all' as const, activities: [] };
  const walk = { ...steps, id: 'walk', unit: 'steps', archivedAt: null, healthLink: link };
  const water = { ...steps, id: 'water', unit: 'glasses', archivedAt: null, healthLink: null };
  const readings = { steps: [{ startTime: `${TODAY}T00:00`, count: 7000 }] };

  it('writes the linked habit and leaves the others', () => {
    expect(planSync([walk, water], [], readings, new Set(['steps']), TODAY)).toEqual([{ habitId: 'walk', day: TODAY, amount: 7000 }]);
  });

  it('writes nothing for a source Health Connect is not sharing', () => {
    expect(planSync([walk], [], readings, new Set(), TODAY)).toEqual([]);
  });

  it('reads each habit against its own entries', () => {
    const entries = [{ habitId: 'other', day: TODAY, state: 'held' as const, amount: 9000 }];
    expect(planSync([walk], entries, readings, new Set(['steps']), TODAY)).toHaveLength(1);
  });

  it('reads only what the linked habits need, from the earliest day any of them can take', () => {
    expect(linkedHabits([walk, water]).map((habit) => habit.id)).toEqual(['walk']);
    expect([...linkedSources([walk, water])]).toEqual(['steps']);
    expect(readFrom([walk, { ...walk, startedOn: '2026-10-02' }], TODAY)).toBe('2026-09-05');
  });
});
