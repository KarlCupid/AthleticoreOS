import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../Card';
import { MetricTile } from '../primitives/MetricTile';
import { ExerciseLogRow } from '../primitives/ExerciseRow';
import {
  ComparisonRow,
  ConditioningCard,
  ExerciseCard,
  SectionCard,
  SessionHeader,
  fromReplayConditioningLog,
  fromReplayDay,
  fromReplayExerciseLogs,
  fromReplayStats,
} from '../../workout';
import { COLORS, RADIUS, SPACING } from '../../../theme/theme';
import { formatPhase } from '../helpers';
import { shared } from '../styles';
import type { EngineReplayDay } from '../../../../lib/engine/simulation/lab';
import type { WorkoutStats } from '../useReplayState';

interface WorkoutTabProps {
  day: EngineReplayDay;
  workoutStats: WorkoutStats;
}

export function WorkoutTab({ day, workoutStats }: WorkoutTabProps) {
  const session = fromReplayDay(day, workoutStats);
  const stats = fromReplayStats(workoutStats, day.didWarmup);
  const conditioningLog = day.conditioningLog ? fromReplayConditioningLog(day.conditioningLog) : null;
  const progressEntries = fromReplayExerciseLogs(day.exerciseLogs);
  const progressMap = Object.fromEntries(progressEntries.map((entry) => [entry.exerciseId, entry]));
  const comparisonExercises = session.flatExercises.filter((exercise) => progressMap[exercise.id]);
  const isRecoveryLike = day.sessionRole === 'rest' || day.sessionRole === 'recover' || day.sessionRole === 'body_mass_protect';

  return (
    <>
      <Card title="Session Overview" subtitle={session.sessionIntent ?? day.workoutType ?? day.sessionRole}>
        <View style={shared.metricGrid}>
          <MetricTile label="Duration" value={resolveDuration(day, session)} />
          <MetricTile label="Completion" value={`${stats.completionRate}%`} tone={completionTone(stats.completionRate)} />
          <MetricTile label="Exercises" value={`${stats.completedExerciseCount} / ${stats.prescribedExerciseCount}`} />
          <MetricTile label="Warm-up" value={stats.didWarmup ? 'Completed' : 'Missed'} tone={stats.didWarmup ? 'good' : 'warning'} />
        </View>
        <View style={shared.metricGrid}>
          <MetricTile label="Sets" value={stats.plannedSetCount > 0 ? `${stats.completedSetCount} / ${stats.plannedSetCount}` : '--'} />
          <MetricTile label="Avg Logged RPE" value={stats.averageLoggedRpe > 0 ? stats.averageLoggedRpe.toFixed(1) : '--'} />
          <MetricTile label="Avg Prescribed RPE" value={stats.averagePrescribedRpe > 0 ? stats.averagePrescribedRpe.toFixed(1) : '--'} />
          <MetricTile
            label="Conditioning"
            value={stats.conditioningCompletionRate != null ? `${stats.conditioningCompletionRate}%` : '--'}
            tone={stats.conditioningCompletionRate != null ? completionTone(stats.conditioningCompletionRate) : 'default'}
          />
        </View>

        <SessionHeader session={session} />

        <View style={shared.inlineStatRow}>
          <Text style={shared.inlineStat}>Role {formatPhase(day.sessionRole)}</Text>
          <Text style={shared.inlineStat}>Intervention {formatPhase(day.interventionState)}</Text>
          {day.isMandatoryRecovery ? <Text style={shared.inlineStat}>Mandatory recovery</Text> : null}
          {day.workoutBlueprint ? <Text style={shared.inlineStat}>{day.workoutBlueprint}</Text> : null}
        </View>
      </Card>

      {isRecoveryLike && !session.hasSections && session.flatExercises.length === 0 ? (
        <Card title="Restricted Session" subtitle="No guided exercise block was generated for this replay day.">
          <Text style={shared.bodyText}>
            {day.isMandatoryRecovery
              ? 'Mandatory recovery is active. The athlete should focus on restoration rather than a guided workout.'
              : 'No guided workout was prescribed for this day.'}
          </Text>
        </Card>
      ) : null}

      <Card title="Session Body" subtitle="Readonly replay of the prescribed session using the shared workout UI.">
        <View style={styles.stack}>
          {session.conditioning ? (
            <ConditioningCard conditioning={session.conditioning} log={conditioningLog} />
          ) : null}

          {session.hasSections ? session.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              progressMap={progressMap}
            />
          )) : null}

          {!session.hasSections && session.flatExercises.length > 0 ? session.flatExercises.map((exercise, index) => (
            <ExerciseCard
              key={`${exercise.id}-${index}`}
              exercise={exercise}
              index={index + 1}
              progress={progressMap[exercise.id] ?? null}
            />
          )) : null}

          {!session.conditioning && !session.hasSections && session.flatExercises.length === 0 ? (
            <Text style={shared.bodyText}>No structured session body is available for this replay day.</Text>
          ) : null}
        </View>
      </Card>

      <Card title="Prescribed vs Logged" subtitle="Shared comparison rows for prescription fidelity.">
        {comparisonExercises.length > 0 ? comparisonExercises.map((exercise, index) => (
          <ComparisonRow
            key={`${exercise.id}-comparison-${index}`}
            exercise={exercise}
            progress={progressMap[exercise.id]}
          />
        )) : (
          <Text style={shared.bodyText}>No exercise-level comparison data is available for this replay day.</Text>
        )}
      </Card>

      <Card title="Raw Simulated Workout Log" subtitle="Underlying replay output for debugging and analyst review.">
        {day.exerciseLogs.length > 0 ? day.exerciseLogs.map((entry, index) => (
          <ExerciseLogRow key={`${entry.exerciseId}-${index}`} entry={entry} />
        )) : (
          <Text style={shared.bodyText}>No exercise-level simulated log exists for this day.</Text>
        )}
      </Card>
    </>
  );
}

function resolveDuration(day: EngineReplayDay, session: ReturnType<typeof fromReplayDay>) {
  if (session.conditioning) return `${session.conditioning.totalDurationMin} min`;
  if (session.estimatedDurationMin > 0) return `${session.estimatedDurationMin} min`;
  return day.durationMin > 0 ? `${day.durationMin} min` : '--';
}

function completionTone(rate: number): 'good' | 'warning' | 'default' {
  if (rate >= 90) return 'good';
  if (rate < 60) return 'warning';
  return 'default';
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.md,
  },
  noteCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
  },
});
