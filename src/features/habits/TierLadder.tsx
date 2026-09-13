import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/states';
import { tierRows } from '@/lib/tiers';
import { COLORS } from '@/theme/colors';

/**
 * The four rungs, for one habit.
 *
 * Exactly one row is live at a time — the rung being climbed — and the rest are
 * either cleared or locked. Three visual weights rather than two, because
 * "next" and "someday" are different kinds of not-yet and flattening them loses
 * the only thing the list is for.
 */
export function TierLadder({ streak }: { streak: number }) {
  return (
    <View className="px-4 py-5">
      <SectionHeader title="the ladder" />
      <View className="mt-3.5 gap-2">
        {tierRows(streak).map((tier) => (
          <View
            key={tier.n}
            className={[
              'flex-row items-center gap-3 rounded-xl border p-3',
              tier.unlocked ? 'border-primary/40 bg-primary/10' : tier.live ? 'border-border' : 'border-border/50',
            ].join(' ')}
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: tier.unlocked ? COLORS.accent : COLORS.thumbGround }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: tier.unlocked ? COLORS.accentInk : tier.live ? '#fafafa' : COLORS.muted }}
              >
                {tier.n}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className={[
                  'text-sm font-bold',
                  tier.unlocked || tier.live ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {tier.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {tier.unlocked ? 'cleared' : tier.live ? `${tier.remaining} days to go` : 'locked'}
              </Text>
            </View>
            {tier.unlocked && <Check size={18} color={COLORS.accent} strokeWidth={2.6} />}
          </View>
        ))}
      </View>
    </View>
  );
}
