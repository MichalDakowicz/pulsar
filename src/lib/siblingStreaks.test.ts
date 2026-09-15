import {
  faceOrFirst,
  lidarStreak,
  nextFace,
  radarFaces,
  radarStreak,
  snapshotFresh,
  visibleSiblings,
} from '@/lib/siblingStreaks';

const NOW = Date.parse('2026-09-11T19:00:00Z');
const HOUR = 3600_000;

function ago(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}

describe('snapshotFresh', () => {
  it('trusts a recent stamp', () => {
    expect(snapshotFresh(ago(1), NOW)).toBe(true);
  });

  it('gives up on one past two days', () => {
    expect(snapshotFresh(ago(72), NOW)).toBe(false);
  });

  it('does not trust a missing or unreadable stamp', () => {
    expect(snapshotFresh(null, NOW)).toBe(false);
    expect(snapshotFresh('not a date', NOW)).toBe(false);
  });

  it('allows a minute of clock skew and no more', () => {
    expect(snapshotFresh(new Date(NOW + 30_000).toISOString(), NOW)).toBe(true);
    expect(snapshotFresh(new Date(NOW + 10 * HOUR).toISOString(), NOW)).toBe(false);
  });
});

describe('radarStreak', () => {
  it('shows a fresh snapshot', () => {
    const result = radarStreak(12, ago(1), NOW);
    expect(result.days).toBe(12);
    expect(result.present).toBe(true);
    expect(result.unit).toBe('films');
  });

  it('hides a stale one rather than reporting a streak that may be over', () => {
    expect(radarStreak(12, ago(72), NOW).present).toBe(false);
  });

  it('hides a zero — nobody wants a slot that says nothing', () => {
    expect(radarStreak(0, ago(1), NOW).present).toBe(false);
  });

  it('hides a row that was never written', () => {
    expect(radarStreak(null, null, NOW).present).toBe(false);
  });
});

describe('lidarStreak', () => {
  it('reports what Lidar published, rather than deriving one', () => {
    const result = lidarStreak(9, ago(2), NOW);
    expect(result.days).toBe(9);
    expect(result.present).toBe(true);
    expect(result.app).toBe('lidar');
    expect(result.unit).toBe('pages');
  });

  it('hides a snapshot from a phone that has not opened Lidar in days', () => {
    // Lidar restamps every 12 hours while it is being used, so anything this
    // old describes a streak that may well have broken since.
    expect(lidarStreak(9, ago(72), NOW).present).toBe(false);
  });

  it('hides a streak reset to nothing, instead of showing "0 days"', () => {
    expect(lidarStreak(0, ago(1), NOW).present).toBe(false);
  });

  it('is absent for an account that has never opened Lidar', () => {
    expect(lidarStreak(null, null, NOW).present).toBe(false);
  });
});

describe('visibleSiblings', () => {
  it('drops the slots with nothing to say', () => {
    const rows = visibleSiblings([
      radarStreak(4, ago(1), NOW),
      lidarStreak(0, ago(1), NOW),
    ]);
    expect(rows.map((row) => row.app)).toEqual(['radar']);
  });

  it('keeps both when both are live', () => {
    const rows = visibleSiblings([radarStreak(4, ago(1), NOW), lidarStreak(9, ago(1), NOW)]);
    expect(rows).toHaveLength(2);
  });
});

describe('radarFaces', () => {
  const fresh = '2026-09-15T10:00:00Z';
  const now = Date.parse('2026-09-15T12:00:00Z');

  it('offers both faces when both have something to say', () => {
    const faces = radarFaces(12, 5, fresh, now);
    expect(faces.map((face) => face.face)).toEqual(['films', 'tv']);
    expect(faces[0].unit).toBe('films');
    expect(faces[1].unit).toBe('episodes');
    expect(faces[1].days).toBe(5);
  });

  // A slot that turns over to a blank second side reads as broken, not as an
  // account that watches no television.
  it('drops a face with no streak behind it', () => {
    expect(radarFaces(12, 0, fresh, now).map((face) => face.face)).toEqual(['films']);
    expect(radarFaces(0, 4, fresh, now).map((face) => face.face)).toEqual(['tv']);
    expect(radarFaces(0, 0, fresh, now)).toEqual([]);
  });

  it('drops both when the snapshot has gone stale', () => {
    expect(radarFaces(12, 5, '2026-09-11T10:00:00Z', now)).toEqual([]);
  });
});

describe('nextFace', () => {
  const faces = radarFaces(12, 5, '2026-09-15T10:00:00Z', Date.parse('2026-09-15T12:00:00Z'));

  it('wraps', () => {
    expect(nextFace(faces, 'films')).toBe('tv');
    expect(nextFace(faces, 'tv')).toBe('films');
  });

  it('lands on the first face when the remembered one is gone', () => {
    expect(nextFace(faces, null)).toBe('films');
    const filmsOnly = radarFaces(12, 0, '2026-09-15T10:00:00Z', Date.parse('2026-09-15T12:00:00Z'));
    expect(nextFace(filmsOnly, 'tv')).toBe('films');
  });

  it('has nothing to turn to when there is nothing on offer', () => {
    expect(nextFace([], 'films')).toBeNull();
  });
});

describe('faceOrFirst', () => {
  const faces = radarFaces(12, 5, '2026-09-15T10:00:00Z', Date.parse('2026-09-15T12:00:00Z'));

  it('shows the remembered face while it is still on offer', () => {
    expect(faceOrFirst(faces, 'tv')?.face).toBe('tv');
  });

  // The remembered choice outlives the streak it was pointing at: the TV run
  // ended while the app was closed, and the slot has to land somewhere real.
  it('falls back to the first face when the remembered one has gone', () => {
    const filmsOnly = radarFaces(12, 0, '2026-09-15T10:00:00Z', Date.parse('2026-09-15T12:00:00Z'));
    expect(faceOrFirst(filmsOnly, 'tv')?.face).toBe('films');
    expect(faceOrFirst([], 'films')).toBeNull();
  });
});
