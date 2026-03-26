import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { ExerciseVM, ExerciseProgressVM } from './types';

// ---------------------------------------------------------------------------
// ComparisonRow — prescribed vs logged side-by-side
// ---------------------------------------------------------------------------

interface ComparisonRowProps {
  exercise: ExerciseVM;
  progress: ExerciseProgressVM;
}

function formatDelta(actual: number, target: number): string {
  const d = actual - target;
  if (d === 0) return '—';
  return d > 0 ? `+${d}` : String(d);
}

function deltaTone(actual: number, target: number): string {
  if (actual >= target) return COLORS.readiness.prime;
  if (actual >= target * 0.8) return COLORS.readiness.caution;
  return COLORS.readiness.depleted;
}

export function ComparisonRow({ exercise, progress }: ComparisonRowProps) {
  const workingSets = progress.setsLogged.filter(s => !s.isWarmup);
  const avgReps = workingSets.length > 0
    ? Math.round(workingSets.reduce((a, s) => a + s.reps, 0) / workingSets.length)
    : 0;
  const avgWeight = workingSets.length > 0
    ? Math.round(workingSets.reduce((a, s) => a + s.weight, 0) / workingSets.length)
    : 0;
  const avgRpe = workingSets.length > 0
    ? +(workingSets.filter(s => s.rpe != null).reduce((a, s) => a + (s.rpe ?? 0), 0) /
        workingSets.filter(s => s.rpe != null).length).toFixed(1)
    : null;

  const completionRate = exercise.targetSets > 0
    ? Math.round((progress.setsCompleted / exercise.targetSets) * 100)
    : 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{exercise.name}</Text>
        <View style={[
          styles.rateBadge,
          completionRate >= 100 ? styles.rateDone : completionRate >= 75 ? styles.rateOk : styles.rateLow,
        ]}>
          <Text style={[
            styles.rateText,
            completionRate >= 100 ? styles.rateTextDone : completionRate >= 75 ? styles.rateTextOk : styles.rateTextLow,
          ]}>
            {completionRate}%
          </Text>
        </View>
      </View>

      {/* Two-column comparison */}
      <View style={styles.columns}>
        {/* Prescribed */}
        <View style={styles.col}>
          <Text style={styles.colHeader}>Prescribed</Text>
          <Text style={styles.colValue}>
            {exercise.targetSets} × {exercise.targetReps}
          </Text>
          {exercise.targetRPE > 0 && (
            <Text style={styles.colDetail}>RPE {exercise.targetRPE}</Text>
          )}
          {exercise.suggestedWeight != null && exercise.suggestedWeight > 0 && (
            <Text style={styles.colDetail}>{exercise.suggestedWeight} lb</Text>
          )}
        </View>

        {/* Logged */}
        <View style={styles.col}>
          <Text style={styles.colHeader}>Logged</Text>
          {workingSets.length > 0 ? (
            <>
              <Text style={styles.colValue}>
                {progress.setsCompleted} × {avgReps}
              </Text>
              {avgRpe != null && (
                <Text style={styles.colDetail}>RPE {avgRpe}</Text>
              )}
              {avgWeight > 0 && (
                <Text style={styles.colDetail}>{avgWeight} lb</Text>
              )}
            </>
          ) : (
            <Text style={styles.colValueMissed}>No sets logged</Text>
          )}
        </View>
      </View>

      {/* Delta row */}
      {workingSets.length > 0 && (
        <View style={styles.deltaRow}>
          <Text style={[
            styles.delta,
            { color: deltaTone(progress.setsCompleted, exercise.targetSets) },
          ]}>
            Sets {formatDelta(progress.setsCompleted, exercise.targetSets)}
          </Text>
          <Text style={[
            styles.delta,
            { color: deltaTone(avgReps, exercise.targetReps) },
          ]}>
            Reps {formatDelta(avgReps, exercise.targetReps)}
          </Text>
          {avgRpe != null && exercise.targetRPE > 0 && (
            <Text style={[
              styles.delta,
              { color: avgRpe <= exercise.targetRPE + 0.5 ? COLORS.readiness.prime : COLORS.readiness.caution },
            ]}>
              RPE {formatDelta(avgRpe, exercise.targetRPE)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    flex: 1,
  },
  rateBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  rateDone: { backgroundColor: COLORS.readiness.primeLight },
  rateOk: { backgroundColor: COLORS.readiness.cautionLight },
  rateLow: { backgroundColor: COLORS.readiness.depletedLight },
  rateText: {
    ...TYPOGRAPHY_V2.plan.caption,
    fontWeight: '700',
  },
  rateTextDone: { color: COLORS.readiness.prime },
  rateTextOk: { color: COLORS.readiness.caution },
  rateTextLow: { color: COLORS.readiness.depleted },
  columns: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  col: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 2,
  },
  colHeader: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  colValue: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  colValueMissed: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  colDetail: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  deltaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  delta: {
    ...TYPOGRAPHY_V2.plan.caption,
    fontWeight: '700',
  },
});
