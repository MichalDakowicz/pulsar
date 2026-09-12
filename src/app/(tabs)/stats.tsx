import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { EmptyState, LoadingState, SectionHeader } from '@/components/ui/states';
import { ConsistencyBars, WeekBars, WeekdayShape } from '@/features/stats/charts';
import { useStatsView } from '@/features/stats/useStatsView';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { RANGE_LABELS, useStatsRange } from '@/store/statsRange';

/**
 * The record. Every figure comes from `useStatsView`, which reads the same board
 * Today does — so a number here and a number there cannot disagree.
 */
export default function StatsScreen() {
  const router = useRouter();
  const stats = useStatsView();
  const range = useStatsRange((state) => state.range);
  const bottom = useNavBarSpace();

  if (stats.loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  // Charts drawn from no data are noise pretending to be insight.
  if (!stats.hasHistory) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: bottom }}>
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.detail}>
          <EmptyState
            title="nothing to measure yet"
            body="check something off and this fills in. a week is about when the shape starts telling you anything."
            action={{ label: 'go to today', onPress: () => router.navigate('/') }}
          />
        </ContentShell>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.detail}>
        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">the record</Text>
          <Text className="mt-1.5 text-sm text-muted-foreground">
            everything pulsar has watched you do · {RANGE_LABELS[range]}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2 px-4 pt-5">
          {stats.totals.map((total) => (
            <View key={total.key} className="min-w-[47%] flex-1 rounded-xl bg-secondary px-3.5 py-3">
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {total.key}
              </Text>
              <Text className="text-3xl font-bold tracking-tight text-foreground">{total.value}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 border-y border-border/50 px-4 py-5">
          <SectionHeader title="this week" meta={stats.weekSummary} />
          <WeekBars values={stats.weekHeld} labels={stats.weekLabels} />
        </View>

        <View className="px-4 pt-5">
          <SectionHeader title="your shape" meta="by weekday" />
          <WeekdayShape values={stats.shape} />
        </View>

        <View className="mt-5 border-t border-border/50 px-4 py-5">
          <SectionHeader title="per habit" />
          <ConsistencyBars rows={stats.consistency} />
        </View>
      </ContentShell>
    </ScrollView>
  );
}
