import { Award } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { LoadingState } from '@/components/ui/states';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { usePacts } from '@/features/social/usePacts';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { earnedCount, evaluateAwards, visibleAwards } from '@/lib/awards';
import { nextTier } from '@/lib/tiers';
import { COLORS } from '@/theme/colors';

/**
 * The ladder. Reached from Profile and from any habit's tier list rather than
 * holding a slot in the nav bar — it is a screen you visit when something
 * happens, and Habits (where archiving and restoring live) earns the slot more.
 */
export default function Awards() {
  const board = useHabitBoard();
  const { active, pacts } = usePacts();
  const bottom = useNavBarSpace();

  if (board.loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  const pactRun = active.length > 0 ? board.cleanRun : 0;
  const awards = visibleAwards(
    evaluateAwards({
      bestStreak: board.bestStreak,
      perfectDays: board.perfectCount,
      cleanRun: board.cleanRun,
      rebuilt: board.rebuilt,
      pactRun,
    }),
    { hasPacts: pacts.length > 0 },
  );

  const earned = earnedCount(awards);
  const target = nextTier(board.bestStreak);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.grid}>
        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">the ladder</Text>
          <Text className="mt-1.5 text-sm text-muted-foreground">
            {earned} of {awards.length} cleared.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2.5 px-4 pt-5">
          {awards.map((award) => (
            <View
              key={award.key}
              className={[
                'min-w-[46%] flex-1 gap-2.5 rounded-2xl border p-3.5',
                award.earned ? 'border-primary/35 bg-primary/10' : 'border-border/50',
              ].join(' ')}
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: award.earned ? COLORS.accent : COLORS.thumbGround }}
              >
                <Award size={17} color={award.earned ? COLORS.accentInk : '#52525b'} strokeWidth={2.2} />
              </View>
              <View>
                <Text
                  className={['text-sm font-bold', award.earned ? 'text-foreground' : 'text-muted-foreground'].join(' ')}
                >
                  {award.name}
                </Text>
                <Text className="text-xs text-muted-foreground">{award.hint}</Text>
              </View>
              {/* A bar on an award already earned is a bar that can only be
                  full, so it is not drawn. */}
              {!award.earned && award.progress > 0 && (
                <View className="h-1 overflow-hidden rounded-full bg-secondary">
                  <View
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(award.progress * 100)}%` }}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* The long-haul card only appears once there is a live streak to
            measure against it. On day zero it is a wall with no ladder. */}
        {board.longestLive > 0 && (
          <View className="px-4 pb-2 pt-5">
            <View className="rounded-2xl border border-primary/35 bg-primary/10 p-4">
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                next rung
              </Text>
              <Text className="my-2 text-sm text-foreground">
                {board.bestStreak} of {target} days. {target - board.bestStreak} to go.
              </Text>
              <View className="h-2 overflow-hidden rounded-full bg-secondary">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((board.bestStreak / target) * 100)}%` }}
                />
              </View>
            </View>
          </View>
        )}
      </ContentShell>
    </ScrollView>
  );
}
