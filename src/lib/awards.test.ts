import { earnedCount, evaluateAwards, visibleAwards, type AwardInput } from '@/lib/awards';

const NOTHING: AwardInput = {
  bestStreak: 0,
  perfectDays: 0,
  cleanRun: 0,
  rebuilt: false,
  pactRun: 0,
};

describe('evaluateAwards', () => {
  it('gives nothing away on day zero', () => {
    expect(earnedCount(evaluateAwards(NOTHING))).toBe(0);
  });

  it('unlocks every tier at or below the best streak', () => {
    const awards = evaluateAwards({ ...NOTHING, bestStreak: 47 });
    expect(awards.filter((award) => award.earned).map((award) => award.key)).toEqual(['week', 'month']);
  });

  it('reports how far off an unearned award is', () => {
    const hundred = evaluateAwards({ ...NOTHING, bestStreak: 47 }).find((a) => a.key === 'hundred');
    expect(hundred?.hint).toBe('53 days to go');
    expect(hundred?.progress).toBeCloseTo(0.47, 2);
  });

  it('earns the sweep at fourteen perfect days', () => {
    expect(evaluateAwards({ ...NOTHING, perfectDays: 14 }).find((a) => a.key === 'sweep')?.earned).toBe(true);
  });
});

describe('visibleAwards', () => {
  it('hides the pact award until a pact exists', () => {
    const awards = evaluateAwards(NOTHING);
    expect(visibleAwards(awards, { hasPacts: false }).some((a) => a.key === 'pactKeeper')).toBe(false);
    expect(visibleAwards(awards, { hasPacts: true }).some((a) => a.key === 'pactKeeper')).toBe(true);
  });

  it('keeps it once it has been earned, pact or not', () => {
    const awards = evaluateAwards({ ...NOTHING, pactRun: 40 });
    expect(visibleAwards(awards, { hasPacts: false }).some((a) => a.key === 'pactKeeper')).toBe(true);
  });
});
