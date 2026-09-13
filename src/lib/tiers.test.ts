import { clearedTier, currentTier, nextTier, tierProgress, tierRows } from '@/lib/tiers';

describe('nextTier', () => {
  it('names the rung being climbed', () => {
    expect(nextTier(0)).toBe(7);
    expect(nextTier(7)).toBe(30);
    expect(nextTier(200)).toBe(365);
  });

  it('keeps going in years past the year', () => {
    expect(nextTier(365)).toBe(730);
    expect(nextTier(800)).toBe(1095);
  });
});

describe('currentTier', () => {
  it('reports the rung already cleared', () => {
    expect(currentTier(6)).toBe(0);
    expect(currentTier(7)).toBe(7);
    expect(currentTier(120)).toBe(100);
  });
});

describe('tierProgress', () => {
  it('measures the gap between rungs, not from zero', () => {
    expect(tierProgress(0)).toBe(0);
    expect(tierProgress(7)).toBe(0);
    expect(tierProgress(30)).toBe(0);
    expect(tierProgress(3.5)).toBe(0.5);
  });
});

describe('tierRows', () => {
  it('marks exactly one rung live', () => {
    const rows = tierRows(12);
    expect(rows.filter((row) => row.live)).toHaveLength(1);
    expect(rows.find((row) => row.live)?.n).toBe(30);
    expect(rows.filter((row) => row.unlocked)).toHaveLength(1);
    expect(rows[1].remaining).toBe(18);
  });
});

describe('clearedTier', () => {
  it('fires only on the exact day a rung is reached', () => {
    expect(clearedTier(7)).toBe(7);
    expect(clearedTier(8)).toBeNull();
  });
});
