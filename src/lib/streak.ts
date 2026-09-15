import { addDays, weekKey } from '@/lib/dates';
import { cadenceOn, ruleOn, targetDaysOn, type Timeline } from '@/lib/phases';
import { isTargetDay, judgesByWeek, weeklyQuota, type Cadence } from '@/lib/schedule';

/**
 * The streak rules — the one piece of this app that has to be right.
 *
 * A streak is walked over *target days only* (lib/schedule): a Mon/Wed/Fri
 * habit is not broken by an empty Tuesday, because Tuesday was never owed.
 * Which days those are, and what a miss costs on them, is asked of lib/phases
 * per day rather than read once: a habit whose cadence changed on Tuesday was
 * owed different days on either side of it, and walking all of it under today's
 * rules is how a kept wall turns into a broken one overnight.
 * Everything is computed forward from the day the habit started rather than
 * backwards from today, because `decay` has to know what the run was worth
 * before the miss took three days off it, and because one forward pass gives
 * the personal best for free.
 */

/**
 * What happened on one target day. A day with no entry is a miss, once it is
 * over — `broke` is the same outcome said out loud, which is what makes it
 * scoreable before the day is. The exception is an avoid habit, where an empty
 * day is the win rather than the absence of one; see `silenceIsClean`.
 */
export type EntryState = 'held' | 'frozen' | 'repaired' | 'skipped' | 'broke';

/** `YYYY-MM-DD` → what happened. Only target days are ever consulted. */
export type EntryMap = Record<string, EntryState | undefined>;

/**
 * What a miss costs.
 * - `strict` — one miss and the count is gone.
 * - `grace`  — the first miss in any Monday-anchored week is forgiven.
 * - `decay`  — a miss takes three days off the count instead of all of them.
 */
export type StreakRule = 'strict' | 'grace' | 'decay';

export const DECAY_COST = 3;

/**
 * The day the clean-day rule took effect.
 *
 * Before it, an empty day on an avoid habit meant the user had not answered,
 * because the app was asking them to confirm each clean day. Those answers are
 * a record of what someone actually recorded, and rereading them under a rule
 * that did not exist yet turns thirty logged misses into two — a wall that
 * fills itself in behind you is worse than a wall that was always wrong.
 *
 * So the rule is dated rather than retroactive, the same way `lib/phases`
 * scopes a cadence or miss-rule change to the stretch it was lived under. It
 * is a constant rather than a column because it is one date for everyone: the
 * day the behaviour shipped, not a per-habit choice.
 */
export const CLEAN_DAY_FROM = '2026-09-14';

/**
 * Whether an empty day that has ended counts as a day kept.
 *
 * From `CLEAN_DAY_FROM` on an `avoid` habit it does, and that is the whole
 * shape of the thing: the win is that nothing happened, so there is nothing to
 * report. The only event an avoid habit ever has is the slip, and logging it is
 * the only answer it ever needs — asking someone to confirm each clean day
 * turns "did not smoke" into a daily chore, and makes the streak a record of
 * who opened the app.
 *
 * Every surface that paints a day reads this, so the ring, the row, the wall
 * and the count agree about what an empty square on an avoid habit means — and
 * agree about which side of the cutoff the day falls on.
 */
export function silenceIsClean(timeline: { kind?: string }, day: string): boolean {
  return timeline.kind === 'avoid' && day >= CLEAN_DAY_FROM;
}

export type StreakResult = {
  current: number;
  best: number;
  /**
   * Target days that came due and were not held — newest first, capped. On a
   * weekly quota it is the Monday of each week that finished short, because
   * that is the thing that actually missed; no single day of it was owed.
   */
  missed: string[];
  /** Target days held or repaired, over the window walked. */
  heldCount: number;
  /** Target days that came due at all (today excluded while it is still open). */
  dueCount: number;
};

function counts(state: EntryState | undefined): boolean {
  return state === 'held' || state === 'repaired';
}

/**
 * Walk `[startedOn, today]` and score it.
 *
 * `today` is deliberately never counted as a miss: the day is not over, and an
 * app that tells you at 09:00 that you have broken a 47-day streak you still
 * have fifteen hours to keep is an app you delete. A `frozen` day holds the
 * count without adding to it — the streak survives, the day stays empty on the
 * wall, which is exactly what a freeze token buys.
 *
 * `today` is the last day walked, which is the day the habit is being asked
 * about rather than the date: for an avoid habit `lib/habit`'s `judgedDay`
 * hands in yesterday, and that day has ended — which is why `silenceIsClean`
 * may score it without waiting for a midnight that has already passed.
 */
export function computeStreak(
  entries: EntryMap,
  timeline: Timeline & { cadence: Cadence; rule: StreakRule; kind?: string },
  today: string,
  missedCap = 30,
): StreakResult {
  const days = targetDaysOn(timeline, timeline.startedOn, today);
  let run = 0;
  let best = 0;
  let heldCount = 0;
  let dueCount = 0;
  const missed: string[] = [];
  let graceWeek: string | null = null;
  let graceSpent = false;
  // A quota week in progress: how much of it has been answered, and what it
  // owes. Settled when the walk leaves the week, never while it is still open.
  let quota: { week: string; filled: number; owed: number } | null = null;
  // Whether the last quota week that closed was kept. The first week has no
  // week before it, so it is treated as following a good one — a habit cannot
  // be punished for a week that never happened.
  let lastWeekMet = true;

  /**
   * Charge a week that finished short. The week, not a day of it: the whole
   * point of a quota is that no particular day was owed, so naming one as the
   * miss would be the app inventing a fact the user never agreed to.
   *
   * `grace` is read at the unit the habit is actually scored in. Taken
   * literally — "the first miss in any week is forgiven" — it would forgive
   * every short week, because a quota week can only miss once, and the rule
   * would mean nothing at all. So it forgives a short week that follows a week
   * that was kept: one bad week is absorbed, two in a row is a break, which is
   * what the rule buys on every other cadence.
   */
  const settleQuota = (rule: StreakRule) => {
    if (!quota) return;
    const missedWeek = quota.week;
    const met = quota.filled >= quota.owed;
    const forgiven = rule === 'grace' && lastWeekMet;
    quota = null;
    if (met) {
      lastWeekMet = true;
      return;
    }
    lastWeekMet = false;
    dueCount += 1;
    missed.push(missedWeek);
    if (forgiven) return;
    run = rule === 'decay' ? Math.max(0, run - DECAY_COST) : 0;
  };

  for (const day of days) {
    // An empty day on an avoid habit is a day it came through, so it is read as
    // held everywhere below rather than special-cased per branch — a quota week
    // fills its slots from it too. Asked per day, not once: the days before the
    // cutoff keep the answers they were actually given.
    const logged = entries[day];
    const state: EntryState | undefined =
      logged === undefined && silenceIsClean(timeline, day) ? 'held' : logged;
    const rule = ruleOn(timeline, day);
    const cadence = cadenceOn(timeline, day);
    const week = weekKey(day);
    if (week !== graceWeek) {
      // The week that just ended is charged under the rule it was lived under,
      // before grace resets for the new one.
      if (quota) settleQuota(ruleOn(timeline, quota.week));
      graceWeek = week;
      graceSpent = false;
    }

    if (judgesByWeek(cadence)) {
      const owed = weeklyQuota(cadence);
      if (!quota || quota.week !== week) quota = { week, filled: 0, owed };
      // A frozen day fills a slot without adding to the count: the token buys
      // the week, which is exactly what it buys on every other cadence too.
      if (counts(state)) {
        run += 1;
        heldCount += 1;
        dueCount += 1;
        quota.filled += 1;
        if (run > best) best = run;
      } else if (state === 'frozen') {
        dueCount += 1;
        quota.filled += 1;
      } else if (state === 'broke') {
        // A logged slip settles the day it is on, and a quota week has no other
        // way to fail early — the week still decides, so it costs a slot.
        dueCount += 1;
      }
      continue;
    }

    if (counts(state)) {
      run += 1;
      heldCount += 1;
      dueCount += 1;
      if (run > best) best = run;
      continue;
    }
    if (state === 'frozen') {
      dueCount += 1;
      continue;
    }
    // `skipped` is an explicit "not today" — the user said so, so it is not a
    // miss and not a hold. It leaves the run exactly where it was.
    if (state === 'skipped') continue;

    // No entry. Today is still open, so it is not yet anything. `broke` is the
    // exception, and the only state that settles the open day: the rest of them
    // are the app guessing what an empty square means, while this one is the
    // user having already said it. An avoid habit whose slip was logged at noon
    // should not read as still holding until midnight.
    if (state !== 'broke' && day === today) continue;

    dueCount += 1;
    missed.push(day);
    if (rule === 'grace' && !graceSpent) {
      graceSpent = true;
      continue;
    }
    run = rule === 'decay' ? Math.max(0, run - DECAY_COST) : 0;
  }

  // The last week walked is only charged once it is over. Today is inside it
  // whenever the habit is current, and a week with two days left to run has not
  // failed yet however little is in it.
  if (quota && quota.week !== weekKey(today)) settleQuota(ruleOn(timeline, quota.week));

  return {
    current: run,
    best,
    missed: missed.reverse().slice(0, missedCap),
    heldCount,
    dueCount,
  };
}

/** Share of due days actually held, 0–100. A habit with nothing due yet reads 0. */
export function hitRate(result: Pick<StreakResult, 'heldCount' | 'dueCount'>): number {
  if (result.dueCount === 0) return 0;
  return Math.round((result.heldCount / result.dueCount) * 100);
}

/**
 * Whether today can still take the streak down.
 *
 * Three things have to be true at once, and every one of them gates a piece of
 * UI: today has to be a target day, it has to be unresolved, and there has to
 * be a streak worth losing. A habit on day zero is not "at risk" — there is
 * nothing to save, and saying so is the crying-wolf bug that makes people mute
 * the app.
 */
export function isAtRisk(
  entries: EntryMap,
  cadence: Cadence,
  streak: number,
  today: string,
  hoursLeft: number,
  riskWindowHours = 6,
): boolean {
  if (streak < 2) return false;
  if (!isTargetDay(cadence, today)) return false;
  if (entries[today]) return false;
  // A quota habit is only on the line when the week can no longer absorb it:
  // three to go and three days left. Warning every unanswered evening of a
  // 3-a-week habit is the crying-wolf bug with extra steps.
  if (judgesByWeek(cadence) && !quotaOnTheLine(entries, cadence, today)) return false;
  return hoursLeft <= riskWindowHours;
}

/**
 * Whether a quota week still needs every day it has left, today included.
 *
 * Days are `YYYY-MM-DD` and the week is Monday-anchored, so "days left" counts
 * today and the days after it in the same week.
 */
export function quotaOnTheLine(entries: EntryMap, cadence: Cadence, today: string): boolean {
  const owed = weeklyQuota(cadence);
  if (owed === 0) return false;
  const monday = weekKey(today);
  let filled = 0;
  let left = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    if (day < today) {
      const state = entries[day];
      if (state === 'held' || state === 'repaired' || state === 'frozen') filled += 1;
    } else {
      left += 1;
    }
  }
  return owed - filled >= left && owed - filled > 0;
}

/**
 * Days that could still be filled in with a repair, newest first.
 *
 * Only a miss inside `windowDays` is offered: repairing a gap from six weeks ago
 * rewrites history nobody remembers, and an unbounded list turns the repair
 * sheet into a wall of every day you ever missed.
 */
export function repairableDays(result: StreakResult, today: string, windowDays = 7): string[] {
  return result.missed.filter((day) => {
    const span = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000);
    return span > 0 && span <= windowDays;
  });
}
