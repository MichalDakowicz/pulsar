import { blankBuilder, blocker, builderTarget, clauseBlocker, nextClause, toHabitDraft, type BuilderState } from '@/lib/builder';
import {
  amountOptions,
  minuteOptions,
  rhythmOf,
  rhythmOptions,
  strictnessOf,
  toggleTime,
  withChecks,
  withKind,
  withRhythm,
  withStepTime,
  withStrictness,
  withWindow,
} from '@/lib/builderEdits';
import { sentence, strictnessCaption, suggestedPledge } from '@/lib/builderWords';

const named = (patch: Partial<BuilderState> = {}): BuilderState => ({ ...blankBuilder(), name: 'walk', ...patch });
const water = () => withKind(named({ name: 'water' }), 'count');

describe('clause gates', () => {
  it('will not leave the name clause unnamed', () => {
    expect(clauseBlocker(named({ name: '  ' }), 'name')).toBe('give it a name first.');
    expect(clauseBlocker(named(), 'name')).toBeNull();
  });

  it('asks a counter what it counts, and nothing else for a unit', () => {
    expect(clauseBlocker({ ...water(), unit: ' ' }, 'measure')).toBe('say what you are counting.');
    expect(clauseBlocker(named({ unit: '' }), 'measure')).toBeNull();
  });

  it('will not let a habit that can never come due through', () => {
    expect(clauseBlocker(named({ cadence: { kind: 'days', days: [] } }), 'rhythm')).toBe(
      'pick at least one day, or it can never come due.',
    );
  });

  it('wants a time on a clock, or no clock', () => {
    expect(clauseBlocker(named({ window: 'exact', times: [] }), 'nudge')).toBe('pick a time, or switch nudges off.');
    expect(clauseBlocker(withWindow(named(), 'anytime'), 'nudge')).toBeNull();
  });

  it('reports the first blocker in clause order', () => {
    expect(blocker(named({ name: '', times: [] }))).toBe('give it a name first.');
    expect(blocker(named())).toBeNull();
  });

  it('walks the clauses in order and stops at the last', () => {
    expect(nextClause('name')).toBe('measure');
    expect(nextClause('stakes')).toBeNull();
  });
});

describe('rhythm', () => {
  it('offers a weekly total only to something that adds up', () => {
    expect(rhythmOptions(named())).not.toContain('total');
    expect(rhythmOptions(water())).toContain('total');
  });

  it('gives a counter the weekly total instead of a quota of days', () => {
    expect(rhythmOptions(water())).not.toContain('weekly');
    expect(rhythmOptions(named())).toContain('weekly');
  });

  it('keeps a quota on an older counter that already has one', () => {
    const legacy = { ...water(), cadence: { kind: 'weekly' as const, perWeek: 3 } };
    expect(rhythmOptions(legacy)).toContain('weekly');
  });

  it('carries the number across when the target moves onto the week', () => {
    const week = withRhythm(water(), 'total');
    expect(rhythmOf(week)).toBe('total');
    expect(week.amount).toBe(56);
    expect(week.targetPeriod).toBe('week');
    const back = withRhythm(week, 'daily');
    expect(back.amount).toBe(8);
    expect(back.targetPeriod).toBe('day');
  });

  it('scales by the days the cadence actually asks for', () => {
    const weekdays = withRhythm(water(), 'weekdays');
    expect(withRhythm(weekdays, 'total').amount).toBe(40);
  });

  it('walks a total back to a day when the kind can no longer add up', () => {
    const checked = withKind(withRhythm(water(), 'total'), 'do');
    expect(checked.targetPeriod).toBe('day');
    expect(rhythmOf(checked)).toBe('daily');
    expect(checked.amount).toBe(8);
  });

  it('never leaves an avoid habit on a quota or an interval', () => {
    const gym = withRhythm(named(), 'weekly');
    expect(rhythmOf(withKind(gym, 'avoid'))).toBe('daily');
    expect(rhythmOptions(withKind(named(), 'avoid'))).not.toContain('interval');
  });

  it('turns a quota of checks into a weekly total when it becomes a counter', () => {
    expect(rhythmOf(withKind(withRhythm(named(), 'weekly'), 'count'))).toBe('total');
  });
});

describe('checks a day', () => {
  it('gives each check its own reminder', () => {
    const meds = withChecks(named({ name: 'meds' }), 2);
    expect(meds.times).toEqual(['08:00', '22:00']);
    expect(withStepTime(meds, 1, '23:00').times).toEqual(['08:00', '23:00']);
  });

  it('takes the quota week off a habit checked twice a day', () => {
    const meds = withChecks(withRhythm(named(), 'weekly'), 2);
    expect(rhythmOf(meds)).toBe('daily');
    expect(rhythmOptions(meds)).not.toContain('weekly');
  });

  it('drops back to one check when the habit stops being a check', () => {
    expect(withKind(withChecks(named(), 2), 'count').checksPerDay).toBe(1);
  });

  it('keeps no clock when the nudges are off', () => {
    expect(withChecks(withWindow(named(), 'anytime'), 2).times).toEqual([]);
  });
});

describe('nudges', () => {
  it('fills the time a window implies', () => {
    expect(withWindow(named(), 'evening').times).toEqual(['19:00']);
  });

  it('adds and drops times in order', () => {
    const state = toggleTime(named({ times: ['12:00'] }), '07:00');
    expect(state.times).toEqual(['07:00', '12:00']);
    expect(toggleTime(state, '12:00').times).toEqual(['07:00']);
  });
});

describe('strictness', () => {
  it('reads the rule and hard mode as one stop', () => {
    expect(strictnessOf({ hard: false, rule: 'decay' })).toBe('gentle');
    expect(strictnessOf({ hard: false, rule: 'grace' })).toBe('fair');
    expect(strictnessOf({ hard: true, rule: 'grace' })).toBe('hard');
  });

  it('sets both fields from a stop', () => {
    expect(withStrictness(named(), 'hard')).toMatchObject({ hard: true, rule: 'strict' });
    expect(withStrictness(named({ hard: true }), 'fair')).toMatchObject({ hard: false, rule: 'grace' });
  });

  it('speaks in weeks to a habit judged by the week', () => {
    expect(strictnessCaption('fair', true)).toContain('short week');
    expect(strictnessCaption('fair', false)).toContain('first miss of each week');
  });
});

describe('the sentence', () => {
  it('reads the draft back clause by clause', () => {
    const words = sentence(withWindow(water(), 'morning'));
    expect(words).toEqual({
      name: 'water',
      measure: '8 glasses',
      rhythm: 'every day',
      nudge: 'nudged in the morning',
      stakes: 'a miss ends it',
    });
  });

  it('says a weekly total over the week, and its stakes in weeks', () => {
    const words = sentence(withRhythm(water(), 'total'));
    expect(words.measure).toBe('56 glasses');
    expect(words.rhythm).toBe('over the week');
    expect(words.stakes).toBe('a short week ends it');
  });

  it('names a habit checked twice a day', () => {
    expect(sentence(withChecks(named(), 2)).measure).toBe('twice a day');
  });

  it('writes a pledge in weeks for a weekly total', () => {
    expect(suggestedPledge(withRhythm(water(), 'total'))).toBe(
      'i will do water 56 glasses a week, and if i miss one, it goes back to zero and i start again.',
    );
  });
});

describe('toHabitDraft', () => {
  it('reads the right field for the target, and never zero', () => {
    expect(builderTarget({ ...water(), amount: 0 })).toBe(1);
    expect(builderTarget(withKind(named({ minutes: 20 }), 'timer'))).toBe(20);
  });

  it('saves a weekly total as a week-scoped target on any day', () => {
    const draft = toHabitDraft(withRhythm(water(), 'total'));
    expect(draft).toMatchObject({ target: 56, targetPeriod: 'week', cadence: { kind: 'daily' } });
  });

  it('saves the checks and one time per check', () => {
    const draft = toHabitDraft(withChecks(named({ name: 'meds' }), 2));
    expect(draft.checksPerDay).toBe(2);
    expect(draft.times).toEqual(['08:00', '22:00']);
  });

  it('keeps no times and no unit where they mean nothing', () => {
    const draft = toHabitDraft(withWindow(named({ unit: 'glasses' }), 'anytime'));
    expect(draft.times).toEqual([]);
    expect(draft.unit).toBe('');
  });

  it('forces hard mode strict', () => {
    expect(toHabitDraft(named({ hard: true, rule: 'grace' })).rule).toBe('strict');
  });
});

describe('chip options', () => {
  it('offers week-sized numbers on a weekly total', () => {
    expect(amountOptions({ amount: 8, targetPeriod: 'day' })).toContain(8);
    expect(amountOptions({ amount: 50, targetPeriod: 'week' })).toEqual([5, 10, 15, 20, 30, 50, 70, 100]);
  });

  it('always has a chip for the value already there', () => {
    expect(amountOptions({ amount: 56, targetPeriod: 'week' })).toContain(56);
    expect(minuteOptions({ minutes: 140, targetPeriod: 'week' })).toEqual([30, 60, 90, 120, 140, 180, 300]);
  });
});
