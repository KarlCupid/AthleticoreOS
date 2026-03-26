import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { SetLogVM } from './types';

// ---------------------------------------------------------------------------
// SetDots — filled/empty indicator for current set progress
// ---------------------------------------------------------------------------

interface SetDotsProps {
  total: number;
  completed: number;
  /** Optional: size variant for focus mode */
  size?: 'plan' | 'focus';
}

export function SetDots({ total, completed, size = 'plan' }: SetDotsProps) {
  const dotSize = size === 'focus' ? 14 : 10;
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            { width: dotSize, height: dotSize, borderRadius: RADIUS.full },
            i < completed ? dotStyles.dotFilled : dotStyles.dotEmpty,
          ]}
        />
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
  dotFilled: {
    backgroundColor: COLORS.accent,
  },
  dotEmpty: {
    backgroundColor: COLORS.border,
    borderWidth: 1.5,
    borderColor: COLORS.accent + '60',
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
