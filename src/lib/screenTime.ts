import { addDays, dateKey, dayRange, parseDay } from '@/lib/dates';
import { syncFrom, type DayEntry } from '@/lib/healthSync';
import { isTargetDayOn } from '@/lib/phases';
import { isMultiStep } from '@/lib/steps';
import type { Habit } from '@/types/habit';

/**
 * Screen time as the referee of an avoid habit: "under 30 minutes of
 * instagram". The phone already counts how long each app was open, so the
 * habit does not have to be answered on trust.
 *
 * This is the one link that marks a slip rather than lifting a day, so its
 * rules are narrower than Health Connect's. It only ever writes a slip on a day
 * that has no answer yet, it writes each day at most once — a slip you take
 * back from the wall stays taken back — and a day under the limit is left
 * empty, which on an avoid habit already means clean (lib/streak).
 */

export type ScreenApp = { pkg: string; label: string };

export type ScreenLink = {
  /** Kept with their names, so the web can say which apps without asking the phone. */
  apps: ScreenApp[];
  /** Minutes a day, across all of them together. */
  limit: number;
};

export const LIMIT_STEPS = [15, 30, 45, 60, 90, 120, 180];

/** How far back usage is read. Android keeps its event log for about a week. */
export const SCREEN_DAYS = 7;

export function normalizeScreenLink(value: unknown): ScreenLink | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const apps = Array.isArray(raw.apps)
    ? raw.apps.filter(
        (app): app is ScreenApp =>
          !!app && typeof (app as ScreenApp).pkg === 'string' && typeof (app as ScreenApp).label === 'string',
      )
    : [];
  const limit = typeof raw.limit === 'number' && raw.limit > 0 ? Math.round(raw.limit) : 0;
  return apps.length > 0 && limit > 0 ? { apps, limit } : null;
}

type Fittable = Pick<Habit, 'kind'> & Partial<Pick<Habit, 'checksPerDay'>>;

/** Only an avoid habit can be slipped by an app — anything else has no slip to log. */
export function screenMisfit(habit: Fittable): string | null {
  if (habit.kind !== 'avoid' || isMultiStep(habit)) return 'only an avoid habit can be slipped by screen time';
  return null;
}

export function activeScreenLink(habit: Fittable & Pick<Habit, 'archivedAt'> & { screenLink?: ScreenLink | null }): ScreenLink | null {
  const link = habit.screenLink;
  if (!link || habit.archivedAt || screenMisfit(habit)) return null;
  return link;
}

/** A stretch an app was on screen, in ms since the epoch. */
export type UsageSession = { pkg: string; start: number; end: number };

/**
 * Minutes a day the given apps were on screen together, a session cut at each
 * midnight it crosses. Two apps open at once — split screen, a video over a
 * chat — are one stretch of screen, not two.
 */
export function usageByDay(sessions: UsageSession[], pkgs: string[]): Record<string, number> {
  const wanted = new Set(pkgs);
  const byDay = new Map<string, { start: number; end: number }[]>();
  for (const session of sessions) {
    if (!wanted.has(session.pkg) || session.end <= session.start) continue;
    for (const day of dayRange(dateKey(session.start), dateKey(session.end))) {
      const start = Math.max(session.start, parseDay(day).getTime());
      const end = Math.min(session.end, parseDay(addDays(day, 1)).getTime());
      if (end <= start) continue;
      const list = byDay.get(day) ?? [];
      list.push({ start, end });
      byDay.set(day, list);
    }
  }
  const out: Record<string, number> = {};
  for (const [day, spans] of byDay) {
    spans.sort((a, b) => a.start - b.start);
    let total = 0;
    let open: { start: number; end: number } | null = null;
    for (const span of spans) {
      if (open && span.start <= open.end) open.end = Math.max(open.end, span.end);
      else {
        if (open) total += open.end - open.start;
        open = { ...span };
      }
    }
    if (open) total += open.end - open.start;
    out[day] = total / 60_000;
  }
  return out;
}

type Slippable = Pick<Habit, 'cadence' | 'startedOn'> & Partial<Pick<Habit, 'phases'>>;

/**
 * The days a slip should be logged on, oldest first: over the limit, owed, no
 * answer yet, and never written before. `written` is every day this link has
 * already slipped — the record that a slip taken back stays taken back.
 */
export function slipDays(
  habit: Slippable,
  link: ScreenLink,
  usage: Record<string, number>,
  existing: Record<string, DayEntry | undefined>,
  today: string,
  written: string[],
): string[] {
  return dayRange(syncFrom(habit, today, SCREEN_DAYS), today).filter(
    (day) =>
      (usage[day] ?? 0) > link.limit && !existing[day] && !written.includes(day) && isTargetDayOn(habit, day),
  );
}

function appNames(link: ScreenLink): string {
  const names = link.apps.map((app) => app.label.toLowerCase());
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
}

/** "instagram, tiktok · 30 min a day" */
export function screenSummary(link: ScreenLink): string {
  return `${appNames(link)} · ${link.limit} min a day`;
}

/** What the toast says when a slip is logged, so it never lands unexplained. */
export function slipLine(name: string, link: ScreenLink, days: string[], usage: Record<string, number>, today: string): string {
  const latest = days[days.length - 1];
  const when = latest === today ? 'today' : latest === addDays(today, -1) ? 'yesterday' : 'on a day this week';
  const minutes = Math.round(usage[latest] ?? 0);
  const more = days.length > 1 ? ` (${days.length} days)` : '';
  return `${name} slipped${more} — ${minutes} min on ${appNames(link)} ${when}, over ${link.limit}.`;
}

/** "45m", "4h" — a week of an app on a chip, rounded to what reads at a glance. */
export function shortMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  return `${Math.round(minutes / 60)}h`;
}
