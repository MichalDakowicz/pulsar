import { isRepeat, logAction, logLink, parseLogAmount, type LogTarget } from '@/lib/logLink';

const water: LogTarget = {
  name: 'water',
  kind: 'count',
  checksPerDay: 1,
  unit: 'glasses',
  archived: false,
  today: 'held',
  amount: 2,
  headroom: 6,
  weekly: false,
  weekAmount: 0,
  owed: 8,
};

describe('logLink', () => {
  it('builds the link a tag carries', () => {
    expect(logLink('abc')).toBe('pulsar://log/abc');
    expect(logLink('abc', 2)).toBe('pulsar://log/abc?amount=2');
  });
});

describe('parseLogAmount', () => {
  it('reads a positive whole number', () => {
    expect(parseLogAmount('3')).toBe(3);
    expect(parseLogAmount(['5'])).toBe(5);
  });

  it('refuses anything else', () => {
    expect(parseLogAmount(undefined)).toBeNull();
    expect(parseLogAmount('0')).toBeNull();
    expect(parseLogAmount('-2')).toBeNull();
    expect(parseLogAmount('1.5')).toBeNull();
    expect(parseLogAmount('999999')).toBeNull();
  });
});

describe('isRepeat', () => {
  it('treats a second tap inside the gap as the same tap', () => {
    expect(isRepeat(1000, 2000)).toBe(true);
    expect(isRepeat(1000, 9000)).toBe(false);
    expect(isRepeat(undefined, 9000)).toBe(false);
  });
});

describe('logAction', () => {
  it('adds one glass and says where the day stands', () => {
    expect(logAction(water, null)).toEqual({ kind: 'add', delta: 1, say: 'water · 3 of 8 glasses.' });
  });

  it('leaves the crossing to the check-in toast', () => {
    expect(logAction({ ...water, amount: 7, headroom: 1 }, null)).toEqual({ kind: 'add', delta: 1, say: null });
  });

  it('takes the amount the link carries, up to what the habit will take', () => {
    expect(logAction(water, 10)).toEqual({ kind: 'add', delta: 6, say: null });
  });

  it('refuses a counter already at its target', () => {
    expect(logAction({ ...water, amount: 8, headroom: 0 }, null).kind).toBe('none');
  });

  it('gives a timer what is left of its target', () => {
    const read = { ...water, name: 'read', kind: 'timer' as const, unit: '', amount: 5, headroom: 15, owed: 20, today: 'held' };
    expect(logAction(read, null)).toEqual({ kind: 'add', delta: 15, say: null });
  });

  it('speaks in weeks on a week-scoped counter', () => {
    const gym = { ...water, name: 'pushups', unit: 'reps', weekly: true, weekAmount: 40, amount: 0, headroom: 60, owed: 100, today: 'due' };
    expect(logAction(gym, 20)).toEqual({ kind: 'add', delta: 20, say: 'pushups · 60 of 100 reps this week.' });
  });

  it('holds a check that is due, and only then', () => {
    const gym = { ...water, name: 'gym', kind: 'do' as const, today: 'due' };
    expect(logAction(gym, null)).toEqual({ kind: 'hold' });
    expect(logAction({ ...gym, today: 'held' }, null)).toEqual({ kind: 'none', say: 'gym is already held today.' });
    expect(logAction({ ...gym, today: 'frozen' }, null).kind).toBe('none');
  });

  it('ticks the next open check of a twice-a-day habit', () => {
    const meds = { ...water, name: 'meds', kind: 'do' as const, checksPerDay: 2, amount: 0b01, today: 'held' };
    expect(logAction(meds, null)).toEqual({ kind: 'tick', step: 1 });
    expect(logAction({ ...meds, amount: 0b11 }, null).kind).toBe('none');
  });

  it('refuses avoid habits, rest days and archived habits', () => {
    expect(logAction({ ...water, kind: 'avoid' }, null).kind).toBe('none');
    expect(logAction({ ...water, today: 'rest' }, null).kind).toBe('none');
    expect(logAction({ ...water, archived: true }, null).kind).toBe('none');
  });
});
