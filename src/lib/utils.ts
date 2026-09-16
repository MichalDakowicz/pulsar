import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** First letter of a name, uppercased — the monogram on a tile or an avatar. */
export function monogram(name: string | null | undefined): string {
  return (name ?? '').trim().charAt(0).toUpperCase() || '?';
}

/** "4 habits" / "1 habit". Pluralisation everywhere, in one place. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The sentence inside a thrown thing, whatever shape it arrived in.
 *
 * Supabase does not throw `Error`s. A `PostgrestError` is a plain object with
 * `message`, `code`, `details` and `hint`, so the obvious
 * `error instanceof Error ? error.message : String(error)` falls through to
 * `String({})` and hands back "[object Object]" — which is how the one useful
 * fact about a failed write, the name of the column that is missing, gets
 * thrown away between the database and the toast.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const shape = error as { message?: unknown; details?: unknown; hint?: unknown };
    for (const field of [shape.message, shape.details, shape.hint]) {
      if (typeof field === 'string' && field.trim()) return field;
    }
  }
  return '';
}

/**
 * Turns a Supabase failure into a sentence.
 *
 * The one worth catching by hand is a missing table or column:
 * `supabase/schema.sql` is applied by hand, so a project the file has not been
 * run against answers with "relation does not exist" on a read and "column ...
 * does not exist" on a write. Both mean the same thing and have the same fix,
 * and without this the app renders as a user with no habits rather than as a
 * database that is a migration behind.
 */
/**
 * The codes that mean "the schema is behind", from both layers that can say it.
 *
 * Postgres answers a write against a column it does not have with 42703 and a
 * read against a missing table with 42P01; PostgREST answers the same two from
 * its own cache with PGRST204 and PGRST205. Matched on the code rather than on
 * the sentence, because the sentence is English prose that the server is free
 * to reword and the code is the contract.
 */
const SCHEMA_BEHIND = new Set(['42703', '42P01', 'PGRST204', 'PGRST205']);

export function readError(error: unknown): string {
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  const message = errorMessage(error);
  if ((typeof code === 'string' && SCHEMA_BEHIND.has(code)) || /does not exist|PGRST20[45]|schema cache/i.test(message)) {
    return 'pulsar’s tables are a migration behind. run supabase/schema.sql in the supabase dashboard, then try again.';
  }
  return message || 'the connection dropped somewhere between here and the server.';
}
