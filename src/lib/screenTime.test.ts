import {
  activeScreenLink,
  normalizeScreenLink,
  screenMisfit,
  screenSummary,
  shortMinutes,
  slipDays,
  slipLine,
  usageByDay,
  type ScreenLink,
} from '@/lib/screenTime';

const TODAY = '2026-10-04';
const at = (day: string, hh: number, mm = 0) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
};

const insta: ScreenLink = { apps: [{ pkg: 'com.instagram.android', label: 'Instagram' }], limit: 30 };
const habit = { cadence: { kind: 'daily' as const }, startedOn: '2026-09-01', phases: [] };

describe('normalizeScreenLink', () => {
  it('reads a link back, and anything without apps or a limit as none', () => {
    expect(normalizeScreenLink(insta)).toEqual(insta);
    expect(normalizeScreenLink({ apps: [], limit: 30 })).toBeNull();
    expect(normalizeScreenLink({ apps: insta.apps, limit: 0 })).toBeNull();
    expect(normalizeScreenLink(null)).toBeNull();
  });
});

describe('screenMisfit', () => {
  it('fits avoid habits only', () => {
    expect(screenMisfit({ kind: 'avoid' })).toBeNull();
    expect(screenMisfit({ kind: 'do' })).not.toBeNull();
  });

  it('goes quiet on an archived habit', () => {
    expect(activeScreenLink({ kind: 'avoid', archivedAt: null, screenLink: insta })).toEqual(insta);
    expect(activeScreenLink({ kind: 'avoid', archivedAt: '2026-10-01', screenLink: insta })).toBeNull();
  });
});

describe('usageByDay', () => {
  it('adds the sessions of the linked apps and ignores the rest', () => {
    const sessions = [
      { pkg: 'com.instagram.android', start: at(TODAY, 9), end: at(TODAY, 9, 20) },
      { pkg: 'com.instagram.android', start: at(TODAY, 21), end: at(TODAY, 21, 15) },
      { pkg: 'com.spotify.music', start: at(TODAY, 10), end: at(TODAY, 12) },
    ];
    expect(usageByDay(sessions, ['com.instagram.android'])).toEqual({ [TODAY]: 35 });
  });

  it('cuts a session at midnight', () => {
    const late = { pkg: 'a', start: at('2026-10-03', 23, 50), end: at(TODAY, 0, 20) };
    expect(usageByDay([late], ['a'])).toEqual({ '2026-10-03': 10, [TODAY]: 20 });
  });

  it('counts two apps open at once as one stretch of screen', () => {
    const sessions = [
      { pkg: 'a', start: at(TODAY, 9), end: at(TODAY, 9, 30) },
      { pkg: 'b', start: at(TODAY, 9, 10), end: at(TODAY, 9, 40) },
    ];
    expect(usageByDay(sessions, ['a', 'b'])).toEqual({ [TODAY]: 40 });
  });
});

describe('slipDays', () => {
  it('slips a day over the limit with no answer yet', () => {
    expect(slipDays(habit, insta, { [TODAY]: 42, '2026-10-03': 12 }, {}, TODAY, [])).toEqual([TODAY]);
  });

  it('leaves a day at the limit clean', () => {
    expect(slipDays(habit, insta, { [TODAY]: 30 }, {}, TODAY, [])).toEqual([]);
  });

  it('never overrules a day that already has an answer', () => {
    const existing = { [TODAY]: { state: 'skipped' as const, amount: 0 } };
    expect(slipDays(habit, insta, { [TODAY]: 90 }, existing, TODAY, [])).toEqual([]);
  });

  it('never writes a day twice, so a slip taken back stays taken back', () => {
    expect(slipDays(habit, insta, { [TODAY]: 90 }, {}, TODAY, [TODAY])).toEqual([]);
  });

  it('reads a week back and no further, and never before the habit started', () => {
    const usage = { '2026-09-20': 90, '2026-09-28': 90, '2026-10-02': 90 };
    expect(slipDays(habit, insta, usage, {}, TODAY, [])).toEqual(['2026-09-28', '2026-10-02']);
    expect(slipDays({ ...habit, startedOn: '2026-10-01' }, insta, usage, {}, TODAY, [])).toEqual(['2026-10-02']);
  });
});

describe('screenSummary and slipLine', () => {
  it('names the apps and the limit', () => {
    expect(screenSummary(insta)).toBe('instagram · 30 min a day');
    const three = { ...insta, apps: [...insta.apps, { pkg: 'b', label: 'TikTok' }, { pkg: 'c', label: 'X' }] };
    expect(screenSummary(three)).toBe('instagram, tiktok +1 · 30 min a day');
  });

  it('says why the slip was logged', () => {
    expect(slipLine('scrolling', insta, [TODAY], { [TODAY]: 41.6 }, TODAY)).toBe(
      'scrolling slipped — 42 min on instagram today, over 30.',
    );
  });
});

describe('shortMinutes', () => {
  it('reads at a glance', () => {
    expect(shortMinutes(0.4)).toBe('1m');
    expect(shortMinutes(45)).toBe('45m');
    expect(shortMinutes(250)).toBe('4h');
  });
});
