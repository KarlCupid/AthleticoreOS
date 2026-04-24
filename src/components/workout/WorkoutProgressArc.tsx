import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLORS, SPACING } from '../../theme/theme';

interface WorkoutProgressArcProps {
  exerciseCount: number;
  currentIndex: number;
  /** 0–1 fraction of sets completed for the current exercise */
  currentSetProgress: number;
}

const BAR_HEIGHT = 6;
const GAP = 3;

// ---------------------------------------------------------------------------
// SegmentFlash — manages its own flash animation triggered by a boolean
// ---------------------------------------------------------------------------

function SegmentFlash({ flash }: { flash: boolean }) {
  const opacity = useSharedValue(0);
  const prevFlashRef = useRef(false);

  useEffect(() => {
    if (flash && !prevFlashRef.current) {
      opacity.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }),
      );
    }
    prevFlashRef.current = flash;
  }, [flash]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#F5F5F0', borderRadius: 3 }, style]}
    />
  );
}

// ---------------------------------------------------------------------------
// WorkoutProgressArc
// ---------------------------------------------------------------------------

/**
 * Segmented exercise progress bar — one pill per exercise.
 * Completed segments fill with accent, current partially fills,
 * and the newly-completed segment flashes on transition.
 */
export function WorkoutProgressArc({
  exerciseCount,
  currentIndex,
  currentSetProgress,
}: WorkoutProgressArcProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = screenWidth - SPACING.lg * 2;
  const totalGaps = Math.max(exerciseCount - 1, 0);
  const segWidth =
    exerciseCount > 0
      ? (containerWidth - totalGaps * GAP) / exerciseCount
      : containerWidth;

  // Track which segment last completed for the flash
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const prevIndexRef = useRef(currentIndex);

  useEffect(() => {
    const prev = prevIndexRef.current;
    if (currentIndex > prev && prev >= 0) {
      setFlashIndex(prev);
      // Clear flash after animation completes
      const t = setTimeout(() => setFlashIndex(null), 600);
      prevIndexRef.current = currentIndex;
      return () => clearTimeout(t);
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  return (
    <View style={[styles.container, { width: containerWidth, height: BAR_HEIGHT }]}>
      {Array.from({ length: exerciseCount }, (_, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const fillFraction = isCompleted
          ? 1
          : isCurrent
          ? Math.min(Math.max(currentSetProgress, 0), 1)
          : 0;
        const fillWidth = segWidth * fillFraction;
        const left = i * (segWidth + GAP);

        return (
          <View
            key={i}
            style={[styles.segment, { left, width: segWidth, backgroundColor: COLORS.borderLight }]}
          >
            {fillWidth > 0 && (
              <View
                style={[
                  styles.fill,
                  {
                    width: fillWidth,
                    backgroundColor: COLORS.accent,
                    opacity: isCurrent ? 0.75 : 1,
                  },
                ]}
              />
            )}
            <SegmentFlash flash={flashIndex === i} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
  },
  segment: {
    position: 'absolute',
    height: BAR_HEIGHT,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
});
