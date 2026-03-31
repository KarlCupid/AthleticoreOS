import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { IconFire } from './icons';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  GRADIENTS,
} from '../theme/theme';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';

interface WorkoutPrescriptionSectionProps {
  prescription: any;
  themeColor: string;
  onStart?: () => void;
  showStartButton?: boolean;
}

function formatExerciseLine(exercise: any) {
  return exercise.setScheme ?? `${exercise.targetSets} x ${exercise.targetReps} @ RPE ${exercise.targetRPE}`;
}

function formatLoadingStrategy(strategy: string | null | undefined) {
  if (!strategy) return null;

  const labels: Record<string, string> = {
    straight_sets: 'Straight sets',
    top_set_backoff: 'Top set + backoff',
    density_block: 'Density block',
    intervals: 'Intervals',
    recovery_flow: 'Recovery flow',
    emom: 'EMOM',
    amrap: 'AMRAP',
    tabata: 'Tabata',
    timed_sets: 'Timed sets',
    for_time: 'For time',
    circuit_rounds: 'Circuit',
  };

  return labels[strategy] ?? String(strategy).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSubstitutions(exercise: any) {
  const substitutions = exercise.substitutions ?? [];
  if (substitutions.length === 0) return null;
  return substitutions.slice(0, 2).map((item: any) => item.exerciseName).join(' or ');
}

function renderExerciseRow(exercise: any) {
  const loadingStrategy = formatLoadingStrategy(exercise.loadingStrategy);
  const substitutions = formatSubstitutions(exercise);
  const focusCue = exercise.coachingCues?.[0] ?? null;

  return (
    <View key={exercise.exercise.id} style={styles.exerciseRow}>
      <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
      <Text style={styles.exerciseSub}>{formatExerciseLine(exercise)}</Text>
      {loadingStrategy ? (
        <Text style={styles.exerciseDetail}>
          {loadingStrategy}
          {exercise.restSeconds ? `  |  Rest ${exercise.restSeconds}s` : ''}
        </Text>
      ) : null}
      {focusCue ? <Text style={styles.exerciseDetail}>Focus cue: {focusCue}</Text> : null}
      {substitutions ? <Text style={styles.exerciseDetail}>Swap with: {substitutions}</Text> : null}
    </View>
  );
}

export function WorkoutPrescriptionSection({
  prescription,
  themeColor,
  onStart,
  showStartButton = true,
}: WorkoutPrescriptionSectionProps) {
  if (!prescription) return null;

  const sessionLabel = getSessionFamilyLabel({
    sessionType: prescription.workoutType,
    workoutType: prescription.workoutType,
    focus: prescription.focus,
    prescription,
  });

  const renderStrengthAndConditioning = () => {
    const hasSections = Array.isArray(prescription.sections) && prescription.sections.length > 0;

    return (
      <Card title="Workout details" subtitle={sessionLabel}>
        {prescription.sessionGoal ? (
          <View style={styles.sessionCopy}>
            <Text style={styles.sessionGoal}>{prescription.sessionGoal}</Text>
            {prescription.sessionIntent ? (
              <Text style={styles.sessionIntent}>{prescription.sessionIntent}</Text>
            ) : null}
          </View>
        ) : null}

        {hasSections ? (
          <View style={styles.sectionList}>
            {prescription.sections.map((section: any, sectionIndex: number) => (
              <View
                key={section.id ?? `${section.template}-${sectionIndex}`}
                style={[
                  styles.sectionBlock,
                  sectionIndex === prescription.sections.length - 1 && styles.sectionBlockLast,
                ]}
              >
                <View style={styles.sectionHeadingRow}>
                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.intent ? (
                      <Text style={styles.sectionIntentText}>{section.intent}</Text>
                    ) : null}
                  </View>
                  {section.timeCap ? (
                    <View style={[styles.sectionTag, { borderColor: themeColor }]}>
                      <Text style={[styles.sectionTagText, { color: themeColor }]}>
                        ~{section.timeCap} min
                      </Text>
                    </View>
                  ) : null}
                </View>

                {section.restRule ? (
                  <Text style={styles.sectionRules}>{section.restRule}</Text>
                ) : null}

                {section.exercises.map((exercise: any) => renderExerciseRow(exercise))}
              </View>
            ))}
          </View>
        ) : (
          <View>{prescription.exercises?.map((exercise: any) => renderExerciseRow(exercise))}</View>
        )}
      </Card>
    );
  };

  const renderRoadWork = () => (
    <Card title="Workout details" subtitle={sessionLabel}>
      <View style={styles.sessionCopy}>
        <Text style={styles.sessionGoal}>Pace guidance</Text>
        <Text style={styles.sessionIntent}>{prescription.paceGuidance}</Text>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Session plan</Text>
        <Text style={styles.exerciseSub}>
          {prescription.totalDurationMin} min
          {prescription.targetDistanceMiles ? `  |  ${prescription.targetDistanceMiles} mi target` : ''}
          {prescription.hrZoneRange ? `  |  Zone ${prescription.hrZoneRange[0]}-${prescription.hrZoneRange[1]}` : ''}
        </Text>
        {prescription.intervals?.map((interval: any, index: number) => (
          <View key={index} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{interval.type?.replace(/_/g, ' ') ?? 'Interval'}</Text>
            <Text style={styles.exerciseSub}>
              {interval.durationMin} min @ Zone {interval.hrZoneTarget}
            </Text>
          </View>
        ))}
        {prescription.message ? <Text style={styles.exerciseDetail}>{prescription.message}</Text> : null}
      </View>
    </Card>
  );

  const renderConditioning = () => (
    <Card title="Workout details" subtitle={sessionLabel}>
      <View style={styles.sessionCopy}>
        <Text style={styles.sessionGoal}>Conditioning structure</Text>
        <Text style={styles.sessionIntent}>
          {prescription.rounds} rounds  |  {prescription.workIntervalSec}s work / {prescription.restIntervalSec}s rest
        </Text>
      </View>

      <View style={styles.sectionBlock}>
        {prescription.exercises?.map((exercise: any, index: number) => (
          <View key={index} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{index + 1}. {exercise.name ?? exercise}</Text>
          </View>
        ))}
        {prescription.message ? <Text style={styles.exerciseDetail}>{prescription.message}</Text> : null}
      </View>
    </Card>
  );

  let content = null;
  if (prescription.exercises && prescription.workoutType) {
    content = renderStrengthAndConditioning();
  } else if (prescription.targetDistanceMiles !== undefined || prescription.paceGuidance) {
    content = renderRoadWork();
  } else if (prescription.rounds !== undefined && prescription.workIntervalSec !== undefined) {
    content = renderConditioning();
  } else {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {content}
      {showStartButton && onStart ? (
        <AnimatedPressable style={styles.startButtonWrapper} onPress={onStart}>
          <LinearGradient
            colors={[...GRADIENTS.accent] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButton}
          >
            <IconFire size={20} color="#FFF" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </LinearGradient>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.md,
  },
  sessionCopy: {
    marginBottom: SPACING.md,
  },
  sessionGoal: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  sessionIntent: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionList: {
    gap: SPACING.md,
  },
  sectionBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  sectionBlockLast: {
    paddingBottom: 0,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  sectionIntentText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  sectionTag: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  sectionTagText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    textTransform: 'uppercase',
  },
  sectionRules: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  exerciseRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  exerciseName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  exerciseSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  exerciseDetail: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 4,
    lineHeight: 17,
  },
  startButtonWrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.colored.accent,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#FFF',
  },
});
