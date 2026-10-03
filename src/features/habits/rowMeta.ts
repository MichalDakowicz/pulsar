import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { targetLabel } from '@/lib/habit';

/**
 * The line under a habit's name on Today, for a card that is not counting.
 *
 * An avoid row is answering a day that has already ended, and saying so is the
 * whole point of moving it: "clean day" with no day named reads as a promise
 * about the next sixteen hours. Unless something above it has already said
 * which day this is, in which case repeating it on every card is noise.
 */
export function rowMeta(row: BoardHabit, namesDay: boolean): string {
  const { habit, streak, today, amount, asksYesterday } = row;
  const when = asksYesterday && namesDay ? 'yesterday' : null;
  // A habit checked twice a day keeps a streak per check, and the two can be
  // far apart — a missed night dose does not touch the morning's run.
  const checks =
    row.steps.length > 0 ? row.steps.map((step) => (step.name ? `${step.name} ${step.streak}d` : `${step.streak}d`)).join(' · ') : null;
  if (today === 'held' || today === 'repaired') {
    if (checks) return checks;
    return [when && `${when} held`, `${streak.current} day streak`].filter(Boolean).join(' · ');
  }
  if (today === 'frozen') return `frozen · streak held at ${streak.current}`;
  if (today === 'skipped') {
    if (when) return `${when} set aside`;
    return asksYesterday ? 'set aside' : 'not today';
  }
  if (today === 'broke') return when ? `${when} broken · back to day one` : 'broken · back to day one';

  if (row.atRisk) return `${streak.current} days on the line`;
  if (checks) return checks;

  const target = targetLabel(habit);
  const parts: string[] = [];
  if (when) parts.push(when);
  if (habit.times.length > 0 && !when) parts.push(`due ${habit.times[0]}`);
  if (target && habit.kind === 'count') parts.push(`${amount}/${habit.target} ${habit.unit}`);
  else if (target) parts.push(target);
  parts.push(streak.current > 0 ? `${streak.current} day streak` : 'day one');
  return parts.join(' · ');
}
