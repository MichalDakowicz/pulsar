import { cardAction, cardRank, cardTone, counterLine, isDone, jumps, openDayRing, weekFilled, type CardInput } from '@/lib/habitCard';

const base: CardInput = {
  today: 'due',
  atRisk: false,
  undoable: false,
  counter: false,
  weekly: false,
  amount: 0,
  target: 1,
  weekAmount: 0,
  weekTarget: 0,
  avoid: false,
  slippedToday: false,
};

const counter: CardInput = { ...base, counter: true, target: 8 };

describe('cardTone', () => {
  it('tints a held day', () => {
    expect(cardTone({ ...base, today: 'held' })).toBe('done');
    expect(cardTone({ ...base, today: 'repaired' })).toBe('done');
  });

  it('dims a day set aside, even on a streak at risk', () => {
    expect(cardTone({ ...base, today: 'skipped', atRisk: true })).toBe('aside');
  });

  it('reddens only an open day at risk', () => {
    expect(cardTone({ ...base, atRisk: true })).toBe('risk');
    expect(cardTone({ ...base, today: 'held', atRisk: true })).toBe('done');
  });

  it('does not call a weekly counter done until the week adds up', () => {
    const logged = { ...counter, today: 'held' as const, weekly: true, weekAmount: 5, weekTarget: 20 };
    expect(cardTone(logged)).toBe('open');
    expect(cardTone({ ...logged, weekAmount: 20 })).toBe('done');
  });
});

describe('isDone', () => {
  it('ignores a weekly habit with no target', () => {
    expect(isDone({ ...counter, weekly: true })).toBe(false);
  });

  it('does not call a daily counter done on its first tap', () => {
    expect(isDone({ ...counter, today: 'held', amount: 2 })).toBe(false);
    expect(isDone({ ...counter, today: 'held', amount: 8 })).toBe(true);
  });
});

describe('cardRank', () => {
  it('orders open, counting, answered, full, set aside', () => {
    const cards: [string, CardInput][] = [
      ['aside', { ...base, today: 'skipped' }],
      ['full', { ...counter, today: 'held', amount: 8 }],
      ['answered', { ...base, today: 'held' }],
      ['counting', { ...counter, today: 'held', amount: 3 }],
      ['open', base],
    ];
    const sorted = [...cards].sort((a, b) => cardRank(a[1]) - cardRank(b[1])).map(([name]) => name);
    expect(sorted).toEqual(['open', 'counting', 'answered', 'full', 'aside']);
  });

  it('puts an untouched counter with the counters, not the open checks', () => {
    expect(cardRank(counter)).toBe(1);
  });

  it('counts a frozen or broken day as answered', () => {
    expect(cardRank({ ...counter, today: 'frozen' })).toBe(2);
    expect(cardRank({ ...base, today: 'broke' })).toBe(2);
  });
});

describe('cardAction', () => {
  it('offers the skip only while the day is open and skippable', () => {
    expect(cardAction(base, true)).toBe('skip');
    expect(cardAction(base, false)).toBe('none');
  });

  it('undoes a free answer and shows a spent one', () => {
    expect(cardAction({ ...base, today: 'held', undoable: true }, true)).toBe('undo-done');
    expect(cardAction({ ...base, today: 'repaired', undoable: false }, true)).toBe('held');
    expect(cardAction({ ...base, today: 'frozen' }, true)).toBe('frozen');
  });

  it('gives back a skip and a slip', () => {
    expect(cardAction({ ...base, today: 'skipped', undoable: true }, true)).toBe('undo-skip');
    expect(cardAction({ ...base, today: 'broke', undoable: true }, true)).toBe('undo-slip');
  });

  it('gives an avoid habit a slip toggle and nothing else', () => {
    expect(cardAction({ ...base, avoid: true }, true)).toBe('slip');
    expect(cardAction({ ...base, avoid: true, today: 'held' }, true)).toBe('slip');
    expect(cardAction({ ...base, avoid: true, slippedToday: true }, true)).toBe('unslip');
  });

  it('has nothing on a rest day', () => {
    expect(cardAction({ ...base, today: 'rest' }, true)).toBe('none');
  });
});

describe('openDayRing', () => {
  it('rings an open day in the accent and a skipped one quietly', () => {
    expect(openDayRing(base)).toBe('accent');
    expect(openDayRing({ ...base, today: 'skipped' })).toBe('muted');
    expect(openDayRing({ ...base, today: 'held' })).toBeNull();
    expect(openDayRing({ ...base, today: 'rest' })).toBeNull();
  });

  it('keeps ringing a weekly counter until the week is met', () => {
    const logged = { ...counter, today: 'held' as const, weekly: true, weekAmount: 5, weekTarget: 20 };
    expect(openDayRing(logged)).toBe('accent');
    expect(openDayRing({ ...logged, weekAmount: 20 })).toBeNull();
  });
});

describe('counterLine', () => {
  it('names the day on a daily counter', () => {
    expect(
      counterLine({ weekly: false, amount: 3, target: 8, weekAmount: 0, weekTarget: 0, unit: 'glasses' }),
    ).toBe('3 / 8 glasses today');
  });

  it('leads with the week on a weekly one', () => {
    const line = { weekly: true, amount: 0, target: 20, weekAmount: 4, weekTarget: 20, unit: 'pushups' };
    expect(counterLine(line)).toBe('4 / 20 pushups this week');
    expect(counterLine({ ...line, amount: 2 })).toBe('4 / 20 pushups this week · 2 today');
  });
});

describe('jumps', () => {
  const deltas = (list: ReturnType<typeof jumps>) => list.map((jump) => jump.delta);

  it('scales with the target and never offers a one', () => {
    expect(deltas(jumps(20, 'more', 0, Infinity))).toEqual([5, 10]);
    expect(deltas(jumps(200, 'more', 0, Infinity))).toEqual([20, 50, 75, 100]);
    expect(deltas(jumps(8, 'more', 0, Infinity))).toEqual([2, 4]);
  });

  it('offers nothing when the target is too small for a jump', () => {
    expect(jumps(1, 'more', 0, Infinity)).toEqual([]);
    expect(jumps(2, 'less', 5, 0)).toEqual([]);
  });

  it('takes off with a negative delta', () => {
    expect(deltas(jumps(20, 'less', 12, 8))).toEqual([-5, -10]);
  });

  it('switches off a jump the room cannot take, rather than dropping it', () => {
    expect(jumps(20, 'more', 14, 6)).toEqual([
      { delta: 5, enabled: true },
      { delta: 10, enabled: false },
    ]);
    expect(jumps(20, 'more', 20, 0).every((jump) => !jump.enabled)).toBe(true);
  });

  it('switches off taking off more than is logged', () => {
    expect(jumps(20, 'less', 7, 13)).toEqual([
      { delta: -5, enabled: true },
      { delta: -10, enabled: false },
    ]);
  });

  it('has no ceiling when the habit may run past its target', () => {
    expect(jumps(20, 'more', 40, Infinity).every((jump) => jump.enabled)).toBe(true);
  });
});

describe('weekFilled', () => {
  // 2026-09-14 is a Monday.
  it('counts the answered days of the week so far', () => {
    const entries = {
      '2026-09-13': 'held' as const,
      '2026-09-14': 'held' as const,
      '2026-09-15': 'frozen' as const,
      '2026-09-16': 'skipped' as const,
      '2026-09-18': 'held' as const,
    };
    // Sunday the 13th is last week; the skip fills nothing; Friday has not come yet.
    expect(weekFilled(entries, '2026-09-17')).toBe(2);
    expect(weekFilled(entries, '2026-09-20')).toBe(3);
  });
});
