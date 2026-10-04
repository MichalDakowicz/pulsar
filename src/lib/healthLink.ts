import { ACTIVITY_GROUPS, ACTIVITY_LABELS, type ActivityGroup, type ActivityMode } from '@/lib/healthActivities';
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

export type HealthSource = 'steps' | 'exercise' | 'sleep' | 'distance' | 'hydration' | 'mindfulness';

/** Whether Health Connect can be asked anything on this device. */
export type HealthAccess = 'unavailable' | 'needs-update' | 'ready';

/** What to say when it cannot. */
export const ACCESS_LINES: Record<Exclude<HealthAccess, 'ready'>, string> = {
  unavailable: 'health connect is not on this device. link it from your android phone.',
  'needs-update': 'health connect needs an update before pulsar can read it.',
};

export const HEALTH_SOURCES: HealthSource[] = ['steps', 'exercise', 'distance', 'sleep', 'hydration', 'mindfulness'];

export const SOURCE_LABELS: Record<HealthSource, { label: string; sub: string }> = {
  steps: { label: 'steps', sub: 'every step the phone or band counted' },
  exercise: { label: 'exercise', sub: 'workouts, with the kinds you choose' },
  distance: { label: 'distance', sub: 'kilometres covered, or only in the kinds of workout you choose' },
  sleep: { label: 'sleep', sub: 'time asleep, on the day you woke' },
  hydration: { label: 'water', sub: 'a glass or a cup is 250 ml. water you log here is written back to health connect' },
  mindfulness: { label: 'mindfulness', sub: 'meditation minutes. minutes you log here are written back as a session' },
};

/** Sources whose link can narrow to kinds of workout. */
export const FILTERED_SOURCES: HealthSource[] = ['exercise', 'distance'];

/** Sources that take what you log in Pulsar back into Health Connect, so other apps see it. */
export const WRITTEN_BACK: HealthSource[] = ['hydration', 'mindfulness'];

/** Water units a hydration link understands, and how many millilitres one of each is. */
export const WATER_ML: Record<string, number> = { glasses: 250, cups: 250, ml: 1, litres: 1000 };

export type HealthLink = {
  source: HealthSource;
  /** Exercise and distance only. Ignored, and stored as `all`, on the other sources. */
  mode: ActivityMode;
  activities: ActivityGroup[];
  /**
   * Sleep on a check habit only: `HH:MM` you have to be asleep by for the
   * evening to hold. Absent on every other link.
   */
  bedtime?: string;
};

/** The times a bedtime can be set to — late evening through the small hours. */
export const BEDTIMES = ['21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00'];

export const DEFAULT_BEDTIME = '23:00';

const isBedtime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/**
 * The link as it should be stored. An `only` with nothing chosen would count
 * nothing, ever, and an `except` with nothing chosen is just `all` — both are
 * folded to `all` rather than saved as a link that silently never fires.
 */
export function cleanLink(link: HealthLink): HealthLink {
  const activities = ACTIVITY_GROUPS.filter((group) => link.activities.includes(group));
  const bedtime = link.source === 'sleep' && isBedtime(link.bedtime) ? { bedtime: link.bedtime } : {};
  if (!FILTERED_SOURCES.includes(link.source) || link.mode === 'all' || activities.length === 0) {
    return { source: link.source, mode: 'all', activities: [], ...bedtime };
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
  const bedtime = isBedtime(raw.bedtime) ? raw.bedtime : undefined;
  return cleanLink({ source: raw.source as HealthSource, mode, activities, bedtime });
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
    case 'distance':
      return habit.kind === 'count' && habit.unit === 'km' ? null : 'needs a counter in km';
    case 'hydration':
      return habit.kind === 'count' && habit.unit in WATER_ML ? null : 'needs a counter in glasses, cups, ml or litres';
    case 'sleep':
      // A check is a bedtime — asleep by a time — and a measure is how long.
      return habit.kind === 'do' || habit.kind === 'timer' || countsMinutes(habit)
        ? null
        : 'needs a check, a timer or a counter in minutes';
    case 'mindfulness':
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
  const label = SOURCE_LABELS[link.source].label;
  if (link.source === 'sleep' && link.bedtime) return `sleep · asleep by ${link.bedtime}`;
  if (!FILTERED_SOURCES.includes(link.source)) return label;
  if (link.mode === 'all') return link.source === 'exercise' ? 'exercise · every kind' : label;
  const names = link.activities.map((group) => ACTIVITY_LABELS[group]).join(', ');
  return `${label} · ${link.mode === 'only' ? 'only' : 'not'} ${names}`;
}

/** "read 4m ago" — when the sync last looked, so a number that has not moved can be trusted or not. */
export function readLine(lastRead: number | null, now: number): string | null {
  if (lastRead === null) return null;
  const minutes = Math.floor((now - lastRead) / 60_000);
  if (minutes < 1) return 'read just now';
  if (minutes < 60) return `read ${minutes}m ago`;
  return `read ${Math.floor(minutes / 60)}h ago`;
}

export type LinkWhere = {
  /** On the Android phone, where Health Connect is actually read. */
  onPhone: boolean;
  /** Health Connect is not sharing the link's source with Pulsar. */
  unshared: boolean;
  readAgo: string | null;
};

/**
 * The one line a habit's link is summed up in, wherever it is listed: what
 * fills it, and the first reason it is not being filled, if there is one.
 */
export function linkLine(habit: Fittable & { healthLink?: HealthLink | null }, where: LinkWhere): string {
  const link = habit.healthLink;
  if (!link) return 'fill it from steps, workouts, sleep, water and more';
  const misfit = linkMisfit(habit, link.source);
  if (misfit) return `paused — ${link.source} ${misfit}`;
  if (!where.onPhone) return `${linkSummary(link)} · read on your phone`;
  if (where.unshared) return `${linkSummary(link)} · health connect is not sharing it`;
  return [linkSummary(link), where.readAgo].filter(Boolean).join(' · ');
}
