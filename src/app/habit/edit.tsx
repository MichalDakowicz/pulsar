import { useLocalSearchParams } from 'expo-router';

import { LoadingState } from '@/components/ui/states';
import { BuilderScreen } from '@/features/builder/BuilderScreen';
import { builderFromHabit } from '@/features/builder/useBuilder';
import { useHabit } from '@/features/habits/useHabits';

/**
 * Editing runs the same five steps as building. The alternative was a flat
 * settings form, which would be the one path into a habit that the builder gates
 * do not guard.
 */
export default function EditHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habit, loading } = useHabit(id);

  if (loading || !habit) return <LoadingState />;
  return <BuilderScreen habitId={habit.id} initial={builderFromHabit(habit)} />;
}
