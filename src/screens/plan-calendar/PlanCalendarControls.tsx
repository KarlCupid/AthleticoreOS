import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TAP_TARGETS } from '../../theme/theme';

export type PlanViewMode = 'day' | 'week' | 'month';

const VIEW_MODES: PlanViewMode[] = ['day', 'week', 'month'];

export function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.headerIconButton}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.accent} />
    </TouchableOpacity>
  );
}

export function SegmentedViews({
  value,
  onChange,
}: {
  value: PlanViewMode;
  onChange: (value: PlanViewMode) => void;
}) {
  return (
    <View style={styles.segmentedControl}>
      {VIEW_MODES.map((mode) => {
        const active = value === mode;
        return (
          <AnimatedPressable
            key={mode}
            accessibilityRole="button"
            accessibilityLabel={`${mode} plan view`}
            accessibilityState={{ selected: active }}
            style={[styles.segmentButton, active && styles.segmentButtonActive]}
            onPress={() => onChange(mode)}
          >
            <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

export function PlanActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.actionButton}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.accent} />
      <Text style={styles.actionButtonText} numberOfLines={2}>{label}</Text>
    </AnimatedPressable>
  );
}

export function MetricTile({
  label,
  value,
  icon,
  tone = COLORS.accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}18`, borderColor: `${tone}42` }]}>
        <MaterialCommunityIcons name={icon} size={16} color={tone} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function PlanSetupCard({
  hasDefaultGymProfile,
  onSetupPlan,
  onSetupGym,
}: {
  hasDefaultGymProfile: boolean;
  onSetupPlan: () => void;
  onSetupGym: () => void;
}) {
  return (
    <Card
      variant="glass"
      backgroundTone="planning"
      backgroundScrimColor="rgba(10, 10, 10, 0.76)"
      style={styles.setupCard}
    >
      <View style={styles.setupIcon}>
        <MaterialCommunityIcons name={hasDefaultGymProfile ? 'calendar-plus' : 'dumbbell'} size={22} color={COLORS.accent} />
      </View>
      <Text style={styles.setupTitle}>{hasDefaultGymProfile ? 'Build your plan' : 'Equipment needed'}</Text>
      <Text style={styles.setupBody}>
        {hasDefaultGymProfile
          ? 'Add goals, availability, and fixed commitments before Athleticore lays out your week.'
          : 'Set your default equipment first so planned sessions match what you can actually use.'}
      </Text>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={hasDefaultGymProfile ? 'Set up plan' : 'Set up equipment'}
        style={styles.primaryAction}
        onPress={hasDefaultGymProfile ? onSetupPlan : onSetupGym}
      >
        <Text style={styles.primaryActionText}>{hasDefaultGymProfile ? 'Set Up Plan' : 'Set Up Equipment'}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.text.inverse} />
      </AnimatedPressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    minWidth: TAP_TARGETS.plan.min,
    minHeight: TAP_TARGETS.plan.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: 4,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(10, 10, 10, 0.52)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  segmentButton: {
    flex: 1,
    minHeight: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.accent,
  },
  segmentButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  segmentButtonTextActive: {
    color: COLORS.text.inverse,
  },
  setupCard: {
    gap: SPACING.sm,
  },
  setupIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.34)',
  },
  setupTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  setupBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  primaryAction: {
    minHeight: TAP_TARGETS.plan.recommended,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  primaryActionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  metricTile: {
    flex: 1,
    minHeight: 90,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
    padding: SPACING.sm,
    justifyContent: 'space-between',
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  actionButton: {
    width: '48%',
    minHeight: TAP_TARGETS.plan.recommended,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.26)',
    backgroundColor: 'rgba(10, 10, 10, 0.44)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  actionButtonText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
});
