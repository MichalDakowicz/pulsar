import {
  DEFAULT_HABIT_SETTINGS,
  followUpCount,
  habitSettingsToRow,
  inQuietHours,
  normalizeHabitSettings,
} from '@/lib/habitSettings';

describe('normalizeHabitSettings', () => {
  it('falls back to defaults for a row written before a column existed', () => {
    const settings = normalizeHabitSettings({
      nudge_level: null,
      escalate: null,
      risk_alerts: null,
      partner_nudges: null,
      quiet_hours: null,
      quiet_start: null,
      quiet_end: null,
      checkin_mode: null,
      reading_weekly_goal: null,
      show_sibling_streaks: null,
      onboarded_at: null,
    });
    expect(settings).toEqual(DEFAULT_HABIT_SETTINGS);
  });

  it('rejects a nudge level it does not recognise', () => {
    const settings = normalizeHabitSettings({ nudge_level: 'shouty' } as never);
    expect(settings.nudgeLevel).toBe('firm');
  });
});

describe('habitSettingsToRow', () => {
  it('emits only what was patched', () => {
    expect(habitSettingsToRow({ riskAlerts: false })).toEqual({ risk_alerts: false });
    expect(habitSettingsToRow({})).toEqual({});
  });
});

describe('inQuietHours', () => {
  const settings = { ...DEFAULT_HABIT_SETTINGS, quietStart: 23, quietEnd: 7 };

  it('wraps midnight', () => {
    expect(inQuietHours(settings, 23)).toBe(true);
    expect(inQuietHours(settings, 3)).toBe(true);
    expect(inQuietHours(settings, 7)).toBe(false);
    expect(inQuietHours(settings, 12)).toBe(false);
  });

  it('handles a window inside one day', () => {
    const day = { ...settings, quietStart: 9, quietEnd: 17 };
    expect(inQuietHours(day, 12)).toBe(true);
    expect(inQuietHours(day, 20)).toBe(false);
  });

  it('is off when the switch is off', () => {
    expect(inQuietHours({ ...settings, quietHours: false }, 3)).toBe(false);
  });
});

describe('followUpCount', () => {
  it('gives gentle no follow-ups whatever the escalate flag says', () => {
    expect(followUpCount({ ...DEFAULT_HABIT_SETTINGS, nudgeLevel: 'gentle', escalate: true })).toBe(0);
  });

  it('escalates once at firm and twice at relentless', () => {
    expect(followUpCount({ ...DEFAULT_HABIT_SETTINGS, nudgeLevel: 'firm' })).toBe(1);
    expect(followUpCount({ ...DEFAULT_HABIT_SETTINGS, nudgeLevel: 'relentless' })).toBe(2);
  });
});
