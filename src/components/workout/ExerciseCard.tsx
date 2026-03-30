import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { ExerciseVM, ExerciseProgressVM, WorkoutRenderMode } from './types';
import {
  formatDisplayLabel,
  getExerciseCardDisplayMeta,
  getExerciseRoleMeta,
  getLoadingStrategyMeta,
  getSectionTemplateMeta,
} from './metadata';

const STRATEGY_TONES: Record<string, string> = {
  straight_sets: COLORS.accent,
  top_set_backoff: COLORS.readiness.caution,
  density_block: COLORS.chart.fatigue,
  intervals: COLORS.chart.fitness,
  recovery_flow: COLORS.readiness.prime,
  emom: COLORS.chart.fitness,
  amrap: COLORS.readiness.caution,
  tabata: COLORS.readiness.depleted,
  timed_sets: COLORS.chart.fatigue,
  for_time: COLORS.readiness.caution,
  circuit_rounds: COLORS.chart.fitness,
};

interface ExerciseCardProps {
  exercise: ExerciseVM;
  index?: number;
  progress?: ExerciseProgressVM | null;
  mode?: WorkoutRenderMode;
  currentWeight?: number | null;
  formatWeight?: (value: number) => string;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Interactive mode — bold, cardless, gym floor
// ---------------------------------------------------------------------------

function InteractiveExercise({
  exercise,
  children,
}: {
  exercise: ExerciseVM;
  children?: React.ReactNode;
}) {
  const strategyMeta = getLoadingStrategyMeta(exercise.loadingStrategy);
  const tone = STRATEGY_TONES[exercise.loadingStrategy ?? ''] ?? COLORS.accent;

  const scheme =
    exercise.setScheme ??
    `${exercise.targetSets} × ${exercise.targetReps}${exercise.targetRPE > 0 ? `  @RPE ${exercise.targetRPE}` : ''}`;

  return (
    <View style={ix.container}>
      {/* Exercise name — dominant */}
      <Text style={ix.name} numberOfLines={2}>
        {exercise.name}
      </Text>

      {/* Scheme + strategy on one line */}
      <View style={ix.metaRow}>
        <Text style={ix.scheme}>{scheme}</Text>
        {strategyMeta && (
          <View style={[ix.strategyChip, { backgroundColor: `${tone}15` }]}>
            <Text style={[ix.strategyLabel, { color: tone }]}>{strategyMeta.label}</Text>
          </View>
        )}
      </View>

      {/* Accent divider */}
      <View style={ix.divider} />

      {/* Children: LoadingPyramid, phase strip, etc. */}
      {children ? <View style={ix.childArea}>{children}</View> : null}
    </View>
  );
}

const ix = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  name: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  scheme: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 17,
    color: COLORS.text.secondary,
    letterSpacing: 0.3,
  },
  strategyChip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
  },
  strategyLabel: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.accent,
    opacity: 0.25,
    borderRadius: 1,
  },
  childArea: {
    gap: SPACING.sm,
  },
});

// ---------------------------------------------------------------------------
// Readonly mode — the traditional card (unchanged)
// ---------------------------------------------------------------------------

export function ExerciseCard({
  exercise,
  index,
  progress,
  mode = 'readonly',
  currentWeight,
  formatWeight,
  children,
}: ExerciseCardProps) {
  // ── Interactive: bold gym-floor layout ──
  if (mode === 'interactive') {
    return <InteractiveExercise exercise={exercise}>{children}</InteractiveExercise>;
  }

  // ── Readonly: traditional card ──
  const [showHowItWorksDetails, setShowHowItWorksDetails] = useState(false);

  useEffect(() => {
    setShowHowItWorksDetails(false);
  }, [exercise.id, mode]);

  const strategyMeta = getLoadingStrategyMeta(exercise.loadingStrategy);
  const strategy = strategyMeta
    ? {
        label: strategyMeta.label,
        tone: STRATEGY_TONES[exercise.loadingStrategy ?? ''] ?? COLORS.accent,
      }
    : null;
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

  const completionText =
    progress && progress.totalTargetSets > 0
      ? `${progress.setsCompleted}/${progress.totalTargetSets}`
      : null;

  const canExpandHowItWorks =
    Boolean(cardMeta.howItWorksDetails)
    && cardMeta.howItWorksDetails !== cardMeta.howItWorksSummary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {index != null && (
          <View style={styles.indexCircle}>
            <Text style={styles.indexText}>{index}</Text>
          </View>
        )}
        <View style={styles.nameBlock}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {exercise.name}
          </Text>
          {exercise.muscleGroup ? (
            <Text style={styles.muscleLabel}>
              {formatDisplayLabel(exercise.muscleGroup)}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightBadges}>
          {strategy && (
            <View style={[styles.strategyBadge, { backgroundColor: `${strategy.tone}18` }]}>
              <Text style={[styles.strategyText, { color: strategy.tone }]}>
                {strategy.label}
              </Text>
            </View>
          )}
          {completionText && (
            <View
              style={[
                styles.completionBadge,
                progress?.isComplete ? styles.completionDone : null,
              ]}
            >
              <Text
                style={[
                  styles.completionText,
                  progress?.isComplete ? styles.completionTextDone : null,
                ]}
              >
                {completionText}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.detailRow}>
        {exercise.setScheme ? (
          <Text style={styles.setScheme}>{exercise.setScheme}</Text>
        ) : (
          <Text style={styles.setScheme}>
            {exercise.targetSets} x {exercise.targetReps}
            {exercise.targetRPE > 0 ? ` @ RPE ${exercise.targetRPE}` : ''}
          </Text>
        )}
        {exercise.suggestedWeight != null && exercise.suggestedWeight > 0 && (
          <Text style={styles.weightHint}>{exercise.suggestedWeight} lb</Text>
        )}
        {exercise.restSeconds != null && exercise.restSeconds > 0 && (
          <Text style={styles.restHint}>
            Rest {exercise.restSeconds >= 60
              ? `${Math.floor(exercise.restSeconds / 60)}m${exercise.restSeconds % 60 > 0 ? ` ${exercise.restSeconds % 60}s` : ''}`
              : `${exercise.restSeconds}s`}
          </Text>
        )}
      </View>

      {(exercise.sectionTemplate || exercise.role) && (
        <View style={styles.tagRow}>
          {exercise.sectionTemplate && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {sectionMeta?.label ?? formatDisplayLabel(exercise.sectionTemplate)}
              </Text>
            </View>
          )}
          {exercise.role && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {roleMeta?.label ?? formatDisplayLabel(exercise.role)}
              </Text>
            </View>
          )}
        </View>
      )}

      {cardMeta.howItWorksLabel && cardMeta.howItWorksSummary ? (
        <View style={styles.howItWorksBlock}>
          <Text style={styles.infoLabel}>{cardMeta.howItWorksLabel}</Text>
          <Text style={styles.infoText}>{cardMeta.howItWorksSummary}</Text>
          {canExpandHowItWorks ? (
            <>
              {showHowItWorksDetails ? (
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
                onPress={() => setShowHowItWorksDetails((value) => !value)}
                activeOpacity={0.7}
                style={styles.learnMoreButton}
              >
                <Text style={styles.learnMoreText}>
                  {showHowItWorksDetails ? 'Show less' : 'Learn more'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}

      {exercise.coachingCues.length > 0 && (
        <View style={styles.cuesContainer}>
          {exercise.coachingCues.map((cue, i) => (
            <Text key={i} style={styles.cueText}>- {cue}</Text>
          ))}
        </View>
      )}

      {exercise.loadingNotes ? (
        <Text style={styles.loadingNotes}>{exercise.loadingNotes}</Text>
      ) : null}

      {children && <View style={styles.childrenContainer}>{children}</View>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Compact row (used in prescription preview lists)
// ---------------------------------------------------------------------------

interface ExerciseRowCompactProps {
  exercise: ExerciseVM;
  index?: number;
  accessory?: React.ReactNode;
}

export function ExerciseRowCompact({ exercise, index, accessory }: ExerciseRowCompactProps) {
  return (
    <View style={compactStyles.row}>
      {index != null && (
        <View style={compactStyles.index}>
          <Text style={compactStyles.indexText}>{index}</Text>
        </View>
      )}
      <View style={compactStyles.info}>
        <Text style={compactStyles.name} numberOfLines={1}>{exercise.name}</Text>
        <Text style={compactStyles.meta}>
          {exercise.setScheme ?? `${exercise.targetSets} x ${exercise.targetReps}`}
          {exercise.suggestedWeight ? ` | ${exercise.suggestedWeight} lb` : ''}
        </Text>
      </View>
      {accessory}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Readonly card styles (traditional)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  indexCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indexText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 13,
    color: COLORS.accent,
  },
  nameBlock: {
    flex: 1,
  },
  exerciseName: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  muscleLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  rightBadges: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  strategyBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  strategyText: {
    ...TYPOGRAPHY_V2.plan.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completionBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  completionDone: {
    backgroundColor: COLORS.readiness.primeLight,
  },
  completionText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  completionTextDone: {
    color: COLORS.readiness.prime,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  setScheme: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  weightHint: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  restHint: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
  },
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
  howItWorksBlock: {
    gap: 4,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
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
  cuesContainer: {
    gap: 4,
  },
  cueText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 18,
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
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.card,
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
