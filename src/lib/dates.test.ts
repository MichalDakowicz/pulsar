import {
  addDays,
  dateKey,
  dayRange,
  daysBetween,
  formatCountdown,
  formatDayLong,
  hoursToMidnight,
  parseDay,
  weekdayIndex,
  weekKey,
} from '@/lib/dates';

describe('dateKey / parseDay', () => {
  it('round-trips through local midnight, not UTC', () => {
    const key = '2026-09-11';
    expect(dateKey(parseDay(key))).toBe(key);
    expect(parseDay(key).getHours()).toBe(0);
  });
});

describe('weekdayIndex', () => {
  it('anchors the week on Monday', () => {
    expect(weekdayIndex('2026-09-07')).toBe(0);
    expect(weekdayIndex('2026-09-13')).toBe(6);
  });
});

describe('weekKey', () => {
  it('maps every day of a week to its Monday', () => {
    expect(weekKey('2026-09-07')).toBe('2026-09-07');
    expect(weekKey('2026-09-13')).toBe('2026-09-07');
    expect(weekKey('2026-09-14')).toBe('2026-09-14');
  });
});

describe('addDays / daysBetween', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(daysBetween('2026-08-31', '2026-09-01')).toBe(1);
  });

  it('survives the spring clock change', () => {
    // Europe/Warsaw springs forward on 2026-03-29; a naive +86400000ms lands
    // on the same calendar day and the walk stalls.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
  });

  it('is negative when the range runs backwards', () => {
    expect(daysBetween('2026-09-10', '2026-09-08')).toBe(-2);
  });
});

describe('dayRange', () => {
  it('is inclusive at both ends', () => {
    expect(dayRange('2026-09-07', '2026-09-09')).toEqual(['2026-09-07', '2026-09-08', '2026-09-09']);
  });

  it('is empty when reversed', () => {
    expect(dayRange('2026-09-09', '2026-09-07')).toEqual([]);
  });
});

describe('hoursToMidnight', () => {
  it('counts down inside the day', () => {
    const at = new Date(2026, 8, 11, 21, 0, 0);
    expect(hoursToMidnight(at)).toBeCloseTo(3, 5);
  });
});

describe('formatCountdown', () => {
  it('drops the hour when there is none', () => {
    expect(formatCountdown(3.3)).toBe('3h 18m');
    expect(formatCountdown(0.5)).toBe('30m');
    expect(formatCountdown(-1)).toBe('0m');
  });
});

describe('formatDayLong', () => {
  it('reads as a date a person would say', () => {
    expect(formatDayLong('2026-09-11')).toBe('friday · 11 sep');
  });
});
