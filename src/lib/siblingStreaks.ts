import { addDays, dateKey, weekKey } from '@/lib/dates';

/**
 * Streaks from the other three apps.
 *
 * Pulsar, Radar, Lidar and Sonar are one account on one Supabase project, so
 * "am I keeping things up" is a question that spans all four — and a habit
 * tracker that ignores the two streaks you already have is pretending to be the
 * only app you own.
 *
 * **Read-only, and one-directional.** Nothing here writes: `user_settings` is
 * Radar's table and its columns are Radar's columns (docs/shared-database.md).
 * Radar already publishes its own figure to `user_settings.current_streak` for
 * its 20:00 streak-risk notification, so Pulsar just reads it. Lidar publishes
 * nothing, so its figure is derived here from the page ledger it does write —
 * which is why the maths below is Lidar's `lib/streak`, ported rather than
 * invented. If Lidar ever starts snapshotting its own streak, this derivation
 * is the thing to delete.
 */

export type SiblingApp = 'radar' | 'lidar';

export type SiblingStreak = {
  app: SiblingApp;
  label: string;
  /** What the app measures, for the caption: "films", "pages". */
  unit: string;
  days: number;
  /** Null when the source has never been written; the slot is hidden, not zeroed. */
  present: boolean;
};

export const SIBLING_LABELS: Record<SiblingApp, { label: string; unit: string }> = {
  radar: { label: 'radar', unit: 'films' },
  lidar: { label: 'lidar', unit: 'pages' },
};

/**
 * Radar's snapshot is only rewritten when its own streak moves, so a stale one
 * describes a streak that may already be over. Its generator discards anything
 * older than 36 hours; two days is the point past which showing the number does
 * more harm than hiding it.
 */
export const RADAR_SNAPSHOT_STALE_MS = 48 * 60 * 60 * 1000;

export function radarStreak(
  currentStreak: number | null | undefined,
  updatedAt: string | null | undefined,
  now: number = Date.now(),
): SiblingStreak {
  const at = updatedAt ? Date.parse(updatedAt) : NaN;
  const fresh = !Number.isNaN(at) && now - at < RADAR_SNAPSHOT_STALE_MS && at <= now + 60_000;
  const days = typeof currentStreak === 'number' ? currentStreak : 0;
  return {
    app: 'radar',
    ...SIBLING_LABELS.radar,
    days,
    present: fresh && days > 0,
  };
}

/** One forward move of a bookmark, or one finished book. Lidar's `book_progress` row. */
export type PageEntry = { recordedAt: string; pages: number; bookId?: string | null };
/** One row of Lidar's `book_reads`. */
export type ReadEntry = { finishedAt: string; pageCount: number | null; bookId?: string | null };

function stampsByBook(progress: PageEntry[]): Map<string, number[]> {
  const byBook = new Map<string, number[]>();
  for (const entry of progress) {
    if (!entry.bookId) continue;
    const at = Date.parse(entry.recordedAt);
    if (Number.isNaN(at)) continue;
    const list = byBook.get(entry.bookId);
    if (list) list.push(at);
    else byBook.set(entry.bookId, [at]);
  }
  for (const list of byBook.values()) list.sort((a, b) => a - b);
  return byBook;
}

/**
 * Pages per local day. A finished book only contributes its page count when the
 * ledger has nothing for it since the previous finish — otherwise a tracked read
 * would be counted twice, once page by page and once as a lump on the last day.
 * This is Lidar's rule verbatim; the comment there is the authority.
 */
export function dailyPages(reads: ReadEntry[], progress: PageEntry[] = []): Record<string, number> {
  const daily: Record<string, number> = {};
  const add = (at: number, pages: number) => {
    if (!pages || pages <= 0) return;
    const key = dateKey(at);
    daily[key] = (daily[key] ?? 0) + pages;
  };

  for (const entry of progress) {
    const at = Date.parse(entry.recordedAt);
    if (!Number.isNaN(at)) add(at, entry.pages);
  }

  const stamps = stampsByBook(progress);
  const ordered = [...reads]
    .map((read) => ({ read, at: Date.parse(read.finishedAt) }))
    .filter((entry) => !Number.isNaN(entry.at))
    .sort((a, b) => a.at - b.at);
  const previous = new Map<string, number>();

  for (const { read, at } of ordered) {
    const bookId = read.bookId ?? null;
    const from = bookId ? (previous.get(bookId) ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
    if (bookId) previous.set(bookId, at);
    const covered = bookId ? (stamps.get(bookId) ?? []).some((s) => s > from && s <= at) : false;
    if (covered) continue;
    add(at, read.pageCount ?? 0);
  }

  return daily;
}

function pagesInWeek(daily: Record<string, number>, monday: string): number {
  let total = 0;
  for (let i = 0; i < 7; i++) total += daily[addDays(monday, i)] ?? 0;
  return total;
}

/**
 * Lidar's weekly-threshold streak: a day counts when it has pages and its week
 * clears the goal, and an empty day is skipped rather than fatal as long as its
 * week still qualifies. The current week qualifies on any pages at all, because
 * it is not over.
 */
export function pagesStreak(daily: Record<string, number>, weeklyGoal: number, today = dateKey()): number {
  if (Object.keys(daily).length === 0) return 0;
  const thisWeek = weekKey(today);
  let streak = 0;
  let cursor = today;

  // A reader cannot have a streak longer than the ledger, and an unbounded walk
  // over a sparse map is a hang waiting for a leap year.
  for (let guard = 0; guard < 2000; guard++) {
    const monday = weekKey(cursor);
    const inWeek = pagesInWeek(daily, monday);
    const qualifies = inWeek >= weeklyGoal || (monday === thisWeek && inWeek > 0);
    const read = daily[cursor] ?? 0;

    if (read > 0) {
      if (!qualifies) break;
      streak += 1;
    } else if (!qualifies) {
      break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function lidarStreak(
  reads: ReadEntry[],
  progress: PageEntry[],
  weeklyGoal: number,
  today = dateKey(),
): SiblingStreak {
  const days = pagesStreak(dailyPages(reads, progress), weeklyGoal, today);
  return {
    app: 'lidar',
    ...SIBLING_LABELS.lidar,
    days,
    // No books logged at all is not a zero-day streak, it is a user who does not
    // use Lidar — and an empty slot on Today is worse than no slot.
    present: reads.length > 0 || progress.length > 0,
  };
}

/** Only the siblings with something to say. An empty strip renders nothing at all. */
export function visibleSiblings(streaks: SiblingStreak[]): SiblingStreak[] {
  return streaks.filter((streak) => streak.present);
}
