import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../theme/theme';

interface SetCompletionFlashProps {
  visible: boolean;
  onDone?: () => void;
}

/**
 * A mint accent line that sweeps full-width across the screen when a set is logged.
 * Mount with visible=true to trigger; it auto-calls onDone when finished.
 */
export function SetCompletionFlash({ visible, onDone }: SetCompletionFlashProps) {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(-screenWidth);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    opacity.value = 0.85;
    translateX.value = -screenWidth;
    translateX.value = withSequence(
      withTiming(screenWidth, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      }),
    );
    opacity.value = withSequence(
      withTiming(0.85, { duration: 0 }),
      withTiming(0, {
        duration: 280,
        easing: Easing.in(Easing.ease),
      }),
    );

    const timer = setTimeout(() => onDone?.(), 300);
    return () => clearTimeout(timer);
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2.5,
          backgroundColor: COLORS.accent,
          zIndex: 50,
        },
        style,
      ]}
    />
  );
}
