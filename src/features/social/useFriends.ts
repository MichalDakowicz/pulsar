import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchProfiles } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/profile';

/**
 * Your friends — Radar's `public.friendships`, read as-is.
 *
 * Accepting a request in any of the four apps makes you friends in all four, so
 * Pulsar never grows a friend list of its own and never writes this table. The
 * only social relationship Pulsar owns is the pact, which sits *on top* of a
 * friendship and cannot exist without one (see the insert policy in schema.sql).
 */
export function useFriends() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      const ids = (data as { friend_id: string }[]).map((row) => row.friend_id);
      return fetchProfiles(ids);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return { friends: query.data ?? [], loading: query.isLoading, error: query.error };
}
