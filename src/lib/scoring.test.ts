import { dayReachedTarget, PARTIAL_MISS_FROM, scoredEntries } from '@/lib/scoring';
import { computeStreak } from '@/lib/streak';
import { addDays } from '@/lib/dates';

const D0 = PARTIAL_MISS_FROM;
const D1 = addDays(D0, 1);
const D2 = addDays(D0, 2);
const BEFORE = addDays(D0, -1);

const water = { kind: 'count', target: 8, targetPeriod: 'day' as const, phases: [] };

describe('dayReachedTarget', () => {
  it('holds a full counter day and drops a short one', () => {
    expect(dayReachedTarget(water, D0, 8)).toBe(true);
    expect(dayReachedTarget(water, D0, 3)).toBe(false);
  });

  it('leaves days before the rule alone', () => {
    expect(dayReachedTarget(water, BEFORE, 3)).toBe(true);
  });

  it('leaves a week-scoped target to the week', () => {
    expect(dayReachedTarget({ ...water, targetPeriod: 'week' }, D0, 3)).toBe(true);
  });

  it('judges a day by the target it had then', () => {
    const raised = {
      ...water,
      target: 10,
      phases: [{ from: BEFORE, to: D0, cadence: { kind: 'daily' as const }, rule: 'strict' as const, target: 8 }],
    };
    expect(dayReachedTarget(raised, D0, 8)).toBe(true);
    expect(dayReachedTarget(raised, D1, 8)).toBe(false);
  });

  it('wants every step of a multi-step day', () => {
    const meds = { kind: 'do', checksPerDay: 2 };
    expect(dayReachedTarget(meds, BEFORE, 0b01)).toBe(false);
    expect(dayReachedTarget(meds, D0, 0b11)).toBe(true);
  });

  it('judges each day by the checks it owed then', () => {
    const madeTwice = {
      kind: 'do',
      checksPerDay: 2,
      phases: [{ from: BEFORE, to: D0, cadence: { kind: 'daily' as const }, rule: 'strict' as const, target: 1, checksPerDay: 1 }],
    };
    expect(dayReachedTarget(madeTwice, D0, 0b01)).toBe(true);
    expect(dayReachedTarget(madeTwice, D1, 0b01)).toBe(false);
    // Back to once a day: the past twice-a-day days still need both.
    const madeOnce = { kind: 'do', checksPerDay: 1, phases: [{ ...madeTwice.phases[0], checksPerDay: 2 }] };
    expect(dayReachedTarget(madeOnce, D0, 0b01)).toBe(false);
    expect(scoredEntries(madeOnce, { [D0]: 'held' }, { [D0]: 0b01 })).toEqual({});
  });

  it('never judges a plain do habit by amount', () => {
    expect(dayReachedTarget({ kind: 'do' }, D0, 1)).toBe(true);
  });
});

describe('scoredEntries', () => {
  it('turns a short counter day into a miss and keeps every other answer', () => {
    const entries = { [D0]: 'held' as const, [D1]: 'held' as const, [D2]: 'frozen' as const };
    const amounts = { [D0]: 8, [D1]: 3, [D2]: 0 };
    expect(scoredEntries(water, entries, amounts)).toEqual({ [D0]: 'held', [D2]: 'frozen' });
  });

  it('hands a habit with nothing to score back untouched', () => {
    const entries = { [D0]: 'held' as const };
    expect(scoredEntries({ kind: 'avoid' }, entries, {})).toBe(entries);
  });

  it('ends a streak on a short day and still counts today as open', () => {
    const entries = { [D0]: 'held' as const, [D1]: 'held' as const, [D2]: 'held' as const };
    const amounts = { [D0]: 8, [D1]: 2, [D2]: 4 };
    const timeline = { ...water, startedOn: D0, cadence: { kind: 'daily' as const }, rule: 'strict' as const };
    const streak = computeStreak(scoredEntries(water, entries, amounts), timeline, D2, amounts);
    // D1 fell short, so the run is gone; D2 is today and still filling, so it is not a miss yet.
    expect(streak.current).toBe(0);
    expect(streak.missed).toEqual([D1]);
  });
});
