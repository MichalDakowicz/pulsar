import { useHabitsRealtime } from '@/features/habits/useHabitsRealtime';

// Renders nothing; mounted once from the root layout so habits have exactly one
// realtime channel however many screens read them.
export function HabitsSync() {
  useHabitsRealtime();
  return null;
}
