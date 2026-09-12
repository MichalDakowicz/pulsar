import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { dateKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { availableTokens, daysToNextToken, earnedTokens } from '@/lib/tokens';

/**
 * The freeze token balance, out of the ledger.
 *
 * Earning is derived rather than written: the number of perfect days is already
 * computed for the awards, so a nightly job that inserts `earned` rows would be
 * a second source of the same truth and would drift the first time it was
 * skipped. Only *spending* is a row, because a spend is an event with a day and
 * a habit attached, and the wall shows it.
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

export function useTokens(perfectDayCount: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = tokensKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSpent(user!.id),
    enabled: !!user,
  });

  const spentRows = useMemo(() => query.data ?? [], [query.data]);
  const spent = spentRows.length;

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

  const available = availableTokens(perfectDayCount, spent);

  return {
    tokens: available,
    earned: earnedTokens(perfectDayCount),
    spent,
    /** Perfect days still owed before the next one lands. 0 at the cap. */
    toNext: daysToNextToken(perfectDayCount, spent),
    loading: query.isLoading,
    spendToken: spend.mutateAsync,
    spending: spend.isPending,
  };
}
