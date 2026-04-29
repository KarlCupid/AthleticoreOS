import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type {
  TodayMissionAction,
  TodayMissionStatus,
  TodayMissionViewModel,
} from '../../../lib/performance-engine';
import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import {
  IconAlertTriangle,
  IconBarbell,
  IconCalendar,
  IconCheckCircle,
  IconChevronRight,
  IconDroplets,
  IconInfo,
  IconScale,
  IconShieldCheck,
  IconTarget,
} from '../icons';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';

interface TodayMissionPanelProps {
  mission: TodayMissionViewModel;
  onAction: (action: TodayMissionAction) => void;
}

const STATUS_STYLES: Record<TodayMissionStatus, { label: string; color: string; background: string; border: string }> = {
  good_to_push: {
    label: 'Ready',
    color: COLORS.success,
    background: 'rgba(183, 217, 168, 0.14)',
    border: 'rgba(183, 217, 168, 0.28)',
  },
  train_smart: {
    label: 'Train smart',
    color: COLORS.warning,
    background: 'rgba(212, 175, 55, 0.15)',
    border: 'rgba(212, 175, 55, 0.30)',
  },
  pull_back: {
    label: 'Recovery first',
    color: COLORS.warning,
    background: 'rgba(212, 175, 55, 0.15)',
    border: 'rgba(212, 175, 55, 0.30)',
  },
  blocked: {
    label: 'Adjust first',
    color: COLORS.error,
    background: 'rgba(217, 130, 126, 0.16)',
    border: 'rgba(217, 130, 126, 0.32)',
  },
  needs_context: {
    label: 'Needs context',
    color: COLORS.text.tertiary,
    background: 'rgba(245, 245, 240, 0.08)',
    border: 'rgba(245, 245, 240, 0.16)',
  },
};

export const TodayMissionPanel = memo(function TodayMissionPanel({
  mission,
  onAction,
}: TodayMissionPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const status = STATUS_STYLES[mission.status];
  const primaryAction = mission.nextActions[0] ?? null;
  const secondaryActions = mission.nextActions.slice(1, 3);
  const summaryRows = buildSummaryRows(mission);
  const hasDetails = mission.planAdjustments.length > 0 || mission.explanations.length > 0;
  const hasLowConfidence = mission.confidence.level === 'low' || mission.confidence.level === 'unknown';

  return (
    <Card
      style={[styles.card, { borderColor: status.border }]}
      backgroundTone="mission"
      backgroundScrimColor="rgba(10, 10, 10, 0.42)"
    >
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBubble, { borderColor: status.border, backgroundColor: status.background }]}>
            <IconTarget size={20} color={status.color} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.kicker}>{mission.missionTitle.toUpperCase()}</Text>
            <Text style={styles.phaseLabel} numberOfLines={1}>
              {mission.phaseLabel}
            </Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.background, borderColor: status.border }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
            {status.label}
          </Text>
        </View>
      </View>

      <Text style={styles.primaryFocus} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.86}>
        {mission.primaryFocus}
      </Text>

      <View style={styles.whyBlock}>
        <Text style={styles.sectionLabel}>WHY TODAY MATTERS</Text>
        <Text style={styles.whyText}>{mission.whyTodayMatters}</Text>
      </View>

      <View style={styles.summaryGrid}>
        {summaryRows.map((row) => (
          <View key={row.id} style={styles.summaryRow}>
            <View style={[styles.summaryIcon, row.emphasis === 'risk' && styles.summaryIconRisk]}>
              {renderRowIcon(row.id, row.emphasis === 'risk' ? COLORS.error : COLORS.accent)}
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryText}>{row.text}</Text>
            </View>
          </View>
        ))}
      </View>

      {mission.riskHighlights[0] ? (
        <View style={styles.riskCallout}>
          <IconAlertTriangle size={17} color={COLORS.error} />
          <Text style={styles.riskText}>{mission.riskHighlights[0]}</Text>
        </View>
      ) : null}

      {hasLowConfidence ? (
        <View style={styles.confidenceCallout}>
          <IconInfo size={17} color={COLORS.text.tertiary} />
          <Text style={styles.confidenceText}>{mission.confidence.summary}</Text>
        </View>
      ) : null}

      {hasDetails ? (
        <AnimatedPressable
          style={styles.detailsToggle}
          onPress={() => setShowDetails((current) => !current)}
        >
          <Text style={styles.detailsToggleText}>
            {showDetails ? 'Hide why it changed' : 'Show why it changed'}
          </Text>
          <IconChevronRight
            size={16}
            color={COLORS.text.tertiary}
            style={showDetails ? styles.detailsChevronOpen : undefined}
          />
        </AnimatedPressable>
      ) : null}

      {showDetails ? (
        <View style={styles.detailsBlock}>
          {mission.planAdjustments.slice(0, 3).map((adjustment, index) => (
            <View key={`adjustment-${index}`} style={styles.detailItem}>
              <Text style={styles.detailLabel}>What changed</Text>
              <Text style={styles.detailText}>{adjustment}</Text>
            </View>
          ))}
          {mission.explanations.slice(0, 2).map((explanation) => (
            <View key={explanation.id} style={styles.detailItem}>
              <Text style={styles.detailLabel}>Why</Text>
              <Text style={styles.detailText}>{explanation.summary}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {primaryAction ? (
        <AnimatedPressable style={styles.primaryButton} onPress={() => onAction(primaryAction)}>
          <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
            {primaryAction.label}
          </Text>
          <IconChevronRight size={18} color={COLORS.text.inverse} />
        </AnimatedPressable>
      ) : null}

      {secondaryActions.length > 0 ? (
        <View style={styles.secondaryActions}>
          {secondaryActions.map((action) => (
            <AnimatedPressable
              key={action.id}
              style={styles.secondaryButton}
              onPress={() => onAction(action)}
            >
              <Text style={styles.secondaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
                {action.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
});

type SummaryRowId =
  | 'training'
  | 'protected'
  | 'fuel'
  | 'readiness'
  | 'recovery'
  | 'bodyMass'
  | 'fight';

interface SummaryRow {
  id: SummaryRowId;
  label: string;
  text: string;
  emphasis?: 'risk';
}

function buildSummaryRows(mission: TodayMissionViewModel): SummaryRow[] {
  return [
    { id: 'training', label: 'Training', text: mission.trainingSummary },
    mission.protectedWorkoutSummary
      ? { id: 'protected', label: 'Anchor', text: mission.protectedWorkoutSummary }
      : null,
    { id: 'fuel', label: 'Fuel', text: mission.fuelingFocus },
    { id: 'readiness', label: 'Readiness', text: mission.readinessSummary },
    { id: 'recovery', label: 'Recovery', text: mission.recoveryPriority },
    mission.bodyMassContext
      ? { id: 'bodyMass', label: 'Body mass', text: mission.bodyMassContext, emphasis: mission.status === 'blocked' ? 'risk' : undefined }
      : null,
    mission.fightOrCompetitionContext
      ? { id: 'fight', label: 'Fight context', text: mission.fightOrCompetitionContext }
      : null,
  ].filter((row): row is SummaryRow => Boolean(row));
}

function renderRowIcon(id: SummaryRowId, color: string) {
  switch (id) {
    case 'training':
      return <IconBarbell size={16} color={color} />;
    case 'protected':
      return <IconShieldCheck size={16} color={color} />;
    case 'fuel':
      return <IconDroplets size={16} color={color} />;
    case 'readiness':
      return <IconCheckCircle size={16} color={color} />;
    case 'bodyMass':
      return <IconScale size={16} color={color} />;
    case 'fight':
      return <IconTarget size={16} color={color} />;
    case 'recovery':
    default:
      return <IconCalendar size={16} color={color} />;
  }
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.82)',
    ...SHADOWS.cardElevated,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  phaseLabel: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  statusPill: {
    maxWidth: 136,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
  },
  primaryFocus: {
    marginTop: SPACING.lg,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  whyBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.16)',
    gap: SPACING.xs,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 1,
  },
  whyText: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
  },
  summaryGrid: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.10)',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  summaryIconRisk: {
    borderColor: 'rgba(217, 130, 126, 0.34)',
    backgroundColor: 'rgba(217, 130, 126, 0.14)',
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryText: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  riskCallout: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(217, 130, 126, 0.30)',
    backgroundColor: 'rgba(217, 130, 126, 0.12)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  riskText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  confidenceCallout: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  confidenceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  detailsToggle: {
    marginTop: SPACING.md,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.12)',
    paddingTop: SPACING.sm,
  },
  detailsToggleText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  detailsChevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  detailsBlock: {
    gap: SPACING.sm,
  },
  detailItem: {
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.10)',
  },
  detailLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detailText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  primaryButton: {
    marginTop: SPACING.lg,
    minHeight: 56,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    ...SHADOWS.colored.accent,
  },
  primaryButtonText: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  secondaryActions: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(10, 10, 10, 0.30)',
  },
  secondaryButtonText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
});
