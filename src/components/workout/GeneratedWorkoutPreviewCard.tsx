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
    return [repRange ? `${repRange} reps` : null, rir ? `${rir} RIR` : null, payload.effortGuidance].filter(Boolean).join('  |  ');
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
    `RPE ${prescription.targetRpe}`,
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

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function CopySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.copySection}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
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

  return (
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
          <MetaPill label={`${workout.estimatedDurationMinutes} min`} />
          <MetaPill label={`${workout.blocks.length} blocks`} />
        </View>
        <Text style={styles.intent}>{workout.sessionIntent ?? description?.sessionIntent ?? 'Train with intent.'}</Text>
        <Text style={styles.summary}>{workout.userFacingSummary ?? description?.plainLanguageSummary}</Text>
      </View>

      {description?.effortExplanation ? (
        <CopySection title="Effort">
          <Text style={styles.bodyText}>{description.effortExplanation}</Text>
        </CopySection>
      ) : null}

      <CopySection title="Blocks">
        <View style={styles.blockStack}>
          {workout.blocks.map((block) => (
            <View key={block.id} style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockTitle}>{block.title}</Text>
                <Text style={styles.blockDuration}>{block.estimatedDurationMinutes} min</Text>
              </View>
              {block.exercises.map((exercise) => (
                <View key={`${block.id}:${exercise.exerciseId}`} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exercisePrescription}>{formatPrescription(exercise)}</Text>
                  <Text style={styles.exerciseDetail}>{formatPayloadDetail(exercise.prescription.payload)}</Text>
                  <Text style={styles.exerciseDetail}>Rest: {formatRestGuidance(exercise)}</Text>
                  {exercise.scalingOptions ? (
                    <Text style={styles.exerciseDetail}>
                      Scale: {exercise.scalingOptions.down} / {exercise.scalingOptions.up}
                    </Text>
                  ) : null}
                  {exercise.substitutions?.[0] ? (
                    <Text style={styles.exerciseDetail}>
                      Swap: {exercise.substitutions[0].name} - {exercise.substitutions[0].rationale}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      </CopySection>

      <CopySection title="Safety">
        <BulletList items={workout.safetyNotes ?? description?.safetyNotes ?? []} />
      </CopySection>

      <CopySection title="Scaling">
        <BulletList items={scalingNotes} />
      </CopySection>

      <CopySection title="Substitutions">
        <BulletList items={allSubstitutions.map((item) => `${item.name}: ${item.rationale}`)} />
      </CopySection>

      <CopySection title="Success criteria">
        <BulletList items={workout.successCriteria} />
      </CopySection>

      <CopySection title="Tracking">
        <View style={styles.tagRow}>
          {(workout.trackingMetrics ?? workout.trackingMetricIds).map((metric) => (
            <View key={metric} style={styles.metricTag}>
              <Text style={styles.metricTagText}>{labelize(metric)}</Text>
            </View>
          ))}
        </View>
      </CopySection>

      {description?.completionMessage ? (
        <CopySection title="Completion">
          <Text style={styles.bodyText}>{description.completionMessage}</Text>
        </CopySection>
      ) : null}
    </Card>
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
  metaPillText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
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
  copySection: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionLabel: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
  blockTitle: {
    flex: 1,
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
