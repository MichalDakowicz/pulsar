import {
  cadenceOn,
  changedRules,
  currentPhaseFrom,
  isTargetDayOn,
  normalizePhases,
  phasesAfterChange,
  ruleOn,
  rulesChanged,
  targetDaysOn,
  targetOn,
  type Phase,
} from '@/lib/phases';
import type { Cadence } from '@/lib/schedule';

const DAILY: Cadence = { kind: 'daily' };
const WEEKDAYS: Cadence = { kind: 'weekdays' };

/** Mon 2026-09-07 … Sun 2026-09-13. */
const START = '2026-09-01';

const SEALED: Phase = {
  from: START,
  to: '2026-09-09',
  cadence: DAILY,
  rule: 'strict',
  target: 4,
};

const HABIT = {
  startedOn: START,
  cadence: WEEKDAYS,
  rule: 'grace' as const,
  target: 8,
  phases: [SEALED],
};

describe('rulesOn', () => {
  it('reads a sealed day off its phase', () => {
    expect(cadenceOn(HABIT, '2026-09-05')).toEqual(DAILY);
    expect(ruleOn(HABIT, '2026-09-05')).toBe('strict');
    expect(targetOn(HABIT, '2026-09-05')).toBe(4);
  });

  it('reads a day past the phase off the habit itself', () => {
    expect(cadenceOn(HABIT, '2026-09-10')).toEqual(WEEKDAYS);
    expect(ruleOn(HABIT, '2026-09-10')).toBe('grace');
    expect(targetOn(HABIT, '2026-09-10')).toBe(8);
  });

  it('includes both ends of the phase — the boundary days are the ones that bite', () => {
    expect(ruleOn(HABIT, SEALED.from)).toBe('strict');
    expect(ruleOn(HABIT, SEALED.to)).toBe('strict');
    expect(ruleOn(HABIT, '2026-09-10')).toBe('grace');
  });

  it('falls through to the habit when it has no phases at all', () => {
    expect(cadenceOn({ cadence: WEEKDAYS }, '2026-09-05')).toEqual(WEEKDAYS);
    expect(targetOn({ target: 3 }, '2026-09-05')).toBe(3);
  });
});

describe('isTargetDayOn', () => {
  it('owes a sealed Saturday that the current cadence would not', () => {
    // 2026-09-05 is a Saturday inside the daily phase; 2026-09-12 is a Saturday
    // after it, under weekdays.
    expect(isTargetDayOn(HABIT, '2026-09-05')).toBe(true);
    expect(isTargetDayOn(HABIT, '2026-09-12')).toBe(false);
  });
});

describe('targetDaysOn', () => {
  it('switches cadence mid-walk', () => {
    const days = targetDaysOn(HABIT, '2026-09-04', '2026-09-14');
    // Daily through the 9th, weekdays after: the 12th and 13th drop out.
    expect(days).toContain('2026-09-05');
    expect(days).toContain('2026-09-06');
    expect(days).not.toContain('2026-09-12');
    expect(days).not.toContain('2026-09-13');
    expect(days).toContain('2026-09-14');
  });

  it('matches the plain walk when nothing was ever sealed', () => {
    const phased = targetDaysOn({ cadence: WEEKDAYS, phases: [] }, '2026-09-07', '2026-09-13');
    expect(phased).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
    ]);
  });
});

describe('phasesAfterChange', () => {
  const habit = { startedOn: START, cadence: DAILY, rule: 'strict' as const, target: 1, phases: [] };

  it('seals the old rules up to the day before the change', () => {
    const phases = phasesAfterChange(habit, 'from-now', '2026-09-10');
    expect(phases).toHaveLength(1);
    expect(phases[0]).toEqual({
      from: START,
      to: '2026-09-09',
      cadence: DAILY,
      rule: 'strict',
      target: 1,
    });
  });

  it('leaves the change day itself to the new rules', () => {
    const phases = phasesAfterChange(habit, 'from-now', '2026-09-10');
    expect(isTargetDayOn({ cadence: WEEKDAYS, phases }, '2026-09-09')).toBe(true);
    // 2026-09-12 is a Saturday under the new weekday cadence, so not owed.
    expect(isTargetDayOn({ cadence: WEEKDAYS, phases }, '2026-09-12')).toBe(false);
  });

  it('drops every phase for a whole-run correction', () => {
    expect(phasesAfterChange({ ...habit, phases: [SEALED] }, 'whole-run', '2026-09-10')).toEqual([]);
  });

  it('seals nothing when the change lands on the day the run started', () => {
    expect(phasesAfterChange(habit, 'from-now', START)).toEqual([]);
  });

  it('chains a second change behind the first', () => {
    const first = phasesAfterChange(habit, 'from-now', '2026-09-10');
    const second = phasesAfterChange(
      { startedOn: START, cadence: WEEKDAYS, rule: 'grace', target: 8, phases: first },
      'from-now',
      '2026-09-20',
    );
    expect(second).toHaveLength(2);
    expect(second[1].from).toBe('2026-09-10');
    expect(second[1].to).toBe('2026-09-19');
    expect(second[1].rule).toBe('grace');
  });

  it('leaves no gap between a sealed phase and the next one', () => {
    const chained = phasesAfterChange(
      { startedOn: START, cadence: WEEKDAYS, rule: 'grace', target: 8, phases: [SEALED] },
      'from-now',
      '2026-09-20',
    );
    expect(chained[1].from).toBe('2026-09-10');
    expect(currentPhaseFrom({ startedOn: START, phases: chained })).toBe('2026-09-20');
  });
});

describe('currentPhaseFrom', () => {
  it('is the start day when nothing has been sealed', () => {
    expect(currentPhaseFrom({ startedOn: START })).toBe(START);
  });

  it('is the day after the last sealed one', () => {
    expect(currentPhaseFrom({ startedOn: START, phases: [SEALED] })).toBe('2026-09-10');
  });
});

describe('changedRules', () => {
  const before = { cadence: DAILY, rule: 'strict' as const, target: 1 };

  it('says nothing changed when nothing did', () => {
    expect(changedRules(before, { ...before })).toEqual([]);
    expect(rulesChanged(before, { ...before })).toBe(false);
  });

  it('compares a days cadence by its days, not by identity', () => {
    const days: Cadence = { kind: 'days', days: [0, 2, 4] };
    expect(rulesChanged({ ...before, cadence: days }, { ...before, cadence: { kind: 'days', days: [0, 2, 4] } })).toBe(
      false,
    );
    expect(rulesChanged({ ...before, cadence: days }, { ...before, cadence: { kind: 'days', days: [0, 2] } })).toBe(
      true,
    );
  });

  it('ignores the interval anchor, which moves with the habit rather than the rule', () => {
    const a: Cadence = { kind: 'interval', every: 3, anchor: '2026-01-01' };
    const b: Cadence = { kind: 'interval', every: 3, anchor: '2026-06-01' };
    expect(rulesChanged({ ...before, cadence: a }, { ...before, cadence: b })).toBe(false);
  });

  it('names each of the three that moved', () => {
    expect(changedRules(before, { cadence: WEEKDAYS, rule: 'grace', target: 8 })).toEqual([
      'when it is due',
      'what a miss costs',
      'the target',
    ]);
  });
});

describe('normalizePhases', () => {
  it('drops anything that is not a closed stretch', () => {
    expect(normalizePhases(null)).toEqual([]);
    expect(normalizePhases('[]')).toEqual([]);
    expect(normalizePhases([{ from: '2026-09-01' }])).toEqual([]);
    expect(normalizePhases([{ from: 'yesterday', to: '2026-09-09', cadence: DAILY }])).toEqual([]);
    // Backwards: `to` before `from` would claim every day and none of them.
    expect(normalizePhases([{ from: '2026-09-09', to: '2026-09-01', cadence: DAILY }])).toEqual([]);
    expect(normalizePhases([{ from: '2026-09-01', to: '2026-09-09', cadence: { kind: 'sometimes' } }])).toEqual([]);
  });

  it('keeps a good phase and fills in what a bad field would have said', () => {
    const [phase] = normalizePhases([
      { from: START, to: '2026-09-09', cadence: { kind: 'days', days: [4, 0, 0, 9] }, rule: 'nonsense', target: -3 },
    ]);
    expect(phase.cadence).toEqual({ kind: 'days', days: [0, 4] });
    expect(phase.rule).toBe('strict');
    expect(phase.target).toBe(1);
  });

  it('sorts phases and drops one that overlaps the phase before it', () => {
    const phases = normalizePhases([
      { from: '2026-09-10', to: '2026-09-19', cadence: DAILY },
      { from: START, to: '2026-09-09', cadence: WEEKDAYS },
      { from: '2026-09-15', to: '2026-09-25', cadence: DAILY },
    ]);
    expect(phases.map((phase) => phase.from)).toEqual([START, '2026-09-10']);
  });

  it('anchors an interval phase that lost its anchor', () => {
    const [phase] = normalizePhases([
      { from: START, to: '2026-09-09', cadence: { kind: 'interval', every: 3 } },
    ]);
    expect(phase.cadence).toEqual({ kind: 'interval', every: 3, anchor: START });
  });
});
