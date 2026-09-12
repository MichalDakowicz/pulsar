import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { dateKey } from '@/lib/dates';
import { normalizeHabit, type HabitRow } from '@/lib/habitRow';
import { supabase } from '@/lib/supabase';
import type { Habit } from '@/types/habit';

/**
 * Pacts — one habit each, two people, mutual visibility.
 *
 * A pact is the one thing in Pulsar that makes a private habit visible to
 * somebody else, and it is explicit consent: you name the habit, you name the
 * person, and they have to accept before either side can see anything. That is
 * why the visibility in schema.sql goes through `private.in_pact_over` rather
 * than through the public-shelf flag — agreeing to be watched by one person is
 * not the same as putting a habit on a shelf.
 */

export type PactState = 'pending' | 'active' | 'declined' | 'ended';

export type Pact = {
  id: string;
  ownerId: string;
  partnerId: string;
  habitId: string;
  partnerHabitId: string | null;
  state: PactState;
  createdAt: string;
  /** True when you are the one who was invited — the inbox filters on it. */
  incoming: boolean;
  /** The other person, whichever side you are on. */
  otherId: string;
};

type PactRow = {
  id: string;
  owner_id: string;
  partner_id: string;
  habit_id: string;
  partner_habit_id: string | null;
  state: string;
  created_at: string;
};

function pactsKey(userId: string | undefined) {
  return ['pacts', userId] as const;
}

function normalize(row: PactRow, userId: string): Pact {
  const incoming = row.partner_id === userId;
  return {
    id: row.id,
    ownerId: row.owner_id,
    partnerId: row.partner_id,
    habitId: row.habit_id,
    partnerHabitId: row.partner_habit_id,
    state: (['pending', 'active', 'declined', 'ended'] as const).includes(row.state as PactState)
      ? (row.state as PactState)
      : 'pending',
    createdAt: row.created_at,
    incoming,
    otherId: incoming ? row.owner_id : row.partner_id,
  };
}

export function usePacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = pactsKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Pact[]> => {
      const { data, error } = await supabase
        .from('habit_pacts')
        .select('*')
        .or(`owner_id.eq.${user!.id},partner_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as PactRow[]).map((row) => normalize(row, user!.id));
    },
    enabled: !!user,
  });

  // A partner accepting should land on your pact card without a pull to
  // refresh — the whole point of a pact is that it is live.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`habit_pacts:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_pacts' }, () =>
        queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const pacts = useMemo(() => query.data ?? [], [query.data]);

  return {
    pacts,
    active: pacts.filter((pact) => pact.state === 'active'),
    pending: pacts.filter((pact) => pact.state === 'pending'),
    loading: query.isLoading,
  };
}

/** Invites waiting on *you*, which is what the inbox badge counts. */
export function usePendingPacts() {
  const { pacts, loading } = usePacts();
  return { pending: pacts.filter((pact) => pact.state === 'pending' && pact.incoming), loading };
}

/**
 * The partner's side of a pact: their habit and its entries, readable only
 * because the pact makes it so. Returns nulls rather than throwing when the
 * pact is still pending — there is nothing to see yet, and that is not an error.
 */
export function usePactPartnerDay(pact: Pact | null) {
  const { user } = useAuth();
  const theirHabitId = pact ? (pact.incoming ? pact.habitId : pact.partnerHabitId) : null;

  const query = useQuery({
    queryKey: ['pact-partner-day', pact?.id, theirHabitId],
    queryFn: async (): Promise<{ habit: Habit | null; heldToday: boolean }> => {
      const { data: habitData, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', theirHabitId!)
        .maybeSingle();
      if (habitError) throw habitError;

      const { data: entry, error: entryError } = await supabase
        .from('habit_entries')
        .select('state')
        .eq('habit_id', theirHabitId!)
        .eq('day', dateKey())
        .maybeSingle();
      if (entryError) throw entryError;

      const state = (entry as { state: string } | null)?.state;
      return {
        habit: habitData ? normalizeHabit(habitData as HabitRow) : null,
        heldToday: state === 'held' || state === 'repaired' || state === 'frozen',
      };
    },
    enabled: !!user && !!theirHabitId && pact?.state === 'active',
    staleTime: 60 * 1000,
  });

  return { partnerHabit: query.data?.habit ?? null, heldToday: query.data?.heldToday ?? false, loading: query.isLoading };
}

export function useOfferPact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ habitId, partnerId }: { habitId: string; partnerId: string }) => {
      if (!user) throw new Error('Not signed in');
      // Upsert on the (habit_id, partner_id) unique index: re-inviting someone
      // who declined revives the same row rather than stacking a second invite.
      const { error } = await supabase.from('habit_pacts').upsert(
        {
          owner_id: user.id,
          partner_id: partnerId,
          habit_id: habitId,
          state: 'pending',
          responded_at: null,
          ended_at: null,
        },
        { onConflict: 'habit_id,partner_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pactsKey(user?.id) }),
  });
}

/** Accepting names the habit *you* are putting up — a pact has two sides or none. */
export function useAnswerPact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pactId,
      accept,
      myHabitId,
    }: {
      pactId: string;
      accept: boolean;
      myHabitId?: string;
    }) => {
      if (accept && !myHabitId) throw new Error('Pick the habit you are putting up.');
      const { error } = await supabase
        .from('habit_pacts')
        .update({
          state: accept ? 'active' : 'declined',
          partner_habit_id: accept ? myHabitId : null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', pactId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pactsKey(user?.id) }),
  });
}

export function useEndPact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pactId: string) => {
      const { error } = await supabase
        .from('habit_pacts')
        .update({ state: 'ended', ended_at: new Date().toISOString() })
        .eq('id', pactId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pactsKey(user?.id) }),
  });
}
