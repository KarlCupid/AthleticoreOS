import type { WorkoutPrescriptionV2 } from '../types.ts';

export function autoregulateSession(
  plannedSession: WorkoutPrescriptionV2,
  activationRPE: number,
  expectedActivationRPE: number | null | undefined,
): WorkoutPrescriptionV2 {
  const expected = expectedActivationRPE ?? plannedSession.expectedActivationRPE ?? 4;
  const rpeDeviation = activationRPE - expected;

  if (rpeDeviation < 2) {
    return plannedSession;
  }

  const severeDownshift = rpeDeviation >= 3;
  const adjustedExercises = plannedSession.exercises
  .filter((exercise) => {
    if (!severeDownshift) return true;
    return exercise.sectionTemplate !== 'power' && exercise.sectionTemplate !== 'finisher';
  })
  .map((exercise) => {
    if (exercise.sectionTemplate === 'activation' || exercise.sectionTemplate === 'cooldown') {
      return exercise;
    }

    const nextSets = Math.max(1, exercise.targetSets - (severeDownshift ? 2 : 1));
    const nextRPE = Math.max(4, exercise.targetRPE - (severeDownshift ? 2 : 1));
    const nextWeight = typeof exercise.suggestedWeight === 'number'
      ? Math.round(exercise.suggestedWeight * (severeDownshift ? 0.85 : 0.9))
      : exercise.suggestedWeight;

    return {
      ...exercise,
      targetSets: nextSets,
      targetRPE: nextRPE,
      suggestedWeight: nextWeight,
    };
  });

  const adjustedSections = plannedSession.sections
    ?.map((section) => ({
      ...section,
      exercises: section.exercises
        .filter((exercise) => {
          if (!severeDownshift) return true;
          return exercise.sectionTemplate !== 'power' && exercise.sectionTemplate !== 'finisher';
        })
        .map((exercise) => {
          if (exercise.sectionTemplate === 'activation' || exercise.sectionTemplate === 'cooldown') {
            return exercise;
          }
          const nextSets = Math.max(1, exercise.targetSets - (severeDownshift ? 2 : 1));
          const nextRPE = Math.max(4, exercise.targetRPE - (severeDownshift ? 2 : 1));
          const nextWeight = typeof exercise.suggestedWeight === 'number'
            ? Math.round(exercise.suggestedWeight * (severeDownshift ? 0.85 : 0.9))
            : exercise.suggestedWeight;
          return {
            ...exercise,
            targetSets: nextSets,
            targetRPE: nextRPE,
            suggestedWeight: nextWeight,
            setPrescription: exercise.setPrescription?.map((entry) => ({
              ...entry,
              sets: Math.max(1, entry.sets - (severeDownshift ? 2 : 1)),
              targetRPE: Math.max(4, entry.targetRPE - (severeDownshift ? 2 : 1)),
            })),
          };
        }),
      decisionTrace: [...section.decisionTrace, severeDownshift ? 'autoregulation:severe_downshift' : 'autoregulation:downshift'],
    }))
    .filter((section) => section.exercises.length > 0);

  const message = severeDownshift
    ? `Autoregulated: activation RPE ${activationRPE} vs expected ${expected}. Main work was downshifted and high-speed/high-impact work was blocked.`
    : `Autoregulated: activation RPE ${activationRPE} vs expected ${expected}. Main work was downshifted.`;

  return {
    ...plannedSession,
    exercises: adjustedExercises,
    sections: adjustedSections,
    decisionTrace: [...plannedSession.decisionTrace, `activation_rpe:${activationRPE}`, severeDownshift ? 'autoregulation:severe_downshift' : 'autoregulation:downshift'],
    message: `${plannedSession.message} ${message}`,
  };
}
