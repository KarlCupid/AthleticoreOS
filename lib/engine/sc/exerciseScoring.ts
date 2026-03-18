import type {
  ExerciseLibraryRow,
  ExerciseScore,
  ExerciseScoringContext,
} from '../types.ts';

export function getExerciseRecoveryCost(exercise: ExerciseLibraryRow): number {
  if (typeof exercise.normalized_recovery_cost === 'number' && Number.isFinite(exercise.normalized_recovery_cost)) {
    return exercise.normalized_recovery_cost;
  }

  const eccentric = exercise.eccentric_damage ?? Math.max(1, Math.min(5, Math.round(exercise.cns_load / 2)));
  const recoveryHours = exercise.recovery_hours ?? (exercise.cns_load >= 8 ? 48 : exercise.cns_load >= 5 ? 36 : 24);
  return Math.round((exercise.cns_load * 4) + (eccentric * 5) + (recoveryHours / 4));
}

export function scoreExerciseCandidate(
  exercise: ExerciseLibraryRow,
  fitScore: number,
  context: ExerciseScoringContext,
): ExerciseScore {
  let recoveryCost = getExerciseRecoveryCost(exercise);

  if (context.readinessState === 'Depleted') {
    recoveryCost += 12;
  } else if (context.readinessState === 'Caution') {
    recoveryCost += 4;
  }

  if (context.acwr > 1.4 && exercise.cns_load >= 7) {
    recoveryCost += 10;
  }

  return {
    fitScore,
    recoveryCost,
  };
}
