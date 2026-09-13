import {
  DEFAULT_SHARED_SETTINGS,
  normalizeShared,
  settingsToRow,
  sharesAnything,
} from '@/lib/userSettings';

describe('normalizeShared', () => {
  it('falls back to defaults with no row', () => {
    expect(normalizeShared(null)).toEqual(DEFAULT_SHARED_SETTINGS);
  });

  it('reads both sibling streak snapshots without owning either', () => {
    const settings = normalizeShared({
      theme: 'light',
      friends_visibility: 'public',
      current_streak: 12,
      streak_updated_at: '2026-09-11T18:00:00Z',
      lidar_streak: 9,
      lidar_streak_updated_at: '2026-09-11T17:00:00Z',
      timezone: 'Europe/Warsaw',
    });
    expect(settings.theme).toBe('light');
    expect(settings.friendsVisibility).toBe('public');
    expect(settings.radarStreak).toBe(12);
    expect(settings.lidarStreak).toBe(9);
    expect(settings.lidarStreakUpdatedAt).toBe('2026-09-11T17:00:00Z');
  });

  it('rejects a visibility it does not recognise', () => {
    expect(normalizeShared({ friends_visibility: 'everyone' } as never).friendsVisibility).toBe('friends');
  });
});

describe('settingsToRow', () => {
  it('emits only the two columns Pulsar is allowed to write', () => {
    expect(settingsToRow({ theme: 'dark', friendsVisibility: 'noone' })).toEqual({
      theme: 'dark',
      friends_visibility: 'noone',
    });
  });

  it('refuses to write the Radar streak even when handed one', () => {
    expect(settingsToRow({ radarStreak: 99 } as never)).toEqual({});
  });
});

describe('sharesAnything', () => {
  it('is the gate on every social surface', () => {
    expect(sharesAnything({ friendsVisibility: 'noone' })).toBe(false);
    expect(sharesAnything({ friendsVisibility: 'friends' })).toBe(true);
  });
});
