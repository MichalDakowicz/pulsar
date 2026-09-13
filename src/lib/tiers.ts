/**
 * The ladder. Four rungs, and they are the same four for every habit so that a
 * number means the same thing on the Awards screen as it does on a detail page.
 */

export const TIERS = [7, 30, 100, 365] as const;

export type Tier = (typeof TIERS)[number];

export const TIER_NAMES: Record<Tier, string> = {
  7: 'one week',
  30: 'one month',
  100: 'the hundred',
  365: 'the year',
};

/** The rung being climbed. Past the year it is years, so the ring always has a target. */
export function nextTier(streak: number): number {
  return TIERS.find((tier) => tier > streak) ?? (Math.floor(streak / 365) + 1) * 365;
}

/** The rung already cleared, or 0 below the first. */
export function currentTier(streak: number): number {
  let cleared = 0;
  for (const tier of TIERS) if (streak >= tier) cleared = tier;
  return cleared;
}

/** How far up the current rung, 0–1 — what the detail ring fills to. */
export function tierProgress(streak: number): number {
  const target = nextTier(streak);
  const floor = currentTier(streak);
  if (target === floor) return 1;
  return Math.min(1, Math.max(0, (streak - floor) / (target - floor)));
}

export type TierRow = {
  n: number;
  name: string;
  unlocked: boolean;
  /** The one rung currently being climbed — exactly one row is live at a time. */
  live: boolean;
  remaining: number;
};

export function tierRows(streak: number): TierRow[] {
  const target = nextTier(streak);
  return TIERS.map((n) => ({
    n,
    name: TIER_NAMES[n],
    unlocked: streak >= n,
    live: n === target,
    remaining: Math.max(0, n - streak),
  }));
}

/** True the day a check-in lands exactly on a rung — the toast that earns a bigger noise. */
export function clearedTier(streak: number): number | null {
  return (TIERS as readonly number[]).includes(streak) ? streak : null;
}
