import { addDays, dateKey, parseDay } from '@/lib/dates';
import { followUpCount, inQuietHours, type HabitSettings } from '@/lib/habitSettings';
import { isTargetDay, type Cadence } from '@/lib/schedule';

/**
 * Which reminders should be sitting in Android's queue right now.
 *
 * Concrete dated notifications over a rolling horizon, not repeating weekly
 * triggers. A repeating trigger cannot be told "not tonight, they already did
 * it" — and a habit tracker that nudges you about the thing you just finished
 * is one people turn off within a week. So the whole queue is rebuilt whenever
 * the habits, the entries or the settings move, and a habit already resolved
 * today simply has no rows for today.
 *
 * Pure on purpose: this is day maths, and day maths is where the off-by-one
 * that silently eats a streak lives.
 */

/** How far ahead to lay down rows. A week survives a phone left in a drawer. */
export const HORIZON_DAYS = 7;

/** iOS caps a pending queue at 64 and Android is not generous either. */
export const MAX_SCHEDULED = 48;

/** The gap before an ignored reminder is asked again. */
export const FOLLOW_UP_MINUTES = 120;

/** Three hours to midnight — the last moment a warning is still actionable. */
export const RISK_HOUR = 21;

export type ReminderKind = 'due' | 'follow-up' | 'risk';

/** A habit reduced to the fields a reminder needs. The board derives it. */
export type ReminderHabit = {
  id: string;
  name: string;
  cadence: Cadence;
  startedOn: string;
  /** `HH:MM`, sorted. Empty when `hasReminders` said no — the habit never nudges. */
  times: string[];
  /** The habit's own opt-in to follow-ups; the level setting gates it again. */
  escalate: boolean;
  /** `targetLabel(habit)` — "8 glasses", "20 min", or empty for a plain hold. */
  target: string;
  /** Read back on the night a streak is about to break, if they wrote one. */
  pledge: string;
  /** Live streak. 0 means there is nothing on the line to warn about. */
  streak: number;
  /** Held, frozen, repaired or set aside today — today's rows are dropped. */
  doneToday: boolean;
  /** Due today at all. A rest day gets no warning. */
  dueToday: boolean;
};

export type PlannedReminder = {
  /** Stable across replans of the same day, so a queue can be reasoned about. */
  id: string;
  habitId: string;
  kind: ReminderKind;
  /** Epoch ms, local clock. */
  at: number;
  title: string;
  body: string;
};

type PlanInput = {
  habits: ReminderHabit[];
  settings: HabitSettings;
  now?: Date;
};

/** When two rows land on the same minute, the louder one wins. */
const RANK: Record<ReminderKind, number> = { risk: 0, due: 1, 'follow-up': 2 };

function minutesOfDay(time: string): number | null {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** `day` at `minutes` past local midnight, as epoch ms. */
function at(day: string, minutes: number): number {
  const d = parseDay(day);
  d.setMinutes(d.getMinutes() + minutes);
  return d.getTime();
}

function days(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`;
}

function dueBody(habit: ReminderHabit): string {
  return habit.target ? `${habit.target} today` : 'time to hold it';
}

function followUpBody(habit: ReminderHabit): string {
  return habit.streak > 0 ? `still open · ${days(habit.streak)} on the line` : 'still open';
}

function riskBody(habit: ReminderHabit): string {
  return habit.pledge.trim() || 'three hours left. it still counts if you do it now.';
}

function row(habit: ReminderHabit, day: string, kind: ReminderKind, slot: number, when: number): PlannedReminder {
  const title = kind === 'risk' ? `${habit.name} · ${days(habit.streak)} on the line` : habit.name;
  const body = kind === 'risk' ? riskBody(habit) : kind === 'due' ? dueBody(habit) : followUpBody(habit);
  return { id: `pulsar:${habit.id}:${day}:${kind}:${slot}`, habitId: habit.id, kind, at: when, title, body };
}

/** Every row one habit wants on one day, before the whole-plan filters. */
function habitDay(habit: ReminderHabit, day: string, settings: HabitSettings, isToday: boolean): PlannedReminder[] {
  const out: PlannedReminder[] = [];

  // The warning is today-only. Projecting it forward would mean asserting a
  // streak will still be alive on Thursday, which is not a cadence fact — and a
  // HIGH-importance notification that turns out to be wrong is expensive.
  if (isToday && settings.riskAlerts && habit.dueToday && habit.streak > 0) {
    out.push(row(habit, day, 'risk', 0, at(day, RISK_HOUR * 60)));
  }

  const slots = habit.times.map(minutesOfDay).filter((m): m is number => m !== null);
  slots.forEach((minutes, index) => out.push(row(habit, day, 'due', index, at(day, minutes))));

  const follows = habit.escalate ? followUpCount(settings) : 0;
  const last = slots.length > 0 ? Math.max(...slots) : null;
  if (last !== null) {
    for (let k = 1; k <= follows; k++) {
      // The final one is pinned to the risk hour rather than stacked two hours
      // at a time, so "a last one with three hours left" stays true whatever
      // time the habit was due.
      const minutes = k === follows && follows > 1 ? RISK_HOUR * 60 : last + FOLLOW_UP_MINUTES * k;
      // A follow-up that crosses midnight is asking about a day that is already
      // lost, on a morning the habit may not even be due.
      if (minutes >= 24 * 60 || minutes <= last) continue;
      out.push(row(habit, day, 'follow-up', k, at(day, minutes)));
    }
  }

  return out;
}

/**
 * The queue, soonest first. Everything in the past, everything inside quiet
 * hours and everything past the cap is already gone by the time it returns.
 */
export function planReminders({ habits, settings, now = new Date() }: PlanInput): PlannedReminder[] {
  const today = dateKey(now);
  const floor = now.getTime();
  const rows: PlannedReminder[] = [];

  for (const habit of habits) {
    // No clock, no nudge. The caller has already applied `hasReminders`, so an
    // empty list here means the habit opted out rather than that it was dropped.
    if (habit.times.length === 0) continue;
    for (let offset = 0; offset < HORIZON_DAYS; offset++) {
      const day = addDays(today, offset);
      if (day < habit.startedOn) continue;
      if (!isTargetDay(habit.cadence, day)) continue;
      // Today is settled: no reminder, no follow-up, no warning.
      if (offset === 0 && habit.doneToday) continue;
      rows.push(...habitDay(habit, day, settings, offset === 0));
    }
  }

  const kept = rows
    .filter((item) => item.at > floor)
    .filter((item) => !inQuietHours(settings, new Date(item.at).getHours()))
    .sort((a, b) => a.at - b.at || RANK[a.kind] - RANK[b.kind]);

  // One habit, one minute, one notification — a follow-up landing on top of the
  // warning is two buzzes saying the same thing.
  const seen = new Set<string>();
  const unique = kept.filter((item) => {
    const key = `${item.habitId}|${item.at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, MAX_SCHEDULED);
}

/**
 * A cheap identity for a plan. Rescheduling means cancelling the whole queue and
 * laying it down again, so doing it on every render of Today would leave a
 * window where a reminder due in a minute does not exist.
 */
export function planFingerprint(plan: PlannedReminder[]): string {
  return plan.map((item) => `${item.id}@${item.at}`).join(',');
}
