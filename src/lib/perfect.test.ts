import { hasRebuilt, isPerfectToday, perfectDays, type HabitSchedule } from '@/lib/perfect';
import type { EntryMap } from '@/lib/streak';

const DAILY: HabitSchedule = { id: 'a', cadence: { kind: 'daily' }, startedOn: '2026-09-07', archivedAt: null };
const WEEKDAYS: HabitSchedule = { id: 'b', cadence: { kind: 'weekdays' }, startedOn: '2026-09-07', archivedAt: null };

function map(entries: Record<string, EntryMap>): Map<string, EntryMap> {
  return new Map(Object.entries(entries));
}

describe('perfectDays', () => {
  it('needs every due habit held, not just one', () => {
    const entries = map({
      a: { '2026-09-07': 'held', '2026-09-08': 'held' },
      b: { '2026-09-07': 'held' },
    });
    const result = perfectDays([DAILY, WEEKDAYS], entries, '2026-09-07', '2026-09-08');
    expect(result.days).toEqual(['2026-09-07']);
  });

  it('does not count a day where nothing was due', () => {
    const entries = map({ b: { '2026-09-11': 'held' } });
    // Saturday and Sunday are not weekday targets, so they cannot be perfect.
    const result = perfectDays([WEEKDAYS], entries, '2026-09-11', '2026-09-13');
    expect(result.days).toEqual(['2026-09-11']);
  });

  it('does not count a day before the habit existed', () => {
    const late: HabitSchedule = { ...DAILY, startedOn: '2026-09-09' };
    const entries = map({ a: { '2026-09-09': 'held' } });
    expect(perfectDays([late], entries, '2026-09-07', '2026-09-09').days).toEqual(['2026-09-09']);
  });

  it('stops asking once a habit is archived', () => {
    const gone: HabitSchedule = { ...DAILY, archivedAt: '2026-09-09T10:00:00Z' };
    const entries = map({ a: { '2026-09-07': 'held', '2026-09-08': 'held' } });
    const result = perfectDays([gone], entries, '2026-09-07', '2026-09-10');
    expect(result.days).toEqual(['2026-09-07', '2026-09-08']);
  });

  it('a frozen day survives the streak but does not earn a token', () => {
    const entries = map({ a: { '2026-09-07': 'held', '2026-09-08': 'frozen', '2026-09-09': 'held' } });
    const result = perfectDays([DAILY], entries, '2026-09-07', '2026-09-09');
    expect(result.days).toEqual(['2026-09-07', '2026-09-09']);
    expect(result.cleanRun).toBe(1);
  });

  it('carries a clean run over a rest day rather than resetting on it', () => {
    const entries = map({
      b: { '2026-09-11': 'held', '2026-09-14': 'held' },
    });
    // Friday, then the weekend asks nothing, then Monday.
    const result = perfectDays([WEEKDAYS], entries, '2026-09-11', '2026-09-14');
    expect(result.cleanRun).toBe(2);
  });
});

describe('isPerfectToday', () => {
  it('is false when nothing was due', () => {
    expect(isPerfectToday([WEEKDAYS], map({}), '2026-09-12')).toBe(false);
  });

  it('is false while something is still open', () => {
    const entries = map({ a: { '2026-09-07': 'held' } });
    expect(isPerfectToday([DAILY, WEEKDAYS], entries, '2026-09-07')).toBe(false);
  });

  it('is true once everything due is held', () => {
    const entries = map({ a: { '2026-09-07': 'held' }, b: { '2026-09-07': 'repaired' } });
    expect(isPerfectToday([DAILY, WEEKDAYS], entries, '2026-09-07')).toBe(true);
  });
});

describe('hasRebuilt', () => {
  const daily = { kind: 'daily' } as const;

  function run(days: string[]): EntryMap {
    return Object.fromEntries(days.map((day) => [day, 'held' as const]));
  }

  it('is false for someone who has only ever had one streak', () => {
    const entries = run([
      '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
      '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08',
    ]);
    expect(hasRebuilt(entries, { cadence: daily }, '2026-09-01', '2026-09-08')).toBe(false);
  });

  it('is true once a broken week is rebuilt past a week', () => {
    const first = run([
      '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
      '2026-09-05', '2026-09-06', '2026-09-07',
    ]);
    const second = run([
      '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12',
      '2026-09-13', '2026-09-14', '2026-09-15',
    ]);
    expect(hasRebuilt({ ...first, ...second }, { cadence: daily }, '2026-09-01', '2026-09-15')).toBe(true);
  });
});

describe('an avoid habit and the days it never answered', () => {
  const AVOID: HabitSchedule = {
    id: 'c',
    cadence: { kind: 'daily' },
    startedOn: '2026-09-20',
    archivedAt: null,
    kind: 'avoid',
  };

  it('counts as held on the last day walked — it is not asked about until tomorrow', () => {
    const entries = map({ c: {} });
    const result = perfectDays([AVOID], entries, '2026-09-21', '2026-09-21');
    expect(result.days).toEqual(['2026-09-21']);
  });

  it('does not, once a slip is logged on it', () => {
    const entries = map({ c: { '2026-09-21': 'broke' } });
    const result = perfectDays([AVOID], entries, '2026-09-21', '2026-09-21');
    expect(result.days).toEqual([]);
  });

  it('counts an empty day that is already over — the slip is the only event', () => {
    const entries = map({ c: {} });
    const result = perfectDays([AVOID], entries, '2026-09-21', '2026-09-22');
    expect(result.days).toEqual(['2026-09-21', '2026-09-22']);
  });

  it('drops only the day the slip was logged on', () => {
    const entries = map({ c: { '2026-09-21': 'broke' } });
    const result = perfectDays([AVOID], entries, '2026-09-21', '2026-09-22');
    expect(result.days).toEqual(['2026-09-22']);
  });

  it('earns nothing from a quiet day before the rule shipped', () => {
    const older: HabitSchedule = { ...AVOID, startedOn: '2026-09-07' };
    const result = perfectDays([older], map({ c: {} }), '2026-09-07', '2026-09-13');
    expect(result.days).toEqual([]);
  });

  it('leaves today perfect while it is clean, and not once it is blown', () => {
    expect(isPerfectToday([AVOID], map({ c: {} }), '2026-09-21')).toBe(true);
    expect(isPerfectToday([AVOID], map({ c: { '2026-09-21': 'broke' } }), '2026-09-21')).toBe(false);
  });
});


describe('a weekly quota and perfect days', () => {
  const quota = {
    id: 'q1',
    cadence: { kind: 'weekly' as const, perWeek: 3 },
    startedOn: '2026-09-07',
    archivedAt: null,
  };
  const daily2 = { id: 'd1', cadence: { kind: 'daily' as const }, startedOn: '2026-09-07', archivedAt: null };

  // It owes the week, not the day. Counting it as due every day would have one
  // "three times a week" habit block every perfect day the others are out of —
  // and perfect days are what freeze tokens are bought with.
  it('does not block a day it was never owed', () => {
    const entries = new Map([
      ['d1', { '2026-09-07': 'held' as const, '2026-09-08': 'held' as const }],
      ['q1', { '2026-09-07': 'held' as const }],
    ]);
    const result = perfectDays([daily2, quota], entries, '2026-09-07', '2026-09-08');
    expect(result.days).toEqual(['2026-09-07', '2026-09-08']);
  });

  it('still has to be held on a day it was answered', () => {
    const entries = new Map([
      ['d1', { '2026-09-07': 'held' as const }],
      ['q1', { '2026-09-07': 'skipped' as const }],
    ]);
    const result = perfectDays([daily2, quota], entries, '2026-09-07', '2026-09-07');
    expect(result.days).toEqual([]);
  });
});
