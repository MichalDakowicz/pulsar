import {
  canFreeze,
  canUndoToday,
  challengeComplete,
  dayProgress,
  dayState,
  effectiveRule,
  habitMeta,
  hasReminders,
  asksAboutYesterday,
  judgedDay,
  meetsTarget,
  targetLabel,
  dayTabLabel,
  todayHint,
} from '@/lib/habit';
import { cadenceLabel, type Cadence } from '@/lib/schedule';
import type { Habit } from '@/types/habit';

const BASE: Habit = {
  id: 'h1',
  userId: 'u1',
  name: 'drink water',
  mark: 'drop',
  kind: 'count',
  target: 8,
  unit: 'glasses',
  cadence: { kind: 'daily' },
  challenge: 'open',
  window: 'exact',
  times: ['08:00'],
  escalate: true,
  rule: 'strict',
  hard: false,
  publicShelf: false,
  pledge: '',
  why: '',
  startedOn: '2026-09-01',
  archivedAt: null,
  sort: 0,
};

describe('targetLabel', () => {
  it('describes each kind in its own units', () => {
    expect(targetLabel(BASE)).toBe('8 glasses');
    expect(targetLabel({ ...BASE, kind: 'timer', target: 20 })).toBe('20 min');
    expect(targetLabel({ ...BASE, kind: 'avoid' })).toBe('clean day');
    expect(targetLabel({ ...BASE, kind: 'do' })).toBe('');
  });
});

describe('habitMeta', () => {
  it('drops the clock when there is none', () => {
    expect(habitMeta(BASE)).toBe('8 glasses · every day · 08:00');
    expect(habitMeta({ ...BASE, window: 'anytime', times: [] })).toBe('8 glasses · every day');
    expect(habitMeta({ ...BASE, window: 'evening', times: [] })).toBe('8 glasses · every day · evening');
  });
});

describe('hasReminders', () => {
  it('is false when the habit has no clock', () => {
    expect(hasReminders({ window: 'anytime', times: ['08:00'] })).toBe(false);
    expect(hasReminders({ window: 'exact', times: [] })).toBe(false);
    expect(hasReminders({ window: 'exact', times: ['08:00'] })).toBe(true);
  });
});

describe('effectiveRule / canFreeze', () => {
  it('hard mode forces strict and refuses a freeze', () => {
    expect(effectiveRule({ hard: true, rule: 'grace' })).toBe('strict');
    expect(effectiveRule({ hard: false, rule: 'grace' })).toBe('grace');
    expect(canFreeze({ hard: true }, 3)).toBe(false);
    expect(canFreeze({ hard: false }, 0)).toBe(false);
    expect(canFreeze({ hard: false }, 1)).toBe(true);
  });
});

describe('dayProgress / meetsTarget', () => {
  it('is binary for do and avoid', () => {
    expect(dayProgress({ kind: 'do', target: 1 }, 1)).toBe(1);
    expect(dayProgress({ kind: 'avoid', target: 1 }, 0)).toBe(0);
  });

  it('is a ratio for a counter, capped at one', () => {
    expect(dayProgress({ kind: 'count', target: 8 }, 4)).toBe(0.5);
    expect(dayProgress({ kind: 'count', target: 8 }, 20)).toBe(1);
  });

  it('does not call a part-done counter held', () => {
    expect(meetsTarget({ kind: 'count', target: 8 }, 7)).toBe(false);
    expect(meetsTarget({ kind: 'count', target: 8 }, 8)).toBe(true);
  });
});

describe('dayState', () => {
  const weekdays: Cadence = { kind: 'weekdays' };

  it('calls a non-target day rest rather than due', () => {
    expect(dayState({ cadence: weekdays, archivedAt: null }, {}, '2026-09-12')).toBe('rest');
    expect(dayState({ cadence: weekdays, archivedAt: null }, {}, '2026-09-11')).toBe('due');
  });

  it('an archived habit asks for nothing', () => {
    expect(dayState({ cadence: weekdays, archivedAt: '2026-09-01' }, {}, '2026-09-11')).toBe('rest');
  });

  it('reports what the entry says', () => {
    expect(dayState({ cadence: weekdays, archivedAt: null }, { '2026-09-11': 'frozen' }, '2026-09-11')).toBe('frozen');
  });
});

describe('canUndoToday', () => {
  it('takes back the two answers that cost nothing', () => {
    expect(canUndoToday('held')).toBe(true);
    expect(canUndoToday('skipped')).toBe(true);
  });

  it('refuses the two that spent a token', () => {
    expect(canUndoToday('frozen')).toBe(false);
    expect(canUndoToday('repaired')).toBe(false);
  });

  it('has nothing to undo on an open or resting day', () => {
    expect(canUndoToday('due')).toBe(false);
    expect(canUndoToday('rest')).toBe(false);
  });
});

describe('todayHint', () => {
  it('names the check-in gesture the setting actually picked', () => {
    expect(todayHint('swipe', 2, 0)).toBe('swipe a row across');
    expect(todayHint('hold', 2, 0)).toBe('press and hold a row');
  });

  it('adds the undo half only once a row can be taken back', () => {
    expect(todayHint('swipe', 2, 1)).toBe('swipe a row across · swipe a done row back to undo');
  });

  it('keeps the undo hint after the last row is checked off', () => {
    expect(todayHint('swipe', 0, 3)).toBe('swipe a done row back to undo');
    expect(todayHint('hold', 0, 3)).toBe('swipe a done row back to undo');
  });

  it('says nothing when no gesture would work', () => {
    // Every row frozen or repaired: resolved, but none of it is free to undo.
    expect(todayHint('swipe', 0, 0)).toBeUndefined();
  });
});

describe('challengeComplete', () => {
  it('never completes an open-ended habit', () => {
    expect(challengeComplete({ challenge: 'open' }, 9999)).toBe(false);
  });

  it('completes a fixed run at its length', () => {
    expect(challengeComplete({ challenge: '30' }, 29)).toBe(false);
    expect(challengeComplete({ challenge: '30' }, 30)).toBe(true);
  });
});

describe('cadenceLabel', () => {
  it('is the label the builder preview shows', () => {
    expect(cadenceLabel(BASE.cadence)).toBe('every day');
  });
});

describe('judgedDay', () => {
  it('asks an avoid habit about yesterday — a clean day is only clean once it is over', () => {
    expect(judgedDay({ kind: 'avoid' }, '2026-09-15')).toBe('2026-09-14');
    expect(asksAboutYesterday({ kind: 'avoid' })).toBe(true);
  });

  it('asks every other kind about today', () => {
    for (const kind of ['do', 'count', 'timer'] as const) {
      expect(judgedDay({ kind }, '2026-09-15')).toBe('2026-09-15');
      expect(asksAboutYesterday({ kind })).toBe(false);
    }
  });
});

describe('canUndoToday on a slip', () => {
  it('lets a slip be taken back — that is what unblocks answering the day clean', () => {
    expect(canUndoToday('broke')).toBe(true);
  });
});


describe('dayTabLabel', () => {
  it('carries what is still open on that side', () => {
    expect(dayTabLabel('yesterday', 2)).toBe('yesterday · 2');
  });

  // The point of moving avoid habits off today is that they stop being seen; a
  // bare "yesterday" with two waiting would finish the job.
  it('says only its name when nothing is waiting', () => {
    expect(dayTabLabel('today', 0)).toBe('today');
  });
});
