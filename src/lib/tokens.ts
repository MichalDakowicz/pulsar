/**
 * Freeze tokens.
 *
 * One token holds a streak through one missed day. You earn them and you cannot
 * buy them, which is the whole reason they work: a consequence you can pay your
 * way out of is not a consequence.
 *
 * Each habit keeps its own wallet. A token is earned on that habit's held days
 * and can only be spent on that habit, so the currency is bought with the
 * behaviour it protects. A shared pool earned on perfect days asked for every
 * habit to be held at once, and so one new or shaky habit starved the whole
 * set of tokens it had nothing to do with.
 */
import type { EntryMap } from '@/lib/streak';

/** Held days per token. Two clean weeks for one get-out. */
export const DAYS_PER_TOKEN = 14;

/**
 * Tokens one habit may hold at once. Uncapped, a year of held days buys
 * twenty-six free misses and the streak stops meaning anything; three is enough
 * to cover a flu without covering a habit of quitting.
 */
export const TOKEN_CAP = 3;

/**
 * Held days are counted cumulatively, not consecutively. Requiring a run would
 * mean a missed day both breaks the streak *and* resets progress toward the
 * thing that repairs it — punishment twice for one bad Tuesday.
 */
export function earnedTokens(heldDays: number): number {
  return Math.floor(Math.max(0, heldDays) / DAYS_PER_TOKEN);
}

export function availableTokens(heldDays: number, spent: number): number {
  return Math.max(0, Math.min(TOKEN_CAP, earnedTokens(heldDays) - Math.max(0, spent)));
}

/** Held days still owed before the next token lands. 0 when the cap is already full. */
export function daysToNextToken(heldDays: number, spent: number): number {
  if (availableTokens(heldDays, spent) >= TOKEN_CAP) return 0;
  return DAYS_PER_TOKEN - (Math.max(0, heldDays) % DAYS_PER_TOKEN);
}

/**
 * The days a habit earns on: its held target days, less the ones a token
 * repaired. A repaired day keeps the streak, but a token that pays back a
 * fourteenth of itself is a token that partly refunds its own spend.
 */
export function earningDays(heldCount: number, entries: EntryMap): number {
  let repaired = 0;
  for (const state of Object.values(entries)) if (state === 'repaired') repaired += 1;
  return Math.max(0, heldCount - repaired);
}

/**
 * Spends per habit, out of the ledger. A spend whose habit was deleted has a
 * null habit and belongs to no wallet left to charge.
 */
export function spentByHabit(rows: { habit_id: string | null }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    if (!row.habit_id) continue;
    out.set(row.habit_id, (out.get(row.habit_id) ?? 0) + 1);
  }
  return out;
}

/** "2 tokens" / "one token" / "no tokens" — used in every dialog body. */
export function tokenWord(n: number): string {
  if (n <= 0) return 'no tokens';
  return n === 1 ? 'one token' : `${n} tokens`;
}
