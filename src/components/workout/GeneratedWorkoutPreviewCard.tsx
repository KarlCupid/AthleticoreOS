import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type {
  GeneratedExercisePrescription,
  GeneratedWorkout,
  PrescriptionPayload,
} from '../../../lib/performance-engine/workout-programming';
import { Card } from '../Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';

interface GeneratedWorkoutPreviewCardProps {
  workout: GeneratedWorkout;
  title?: string;
  subtitle?: string;
}

function formatRange(range: { min?: number; max?: number; target?: number; unit?: string } | undefined): string | null {
  if (!range) return null;
  const unit = range.unit ? ` ${range.unit}` : '';
  if (range.target != null) return `${range.target}${unit}`;
  if (range.min != null && range.max != null) return `${range.min}-${range.max}${unit}`;
  if (range.min != null) return `${range.min}+${unit}`;
  if (range.max != null) return `up to ${range.max}${unit}`;
  return null;
}

function formatPayloadDetail(payload: PrescriptionPayload): string | null {
  if (payload.kind === 'resistance') {
    const repRange = 'repRange' in payload ? formatRange(payload.repRange as { min?: number; max?: number; target?: number; unit?: string }) : null;
    const rir = payload.RIR ? formatRange(payload.RIR) : null;
    return [repRange ? `${repRange} reps` : null, rir ? `${rir} reps in reserve` : null, payload.effortGuidance].filter(Boolean).join('  |  ');
  }
  if (payload.kind === 'cardio') {
    return [formatRange(payload.durationMinutes), payload.talkTest, `Zone ${formatRange(payload.heartRateZone as { min?: number; max?: number; target?: number; unit?: string })}`].filter(Boolean).join('  |  ');
  }
  if (payload.kind === 'conditioning' || payload.kind === 'interval') {
    return `${formatRange(payload.workIntervalSeconds)}s work / ${formatRange(payload.restIntervalSeconds)}s rest  |  ${formatRange(payload.rounds)} rounds`;
  }
  if (payload.kind === 'mobility') {
    return `${payload.targetJoints.join(', ')}  |  ${payload.rangeOfMotionIntent}`;
  }
  if (payload.kind === 'flexibility') {
    return `${payload.targetTissues.join(', ')}  |  ${formatRange(payload.holdTimeSeconds)}s holds`;
  }
  if (payload.kind === 'balance') {
    return `${payload.mode} balance  |  ${payload.baseOfSupport.replace(/_/g, ' ')}`;
  }
  if (payload.kind === 'power') {
    return `${formatRange(payload.sets)} sets  |  ${formatRange(payload.reps as { min?: number; max?: number; target?: number; unit?: string })} reps  |  ${payload.explosiveIntent}`;
  }
  return `${formatRange(payload.durationMinutes)} min  |  ${payload.breathingStrategy}`;
}

function formatPrescription(exercise: GeneratedExercisePrescription): string {
  const prescription = exercise.prescription;
  const baseParts = [
    prescription.sets != null ? `${prescription.sets} sets` : null,
    prescription.reps ? `${prescription.reps} reps` : null,
    prescription.durationMinutes != null ? `${prescription.durationMinutes} min` : null,
    prescription.durationSeconds != null ? `${prescription.durationSeconds}s` : null,
    `Effort ${prescription.targetRpe}/10`,
  ];
  return baseParts.filter(Boolean).join('  |  ');
}

function formatRestGuidance(exercise: GeneratedExercisePrescription): string {
  const payload = exercise.prescription.payload;
  if (payload.kind === 'resistance') {
    const rest = formatRange(payload.restSecondsRange);
    return rest ? `Rest ${rest}s. ${payload.loadGuidance}` : payload.loadGuidance;
  }
  if (payload.kind === 'power') {
    const rest = formatRange(payload.fullRecoverySeconds);
    return rest ? `Rest ${rest}s so reps stay fast and clean.` : payload.technicalQuality;
  }
  if (payload.kind === 'conditioning' || payload.kind === 'interval') {
    return `Recover ${formatRange(payload.restIntervalSeconds)}s between work intervals.`;
  }
  if (payload.kind === 'recovery') return payload.readinessAdjustment;
  return exercise.prescription.intensityCue;
}

function formatTempoGuidance(exercise: GeneratedExercisePrescription): string | null {
  if (exercise.prescription.tempo) return exercise.prescription.tempo;
  const payload = exercise.prescription.payload;
  return payload.kind === 'resistance' ? payload.tempo : null;
}

function readinessAdjustmentLine(workout: GeneratedWorkout): string | null {
  const sources = [
    ...workout.explanations,
    ...(workout.decisionTrace?.map((entry) => entry.reason) ?? []),
    ...(workout.validation?.userFacingMessages ?? []),
  ];
  return sources.find((item) => /readiness|sleep|soreness|fatigue|recovery/i.test(item)) ?? null;
}

function safetyStatus(workout: GeneratedWorkout): { label: string; detail: string; tone: 'ok' | 'caution' | 'blocked' } {
  if (workout.blocked) {
    return {
      label: 'Blocked',
      detail: 'Hard training is not recommended from this generated session.',
      tone: 'blocked',
    };
  }
  if (workout.validation && !workout.validation.isValid) {
    return {
      label: 'Needs review',
      detail: 'Review validation messages before starting.',
      tone: 'caution',
    };
  }
  if (workout.safetyFlags.length > 0 || (workout.safetyNotes?.length ?? 0) > 0) {
    return {
      label: 'Cautions active',
      detail: 'Use the listed guardrails and keep the session comfortable and controlled.',
      tone: 'caution',
    };
  }
  return {
    label: 'Ready',
    detail: 'No extra safety flag was applied to this generated session.',
    tone: 'ok',
  };
}

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function MetaPill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'ok' | 'caution' | 'blocked' }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.metaPill, tone === 'ok' && styles.metaPillOk, tone === 'caution' && styles.metaPillCaution, tone === 'blocked' && styles.metaPillBlocked]}
    >
      <Text style={[styles.metaPillText, tone !== 'default' && styles.metaPillStrongText]}>{label}</Text>
    </View>
  );
}

function FactTile({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail?: string | null;
  tone?: 'default' | 'ok' | 'caution' | 'blocked';
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ''}`}
      style={[styles.factTile, tone === 'ok' && styles.factTileOk, tone === 'caution' && styles.factTileCaution, tone === 'blocked' && styles.factTileBlocked]}
    >
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
      {detail ? <Text style={styles.factDetail}>{detail}</Text> : null}
    </View>
  );
}

function CopySection({
  title,
  children,
  testID,
}: {
  title: string;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} accessibilityLabel={`${title} section`} style={styles.copySection}>
      <Text accessibilityRole="header" style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailText}>{value}</Text>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function GeneratedWorkoutPreviewCard({
  workout,
  title = 'Generated workout preview',
  subtitle = 'Developer-only programming engine output',
}: GeneratedWorkoutPreviewCardProps) {
  const description = workout.description;
  const allSubstitutions = workout.blocks
    .flatMap((block) => block.exercises)
    .flatMap((exercise) => exercise.substitutions ?? [])
    .slice(0, 5);
  const scalingNotes = [
    workout.scalingOptions?.down ? `Down: ${workout.scalingOptions.down}` : null,
    workout.scalingOptions?.up ? `Up: ${workout.scalingOptions.up}` : null,
    ...(workout.scalingOptions?.substitutions ?? []),
    workout.scalingOptions?.recoveryAlternative ?? null,
  ].filter((item): item is string => Boolean(item));
  const validationMessages = Array.from(new Set([
    ...(workout.validationWarnings ?? []),
    ...(workout.validationErrors ?? []),
    ...(workout.validation?.warnings ?? []),
    ...(workout.validation?.errors ?? []),
  ].filter((item): item is string => Boolean(item))));
  const readinessAdjustment = readinessAdjustmentLine(workout);
  const safety = safetyStatus(workout);
  const primarySafetyNotes = [
    ...new Set([
      ...(workout.safetyNotes ?? []),
      ...(description?.safetyNotes ?? []),
      'Pause if pain becomes sharp, unusual, or changes how you move.',
      'If you notice chest pain, fainting, severe dizziness, or neurological symptoms, stop and seek professional guidance.',
    ]),
  ];

  return (
    <View testID="generated-workout-preview-card">
      <Card
        title={title}
        subtitle={subtitle}
        subtitleLines={2}
        backgroundTone="workoutFloor"
        backgroundScrimColor="rgba(10, 10, 10, 0.74)"
        style={styles.card}
      >
        <View style={styles.headerCopy}>
          <View style={styles.metaRow}>
            <MetaPill label={labelize(workout.workoutTypeId)} />
            <MetaPill label={labelize(workout.goalId)} />
            <MetaPill label={`${workout.estimatedDurationMinutes} min`} />
            <MetaPill label={`${workout.blocks.length} blocks`} />
            <MetaPill label={safety.label} tone={safety.tone} />
          </View>
          <Text testID="generated-workout-preview-intent" accessibilityRole="header" style={styles.intent}>
            {workout.sessionIntent ?? description?.sessionIntent ?? 'Train with intent.'}
          </Text>
          <Text style={styles.summary}>{workout.userFacingSummary ?? description?.plainLanguageSummary}</Text>
          <View testID="generated-workout-preview-session-header" style={styles.factGrid}>
            <FactTile label="Workout type" value={labelize(workout.workoutTypeId)} />
            <FactTile label="Goal" value={workout.trainingGoalLabel ?? labelize(workout.goalId)} />
            <FactTile label="Duration" value={`${workout.estimatedDurationMinutes} min`} detail={`Requested ${workout.requestedDurationMinutes} min`} />
            <FactTile label="Readiness" value={readinessAdjustment ? 'Adjusted' : 'No change'} detail={readinessAdjustment ?? 'Use normal effort unless your readiness changes.'} tone={readinessAdjustment ? 'caution' : 'default'} />
            <FactTile label="Safety" value={safety.label} detail={safety.detail} tone={safety.tone} />
          </View>
        </View>

        {workout.blocked ? (
          <CopySection title="Safety block" testID="generated-workout-preview-blocked">
            <Text style={styles.bodyText}>This generated session is blocked. Use the safety notes and choose a review, recovery, or mobility path before training.</Text>
            <BulletList items={workout.explanations} />
          </CopySection>
        ) : null}

        {description?.effortExplanation ? (
          <CopySection title="Effort" testID="generated-workout-preview-effort">
            <Text style={styles.bodyText}>{description.effortExplanation}</Text>
          </CopySection>
        ) : null}

        <CopySection title="Success criteria" testID="generated-workout-preview-success">
          <BulletList items={workout.successCriteria} />
        </CopySection>

        <CopySection title="Blocks" testID="generated-workout-preview-blocks">
          <View style={styles.blockStack}>
            {workout.blocks.map((block) => (
              <View key={block.id} style={styles.block}>
                <View style={styles.blockHeader}>
                  <View style={styles.blockTitleGroup}>
                    <MetaPill label={labelize(block.kind)} />
                    <Text accessibilityRole="header" style={styles.blockTitle}>{block.title}</Text>
                  </View>
                  <Text style={styles.blockDuration}>{block.estimatedDurationMinutes} min</Text>
                </View>
                {block.exercises.map((exercise) => (
                  <View key={`${block.id}:${exercise.exerciseId}`} style={styles.exerciseRow}>
                    <Text accessibilityRole="header" style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseWhy}>{exercise.explanation}</Text>
                    <View style={styles.detailPanel}>
                      <DetailLine label="Dose" value={formatPrescription(exercise)} />
                      <DetailLine label="Intensity" value={`Effort ${exercise.prescription.targetRpe}/10. ${exercise.prescription.intensityCue}`} />
                      <DetailLine label="Rest" value={formatRestGuidance(exercise)} />
                      <DetailLine label="Tempo" value={formatTempoGuidance(exercise)} />
                      <DetailLine label="Payload" value={formatPayloadDetail(exercise.prescription.payload)} />
                    </View>
                    {exercise.coachingCues && exercise.coachingCues.length > 0 ? (
                      <View style={styles.exerciseSubsection}>
                        <Text style={styles.exerciseSubsectionTitle}>Cues</Text>
                        <BulletList items={exercise.coachingCues.slice(0, 3)} />
                      </View>
                    ) : null}
                    {exercise.commonMistakes && exercise.commonMistakes.length > 0 ? (
                      <View style={styles.exerciseSubsection}>
                        <Text style={styles.exerciseSubsectionTitle}>Watch</Text>
                        <BulletList items={exercise.commonMistakes.slice(0, 2)} />
                      </View>
                    ) : null}
                    {exercise.scalingOptions ? (
                      <View style={styles.exerciseSubsection}>
                        <Text style={styles.exerciseSubsectionTitle}>Scale</Text>
                        <Text style={styles.exerciseDetail}>Down: {exercise.scalingOptions.down}</Text>
                        <Text style={styles.exerciseDetail}>Up: {exercise.scalingOptions.up}</Text>
                      </View>
                    ) : null}
                    {exercise.substitutions && exercise.substitutions.length > 0 ? (
                      <View style={styles.exerciseSubsection}>
                        <Text style={styles.exerciseSubsectionTitle}>Substitutions</Text>
                        <BulletList items={exercise.substitutions.slice(0, 2).map((substitution) => `${substitution.name}: ${substitution.rationale}`)} />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </CopySection>

        <CopySection title="Safety" testID="generated-workout-preview-safety">
          <BulletList items={primarySafetyNotes} />
        </CopySection>

        <CopySection title="Scaling" testID="generated-workout-preview-scaling">
          <BulletList items={scalingNotes} />
        </CopySection>

        <CopySection title="Substitutions" testID="generated-workout-preview-substitutions">
          <BulletList items={allSubstitutions.map((item) => `${item.name}: ${item.rationale}`)} />
        </CopySection>

        {validationMessages.length > 0 ? (
          <CopySection title="Validation" testID="generated-workout-preview-validation">
            <BulletList items={validationMessages} />
          </CopySection>
        ) : null}

        <CopySection title="Tracking" testID="generated-workout-preview-tracking">
          <View style={styles.tagRow}>
            {(workout.trackingMetrics ?? workout.trackingMetricIds).map((metric) => (
              <View key={metric} style={styles.metricTag}>
                <Text style={styles.metricTagText}>{labelize(metric)}</Text>
              </View>
            ))}
          </View>
        </CopySection>

        {description?.completionMessage ? (
          <CopySection title="Completion" testID="generated-workout-preview-completion">
            <Text style={styles.bodyText}>{description.completionMessage}</Text>
          </CopySection>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  headerCopy: {
    gap: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metaPill: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
  },
  metaPillOk: {
    backgroundColor: 'rgba(183, 217, 168, 0.16)',
    borderColor: 'rgba(183, 217, 168, 0.26)',
    borderWidth: 1,
  },
  metaPillCaution: {
    backgroundColor: COLORS.accentLight,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    borderWidth: 1,
  },
  metaPillBlocked: {
    backgroundColor: 'rgba(217, 130, 126, 0.16)',
    borderColor: 'rgba(217, 130, 126, 0.28)',
    borderWidth: 1,
  },
  metaPillText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
  },
  metaPillStrongText: {
    color: COLORS.text.primary,
  },
  intent: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 19,
    lineHeight: 25,
  },
  summary: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  factTile: {
    minWidth: 132,
    flex: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 3,
    padding: SPACING.sm,
  },
  factTileOk: {
    borderColor: 'rgba(183, 217, 168, 0.28)',
  },
  factTileCaution: {
    borderColor: 'rgba(212, 175, 55, 0.34)',
  },
  factTileBlocked: {
    borderColor: 'rgba(217, 130, 126, 0.36)',
  },
  factLabel: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  factValue: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  factDetail: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  copySection: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionLabel: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  bodyText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  blockStack: {
    gap: SPACING.md,
  },
  block: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  blockTitleGroup: {
    flex: 1,
    gap: SPACING.xs,
  },
  blockTitle: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
  },
  blockDuration: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
  },
  exerciseRow: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
    gap: 4,
  },
  exerciseName: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
  },
  exerciseWhy: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  exercisePrescription: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  exerciseDetail: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  detailPanel: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 6,
    marginTop: SPACING.xs,
    padding: SPACING.sm,
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  detailLabel: {
    width: 70,
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  detailText: {
    flex: 1,
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  exerciseSubsection: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  exerciseSubsectionTitle: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  bulletList: {
    gap: SPACING.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metricTag: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  metricTagText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
  },
});
