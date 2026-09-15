import { addDays, dayRange } from '@/lib/dates';
import { isTargetDay, type Cadence } from '@/lib/schedule';
import type { StreakRule } from '@/lib/streak';

/**
 * What a habit's rules were on a day that has already been lived.
 *
 * Changing a rule is two different requests wearing one button. "I want Sundays
 * off from now on" is a change to the habit; "I always had Sundays off and
 * picked the wrong cadence" is a correction to the record. Applying either one
 * as the other rewrites a wall the user remembers — the first turns forty kept
 * Sundays into forty holes, the second leaves a fixed mistake still painted.
 *
 * So the current rules stay on the habit and a change can seal what they
 * governed into a closed phase behind them. Phases only ever describe the past:
 * `rulesOn` falls through to the habit's own fields for anything they do not
 * cover, which is why the two can never disagree about today.
 */

/** The three fields a change can touch. Everything else about a habit applies at once. */
export type Rules = {
  cadence: Cadence;
  rule: StreakRule;
  target: number;
};

/** A closed, inclusive stretch of the past still judged by superseded rules. */
export type Phase = Rules & {
  from: string;
  to: string;
};

/** Anything carrying phases at all. Most readers need only this and one rule field. */
export type Phased = { phases?: Phase[] };

/** A whole run: the phases, the rules that outlived them, and where it started. */
export type Timeline = Phased & Partial<Rules> & { startedOn: string };

/**
 * How a change to rule, cadence or target is applied.
 * - `from-now` seals today's rules over everything before today.
 * - `whole-run` drops every phase, so the new rules judge the habit's whole run.
 */
export type ChangeScope = 'from-now' | 'whole-run';

function phaseOn(phases: Phase[] | undefined, day: string): Phase | undefined {
  if (!phases) return undefined;
  return phases.find((phase) => day >= phase.from && day <= phase.to);
}

export function cadenceOn(timeline: Phased & { cadence: Cadence }, day: string): Cadence {
  return phaseOn(timeline.phases, day)?.cadence ?? timeline.cadence;
}

export function ruleOn(timeline: Phased & { rule: StreakRule }, day: string): StreakRule {
  return phaseOn(timeline.phases, day)?.rule ?? timeline.rule;
}

export function targetOn(timeline: Phased & { target: number }, day: string): number {
  return phaseOn(timeline.phases, day)?.target ?? timeline.target;
}

/** `isTargetDay` against the cadence that was in force that day, not today's. */
export function isTargetDayOn(timeline: Phased & { cadence: Cadence }, day: string): boolean {
  return isTargetDay(cadenceOn(timeline, day), day);
}

/** Every day in `[from, to]` the habit was owed under the rules of the day itself. */
export function targetDaysOn(
  timeline: Phased & { cadence: Cadence },
  from: string,
  to: string,
): string[] {
  if (!timeline.phases || timeline.phases.length === 0) {
    // The common case by far, and the one worth not paying a lookup for.
    const out: string[] = [];
    for (const day of dayRange(from, to)) if (isTargetDay(timeline.cadence, day)) out.push(day);
    return out;
  }
  return dayRange(from, to).filter((day) => isTargetDayOn(timeline, day));
}

/** The first day the habit's current rules have governed. */
export function currentPhaseFrom(timeline: Phased & { startedOn: string }): string {
  const phases = timeline.phases ?? [];
  const last = phases[phases.length - 1];
  return last ? addDays(last.to, 1) : timeline.startedOn;
}

/**
 * The phases a habit should carry after a change, given how far back it reaches.
 *
 * `whole-run` returns nothing to keep: the new rules are the only rules the
 * habit has ever had, which is what makes it a correction rather than a change.
 * `from-now` seals the rules that are being replaced over the days they
 * actually governed — and seals nothing when the change lands on the same day
 * the last one did, because a phase a day wide that never saw a day is noise in
 * the record rather than history.
 */
export function phasesAfterChange(
  timeline: Phased & Rules & { startedOn: string },
  scope: ChangeScope,
  changedOn: string,
): Phase[] {
  if (scope === 'whole-run') return [];
  const from = currentPhaseFrom(timeline);
  const to = addDays(changedOn, -1);
  if (to < from) return timeline.phases ?? [];
  return [
    ...(timeline.phases ?? []),
    { from, to, cadence: timeline.cadence, rule: timeline.rule, target: timeline.target },
  ];
}

function sameCadence(a: Cadence, b: Cadence): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'days' && b.kind === 'days') {
    return a.days.length === b.days.length && a.days.every((day, i) => day === b.days[i]);
  }
  if (a.kind === 'interval' && b.kind === 'interval') return a.every === b.every;
  if (a.kind === 'weekly' && b.kind === 'weekly') return a.perWeek === b.perWeek;
  return true;
}

/**
 * Whether an edit touched anything the past is judged by.
 *
 * Only these three ask the question. Renaming a habit or moving its reminder
 * changes nothing about a day that has already been scored, and a prompt that
 * appears for those teaches people to dismiss the one that matters.
 */
export function rulesChanged(before: Rules, after: Rules): boolean {
  return changedRules(before, after).length > 0;
}

const CHANGE_LABELS = {
  cadence: 'when it is due',
  rule: 'what a miss costs',
  target: 'the target',
} as const;

/** Which of the three changed, in words, for the sheet that asks how far back it reaches. */
export function changedRules(before: Rules, after: Rules): string[] {
  const out: string[] = [];
  if (!sameCadence(before.cadence, after.cadence)) out.push(CHANGE_LABELS.cadence);
  if (before.rule !== after.rule) out.push(CHANGE_LABELS.rule);
  if (before.target !== after.target) out.push(CHANGE_LABELS.target);
  return out;
}

const RULES: StreakRule[] = ['strict', 'grace', 'decay'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function cadenceFrom(value: unknown, anchor: string): Cadence | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as {
    kind?: unknown;
    days?: unknown;
    every?: unknown;
    anchor?: unknown;
    perWeek?: unknown;
  };
  switch (raw.kind) {
    case 'daily':
      return { kind: 'daily' };
    case 'weekdays':
      return { kind: 'weekdays' };
    case 'days':
      return {
        kind: 'days',
        days: [...new Set(Array.isArray(raw.days) ? raw.days : [])]
          .filter((day): day is number => typeof day === 'number' && day >= 0 && day <= 6)
          .sort(),
      };
    case 'interval':
      return {
        kind: 'interval',
        every: typeof raw.every === 'number' ? Math.max(1, raw.every) : 2,
        anchor: typeof raw.anchor === 'string' && DAY.test(raw.anchor) ? raw.anchor : anchor,
      };
    case 'weekly':
      return {
        kind: 'weekly',
        perWeek: typeof raw.perWeek === 'number' ? Math.max(1, Math.min(7, Math.round(raw.perWeek))) : 3,
      };
    default:
      return null;
  }
}

/**
 * The `phases` column, made safe.
 *
 * It is jsonb, which means the only guarantee is that it parsed — a row written
 * by a client two versions ago is as likely as a good one. Anything that does
 * not describe a real closed stretch is dropped rather than repaired: a phase
 * with a broken date would silently rejudge the days around it, and no phase at
 * all just falls through to the habit's current rules, which is the honest
 * answer when the record is unreadable.
 */
export function normalizePhases(value: unknown, anchor = ''): Phase[] {
  if (!Array.isArray(value)) return [];
  const out: Phase[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const { from, to } = raw;
    if (typeof from !== 'string' || typeof to !== 'string') continue;
    if (!DAY.test(from) || !DAY.test(to) || to < from) continue;
    const cadence = cadenceFrom(raw.cadence, anchor || from);
    if (!cadence) continue;
    out.push({
      from,
      to,
      cadence,
      rule: RULES.includes(raw.rule as StreakRule) ? (raw.rule as StreakRule) : 'strict',
      target: typeof raw.target === 'number' && raw.target > 0 ? raw.target : 1,
    });
  }
  // Sorted and de-overlapped: `rulesOn` takes the first match, so an out-of-order
  // pair would hand a day to whichever phase happened to be written first.
  out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  return out.filter((phase, index) => index === 0 || phase.from > out[index - 1].to);
}
