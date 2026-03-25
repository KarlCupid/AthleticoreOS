import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import type {
  EngineReplayExerciseLog,
  EngineReplayPrescribedExercise,
  EngineReplaySetPrescription,
} from '../../../../lib/engine/simulation/lab';
import { formatPhase, formatSignedNumber } from '../helpers';
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
        <Text style={[styles.status, entry.completed ? styles.statusPositive : styles.statusMiss]}>{entry.completed ? 'Logged' : 'Skipped'}</Text>
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
        <Text style={[styles.status, styles.statusNeutral]}>Prescribed</Text>
      </View>
      <Text style={shared.bodyText}>{entry.setScheme ?? `${entry.targetSets} x ${entry.targetReps} @ RPE ${entry.targetRpe}`}</Text>
      <View style={shared.inlineStatRow}>
        <Text style={shared.inlineStat}>Sets {entry.targetSets}</Text>
        <Text style={shared.inlineStat}>Reps {entry.targetReps}</Text>
        <Text style={shared.inlineStat}>RPE {entry.targetRpe}</Text>
        {entry.restSeconds != null ? <Text style={shared.inlineStat}>{formatRest(entry.restSeconds)}</Text> : null}
        <Text style={shared.inlineStat}>{entry.suggestedWeight != null ? `${entry.suggestedWeight} lb` : 'Bodyweight/open load'}</Text>
      </View>
      {entry.warmupSetCount > 0 ? <Text style={shared.detailText}>Warmup sets: {entry.warmupSetCount}</Text> : null}
      {entry.loadingNotes ? <Text style={shared.detailText}>{entry.loadingNotes}</Text> : null}
      {entry.coachingCues.length > 0 ? <Text style={shared.detailText}>Cues: {entry.coachingCues.join(' • ')}</Text> : null}
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
        <Text style={[styles.status, logged?.completed ? styles.statusPositive : styles.statusMiss]}>
          {logged?.completed ? `${completionRate}% done` : 'Missed'}
        </Text>
      </View>
      <View style={styles.comparisonGrid}>
        <View style={styles.comparisonCell}>
          <Text style={styles.comparisonLabel}>Prescription</Text>
          <Text style={styles.comparisonValue}>{prescribed.targetSets} x {prescribed.targetReps}</Text>
          <Text style={shared.detailText}>
            RPE {prescribed.targetRpe}
            {prescribed.suggestedWeight != null ? ` | ${prescribed.suggestedWeight} lb` : ''}
            {prescribed.restSeconds != null ? ` | ${formatRest(prescribed.restSeconds)}` : ''}
          </Text>
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
// Session blueprint primitives
// ---------------------------------------------------------------------------

export function ExerciseBlueprintCard({
  entry,
  logged,
}: {
  entry: EngineReplayPrescribedExercise;
  logged: EngineReplayExerciseLog | null;
}) {
  return (
    <View style={styles.blueprintCard}>
      <View style={styles.header}>
        <View style={styles.headerBody}>
          <Text style={styles.name}>{entry.exerciseName}</Text>
          <Text style={styles.meta}>{entry.sectionTemplate ?? 'main'} | {entry.sectionTitle ?? 'No section intent recorded'}</Text>
        </View>
        <Text style={[styles.status, logged?.completed ? styles.statusPositive : styles.statusNeutral]}>
          {logged ? (logged.completed ? 'Logged' : 'Missed') : 'Blueprint'}
        </Text>
      </View>

      <Text style={styles.schemeText}>{entry.setScheme ?? `${entry.targetSets} x ${entry.targetReps} @ RPE ${entry.targetRpe}`}</Text>

      <View style={shared.inlineStatRow}>
        <Text style={shared.inlineStat}>Target {entry.targetSets} x {entry.targetReps}</Text>
        <Text style={shared.inlineStat}>RPE {entry.targetRpe}</Text>
        {entry.restSeconds != null ? <Text style={shared.inlineStat}>{formatRest(entry.restSeconds)}</Text> : null}
        <Text style={shared.inlineStat}>{entry.suggestedWeight != null ? `${entry.suggestedWeight} lb` : 'Bodyweight/open load'}</Text>
        {entry.warmupSetCount > 0 ? <Text style={shared.inlineStat}>{entry.warmupSetCount} warmup sets</Text> : null}
      </View>

      {entry.setPrescription.length > 0 ? (
        <View style={styles.blockList}>
          {entry.setPrescription.map((setEntry, index) => (
            <SetPrescriptionRow key={`${entry.exerciseId}-set-${index}`} entry={setEntry} />
          ))}
        </View>
      ) : null}

      {entry.loadingNotes ? <Text style={shared.detailText}>Loading: {entry.loadingNotes}</Text> : null}
      {entry.coachingCues.length > 0 ? <Text style={shared.detailText}>Cues: {entry.coachingCues.join(' • ')}</Text> : null}
      {entry.substitutions.length > 0 ? (
        <Text style={shared.detailText}>
          Alternatives: {entry.substitutions.slice(0, 3).map((sub) => sub.exerciseName).join(' • ')}
        </Text>
      ) : null}

      {logged ? (
        <View style={styles.loggedPanel}>
          <Text style={styles.loggedTitle}>Simulated log</Text>
          <Text style={shared.detailText}>
            {logged.completed
              ? `${logged.completedSets}/${logged.targetSets} sets | ${logged.actualReps} reps | ${logged.actualRpe != null ? `RPE ${logged.actualRpe}` : 'RPE --'}${logged.actualWeight != null ? ` | ${logged.actualWeight} lb` : ''}`
              : 'Skipped in the simulated workout log.'}
          </Text>
          <Text style={shared.detailText}>{logged.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SetPrescriptionRow({ entry }: { entry: EngineReplaySetPrescription }) {
  const repsLabel = typeof entry.reps === 'number' ? `${entry.reps} reps` : String(entry.reps);
  return (
    <View style={styles.setRow}>
      <View style={styles.setRowHeader}>
        <Text style={styles.setLabel}>{entry.label}</Text>
        <Text style={styles.setTarget}>{entry.sets} x {repsLabel}</Text>
      </View>
      <Text style={styles.setMeta}>
        Target RPE {entry.targetRPE}
        {entry.restSeconds > 0 ? ` | ${formatRest(entry.restSeconds)}` : ''}
        {entry.intensityNote ? ` | ${entry.intensityNote}` : ''}
      </Text>
      {entry.timedWork ? (
        <Text style={shared.detailText}>
          {formatPhase(entry.timedWork.format)}
          {entry.timedWork.totalDurationSec ? ` | ${Math.round(entry.timedWork.totalDurationSec / 60)} min total` : ''}
          {entry.timedWork.workIntervalSec ? ` | ${entry.timedWork.workIntervalSec}s work` : ''}
          {entry.timedWork.restIntervalSec ? ` | ${entry.timedWork.restIntervalSec}s rest` : ''}
          {entry.timedWork.roundCount ? ` | ${entry.timedWork.roundCount} rounds` : ''}
        </Text>
      ) : null}
      {entry.circuitRound ? (
        <View style={styles.circuitBlock}>
          <Text style={shared.detailText}>
            {entry.circuitRound.roundCount} rounds | {formatRest(entry.circuitRound.restBetweenRoundsSec)} between rounds
          </Text>
          {entry.circuitRound.movements.map((movement, index) => (
            <Text key={`${movement.exerciseName}-${index}`} style={shared.detailText}>
              {movement.exerciseName}
              {movement.reps != null ? ` | ${movement.reps} reps` : ''}
              {movement.durationSec != null ? ` | ${movement.durationSec}s work` : ''}
              {movement.restSec ? ` | ${movement.restSec}s rest` : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function formatRest(restSeconds: number) {
  const minutes = Math.floor(restSeconds / 60);
  const seconds = restSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''} rest`;
  }
  return `${restSeconds}s rest`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  exerciseRow: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  blueprintCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    gap: SPACING.sm,
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
    textTransform: 'uppercase',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  statusPositive: {
    color: COLORS.readiness.prime,
    backgroundColor: COLORS.readiness.primeLight,
  },
  statusNeutral: {
    color: COLORS.text.secondary,
    backgroundColor: COLORS.surfaceSecondary,
  },
  statusMiss: {
    color: COLORS.readiness.depleted,
    backgroundColor: COLORS.readiness.depletedLight,
  },
  comparisonCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FBFC',
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
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
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
  schemeText: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.primary,
  },
  blockList: {
    gap: SPACING.sm,
  },
  setRow: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.sm,
    gap: 4,
  },
  setRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  setLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  setTarget: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  setMeta: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  circuitBlock: {
    gap: 2,
  },
  loggedPanel: {
    borderRadius: RADIUS.md,
    backgroundColor: '#F6FFFC',
    padding: SPACING.sm,
    gap: 2,
  },
  loggedTitle: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    textTransform: 'uppercase',
  },
});
