import { blankBuilder, toHabitDraft } from '@/lib/builder';
import { parseDay } from '@/lib/dates';
import { healthReminderGate } from '@/lib/healthReminder';
import type { Habit } from '@/types/habit';

const habit = (patch: Partial<Habit> = {}): Habit => ({
  ...toHabitDraft({ ...blankBuilder(), name: 'steps', kind: 'count', amount: 100, unit: 'steps' }),
  id: 'h', userId: 'u', sort: 0, archivedAt: null, startedOn: '2026-10-01',
  healthLink: { source: 'steps', mode: 'all', activities: [] }, ...patch,
});
const AT = parseDay('2026-10-15').getTime() + 12 * 3600_000;

describe('healthReminderGate', () => {
  it('omits archived and incompatible health links', () => {
    expect(healthReminderGate(habit({ archivedAt: '2026-10-14' }), {}, {}, AT)).toBeNull();
    expect(healthReminderGate(habit({ unit: 'pages' }), {}, {}, AT)).toBeNull();
  });
  it('carries the notification date and preserves protected days', () => {
    const gate = healthReminderGate(habit(), { '2026-10-15': 'frozen' }, { '2026-10-15': 30 }, AT)!;
    expect(gate.through).toBe('2026-10-15');
    expect(gate.days).toEqual([{ day: '2026-10-15', amount: 0, read: false }]);
  });
  it('carries weekly manual amounts as floors for the fresh health reading', () => {
    const gate = healthReminderGate(habit({ targetPeriod: 'week' }), { '2026-10-13': 'held' }, { '2026-10-13': 40 }, AT)!;
    expect(gate.from).toBe('2026-10-12');
    expect(gate.days).toHaveLength(4);
    expect(gate.days[1]).toEqual({ day: '2026-10-13', amount: 40, read: true });
  });
  it('keeps exercise filters and duration modes consistent with the app', () => {
    const gate = healthReminderGate(habit({ kind: 'do', healthLink: { source: 'exercise', mode: 'only', activities: ['strength'], minimumMinutes: 30, minimumMode: 'day' } }), {}, {}, AT)!;
    expect(gate.target).toBe(1);
    expect(gate.minimumMinutes).toBe(30);
    expect(gate.minimumMode).toBe('day');
    expect(gate.exerciseTypes[70]).toBe(true);
    expect(gate.exerciseTypes[79]).toBe(false);
    expect(gate.otherExercise).toBe(false);
  });
});
