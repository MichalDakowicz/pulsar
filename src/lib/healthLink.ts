import { isMultiStep } from '@/lib/steps';
import type { Habit } from '@/types/habit';

/**
 * A habit that Health Connect fills in.
 *
 * The phone already knows how far you walked, whether you trained and how long
 * you slept — the band and the apps feeding Health Connect wrote it down. A
 * habit tracker that makes you type it in again is asking for a second, worse
 * copy of a number that exists. So a habit can name a source, and the sync
 * (lib/healthSync) lifts its days to what the source says.
 *
 * Which habits can take which source is decided here, once, so the sheet that
 * offers a source and the sync that reads one cannot disagree about it.
 */

export type HealthSource = 'steps' | 'exercise' | 'sleep';

export const HEALTH_SOURCES: HealthSource[] = ['steps', 'exercise', 'sleep'];

export const SOURCE_LABELS: Record<HealthSource, { label: string; sub: string }> = {
  steps: { label: 'steps', sub: 'every step the phone or band counted' },
  exercise: { label: 'exercise', sub: 'workouts, with the kinds you choose' },
  sleep: { label: 'sleep', sub: 'time asleep, on the day you woke' },
};

/**
 * Exercise types as people say them. Health Connect has ninety-odd, down to
 * the left-arm dumbbell curl; nobody filters a habit by those. The groups are
 * what the chips offer and what a link stores, so a type Health Connect adds
 * later lands in `other` instead of being lost.
 */
export const ACTIVITY_GROUPS = [
  'walking',
  'running',
  'cycling',
  'strength',
  'classes',
  'yoga',
  'swimming',
  'hiking',
  'machines',
  'sports',
  'other',
] as const;

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number];

export const ACTIVITY_LABELS: Record<ActivityGroup, string> = {
  walking: 'walking',
  running: 'running',
  cycling: 'cycling',
  strength: 'strength',
  classes: 'hiit & classes',
  yoga: 'yoga & stretching',
  swimming: 'swimming',
  hiking: 'hiking',
  machines: 'cardio machines',
  sports: 'sports',
  other: 'anything else',
};

// Health Connect's ExerciseType numbers. Kept as numbers rather than imported
// constants so this file stays free of the native module.
const GROUP_TYPES: Record<Exclude<ActivityGroup, 'other'>, number[]> = {
  walking: [79],
  running: [56, 57],
  cycling: [8, 9],
  strength: [1, 3, 6, 7, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 30, 42, 43, 49, 67, 70, 77, 81],
  classes: [10, 12, 16, 26, 36, 40, 41],
  yoga: [33, 48, 71, 83],
  swimming: [73, 74],
  hiking: [37],
  machines: [25, 54, 68, 69],
  sports: [2, 4, 5, 11, 14, 27, 28, 29, 31, 32, 34, 35, 38, 39, 44, 46, 47, 50, 51, 52, 53, 55, 58, 59, 60, 61, 62, 63, 64, 65, 66, 72, 75, 76, 78, 80],
};

const TYPE_GROUP = new Map<number, ActivityGroup>(
  Object.entries(GROUP_TYPES).flatMap(([group, types]) => types.map((type) => [type, group as ActivityGroup] as const)),
);

export function activityGroup(exerciseType: number): ActivityGroup {
  return TYPE_GROUP.get(exerciseType) ?? 'other';
}

/** Every session, only the chosen kinds, or everything but them. */
export type ActivityMode = 'all' | 'only' | 'except';

export type HealthLink = {
  source: HealthSource;
  /** Exercise only. Ignored, and stored as `all`, on the other sources. */
  mode: ActivityMode;
  activities: ActivityGroup[];
};

/** Whether a session of this type counts towards the link. */
export function counts(link: Pick<HealthLink, 'mode' | 'activities'>, exerciseType: number): boolean {
  if (link.mode === 'all') return true;
  const listed = link.activities.includes(activityGroup(exerciseType));
  return link.mode === 'only' ? listed : !listed;
}

/**
 * The link as it should be stored. An `only` with nothing chosen would count
 * nothing, ever, and an `except` with nothing chosen is just `all` — both are
 * folded to `all` rather than saved as a link that silently never fires.
 */
export function cleanLink(link: HealthLink): HealthLink {
  const activities = ACTIVITY_GROUPS.filter((group) => link.activities.includes(group));
  if (link.source !== 'exercise' || link.mode === 'all' || activities.length === 0) {
    return { source: link.source, mode: 'all', activities: [] };
  }
  return { source: link.source, mode: link.mode, activities };
}

/** The column read back. Anything it cannot make sense of is no link at all. */
export function normalizeHealthLink(value: unknown): HealthLink | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!HEALTH_SOURCES.includes(raw.source as HealthSource)) return null;
  const mode = (['all', 'only', 'except'] as const).includes(raw.mode as ActivityMode) ? (raw.mode as ActivityMode) : 'all';
  const activities = Array.isArray(raw.activities)
    ? raw.activities.filter((item): item is ActivityGroup => ACTIVITY_GROUPS.includes(item as ActivityGroup))
    : [];
  return cleanLink({ source: raw.source as HealthSource, mode, activities });
}

type Fittable = Pick<Habit, 'kind' | 'unit'> & Partial<Pick<Habit, 'checksPerDay'>>;

const countsMinutes = (habit: Fittable) => habit.kind === 'count' && habit.unit === 'minutes';

/**
 * Why this habit cannot take this source, or null when it can.
 *
 * A source writes one kind of number, and a habit judges one kind of number;
 * steps poured into a counter of glasses would hold a water habit on a walk.
 * The reason is said, not enforced silently — the sheet shows it under the
 * option it greys out.
 */
export function linkMisfit(habit: Fittable, source: HealthSource): string | null {
  if (habit.kind === 'avoid') return 'an avoid habit has nothing to fill in';
  if (isMultiStep(habit)) return 'a habit checked more than once a day is checked by hand';
  switch (source) {
    case 'steps':
      return habit.kind === 'count' && habit.unit === 'steps' ? null : 'needs a counter in steps';
    case 'exercise':
      return habit.kind === 'do' || habit.kind === 'timer' || countsMinutes(habit)
        ? null
        : 'needs a check, a timer or a counter in minutes';
    case 'sleep':
      return habit.kind === 'timer' || countsMinutes(habit) ? null : 'needs a timer or a counter in minutes';
  }
}

/** The link the sync should act on: present, still fitting, on a habit that still asks. */
export function activeLink(habit: Fittable & Pick<Habit, 'archivedAt'> & { healthLink?: HealthLink | null }): HealthLink | null {
  const link = habit.healthLink;
  if (!link || habit.archivedAt) return null;
  return linkMisfit(habit, link.source) ? null : link;
}

/** "exercise · only strength, running" — the row on the habit's page. */
export function linkSummary(link: HealthLink): string {
  if (link.source !== 'exercise' || link.mode === 'all') {
    return link.source === 'exercise' ? 'exercise · every kind' : link.source;
  }
  const names = link.activities.map((group) => ACTIVITY_LABELS[group]).join(', ');
  return `exercise · ${link.mode === 'only' ? 'only' : 'not'} ${names}`;
}

/** "read 4m ago" — when the sync last looked, so a number that has not moved can be trusted or not. */
export function readLine(lastRead: number | null, now: number): string | null {
  if (lastRead === null) return null;
  const minutes = Math.floor((now - lastRead) / 60_000);
  if (minutes < 1) return 'read just now';
  if (minutes < 60) return `read ${minutes}m ago`;
  return `read ${Math.floor(minutes / 60)}h ago`;
}
