import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

function PlanToolRow({
  icon,
  title,
  body,
  loading = false,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      style={[styles.toolRow, disabled && styles.toolRowDisabled]}
      onPress={onPress}
    >
      <View style={styles.toolIcon}>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <MaterialCommunityIcons name={icon} size={22} color={COLORS.accent} />
        )}
      </View>
      <View style={styles.toolText}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolBody} numberOfLines={2}>{body}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.text.tertiary} />
    </TouchableOpacity>
  );
}

export function PlanToolsSheet({
  visible,
  regenerating,
  onClose,
  onGenerateWeek,
  onChangePhase,
  onOpenDay,
  onOpenReview,
}: {
  visible: boolean;
  regenerating: boolean;
  onClose: () => void;
  onGenerateWeek: () => void;
  onChangePhase: () => void;
  onOpenDay: () => void;
  onOpenReview: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close plan controls"
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetKicker}>Plan</Text>
              <Text style={styles.sheetTitle}>Plan controls</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close plan controls"
              style={styles.sheetCloseButton}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetActions}>
            <PlanToolRow
              icon="calendar-refresh"
              title={regenerating ? 'Generating week' : 'Generate week'}
              body="Rebuild this week around protected anchors and current readiness."
              loading={regenerating}
              disabled={regenerating}
              onPress={onGenerateWeek}
            />
            <PlanToolRow
              icon="swap-horizontal"
              title="Change phase"
              body="Update the training objective, build phase, fight camp, or opportunity."
              onPress={onChangePhase}
            />
            <PlanToolRow
              icon="calendar-edit"
              title="Open day"
              body="Edit the selected day, log work, move support sessions, or adjust intensity."
              onPress={onOpenDay}
            />
            <PlanToolRow
              icon="clipboard-text-outline"
              title="Week review"
              body="Review completed work, missed sessions, readiness, and schedule effects."
              onPress={onOpenReview}
            />
          </View>
        </View>
      </View>
    </Modal>
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
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(10, 10, 10, 0.96)',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(245, 245, 240, 0.20)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sheetKicker: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.accent,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    marginTop: 2,
    fontSize: 22,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  sheetCloseButton: {
    width: TAP_TARGETS.plan.min,
    height: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
  },
  sheetActions: {
    gap: SPACING.sm,
  },
  toolRow: {
    minHeight: 76,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.12)',
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toolRowDisabled: {
    opacity: 0.72,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.30)',
  },
  toolText: {
    flex: 1,
    minWidth: 0,
  },
  toolTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  toolBody: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
});
