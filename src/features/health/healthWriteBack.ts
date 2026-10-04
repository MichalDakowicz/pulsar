import { canWrite } from '@/features/health/healthConnect';
import { readOwn, removeOwn, writeOwn } from '@/features/health/healthWrite';
import { activeLink } from '@/lib/healthLink';
import { isWriteBack, nextOwnValue, ownRecordId, unitValue } from '@/lib/healthWriteBack';
import type { Habit } from '@/types/habit';

/**
 * Passes one hand-logged change on a water or mindfulness habit back to Health
 * Connect. Called after the entry is saved, never by the sync — the sync's
 * writes came *from* Health Connect, and echoing them back is how a glass
 * becomes two.
 *
 * Quiet on failure: the habit is already saved, and a phone that cannot write
 * back has lost nothing Pulsar was keeping.
 */
export async function writeBack(habit: Habit, day: string, before: number, after: number): Promise<void> {
  const link = activeLink(habit);
  if (!link || !isWriteBack(link.source) || before === after) return;
  const source = link.source;
  try {
    if (!(await canWrite(source))) return;
    const id = ownRecordId(habit.id, day);
    const own = await readOwn(source, day, id);
    const next = nextOwnValue(own, before, after, unitValue(source, habit.unit));
    if (next === own) return;
    if (next <= 0) await removeOwn(source, id);
    else await writeOwn(source, habit.id, day, next);
  } catch (error) {
    console.warn('health connect write-back failed', error);
  }
}
