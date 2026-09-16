import { addDays, dateKey, weekdayIndex, weekKey } from '@/lib/dates';
import { cadenceOn, isTargetDayOn, type Phased } from '@/lib/phases';
import { judgesByWeek, weeklyQuota, type Cadence } from '@/lib/schedule';
import { silenceIsClean, type EntryMap } from '@/lib/streak';
import { isWeeklyTarget, type Targeted } from '@/lib/weekTarget';

/**
 * The wall — the grid of days behind every habit.
 *
 * Five states, not four, and the extra one carries the weight: `rest` is a day
 * the habit never asked for. Painting it the same grey as a miss is the lie the
 * mock made, and it turns a perfectly kept weekday habit into a wall that looks
 * two-sevenths broken.
 */

export type WallState = 'held' | 'partial' | 'frozen' | 'missed' | 'rest' | 'future';

export type WallCell = {
  day: string;
  state: WallState;
  /** 0–1 for a `partial` cell, so a counter habit can show how close it got. */
  ratio: number;
};

/** One Monday-anchored column of seven. Weeks run oldest first, days Monday first. */
export type WallWeek = {
  start: string;
  cells: WallCell[];
  /**
   * Whether a week-judged habit cleared this week. `undefined` on every habit
   * scored a day at a time, where the week is not a unit that can be kept.
   *
   * It lives on the week rather than being re-derived because the rate needs it:
   * on a weekly target the days are `partial` by design — four days of five
   * reps each is a kept week of twenty — and a rate that only counts full days
   * would score a perfectly kept week at zero.
   */
  met?: boolean;
};

export type WallOptions = {
  weeks: number;
  /** Usually today. The last day painted; everything after is `future`. */
  endOn?: string;
  /** Days before the habit existed are `rest` — it was not missing, it was not there. */
  startedOn?: string;
  /** `YYYY-MM-DD` → 0–1 of that day's target, for `count` / `timer` habits. */
  progress?: Record<string, number>;
};

export function buildWall(
  entries: EntryMap,
  timeline: Phased & Targeted & { cadence: Cadence },
  options: WallOptions,
): WallWeek[] {
  const endOn = options.endOn ?? dateKey();
  const progress = options.progress ?? {};
  // Anchor on the Monday of the final week so every column is a real week and
  // the weekday rows line up down the grid.
  const lastMonday = weekKey(endOn);
  const firstMonday = addDays(lastMonday, -(options.weeks - 1) * 7);

  const weeks: WallWeek[] = [];
  for (let w = 0; w < options.weeks; w++) {
    const start = addDays(firstMonday, w * 7);
    const cells: WallCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, d);
      cells.push(cellFor(entries, timeline, day, endOn, options.startedOn, progress[day]));
    }
    weeks.push(quotaWeek(start, cells, timeline, cadenceOn(timeline, start), endOn));
  }
  return weeks;
}

function cellFor(
  entries: EntryMap,
  timeline: Phased & Targeted & { cadence: Cadence },
  day: string,
  endOn: string,
  startedOn: string | undefined,
  ratio: number | undefined,
): WallCell {
  if (day > endOn) return { day, state: 'future', ratio: 0 };
  if (startedOn && day < startedOn) return { day, state: 'rest', ratio: 0 };
  // The cadence that was in force that day, not today's: a habit switched to
  // weekdays last month must not paint every Saturday it kept as a hole.
  if (!isTargetDayOn(timeline, day)) return { day, state: 'rest', ratio: 0 };

  const state = entries[day];
  // A week-scoped target has no full days, only days that did some of the week.
  // So a logged day is painted at what it was worth rather than solid: twenty
  // of twenty on Saturday fills, five of twenty fills a quarter, and the week
  // adds up across the row exactly the way the target does.
  if (isWeeklyTarget(timeline) && (state === 'held' || state === 'repaired')) {
    const share = ratio ?? 0;
    if (share >= 1) return { day, state: 'held', ratio: 1 };
    return { day, state: 'partial', ratio: Math.max(share, 0.02) };
  }
  if (state === 'held' || state === 'repaired') return { day, state: 'held', ratio: 1 };
  if (state === 'frozen') return { day, state: 'frozen', ratio: 0 };
  if (state === 'skipped') return { day, state: 'rest', ratio: 0 };
  // A logged slip is a hole in the wall like any other miss, and on the open
  // day too — it is the one answer that does not wait for midnight.
  if (state === 'broke') return { day, state: 'missed', ratio: 0 };
  // Today has not failed yet — an unfilled today is not a hole in the wall.
  if (day === endOn) return { day, state: 'future', ratio: ratio ?? 0 };
  // An avoid habit reports slips, not clean days: an empty day it owed and came
  // through is a day held, and painting it as a hole is the lie that makes a
  // perfectly kept avoid habit look like one nobody ever answered.
  if (silenceIsClean(timeline, day)) return { day, state: 'held', ratio: 1 };
  if (ratio && ratio > 0) return { day, state: 'partial', ratio };
  return { day, state: 'missed', ratio: 0 };
}

/**
 * A quota week, repainted.
 *
 * `cellFor` calls an empty past day a miss, which is the right default and the
 * wrong answer here: "three times a week" never asked for Tuesday. So a week
 * that made its quota paints its empty days as rest — four holes out of seven
 * on a week you kept is the lie that makes people stop looking at the wall.
 *
 * A week that finished short keeps them as misses, because there the empty days
 * are what went wrong, and the week the wall ends in is left alone: it has not
 * failed while it still has days to run.
 */
function quotaWeek(
  start: string,
  cells: WallCell[],
  timeline: Targeted,
  cadence: Cadence,
  endOn: string,
): WallWeek {
  const byAmount = isWeeklyTarget(timeline);
  if (!byAmount && !judgesByWeek(cadence)) return { start, cells };
  const running = cells.some((cell) => cell.day >= endOn);
  // Two units again. A day quota counts filled slots; an amount week adds up
  // what each day was worth — every ratio is already a share of the week's
  // target, so a row that sums to one is a week that made it.
  const met = byAmount
    ? cells.some((cell) => cell.state === 'frozen') ||
      cells.reduce((sum, cell) => sum + (cell.state === 'partial' || cell.state === 'held' ? cell.ratio : 0), 0) >= 1
    : cells.filter((cell) => cell.state === 'held' || cell.state === 'frozen').length >= weeklyQuota(cadence);
  if (!running && !met) return { start, cells, met: false };
  return {
    start,
    cells: cells.map((cell) => (cell.state === 'missed' ? { ...cell, state: 'rest' as const } : cell)),
    met: running ? undefined : true,
  };
}

/** Flattened day-major order, for a seven-column grid that reads left to right. */
export function flattenByDay(weeks: WallWeek[]): WallCell[] {
  return weeks.flatMap((week) => week.cells);
}

/** Column-major order, for a week-per-column grid. */
export function flattenByWeekday(weeks: WallWeek[]): WallCell[] {
  const out: WallCell[] = [];
  for (let d = 0; d < 7; d++) for (const week of weeks) out.push(week.cells[d]);
  return out;
}

/**
 * Whether a cell's outcome is settled, and so may be scored.
 *
 * Today is not. A held habit paints `held` the moment it is checked off, while
 * one still open paints `future` and drops out of the count entirely — so
 * counting today lets it into the numerator without ever letting it into the
 * denominator. That is not a rounding error, it is a one-sided estimator: the
 * rate can only ever be flattered by it, and unchecking a habit shortens
 * nothing because the cell goes back to `future` rather than to `missed`.
 *
 * Excluding the whole day is the only version that is honest in both
 * directions. `endOn` is passed rather than read from the clock so the maths
 * stays testable.
 */
function settled(cell: WallCell, endOn: string): boolean {
  if (cell.state === 'rest' || cell.state === 'future') return false;
  return cell.day < endOn;
}

/**
 * Held share of the days that actually came due inside the wall — the "% of
 * days" under each tile. Rest, future and today are excluded from both halves,
 * so a weekday habit is scored out of settled weekdays.
 *
 * A `partial` day inside a week that was kept counts as held: on a weekly
 * target every day is partial by design, and scoring them out would put a
 * perfect twenty-a-week habit at 0%.
 */
export function wallRate(weeks: WallWeek[], endOn: string = dateKey()): number {
  let held = 0;
  let due = 0;
  for (const week of weeks) {
    for (const cell of week.cells) {
      if (!settled(cell, endOn)) continue;
      due += 1;
      if (cell.state === 'held' || (week.met && cell.state === 'partial')) held += 1;
    }
  }
  return due === 0 ? 0 : Math.round((held / due) * 100);
}

/**
 * Held rate per weekday, 0–1 — the radar chart on Stats. Answers "which day of
 * the week is where my streaks die", which is the only question a shape like
 * that is actually good at.
 */
export function weekdayShape(weeks: WallWeek[], endOn: string = dateKey()): number[] {
  const held = new Array(7).fill(0);
  const due = new Array(7).fill(0);
  for (const week of weeks) {
    for (const cell of week.cells) {
      if (!settled(cell, endOn)) continue;
      const index = weekdayIndex(cell.day);
      due[index] += 1;
      if (cell.state === 'held' || (week.met && cell.state === 'partial')) held[index] += 1;
    }
  }
  return held.map((n, i) => (due[i] === 0 ? 0 : n / due[i]));
}
