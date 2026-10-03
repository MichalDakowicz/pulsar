import { judgedByWeek, missLine, typeTags } from '@/lib/habitType';

const check = { kind: 'do' as const, target: 1, unit: '', cadence: { kind: 'daily' as const } };
const water = { ...check, kind: 'count' as const, target: 8, unit: 'glasses' };

describe('typeTags', () => {
  it('says what is logged and when', () => {
    expect(typeTags(water)).toEqual([
      { label: 'count · 8 glasses', glyph: 'count', week: false },
      { label: 'daily', week: false },
    ]);
  });

  it('flags a habit judged by the week', () => {
    const [, gym] = typeTags({ ...check, cadence: { kind: 'weekly', perWeek: 3 } });
    expect(gym).toEqual({ label: '3× a week', week: true });
    const [, run] = typeTags({ ...water, targetPeriod: 'week' });
    expect(run).toEqual({ label: 'per week', week: true });
  });

  it('names the checks of a multi-step habit', () => {
    expect(typeTags({ ...check, checksPerDay: 2 })[0]).toEqual({ label: '2× check', glyph: 'steps', week: false });
  });

  it('spells out set days and shortens an interval', () => {
    expect(typeTags({ ...check, cadence: { kind: 'days', days: [0, 2, 4] } })[1].label).toBe('mon · wed · fri');
    expect(typeTags({ ...check, cadence: { kind: 'interval', every: 2, anchor: '' } })[1].label).toBe('every 2d');
  });
});

describe('judgedByWeek', () => {
  it('is true for a quota and for a weekly total, and nothing else', () => {
    expect(judgedByWeek({ cadence: { kind: 'weekly', perWeek: 3 } })).toBe(true);
    expect(judgedByWeek({ kind: 'count', targetPeriod: 'week', cadence: { kind: 'daily' } })).toBe(true);
    expect(judgedByWeek({ kind: 'do', targetPeriod: 'week', cadence: { kind: 'daily' } })).toBe(false);
  });
});

describe('missLine', () => {
  it('says what a miss is for each shape', () => {
    expect(missLine(water)).toBe('a due day that ends under 8 glasses');
    expect(missLine({ ...water, targetPeriod: 'week', target: 56 })).toBe('a week that ends under 56 glasses');
    expect(missLine({ ...check, kind: 'timer', target: 20 })).toBe('a due day that ends under 20 min');
    expect(missLine({ ...check, cadence: { kind: 'weekly', perWeek: 3 } })).toBe('a week with fewer than 3 check-ins');
    expect(missLine({ ...check, cadence: { kind: 'weekly', perWeek: 1 } })).toBe('a week with no check-in');
    expect(missLine({ ...check, kind: 'avoid' })).toBe('a day you slipped');
    expect(missLine(check)).toBe('a due day left unchecked');
    expect(missLine({ ...check, checksPerDay: 2 })).toContain('that check’s streak');
  });
});
