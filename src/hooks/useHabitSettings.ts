import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  DEFAULT_HABIT_SETTINGS,
  habitSettingsToRow,
  normalizeHabitSettings,
  type HabitSettings,
  type HabitSettingsRow,
} from '@/lib/habitSettings';
import { supabase } from '@/lib/supabase';

/** Pulsar's own `public.habit_settings` row. Owner-only, created on first write. */

function key(userId: string | undefined) {
  return ['habit-settings', userId] as const;
}

async function fetchHabitSettings(userId: string): Promise<HabitSettings> {
  const { data, error } = await supabase
    .from('habit_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return normalizeHabitSettings(data as HabitSettingsRow | null);
}

export function useHabitSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = key(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchHabitSettings(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<HabitSettings>) => {
      if (!user) throw new Error('Not signed in');
      const row = habitSettingsToRow(patch);
      if (Object.keys(row).length === 0) return;
      const { error } = await supabase
        .from('habit_settings')
        .upsert({ user_id: user.id, ...row }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HabitSettings>(queryKey);
      queryClient.setQueryData<HabitSettings>(queryKey, {
        ...(previous ?? DEFAULT_HABIT_SETTINGS),
        ...patch,
      });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    settings: query.data ?? DEFAULT_HABIT_SETTINGS,
    loading: query.isLoading,
    updateSettings: (patch: Partial<HabitSettings>) => mutation.mutateAsync(patch),
    saving: mutation.isPending,
  };
}
