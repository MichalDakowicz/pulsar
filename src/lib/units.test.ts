import { cleanUnit, isPresetUnit, UNIT_MAX, UNIT_PRESETS } from '@/lib/units';

describe('cleanUnit', () => {
  it('trims, collapses spaces and lowercases', () => {
    expect(cleanUnit('  Push   Ups ')).toBe('push ups');
  });

  it('leaves nothing for a blank entry', () => {
    expect(cleanUnit('')).toBe('');
    expect(cleanUnit('   ')).toBe('');
  });

  it('caps the length without leaving a trailing space', () => {
    const long = 'a'.repeat(UNIT_MAX - 1) + ' tail';
    const cleaned = cleanUnit(long);
    expect(cleaned.length).toBeLessThanOrEqual(UNIT_MAX);
    expect(cleaned.endsWith(' ')).toBe(false);
  });
});

describe('isPresetUnit', () => {
  it('knows the presets and nothing else', () => {
    expect(isPresetUnit('glasses')).toBe(true);
    expect(isPresetUnit('bottles')).toBe(false);
    expect(isPresetUnit('')).toBe(false);
  });

  it('keeps the original five where people look first', () => {
    expect(UNIT_PRESETS.slice(0, 5)).toEqual(['glasses', 'pages', 'reps', 'ml', 'times']);
  });

  it('has no duplicates', () => {
    expect(new Set(UNIT_PRESETS).size).toBe(UNIT_PRESETS.length);
  });
});
