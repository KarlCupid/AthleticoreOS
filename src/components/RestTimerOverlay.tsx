/**
 * @deprecated Use SkiaRestTimer from src/components/workout/SkiaRestTimer.tsx instead.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface RestTimerOverlayProps {
  totalSeconds: number;
  remainingSeconds: number;
  exerciseType: string;
  nextExerciseName: string | null;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
}

const RING_SIZE = 220;
const RING_STROKE = 8;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function RestTimerOverlay({
  totalSeconds,
  remainingSeconds,
  exerciseType,
  nextExerciseName,
  onSkip,
  onExtend,
}: RestTimerOverlayProps) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const isLow = remainingSeconds <= 10;

  const skipScale = useSharedValue(1);
  const extendScale = useSharedValue(1);

  const handleSkip = () => {
    skipScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    onSkip();
  };

  const handleExtend = () => {
    extendScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    onExtend(30);
  };

  const skipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: skipScale.value }],
  }));

  const extendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: extendScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => {
    if (isLow) {
      return {
        opacity: withTiming(remainingSeconds % 2 === 0 ? 1 : 0.6, {
          duration: 500,
        }),
      };
    }
    return { opacity: 1 };
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {/* Timer ring area */}
        <View style={styles.timerContainer}>
          {/* Background ring */}
          <View style={styles.ringBackground} />

          {/* Progress arc segments */}
          <View style={styles.ringContainer}>
            {/* Top-right quadrant */}
            <View style={styles.quadrant}>
              <View
                style={[
                  styles.quadrantFill,
                  {
                    backgroundColor:
                      progress > 0.75 ? COLORS.accent : 'transparent',
                  },
                ]}
              />
            </View>
            {/* Top-left quadrant */}
            <View style={[styles.quadrant, styles.quadrantTopLeft]}>
              <View
                style={[
                  styles.quadrantFill,
                  {
                    backgroundColor:
                      progress > 0.5 ? COLORS.accent : 'transparent',
                  },
                ]}
              />
            </View>
            {/* Bottom-left quadrant */}
            <View style={[styles.quadrant, styles.quadrantBottomLeft]}>
              <View
                style={[
                  styles.quadrantFill,
                  {
                    backgroundColor:
                      progress > 0.25 ? COLORS.accent : 'transparent',
                  },
                ]}
              />
            </View>
            {/* Bottom-right quadrant */}
            <View style={[styles.quadrant, styles.quadrantBottomRight]}>
              <View
                style={[
                  styles.quadrantFill,
                  {
                    backgroundColor:
                      progress > 0 ? COLORS.accent : 'transparent',
                  },
                ]}
              />
            </View>
          </View>

          {/* Accent ring border showing progress */}
          <View
            style={[
              styles.progressRingTrack,
              {
                borderColor: 'rgba(99, 102, 241, 0.15)',
              },
            ]}
          />
          <View
            style={[
              styles.progressRingActive,
              {
                borderColor: COLORS.accent,
                borderTopColor:
                  progress > 0.25 ? COLORS.accent : 'transparent',
                borderRightColor:
                  progress > 0.5 ? COLORS.accent : 'transparent',
                borderBottomColor:
                  progress > 0.75 ? COLORS.accent : 'transparent',
                borderLeftColor: progress > 0 ? COLORS.accent : 'transparent',
              },
            ]}
          />

          {/* Center content */}
          <View style={styles.timerCenter}>
            <Animated.Text
              style={[
                styles.timeText,
                isLow && styles.timeTextLow,
                pulseStyle,
              ]}
            >
              {formatTime(remainingSeconds)}
            </Animated.Text>
            <Text style={styles.exerciseTypeLabel}>{exerciseType}</Text>
          </View>
        </View>

        {/* Rest label */}
        <Text style={styles.restLabel}>Rest Period</Text>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <Animated.View style={skipAnimatedStyle}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={extendAnimatedStyle}>
            <TouchableOpacity
              style={styles.extendButton}
              onPress={handleExtend}
              activeOpacity={0.7}
            >
              <Text style={styles.extendButtonText}>+30s</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Up next */}
        {nextExerciseName && (
          <View style={styles.upNextContainer}>
            <Text style={styles.upNextLabel}>Up Next</Text>
            <Text style={styles.upNextName}>{nextExerciseName}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    width: '100%',
  },
  timerContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ringBackground: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ringContainer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    overflow: 'hidden',
  },
  quadrant: {
    position: 'absolute',
    width: RING_SIZE / 2,
    height: RING_SIZE / 2,
    top: 0,
    right: 0,
    overflow: 'hidden',
  },
  quadrantTopLeft: {
    right: undefined,
    left: 0,
  },
  quadrantBottomLeft: {
    top: undefined,
    bottom: 0,
    right: undefined,
    left: 0,
  },
  quadrantBottomRight: {
    top: undefined,
    bottom: 0,
  },
  quadrantFill: {
    width: '100%',
    height: '100%',
  },
  progressRingTrack: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  progressRingActive: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  timerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 56,
    color: '#F5F5F0',
    letterSpacing: 1,
  },
  timeTextLow: {
    color: COLORS.error,
  },
  exerciseTypeLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  restLabel: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: SPACING.xl,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  skipButton: {
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipButtonText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: '#F5F5F0',
  },
  extendButton: {
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  extendButtonText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: COLORS.accent,
  },
  upNextContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    width: '100%',
    maxWidth: 300,
  },
  upNextLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  upNextName: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
    color: '#F5F5F0',
  },
});
