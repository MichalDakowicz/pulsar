import {
  dailyPages,
  lidarStreak,
  pagesStreak,
  radarStreak,
  visibleSiblings,
  type PageEntry,
  type ReadEntry,
} from '@/lib/siblingStreaks';

function at(day: string, hour = 12): string {
  return new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
}

describe('radarStreak', () => {
  const now = Date.parse('2026-09-11T19:00:00Z');

  it('shows a fresh snapshot', () => {
    const result = radarStreak(12, new Date(now - 3600_000).toISOString(), now);
    expect(result.days).toBe(12);
    expect(result.present).toBe(true);
  });

  it('hides a stale one rather than reporting a streak that may be over', () => {
    const result = radarStreak(12, new Date(now - 72 * 3600_000).toISOString(), now);
    expect(result.present).toBe(false);
  });

  it('hides a zero — nobody wants a slot that says nothing', () => {
    expect(radarStreak(0, new Date(now).toISOString(), now).present).toBe(false);
  });

  it('hides a row that was never written', () => {
    expect(radarStreak(null, null, now).present).toBe(false);
  });
});

describe('dailyPages', () => {
  it('buckets ledger moves by local day', () => {
    const progress: PageEntry[] = [
      { recordedAt: at('2026-09-10'), pages: 30 },
      { recordedAt: at('2026-09-10', 22), pages: 20 },
      { recordedAt: at('2026-09-11'), pages: 40 },
    ];
    expect(dailyPages([], progress)).toEqual({ '2026-09-10': 50, '2026-09-11': 40 });
  });

  it('does not count a tracked read twice', () => {
    const progress: PageEntry[] = [{ recordedAt: at('2026-09-10'), pages: 300, bookId: 'b1' }];
    const reads: ReadEntry[] = [{ finishedAt: at('2026-09-10', 23), pageCount: 300, bookId: 'b1' }];
    expect(dailyPages(reads, progress)).toEqual({ '2026-09-10': 300 });
  });

  it('still counts an untracked read as a lump', () => {
    const reads: ReadEntry[] = [{ finishedAt: at('2026-09-10'), pageCount: 280, bookId: 'b2' }];
    expect(dailyPages(reads, [])).toEqual({ '2026-09-10': 280 });
  });
});

describe('pagesStreak', () => {
  it('is zero with nothing read', () => {
    expect(pagesStreak({}, 150, '2026-09-11')).toBe(0);
  });

  it('counts days whose week clears the goal', () => {
    const daily = {
      '2026-09-07': 50,
      '2026-09-08': 50,
      '2026-09-09': 50,
      '2026-09-10': 50,
      '2026-09-11': 50,
    };
    expect(pagesStreak(daily, 150, '2026-09-11')).toBe(5);
  });

  it('skips an empty day whose week still qualifies', () => {
    const daily = { '2026-09-07': 200, '2026-09-09': 50 };
    // 08 is empty but the week has 250 pages, so the run reaches back to 07.
    expect(pagesStreak(daily, 150, '2026-09-09')).toBe(2);
  });

  it('stops at a week that never cleared the goal', () => {
    const daily = { '2026-08-31': 10, '2026-09-07': 200 };
    expect(pagesStreak(daily, 150, '2026-09-07')).toBe(1);
  });
});

describe('lidarStreak', () => {
  it('is absent for someone who does not use Lidar', () => {
    expect(lidarStreak([], [], 150, '2026-09-11').present).toBe(false);
  });

  it('is present as soon as there is a ledger, even at zero days', () => {
    const progress: PageEntry[] = [{ recordedAt: at('2026-01-02'), pages: 10 }];
    const result = lidarStreak([], progress, 150, '2026-09-11');
    expect(result.present).toBe(true);
    expect(result.days).toBe(0);
  });
});

describe('visibleSiblings', () => {
  it('drops the slots with nothing to say', () => {
    const rows = [
      radarStreak(0, null, Date.now()),
      lidarStreak([], [{ recordedAt: at('2026-09-11'), pages: 200 }], 150, '2026-09-11'),
    ];
    expect(visibleSiblings(rows).map((row) => row.app)).toEqual(['lidar']);
  });
});
