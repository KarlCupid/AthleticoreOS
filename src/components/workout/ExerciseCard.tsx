import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { ExerciseVM, ExerciseProgressVM, WorkoutRenderMode } from './types';
import { TrainingCard, type TrainingMetric } from './TrainingCard';
import { buildTrainingCoachCopy, formatDisplayLabel } from './trainingCopy';
import {
  getExerciseCardDisplayMeta,
  getExerciseRoleMeta,
  getLoadingStrategyMeta,
  getSectionTemplateMeta,
} from './metadata';

interface ExerciseCardProps {
  exercise: ExerciseVM;
  index?: number;
  progress?: ExerciseProgressVM | null;
  mode?: WorkoutRenderMode;
  currentWeight?: number | null;
  formatWeight?: (value: number) => string;
  children?: React.ReactNode;
}

function buildMetrics(input: {
  exercise: ExerciseVM;
  progress?: ExerciseProgressVM | null;
  currentWeight?: number | null;
  formatWeight?: (value: number) => string;
}): TrainingMetric[] {
  const { exercise, progress, currentWeight, formatWeight } = input;
  const strategyMeta = getLoadingStrategyMeta(exercise.loadingStrategy);
  const metrics: TrainingMetric[] = [];

  if (strategyMeta) metrics.push({ label: 'Type', value: strategyMeta.label, tone: 'accent' });

  if (currentWeight != null && currentWeight > 0) {
    metrics.push({
      label: 'Load now',
      value: `${formatWeight ? formatWeight(currentWeight) : currentWeight} lb`,
      tone: 'accent',
    });
  } else if (exercise.suggestedWeight != null && exercise.suggestedWeight > 0) {
    metrics.push({ label: 'Load', value: `${exercise.suggestedWeight} lb`, tone: 'accent' });
  }

  if (progress && progress.totalTargetSets > 0) {
    metrics.push({
      label: 'Done',
      value: `${progress.setsCompleted}/${progress.totalTargetSets}`,
      tone: progress.isComplete ? 'success' : 'default',
    });
  }

  return metrics.slice(0, 3);
}

export function ExerciseCard({
  exercise,
  index,
  progress,
  mode = 'readonly',
  currentWeight,
  formatWeight,
  children,
}: ExerciseCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setShowDetails(false);
  }, [exercise.id, mode]);

  const coachCopy = buildTrainingCoachCopy(exercise);
  const strategyMeta = getLoadingStrategyMeta(exercise.loadingStrategy);
  const sectionMeta = getSectionTemplateMeta(exercise.sectionTemplate);
  const roleMeta = getExerciseRoleMeta(exercise.role);
  const cardMeta = getExerciseCardDisplayMeta({
    mode,
    loadingStrategy: exercise.loadingStrategy,
    loadingNotes: exercise.loadingNotes,
    setPrescriptions: exercise.setPrescription,
    currentWeight,
    formatWeight,
    coachingCues: exercise.coachingCues,
  });
  const canExpandDetails =
    Boolean(cardMeta.howItWorksDetails)
    && cardMeta.howItWorksDetails !== cardMeta.howItWorksSummary;

  return (
    <TrainingCard
      eyebrow={mode === 'interactive' ? strategyMeta?.label ?? null : index != null ? `Step ${index}` : null}
      title={exercise.name}
      prescription={coachCopy.prescription}
      effort={coachCopy.effort}
      rest={coachCopy.rest}
      focus={coachCopy.focus}
      feel={mode === 'interactive' ? coachCopy.feel : null}
      mistake={mode === 'interactive' ? coachCopy.mistake : null}
      metrics={buildMetrics({ exercise, progress, currentWeight, formatWeight })}
      compact={mode !== 'interactive'}
    >
      {mode !== 'interactive' && (exercise.sectionTemplate || exercise.role || exercise.muscleGroup) ? (
        <View style={styles.tagRow}>
          {exercise.sectionTemplate ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {sectionMeta?.label ?? formatDisplayLabel(exercise.sectionTemplate)}
              </Text>
            </View>
          ) : null}
          {exercise.role ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {roleMeta?.label ?? formatDisplayLabel(exercise.role)}
              </Text>
            </View>
          ) : null}
          {exercise.muscleGroup ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{formatDisplayLabel(exercise.muscleGroup)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {cardMeta.howItWorksLabel && cardMeta.howItWorksSummary ? (
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>{cardMeta.howItWorksLabel}</Text>
          <Text style={styles.infoText}>{cardMeta.howItWorksSummary}</Text>
          {canExpandDetails ? (
            <>
              {showDetails ? (
                <View style={styles.infoDetailGroup}>
                  <Text style={styles.infoDetailText}>{cardMeta.howItWorksDetails}</Text>
                  {cardMeta.howItWorksLoggingInstruction ? (
                    <Text style={styles.infoDetailText}>{cardMeta.howItWorksLoggingInstruction}</Text>
                  ) : null}
                  {cardMeta.howItWorksExample ? (
                    <Text style={styles.infoExampleText}>{cardMeta.howItWorksExample}</Text>
                  ) : null}
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => setShowDetails((value) => !value)}
                activeOpacity={0.7}
                style={styles.learnMoreButton}
              >
                <Text style={styles.learnMoreText}>{showDetails ? 'Show less' : 'Show me how'}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}

      {exercise.loadingNotes && mode !== 'interactive' ? (
        <Text style={styles.loadingNotes}>{exercise.loadingNotes}</Text>
      ) : null}

      {children ? <View style={styles.childrenContainer}>{children}</View> : null}
    </TrainingCard>
  );
}

interface ExerciseRowCompactProps {
  exercise: ExerciseVM;
  index?: number;
  accessory?: React.ReactNode;
}

export function ExerciseRowCompact({ exercise, index, accessory }: ExerciseRowCompactProps) {
  const coachCopy = buildTrainingCoachCopy(exercise);

  return (
    <View style={compactStyles.row}>
      {index != null ? (
        <View style={compactStyles.index}>
          <Text style={compactStyles.indexText}>{index}</Text>
        </View>
      ) : null}
      <View style={compactStyles.info}>
        <Text style={compactStyles.name} numberOfLines={1}>{exercise.name}</Text>
        <Text style={compactStyles.meta} numberOfLines={1}>
          {coachCopy.prescription}
          {coachCopy.rest ? ` | ${coachCopy.rest}` : ''}
        </Text>
      </View>
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  tagRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  tagText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  infoBlock: {
    gap: 4,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  infoLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 10,
  },
  infoText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  infoDetailText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  infoDetailGroup: {
    gap: 6,
  },
  infoExampleText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  learnMoreText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
  },
  loadingNotes: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  childrenContainer: {
    marginTop: SPACING.xs,
  },
});
const compactStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 13,
    color: COLORS.accent,
  },
  info: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    fontSize: 15,
  },
  meta: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
});
