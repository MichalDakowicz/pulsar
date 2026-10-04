import type { WriteBackSource } from '@/lib/healthWriteBack';

/**
 * Off Android there is no Health Connect to write back to; logging water on
 * the web stays in Pulsar. The real calls are in `healthWrite.android.ts`.
 */

export async function readOwn(_source: WriteBackSource, _day: string, _clientRecordId: string): Promise<number> {
  return 0;
}

export async function writeOwn(_source: WriteBackSource, _habitId: string, _day: string, _value: number): Promise<void> {}

export async function removeOwn(_source: WriteBackSource, _clientRecordId: string): Promise<void> {}
