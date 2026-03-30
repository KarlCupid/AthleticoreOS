import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '../AnimatedPressable';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, TYPOGRAPHY_V2 } from '../../theme/theme';

interface RestTimerActionsProps {
  onSkip: () => void;
  onExtend: (seconds: number) => void;
  nextExerciseName: string | null;
}

/**
 * Skip / +30s buttons and "Up Next" card for the rest timer overlay.
 */
export function RestTimerActions({ onSkip, onExtend, nextExerciseName }: RestTimerActionsProps) {
  return (
    <View style={styles.container}>
      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={onSkip}
          haptic
          activeScale={0.92}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip Rest</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => onExtend(30)}
          haptic
          activeScale={0.92}
          style={styles.extendButton}
        >
          <Text style={styles.extendText}>+30s</Text>
        </AnimatedPressable>
      </View>

      {/* Up Next */}
      {nextExerciseName ? (
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.upNextCard}>
          <Text style={styles.upNextLabel}>UP NEXT</Text>
          <Text style={styles.upNextName} numberOfLines={1}>{nextExerciseName}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  skipButton: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: TYPOGRAPHY_V2.focus.action.fontSize,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  extendButton: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(15, 168, 136, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: TYPOGRAPHY_V2.focus.action.fontSize,
    color: COLORS.accent,
  },
  upNextCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  upNextLabel: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  upNextName: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.80)',
  },
});
