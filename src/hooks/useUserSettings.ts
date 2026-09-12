import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_SHARED_SETTINGS,
  normalizeShared,
  settingsToRow,
  type SharedSettings,
  type SharedSettingsRow,
  type WritableSettings,
} from '@/lib/userSettings';

/**
 * The shared `public.user_settings` row — Radar's table, read here and written
 * only through `settingsToRow`, which can emit two columns and no others.
 *
 * The row is owner-only (`settings_owner_all`), so this is always your own: a
 * friend's theme and a friend's film streak are not readable and are not meant
 * to be.
 */

export { type FriendsVisibility, type ThemePref } from '@/lib/userSettings';

function settingsKey(userId: string | undefined) {
  return ['shared-settings', userId] as const;
}

async function fetchSettings(userId: string): Promise<SharedSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('theme, friends_visibility, current_streak, streak_updated_at, timezone')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return normalizeShared(data as SharedSettingsRow | null);
}

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = settingsKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSettings(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Radar rewrites `current_streak` from its own app; without this the
  // cross-app strip on Today would show yesterday's film streak until a cold
  // start.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_settings:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const mutation = useMutation({
    mutationFn: async (patch: Partial<WritableSettings>) => {
      if (!user) throw new Error('Not signed in');
      const row = settingsToRow(patch);
      if (Object.keys(row).length === 0) return;
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...row }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SharedSettings>(queryKey);
      queryClient.setQueryData<SharedSettings>(queryKey, {
        ...(previous ?? DEFAULT_SHARED_SETTINGS),
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
    settings: query.data ?? DEFAULT_SHARED_SETTINGS,
    loading: query.isLoading,
    error: query.error,
    updateSettings: (patch: Partial<WritableSettings>) => mutation.mutateAsync(patch),
    saving: mutation.isPending,
  };
}
