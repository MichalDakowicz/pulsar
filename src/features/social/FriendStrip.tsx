import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import { dateKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/theme/colors';
import type { Profile } from '@/types/profile';

/**
 * Friends, and whether they held anything today.
 *
 * What you see is only what they chose to put on their shelf: the query reads
 * `habits` and `habit_entries` and RLS decides, so a friend with no public
 * habits shows as "nothing shared" rather than as "nothing held". Those are very
 * different sentences and reporting the second one for the first would be a lie
 * about a person.
 */
export function FriendStrip({ friends }: { friends: Profile[] }) {
  const ids = friends.map((friend) => friend.id).sort();

  const query = useQuery({
    queryKey: ['friend-today', ids.join(',')],
    queryFn: async () => {
      const today = dateKey();
      const [habits, entries] = await Promise.all([
        supabase.from('habits').select('id, user_id').in('user_id', ids).is('archived_at', null),
        supabase.from('habit_entries').select('habit_id, state').eq('day', today),
      ]);
      const byUser = new Map<string, { shared: number; held: number }>();
      const habitOwner = new Map<string, string>();
      for (const row of (habits.data ?? []) as { id: string; user_id: string }[]) {
        habitOwner.set(row.id, row.user_id);
        const current = byUser.get(row.user_id) ?? { shared: 0, held: 0 };
        current.shared += 1;
        byUser.set(row.user_id, current);
      }
      for (const row of (entries.data ?? []) as { habit_id: string; state: string }[]) {
        const owner = habitOwner.get(row.habit_id);
        if (!owner) continue;
        if (row.state !== 'held' && row.state !== 'repaired') continue;
        const current = byUser.get(owner);
        if (current) current.held += 1;
      }
      return byUser;
    },
    enabled: ids.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const summary = query.data;

  return (
    <View className="mt-3.5 gap-3">
      {friends.map((friend) => {
        const row = summary?.get(friend.id);
        const shares = !!row && row.shared > 0;
        const all = shares && row.held === row.shared;
        return (
          <View key={friend.id} className="flex-row items-center gap-3">
            <Avatar profile={friend} size={38} />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {friend.displayName || friend.username}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {shares ? `${row.held} of ${row.shared} held today` : 'nothing shared'}
              </Text>
            </View>
            {/* No dot at all for someone who shares nothing — a grey dot would
                read as "they missed", which is not something we know. */}
            {shares && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  backgroundColor: all ? COLORS.accent : row.held > 0 ? 'rgba(245,158,11,0.4)' : COLORS.wallEmpty,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
