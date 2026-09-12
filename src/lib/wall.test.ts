import type { Cadence } from '@/lib/schedule';
import type { EntryMap } from '@/lib/streak';
import { buildWall, flattenByDay, wallRate, weekdayShape } from '@/lib/wall';

const DAILY: Cadence = { kind: 'daily' };
const WEEKDAYS: Cadence = { kind: 'weekdays' };

describe('buildWall', () => {
  it('is week-aligned, so weekday rows line up', () => {
    const weeks = buildWall({}, DAILY, { weeks: 3, endOn: '2026-09-11' });
    expect(weeks).toHaveLength(3);
    expect(weeks[0].start).toBe('2026-08-24');
    expect(weeks[2].start).toBe('2026-09-07');
    expect(flattenByDay(weeks)).toHaveLength(21);
  });

  it('paints a non-target day as rest, never as a miss', () => {
    const weeks = buildWall({}, WEEKDAYS, { weeks: 1, endOn: '2026-09-13' });
    const cells = weeks[0].cells;
    expect(cells[5].state).toBe('rest');
    expect(cells[6].state).toBe('rest');
    expect(cells[0].state).toBe('missed');
  });

  it('leaves days before the habit existed as rest', () => {
    const weeks = buildWall({}, DAILY, { weeks: 1, endOn: '2026-09-13', startedOn: '2026-09-10' });
    const cells = weeks[0].cells;
    expect(cells[0].state).toBe('rest');
    expect(cells[3].state).toBe('missed');
  });

  it('does not call today a miss', () => {
    const weeks = buildWall({}, DAILY, { weeks: 1, endOn: '2026-09-09' });
    expect(weeks[0].cells[2].state).toBe('future');
    expect(weeks[0].cells[3].state).toBe('future');
  });

  it('shows a part-done counter day as partial', () => {
    const weeks = buildWall({}, DAILY, {
      weeks: 1,
      endOn: '2026-09-11',
      progress: { '2026-09-08': 0.5 },
    });
    const cell = weeks[0].cells[1];
    expect(cell.state).toBe('partial');
    expect(cell.ratio).toBe(0.5);
  });

  it('reads held, frozen and repaired off the entries', () => {
    const entries: EntryMap = {
      '2026-09-07': 'held',
      '2026-09-08': 'frozen',
      '2026-09-09': 'repaired',
      '2026-09-10': 'skipped',
    };
    const cells = buildWall(entries, DAILY, { weeks: 1, endOn: '2026-09-11' })[0].cells;
    expect(cells.map((cell) => cell.state)).toEqual([
      'held',
      'frozen',
      'held',
      'rest',
      'future',
      'future',
      'future',
    ]);
  });
});

describe('wallRate', () => {
  it('scores a weekday habit out of weekdays', () => {
    const entries: EntryMap = {
      '2026-09-07': 'held',
      '2026-09-08': 'held',
      '2026-09-09': 'held',
      '2026-09-10': 'held',
    };
    // Friday missed, weekend is rest, so 4 of 5 rather than 4 of 7.
    const weeks = buildWall(entries, WEEKDAYS, { weeks: 1, endOn: '2026-09-13' });
    expect(wallRate(weeks)).toBe(80);
  });

  it('is zero when nothing has come due', () => {
    expect(wallRate(buildWall({}, DAILY, { weeks: 1, endOn: '2026-09-07', startedOn: '2026-09-07' }))).toBe(0);
  });
});

describe('weekdayShape', () => {
  it('reports a held rate per weekday', () => {
    const entries: EntryMap = { '2026-09-07': 'held', '2026-09-14': 'held' };
    const weeks = buildWall(entries, DAILY, { weeks: 2, endOn: '2026-09-20' });
    const shape = weekdayShape(weeks);
    expect(shape[0]).toBe(1);
    expect(shape[1]).toBe(0);
  });
});
