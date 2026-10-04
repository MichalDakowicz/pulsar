import { dayTotals, exerciseByDay, linkedAmounts, mindfulByDay, sessionKmByDay, sleepByDay, unionMinutes, wholeUnits } from '@/lib/healthDays';
import type { HealthLink } from '@/lib/healthLink';

/** A local wall-clock time as the ISO instant Health Connect hands over, whatever zone the test runs in. */
function at(day: string, hh: number, mm = 0): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

const ALL: HealthLink = { source: 'exercise', mode: 'all', activities: [] };

describe('unionMinutes', () => {
  it('counts overlapping spans once', () => {
    const t = Date.parse(at('2026-10-04', 18));
    const min = 60_000;
    expect(unionMinutes([{ start: t, end: t + 30 * min }, { start: t + 10 * min, end: t + 40 * min }])).toBe(40);
  });

  it('adds spans that do not touch', () => {
    const t = Date.parse(at('2026-10-04', 8));
    const min = 60_000;
    expect(unionMinutes([{ start: t + 60 * min, end: t + 70 * min }, { start: t, end: t + 20 * min }])).toBe(30);
  });

  it('ignores spans that end before they start', () => {
    const t = Date.parse(at('2026-10-04', 8));
    expect(unionMinutes([{ start: t, end: t - 1 }])).toBe(0);
  });
});

describe('dayTotals', () => {
  it('keys each aggregate group by its local date', () => {
    expect(dayTotals([{ startTime: '2026-10-03T00:00', value: 8123.4 }, { startTime: '2026-10-04T00:00', value: 0 }])).toEqual({
      '2026-10-03': 8123.4,
    });
  });
});

describe('wholeUnits', () => {
  it('gives a twentieth of a unit and no more', () => {
    expect(wholeUnits(4.97)).toBe(5);
    expect(wholeUnits(4.6)).toBe(4);
    expect(wholeUnits(5)).toBe(5);
  });
});

describe('sessionKmByDay', () => {
  it('counts the distance of the kinds the link takes', () => {
    const run = { start: at('2026-10-04', 7), end: at('2026-10-04', 7, 30), type: 56, km: 5.2 };
    const walk = { start: at('2026-10-04', 12), end: at('2026-10-04', 12, 40), type: 79, km: 3 };
    expect(sessionKmByDay([run, walk], { mode: 'only', activities: ['running'] })).toEqual({ '2026-10-04': 5.2 });
  });
});

describe('mindfulByDay', () => {
  it('counts overlapping sessions from two apps once', () => {
    const a = { start: at('2026-10-04', 7), end: at('2026-10-04', 7, 10) };
    const b = { start: at('2026-10-04', 7, 5), end: at('2026-10-04', 7, 15) };
    expect(mindfulByDay([a, b])).toEqual({ '2026-10-04': 15 });
  });
});

describe('exerciseByDay', () => {
  it('counts the band and the phone copy of one run as one run', () => {
    const run = { start: at('2026-10-04', 7), end: at('2026-10-04', 7, 40), type: 56 };
    const copy = { start: at('2026-10-04', 7, 2), end: at('2026-10-04', 7, 41), type: 56 };
    expect(exerciseByDay([run, copy], ALL)).toEqual({ '2026-10-04': 41 });
  });

  it('keeps a session past midnight on the evening it started', () => {
    const late = { start: at('2026-10-03', 23, 30), end: at('2026-10-04', 0, 30), type: 70 };
    expect(exerciseByDay([late], ALL)).toEqual({ '2026-10-03': 60 });
  });

  it('drops the kinds an except-link leaves out', () => {
    const walk = { start: at('2026-10-04', 12), end: at('2026-10-04', 12, 50), type: 79 };
    const lift = { start: at('2026-10-04', 18), end: at('2026-10-04', 19), type: 70 };
    expect(exerciseByDay([walk, lift], { mode: 'except', activities: ['walking'] })).toEqual({ '2026-10-04': 60 });
  });

  it('keeps only the kinds an only-link names', () => {
    const walk = { start: at('2026-10-04', 12), end: at('2026-10-04', 12, 50), type: 79 };
    expect(exerciseByDay([walk], { mode: 'only', activities: ['strength'] })).toEqual({});
  });
});

describe('sleepByDay', () => {
  it('gives a night to the morning it ended on', () => {
    const night = { start: at('2026-10-03', 23), end: at('2026-10-04', 7), stages: [] };
    expect(sleepByDay([night])).toEqual({ '2026-10-04': 480 });
  });

  it('takes the awake stages out of the night', () => {
    const night = {
      start: at('2026-10-03', 23),
      end: at('2026-10-04', 7),
      stages: [
        { start: at('2026-10-03', 23), end: at('2026-10-04', 3), stage: 4 },
        { start: at('2026-10-04', 3), end: at('2026-10-04', 3, 30), stage: 1 },
        { start: at('2026-10-04', 3, 30), end: at('2026-10-04', 7), stage: 5 },
      ],
    };
    expect(sleepByDay([night])).toEqual({ '2026-10-04': 450 });
  });

  it('adds a nap to the day it was taken', () => {
    const night = { start: at('2026-10-03', 23), end: at('2026-10-04', 6), stages: [] };
    const nap = { start: at('2026-10-04', 14), end: at('2026-10-04', 14, 30), stages: [] };
    expect(sleepByDay([night, nap])).toEqual({ '2026-10-04': 450 });
  });
});

describe('linkedAmounts', () => {
  const session = { start: at('2026-10-04', 18), end: at('2026-10-04', 18, 25, ), type: 70 };

  it('holds a check on any counting session', () => {
    expect(linkedAmounts({ kind: 'do', unit: '' }, ALL, { exercise: [session] })).toEqual({ '2026-10-04': 1 });
  });

  it('gives a timer the minutes', () => {
    expect(linkedAmounts({ kind: 'timer', unit: '' }, ALL, { exercise: [session] })).toEqual({ '2026-10-04': 25 });
  });

  it('turns kilometres and millilitres into the habit unit', () => {
    const distance: HealthLink = { source: 'distance', mode: 'all', activities: [] };
    const water: HealthLink = { source: 'hydration', mode: 'all', activities: [] };
    const daily = [{ startTime: '2026-10-04T00:00', value: 4.97 }];
    const ml = [{ startTime: '2026-10-04T00:00', value: 1200 }];
    expect(linkedAmounts({ kind: 'count', unit: 'km' }, distance, { distance: daily })).toEqual({ '2026-10-04': 5 });
    expect(linkedAmounts({ kind: 'count', unit: 'glasses' }, water, { hydration: ml })).toEqual({ '2026-10-04': 4 });
    expect(linkedAmounts({ kind: 'count', unit: 'ml' }, water, { hydration: ml })).toEqual({ '2026-10-04': 1200 });
  });

  it('reads only its own source', () => {
    const link: HealthLink = { source: 'steps', mode: 'all', activities: [] };
    expect(linkedAmounts({ kind: 'count', unit: 'steps' }, link, { exercise: [session] })).toEqual({});
  });
});
