import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import type { EngineReplayRun } from '../../../../lib/engine/simulation/lab';

// ---------------------------------------------------------------------------
// ChartStat
// ---------------------------------------------------------------------------

interface ChartStatProps {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warning';
}

export function ChartStat({ label, value, tone = 'default' }: ChartStatProps) {
  return (
    <View
      style={[
        styles.stat,
        tone === 'good' && styles.statGood,
        tone === 'warning' && styles.statWarning,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ChartLegend
// ---------------------------------------------------------------------------

export function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ChartDateAxis
// ---------------------------------------------------------------------------

export function ChartDateAxis({ data }: { data: EngineReplayRun['chartData'] }) {
  if (data.length === 0) return null;
  const midIndex = Math.floor((data.length - 1) / 2);

  return (
    <View style={styles.dateAxis}>
      <Text style={styles.dateText}>{data[0]?.label ?? '--'}</Text>
      <Text style={styles.dateText}>{data[midIndex]?.label ?? '--'}</Text>
      <Text style={styles.dateText}>{data[data.length - 1]?.label ?? '--'}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  stat: {
    flexBasis: '48%',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  statGood: { backgroundColor: COLORS.accentLight },
  statWarning: { backgroundColor: COLORS.readiness.cautionLight },
  statLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY_V2.plan.caption.fontFamily,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: TYPOGRAPHY_V2.plan.headline.fontFamily,
    fontWeight: TYPOGRAPHY_V2.plan.headline.fontWeight,
    color: COLORS.text.primary,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendDot: { width: 10, height: 10, borderRadius: 999 },
  legendText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  dateAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  dateText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY_V2.plan.caption.fontFamily,
    color: COLORS.text.tertiary,
  },
});
