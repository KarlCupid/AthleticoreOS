import type { WorkoutPrescriptionV2 } from '../types.ts';

export function autoregulateSession(
  plannedSession: WorkoutPrescriptionV2,
  activationRPE: number,
  expectedActivationRPE: number | null | undefined,
): WorkoutPrescriptionV2 {
  const expected = expectedActivationRPE ?? plannedSession.expectedActivationRPE ?? 4;
  const rpeDeviation = activationRPE - expected;

  if (Math.abs(rpeDeviation) < 2) {
    return plannedSession;
  }

  const downshift = rpeDeviation >= 2;
  const adjustedExercises = plannedSession.exercises.map((exercise) => {
    if (exercise.sectionTemplate === 'activation' || exercise.sectionTemplate === 'cooldown') {
      return exercise;
    }

    const nextSets = downshift
      ? Math.max(1, exercise.targetSets - 1)
      : exercise.targetSets;
    const nextRPE = downshift
      ? Math.max(4, exercise.targetRPE - 1)
      : Math.min(10, exercise.targetRPE + 1);
    const nextWeight = typeof exercise.suggestedWeight === 'number'
      ? Math.round(exercise.suggestedWeight * (downshift ? 0.9 : 1.05))
      : exercise.suggestedWeight;

    return {
      ...exercise,
      targetSets: nextSets,
      targetRPE: nextRPE,
      suggestedWeight: nextWeight,
    };
  });

  const message = downshift
    ? `Autoregulated: activation RPE ${activationRPE} vs expected ${expected}. Main work was downshifted.`
    : `Autoregulated: activation RPE ${activationRPE} vs expected ${expected}. Main work was slightly upshifted.`;

  return {
    ...plannedSession,
    exercises: adjustedExercises,
    decisionTrace: [...plannedSession.decisionTrace, `activation_rpe:${activationRPE}`, downshift ? 'autoregulation:downshift' : 'autoregulation:upshift'],
    message: `${plannedSession.message} ${message}`,
  };
}
