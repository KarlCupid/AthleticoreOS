import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import { TONE_TINTS, type MetricTone } from '../styles';

interface MetricTileProps {
  label: string;
  value: string;
  tone?: MetricTone;
}

export function MetricTile({ label, value, tone = 'default' }: MetricTileProps) {
  return (
    <View
      style={[styles.tile, { backgroundColor: TONE_TINTS[tone] }]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  value: {
    marginTop: SPACING.xs,
    fontSize: 20,
    fontFamily: TYPOGRAPHY_V2.plan.headline.fontFamily,
    fontWeight: TYPOGRAPHY_V2.plan.headline.fontWeight,
    color: COLORS.text.primary,
  },
});
