import clsx, { type ClassValue } from 'clsx';
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
