import { availableTokens, daysToNextToken, earnedTokens, tokenWord, TOKEN_CAP } from '@/lib/tokens';

describe('earnedTokens', () => {
  it('pays out one per fourteen clean days', () => {
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

  it('is zero at the cap, where more clean days buy nothing', () => {
    expect(daysToNextToken(365, 0)).toBe(0);
  });
});

describe('tokenWord', () => {
  it('reads as English in a dialog body', () => {
    expect(tokenWord(0)).toBe('no tokens');
    expect(tokenWord(1)).toBe('one token');
    expect(tokenWord(2)).toBe('2 tokens');
  });
});
