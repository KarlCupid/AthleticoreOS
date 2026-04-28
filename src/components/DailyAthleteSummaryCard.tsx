import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DailyAthleteSummary } from '../../lib/engine/types';
import { getSessionFamilyLabel, getSessionRoleLabel } from '../../lib/engine/sessionLabels';
import { calculateCaloriesFromMacros } from '../../lib/utils/nutrition';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

interface DailyAthleteSummaryCardProps {
  summary: DailyAthleteSummary;
  compact?: boolean;
}

function getRiskColor(level: DailyAthleteSummary['riskState']['level']): string {
  switch (level) {
    case 'critical':
      return COLORS.error;
    case 'high':
      return COLORS.warning;
    case 'moderate':
      return COLORS.accent;
    default:
      return COLORS.success;
  }
}

export const DailyAthleteSummaryCard = memo(function DailyAthleteSummaryCard({ summary, compact = false }: DailyAthleteSummaryCardProps) {
  const riskColor = getRiskColor(summary.riskState.level);
  const summaryCalories = calculateCaloriesFromMacros(
    summary.fuelDirective.protein,
    summary.fuelDirective.carbs,
    summary.fuelDirective.fat,
  );
  const sessionLabel = getSessionFamilyLabel({
    workoutType: summary.trainingDirective.workoutType,
    focus: summary.trainingDirective.focus,
    prescription: summary.trainingDirective.prescription,
  });
  const roleLabel = getSessionRoleLabel(summary.trainingDirective.sessionRole);

  return (
    <Card
      style={styles.card}
      backgroundTone="mission"
      backgroundScrimColor="rgba(10, 10, 10, 0.58)"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>DAILY MISSION</Text>
          <Text style={compact ? styles.headlineCompact : styles.headline}>{summary.headline}</Text>
          <Text style={styles.summary} numberOfLines={compact ? 2 : undefined}>{summary.summary}</Text>
        </View>
        <View style={[styles.riskChip, { backgroundColor: `${riskColor}1A` }]}>
          <Text style={[styles.riskChipText, { color: riskColor }]}>
            {summary.riskState.level.toUpperCase()}
          </Text>
        </View>
      </View>

      {!compact && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Training</Text>
            <Text style={styles.sectionLine}>{summary.trainingDirective.intent}</Text>
            <Text style={styles.metaLine}>
              {sessionLabel} Â· {roleLabel} Â· {summary.trainingDirective.volumeTarget}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fuel</Text>
            <Text style={styles.sectionLine}>
              {summaryCalories} kcal Â· P {summary.fuelDirective.protein} Â· C {summary.fuelDirective.carbs} Â· F {summary.fuelDirective.fat}
            </Text>
            <Text style={styles.metaLine}>
              Pre {summary.fuelDirective.preSessionCarbsG}g carbs Â· Post {summary.fuelDirective.postSessionProteinG}g protein Â· Water {summary.hydrationDirective.waterTargetOz} oz
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why it changed</Text>
            {summary.decisionTrace.slice(0, 3).map((item) => (
              <Text key={`${item.subsystem}-${item.title}`} style={styles.traceLine}>
                {item.title}: {item.detail}
              </Text>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Override</Text>
            <Text style={styles.footerValue}>{summary.overrideState.note}</Text>
          </View>
        </>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  headerCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  kicker: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.text.tertiary,
  },
  headline: {
    fontFamily: FONT_FAMILY.black,
    fontSize: 24,
    letterSpacing: 0,
    color: COLORS.text.primary,
  },
  headlineCompact: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  summary: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  riskChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  riskChipText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  sectionLine: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  metaLine: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  traceLine: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  footer: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 4,
  },
  footerLabel: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  footerValue: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
});
