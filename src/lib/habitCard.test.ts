import { bigStep, cardAction, cardTone, counterLine, isDone, openDayRing, type CardInput } from '@/lib/habitCard';

const base: CardInput = {
  today: 'due',
  atRisk: false,
  undoable: false,
  weekly: false,
  weekAmount: 0,
  weekTarget: 0,
};

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
    const logged = { ...base, today: 'held' as const, weekly: true, weekAmount: 5, weekTarget: 20 };
    expect(cardTone(logged)).toBe('open');
    expect(cardTone({ ...logged, weekAmount: 20 })).toBe('done');
  });
});

describe('isDone', () => {
  it('ignores a weekly habit with no target', () => {
    expect(isDone({ ...base, weekly: true })).toBe(false);
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
    const logged = { ...base, today: 'held' as const, weekly: true, weekAmount: 5, weekTarget: 20 };
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

describe('bigStep', () => {
  it('scales with the target', () => {
    expect(bigStep(20)).toBe(10);
    expect(bigStep(200)).toBe(100);
    expect(bigStep(1)).toBe(1);
  });
});
