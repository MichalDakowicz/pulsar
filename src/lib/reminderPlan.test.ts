import { DEFAULT_HABIT_SETTINGS, type HabitSettings } from '@/lib/habitSettings';
import {
  MAX_SCHEDULED,
  planFingerprint,
  planReminders,
  RISK_HOUR,
  type ReminderHabit,
} from '@/lib/reminderPlan';

/** A Wednesday, 06:00 local — before every reminder time the fixtures use. */
const NOW = new Date(2026, 8, 16, 6, 0, 0);
const TODAY = '2026-09-16';

function habit(patch: Partial<ReminderHabit> = {}): ReminderHabit {
  return {
    id: 'h1',
    name: 'water',
    cadence: { kind: 'daily' },
    startedOn: '2026-01-01',
    times: ['08:00'],
    escalate: false,
    target: '',
    pledge: '',
    streak: 0,
    doneToday: false,
    dueToday: true,
    ...patch,
  };
}

function settings(patch: Partial<HabitSettings> = {}): HabitSettings {
  return { ...DEFAULT_HABIT_SETTINGS, quietHours: false, riskAlerts: false, escalate: false, ...patch };
}

function plan(habits: ReminderHabit[], patch: Partial<HabitSettings> = {}) {
  return planReminders({ habits, settings: settings(patch), now: NOW });
}

function hourOf(at: number): number {
  return new Date(at).getHours();
}

describe('planReminders', () => {
  it('lays a due row on every target day in the horizon', () => {
    const rows = plan([habit()]);
    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.kind === 'due')).toBe(true);
    expect(rows.every((row) => hourOf(row.at) === 8)).toBe(true);
  });

  it('keeps the queue in time order', () => {
    const rows = plan([habit({ times: ['08:00', '19:00', '12:30'] })]);
    const times = rows.map((row) => row.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('skips a habit with no clock', () => {
    expect(plan([habit({ times: [] })])).toEqual([]);
  });

  it('drops today entirely once the habit is resolved', () => {
    const rows = plan([habit({ doneToday: true })]);
    expect(rows).toHaveLength(6);
    expect(rows.some((row) => row.id.includes(TODAY))).toBe(false);
  });

  it('never schedules a reminder in the past', () => {
    const rows = plan([habit({ times: ['05:00'] })]);
    expect(rows.every((row) => row.at > NOW.getTime())).toBe(true);
    // Today's 05:00 has gone; the other six days survive.
    expect(rows).toHaveLength(6);
  });

  it('only walks the cadence, so a mon/wed/fri habit rests on tuesday', () => {
    // 0 = Monday. The horizon is Wed 16 -> Tue 22 Sep 2026, so the habit comes
    // due on Wed 16, Fri 18 and Mon 21 and rests on the other four.
    const rows = plan([habit({ cadence: { kind: 'days', days: [0, 2, 4] } })]);
    expect(rows.map((row) => new Date(row.at).getDay())).toEqual([3, 5, 1]);
  });

  it('does not remind before the habit existed', () => {
    const rows = plan([habit({ startedOn: '2026-09-19' })]);
    expect(rows).toHaveLength(4);
    expect(new Date(rows[0].at).getDate()).toBe(19);
  });

  it('silences everything inside quiet hours, wrapping midnight', () => {
    const rows = plan([habit({ times: ['23:30'] })], { quietHours: true, quietStart: 23, quietEnd: 7 });
    expect(rows).toEqual([]);
  });

  it('leaves a reminder outside the quiet window alone', () => {
    const rows = plan([habit({ times: ['09:00'] })], { quietHours: true, quietStart: 23, quietEnd: 7 });
    expect(rows).toHaveLength(7);
  });
});

describe('follow-ups', () => {
  it('adds none at gentle, whatever the habit asked for', () => {
    const rows = plan([habit({ escalate: true })], { nudgeLevel: 'gentle', escalate: true });
    expect(rows.every((row) => row.kind === 'due')).toBe(true);
  });

  it('adds none when the habit itself opted out', () => {
    const rows = plan([habit({ escalate: false })], { nudgeLevel: 'relentless', escalate: true });
    expect(rows.every((row) => row.kind === 'due')).toBe(true);
  });

  it('adds one two hours later at firm', () => {
    const rows = plan([habit({ escalate: true })], { nudgeLevel: 'firm', escalate: true });
    const follows = rows.filter((row) => row.kind === 'follow-up');
    expect(follows).toHaveLength(7);
    expect(hourOf(follows[0].at)).toBe(10);
  });

  it('pins the last one to the risk hour at relentless', () => {
    const rows = plan([habit({ escalate: true })], { nudgeLevel: 'relentless', escalate: true });
    const today = rows.filter((row) => row.id.includes(TODAY) && row.kind === 'follow-up');
    expect(today.map((row) => hourOf(row.at))).toEqual([10, RISK_HOUR]);
  });

  it('refuses a follow-up that would cross midnight', () => {
    // 23:00 + 2h is 01:00 the next morning — a nudge about a day already lost.
    const rows = plan([habit({ times: ['23:00'], escalate: true })], { nudgeLevel: 'firm', escalate: true });
    expect(rows.every((row) => row.kind === 'due')).toBe(true);
  });

  it('counts from the last time of the day, not the first', () => {
    const rows = plan([habit({ times: ['08:00', '18:00'], escalate: true })], {
      nudgeLevel: 'firm',
      escalate: true,
    });
    const follow = rows.find((row) => row.kind === 'follow-up');
    expect(hourOf(follow!.at)).toBe(20);
  });
});

describe('risk warnings', () => {
  it('warns tonight only, never on a future day', () => {
    const rows = plan([habit({ streak: 9 })], { riskAlerts: true });
    const risks = rows.filter((row) => row.kind === 'risk');
    expect(risks).toHaveLength(1);
    expect(risks[0].id).toContain(TODAY);
    expect(hourOf(risks[0].at)).toBe(RISK_HOUR);
  });

  it('says nothing when there is no streak to lose', () => {
    const rows = plan([habit({ streak: 0 })], { riskAlerts: true });
    expect(rows.some((row) => row.kind === 'risk')).toBe(false);
  });

  it('says nothing on a rest day', () => {
    const rows = plan([habit({ streak: 9, dueToday: false })], { riskAlerts: true });
    expect(rows.some((row) => row.kind === 'risk')).toBe(false);
  });

  it('reads the pledge back when there is one', () => {
    const rows = plan([habit({ streak: 9, pledge: 'no excuses on a wednesday' })], { riskAlerts: true });
    const risk = rows.find((row) => row.kind === 'risk');
    expect(risk!.body).toBe('no excuses on a wednesday');
    expect(risk!.title).toBe('water · 9 days on the line');
  });

  it('wins the minute over a follow-up landing on it', () => {
    const rows = plan([habit({ streak: 9, escalate: true })], {
      riskAlerts: true,
      nudgeLevel: 'relentless',
      escalate: true,
    });
    const nine = rows.filter((row) => row.id.includes(TODAY) && hourOf(row.at) === RISK_HOUR);
    expect(nine).toHaveLength(1);
    expect(nine[0].kind).toBe('risk');
  });
});

describe('the cap', () => {
  it('keeps the soonest rows and drops the rest', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      habit({ id: `h${i}`, name: `habit ${i}`, times: ['08:00', '12:00', '18:00'] }),
    );
    const rows = plan(many);
    expect(rows).toHaveLength(MAX_SCHEDULED);
    const times = rows.map((row) => row.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('planFingerprint', () => {
  it('matches for the same plan and differs when a time moves', () => {
    const a = plan([habit()]);
    const b = plan([habit()]);
    const c = plan([habit({ times: ['09:00'] })]);
    expect(planFingerprint(a)).toBe(planFingerprint(b));
    expect(planFingerprint(a)).not.toBe(planFingerprint(c));
  });
});
