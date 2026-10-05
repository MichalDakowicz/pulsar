import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { dateKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { spentByHabit } from '@/lib/tokens';

/**
 * What has been spent out of each habit's wallet, from the ledger.
 *
 * Earning is derived rather than written: each habit's held days are already
 * walked for its streak, so a nightly job that inserts `earned` rows would be
 * a second source of the same truth and would drift the first time it was
 * skipped. Only *spending* is a row, because a spend is an event with a day and
 * a habit attached, and the wall shows it. The balance itself is the board's
 * to work out (`boardRow`), beside the held days it is earned on.
 */

function tokensKey(userId: string | undefined) {
  return ['habit-tokens', userId] as const;
}

type TokenRow = { delta: number; reason: string; day: string; habit_id: string | null };

async function fetchSpent(userId: string): Promise<TokenRow[]> {
  const { data, error } = await supabase
    .from('habit_tokens')
    .select('delta, reason, day, habit_id')
    .eq('user_id', userId)
    .lt('delta', 0);
  if (error) throw error;
  return data as TokenRow[];
}

export function useTokens() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = tokensKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSpent(user!.id),
    enabled: !!user,
  });

  const byHabit = useMemo(() => spentByHabit(query.data ?? []), [query.data]);
  const spent = query.data?.length ?? 0;

  const spend = useMutation({
    mutationFn: async ({ reason, habitId, day }: { reason: 'freeze' | 'repair'; habitId: string; day?: string }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('habit_tokens').insert({
        user_id: user.id,
        delta: -1,
        reason,
        habit_id: habitId,
        day: day ?? dateKey(),
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    /** Tokens spent per habit id. */
    spentByHabit: byHabit,
    spent,
    loading: query.isLoading,
    spendToken: spend.mutateAsync,
    spending: spend.isPending,
  };
}
