import {
  allStepsDone,
  checksLabel,
  clampChecks,
  hasStep,
  isMultiStep,
  lastDoneStep,
  nextOpenStep,
  stepEntries,
  stepNames,
  stepsDone,
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
    expect(checksLabel(2)).toBe('twice a day');
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
