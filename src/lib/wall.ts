import { addDays, dateKey, weekdayIndex, weekKey } from '@/lib/dates';
import { cadenceOn, isTargetDayOn, type Phased } from '@/lib/phases';
import { judgesByWeek, weeklyQuota, type Cadence } from '@/lib/schedule';
import { silenceIsClean, type EntryMap } from '@/lib/streak';

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
  timeline: Phased & { cadence: Cadence; kind?: string },
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
    weeks.push({ start, cells: quotaWeek(cells, cadenceOn(timeline, start), endOn) });
  }
  return weeks;
}

function cellFor(
  entries: EntryMap,
  timeline: Phased & { cadence: Cadence; kind?: string },
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
function quotaWeek(cells: WallCell[], cadence: Cadence, endOn: string): WallCell[] {
  if (!judgesByWeek(cadence)) return cells;
  const owed = weeklyQuota(cadence);
  const running = cells.some((cell) => cell.day >= endOn);
  const filled = cells.filter((cell) => cell.state === 'held' || cell.state === 'frozen').length;
  if (!running && filled < owed) return cells;
  return cells.map((cell) => (cell.state === 'missed' ? { ...cell, state: 'rest' as const } : cell));
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
 */
export function wallRate(weeks: WallWeek[], endOn: string = dateKey()): number {
  let held = 0;
  let due = 0;
  for (const week of weeks) {
    for (const cell of week.cells) {
      if (!settled(cell, endOn)) continue;
      due += 1;
      if (cell.state === 'held') held += 1;
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
      if (cell.state === 'held') held[index] += 1;
    }
  }
  return held.map((n, i) => (due[i] === 0 ? 0 : n / due[i]));
}
