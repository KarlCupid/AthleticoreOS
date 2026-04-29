import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  buildGuidedBodyMassPlanCopy,
  sanitizeBodyMassCopy,
  type WeightClassManagementResult,
  type WeightClassRiskLevel,
} from '../../lib/performance-engine';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../theme/theme';
import { Card } from './Card';
import { IconAlertTriangle, IconCheckCircle } from './icons';

interface WeightClassEvaluationPreviewStepProps {
  evaluation: WeightClassManagementResult | null;
}

const HEALTH_GUIDANCE_NOTE =
  'Athleticore evaluates weight-class targets with safety gates. It will not build a risky body-mass plan around unsafe methods or an unrealistic timeline.';

const RISK_COLORS: Record<WeightClassRiskLevel, string> = {
  low: COLORS.success,
  moderate: COLORS.warning,
  high: COLORS.error,
  critical: COLORS.error,
};

function titleize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMass(value: number | null | undefined, unit = 'lb'): string {
  return value == null ? 'Unknown' : `${value.toFixed(1)} ${unit}`;
}

function formatRate(value: number | null | undefined, unit = 'lb_per_week'): string {
  return value == null ? 'Unknown' : `${value.toFixed(1)} ${unit.replace('_per_', '/')}`;
}

export function WeightClassEvaluationPreviewStep({ evaluation }: WeightClassEvaluationPreviewStepProps) {
  if (!evaluation) return null;

  const { plan } = evaluation;
  const riskColor = RISK_COLORS[plan.riskLevel];
  const blockingSafetyFlags = plan.safetyFlags.filter((flag) => flag.blocksPlan);
  const blockingRiskFlags = evaluation.riskFlags.filter((flag) => flag.blocksPlan);
  const guidedCopy = buildGuidedBodyMassPlanCopy({
    plan,
    risks: evaluation.riskFlags,
    shouldGenerateProtocol: evaluation.shouldGenerateProtocol,
  });
  const canPrepareAutomaticSupport = !guidedCopy.planBlocked;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 4 of 5</Text>
      <Text style={styles.heading}>Weight-Class Evaluation</Text>

      <Card
        style={[styles.statusCard, { borderLeftColor: canPrepareAutomaticSupport ? COLORS.success : riskColor }]}
        backgroundTone={canPrepareAutomaticSupport ? 'bodyMassSupport' : 'risk'}
        backgroundScrimColor="rgba(10, 10, 10, 0.78)"
      >
        <View style={styles.statusHeader}>
          {canPrepareAutomaticSupport ? (
            <IconCheckCircle size={20} color={COLORS.success} />
          ) : (
            <IconAlertTriangle size={20} color={riskColor} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {canPrepareAutomaticSupport ? 'Automatic support can be prepared' : 'Automatic support is blocked or needs review'}
            </Text>
            <Text style={styles.primaryQuestion}>Can this target be reached safely while maintaining performance?</Text>
            <Text style={styles.statusBody}>{guidedCopy.primaryMessage}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.planSummaryGrid}>
        <PlanStat label="Current" value={formatMass(plan.currentBodyMass?.value, plan.currentBodyMass?.unit)} />
        <PlanStat label="Target" value={formatMass(plan.desiredScaleWeight?.value, plan.desiredScaleWeight?.unit)} />
        <PlanStat label="Required" value={formatMass(plan.requiredChange.value, plan.requiredChange.unit)} />
        <PlanStat label="Rate" value={formatRate(plan.requiredRateOfChange.value, plan.requiredRateOfChange.unit)} />
        <PlanStat label="Feasibility" value={guidedCopy.statusLabel} />
        <PlanStat label="Risk" value={titleize(plan.riskLevel)} />
      </View>

      <Card
        style={styles.noteBox}
        backgroundTone="bodyMassSupport"
        backgroundScrimColor="rgba(10, 10, 10, 0.78)"
      >
        <Text style={styles.noteTitle}>Health guidance note</Text>
        <Text style={styles.noteBody}>{HEALTH_GUIDANCE_NOTE}</Text>
      </Card>

      {plan.explanation?.reasons.length ? (
        <SectionCard title="Why" items={[guidedCopy.clearExplanation, ...plan.explanation.reasons]} color={COLORS.accent} />
      ) : null}

      {blockingSafetyFlags.length > 0 || blockingRiskFlags.length > 0 ? (
        <SectionCard
          title="Blocking Safety Flags"
          items={[
            ...blockingSafetyFlags.map((flag) => flag.message),
            ...blockingRiskFlags.map((flag) => flag.message),
          ]}
          color={COLORS.error}
        />
      ) : null}

      {plan.professionalReviewRequired ? (
        <SectionCard
          title="Professional Review"
          items={[guidedCopy.professionalReviewRecommendation ?? 'Qualified review is recommended before automatic body-mass support continues.']}
          color={COLORS.error}
        />
      ) : null}

      {plan.nutritionImplications.length > 0 ? (
        <SectionCard title="Fueling Implications" items={guidedCopy.nutritionImplications} color={COLORS.chart.carbs} />
      ) : null}

      {plan.trainingImplications.length > 0 ? (
        <SectionCard title="Training Implications" items={guidedCopy.trainingImplications} color={COLORS.chart.fitness} />
      ) : null}

      {plan.alternatives.length > 0 ? (
        <SectionCard
          title="Safer Alternatives"
          items={guidedCopy.saferAlternatives}
          color={COLORS.warning}
        />
      ) : null}
    </View>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <Card
      style={styles.planStat}
      backgroundTone="bodyMassSupport"
      backgroundScrimColor="rgba(10, 10, 10, 0.80)"
    >
      <Text style={styles.planStatValue}>{value}</Text>
      <Text style={styles.planStatLabel}>{label}</Text>
    </Card>
  );
}

function SectionCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const filtered = uniqueSanitizedSectionItems(items);
  if (filtered.length === 0) return null;

  return (
    <Card
      style={[styles.sectionCard, { borderLeftColor: color }]}
      backgroundTone="bodyMassSupport"
      backgroundScrimColor="rgba(10, 10, 10, 0.78)"
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {filtered.map((item) => (
        <Text key={`${title}-${item}`} style={styles.sectionItem}>
          - {item}
        </Text>
      ))}
    </Card>
  );
}

function uniqueSanitizedSectionItems(items: string[]): string[] {
  const seen = new Set<string>();
  const filtered: string[] = [];

  for (const item of items) {
    const sanitized = sanitizeBodyMassCopy(item);
    if (!sanitized || seen.has(sanitized)) continue;

    seen.add(sanitized);
    filtered.push(sanitized);
  }

  return filtered;
}

const styles = StyleSheet.create({
  stepContainer: { gap: SPACING.md },
  stepTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heading: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, letterSpacing: 0 },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  statusTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  primaryQuestion: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 19,
  },
  statusBody: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  planSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  planStat: {
    width: '31%',
    minWidth: 96,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  planStatValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: 0,
  },
  planStatLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0,
  },
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
    letterSpacing: 0,
  },
  noteBody: {
    marginTop: SPACING.xs,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    letterSpacing: 0,
  },
  sectionItem: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: 2,
  },
});
