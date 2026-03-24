import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import type { EngineReplayExerciseLog, EngineReplayPrescribedExercise } from '../../../../lib/engine/simulation/lab';
import { formatSignedNumber } from '../helpers';
import { shared } from '../styles';

// ---------------------------------------------------------------------------
// ExerciseLogRow
// ---------------------------------------------------------------------------

export function ExerciseLogRow({ entry }: { entry: EngineReplayExerciseLog }) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.header}>
        <View style={styles.headerBody}>
          <Text style={styles.name}>{entry.exerciseName}</Text>
          <Text style={styles.meta}>{entry.sectionTitle ?? 'session'} | {entry.completed ? 'logged' : 'skipped'}</Text>
        </View>
        <Text style={[styles.status, !entry.completed && styles.statusMiss]}>{entry.completed ? 'Logged' : 'Skipped'}</Text>
      </View>
      <Text style={shared.bodyText}>Planned {entry.targetSets} x {entry.targetReps} @ RPE {entry.targetRpe}</Text>
      <Text style={shared.bodyText}>
        Logged {entry.completedSets} x {entry.actualReps}
        {entry.actualRpe != null ? ` @ RPE ${entry.actualRpe}` : ''}
        {entry.actualWeight != null ? ` | ${entry.actualWeight} lb` : entry.suggestedWeight != null ? ` | target ${entry.suggestedWeight} lb` : ''}
      </Text>
      <Text style={shared.detailText}>{entry.note}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PrescribedExerciseRow
// ---------------------------------------------------------------------------

export function PrescribedExerciseRow({ entry }: { entry: EngineReplayPrescribedExercise }) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.header}>
        <View style={styles.headerBody}>
          <Text style={styles.name}>{entry.exerciseName}</Text>
          <Text style={styles.meta}>{entry.sectionTemplate ?? 'main'} | {entry.sectionTitle ?? 'No section intent recorded'}</Text>
        </View>
        <Text style={styles.status}>Prescribed</Text>
      </View>
      <Text style={shared.bodyText}>{entry.setScheme ?? `${entry.targetSets} x ${entry.targetReps} @ RPE ${entry.targetRpe}`}</Text>
      <View style={shared.inlineStatRow}>
        <Text style={shared.inlineStat}>Sets {entry.targetSets}</Text>
        <Text style={shared.inlineStat}>Reps {entry.targetReps}</Text>
        <Text style={shared.inlineStat}>RPE {entry.targetRpe}</Text>
        <Text style={shared.inlineStat}>{entry.suggestedWeight != null ? `${entry.suggestedWeight} lb` : 'Bodyweight/open load'}</Text>
      </View>
      {entry.warmupSetCount > 0 ? <Text style={shared.detailText}>Warmup sets: {entry.warmupSetCount}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// WorkoutComparisonRow
// ---------------------------------------------------------------------------

interface WorkoutComparisonRowProps {
  prescribed: EngineReplayPrescribedExercise;
  logged: EngineReplayExerciseLog | null;
}

export function WorkoutComparisonRow({ prescribed, logged }: WorkoutComparisonRowProps) {
  const completionRate = logged ? Math.round((logged.completedSets / Math.max(prescribed.targetSets, 1)) * 100) : 0;
  const repDelta = logged ? logged.actualReps - prescribed.targetReps : 0;
  const rpeDelta = logged?.actualRpe != null ? logged.actualRpe - prescribed.targetRpe : null;

  return (
    <View style={styles.comparisonCard}>
      <View style={styles.header}>
        <View style={styles.headerBody}>
          <Text style={styles.name}>{prescribed.exerciseName}</Text>
          <Text style={styles.meta}>{prescribed.sectionTemplate ?? 'main'} | {prescribed.sectionTitle ?? 'No section intent recorded'}</Text>
        </View>
        <Text style={[styles.status, (!logged || !logged.completed) && styles.statusMiss]}>
          {logged?.completed ? `${completionRate}% done` : 'Missed'}
        </Text>
      </View>
      <View style={styles.comparisonGrid}>
        <View style={styles.comparisonCell}>
          <Text style={styles.comparisonLabel}>Prescription</Text>
          <Text style={styles.comparisonValue}>{prescribed.targetSets} x {prescribed.targetReps}</Text>
          <Text style={shared.detailText}>RPE {prescribed.targetRpe}{prescribed.suggestedWeight != null ? ` | ${prescribed.suggestedWeight} lb` : ''}</Text>
        </View>
        <View style={styles.comparisonCell}>
          <Text style={styles.comparisonLabel}>Logged</Text>
          <Text style={styles.comparisonValue}>{logged ? `${logged.completedSets} x ${logged.actualReps}` : 'No sets logged'}</Text>
          <Text style={shared.detailText}>
            {logged?.actualRpe != null ? `RPE ${logged.actualRpe}` : 'RPE --'}
            {logged?.actualWeight != null ? ` | ${logged.actualWeight} lb` : ''}
          </Text>
        </View>
      </View>
      <View style={shared.inlineStatRow}>
        <Text style={shared.inlineStat}>Set delta {logged ? formatSignedNumber(logged.completedSets - prescribed.targetSets) : '--'}</Text>
        <Text style={shared.inlineStat}>Rep delta {logged ? formatSignedNumber(repDelta) : '--'}</Text>
        <Text style={shared.inlineStat}>RPE delta {rpeDelta != null ? formatSignedNumber(rpeDelta, 1) : '--'}</Text>
      </View>
      <Text style={shared.detailText}>{logged?.note ?? 'No simulated athlete note was generated.'}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  exerciseRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  headerBody: { flex: 1 },
  name: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  meta: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  status: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.prime,
    textTransform: 'uppercase',
  },
  statusMiss: { color: COLORS.readiness.depleted },
  comparisonCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  comparisonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  comparisonCell: {
    flexBasis: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  comparisonLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  comparisonValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
});

