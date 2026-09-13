/**
 * Pulsar's half of `public.user_settings`.
 *
 * The table is Radar's (docs/shared-database.md). Pulsar reads the row and
 * writes exactly two columns — `theme` and `friends_visibility` — because those
 * two are the shared ones: the theme you pick here is the theme in all four
 * apps, and the privacy switch gates the film shelf, the bookshelf, the record
 * shelf and the habit wall together.
 *
 * `currentStreak` / `streakUpdatedAt` are read-only here. They are Radar's film
 * streak, published for its own notification generator, and Pulsar borrows them
 * for the cross-app strip on Today (lib/siblingStreaks). Writing them would
 * overwrite Radar's figure with a habit count and silently break its 20:00
 * warning — which is why `settingsToRow` below refuses to emit them at all.
 */

export type ThemePref = 'dark' | 'light' | 'system';
export type FriendsVisibility = 'public' | 'friends' | 'noone';

export type SharedSettings = {
  theme: ThemePref;
  friendsVisibility: FriendsVisibility;
  /** Radar's. Read-only. */
  radarStreak: number;
  radarStreakUpdatedAt: string | null;
  /** Lidar's. Read-only — Lidar is the only writer of these two. */
  lidarStreak: number;
  lidarStreakUpdatedAt: string | null;
  timezone: string;
};

export type SharedSettingsRow = {
  theme: string | null;
  friends_visibility: string | null;
  current_streak: number | null;
  streak_updated_at: string | null;
  lidar_streak: number | null;
  lidar_streak_updated_at: string | null;
  timezone: string | null;
};

/** The only columns Pulsar is allowed to write. Enforced, not documented. */
export type WritableSettings = Pick<SharedSettings, 'theme' | 'friendsVisibility'>;

export const DEFAULT_SHARED_SETTINGS: SharedSettings = {
  theme: 'dark',
  friendsVisibility: 'friends',
  radarStreak: 0,
  radarStreakUpdatedAt: null,
  lidarStreak: 0,
  lidarStreakUpdatedAt: null,
  timezone: 'UTC',
};

function visibility(value: string | null | undefined): FriendsVisibility {
  return value === 'public' || value === 'noone' ? value : 'friends';
}

export function normalizeShared(row: SharedSettingsRow | null | undefined): SharedSettings {
  if (!row) return DEFAULT_SHARED_SETTINGS;
  return {
    theme: row.theme === 'light' || row.theme === 'system' ? row.theme : 'dark',
    friendsVisibility: visibility(row.friends_visibility),
    radarStreak: typeof row.current_streak === 'number' ? row.current_streak : 0,
    radarStreakUpdatedAt: row.streak_updated_at ?? null,
    lidarStreak: typeof row.lidar_streak === 'number' ? row.lidar_streak : 0,
    lidarStreakUpdatedAt: row.lidar_streak_updated_at ?? null,
    timezone: row.timezone ?? DEFAULT_SHARED_SETTINGS.timezone,
  };
}

/**
 * Only ever emits the two shared columns, whatever it is handed. A future
 * caller that passes `radarStreak` gets it dropped here rather than discovering
 * at 20:00 that Radar stopped warning anybody.
 */
export function settingsToRow(patch: Partial<WritableSettings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.theme !== undefined) row.theme = patch.theme;
  if (patch.friendsVisibility !== undefined) row.friends_visibility = patch.friendsVisibility;
  return row;
}

/** Whether anything of yours is visible to anyone else. Gates every social surface. */
export function sharesAnything(settings: Pick<SharedSettings, 'friendsVisibility'>): boolean {
  return settings.friendsVisibility !== 'noone';
}
