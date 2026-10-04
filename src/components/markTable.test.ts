import { MARK_GROUPS, MARKS, markFor, marksIn } from '@/components/markTable';

// The keys stored in `habits.mark` before the table grew. They must stay, in
// this order, at the head of the table: an existing habit points at one.
const FIRST = [
  'dot', 'ring', 'pulse', 'bars', 'sweep', 'moon', 'drop', 'check',
  'flame', 'heart', 'book', 'fork', 'weight', 'bike', 'leaf', 'sun',
  'cup', 'bolt', 'wallet', 'phone', 'note', 'pen', 'clock', 'ban',
];

describe('mark table', () => {
  it('only ever appends', () => {
    expect(MARKS.slice(0, FIRST.length).map((mark) => mark.key)).toEqual(FIRST);
  });

  it('has one row per key', () => {
    const keys = MARKS.map((mark) => mark.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('puts every mark in exactly one section the picker shows', () => {
    const shown = MARK_GROUPS.flatMap((group) => marksIn(group).map((mark) => mark.key));
    expect(shown.sort()).toEqual(MARKS.map((mark) => mark.key).sort());
    for (const group of MARK_GROUPS) expect(marksIn(group).length).toBeGreaterThan(0);
  });

  it('falls back to the pulse for a key it does not know', () => {
    expect(markFor('pill').key).toBe('pill');
    expect(markFor('gone').key).toBe('pulse');
  });
});
