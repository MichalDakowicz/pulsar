import { ChevronRight } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { formatCountdown } from '@/lib/dates';
import { COLORS } from '@/theme/colors';

type RiskBannerProps = {
  name: string;
  streak: number;
  hoursLeft: number;
  onPress: () => void;
};

/**
 * The one banner Today will show, and only when all of `isAtRisk` is true: a
 * target day, unresolved, a streak of two or more, and inside the last few
 * hours. Every one of those conditions exists to stop the banner appearing on a
 * morning when nothing is actually in danger — a warning that cries wolf is a
 * warning that gets muted, and then the real one arrives silenced.
 */
export function RiskBanner({ name, streak, hoursLeft, onPress }: RiskBannerProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.28, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View className="px-4 pb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${streak} day streak on ${name} ends in ${formatCountdown(hoursLeft)}. open the rescue screen.`}
        onPress={onPress}
        className="flex-row items-center gap-3 rounded-xl border px-3.5 py-3"
        style={{ backgroundColor: COLORS.dangerSoft, borderColor: COLORS.dangerEdge }}
      >
        <Animated.View
          style={[{ width: 8, height: 8, borderRadius: 99, backgroundColor: COLORS.danger }, dotStyle]}
        />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-foreground">
            {streak} days end in {formatCountdown(hoursLeft)}
          </Text>
          <Text className="text-xs" style={{ color: '#fca5a5' }} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <ChevronRight size={18} color={COLORS.muted} />
      </Pressable>
    </View>
  );
}
