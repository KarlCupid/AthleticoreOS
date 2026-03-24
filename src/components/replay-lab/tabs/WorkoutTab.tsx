import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../../Card';
import { MetricTile } from '../primitives/MetricTile';
import { ExerciseLogRow, PrescribedExerciseRow, WorkoutComparisonRow } from '../primitives/ExerciseRow';
import { ConditioningDrillRow } from '../primitives/ConditioningDrillRow';
import { formatPhase } from '../helpers';
import { shared } from '../styles';
import type { EngineReplayDay } from '../../../../lib/engine/simulation/lab';
import type { WorkoutStats } from '../useReplayState';

interface WorkoutTabProps {
  day: EngineReplayDay;
  workoutStats: WorkoutStats;
}

// ---------------------------------------------------------------------------
// Conditioning-focused workout view
// ---------------------------------------------------------------------------

function ConditioningWorkoutView({ day, workoutStats }: WorkoutTabProps) {
  const cp = day.conditioningPrescription!;
  const cl = day.conditioningLog;

  return (
    <>
      <Card title="Workout Snapshot" subtitle={day.workoutType ?? 'untyped session'}>
        <View style={shared.metricGrid}>
          <MetricTile label="Duration" value={`${cl?.completedDurationMin ?? 0} / ${cp.totalDurationMin} min`} />
          <MetricTile label="Rounds" value={`${cl?.completedRounds ?? 0} / ${cp.rounds}`} />
          <MetricTile
            label="Drills"
            value={`${cl?.drillLogs.filter((e) => e.completed).length ?? 0} / ${cp.drills.length}`}
          />
          <MetricTile
            label="Completion"
            value={`${workoutStats.conditioningCompletionRate}%`}
            tone={completionTone(workoutStats.conditioningCompletionRate)}
          />
        </View>
        <View style={shared.metricGrid}>
          <MetricTile label="Planned Intensity" value={cp.intensityLabel} />
          <MetricTile label="Logged Avg RPE" value={cl?.actualRpe?.toFixed(1) ?? '--'} />
          <MetricTile label="Warm-up" value={day.didWarmup ? 'Completed' : 'Missed'} />
          <MetricTile label="Role" value={formatPhase(day.sessionRole)} />
        </View>
        {day.activationGuidance ? <Text style={shared.bodyText}>Activation: {day.activationGuidance}</Text> : null}
        <Text style={shared.bodyText}>Conditioning: {cp.message}</Text>
        <Text style={shared.bodyText}>Blueprint: {day.workoutBlueprint}</Text>
      </Card>

      <Card title="Conditioning Prescription" subtitle={cp.message}>
        <View style={shared.metricGrid}>
          <MetricTile label="Type" value={formatPhase(cp.type)} />
          <MetricTile label="Rounds" value={String(cp.rounds)} />
          <MetricTile label="Work / Rest" value={`${cp.workIntervalSec}s / ${cp.restIntervalSec}s`} />
          <MetricTile label="Est. Load" value={String(cp.estimatedLoad)} />
        </View>
        {cp.drills.map((drill, index) => (
          <ConditioningDrillRow
            key={`${drill.name}-prescribed-${index}`}
            name={drill.name}
            subtitle={`${drill.rounds} rounds${drill.durationSec != null ? ` | ${drill.durationSec}s work` : ''}${drill.reps != null ? ` | ${drill.reps} reps` : ''}${drill.restSec ? ` | ${drill.restSec}s rest` : ''}`}
            status="Planned"
            note="Engine prescribed this drill as part of the conditioning block."
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
          <Text style={shared.bodyText}>No simulated conditioning log exists for this day.</Text>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Strength-focused workout view
// ---------------------------------------------------------------------------

function StrengthWorkoutView({ day, workoutStats }: WorkoutTabProps) {
  return (
    <>
      <Card title="Workout Snapshot" subtitle={day.workoutType ?? 'untyped session'}>
        <View style={shared.metricGrid}>
          <MetricTile label="Duration" value={day.durationMin > 0 ? `${day.durationMin} min` : '--'} />
          <MetricTile label="Exercises" value={`${workoutStats.completedExerciseCount} / ${workoutStats.prescribedExerciseCount}`} />
          <MetricTile
            label="Set Completion"
            value={workoutStats.plannedSetCount > 0 ? `${workoutStats.completedSetCount} / ${workoutStats.plannedSetCount}` : '--'}
          />
          <MetricTile
            label="Completion"
            value={`${workoutStats.completionRate}%`}
            tone={completionTone(workoutStats.completionRate)}
          />
        </View>
        <View style={shared.metricGrid}>
          <MetricTile
            label="Planned Avg RPE"
            value={workoutStats.prescribedExerciseCount > 0 ? workoutStats.averagePrescribedRpe.toFixed(1) : '--'}
          />
          <MetricTile
            label="Logged Avg RPE"
            value={workoutStats.completedExerciseCount > 0 ? workoutStats.averageLoggedRpe.toFixed(1) : '--'}
          />
          <MetricTile label="Warm-up" value={day.didWarmup ? 'Completed' : 'Missed'} />
          <MetricTile label="Role" value={formatPhase(day.sessionRole)} />
        </View>
        {day.activationGuidance ? <Text style={shared.bodyText}>Activation: {day.activationGuidance}</Text> : null}
        <Text style={shared.bodyText}>Blueprint: {day.workoutBlueprint}</Text>
      </Card>

      <Card title="Prescribed Session" subtitle="Full prescription before the simulated athlete touched it.">
        {day.prescribedExercises.length > 0
          ? day.prescribedExercises.map((entry, index) => (
            <PrescribedExerciseRow key={`${entry.exerciseId}-${entry.sectionTemplate ?? 'section'}-${index}`} entry={entry} />
          ))
          : <Text style={shared.bodyText}>No exercise prescription was generated for this day.</Text>}
      </Card>

      <Card title="Prescribed vs Logged" subtitle="Side-by-side comparison for each exercise in the session.">
        {day.prescribedExercises.length > 0
          ? day.prescribedExercises.map((entry, index) => {
            const logged = day.exerciseLogs.find((c) => c.exerciseId === entry.exerciseId) ?? null;
            return (
              <WorkoutComparisonRow key={`${entry.exerciseId}-compare-${index}`} prescribed={entry} logged={logged} />
            );
          })
          : <Text style={shared.bodyText}>No prescribed exercises exist to compare on this day.</Text>}
      </Card>

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

// ---------------------------------------------------------------------------
// Public component â€” branches between conditioning and strength
// ---------------------------------------------------------------------------

export function WorkoutTab({ day, workoutStats }: WorkoutTabProps) {
  if (day.conditioningPrescription) {
    return <ConditioningWorkoutView day={day} workoutStats={workoutStats} />;
  }
  return <StrengthWorkoutView day={day} workoutStats={workoutStats} />;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function completionTone(rate: number): 'good' | 'warning' | 'default' {
  if (rate >= 90) return 'good';
  if (rate < 60) return 'warning';
  return 'default';
}

