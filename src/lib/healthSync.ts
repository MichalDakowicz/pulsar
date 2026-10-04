import { addDays, dayRange } from '@/lib/dates';
import { judgedByWeek } from '@/lib/habitType';
import { linkedAmounts, type HealthReadings } from '@/lib/healthDays';
import { activeLink, type HealthSource } from '@/lib/healthLink';
import { currentPhaseFrom, isTargetDayOn } from '@/lib/phases';
import type { EntryState } from '@/lib/streak';
import { isWeeklyTarget, weekTarget } from '@/lib/weekTarget';
import type { Habit, HabitEntry } from '@/types/habit';

/**
 * What a Health Connect reading may do to the wall.
 *
 * One rule above the rest: **a sync only ever lifts a day.** It never lowers an
 * amount, never clears an entry, never marks a miss and never spends a token.
 * An empty reading is not evidence of an empty day — the band was on the
 * charger, the phone was in a locker — so the absence of data can say nothing,
 * and a figure that is lower than what is already there loses to it.
 *
 * It also only answers days that are still open to an ordinary answer. A day
 * you froze, repaired, set aside or broke on purpose already says what you
 * decided about it, and a reading arriving later does not overrule you.
 */

/**
 * How far back a sync reaches. Health Connect hands an app thirty days before
 * the permission was granted and no more, so a longer window would only ever
 * read nothing.
 */
export const SYNC_DAYS = 30;

/**
 * The first day a sync may write. Never before the habit started, never into a
 * stretch judged by rules it has since changed (lib/phases) — a check habit
 * that became a step counter must not have its old days filled with steps —
 * and never past the window.
 */
export function syncFrom(habit: Pick<Habit, 'startedOn'> & Partial<Pick<Habit, 'phases'>>, today: string, days = SYNC_DAYS): string {
  const floor = addDays(today, -(days - 1));
  return [habit.startedOn, currentPhaseFrom(habit), floor].reduce((latest, day) => (day > latest ? day : latest));
}

export type DayEntry = { state: EntryState; amount: number };

export type SyncWrite = { day: string; amount: number };

type Syncable = Pick<Habit, 'kind' | 'target' | 'cadence' | 'startedOn'> &
  Partial<Pick<Habit, 'targetPeriod' | 'allowExceed' | 'phases'>>;

/**
 * The amount a reading is allowed to put on a day. The target is the job
 * unless the habit takes more (`allowExceed`), the same rule the stepper keeps.
 */
function capped(habit: Syncable, value: number): number {
  if (habit.kind === 'do') return 1;
  if (habit.allowExceed) return value;
  return Math.min(value, isWeeklyTarget(habit) ? weekTarget(habit) : habit.target);
}

/**
 * The writes one reading asks for, oldest first. Empty when the wall already
 * says everything the reading does.
 */
export function syncWrites(
  habit: Syncable,
  found: Record<string, number>,
  existing: Record<string, DayEntry | undefined>,
  today: string,
): SyncWrite[] {
  const byWeek = judgedByWeek(habit);
  const out: SyncWrite[] = [];
  for (const day of dayRange(syncFrom(habit, today), today)) {
    const value = found[day];
    if (!value || value <= 0) continue;
    // A Tuesday on a Mon/Wed/Fri habit was never owed; a week-judged habit owes
    // the whole week, so every day of it can add to the count.
    if (!byWeek && !isTargetDayOn(habit, day)) continue;
    const amount = capped(habit, value);
    const entry = existing[day];
    if (entry && entry.state !== 'held') continue;
    if (entry && entry.amount >= amount) continue;
    out.push({ day, amount });
  }
  return out;
}

/* ── across every linked habit ───────────────────────────────────────────── */

type Linkable = Syncable & Pick<Habit, 'id' | 'unit' | 'archivedAt' | 'healthLink'> & Partial<Pick<Habit, 'checksPerDay'>>;

/** The habits a sync acts on: linked, unarchived, and still the shape their source fills. */
export function linkedHabits<T extends Linkable>(habits: T[]): T[] {
  return habits.filter((habit) => activeLink(habit) !== null);
}

/** Which sources the linked habits read, so a sync asks Health Connect for nothing else. */
export function linkedSources(habits: Linkable[]): Set<HealthSource> {
  return new Set(habits.flatMap((habit) => activeLink(habit)?.source ?? []));
}

/** The earliest day any linked habit may be written, so one read covers all of them. */
export function readFrom(habits: Linkable[], today: string): string {
  return habits.reduce((earliest, habit) => {
    const from = syncFrom(habit, today);
    return from < earliest ? from : earliest;
  }, today);
}

export type PlannedWrite = SyncWrite & { habitId: string };

/**
 * Every write one read implies, across all linked habits. A habit whose source
 * Health Connect is not sharing is left alone: no reading is not a reading of
 * nothing.
 */
export function planSync(
  habits: Linkable[],
  entries: Pick<HabitEntry, 'habitId' | 'day' | 'state' | 'amount'>[],
  readings: HealthReadings,
  granted: Set<HealthSource>,
  today: string,
): PlannedWrite[] {
  const out: PlannedWrite[] = [];
  for (const habit of habits) {
    const link = activeLink(habit);
    if (!link || !granted.has(link.source)) continue;
    const existing: Record<string, DayEntry> = {};
    for (const entry of entries) if (entry.habitId === habit.id) existing[entry.day] = entry;
    const found = linkedAmounts(habit, link, readings);
    for (const write of syncWrites(habit, found, existing, today)) out.push({ habitId: habit.id, ...write });
  }
  return out;
}
