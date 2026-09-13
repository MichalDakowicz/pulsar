import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { LoadingState, Stat } from '@/components/ui/states';
import { useAuth } from '@/features/auth/AuthProvider';
import { Avatar } from '@/features/friends/Avatar';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { usePacts } from '@/features/social/usePacts';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useProfile } from '@/hooks/useProfile';
import { MAX_W } from '@/hooks/useResponsive';
import { earnedCount, evaluateAwards, visibleAwards } from '@/lib/awards';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id);
  const board = useHabitBoard();
  const { pacts, active } = usePacts();
  const bottom = useNavBarSpace();

  if (loading || board.loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  const awards = visibleAwards(
    evaluateAwards({
      bestStreak: board.bestStreak,
      perfectDays: board.perfectCount,
      cleanRun: board.cleanRun,
      rebuilt: board.rebuilt,
      pactRun: active.length > 0 ? board.cleanRun : 0,
    }),
    { hasPacts: pacts.length > 0 },
  );

  const rows = [
    {
      label: 'achievements',
      sub: `${earnedCount(awards)} of ${awards.length} cleared`,
      go: () => router.navigate('/awards'),
    },
    {
      label: 'nudges and reminders',
      sub: 'how hard pulsar pushes, and when it stays quiet',
      go: () => router.navigate('/nudges'),
    },
    {
      label: 'settings',
      sub: 'privacy, theme, the account you share with the other three',
      go: () => router.navigate('/settings'),
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="flex-row items-center gap-4 px-4 pt-5">
          <Avatar profile={profile} size={68} />
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
              {profile?.displayName || profile?.username || 'you'}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {active.length > 0
                ? `${active.length} ${active.length === 1 ? 'pact' : 'pacts'} running`
                : 'no pacts running'}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2 px-4 pt-5">
          <Stat label="habits" value={String(board.rows.length)} />
          <Stat label="live streaks" value={String(board.rows.filter((row) => row.streak.current > 0).length)} />
          <Stat label="perfect days" value={String(board.perfectCount)} />
        </View>

        <View className="mt-5 border-t border-border/50 px-4">
          {rows.map((row) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={row.go}
              className="flex-row items-center gap-3 border-b border-border/50 py-4"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-foreground">{row.label}</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {row.sub}
                </Text>
              </View>
              <ChevronRight size={18} color="hsl(0 0% 63.9%)" />
            </Pressable>
          ))}
        </View>
      </ContentShell>
    </ScrollView>
  );
}
