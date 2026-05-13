import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { UnifiedPerformanceViewModel } from '../../../lib/performance-engine';
import { sanitizeAthleteFacingCopy } from '../../../lib/performance-engine/presentation';
import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import {
  IconAlertTriangle,
  IconBarChart,
  IconChevronRight,
  IconScale,
  IconShieldCheck,
} from '../icons';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';

interface UnifiedJourneySummaryCardProps {
  summary: UnifiedPerformanceViewModel;
  compact?: boolean;
  showProtectedAnchors?: boolean;
  showBodyMass?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'todayCommand';
  onPress?: (() => void) | undefined;
}

export function UnifiedJourneySummaryCard({
  summary,
  compact = false,
  showProtectedAnchors = true,
  showBodyMass = true,
  style,
  variant = 'default',
  onPress,
}: UnifiedJourneySummaryCardProps) {
  const riskTone = getRiskTone(summary.planStatusTone);
  const topRisks = summary.riskFlags.slice(0, compact ? 2 : 3);
  const protectedAnchors = summary.protectedAnchors.slice(0, compact ? 2 : 4);
  const keyExplanation = summary.explanations[0]?.summary
    ? sanitizeAthleteFacingCopy(summary.explanations[0].summary)
    : null;
  const contextSummary = sanitizeAthleteFacingCopy(summary.confidenceSummary).replace(/\bconfidence\b/gi, 'context');

  if (variant === 'todayCommand') {
    return (
      <TodayCommandJourneyCard
        summary={summary}
        riskTone={riskTone}
        topRisk={topRisks[0] ?? null}
        protectedAnchorCount={protectedAnchors.length}
        style={style}
        onPress={onPress}
      />
    );
  }

  return (
    <Card
      variant="glass"
      style={[styles.card, style]}
      backgroundTone={summary.planStatusTone === 'blocked' ? 'risk' : 'performance'}
      backgroundScrimColor="rgba(10, 10, 10, 0.76)"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Journey</Text>
          <Text style={styles.title} numberOfLines={2}>
            {summary.phase.label}
          </Text>
        </View>
        <View style={[styles.statusPill, { borderColor: riskTone.border, backgroundColor: riskTone.background }]}>
          <Text style={[styles.statusText, { color: riskTone.color }]}>{summary.planStatusLabel}</Text>
        </View>
      </View>

      <Text style={styles.body} numberOfLines={compact ? 2 : 3}>
        {sanitizeAthleteFacingCopy(summary.phase.reason)}
      </Text>

      {summary.journey.whatChangedLabel ? (
        <Text style={styles.changeText} numberOfLines={2}>
          {sanitizeAthleteFacingCopy(summary.journey.whatChangedLabel)}
        </Text>
      ) : null}

      <View style={styles.metricGrid}>
        <Metric label="Segment" value={summary.journey.segmentLabel} />
        <Metric label="Readiness" value={summary.readiness.bandLabel} detail={summary.readiness.scoreLabel} />
        <Metric label="Training" value={sanitizeAthleteFacingCopy(summary.focus.training)} lines={compact ? 2 : 3} />
        <Metric label="Fuel" value={sanitizeAthleteFacingCopy(summary.focus.nutrition)} lines={compact ? 2 : 3} />
      </View>

      {summary.journey.nextEventLabel ? (
        <View style={styles.eventStrip}>
          <Text style={styles.eventLabel} numberOfLines={1}>{summary.journey.nextEventLabel}</Text>
          {summary.journey.nextEventDateLabel ? (
            <Text style={styles.eventDate}>{summary.journey.nextEventDateLabel}</Text>
          ) : null}
        </View>
      ) : null}

      {showBodyMass && summary.bodyMass ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Body mass</Text>
          <Text style={styles.body} numberOfLines={2}>
            {[
              summary.bodyMass.trajectoryLabel,
              summary.bodyMass.feasibilityLabel ? `Status: ${summary.bodyMass.feasibilityLabel}` : null,
              summary.bodyMass.riskLabel ? `Risk: ${summary.bodyMass.riskLabel}` : null,
            ].filter(Boolean).join(' / ')}
          </Text>
          {summary.bodyMass.safetyLabel ? <Text style={styles.warningText}>{summary.bodyMass.safetyLabel}</Text> : null}
        </View>
      ) : null}

      {showProtectedAnchors && protectedAnchors.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Protected anchors</Text>
          {protectedAnchors.map((anchor) => (
            <View key={anchor.id} style={styles.anchorRow}>
              <View style={styles.anchorDot} />
              <Text style={styles.anchorText} numberOfLines={1}>
                {anchor.label}{anchor.dateLabel ? ` / ${anchor.dateLabel}` : ''} / {anchor.intensityLabel}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {topRisks.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Safety notes</Text>
          {topRisks.map((risk) => (
            <Text key={risk.id} style={risk.blocksPlan ? styles.blockingRiskText : styles.riskText} numberOfLines={2}>
              {risk.blocksPlan ? 'Review first: ' : ''}{sanitizeAthleteFacingCopy(risk.message)}
            </Text>
          ))}
        </View>
      ) : null}

      {summary.lowConfidence ? (
        <View style={styles.confidenceStrip}>
          <Text style={styles.confidenceText} numberOfLines={2}>{contextSummary}</Text>
        </View>
      ) : keyExplanation ? (
        <Text style={styles.explanationText} numberOfLines={2}>{keyExplanation}</Text>
      ) : null}
    </Card>
  );
}

function Metric({
  label,
  value,
  detail,
  lines = 2,
}: {
  label: string;
  value: string;
  detail?: string | null;
  lines?: number;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={lines}>{value}</Text>
      {detail ? <Text style={styles.metricDetail} numberOfLines={1}>{detail}</Text> : null}
    </View>
  );
}

function TodayCommandJourneyCard({
  summary,
  riskTone,
  topRisk,
  protectedAnchorCount,
  style,
  onPress,
}: {
  summary: UnifiedPerformanceViewModel;
  riskTone: ReturnType<typeof getRiskTone>;
  topRisk: UnifiedPerformanceViewModel['riskFlags'][number] | null;
  protectedAnchorCount: number;
  style?: StyleProp<ViewStyle>;
  onPress?: (() => void) | undefined;
}) {
  const bodyMassLabel = summary.bodyMass
    ? summary.bodyMass.feasibilityLabel ?? summary.bodyMass.trajectoryLabel
    : summary.focus.bodyMass ?? 'Unknown';
  const safetyLabel = summary.blockingRiskSummary
    ?? summary.bodyMass?.safetyLabel
    ?? topRisk?.message
    ?? 'No alerts';
  const safetyTone = topRisk?.blocksPlan
    ? COLORS.error
    : summary.lowConfidence
      ? COLORS.warning
      : COLORS.success;

  return (
    <Card
      variant="glass"
      style={[styles.todayCard, style]}
      backgroundTone="none"
    >
      <View style={styles.todayHeaderRow}>
        <View style={styles.todayHeaderCopy}>
          <Text style={styles.todayKicker}>JOURNEY</Text>
          <View style={styles.todayPhaseRow}>
            <View style={styles.todayPhaseMark}>
              <IconBarChart size={18} color={COLORS.accent} />
            </View>
            <View style={styles.todayPhaseCopy}>
              <Text style={styles.todayPhaseTitle} numberOfLines={1}>
                {summary.phase.label}
              </Text>
              <Text style={styles.todayPhaseSub} numberOfLines={1}>
                {summary.journey.segmentLabel}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.todayStatusPill, { borderColor: riskTone.border, backgroundColor: riskTone.background }]}>
          <Text style={[styles.todayStatusText, { color: riskTone.color }]} numberOfLines={1}>
            {summary.planStatusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.todayMetricGrid}>
        <TodayJourneyMetric label="Plan status" value={summary.planStatusLabel} tone={riskTone.color} />
        <TodayJourneyMetric label="Training focus" value={sanitizeAthleteFacingCopy(summary.focus.training)} tone={COLORS.chart.fitness} />
        <TodayJourneyMetric label="Fuel focus" value={sanitizeAthleteFacingCopy(summary.focus.nutrition)} tone={COLORS.chart.water} />
        <TodayJourneyMetric label="Context" value={summary.readiness.confidenceLabel} tone={summary.lowConfidence ? COLORS.warning : COLORS.text.secondary} />
      </View>

      <View style={styles.todayContextRow}>
        <TodayContextMetric
          icon={<IconShieldCheck size={17} color={COLORS.accent} />}
          label="Protected anchors"
          value={`${protectedAnchorCount} today`}
        />
        <TodayContextMetric
          icon={<IconScale size={17} color={COLORS.accent} />}
          label="Body mass"
          value={bodyMassLabel}
          tone={summary.bodyMass ? COLORS.success : COLORS.warning}
        />
        <TodayContextMetric
          icon={<IconAlertTriangle size={17} color={safetyTone} />}
          label="Safety notes"
          value={safetyLabel}
          tone={safetyTone}
        />
      </View>

      {onPress ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="View journey"
          style={styles.todayAction}
          onPress={onPress}
        >
          <Text style={styles.todayActionText}>View journey</Text>
          <IconChevronRight size={15} color={COLORS.accent} />
        </AnimatedPressable>
      ) : null}
    </Card>
  );
}

function TodayJourneyMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.todayMetricCell}>
      <Text style={styles.todayMetricLabel}>{label}</Text>
      <Text style={[styles.todayMetricValue, { color: tone }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TodayContextMetric({
  icon,
  label,
  value,
  tone = COLORS.text.secondary,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.todayContextMetric}>
      <View style={styles.todayContextIcon}>{icon}</View>
      <View style={styles.todayContextCopy}>
        <Text style={styles.todayMetricLabel} numberOfLines={1}>{label}</Text>
        <Text style={[styles.todayContextValue, { color: tone }]} numberOfLines={1}>
          {sanitizeAthleteFacingCopy(value)}
        </Text>
      </View>
    </View>
  );
}

function getRiskTone(tone: UnifiedPerformanceViewModel['planStatusTone']) {
  if (tone === 'blocked') {
    return {
      color: COLORS.error,
      border: `${COLORS.error}55`,
      background: `${COLORS.error}18`,
    };
  }
  if (tone === 'caution') {
    return {
      color: COLORS.warning,
      border: `${COLORS.warning}55`,
      background: `${COLORS.warning}18`,
    };
  }
  if (tone === 'ready') {
    return {
      color: COLORS.success,
      border: `${COLORS.success}55`,
      background: `${COLORS.success}18`,
    };
  }
  return {
    color: COLORS.text.tertiary,
    border: COLORS.borderLight,
    background: COLORS.surfaceSecondary,
  };
}

const styles = StyleSheet.create({
  todayCard: {
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.15)',
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(10, 14, 16, 0.82)',
    padding: SPACING.md,
  },
  todayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  todayHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  todayKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.accent,
    letterSpacing: 1.8,
  },
  todayPhaseRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  todayPhaseMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.42)',
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
  },
  todayPhaseCopy: {
    flex: 1,
    minWidth: 0,
  },
  todayPhaseTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  todayPhaseSub: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  todayStatusPill: {
    maxWidth: 116,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  todayStatusText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.extraBold,
  },
  todayMetricGrid: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245, 245, 240, 0.11)',
  },
  todayMetricCell: {
    flexBasis: '50%',
    minWidth: 128,
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  todayMetricLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  todayMetricValue: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.semiBold,
  },
  todayContextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  todayContextMetric: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  todayContextIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayContextCopy: {
    flex: 1,
    minWidth: 0,
  },
  todayContextValue: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.semiBold,
  },
  todayAction: {
    marginTop: SPACING.md,
    minHeight: 38,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.34)',
    backgroundColor: 'rgba(10, 10, 10, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  todayActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.accent,
  },
  card: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.14)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.extraBold,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  changeText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  metricCell: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 130,
    minHeight: 86,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(245, 245, 240, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.10)',
    padding: SPACING.sm,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  metricDetail: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  eventStrip: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: `${COLORS.accent}18`,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  eventLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  eventDate: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  sectionBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 245, 240, 0.12)',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: SPACING.xs,
  },
  warningText: {
    marginTop: SPACING.xs,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.warning,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 24,
  },
  anchorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  anchorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  riskText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  blockingRiskText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.error,
    marginBottom: 4,
  },
  confidenceStrip: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.warning}14`,
    borderWidth: 1,
    borderColor: `${COLORS.warning}30`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  confidenceText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.warning,
  },
  explanationText: {
    marginTop: SPACING.md,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
});
