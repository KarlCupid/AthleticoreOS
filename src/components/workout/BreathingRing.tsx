import React, { useEffect } from 'react';
import { Circle } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TIMER_DIMENSIONS } from '../../theme/theme';

interface BreathingRingProps {
  cx: number;
  cy: number;
}

/**
 * Ambient breathing ring rendered inside a parent Skia Canvas.
 * Oscillates between breathingRadiusMin and breathingRadiusMax on a sine-like
 * ease-in-out cycle, giving the rest timer an organic, living feel.
 */
export function BreathingRing({ cx, cy }: BreathingRingProps) {
  const radius = useSharedValue(TIMER_DIMENSIONS.breathingRadiusMin);

  useEffect(() => {
    radius.value = withRepeat(
      withSequence(
        withTiming(TIMER_DIMENSIONS.breathingRadiusMax, {
          duration: TIMER_DIMENSIONS.breathingDuration / 2,
          easing: Easing.inOut(Easing.sine),
        }),
        withTiming(TIMER_DIMENSIONS.breathingRadiusMin, {
          duration: TIMER_DIMENSIONS.breathingDuration / 2,
          easing: Easing.inOut(Easing.sine),
        }),
      ),
      -1,
      false,
    );
  }, []);

  // Skia Circle accepts Animated shared values directly via react-native-reanimated
  // when using @shopify/react-native-skia with the Reanimated adapter.
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={radius}
      color="rgba(15, 168, 136, 0.07)"
      style="stroke"
      strokeWidth={2}
    />
  );
}
