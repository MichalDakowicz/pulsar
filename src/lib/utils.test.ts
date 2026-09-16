import { errorMessage, monogram, plural, readError } from '@/lib/utils';

/** What supabase-js actually throws: a plain object, not an Error. */
const postgrest = (message: string, extra: Record<string, unknown> = {}) => ({
  code: '42703',
  details: null,
  hint: null,
  message,
  ...extra,
});

describe('errorMessage', () => {
  it('reads an Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  // The bug this exists for: `String(postgrestError)` is "[object Object]", so
  // the one useful fact — which column is missing — never reached the toast.
  it('reads a PostgrestError, which is not an Error', () => {
    expect(errorMessage(postgrest('column habits.target_period does not exist'))).toBe(
      'column habits.target_period does not exist',
    );
  });

  it('falls back to details, then hint, when there is no message', () => {
    expect(errorMessage({ message: '', details: 'the detail' })).toBe('the detail');
    expect(errorMessage({ message: '', details: null, hint: 'the hint' })).toBe('the hint');
  });

  it('is empty rather than "[object Object]" when there is nothing to say', () => {
    expect(errorMessage({})).toBe('');
    expect(errorMessage(null)).toBe('');
    expect(errorMessage(undefined)).toBe('');
  });

  it('passes a plain string through', () => {
    expect(errorMessage('just a string')).toBe('just a string');
  });
});

describe('readError', () => {
  // A missing table on a read and a missing column on a write are the same
  // fact with the same fix, so they get the same sentence.
  it('names the migration for a missing relation', () => {
    expect(readError(new Error('relation "public.habits" does not exist'))).toMatch(/migration behind/);
  });

  it('names the migration for a missing column on a write', () => {
    expect(readError(postgrest('column habits.target_period does not exist'))).toMatch(/migration behind/);
  });

  // Matched on the code, not the prose: the server is free to reword the
  // sentence and the code is the contract.
  it('names the migration for a stale schema cache', () => {
    expect(readError(postgrest("Could not find the 'allow_exceed' column", { code: 'PGRST204' }))).toMatch(
      /migration behind/,
    );
    expect(readError(new Error('PGRST205'))).toMatch(/migration behind/);
  });

  it('passes an unrelated failure through in the server’s own words', () => {
    expect(readError(postgrest('new row violates row-level security policy', { code: '42501' }))).toBe(
      'new row violates row-level security policy',
    );
  });

  it('has something to say when the error carried nothing at all', () => {
    expect(readError({})).toMatch(/connection dropped/);
  });
});

describe('monogram', () => {
  it('takes the first letter, uppercased', () => {
    expect(monogram('michal')).toBe('M');
    expect(monogram('  ada ')).toBe('A');
  });

  it('falls back to a question mark on nothing', () => {
    expect(monogram('')).toBe('?');
    expect(monogram(null)).toBe('?');
    expect(monogram(undefined)).toBe('?');
  });
});

describe('plural', () => {
  it('agrees with the number', () => {
    expect(plural(1, 'habit')).toBe('1 habit');
    expect(plural(4, 'habit')).toBe('4 habits');
    expect(plural(0, 'habit')).toBe('0 habits');
  });

  it('takes an irregular plural', () => {
    expect(plural(2, 'entry', 'entries')).toBe('2 entries');
  });
});
