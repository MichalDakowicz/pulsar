import {
  amountsByHabit,
  cadenceFromRow,
  cadenceToRow,
  entriesByHabit,
  habitToRow,
  normalizeEntry,
  normalizeHabit,
  type HabitRow,
} from '@/lib/habitRow';

const ROW: HabitRow = {
  id: 'h1',
  user_id: 'u1',
  name: 'stretch',
  mark: 'sweep',
  kind: 'timer',
  target: 10,
  unit: '',
  cadence_kind: 'days',
  cadence_days: [4, 0, 2, 0],
  cadence_every: 2,
  challenge: '66',
  nudge_window: 'exact',
  times: ['19:00', '07:30'],
  escalate: true,
  streak_rule: 'grace',
  hard: false,
  public_shelf: false,
  pledge: 'i will not skip this',
  why: '',
  started_on: '2026-09-01',
  archived_at: null,
  sort: 2,
};

describe('cadenceFromRow', () => {
  it('sorts and de-dupes a day set written by an older client', () => {
    expect(cadenceFromRow(ROW)).toEqual({ kind: 'days', days: [0, 2, 4] });
  });

  it('drops a weekday index outside the week', () => {
    expect(cadenceFromRow({ ...ROW, cadence_days: [0, 9, -1] })).toEqual({ kind: 'days', days: [0] });
  });

  it('anchors an interval on the day the habit started', () => {
    expect(cadenceFromRow({ ...ROW, cadence_kind: 'interval', cadence_every: 3 })).toEqual({
      kind: 'interval',
      every: 3,
      anchor: '2026-09-01',
    });
  });

  it('falls back to daily for a kind it does not know', () => {
    expect(cadenceFromRow({ ...ROW, cadence_kind: 'lunar' })).toEqual({ kind: 'daily' });
  });
});

describe('cadenceToRow', () => {
  it('round-trips a day set', () => {
    const cadence = cadenceFromRow(ROW);
    expect(cadenceToRow(cadence)).toEqual({ cadence_kind: 'days', cadence_days: [0, 2, 4], cadence_every: 2 });
  });

  it('clears the day list for a cadence that has none', () => {
    expect(cadenceToRow({ kind: 'daily' }).cadence_days).toEqual([]);
  });
});

describe('normalizeHabit', () => {
  it('sorts reminder times', () => {
    expect(normalizeHabit(ROW).times).toEqual(['07:30', '19:00']);
  });

  it('drops the times on a habit with no clock', () => {
    expect(normalizeHabit({ ...ROW, nudge_window: 'anytime' }).times).toEqual([]);
  });

  it('forces strict under hard mode, whatever the row says', () => {
    expect(normalizeHabit({ ...ROW, hard: true }).rule).toBe('strict');
    expect(normalizeHabit(ROW).rule).toBe('grace');
  });

  it('falls back rather than trusting a value it does not know', () => {
    const habit = normalizeHabit({ ...ROW, kind: 'vibes', challenge: '7', nudge_window: 'dusk' });
    expect(habit.kind).toBe('do');
    expect(habit.challenge).toBe('open');
    expect(habit.window).toBe('exact');
  });

  it('never leaves a zero target, which would divide progress by nothing', () => {
    expect(normalizeHabit({ ...ROW, target: 0 }).target).toBe(1);
  });
});

describe('habitToRow', () => {
  it('emits only what was patched', () => {
    expect(habitToRow({ name: '  walk  ' })).toEqual({ name: 'walk' });
    expect(habitToRow({})).toEqual({});
  });

  it('clears reminder times when the habit loses its clock', () => {
    expect(habitToRow({ window: 'anytime', times: ['08:00'] })).toEqual({ nudge_window: 'anytime', times: [] });
  });

  it('writes strict alongside hard mode so the two cannot disagree', () => {
    expect(habitToRow({ hard: true, rule: 'grace' })).toEqual({ hard: true, streak_rule: 'strict' });
  });
});

describe('normalizeEntry', () => {
  it('falls back to held for a state it does not know', () => {
    const entry = normalizeEntry({
      habit_id: 'h1',
      day: '2026-09-11',
      state: 'vanished',
      amount: 3,
      created_at: '2026-09-11T10:00:00Z',
    });
    expect(entry.state).toBe('held');
    expect(entry.amount).toBe(3);
  });
});

describe('entriesByHabit / amountsByHabit', () => {
  const entries = [
    { habitId: 'a', day: '2026-09-10', state: 'held' as const, amount: 8, at: '' },
    { habitId: 'a', day: '2026-09-11', state: 'frozen' as const, amount: 0, at: '' },
    { habitId: 'b', day: '2026-09-11', state: 'held' as const, amount: 1, at: '' },
  ];

  it('groups into the day-keyed maps the streak walker takes', () => {
    const byHabit = entriesByHabit(entries);
    expect(byHabit.get('a')).toEqual({ '2026-09-10': 'held', '2026-09-11': 'frozen' });
    expect(byHabit.get('b')).toEqual({ '2026-09-11': 'held' });
  });

  it('keeps the amounts separately, for a partial wall cell', () => {
    expect(amountsByHabit(entries).get('a')).toEqual({ '2026-09-10': 8, '2026-09-11': 0 });
  });
});
