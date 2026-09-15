import { normalizePhases, type Phase } from '@/lib/phases';
import type { Cadence } from '@/lib/schedule';
import type { StreakRule } from '@/lib/streak';
import type { Challenge, Habit, HabitEntry, HabitKind, NudgeWindow } from '@/types/habit';

/**
 * The single read boundary for `public.habits` and `public.habit_entries`.
 *
 * Pure, so the cadence round-trip — three flat columns out, one tagged union
 * in — is testable without a network. Every query in the app normalizes through
 * here, so a new column lands in exactly one place.
 */

export type HabitRow = {
  id: string;
  user_id: string;
  name: string;
  mark: string;
  kind: string;
  target: number;
  unit: string;
  cadence_kind: string;
  cadence_days: number[] | null;
  cadence_every: number;
  /** Superseded rules, oldest first. Written and read only by Pulsar. */
  phases: unknown;
  challenge: string;
  nudge_window: string;
  times: string[] | null;
  escalate: boolean;
  streak_rule: string;
  hard: boolean;
  public_shelf: boolean;
  pledge: string | null;
  why: string | null;
  started_on: string;
  archived_at: string | null;
  sort: number;
};

export type HabitEntryRow = {
  habit_id: string;
  day: string;
  state: string;
  amount: number;
  created_at: string;
};

const KINDS: HabitKind[] = ['do', 'avoid', 'count', 'timer'];
const WINDOWS: NudgeWindow[] = ['exact', 'morning', 'evening', 'anytime'];
const RULES: StreakRule[] = ['strict', 'grace', 'decay'];
const CHALLENGES: Challenge[] = ['open', '30', '66', '100'];

function oneOf<T extends string>(allowed: T[], value: string | null | undefined, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function cadenceFromRow(row: Pick<HabitRow, 'cadence_kind' | 'cadence_days' | 'cadence_every' | 'started_on'>): Cadence {
  switch (row.cadence_kind) {
    case 'weekdays':
      return { kind: 'weekdays' };
    case 'days':
      // Sorted and de-duped on the way in: the day toggles and the label both
      // assume an ordered set, and a row written by an older client may not be.
      return { kind: 'days', days: [...new Set(row.cadence_days ?? [])].filter((d) => d >= 0 && d <= 6).sort() };
    case 'interval':
      return { kind: 'interval', every: Math.max(1, row.cadence_every), anchor: row.started_on };
    default:
      return { kind: 'daily' };
  }
}

export function cadenceToRow(cadence: Cadence): Pick<HabitRow, 'cadence_kind' | 'cadence_days' | 'cadence_every'> {
  return {
    cadence_kind: cadence.kind,
    cadence_days: cadence.kind === 'days' ? [...cadence.days].sort() : [],
    cadence_every: cadence.kind === 'interval' ? cadence.every : 2,
  };
}

export function normalizeHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    mark: row.mark || 'pulse',
    kind: oneOf(KINDS, row.kind, 'do'),
    target: row.target > 0 ? row.target : 1,
    unit: row.unit ?? '',
    cadence: cadenceFromRow(row),
    phases: normalizePhases(row.phases),
    challenge: oneOf(CHALLENGES, row.challenge, 'open'),
    window: oneOf(WINDOWS, row.nudge_window, 'exact'),
    // A habit with no clock keeps no times, whatever the row says — otherwise
    // switching a habit to `anytime` leaves orphan reminders that still fire.
    times: row.nudge_window === 'anytime' ? [] : [...(row.times ?? [])].sort(),
    escalate: row.escalate,
    // Hard mode forces strict. Normalizing it here rather than trusting the row
    // means the two can never disagree, whichever client wrote it.
    rule: row.hard ? 'strict' : oneOf(RULES, row.streak_rule, 'strict'),
    hard: row.hard,
    publicShelf: row.public_shelf,
    pledge: row.pledge ?? '',
    why: row.why ?? '',
    startedOn: row.started_on,
    archivedAt: row.archived_at,
    sort: row.sort,
  };
}

/** Everything a write needs, minus the keys the database owns. */
export function habitToRow(habit: Partial<Habit>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (habit.name !== undefined) row.name = habit.name.trim();
  if (habit.mark !== undefined) row.mark = habit.mark;
  if (habit.kind !== undefined) row.kind = habit.kind;
  if (habit.target !== undefined) row.target = habit.target;
  if (habit.unit !== undefined) row.unit = habit.unit;
  if (habit.cadence !== undefined) Object.assign(row, cadenceToRow(habit.cadence));
  if (habit.phases !== undefined) row.phases = habit.phases;
  if (habit.challenge !== undefined) row.challenge = habit.challenge;
  if (habit.window !== undefined) {
    row.nudge_window = habit.window;
    if (habit.window === 'anytime') row.times = [];
  }
  if (habit.times !== undefined && habit.window !== 'anytime') row.times = [...habit.times].sort();
  if (habit.escalate !== undefined) row.escalate = habit.escalate;
  if (habit.hard !== undefined) {
    row.hard = habit.hard;
    if (habit.hard) row.streak_rule = 'strict';
  }
  if (habit.rule !== undefined && !habit.hard) row.streak_rule = habit.rule;
  if (habit.publicShelf !== undefined) row.public_shelf = habit.publicShelf;
  if (habit.pledge !== undefined) row.pledge = habit.pledge.trim();
  if (habit.why !== undefined) row.why = habit.why.trim();
  if (habit.startedOn !== undefined) row.started_on = habit.startedOn;
  if (habit.archivedAt !== undefined) row.archived_at = habit.archivedAt;
  if (habit.sort !== undefined) row.sort = habit.sort;
  return row;
}

const ENTRY_STATES = ['held', 'frozen', 'repaired', 'skipped', 'broke'] as const;

export function normalizeEntry(row: HabitEntryRow): HabitEntry {
  return {
    habitId: row.habit_id,
    day: row.day,
    state: ENTRY_STATES.includes(row.state as never) ? (row.state as HabitEntry['state']) : 'held',
    amount: row.amount ?? 1,
    at: row.created_at,
  };
}

/** Entries grouped by habit, as the day-keyed maps the streak walker takes. */
export function entriesByHabit(entries: HabitEntry[]): Map<string, Record<string, HabitEntry['state']>> {
  const out = new Map<string, Record<string, HabitEntry['state']>>();
  for (const entry of entries) {
    const existing = out.get(entry.habitId);
    if (existing) existing[entry.day] = entry.state;
    else out.set(entry.habitId, { [entry.day]: entry.state });
  }
  return out;
}

/** Per-habit day-keyed amounts, for the partial wall cells on a counter habit. */
export function amountsByHabit(entries: HabitEntry[]): Map<string, Record<string, number>> {
  const out = new Map<string, Record<string, number>>();
  for (const entry of entries) {
    const existing = out.get(entry.habitId);
    if (existing) existing[entry.day] = entry.amount;
    else out.set(entry.habitId, { [entry.day]: entry.amount });
  }
  return out;
}
