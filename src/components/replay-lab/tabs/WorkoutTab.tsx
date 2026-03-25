import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../Card';
import { MetricTile } from '../primitives/MetricTile';
import {
  ExerciseBlueprintCard,
  ExerciseLogRow,
  PrescribedExerciseRow,
  WorkoutComparisonRow,
} from '../primitives/ExerciseRow';
import { ConditioningDrillRow } from '../primitives/ConditioningDrillRow';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import { formatPhase } from '../helpers';
import { shared } from '../styles';
import type {
  EngineReplayDay,
  EngineReplayPrescribedExercise,
  EngineReplayWorkoutSection,
} from '../../../../lib/engine/simulation/lab';
import type { WorkoutStats } from '../useReplayState';

interface WorkoutTabProps {
  day: EngineReplayDay;
  workoutStats: WorkoutStats;
}

export function WorkoutTab({ day, workoutStats }: WorkoutTabProps) {
  const session = day.workoutSession;
  const hasBlueprintSections = (session?.sections.length ?? 0) > 0;
  const isConditioningView = day.workoutType === 'conditioning' || day.conditioningPrescription != null;
  const isRecoveryLike = day.sessionRole === 'rest' || day.sessionRole === 'recover' || day.sessionRole === 'cut_protect';

  return (
    <>
      <Card title="Session Overview" subtitle={day.workoutType ?? day.sessionRole}>
        <View style={shared.metricGrid}>
          <MetricTile label="Duration" value={resolveDuration(day)} />
          <MetricTile label="Sections" value={String(session?.sections.length ?? 0)} />
          <MetricTile label="Completion" value={resolveCompletion(day, workoutStats)} tone={completionTone(resolveCompletionRate(day, workoutStats))} />
          <MetricTile label="Primary Adaptation" value={session ? formatPhase(session.primaryAdaptation) : formatPhase(day.sessionRole)} />
        </View>
        <View style={shared.metricGrid}>
          <MetricTile label="Exercises" value={`${workoutStats.completedExerciseCount} / ${workoutStats.prescribedExerciseCount}`} />
          <MetricTile label="Set Completion" value={workoutStats.plannedSetCount > 0 ? `${workoutStats.completedSetCount} / ${workoutStats.plannedSetCount}` : '--'} />
          <MetricTile label="Warm-up" value={day.didWarmup ? 'Completed' : 'Missed'} />
          <MetricTile label="Role" value={formatPhase(day.sessionRole)} />
        </View>
        {session?.sessionGoal ? <Text style={shared.bodyText}>Goal: {session.sessionGoal}</Text> : null}
        {session?.sessionIntent ? <Text style={shared.bodyText}>Intent: {session.sessionIntent}</Text> : null}
        {day.activationGuidance ? <Text style={shared.bodyText}>Activation: {day.activationGuidance}</Text> : null}
        {session?.expectedActivationRPE != null ? <Text style={shared.detailText}>Expected activation RPE: {session.expectedActivationRPE}</Text> : null}
        {session?.interferenceWarnings.length ? <Text style={shared.detailText}>Interference warnings: {session.interferenceWarnings.join(' • ')}</Text> : null}
        <Text style={shared.bodyText}>Blueprint: {day.workoutBlueprint}</Text>
      </Card>

      {isRecoveryLike && !hasBlueprintSections ? (
        <Card title="Restricted Session" subtitle="Replay did not generate a guided exercise session for this day.">
          <Text style={shared.bodyText}>
            {day.isMandatoryRecovery
              ? 'Mandatory recovery is active. The athlete should focus on restoration rather than a guided workout.'
              : 'No guided workout was prescribed for this day.'}
          </Text>
          <View style={shared.inlineStatRow}>
            <Text style={shared.inlineStat}>Role {formatPhase(day.sessionRole)}</Text>
            <Text style={shared.inlineStat}>Intervention {formatPhase(day.interventionState)}</Text>
            {day.isMandatoryRecovery ? <Text style={shared.inlineStat}>Mandatory recovery</Text> : null}
          </View>
        </Card>
      ) : null}

      {isConditioningView ? <ConditioningSessionCards day={day} workoutStats={workoutStats} /> : null}

      {hasBlueprintSections ? (
        <Card title="Session Blueprint" subtitle="Full section-by-section prescription with follow-and-log detail.">
          <View style={styles.sectionList}>
            {session?.sections.map((section) => (
              <WorkoutSectionCard
                key={section.id}
                section={section}
                day={day}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {day.prescribedExercises.length > 0 && !hasBlueprintSections ? (
        <Card title="Prescribed Session" subtitle="Fallback prescription view when sectioned session data is not available.">
          {day.prescribedExercises.map((entry, index) => (
            <PrescribedExerciseRow key={`${entry.exerciseId}-${entry.sectionTemplate ?? 'section'}-${index}`} entry={entry} />
          ))}
        </Card>
      ) : null}

      {day.prescribedExercises.length > 0 ? (
        <Card title="Prescribed vs Logged" subtitle="Side-by-side comparison for each exercise in the session.">
          {day.prescribedExercises.map((entry, index) => {
            const logged = day.exerciseLogs.find((c) => c.exerciseId === entry.exerciseId) ?? null;
            return (
              <WorkoutComparisonRow key={`${entry.exerciseId}-compare-${index}`} prescribed={entry} logged={logged} />
            );
          })}
        </Card>
      ) : null}

      <Card title="Raw Simulated Workout Log" subtitle="Exercise-by-exercise output from the simulated athlete.">
        {day.exerciseLogs.length > 0
          ? day.exerciseLogs.map((entry, index) => (
            <ExerciseLogRow key={`${entry.exerciseId}-${entry.sectionTitle ?? 'section'}-${index}`} entry={entry} />
          ))
          : <Text style={shared.bodyText}>No exercise-level simulated log exists for this day.</Text>}
      </Card>
    </>
  );
}

function ConditioningSessionCards({ day, workoutStats }: WorkoutTabProps) {
  const cp = day.conditioningPrescription;
  const cl = day.conditioningLog;
  if (!cp) return null;

  return (
    <>
      <Card title="Conditioning Prescription" subtitle={cp.message}>
        <View style={shared.metricGrid}>
          <MetricTile label="Type" value={formatPhase(cp.type)} />
          <MetricTile label="Rounds" value={String(cp.rounds)} />
          <MetricTile label="Work / Rest" value={`${cp.workIntervalSec}s / ${cp.restIntervalSec}s`} />
          <MetricTile label="Est. Load" value={String(cp.estimatedLoad)} />
        </View>
        {cp.format ? <Text style={shared.bodyText}>Format: {formatPhase(cp.format)}</Text> : null}
        {cp.timedWork ? (
          <Text style={shared.detailText}>
            Timed block: {formatPhase(cp.timedWork.format)}
            {cp.timedWork.totalDurationSec ? ` | ${Math.round(cp.timedWork.totalDurationSec / 60)} min total` : ''}
            {cp.timedWork.workIntervalSec ? ` | ${cp.timedWork.workIntervalSec}s work` : ''}
            {cp.timedWork.restIntervalSec ? ` | ${cp.timedWork.restIntervalSec}s rest` : ''}
            {cp.timedWork.roundCount ? ` | ${cp.timedWork.roundCount} rounds` : ''}
          </Text>
        ) : null}
        {cp.circuitRound ? (
          <View style={styles.circuitSummary}>
            <Text style={shared.detailText}>
              Circuit: {cp.circuitRound.roundCount} rounds | {cp.circuitRound.restBetweenRoundsSec}s between rounds
            </Text>
            {cp.circuitRound.movements.map((movement, index) => (
              <Text key={`${movement.exerciseName}-${index}`} style={shared.detailText}>
                {movement.exerciseName}
                {movement.reps != null ? ` | ${movement.reps} reps` : ''}
                {movement.durationSec != null ? ` | ${movement.durationSec}s work` : ''}
                {movement.restSec ? ` | ${movement.restSec}s rest` : ''}
              </Text>
            ))}
          </View>
        ) : null}
        {cp.drills.map((drill, index) => (
          <ConditioningDrillRow
            key={`${drill.name}-prescribed-${index}`}
            name={drill.name}
            subtitle={`${drill.rounds} rounds${drill.durationSec != null ? ` | ${drill.durationSec}s work` : ''}${drill.reps != null ? ` | ${drill.reps} reps` : ''}${drill.restSec ? ` | ${drill.restSec}s rest` : ''}`}
            status="Planned"
            note={drill.timedWork
              ? `Timed format ${formatPhase(drill.timedWork.format)}${drill.timedWork.totalDurationSec ? ` for ${Math.round(drill.timedWork.totalDurationSec / 60)} min` : ''}.`
              : 'Engine prescribed this drill as part of the conditioning block.'}
          />
        ))}
      </Card>

      <Card title="Simulated Conditioning Log" subtitle={cl?.note ?? 'No simulated conditioning log exists.'}>
        {cl ? (
          <>
            <View style={shared.metricGrid}>
              <MetricTile label="Rounds" value={`${cl.completedRounds} / ${cl.prescribedRounds}`} />
              <MetricTile label="Minutes" value={`${cl.completedDurationMin} / ${cl.targetDurationMin}`} />
              <MetricTile label="Actual RPE" value={cl.actualRpe?.toFixed(1) ?? '--'} />
              <MetricTile label="Completion" value={`${workoutStats.conditioningCompletionRate}%`} tone={completionTone(workoutStats.conditioningCompletionRate)} />
            </View>
            {cl.drillLogs.map((drill, index) => (
              <ConditioningDrillRow
                key={`${drill.name}-logged-${index}`}
                name={drill.name}
                subtitle={`${drill.completedRounds} / ${drill.targetRounds} rounds${drill.durationSec != null ? ` | ${drill.durationSec}s work` : ''}${drill.reps != null ? ` | ${drill.reps} reps` : ''}${drill.restSec ? ` | ${drill.restSec}s rest` : ''}`}
                status={drill.completed ? 'Logged' : 'Missed'}
                note={drill.note}
              />
            ))}
          </>
        ) : (
          <Text style={shared.bodyText}>
            {day.exerciseLogs.length > 0
              ? 'This conditioning day also flowed through the structured workout pipeline, so exercise-level logs are shown below.'
              : 'No simulated conditioning log exists for this day.'}
          </Text>
        )}
      </Card>
    </>
  );
}

function WorkoutSectionCard({ section, day }: { section: EngineReplayWorkoutSection; day: EngineReplayDay }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderBody}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionSubtitle}>{section.intent}</Text>
        </View>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{formatPhase(section.template)}</Text>
        </View>
      </View>

      <View style={shared.inlineStatRow}>
        <Text style={shared.inlineStat}>{section.timeCap} min cap</Text>
        <Text style={shared.inlineStat}>{section.restRule}</Text>
        {section.densityRule ? <Text style={shared.inlineStat}>{section.densityRule}</Text> : null}
        {section.finisherReason ? <Text style={shared.inlineStat}>Finisher note</Text> : null}
      </View>

      {section.finisherReason ? <Text style={shared.detailText}>Finisher: {section.finisherReason}</Text> : null}
      {section.decisionTrace.length > 0 ? <Text style={shared.detailText}>Decision trace: {section.decisionTrace.join(' • ')}</Text> : null}

      <View style={styles.exerciseList}>
        {section.exercises.map((exercise) => {
          const logged = resolveLoggedExercise(day, exercise);
          return (
            <ExerciseBlueprintCard
              key={`${section.id}-${exercise.exerciseId}`}
              entry={exercise}
              logged={logged}
            />
          );
        })}
      </View>
    </View>
  );
}

function resolveLoggedExercise(day: EngineReplayDay, exercise: EngineReplayPrescribedExercise) {
  return day.exerciseLogs.find((entry) => entry.exerciseId === exercise.exerciseId && entry.sectionTitle === exercise.sectionTitle)
    ?? day.exerciseLogs.find((entry) => entry.exerciseId === exercise.exerciseId)
    ?? null;
}

function resolveDuration(day: EngineReplayDay) {
  if (day.conditioningPrescription) return `${day.conditioningPrescription.totalDurationMin} min`;
  if (day.workoutSession?.estimatedDurationMin) return `${day.workoutSession.estimatedDurationMin} min`;
  return day.durationMin > 0 ? `${day.durationMin} min` : '--';
}

function resolveCompletionRate(day: EngineReplayDay, workoutStats: WorkoutStats) {
  if (day.conditioningPrescription && day.conditioningLog) return workoutStats.conditioningCompletionRate;
  return workoutStats.completionRate;
}

function resolveCompletion(day: EngineReplayDay, workoutStats: WorkoutStats) {
  return `${resolveCompletionRate(day, workoutStats)}%`;
}

function completionTone(rate: number): 'good' | 'warning' | 'default' {
  if (rate >= 90) return 'good';
  if (rate < 60) return 'warning';
  return 'default';
}

const styles = StyleSheet.create({
  sectionList: {
    gap: SPACING.md,
  },
  sectionCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FCFEFE',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  sectionHeaderBody: {
    flex: 1,
  },
  sectionTitle: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  sectionSubtitle: {
    marginTop: 4,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  sectionBadge: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  sectionBadgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    textTransform: 'uppercase',
  },
  exerciseList: {
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  circuitSummary: {
    gap: 2,
    marginTop: SPACING.sm,
  },
});
