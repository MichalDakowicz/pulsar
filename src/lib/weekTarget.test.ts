import {
  dayShareOfWeek,
  headroom,
  isWeeklyTarget,
  judgesWeekly,
  stepSizes,
  weekAmount,
  weekMet,
  weekOnTheLine,
  weekRemaining,
  weekTarget,
  weekTargetLabel,
  type Targeted,
} from '@/lib/weekTarget';

/** Mon 2026-09-07 … Sun 2026-09-13. */
const MON = '2026-09-07';
const WED = '2026-09-09';
const SUN = '2026-09-13';

/** 20 exercises a week — the habit the whole feature exists for. */
const WEEKLY: Targeted = { kind: 'count', target: 20, targetPeriod: 'week' };
const DAILY: Targeted = { kind: 'count', target: 8, targetPeriod: 'day' };

describe('isWeeklyTarget', () => {
  it('is true only for a counter that says week', () => {
    expect(isWeeklyTarget(WEEKLY)).toBe(true);
    expect(isWeeklyTarget({ kind: 'timer', target: 120, targetPeriod: 'week' })).toBe(true);
    expect(isWeeklyTarget(DAILY)).toBe(false);
  });

  // A binary habit has no amount to add up, so a weekly target on one would be
  // a habit nothing could ever clear.
  it('refuses a binary habit whatever the row says', () => {
    expect(isWeeklyTarget({ kind: 'do', target: 1, targetPeriod: 'week' })).toBe(false);
    expect(isWeeklyTarget({ kind: 'avoid', target: 1, targetPeriod: 'week' })).toBe(false);
  });

  it('reads a row with neither field as the daily habit it was', () => {
    expect(isWeeklyTarget({ kind: 'count', target: 8 })).toBe(false);
    expect(weekTarget({ kind: 'count', target: 8 })).toBe(0);
  });
});

describe('judgesWeekly', () => {
  it('is true by either road — the cadence or the target', () => {
    expect(judgesWeekly({ ...WEEKLY, cadence: { kind: 'daily' } })).toBe(true);
    expect(judgesWeekly({ ...DAILY, cadence: { kind: 'weekly', perWeek: 3 } })).toBe(true);
    expect(judgesWeekly({ ...DAILY, cadence: { kind: 'daily' } })).toBe(false);
  });
});

describe('weekAmount', () => {
  it('sums the Monday-anchored week whichever day is asked about', () => {
    const amounts = { [MON]: 5, [WED]: 7, [SUN]: 3 };
    expect(weekAmount(amounts, MON)).toBe(15);
    expect(weekAmount(amounts, WED)).toBe(15);
    expect(weekAmount(amounts, SUN)).toBe(15);
  });

  it('does not reach into the week either side of it', () => {
    const amounts = { '2026-09-06': 99, [WED]: 4, '2026-09-14': 99 };
    expect(weekAmount(amounts, WED)).toBe(4);
  });

  it('reads an unanswered day as a zero rather than a gap', () => {
    expect(weekAmount({}, WED)).toBe(0);
  });
});

describe('weekRemaining / weekMet', () => {
  it('counts down and never goes negative', () => {
    expect(weekRemaining(WEEKLY, { [MON]: 5 }, WED)).toBe(15);
    expect(weekRemaining(WEEKLY, { [MON]: 24 }, WED)).toBe(0);
  });

  it('is met the moment the total reaches the target', () => {
    expect(weekMet(WEEKLY, { [MON]: 19 }, WED)).toBe(false);
    expect(weekMet(WEEKLY, { [MON]: 20 }, WED)).toBe(true);
    expect(weekMet(WEEKLY, { [MON]: 12, [WED]: 8 }, SUN)).toBe(true);
  });
});

describe('headroom', () => {
  // Off, the target is the job and the last press is dead.
  it('caps at what the week still owes', () => {
    expect(headroom(WEEKLY, 5, { [MON]: 10, [WED]: 5 }, WED)).toBe(5);
    expect(headroom(WEEKLY, 5, { [MON]: 15, [WED]: 5 }, WED)).toBe(0);
  });

  it('caps a daily counter at its own target, not the week', () => {
    expect(headroom(DAILY, 3, { [MON]: 8, [WED]: 3 }, WED)).toBe(5);
  });

  it('is unbounded once the habit allows exceeding', () => {
    expect(headroom({ ...WEEKLY, allowExceed: true }, 40, { [WED]: 40 }, WED)).toBe(Infinity);
  });

  // The day's own logged amount is headroom it already occupies, or editing a
  // day down and back up would be blocked by its own entry.
  it('does not count the day against itself', () => {
    expect(headroom(WEEKLY, 20, { [WED]: 20 }, WED)).toBe(0);
    expect(headroom(WEEKLY, 0, { [WED]: 0 }, WED)).toBe(20);
  });
});

describe('dayShareOfWeek', () => {
  // The answer the wall paints: ten of twenty fills the cell half.
  it('measures the day against the week, not a seventh of it', () => {
    expect(dayShareOfWeek(WEEKLY, 10)).toBe(0.5);
    expect(dayShareOfWeek(WEEKLY, 20)).toBe(1);
    expect(dayShareOfWeek(WEEKLY, 0)).toBe(0);
  });

  it('clamps at full unless the habit allows exceeding', () => {
    expect(dayShareOfWeek(WEEKLY, 40)).toBe(1);
    expect(dayShareOfWeek({ ...WEEKLY, allowExceed: true }, 40)).toBe(2);
  });

  it('is nothing at all on a habit whose target is not week-scoped', () => {
    expect(dayShareOfWeek(DAILY, 4)).toBe(0);
  });
});

describe('weekOnTheLine', () => {
  // Any one day can carry a whole weekly target, so the week cannot fail early.
  it('is quiet while the week still has a day after this one', () => {
    expect(weekOnTheLine(WEEKLY, {}, MON)).toBe(false);
    expect(weekOnTheLine(WEEKLY, {}, '2026-09-12')).toBe(false);
  });

  it('warns on the last day of a week that is still short', () => {
    expect(weekOnTheLine(WEEKLY, { [MON]: 5 }, SUN)).toBe(true);
  });

  it('stays quiet on the last day of a week that is already in', () => {
    expect(weekOnTheLine(WEEKLY, { [MON]: 20 }, SUN)).toBe(false);
  });

  it('has nothing to say about a habit with no weekly target', () => {
    expect(weekOnTheLine(DAILY, {}, SUN)).toBe(false);
  });
});

describe('stepSizes', () => {
  it('scales the jumps to the target', () => {
    expect(stepSizes(20)).toEqual([1, 5, 10]);
    expect(stepSizes(8)).toEqual([1, 2, 4]);
  });

  it('always offers one, and never a jump past the target', () => {
    expect(stepSizes(1)).toEqual([1]);
    expect(stepSizes(2)).toEqual([1]);
    expect(stepSizes(3)).toEqual([1, 2]);
  });
});

describe('weekTargetLabel', () => {
  it('says the period out loud', () => {
    expect(weekTargetLabel({ kind: 'count', target: 20, unit: 'exercises', targetPeriod: 'week' })).toBe(
      '20 exercises a week',
    );
    expect(weekTargetLabel({ kind: 'timer', target: 120, unit: '', targetPeriod: 'week' })).toBe('120 min a week');
  });

  it('is empty on a daily target, which has its own label', () => {
    expect(weekTargetLabel({ kind: 'count', target: 8, unit: 'glasses', targetPeriod: 'day' })).toBe('');
  });
});
