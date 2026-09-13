import {
  blankBuilder,
  builderSummary,
  builderTarget,
  stepBlocker,
  suggestedPledge,
  toHabitDraft,
} from '@/features/builder/useBuilder';

describe('stepBlocker', () => {
  it('will not let an unnamed habit past the first step', () => {
    expect(stepBlocker({ ...blankBuilder(), name: '   ' })).toBe('give it a name first.');
    expect(stepBlocker({ ...blankBuilder(), name: 'walk' })).toBeNull();
  });

  it('will not let a habit that can never come due past the target step', () => {
    const state = { ...blankBuilder(), step: 1, name: 'walk', cadence: { kind: 'days' as const, days: [] } };
    expect(stepBlocker(state)).toBe('pick at least one day, or it can never come due.');
  });

  it('will not let an exact-time habit past the nudge step with no time', () => {
    const state = { ...blankBuilder(), step: 2, name: 'walk', window: 'exact' as const, times: [] };
    expect(stepBlocker(state)).toBe('pick a time, or switch the window to anytime.');
  });

  it('lets an anytime habit past with no times at all', () => {
    const state = { ...blankBuilder(), step: 2, name: 'walk', window: 'anytime' as const, times: [] };
    expect(stepBlocker(state)).toBeNull();
  });
});

describe('builderTarget', () => {
  it('reads the right field for each kind', () => {
    expect(builderTarget({ ...blankBuilder(), kind: 'count', amount: 8 })).toBe(8);
    expect(builderTarget({ ...blankBuilder(), kind: 'timer', minutes: 20 })).toBe(20);
    expect(builderTarget({ ...blankBuilder(), kind: 'do' })).toBe(1);
  });

  it('never returns a zero target, which would divide progress by nothing', () => {
    expect(builderTarget({ ...blankBuilder(), kind: 'count', amount: 0 })).toBe(1);
  });
});

describe('toHabitDraft', () => {
  it('drops the reminder times on a habit with no clock', () => {
    const draft = toHabitDraft({ ...blankBuilder(), name: 'walk', window: 'anytime', times: ['08:00'] });
    expect(draft.times).toEqual([]);
  });

  it('forces strict under hard mode', () => {
    const draft = toHabitDraft({ ...blankBuilder(), name: 'walk', hard: true, rule: 'grace' });
    expect(draft.rule).toBe('strict');
  });

  it('clears the unit on a habit that does not count anything', () => {
    const draft = toHabitDraft({ ...blankBuilder(), name: 'walk', kind: 'do', unit: 'glasses' });
    expect(draft.unit).toBe('');
  });
});

describe('builderSummary', () => {
  it('says there are no reminders rather than listing them for an anytime habit', () => {
    const rows = builderSummary({ ...blankBuilder(), name: 'walk', window: 'anytime', times: ['08:00'] });
    expect(rows.find((row) => row.key === 'reminders')?.value).toBe('none — no clock on this one');
  });

  it('never mentions money, because there is none in this app', () => {
    const rows = builderSummary({ ...blankBuilder(), name: 'walk' });
    expect(rows.some((row) => /\$|stake|forfeit/i.test(row.value))).toBe(false);
  });
});

describe('suggestedPledge', () => {
  it('says what a miss actually does under the chosen rule', () => {
    expect(suggestedPledge({ ...blankBuilder(), name: 'walk', rule: 'strict' })).toContain('back to zero');
    expect(suggestedPledge({ ...blankBuilder(), name: 'walk', rule: 'decay' })).toContain('three days');
  });

  it('reads right for an avoid habit', () => {
    expect(suggestedPledge({ ...blankBuilder(), name: 'my phone in bed', kind: 'avoid' })).toContain('stay off');
  });
});
