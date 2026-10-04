import { isWriteBack, nextOwnValue, ownRecord, ownRecordId, recordSpan, unitValue } from '@/lib/healthWriteBack';

const local = (day: string, hh: number, mm = 0) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm);
};

describe('isWriteBack', () => {
  it('writes back water and mindful minutes, and nothing a sensor measured', () => {
    expect(isWriteBack('hydration')).toBe(true);
    expect(isWriteBack('mindfulness')).toBe(true);
    expect(isWriteBack('steps')).toBe(false);
  });
});

describe('nextOwnValue', () => {
  it('adds only what was logged here to what pulsar had written', () => {
    // Two glasses came from another app and were lifted in; one more is logged here.
    expect(nextOwnValue(0, 2, 3, 250)).toBe(250);
    expect(nextOwnValue(250, 3, 4, 250)).toBe(500);
  });

  it('takes a glass back off, and never below nothing', () => {
    expect(nextOwnValue(500, 4, 3, 250)).toBe(250);
    expect(nextOwnValue(250, 3, 0, 250)).toBe(0);
  });

  it('counts a glass and a cup as 250 ml, and minutes as minutes', () => {
    expect(unitValue('hydration', 'glasses')).toBe(250);
    expect(unitValue('hydration', 'litres')).toBe(1000);
    expect(unitValue('mindfulness', 'minutes')).toBe(1);
  });
});

describe('recordSpan', () => {
  it('runs from midnight to now on today', () => {
    const now = local('2026-10-04', 18, 30);
    expect(recordSpan('2026-10-04', now)).toEqual({ start: local('2026-10-04', 0), end: now });
  });

  it('runs to the end of a day already over', () => {
    const span = recordSpan('2026-10-02', local('2026-10-04', 18));
    expect(span.end.getTime()).toBe(local('2026-10-03', 0).getTime() - 1000);
  });

  it('never ends where it starts', () => {
    const span = recordSpan('2026-10-04', local('2026-10-04', 0));
    expect(span.end.getTime()).toBeGreaterThan(span.start.getTime());
  });
});

describe('ownRecord', () => {
  const now = local('2026-10-04', 18);

  it('writes water as one record per habit per day, found again by its id', () => {
    const record = ownRecord('hydration', 'h1', '2026-10-04', 750, now);
    expect(record.recordType).toBe('Hydration');
    expect(record.metadata.clientRecordId).toBe(ownRecordId('h1', '2026-10-04'));
    expect(record).toMatchObject({ volume: { value: 750, unit: 'milliliters' } });
  });

  it('writes mindful minutes as a session that long, ending now', () => {
    const record = ownRecord('mindfulness', 'h1', '2026-10-04', 15, now);
    expect(record.endTime).toBe(now.toISOString());
    expect(Date.parse(record.endTime) - Date.parse(record.startTime)).toBe(15 * 60_000);
  });
});
