import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
  ANIMATION,
} from '../../theme/theme';
import type { SetLogVM } from './types';

// ---------------------------------------------------------------------------
// SetDots — animated filled/empty indicator for current set progress
// ---------------------------------------------------------------------------

interface SetDotsProps {
  total: number;
  completed: number;
  /** Optional: size variant for focus mode */
  size?: 'plan' | 'focus';
}

interface AnimatedDotProps {
  filled: boolean;
  dotSize: number;
}

function AnimatedDot({ filled, dotSize }: AnimatedDotProps) {
  const prevFilledRef = useRef(filled);
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    if (filled && !prevFilledRef.current) {
      // Newly completed — bounce + haptic
      scale.value = withSequence(
        withSpring(1.35, { damping: 8, stiffness: 300 }),
        withSpring(1.0, ANIMATION.spring),
      );
      colorProgress.value = withTiming(1, { duration: 200 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (!filled && prevFilledRef.current) {
      colorProgress.value = withTiming(0, { duration: 100 });
    }
    prevFilledRef.current = filled;
  }, [filled]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [COLORS.border, COLORS.accent],
    ),
    borderWidth: filled ? 0 : 1.5,
    borderColor: COLORS.accent + '60',
  }));

  return (
    <Animated.View
      style={[
        { width: dotSize, height: dotSize, borderRadius: RADIUS.full },
        dotStyle,
      ]}
    />
  );
}

export function SetDots({ total, completed, size = 'plan' }: SetDotsProps) {
  const dotSize = size === 'focus' ? 14 : 10;
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <AnimatedDot key={i} filled={i < completed} dotSize={dotSize} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});

// ---------------------------------------------------------------------------
// SetMiniTable — per-set detail table showing logged sets
// ---------------------------------------------------------------------------

interface SetMiniTableProps {
  sets: SetLogVM[];
  /** Only show working sets (exclude warmups) */
  workingOnly?: boolean;
}

export function SetMiniTable({ sets, workingOnly = true }: SetMiniTableProps) {
  const displayed = workingOnly ? sets.filter(s => !s.isWarmup) : sets;
  if (displayed.length === 0) return null;

  return (
    <View style={tableStyles.container}>
      <View style={tableStyles.headerRow}>
        <Text style={[tableStyles.headerCell, tableStyles.setCol]}>Set</Text>
        <Text style={[tableStyles.headerCell, tableStyles.flex1]}>Weight</Text>
        <Text style={[tableStyles.headerCell, tableStyles.flex1]}>Reps</Text>
        <Text style={[tableStyles.headerCell, tableStyles.flex1]}>RPE</Text>
      </View>
      {displayed.map((set) => (
        <View key={set.setNumber} style={tableStyles.row}>
          <Text style={[tableStyles.cell, tableStyles.setCol]}>{set.setNumber}</Text>
          <Text style={[tableStyles.cell, tableStyles.flex1]}>
            {set.weight > 0 ? `${set.weight} lb` : '—'}
          </Text>
          <Text style={[tableStyles.cell, tableStyles.flex1]}>{set.reps}</Text>
          <Text style={[tableStyles.cell, tableStyles.flex1]}>
            {set.rpe != null ? set.rpe : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerCell: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  cell: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  setCol: {
    width: 36,
  },
  flex1: {
    flex: 1,
  },
});

// ---------------------------------------------------------------------------
// ProgressBar — animated horizontal progress indicator
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  /** 0–1 progress value */
  progress: number;
  /** Optional height override */
  height?: number;
  /** Color override */
  color?: string;
}

export function ProgressBar({
  progress,
  height = 4,
  color = COLORS.accent,
}: ProgressBarProps) {
  const clampedWidth = `${Math.min(100, Math.max(0, progress * 100))}%`;
  return (
    <View style={[pbStyles.track, { height }]}>
      <View style={[pbStyles.fill, { width: clampedWidth as any, backgroundColor: color }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
