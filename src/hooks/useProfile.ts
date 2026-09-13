import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/profile';

/**
 * `public.profiles` — Radar's table, and the one identity all four apps share.
 * Renaming yourself here renames you in Radar, Lidar and Sonar, which is the
 * deal (docs/shared-database.md).
 *
 * The select names its columns rather than taking `*`: `favorites` is Radar's
 * film shelf and Pulsar has no business holding it in memory, let alone
 * round-tripping it back on an update.
 */

const COLUMNS = 'id, username, display_name, pfp, created_at';

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  pfp: string | null;
  created_at: string;
};

export function normalizeProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    pfp: row.pfp,
    createdAt: row.created_at,
  };
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeProfile(data as ProfileRow) : null;
}

export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select(COLUMNS).in('id', ids);
  if (error) throw error;
  return (data as ProfileRow[]).map(normalizeProfile);
}

export function useProfile(id: string | undefined) {
  const query = useQuery({
    queryKey: ['profile', id],
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
  return { profile: query.data ?? null, loading: query.isLoading, error: query.error };
}

/**
 * Several profiles at once, as a lookup. For a list that names people it does
 * not own — the pact inbox, the friends strip — one `in` query beats one
 * useProfile per row. Keyed on the sorted id set, so a reordered list is not a
 * new cache entry.
 */
export function useProfileMap(ids: string[]): Map<string, Profile> {
  const unique = [...new Set(ids.filter(Boolean))].sort();
  const query = useQuery({
    queryKey: ['profiles', unique.join(',')],
    queryFn: () => fetchProfiles(unique),
    enabled: unique.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(() => new Map((query.data ?? []).map((profile) => [profile.id, profile])), [query.data]);
}

export type ProfileUpdate = { username: string; displayName: string };

/** Edits your own row. The username is unique in the schema, so a clash is caught first. */
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, displayName }: ProfileUpdate) => {
      if (!user) throw new Error('Not signed in');
      const clean = username.trim().toLowerCase();
      if (!clean) throw new Error('Pick a username.');
      if (!/^[a-z0-9_]+$/.test(clean)) {
        throw new Error('Usernames take lowercase letters, numbers and underscores.');
      }

      const { data: taken, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', user.id)
        .maybeSingle();
      if (checkError) throw checkError;
      if (taken) throw new Error('That username is taken.');

      const { error } = await supabase
        .from('profiles')
        .update({ username: clean, display_name: displayName.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    },
  });
}
