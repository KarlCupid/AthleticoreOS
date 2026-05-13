import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type {
  TodayMissionAction,
  TodayMissionStatus,
  TodayMissionViewModel,
} from '../../../lib/performance-engine';
import {
  buildTodayCoachCopy,
  sanitizeAthleteFacingCopy,
} from '../../../lib/performance-engine/presentation/coachCopyViewModel';
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
  IconPlay,
  IconScale,
  IconShieldCheck,
  IconTarget,
} from '../icons';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../../theme/theme';

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
  const coachCopy = buildTodayCoachCopy(mission);
  const primaryAction = mission.nextActions[0] ?? null;
  const secondaryActions = mission.nextActions.slice(1, 3);
  const summaryRows = buildSummaryRows(mission);
  const hasDetails = mission.planAdjustments.length > 0 || mission.explanations.length > 0;
  const hasLowConfidence = mission.confidence.level === 'low' || mission.confidence.level === 'unknown';
  const contextLine = hasLowConfidence ? coachCopy.safetyLines.find((line) => !mission.riskHighlights.includes(line)) ?? coachCopy.safetyLines[0] : null;

  return (
    <Card
      style={[styles.card, { borderColor: status.border }]}
      backgroundTone="none"
    >
      <View style={styles.topRow}>
        <Text style={styles.kicker}>{mission.missionTitle.toUpperCase()}</Text>
        <View style={[styles.statusPill, { backgroundColor: status.background, borderColor: status.border }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
            {status.label}
          </Text>
        </View>
      </View>

      <Text style={styles.primaryFocus} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.86}>
        {coachCopy.headline}
      </Text>
      <Text style={styles.phaseLabel} numberOfLines={1}>
        {mission.phaseLabel}
      </Text>

      <View style={styles.whyBlock}>
        <Text style={styles.sectionLabel}>Why today matters</Text>
        <Text style={styles.whyText}>{coachCopy.body}</Text>
      </View>

      <View style={styles.summaryGrid}>
        {summaryRows.map((row, index) => (
          <View key={row.id} style={[styles.summaryRow, index === 0 && styles.summaryRowFirst]}>
            <View style={[styles.summaryIcon, row.emphasis === 'risk' && styles.summaryIconRisk]}>
              {renderRowIcon(row.id, row.emphasis === 'risk' ? COLORS.error : COLORS.accent)}
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1}>
              {row.label}
            </Text>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryText} numberOfLines={2}>
                {row.text}
              </Text>
            </View>
            <IconChevronRight size={16} color={COLORS.text.tertiary} />
          </View>
        ))}
      </View>

      {mission.riskHighlights[0] ? (
        <View style={styles.riskCallout}>
          <IconAlertTriangle size={17} color={COLORS.error} />
          <Text style={styles.riskText}>{sanitizeAthleteFacingCopy(mission.riskHighlights[0])}</Text>
        </View>
      ) : null}

      {hasLowConfidence ? (
        <View style={styles.confidenceCallout}>
          <IconInfo size={17} color={COLORS.text.tertiary} />
          <Text style={styles.confidenceText}>{contextLine ?? 'Athleticore needs more context before it pushes the day.'}</Text>
        </View>
      ) : null}

      {hasDetails ? (
        <AnimatedPressable
          testID="today-mission-details-toggle"
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
              <Text style={styles.detailText}>{sanitizeAthleteFacingCopy(adjustment)}</Text>
            </View>
          ))}
          {mission.explanations.slice(0, 2).map((explanation) => (
            <View key={explanation.id} style={styles.detailItem}>
              <Text style={styles.detailLabel}>Why</Text>
              <Text style={styles.detailText}>{sanitizeAthleteFacingCopy(explanation.summary)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {primaryAction ? (
        <AnimatedPressable
          testID="today-mission-primary-cta"
          style={styles.primaryButton}
          onPress={() => onAction(primaryAction)}
        >
          {renderActionIcon(primaryAction, COLORS.text.inverse)}
          <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
            {coachCopy.primaryAction}
          </Text>
        </AnimatedPressable>
      ) : null}

      {secondaryActions.length > 0 ? (
        <View style={styles.secondaryActions}>
          {secondaryActions.map((action) => (
            <AnimatedPressable
              testID={`today-mission-secondary-cta-${action.id}`}
              key={action.id}
              style={styles.secondaryButton}
              onPress={() => onAction(action)}
            >
              {renderActionIcon(action, COLORS.accent)}
              <Text style={styles.secondaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
                {sanitizeAthleteFacingCopy(action.label)}
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
    { id: 'training', label: 'Training', text: sanitizeAthleteFacingCopy(mission.trainingSummary) },
    mission.protectedWorkoutSummary
      ? { id: 'protected', label: 'Anchor', text: sanitizeAthleteFacingCopy(mission.protectedWorkoutSummary) }
      : null,
    { id: 'fuel', label: 'Fuel', text: sanitizeAthleteFacingCopy(mission.fuelingFocus) },
    { id: 'readiness', label: 'Readiness', text: sanitizeAthleteFacingCopy(mission.readinessSummary) },
    { id: 'recovery', label: 'Recovery', text: sanitizeAthleteFacingCopy(mission.recoveryPriority) },
    mission.bodyMassContext
      ? { id: 'bodyMass', label: 'Body mass', text: sanitizeAthleteFacingCopy(mission.bodyMassContext), emphasis: mission.status === 'blocked' ? 'risk' : undefined }
      : null,
    mission.fightOrCompetitionContext
      ? { id: 'fight', label: 'Fight context', text: sanitizeAthleteFacingCopy(mission.fightOrCompetitionContext) }
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

function renderActionIcon(action: TodayMissionAction, color: string) {
  switch (action.intent) {
    case 'start_training':
      return <IconPlay size={18} color={color} />;
    case 'review_fueling':
      return <IconDroplets size={18} color={color} />;
    case 'log_body_mass':
    case 'review_body_mass':
      return <IconScale size={18} color={color} />;
    case 'log_checkin':
      return <IconCheckCircle size={18} color={color} />;
    case 'confirm_fight':
      return <IconTarget size={18} color={color} />;
    case 'review_plan':
    case 'take_recovery':
    default:
      return <IconCalendar size={18} color={color} />;
  }
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    backgroundColor: 'rgba(8, 12, 14, 0.84)',
    ...SHADOWS.cardElevated,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  kicker: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.accent,
    letterSpacing: 1.8,
  },
  phaseLabel: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  statusPill: {
    alignSelf: 'flex-start',
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
    marginTop: SPACING.sm + 2,
    fontSize: 38,
    lineHeight: 44,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  whyBlock: {
    marginTop: SPACING.md - 2,
    gap: SPACING.xs,
  },
  sectionLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.accent,
    letterSpacing: 0,
  },
  whyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  summaryGrid: {
    marginTop: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245, 245, 240, 0.12)',
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(5, 8, 10, 0.46)',
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.09)',
  },
  summaryRowFirst: {
    borderTopWidth: 0,
  },
  summaryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconRisk: {
    backgroundColor: 'rgba(217, 130, 126, 0.10)',
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    width: 86,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 18,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245, 245, 240, 0.13)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(10, 10, 10, 0.26)',
  },
  detailsToggleText: {
    flex: 1,
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
    marginTop: SPACING.md,
    minHeight: 56,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
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
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  secondaryButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'rgba(5, 8, 10, 0.48)',
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
