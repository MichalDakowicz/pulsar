/**
 * Streaks from the other apps.
 *
 * Pulsar, Radar, Lidar and Sonar are one account on one Supabase project, so
 * "am I keeping things up" is a question that spans all four — and a habit
 * tracker that ignores the two streaks you already have is pretending to be the
 * only app you own.
 *
 * **Read-only.** Nothing here writes: `user_settings` is Radar's table
 * (docs/shared-database.md). Every figure is a snapshot its own app publishes
 * — Radar to `current_streak` for its 20:00 warning and to `movie_streak` /
 * `tv_streak` for this strip, Lidar to `lidar_streak` — and Pulsar only reads
 * them.
 *
 * Pulsar used to derive Lidar's figure from the page ledger instead, porting
 * `lib/streak` across. That could never be right: the streak is pages per week
 * against a threshold and a reset epoch that both live in Lidar's device MMKV,
 * so a streak you had reset in Lidar still showed as running here. Asking the
 * snapshot is the only honest version, and the derivation is gone.
 */

export type SiblingApp = 'radar' | 'lidar';

/**
 * Radar counts two things and keeps a streak on each. One slot on a strip of
 * two cannot show both, and picking one for the user is picking wrong for half
 * of them — so the slot has two faces and the swipe turns it over.
 */
export type RadarFace = 'films' | 'tv';

export type SiblingStreak = {
  app: SiblingApp;
  label: string;
  /** What the app measures, for the caption: "films", "episodes", "pages". */
  unit: string;
  days: number;
  /** False when the source has nothing to say; the slot is hidden, not zeroed. */
  present: boolean;
  /** Which of Radar's two this is. Absent on a sibling that counts one thing. */
  face?: RadarFace;
};

export const SIBLING_LABELS: Record<SiblingApp, { label: string; unit: string }> = {
  radar: { label: 'radar', unit: 'films' },
  lidar: { label: 'lidar', unit: 'pages' },
};

export const RADAR_FACE_UNITS: Record<RadarFace, string> = {
  films: 'films',
  tv: 'episodes',
};

/**
 * A snapshot is only rewritten while its own app is being opened, so an old one
 * describes a streak that may already be over. Radar's generator discards
 * anything past 36 hours and Lidar restamps every 12; two days is the point
 * past which showing either number does more harm than hiding it.
 */
export const SNAPSHOT_STALE_MS = 48 * 60 * 60 * 1000;

/**
 * Whether a published figure is recent enough to repeat. A stamp in the future
 * is a clock disagreement rather than freshness, so it is allowed a minute of
 * slack and no more.
 */
export function snapshotFresh(updatedAt: string | null | undefined, now: number = Date.now()): boolean {
  const at = updatedAt ? Date.parse(updatedAt) : NaN;
  if (Number.isNaN(at)) return false;
  return now - at < SNAPSHOT_STALE_MS && at <= now + 60_000;
}

function fromSnapshot(
  app: SiblingApp,
  streak: number | null | undefined,
  updatedAt: string | null | undefined,
  now: number,
): SiblingStreak {
  const days = typeof streak === 'number' ? streak : 0;
  return {
    app,
    ...SIBLING_LABELS[app],
    days,
    // A zero is hidden rather than shown: an empty slot reading "0 days" looks
    // like a broken streak, when it usually means an app you do not use.
    present: snapshotFresh(updatedAt, now) && days > 0,
  };
}

export function radarStreak(
  currentStreak: number | null | undefined,
  updatedAt: string | null | undefined,
  now: number = Date.now(),
): SiblingStreak {
  return fromSnapshot('radar', currentStreak, updatedAt, now);
}

/**
 * Radar's two streaks, in the order the slot turns them over. Only the ones
 * with something to say: an account that watches films and no television has
 * one face, and a slot that flips to a blank second side reads as broken.
 *
 * Both faces ride the same `streak_updated_at` — Radar writes them in one patch
 * (its StreakSnapshot), so one stamp covers the pair.
 */
export function radarFaces(
  movieStreak: number | null | undefined,
  tvStreak: number | null | undefined,
  updatedAt: string | null | undefined,
  now: number = Date.now(),
): SiblingStreak[] {
  return [
    { ...fromSnapshot('radar', movieStreak, updatedAt, now), face: 'films' as const, unit: RADAR_FACE_UNITS.films },
    { ...fromSnapshot('radar', tvStreak, updatedAt, now), face: 'tv' as const, unit: RADAR_FACE_UNITS.tv },
  ].filter((streak) => streak.present);
}

/**
 * The face after this one, wrapping. Takes the face rather than an index so a
 * remembered choice that is no longer on offer — the TV streak ended while the
 * app was closed — lands on the first available one instead of nothing.
 */
export function nextFace(faces: SiblingStreak[], current: RadarFace | null): RadarFace | null {
  if (faces.length === 0) return null;
  const index = faces.findIndex((streak) => streak.face === current);
  return faces[(index + 1) % faces.length].face ?? null;
}

/** The face to show now: the remembered one when it is still on offer, else the first. */
export function faceOrFirst(faces: SiblingStreak[], preferred: RadarFace | null): SiblingStreak | null {
  return faces.find((streak) => streak.face === preferred) ?? faces[0] ?? null;
}

export function lidarStreak(
  streak: number | null | undefined,
  updatedAt: string | null | undefined,
  now: number = Date.now(),
): SiblingStreak {
  return fromSnapshot('lidar', streak, updatedAt, now);
}

/** Only the siblings with something to say. An empty strip renders nothing at all. */
export function visibleSiblings(streaks: SiblingStreak[]): SiblingStreak[] {
  return streaks.filter((streak) => streak.present);
}
