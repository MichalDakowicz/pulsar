import { dateKey } from '@/lib/dates';
import { counts, type HealthLink } from '@/lib/healthLink';
import type { Habit } from '@/types/habit';

/**
 * Health Connect's records, turned into one number per day in the habit's own
 * unit.
 *
 * The records are not tidy. A band and the phone both write a workout, so the
 * same run turns up twice; a night's sleep starts on one date and ends on the
 * next; a session can carry stages saying half an hour of it was spent awake.
 * Each of those is a way to hold a day that was not kept, so each is handled
 * here, where it can be tested, rather than in the native wrapper.
 */

/** A workout as the wrapper hands it over. ISO instants. */
export type ExerciseReading = { start: string; end: string; type: number };

/** A night, or a nap. Stages are optional; most sources write none. */
export type SleepReading = {
  start: string;
  end: string;
  stages: { start: string; end: string; stage: number }[];
};

/** A daily step total from Health Connect's aggregate, keyed by its local start. */
export type StepsGroup = { startTime: string; count: number };

export type HealthReadings = {
  steps?: StepsGroup[];
  exercise?: ExerciseReading[];
  sleep?: SleepReading[];
};

type Span = { start: number; end: number };

/**
 * Minutes covered by a set of spans, overlaps counted once. This is what makes
 * the band's copy of a run and the phone's copy of the same run one run.
 */
export function unionMinutes(spans: Span[]): number {
  const sorted = spans.filter((span) => span.end > span.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let open: Span | null = null;
  for (const span of sorted) {
    if (open && span.start <= open.end) {
      open.end = Math.max(open.end, span.end);
      continue;
    }
    if (open) total += open.end - open.start;
    open = { ...span };
  }
  if (open) total += open.end - open.start;
  return total / 60_000;
}

function spanOf(start: string, end: string): Span {
  return { start: Date.parse(start), end: Date.parse(end) };
}

function pushTo(map: Map<string, Span[]>, day: string, span: Span) {
  const list = map.get(day);
  if (list) list.push(span);
  else map.set(day, [span]);
}

/**
 * Health Connect's aggregate keys each group by local midnight
 * ("2026-10-04T00:00"), and it already de-duplicates steps across sources —
 * which is why steps are aggregated natively and never summed here.
 */
export function stepsByDay(groups: StepsGroup[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of groups) {
    const day = group.startTime.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && group.count > 0) out[day] = Math.round(group.count);
  }
  return out;
}

/**
 * Minutes of counting exercise per day, a workout belonging to the day it
 * started on. A session past midnight is still the evening's session, and
 * splitting it would hand a habit two half-workouts it never did.
 */
export function exerciseByDay(sessions: ExerciseReading[], link: Pick<HealthLink, 'mode' | 'activities'>): Record<string, number> {
  const byDay = new Map<string, Span[]>();
  for (const session of sessions) {
    if (!counts(link, session.type)) continue;
    pushTo(byDay, dateKey(session.start), spanOf(session.start, session.end));
  }
  const out: Record<string, number> = {};
  for (const [day, spans] of byDay) out[day] = unionMinutes(spans);
  return out;
}

// SleepStageType: AWAKE and OUT_OF_BED are inside the session but not sleep.
const NOT_ASLEEP = new Set([1, 3]);

/**
 * Minutes asleep per day, a night belonging to the morning it ended on. That is
 * the day you would say you slept eight hours, and the only reading under
 * which "sleep 8h" can be answered at breakfast rather than at midnight.
 */
export function sleepByDay(sessions: SleepReading[]): Record<string, number> {
  const byDay = new Map<string, Span[]>();
  for (const session of sessions) {
    const day = dateKey(session.end);
    const asleep = session.stages.filter((stage) => !NOT_ASLEEP.has(stage.stage));
    if (session.stages.length === 0) pushTo(byDay, day, spanOf(session.start, session.end));
    else for (const stage of asleep) pushTo(byDay, day, spanOf(stage.start, stage.end));
  }
  const out: Record<string, number> = {};
  for (const [day, spans] of byDay) out[day] = unionMinutes(spans);
  return out;
}

/**
 * What each day is worth to this habit: steps for a step counter, one for a
 * check that had any counting session, minutes for everything else. Days worth
 * nothing are left out rather than written as nought.
 */
export function linkedAmounts(habit: Pick<Habit, 'kind'>, link: HealthLink, readings: HealthReadings): Record<string, number> {
  const raw =
    link.source === 'steps'
      ? stepsByDay(readings.steps ?? [])
      : link.source === 'exercise'
        ? exerciseByDay(readings.exercise ?? [], link)
        : sleepByDay(readings.sleep ?? []);
  const out: Record<string, number> = {};
  for (const [day, value] of Object.entries(raw)) {
    // A check is held by any session at all — a zero-length one is still a
    // workout someone logged by hand, with no clock running.
    const amount = habit.kind === 'do' && link.source === 'exercise' ? 1 : Math.round(value);
    if (amount > 0) out[day] = amount;
  }
  return out;
}
