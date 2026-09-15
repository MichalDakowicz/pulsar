import { Text, View } from 'react-native';

import { ProgressRing } from '@/components/ui/ProgressRing';
import { nextTier, tierProgress } from '@/lib/tiers';

/**
 * The count, and the three numbers that give it a scale.
 *
 * The ring fills towards the next tier rather than towards some absolute, so a
 * run of 9 reads as nearly somewhere instead of as nearly nothing — a bar that
 * is always almost empty is a bar that teaches you to stop looking.
 */
type StreakSummaryProps = {
  current: number;
  best: number;
  rate: number;
};

export function StreakSummary({ current, best, rate }: StreakSummaryProps) {
  return (
    <View className="flex-row items-center gap-4 px-4 pb-5 pt-5">
      <ProgressRing progress={tierProgress(current)} size={116} stroke={8}>
        <Text className="text-2xl font-bold tracking-tight text-foreground">{current}</Text>
        <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {current === 1 ? 'day' : 'days'}
        </Text>
      </ProgressRing>
      <View className="min-w-0 flex-1 gap-3">
        <Figure label="next tier" value={`${nextTier(current)} days`} />
        <Figure label="personal best" value={`${best} days`} />
        <Figure label="hit rate" value={`${rate}%`} />
      </View>
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
      <Text className="text-base font-bold text-foreground">{value}</Text>
    </View>
  );
}
