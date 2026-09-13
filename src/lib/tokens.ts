/**
 * Freeze tokens.
 *
 * One token holds a streak through one missed day. You earn them and you cannot
 * buy them, which is the whole reason they work: a consequence you can pay your
 * way out of is not a consequence. Earned on *clean days* — a day where every
 * habit that was due got held — so the currency is bought with the behaviour it
 * protects rather than with time served.
 */

/** Clean days per token. Two clean weeks for one get-out. */
export const DAYS_PER_TOKEN = 14;

/**
 * Tokens you may hold at once. Uncapped, a year of clean days buys twenty-six
 * free misses and the streak stops meaning anything; three is enough to cover a
 * flu without covering a habit of quitting.
 */
export const TOKEN_CAP = 3;

/**
 * Clean days are counted cumulatively, not consecutively. Requiring a run would
 * mean a missed day both breaks the streak *and* resets progress toward the
 * thing that repairs it — punishment twice for one bad Tuesday.
 */
export function earnedTokens(cleanDays: number): number {
  return Math.floor(Math.max(0, cleanDays) / DAYS_PER_TOKEN);
}

export function availableTokens(cleanDays: number, spent: number): number {
  return Math.max(0, Math.min(TOKEN_CAP, earnedTokens(cleanDays) - Math.max(0, spent)));
}

/** Clean days still owed before the next token lands. 0 when the cap is already full. */
export function daysToNextToken(cleanDays: number, spent: number): number {
  if (availableTokens(cleanDays, spent) >= TOKEN_CAP) return 0;
  return DAYS_PER_TOKEN - (Math.max(0, cleanDays) % DAYS_PER_TOKEN);
}

/** "2 tokens" / "one token" / "no tokens" — used in every dialog body. */
export function tokenWord(n: number): string {
  if (n <= 0) return 'no tokens';
  return n === 1 ? 'one token' : `${n} tokens`;
}
