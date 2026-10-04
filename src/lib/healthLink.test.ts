import { activityGroup, counts } from '@/lib/healthActivities';
import { activeLink, cleanLink, linkLine, linkMisfit, linkSummary, normalizeHealthLink, readLine } from '@/lib/healthLink';

describe('activityGroup', () => {
  it('files a type by what people call it', () => {
    expect(activityGroup(70)).toBe('strength');
    expect(activityGroup(57)).toBe('running');
  });

  it('puts a type it does not know under other', () => {
    expect(activityGroup(0)).toBe('other');
    expect(activityGroup(999)).toBe('other');
  });
});

describe('counts', () => {
  it('lets everything through on all', () => {
    expect(counts({ mode: 'all', activities: [] }, 79)).toBe(true);
  });

  it('keeps out what except names', () => {
    expect(counts({ mode: 'except', activities: ['walking'] }, 79)).toBe(false);
    expect(counts({ mode: 'except', activities: ['walking'] }, 70)).toBe(true);
  });

  it('lets in only what only names', () => {
    expect(counts({ mode: 'only', activities: ['strength'] }, 81)).toBe(true);
    expect(counts({ mode: 'only', activities: ['strength'] }, 56)).toBe(false);
  });
});

describe('cleanLink', () => {
  it('folds an only with nothing chosen to all, rather than a link that never fires', () => {
    expect(cleanLink({ source: 'exercise', mode: 'only', activities: [] })).toEqual({ source: 'exercise', mode: 'all', activities: [] });
  });

  it('drops activities from a source that has none', () => {
    expect(cleanLink({ source: 'steps', mode: 'except', activities: ['walking'] })).toEqual({ source: 'steps', mode: 'all', activities: [] });
  });

  it('keeps the chosen activities in a fixed order', () => {
    expect(cleanLink({ source: 'exercise', mode: 'only', activities: ['running', 'strength'] }).activities).toEqual(['running', 'strength']);
    expect(cleanLink({ source: 'exercise', mode: 'only', activities: ['strength', 'running'] }).activities).toEqual(['running', 'strength']);
  });
});

describe('normalizeHealthLink', () => {
  it('reads nothing as no link', () => {
    expect(normalizeHealthLink(null)).toBeNull();
    expect(normalizeHealthLink({ source: 'heartbeat' })).toBeNull();
  });

  it('drops activities it does not know', () => {
    expect(normalizeHealthLink({ source: 'exercise', mode: 'except', activities: ['walking', 'juggling'] })).toEqual({
      source: 'exercise',
      mode: 'except',
      activities: ['walking'],
    });
  });
});

describe('linkMisfit', () => {
  it('takes steps only into a counter of steps', () => {
    expect(linkMisfit({ kind: 'count', unit: 'steps' }, 'steps')).toBeNull();
    expect(linkMisfit({ kind: 'count', unit: 'glasses' }, 'steps')).not.toBeNull();
  });

  it('takes exercise into a check, a timer or minutes', () => {
    expect(linkMisfit({ kind: 'do', unit: '' }, 'exercise')).toBeNull();
    expect(linkMisfit({ kind: 'timer', unit: '' }, 'exercise')).toBeNull();
    expect(linkMisfit({ kind: 'count', unit: 'minutes' }, 'exercise')).toBeNull();
    expect(linkMisfit({ kind: 'count', unit: 'reps' }, 'exercise')).not.toBeNull();
  });

  it('never fills a check, so sleep needs a measure', () => {
    expect(linkMisfit({ kind: 'do', unit: '' }, 'sleep')).not.toBeNull();
    expect(linkMisfit({ kind: 'timer', unit: '' }, 'sleep')).toBeNull();
  });

  it('refuses avoid habits and habits checked twice a day', () => {
    expect(linkMisfit({ kind: 'avoid', unit: '' }, 'exercise')).not.toBeNull();
    expect(linkMisfit({ kind: 'do', unit: '', checksPerDay: 2 }, 'exercise')).not.toBeNull();
  });
});

describe('activeLink', () => {
  const link = { source: 'steps' as const, mode: 'all' as const, activities: [] };

  it('goes quiet on a habit edited into a shape the source cannot fill', () => {
    expect(activeLink({ kind: 'count', unit: 'steps', archivedAt: null, healthLink: link })).toEqual(link);
    expect(activeLink({ kind: 'count', unit: 'km', archivedAt: null, healthLink: link })).toBeNull();
  });

  it('goes quiet on an archived habit', () => {
    expect(activeLink({ kind: 'count', unit: 'steps', archivedAt: '2026-10-01', healthLink: link })).toBeNull();
  });
});

describe('new sources', () => {
  it('takes distance only into a counter in km', () => {
    expect(linkMisfit({ kind: 'count', unit: 'km' }, 'distance')).toBeNull();
    expect(linkMisfit({ kind: 'count', unit: 'steps' }, 'distance')).not.toBeNull();
  });

  it('takes water into a counter of glasses, cups, ml or litres', () => {
    expect(linkMisfit({ kind: 'count', unit: 'glasses' }, 'hydration')).toBeNull();
    expect(linkMisfit({ kind: 'count', unit: 'litres' }, 'hydration')).toBeNull();
    expect(linkMisfit({ kind: 'count', unit: 'pages' }, 'hydration')).not.toBeNull();
  });

  it('takes mindfulness into a timer', () => {
    expect(linkMisfit({ kind: 'timer', unit: '' }, 'mindfulness')).toBeNull();
    expect(linkMisfit({ kind: 'do', unit: '' }, 'mindfulness')).not.toBeNull();
  });

  it('keeps a kinds filter on distance and drops one on water', () => {
    expect(cleanLink({ source: 'distance', mode: 'only', activities: ['running'] }).activities).toEqual(['running']);
    expect(cleanLink({ source: 'hydration', mode: 'only', activities: ['running'] }).mode).toBe('all');
  });
});

describe('linkSummary', () => {
  it('names a filtered distance link and the plain sources', () => {
    expect(linkSummary({ source: 'distance', mode: 'only', activities: ['running'] })).toBe('distance · only running');
    expect(linkSummary({ source: 'distance', mode: 'all', activities: [] })).toBe('distance');
    expect(linkSummary({ source: 'hydration', mode: 'all', activities: [] })).toBe('water');
  });

  it('says what counts', () => {
    expect(linkSummary({ source: 'steps', mode: 'all', activities: [] })).toBe('steps');
    expect(linkSummary({ source: 'exercise', mode: 'all', activities: [] })).toBe('exercise · every kind');
    expect(linkSummary({ source: 'exercise', mode: 'except', activities: ['walking'] })).toBe('exercise · not walking');
  });
});

describe('readLine', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it('says nothing before the first read', () => {
    expect(readLine(null, now)).toBeNull();
  });

  it('counts minutes, then hours', () => {
    expect(readLine(now - 20_000, now)).toBe('read just now');
    expect(readLine(now - 4 * 60_000, now)).toBe('read 4m ago');
    expect(readLine(now - 130 * 60_000, now)).toBe('read 2h ago');
  });
});

describe('linkLine', () => {
  const steps = { source: 'steps' as const, mode: 'all' as const, activities: [] };
  const walk = { kind: 'count' as const, unit: 'steps', healthLink: steps };
  const phone = { onPhone: true, unshared: false, readAgo: 'read 4m ago' };

  it('offers the link on a habit without one', () => {
    expect(linkLine({ kind: 'count', unit: 'steps', healthLink: null }, phone)).toBe('fill it from steps, workouts, sleep, water and more');
  });

  it('says what fills it and when it was read', () => {
    expect(linkLine(walk, phone)).toBe('steps · read 4m ago');
    expect(linkLine(walk, { ...phone, readAgo: null })).toBe('steps');
  });

  it('says why a link is not filling anything, most basic reason first', () => {
    expect(linkLine({ ...walk, unit: 'km' }, phone)).toBe('paused — steps needs a counter in steps');
    expect(linkLine(walk, { ...phone, unshared: true })).toBe('steps · health connect is not sharing it');
  });

  it('points off the phone at the phone', () => {
    expect(linkLine(walk, { onPhone: false, unshared: false, readAgo: null })).toBe('steps · read on your phone');
  });
});
