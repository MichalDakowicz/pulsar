import { DEFAULT_WEEKLY_PAGES } from '@/lib/siblingGoals';

/**
 * Pulsar's own preferences, in Pulsar's own table (`public.habit_settings`).
 *
 * They do not go on `user_settings`: that row is Radar's and the contract only
 * lets Pulsar write two of its columns. They do not go in MMKV either — a
 * notification level and a quiet-hours window are account facts, not device
 * ones, and someone who sets "gentle" on their phone should not be shouted at
 * by the web build.
 */

/** How hard Pulsar pushes. Three levels, and each one turns off real behaviour. */
export type NudgeLevel = 'gentle' | 'firm' | 'relentless';

export const NUDGE_LEVELS: NudgeLevel[] = ['gentle', 'firm', 'relentless'];

export const NUDGE_COPY: Record<NudgeLevel, string> = {
  gentle: 'one reminder a day, no follow-ups.',
  firm: 'a reminder, then one nudge if the day is still open.',
  relentless: 'reminders until it is done, and your pact partner hears about it.',
};

/** How a row is checked off. A hold cannot be triggered by a stray scroll; a swipe is faster. */
export type CheckinMode = 'swipe' | 'hold';

export type HabitSettings = {
  nudgeLevel: NudgeLevel;
  /** Escalate an ignored reminder. Meaningless at `gentle`, so the UI hides it there. */
  escalate: boolean;
  /** The 3-hours-to-midnight warning when a streak can still be saved. */
  riskAlerts: boolean;
  /** Let a pact partner ping you directly. Hidden until a pact exists. */
  partnerNudges: boolean;
  quietHours: boolean;
  quietStart: number;
  quietEnd: number;
  checkinMode: CheckinMode;
  /** Pages a week Lidar's streak is scored against, for the cross-app strip. */
  readingWeeklyGoal: number;
  /** Show the cross-app streak strip on Today at all. */
  showSiblingStreaks: boolean;
  onboardedAt: string | null;
};

export type HabitSettingsRow = {
  nudge_level: string | null;
  escalate: boolean | null;
  risk_alerts: boolean | null;
  partner_nudges: boolean | null;
  quiet_hours: boolean | null;
  quiet_start: number | null;
  quiet_end: number | null;
  checkin_mode: string | null;
  reading_weekly_goal: number | null;
  show_sibling_streaks: boolean | null;
  onboarded_at: string | null;
};

export const DEFAULT_HABIT_SETTINGS: HabitSettings = {
  nudgeLevel: 'firm',
  escalate: true,
  riskAlerts: true,
  partnerNudges: true,
  quietHours: true,
  quietStart: 23,
  quietEnd: 7,
  checkinMode: 'swipe',
  readingWeeklyGoal: DEFAULT_WEEKLY_PAGES,
  showSiblingStreaks: true,
  onboardedAt: null,
};

function bool(value: boolean | null | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

export function normalizeHabitSettings(row: HabitSettingsRow | null | undefined): HabitSettings {
  if (!row) return DEFAULT_HABIT_SETTINGS;
  const level = NUDGE_LEVELS.includes(row.nudge_level as NudgeLevel)
    ? (row.nudge_level as NudgeLevel)
    : DEFAULT_HABIT_SETTINGS.nudgeLevel;
  return {
    nudgeLevel: level,
    escalate: bool(row.escalate, DEFAULT_HABIT_SETTINGS.escalate),
    riskAlerts: bool(row.risk_alerts, DEFAULT_HABIT_SETTINGS.riskAlerts),
    partnerNudges: bool(row.partner_nudges, DEFAULT_HABIT_SETTINGS.partnerNudges),
    quietHours: bool(row.quiet_hours, DEFAULT_HABIT_SETTINGS.quietHours),
    quietStart: num(row.quiet_start, DEFAULT_HABIT_SETTINGS.quietStart),
    quietEnd: num(row.quiet_end, DEFAULT_HABIT_SETTINGS.quietEnd),
    checkinMode: row.checkin_mode === 'hold' ? 'hold' : 'swipe',
    readingWeeklyGoal: num(row.reading_weekly_goal, DEFAULT_HABIT_SETTINGS.readingWeeklyGoal),
    showSiblingStreaks: bool(row.show_sibling_streaks, DEFAULT_HABIT_SETTINGS.showSiblingStreaks),
    onboardedAt: row.onboarded_at ?? null,
  };
}

export function habitSettingsToRow(patch: Partial<HabitSettings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.nudgeLevel !== undefined) row.nudge_level = patch.nudgeLevel;
  if (patch.escalate !== undefined) row.escalate = patch.escalate;
  if (patch.riskAlerts !== undefined) row.risk_alerts = patch.riskAlerts;
  if (patch.partnerNudges !== undefined) row.partner_nudges = patch.partnerNudges;
  if (patch.quietHours !== undefined) row.quiet_hours = patch.quietHours;
  if (patch.quietStart !== undefined) row.quiet_start = patch.quietStart;
  if (patch.quietEnd !== undefined) row.quiet_end = patch.quietEnd;
  if (patch.checkinMode !== undefined) row.checkin_mode = patch.checkinMode;
  if (patch.readingWeeklyGoal !== undefined) row.reading_weekly_goal = patch.readingWeeklyGoal;
  if (patch.showSiblingStreaks !== undefined) row.show_sibling_streaks = patch.showSiblingStreaks;
  if (patch.onboardedAt !== undefined) row.onboarded_at = patch.onboardedAt;
  return row;
}

/**
 * Whether a reminder may fire at `hour`. Quiet hours wrap midnight, which is
 * the case every naive implementation gets wrong: 23→7 is "not between 23 and
 * 7", not "between 23 and 7" with the operands swapped.
 */
export function inQuietHours(settings: HabitSettings, hour: number): boolean {
  if (!settings.quietHours) return false;
  const { quietStart: start, quietEnd: end } = settings;
  if (start === end) return false;
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/**
 * Reminders a habit actually gets at this level. `gentle` drops every
 * follow-up, which is why the escalate toggle is hidden rather than merely
 * ignored when the level is gentle — a switch that does nothing is worse than
 * no switch.
 */
export function followUpCount(settings: HabitSettings): number {
  if (settings.nudgeLevel === 'gentle') return 0;
  if (!settings.escalate) return 0;
  return settings.nudgeLevel === 'relentless' ? 2 : 1;
}
