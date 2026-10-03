import { cadenceLabel, judgesByWeek, type Cadence } from '@/lib/schedule';
import { clampChecks, isMultiStep } from '@/lib/steps';
import { isWeeklyTarget } from '@/lib/weekTarget';
import type { Habit } from '@/types/habit';

/**
 * What kind of habit this is, said twice: what you log, and when it is judged.
 *
 * A row that only says "gym" and "water" leaves the reader to remember that one
 * is three days a week and the other is eight glasses every day — and the two
 * fail in completely different ways. The tags put that on the row, and the
 * week-judged ones are flagged so a habit scored by the week is never mistaken
 * for one that can be lost on a Tuesday.
 */

type Typed = Pick<Habit, 'kind' | 'target' | 'unit' | 'cadence'> &
  Partial<Pick<Habit, 'targetPeriod' | 'checksPerDay'>>;

/** The glyph a tag carries. The component layer maps it to an icon. */
export type TagGlyph = 'check' | 'steps' | 'count' | 'timer' | 'avoid';

export type TypeTag = {
  label: string;
  glyph?: TagGlyph;
  /** Judged when the week closes rather than each day — drawn outlined. */
  week: boolean;
};

/** Scored a week at a time, by a quota of days or by an amount. */
export function judgedByWeek(habit: Pick<Habit, 'cadence'> & Partial<Pick<Habit, 'kind' | 'targetPeriod'>>): boolean {
  return judgesByWeek(habit.cadence) || isWeeklyTarget(habit);
}

export function measureTag(habit: Typed): TypeTag {
  if (habit.kind === 'avoid') return { label: 'avoid', glyph: 'avoid', week: false };
  if (habit.kind === 'count') return { label: `count · ${habit.target} ${habit.unit || '…'}`, glyph: 'count', week: false };
  if (habit.kind === 'timer') return { label: `timer · ${habit.target}m`, glyph: 'timer', week: false };
  if (isMultiStep(habit)) return { label: `${clampChecks(habit.checksPerDay)}× check`, glyph: 'steps', week: false };
  return { label: 'check', glyph: 'check', week: false };
}

export function rhythmTag(habit: Typed): TypeTag {
  if (isWeeklyTarget(habit)) return { label: 'per week', week: true };
  return { label: shortCadence(habit.cadence), week: judgesByWeek(habit.cadence) };
}

export function typeTags(habit: Typed): [TypeTag, TypeTag] {
  return [measureTag(habit), rhythmTag(habit)];
}

/** The cadence as a tag — shorter than the meta line, which has room to spell it out. */
function shortCadence(cadence: Cadence): string {
  switch (cadence.kind) {
    case 'daily':
      return 'daily';
    case 'interval':
      return `every ${cadence.every}d`;
    case 'weekly':
      return `${cadence.perWeek}× a week`;
    default:
      return cadenceLabel(cadence);
  }
}

/**
 * What a miss is on this habit, in a line — the thing the stakes clause and the
 * detail screen both have to say before they say what a miss costs. Weekly
 * habits miss a week, not a day, and a counter misses by falling short, not by
 * logging nothing.
 */
export function missLine(habit: Typed): string {
  const unit = habit.kind === 'timer' ? 'min' : habit.unit || '…';
  if (habit.kind === 'avoid') return 'a day you slipped';
  if (isWeeklyTarget(habit)) return `a week that ends under ${habit.target} ${unit}`;
  if (judgesByWeek(habit.cadence)) {
    const quota = habit.cadence.kind === 'weekly' ? habit.cadence.perWeek : 1;
    return quota === 1 ? 'a week with no check-in' : `a week with fewer than ${quota} check-ins`;
  }
  if (habit.kind === 'count' || habit.kind === 'timer') return `a due day that ends under ${habit.target} ${unit}`;
  if (isMultiStep(habit)) return 'a check left open on a due day — it ends that check’s streak and the full-day one';
  return 'a due day left unchecked';
}
