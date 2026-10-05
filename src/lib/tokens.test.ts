import { availableTokens, daysToNextToken, earnedTokens, earningDays, spentByHabit, tokenWord, TOKEN_CAP } from '@/lib/tokens';

describe('earnedTokens', () => {
  it('pays out one per fourteen held days', () => {
    expect(earnedTokens(13)).toBe(0);
    expect(earnedTokens(14)).toBe(1);
    expect(earnedTokens(29)).toBe(2);
  });

  it('cannot be gamed with a negative count', () => {
    expect(earnedTokens(-5)).toBe(0);
  });
});

describe('availableTokens', () => {
  it('subtracts what has been spent', () => {
    expect(availableTokens(28, 1)).toBe(1);
  });

  it('never goes negative', () => {
    expect(availableTokens(14, 5)).toBe(0);
  });

  it('caps the hoard', () => {
    expect(availableTokens(365, 0)).toBe(TOKEN_CAP);
  });
});

describe('daysToNextToken', () => {
  it('counts down to the next payout', () => {
    expect(daysToNextToken(10, 0)).toBe(4);
    expect(daysToNextToken(14, 1)).toBe(14);
  });

  it('is zero at the cap, where more held days buy nothing', () => {
    expect(daysToNextToken(365, 0)).toBe(0);
  });
});

describe('earningDays', () => {
  it('earns on held days, not on days a token repaired', () => {
    const entries = {
      '2026-09-01': 'held' as const,
      '2026-09-02': 'repaired' as const,
      '2026-09-03': 'held' as const,
      '2026-09-04': 'frozen' as const,
    };
    expect(earningDays(3, entries)).toBe(2);
  });

  it('never goes below zero', () => {
    expect(earningDays(0, { '2026-09-02': 'repaired' })).toBe(0);
  });
});

describe('spentByHabit', () => {
  it('charges each spend to the habit it was spent on', () => {
    const spent = spentByHabit([{ habit_id: 'a' }, { habit_id: 'b' }, { habit_id: 'a' }]);
    expect(spent.get('a')).toBe(2);
    expect(spent.get('b')).toBe(1);
    expect(spent.get('c')).toBeUndefined();
  });

  it('drops a spend whose habit is gone', () => {
    expect(spentByHabit([{ habit_id: null }]).size).toBe(0);
  });
});

describe('tokenWord', () => {
  it('reads as English in a dialog body', () => {
    expect(tokenWord(0)).toBe('no tokens');
    expect(tokenWord(1)).toBe('one token');
    expect(tokenWord(2)).toBe('2 tokens');
  });
});
