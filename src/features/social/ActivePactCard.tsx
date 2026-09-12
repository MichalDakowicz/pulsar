import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePactPartnerDay, type Pact } from '@/features/social/usePacts';
import { useProfile } from '@/hooks/useProfile';
import { dateKey, daysBetween } from '@/lib/dates';
import { normalizeHabit, type HabitRow } from '@/lib/habitRow';
import { supabase } from '@/lib/supabase';

/**
 * One running pact on the Social screen: both habits, both sides' today, and
 * how long it has held. The day count is the pact's own age rather than either
 * streak — a pact you kept through a streak you lost is still a pact you kept.
 */
export function ActivePactCard({ pact }: { pact: Pact }) {
  const { user } = useAuth();
  const { profile: partner } = useProfile(pact.otherId);
  const { partnerHabit, heldToday: partnerHeld } = usePactPartnerDay(pact);

  const mine = useQuery({
    queryKey: ['pact-my-side', pact.id, user?.id],
    queryFn: async () => {
      const habitId = pact.incoming ? pact.partnerHabitId : pact.habitId;
      if (!habitId) return { name: '', held: false };
      const [habit, entry] = await Promise.all([
        supabase.from('habits').select('*').eq('id', habitId).maybeSingle(),
        supabase.from('habit_entries').select('state').eq('habit_id', habitId).eq('day', dateKey()).maybeSingle(),
      ]);
      const state = (entry.data as { state: string } | null)?.state;
      return {
        name: habit.data ? normalizeHabit(habit.data as HabitRow).name : '',
        held: state === 'held' || state === 'repaired' || state === 'frozen',
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const partnerName = partner?.displayName || partner?.username || 'your partner';
  const age = Math.max(1, daysBetween(pact.createdAt.slice(0, 10), dateKey()) + 1);

  return (
    <View className="rounded-2xl border border-border p-3.5">
      <View className="flex-row items-center gap-3">
        <Avatar profile={partner} size={34} />
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            with {partnerName}
          </Text>
          <Text className="text-xs text-muted-foreground">day {age} of the pact</Text>
        </View>
      </View>

      <View className="mt-3 gap-2">
        <PactSide label={mine.data?.name || 'your habit'} who="you" held={!!mine.data?.held} />
        <PactSide label={partnerHabit?.name || 'their habit'} who={partnerName} held={partnerHeld} />
      </View>

      <Text className="mt-3 text-xs text-muted-foreground">
        {mine.data?.held && partnerHeld
          ? 'both held. pact clean today.'
          : mine.data?.held
            ? `waiting on ${partnerName}.`
            : partnerHeld
              ? `${partnerName} held. you are the one still open.`
              : 'neither of you yet.'}
      </Text>
    </View>
  );
}

function PactSide({ label, who, held }: { label: string; who: string; held: boolean }) {
  return (
    <View
      className={[
        'flex-row items-center gap-2 rounded-xl px-3 py-2',
        held ? 'bg-primary/15' : 'bg-secondary',
      ].join(' ')}
    >
      <Text
        className={['text-xs font-semibold', held ? 'text-primary' : 'text-muted-foreground'].join(' ')}
        style={{ width: 56 }}
        numberOfLines={1}
      >
        {who}
      </Text>
      <Text className="min-w-0 flex-1 text-sm text-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className={['text-sm font-bold', held ? 'text-primary' : 'text-muted-foreground'].join(' ')}>
        {held ? '✓' : '—'}
      </Text>
    </View>
  );
}
