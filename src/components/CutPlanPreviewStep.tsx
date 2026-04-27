import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { CutPlanResult } from '../../lib/engine/types';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../theme/theme';
import { Card } from './Card';
import { IconAlertTriangle } from './icons';

interface CutPlanPreviewStepProps {
  planResult: CutPlanResult | null;
  extremeAcknowledged: boolean;
  setExtremeAcknowledged: React.Dispatch<React.SetStateAction<boolean>>;
}

const HEALTH_GUIDANCE_NOTE =
  'AthletiCore provides coaching-oriented guidance for educational use. It does not replace licensed medical care or emergency support.';

export function CutPlanPreviewStep({
  planResult,
  extremeAcknowledged,
  setExtremeAcknowledged,
}: CutPlanPreviewStepProps) {
  if (!planResult) return null;

  const hasErrors = planResult.validationErrors.length > 0;
  const riskTitle = planResult.cutWarning
    ? `${planResult.cutWarning.severity.toUpperCase()} SAFETY WARNING`
    : 'SAFETY WARNING';

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 4 of 5</Text>
      <Text style={styles.heading}>Plan Preview</Text>

      {hasErrors ? (
        <Card
          style={styles.errorBox}
          backgroundTone="risk"
          backgroundScrimColor="rgba(10, 10, 10, 0.78)"
        >
          <IconAlertTriangle size={20} color={COLORS.error} />
          {planResult.validationErrors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              {error}
            </Text>
          ))}
        </Card>
      ) : (
        <>
          <View style={styles.planSummaryGrid}>
            <PlanStat label="Total Cut" value={`${planResult.totalCutLbs.toFixed(1)} lbs`} />
            <PlanStat label="Cut %" value={`${planResult.totalCutPct.toFixed(1)}%`} />
            <PlanStat label="Diet Loss" value={`${planResult.dietPhaseTargetLbs.toFixed(1)} lbs`} />
            <PlanStat label="Water Cut" value={`${planResult.waterCutAllocationLbs.toFixed(1)} lbs`} />
            <PlanStat label="Weekly Rate" value={`${planResult.safeWeeklyLossRateLbs.toFixed(1)} lbs/wk`} />
            <PlanStat label="Daily Deficit" value={`~${planResult.estimatedDailyDeficitIntensified} cal`} />
          </View>

          <View style={styles.phaseBreakdown}>
            {planResult.chronicPhaseDates ? (
              <PhaseRow
                name="Chronic Cut"
                start={planResult.chronicPhaseDates.start}
                end={planResult.chronicPhaseDates.end}
                color="#D4AF37"
                weeks={planResult.chronicPhaseWeeks}
              />
            ) : null}
            <PhaseRow
              name="Intensified Cut"
              start={planResult.intensifiedPhaseDates.start}
              end={planResult.intensifiedPhaseDates.end}
              color={COLORS.success}
              weeks={planResult.intensifiedPhaseWeeks}
            />
            <PhaseRow
              name="Fight Week"
              start={planResult.fightWeekDates.start}
              end={planResult.fightWeekDates.end}
              color="#D4AF37"
              weeks={1}
            />
          </View>

          <Card
            style={styles.noteBox}
            backgroundTone="cutProtocol"
            backgroundScrimColor="rgba(10, 10, 10, 0.78)"
          >
            <Text style={styles.noteTitle}>Health guidance note</Text>
            <Text style={styles.noteBody}>{HEALTH_GUIDANCE_NOTE}</Text>
          </Card>

          {planResult.cutWarning ? (
            <Card
              style={styles.extremeWarningBox}
              backgroundTone="risk"
              backgroundScrimColor="rgba(10, 10, 10, 0.72)"
            >
              <View style={styles.extremeWarningHeader}>
                <Text style={styles.extremeWarningIcon}>!</Text>
                <Text style={styles.extremeWarningTitle}>{riskTitle}</Text>
              </View>
              <Text style={styles.extremeWarningBody}>{planResult.cutWarning.message}</Text>
              {planResult.cutWarning.severity === 'severe' || planResult.cutWarning.severity === 'medical' ? (
                <>
                  <Text style={styles.extremeWarningSubheading}>Key risks to monitor:</Text>
                  {[
                    'Dehydration, heat illness, and kidney strain',
                    'Cognitive and neuromuscular impairment',
                    'Reduced sparring and fight-day performance',
                    'Low energy availability and poor recovery',
                  ].map((risk) => (
                    <Text key={risk} style={styles.extremeRiskItem}>
                      - {risk}
                    </Text>
                  ))}
                </>
              ) : null}

              {planResult.cutWarning.requiresAcknowledgement ? (
                <TouchableOpacity
                  style={styles.ackRow}
                  onPress={() => setExtremeAcknowledged((value) => !value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.ackCheckbox, extremeAcknowledged && styles.ackCheckboxChecked]}>
                    {extremeAcknowledged ? <Text style={styles.ackCheckmark}>OK</Text> : null}
                  </View>
                  <Text style={styles.ackText}>
                    I understand these risks are real. I will only proceed with qualified supervision and will stop if safety symptoms appear.
                  </Text>
                </TouchableOpacity>
              ) : null}
            </Card>
          ) : null}

          {planResult.safetyWarnings.length > 0 && !planResult.cutWarning ? (
            <Card
              style={styles.warningBox}
              backgroundTone="risk"
              backgroundScrimColor="rgba(10, 10, 10, 0.78)"
            >
              <IconAlertTriangle size={16} color={COLORS.warning} />
              {planResult.safetyWarnings.map((warning, index) => (
                <Text key={`${warning}-${index}`} style={styles.warningText}>
                  {warning}
                </Text>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </View>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <Card
      style={styles.planStat}
      backgroundTone="cutProtocol"
      backgroundScrimColor="rgba(10, 10, 10, 0.80)"
    >
      <Text style={styles.planStatValue}>{value}</Text>
      <Text style={styles.planStatLabel}>{label}</Text>
    </Card>
  );
}

function PhaseRow(props: { name: string; start: string; end: string; color: string; weeks: number }) {
  const { name, start, end, color, weeks } = props;

  return (
    <Card
      style={styles.phaseRow}
      backgroundTone="cutProtocol"
      backgroundScrimColor="rgba(10, 10, 10, 0.80)"
    >
      <View style={[styles.phaseColor, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.phaseName}>{name}</Text>
        <Text style={styles.phaseDates}>
          {start} to {end} ({Math.round(weeks)}w)
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stepContainer: { gap: SPACING.md },
  stepTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heading: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  errorBox: { backgroundColor: `${COLORS.error}18`, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: `${COLORS.error}44` },
  errorText: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.error, lineHeight: 20 },
  warningBox: { backgroundColor: `${COLORS.warning}18`, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: `${COLORS.warning}44` },
  warningText: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary, lineHeight: 20 },
  planSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  planStat: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  planStatValue: { fontSize: 18, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  planStatLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  phaseBreakdown: { gap: SPACING.sm },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  phaseColor: { width: 4, height: 40, borderRadius: 2 },
  phaseName: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  phaseDates: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, marginTop: 2 },
  noteBox: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.24)',
  },
  noteTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noteBody: {
    marginTop: SPACING.xs,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  extremeWarningBox: {
    backgroundColor: 'rgba(28, 10, 10, 0.82)',
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.error,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  extremeWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  extremeWarningIcon: { fontSize: 22 },
  extremeWarningTitle: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.error,
    letterSpacing: 0.4,
    flex: 1,
  },
  extremeWarningSubheading: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  extremeWarningBody: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: COLORS.text.secondary, lineHeight: 20 },
  extremeRiskItem: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.error,
    paddingLeft: SPACING.xs,
    lineHeight: 20,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    backgroundColor: `${COLORS.error}18`,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  ackCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  ackCheckboxChecked: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  ackCheckmark: { fontFamily: FONT_FAMILY.semiBold, fontSize: 11, color: COLORS.text.primary },
  ackText: { flex: 1, fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary, lineHeight: 18 },
});
