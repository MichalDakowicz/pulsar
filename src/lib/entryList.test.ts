import { removeEntry, upsertEntry } from './entryList';
import type { HabitEntry } from '@/types/habit';

const entry = (habitId: string, day: string, state: HabitEntry['state'] = 'held'): HabitEntry => ({
  habitId,
  day,
  state,
  amount: 1,
  at: '2026-10-01T08:00:00Z',
});

describe('upsertEntry', () => {
  const list = [entry('a', '2026-10-01'), entry('b', '2026-10-01'), entry('a', '2026-09-30')];

  it('replaces the same habit and day in place', () => {
    const next = upsertEntry(list, { ...entry('b', '2026-10-01'), amount: 5 });
    expect(next).toHaveLength(3);
    expect(next[1].amount).toBe(5);
  });

  it('keeps a different day of the same habit apart', () => {
    const next = upsertEntry(list, entry('b', '2026-09-30'));
    expect(next).toHaveLength(4);
    expect(next[3]).toEqual(entry('b', '2026-09-30'));
  });

  it('appends a day that had no entry', () => {
    expect(upsertEntry([], entry('a', '2026-10-01'))).toEqual([entry('a', '2026-10-01')]);
  });

  it('does not mutate the list it was given', () => {
    upsertEntry(list, { ...entry('b', '2026-10-01'), amount: 5 });
    expect(list[1].amount).toBe(1);
  });
});

describe('removeEntry', () => {
  const list = [entry('a', '2026-10-01'), entry('b', '2026-10-01'), entry('a', '2026-09-30')];

  it('takes only that habit on that day', () => {
    const next = removeEntry(list, 'a', '2026-10-01');
    expect(next.map((e) => `${e.habitId}:${e.day}`)).toEqual(['b:2026-10-01', 'a:2026-09-30']);
  });

  it('returns the same array when the day had no entry', () => {
    expect(removeEntry(list, 'c', '2026-10-01')).toBe(list);
  });
});
