import {
  backfillDays,
  backfillFrom,
  backfillLabel,
  isBackfillable,
  MAX_BACKFILL_DAYS,
} from '@/lib/backfill';

const TODAY = '2026-09-15';

describe('backfillFrom', () => {
  it('opens yesterday when the app was opened yesterday', () => {
    expect(backfillFrom(TODAY, '2026-09-14')).toBe('2026-09-14');
  });

  it('opens yesterday when the app has already been opened today', () => {
    expect(backfillFrom(TODAY, TODAY)).toBe('2026-09-14');
  });

  it('opens yesterday on a first ever run', () => {
    expect(backfillFrom(TODAY, null)).toBe('2026-09-14');
  });

  it('opens the whole stretch the app was never opened', () => {
    // Last seen on the 9th, so the 10th through yesterday were never seen.
    expect(backfillFrom(TODAY, '2026-09-09')).toBe('2026-09-10');
  });

  it('never reaches past the cap, however long the phone was in a drawer', () => {
    expect(backfillFrom(TODAY, '2024-01-01')).toBe('2026-08-16');
    expect(backfillFrom(TODAY, '2024-01-01', 3)).toBe('2026-09-12');
  });
});

describe('backfillDays', () => {
  it('is yesterday alone for a daily user, newest first', () => {
    expect(backfillDays(TODAY, '2026-09-14')).toEqual(['2026-09-14']);
  });

  it('is every unseen day, newest first', () => {
    expect(backfillDays(TODAY, '2026-09-11')).toEqual([
      '2026-09-14',
      '2026-09-13',
      '2026-09-12',
    ]);
  });

  it('never runs longer than the cap', () => {
    expect(backfillDays(TODAY, '2020-01-01')).toHaveLength(MAX_BACKFILL_DAYS);
  });
});

describe('isBackfillable', () => {
  it('refuses today — that is the check-in, not a backfill', () => {
    expect(isBackfillable(TODAY, TODAY, '2026-09-01')).toBe(false);
  });

  it('refuses a future day', () => {
    expect(isBackfillable('2026-09-16', TODAY, '2026-09-01')).toBe(false);
  });

  it('takes yesterday from a daily user', () => {
    expect(isBackfillable('2026-09-14', TODAY, '2026-09-14')).toBe(true);
  });

  it('refuses the day before yesterday when the app was opened yesterday', () => {
    expect(isBackfillable('2026-09-13', TODAY, '2026-09-14')).toBe(false);
  });

  it('takes a day inside a gap', () => {
    expect(isBackfillable('2026-09-11', TODAY, '2026-09-09')).toBe(true);
  });

  it('refuses the last day that was actually seen', () => {
    expect(isBackfillable('2026-09-09', TODAY, '2026-09-09')).toBe(false);
  });
});

describe('backfillLabel', () => {
  it('names the window', () => {
    expect(backfillLabel([])).toBe('nothing to fill in');
    expect(backfillLabel(['2026-09-14'])).toBe('yesterday');
    expect(backfillLabel(['2026-09-14', '2026-09-13'])).toBe('the 2 days you were away');
  });
});
