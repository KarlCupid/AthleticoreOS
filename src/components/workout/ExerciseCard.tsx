import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { ExerciseVM, ExerciseProgressVM, WorkoutRenderMode } from './types';

// ---------------------------------------------------------------------------
// Loading strategy visual badges
// ---------------------------------------------------------------------------

const STRATEGY_META: Record<string, { label: string; tone: string }> = {
  straight_sets: { label: 'Straight Sets', tone: COLORS.accent },
  top_set_backoff: { label: 'Top Set + Backoff', tone: COLORS.readiness.caution },
  density_block: { label: 'Density Block', tone: COLORS.chart.fatigue },
  intervals: { label: 'Intervals', tone: COLORS.chart.fitness },
  recovery_flow: { label: 'Recovery Flow', tone: COLORS.readiness.prime },
  emom: { label: 'EMOM', tone: COLORS.chart.fitness },
  amrap: { label: 'AMRAP', tone: COLORS.readiness.caution },
  tabata: { label: 'Tabata', tone: COLORS.readiness.depleted },
  timed_sets: { label: 'Timed Sets', tone: COLORS.chart.fatigue },
  for_time: { label: 'For Time', tone: COLORS.readiness.caution },
  circuit_rounds: { label: 'Circuit', tone: COLORS.chart.fitness },
};

function formatLabel(s: string | null): string {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// ExerciseCard — unified exercise display for both live and replay
// ---------------------------------------------------------------------------

interface ExerciseCardProps {
  exercise: ExerciseVM;
  /** Index number for display (1-based) */
  index?: number;
  /** Exercise progress (logged sets) — null in preview or replay */
  progress?: ExerciseProgressVM | null;
  /** Render mode */
  mode?: WorkoutRenderMode;
  /** Children rendered below the card (e.g. SetInputPanel, TimerDisplay) */
  children?: React.ReactNode;
}

export function ExerciseCard({
  exercise,
  index,
  progress,
  mode: _mode = 'readonly',
  children,
}: ExerciseCardProps) {
  const strategy = exercise.loadingStrategy
    ? STRATEGY_META[exercise.loadingStrategy]
    : null;

  const completionText =
    progress && progress.totalTargetSets > 0
      ? `${progress.setsCompleted}/${progress.totalTargetSets}`
      : null;

  return (
    <View style={styles.card}>
      {/* Header row: index + name + muscle badge */}
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
              {formatLabel(exercise.muscleGroup)}
            </Text>
          ) : null}
        </View>
        {/* Right side: strategy badge or completion */}
        <View style={styles.rightBadges}>
          {strategy && (
            <View style={[styles.strategyBadge, { backgroundColor: strategy.tone + '18' }]}>
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

      {/* Set scheme + section info */}
      <View style={styles.detailRow}>
        {exercise.setScheme ? (
          <Text style={styles.setScheme}>{exercise.setScheme}</Text>
        ) : (
          <Text style={styles.setScheme}>
            {exercise.targetSets} × {exercise.targetReps}
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

      {/* Section template + role pill */}
      {(exercise.sectionTemplate || exercise.role) && (
        <View style={styles.tagRow}>
          {exercise.sectionTemplate && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {formatLabel(exercise.sectionTemplate)}
              </Text>
            </View>
          )}
          {exercise.role && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{formatLabel(exercise.role)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Coaching cues */}
      {exercise.coachingCues.length > 0 && (
        <View style={styles.cuesContainer}>
          {exercise.coachingCues.map((cue, i) => (
            <Text key={i} style={styles.cueText}>• {cue}</Text>
          ))}
        </View>
      )}

      {/* Loading notes */}
      {exercise.loadingNotes ? (
        <Text style={styles.loadingNotes}>{exercise.loadingNotes}</Text>
      ) : null}

      {/* Children (inputs, timers, etc.) */}
      {children && <View style={styles.childrenContainer}>{children}</View>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Compact exercise row for previews and checklists
// ---------------------------------------------------------------------------

interface ExerciseRowCompactProps {
  exercise: ExerciseVM;
  index?: number;
  /** Right-side accessory (checkbox, status badge, etc.) */
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
          {exercise.setScheme
            ?? `${exercise.targetSets} × ${exercise.targetReps}`}
          {exercise.suggestedWeight ? ` | ${exercise.suggestedWeight} lb` : ''}
        </Text>
      </View>
      {accessory}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
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
  cuesContainer: {
    gap: 2,
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
