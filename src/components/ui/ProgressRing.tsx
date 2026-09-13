import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { COLORS } from '@/theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  /** 0–1. Clamped, so a bad caller cannot draw a ring past full. */
  progress: number;
  size: number;
  stroke: number;
  children?: React.ReactNode;
  /** A faint inner hairline, only on the big hero ring. */
  inner?: boolean;
};

/**
 * The ring. It animates the dash offset rather than re-rendering an arc,
 * because the whole point of it is the sweep when a habit is checked off —
 * a ring that snaps to its new value says nothing happened.
 */
export function ProgressRing({ progress, size, stroke, children, inner }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = useSharedValue(circumference);

  useEffect(() => {
    offset.value = withTiming(circumference * (1 - clamped), {
      duration: 620,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    });
  }, [clamped, circumference, offset]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={stroke}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
        {inner && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius - stroke * 1.6}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        )}
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
