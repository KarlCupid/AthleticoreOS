import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { UnifiedPerformanceViewModel } from '../../../lib/performance-engine';
import { Card } from '../Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';

interface UnifiedJourneySummaryCardProps {
  summary: UnifiedPerformanceViewModel;
  compact?: boolean;
  showProtectedAnchors?: boolean;
  showBodyMass?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function UnifiedJourneySummaryCard({
  summary,
  compact = false,
  showProtectedAnchors = true,
  showBodyMass = true,
  style,
}: UnifiedJourneySummaryCardProps) {
  const riskTone = getRiskTone(summary.planStatusTone);
  const topRisks = summary.riskFlags.slice(0, compact ? 2 : 3);
  const protectedAnchors = summary.protectedAnchors.slice(0, compact ? 2 : 4);
  const keyExplanation = summary.explanations[0]?.summary ?? null;

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
        {summary.phase.reason}
      </Text>

      {summary.journey.whatChangedLabel ? (
        <Text style={styles.changeText} numberOfLines={2}>
          {summary.journey.whatChangedLabel}
        </Text>
      ) : null}

      <View style={styles.metricGrid}>
        <Metric label="Segment" value={summary.journey.segmentLabel} />
        <Metric label="Readiness" value={summary.readiness.bandLabel} detail={summary.readiness.scoreLabel} />
        <Metric label="Training" value={summary.focus.training} lines={compact ? 2 : 3} />
        <Metric label="Fuel" value={summary.focus.nutrition} lines={compact ? 2 : 3} />
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
              summary.bodyMass.feasibilityLabel ? `Feasibility: ${summary.bodyMass.feasibilityLabel}` : null,
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
          <Text style={styles.sectionLabel}>Risk flags</Text>
          {topRisks.map((risk) => (
            <Text key={risk.id} style={risk.blocksPlan ? styles.blockingRiskText : styles.riskText} numberOfLines={2}>
              {risk.blocksPlan ? 'Blocked: ' : ''}{risk.message}
            </Text>
          ))}
        </View>
      ) : null}

      {summary.lowConfidence ? (
        <View style={styles.confidenceStrip}>
          <Text style={styles.confidenceText} numberOfLines={2}>{summary.confidenceSummary}</Text>
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
