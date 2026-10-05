import {
  allStepsAnswered,
  allStepsDone,
  isAside,
  setRestAside,
  stepsKept,
  checksWords,
  clampChecks,
  hasStep,
  isMultiStep,
  lastDoneStep,
  nextOpenStep,
  stepEntries,
  stepDefaultTimes,
  stepNames,
  stepsDone,
  stepStartsOn,
  stepTimeOptions,
  toggleStep,
} from '@/lib/steps';
import { computeStreak } from '@/lib/streak';

describe('clampChecks', () => {
  it('keeps a row inside one to three', () => {
    expect(clampChecks(undefined)).toBe(1);
    expect(clampChecks(0)).toBe(1);
    expect(clampChecks(2)).toBe(2);
    expect(clampChecks(9)).toBe(3);
    expect(clampChecks(Number.NaN)).toBe(1);
  });
});

describe('isMultiStep', () => {
  it('is only ever a do habit with more than one check', () => {
    expect(isMultiStep({ kind: 'do', checksPerDay: 2 })).toBe(true);
    expect(isMultiStep({ kind: 'do', checksPerDay: 1 })).toBe(false);
    expect(isMultiStep({ kind: 'count', checksPerDay: 2 })).toBe(false);
    expect(isMultiStep({ kind: 'do' })).toBe(false);
  });
});

describe('step bits', () => {
  it('names the steps in the order of the day', () => {
    expect(stepNames(2)).toEqual(['morning', 'night']);
    expect(stepNames(3)).toEqual(['morning', 'midday', 'night']);
    expect(checksWords(2, true)).toBe('morning & night');
    expect(checksWords(2, false)).toBe('twice a day');
  });

  it('ticks and unticks one step without touching the other', () => {
    const night = toggleStep(0, 1);
    expect(hasStep(night, 1)).toBe(true);
    expect(hasStep(night, 0)).toBe(false);
    expect(stepsDone(night, 2)).toBe(1);
    expect(toggleStep(night, 1)).toBe(0);
  });

  it('counts only the steps the habit has', () => {
    // A stray third bit from a habit that was once three steps is not a step now.
    expect(stepsDone(0b111, 2)).toBe(2);
    expect(allStepsDone(0b011, 2)).toBe(true);
    expect(allStepsDone(0b010, 2)).toBe(false);
  });

  it('swipes the first open step and swipes back the latest one', () => {
    expect(nextOpenStep(0, 2)).toBe(0);
    expect(nextOpenStep(0b01, 2)).toBe(1);
    expect(nextOpenStep(0b10, 2)).toBe(0);
    expect(nextOpenStep(0b11, 2)).toBeNull();
    expect(lastDoneStep(0b11, 2)).toBe(1);
    expect(lastDoneStep(0b01, 2)).toBe(0);
    expect(lastDoneStep(0, 2)).toBeNull();
  });
});

describe('stepEntries', () => {
  const entries = {
    '2026-10-01': 'held' as const,
    '2026-10-02': 'held' as const,
    '2026-10-03': 'frozen' as const,
  };
  const amounts = { '2026-10-01': 0b11, '2026-10-02': 0b01, '2026-10-03': 0 };

  it('holds a day for a step only when its bit is in', () => {
    expect(stepEntries(entries, amounts, 0)).toEqual(entries);
    expect(stepEntries(entries, amounts, 1)).toEqual({ '2026-10-01': 'held', '2026-10-03': 'frozen' });
  });

  it('gives each step a streak of its own', () => {
    const timeline = { startedOn: '2026-10-01', cadence: { kind: 'daily' as const }, rule: 'strict' as const };
    const morning = computeStreak(stepEntries(entries, amounts, 0), timeline, '2026-10-04');
    const night = computeStreak(stepEntries(entries, amounts, 1), timeline, '2026-10-04');
    expect(morning.current).toBe(2);
    // The missed night on the 2nd ended it; the freeze on the 3rd held what was left.
    expect(night.current).toBe(0);
  });
});

describe('plain checks', () => {
  it('are numbered rather than named', () => {
    expect(stepNames(2, false)).toEqual(['1st', '2nd']);
    expect(stepNames(3, false)).toEqual(['1st', '2nd', '3rd']);
  });

  it('take any time of day, where a named check keeps to its part of it', () => {
    expect(stepTimeOptions(2, true, 1)).toEqual(['21:00', '22:00', '22:30', '23:00']);
    expect(stepTimeOptions(2, false, 1)).toContain('12:00');
    expect(stepDefaultTimes(2, true)).toEqual(['08:00', '22:00']);
    expect(stepDefaultTimes(2, false)).toEqual(['08:00', '19:00']);
  });
});

describe('stepStartsOn', () => {
  const phase = (to: string, checksPerDay: number) => ({
    from: '2026-09-01',
    to,
    cadence: { kind: 'daily' as const },
    rule: 'strict' as const,
    target: 1,
    checksPerDay,
  });

  it('starts every check with the habit when it always had them', () => {
    expect(stepStartsOn({ startedOn: '2026-09-01', checksPerDay: 2 }, 1)).toBe('2026-09-01');
  });

  it('starts a check added later on the day it was added', () => {
    const timeline = { startedOn: '2026-09-01', checksPerDay: 2, phases: [phase('2026-09-30', 1)] };
    // The one check it always had was the morning's bit, so the morning keeps its run.
    expect(stepStartsOn(timeline, 0)).toBe('2026-09-01');
    expect(stepStartsOn(timeline, 1)).toBe('2026-10-01');
  });

  it('has no start for a check the habit no longer has', () => {
    expect(stepStartsOn({ startedOn: '2026-09-01', checksPerDay: 2 }, 2)).toBeNull();
  });
});

describe('setting a check aside', () => {
  it('sets aside the checks still open and keeps the ones in', () => {
    const next = setRestAside(0b01, 2);
    expect(hasStep(next, 0)).toBe(true);
    expect(isAside(next, 0)).toBe(false);
    expect(isAside(next, 1)).toBe(true);
    expect(stepsDone(next, 2)).toBe(1);
  });

  it('keeps a day with one check in and the rest set aside', () => {
    expect(stepsKept(setRestAside(0b01, 2), 2)).toBe(true);
    expect(stepsKept(0b01, 2)).toBe(false);
    expect(allStepsAnswered(0b01, 2)).toBe(false);
  });

  it('does not keep a day with nothing in, however much is set aside', () => {
    expect(stepsKept(setRestAside(0, 2), 2)).toBe(false);
  });

  it('ticks a set-aside check after all, and takes it off the aside list', () => {
    const next = toggleStep(setRestAside(0b01, 2), 1);
    expect(hasStep(next, 1)).toBe(true);
    expect(isAside(next, 1)).toBe(false);
    expect(allStepsDone(next, 2)).toBe(true);
  });

  it('skips a set-aside check when a swipe looks for the next one', () => {
    expect(nextOpenStep(setRestAside(0b001, 3), 3)).toBeNull();
    expect(nextOpenStep(0b001 | (1 << 4), 3)).toBe(2);
  });

  it('reads a set-aside check as set aside on its own streak', () => {
    const amount = setRestAside(0b01, 2);
    const entries = { '2026-10-01': 'held' as const };
    expect(stepEntries(entries, { '2026-10-01': amount }, 0)['2026-10-01']).toBe('held');
    expect(stepEntries(entries, { '2026-10-01': amount }, 1)['2026-10-01']).toBe('skipped');
  });
});
