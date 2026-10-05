import { boardRow } from '@/features/habits/boardRow';
import { normalizeHabit, type HabitRow } from '@/lib/habitRow';
import type { EntryMap } from '@/lib/streak';

const ROW: HabitRow = {
  id: 'h1',
  phases: [],
  cadence_per_week: 3,
  user_id: 'u1',
  name: 'no sugar',
  mark: 'sweep',
  kind: 'avoid',
  target: 1,
  target_period: 'day',
  allow_exceed: false,
  unit: '',
  cadence_kind: 'daily',
  cadence_days: [],
  cadence_every: 2,
  challenge: 'open',
  nudge_window: 'anytime',
  times: [],
  escalate: false,
  streak_rule: 'strict',
  hard: false,
  public_shelf: false,
  pledge: '',
  why: '',
  started_on: '2026-09-20',
  archived_at: null,
  sort: 0,
};

const TODAY = '2026-10-03';
const YESTERDAY = '2026-10-02';

function row(kind: HabitRow['kind'], entries: EntryMap) {
  return boardRow(normalizeHabit({ ...ROW, kind }), {
    raw: entries,
    entries,
    amounts: {},
    today: TODAY,
    hoursLeft: 10,
  });
}

describe('boardRow ring', () => {
  it('counts an avoid habit held today while nothing has slipped today', () => {
    const slippedYesterday = row('avoid', { [YESTERDAY]: 'broke' });
    expect(slippedYesterday.today).toBe('broke');
    expect(slippedYesterday.ring).toBe('held');
  });

  it('takes an avoid habit off the ring the day a slip is logged', () => {
    const slippedToday = row('avoid', { [TODAY]: 'broke' });
    expect(slippedToday.today).toBe('held');
    expect(slippedToday.ring).toBe('broke');
  });

  it('reads the ring off the same day as the row on everything else', () => {
    expect(row('do', {}).ring).toBe('due');
    expect(row('do', { [TODAY]: 'held' }).ring).toBe('held');
    expect(row('do', { [YESTERDAY]: 'broke' }).ring).toBe('due');
  });
});

describe('boardRow tokens', () => {
  // Fourteen held days, 2026-09-20 through today.
  const fortnight: EntryMap = {};
  for (let day = 20; day <= 33; day++) {
    const date = day <= 30 ? `2026-09-${day}` : `2026-10-0${day - 30}`;
    fortnight[date] = 'held';
  }

  function wallet(entries: EntryMap, spent: number) {
    return boardRow(normalizeHabit({ ...ROW, kind: 'check' }), {
      raw: entries,
      entries,
      amounts: {},
      today: TODAY,
      hoursLeft: 10,
      spent,
    });
  }

  it('earns a token on fourteen held days of its own', () => {
    const earned = wallet(fortnight, 0);
    expect(earned.tokens).toBe(1);
    expect(earned.tokensToNext).toBe(14);
  });

  it('pays only out of its own wallet', () => {
    expect(wallet(fortnight, 1).tokens).toBe(0);
  });

  it('does not earn on a day a token repaired', () => {
    const patched = wallet({ ...fortnight, '2026-09-25': 'repaired' }, 1);
    expect(patched.tokens).toBe(0);
    expect(patched.tokensToNext).toBe(1);
  });
});
