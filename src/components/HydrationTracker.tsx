import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { IconWaterDrop } from './icons';

interface HydrationTrackerProps {
  currentOz: number;
  targetOz: number;
  onQuickAdd: (oz: number) => void;
}

const QUICK_ADD_OPTIONS = [8, 12, 16];

export function HydrationTracker({
  currentOz,
  targetOz,
  onQuickAdd,
}: HydrationTrackerProps) {
  const pct = targetOz > 0 ? Math.min(currentOz / targetOz, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <IconWaterDrop size={18} color={COLORS.chart.water} />
          <Text style={styles.label}>Water</Text>
        </View>
        <Text style={styles.value}>
          {Math.round(currentOz)}{' '}
          <Text style={styles.target}>/ {Math.round(targetOz)} oz</Text>
        </Text>
      </View>

      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${pct * 100}%` },
          ]}
        />
      </View>

      <View style={styles.quickAddRow}>
        {QUICK_ADD_OPTIONS.map((oz) => (
          <TouchableOpacity
            key={oz}
            style={styles.quickAddButton}
            onPress={() => onQuickAdd(oz)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickAddText}>+{oz}oz</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 4,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  label: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  value: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  target: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  barBackground: {
    height: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
    marginBottom: SPACING.sm + 2,
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.chart.water,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: COLORS.chart.water + '15',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.chart.water,
  },
});
