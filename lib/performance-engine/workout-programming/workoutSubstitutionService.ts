import { prepareWorkoutProgrammingContentForMode } from './contentReview.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import { loadWorkoutProgrammingCatalog } from './persistenceService.ts';
import { rankExerciseSubstitutions } from './substitutionEngine.ts';
import type { GeneratedWorkout } from './types.ts';
import {
  contentReviewOptions,
  emitRecommendationTelemetry,
} from './workoutServiceShared.ts';
import type {
  WorkoutProgrammingServiceOptions,
  WorkoutProgrammingSubstitutionConstraints,
  WorkoutProgrammingSubstitutionResult,
} from './workoutProgrammingServiceTypes.ts';

export async function substituteExercise(
  workout: GeneratedWorkout,
  exerciseId: string,
  constraints: WorkoutProgrammingSubstitutionConstraints = {},
  options?: WorkoutProgrammingServiceOptions,
): Promise<WorkoutProgrammingSubstitutionResult> {
  const catalog = await loadWorkoutProgrammingCatalog(options);
  const prepared = prepareWorkoutProgrammingContentForMode(catalog, workoutIntelligenceCatalog, contentReviewOptions(options, 'production'));
  const source = workout.blocks.flatMap((block) => block.exercises).find((exercise) => exercise.exerciseId === exerciseId);
  const substitutionInput: Parameters<typeof rankExerciseSubstitutions>[0] = {
    sourceExerciseId: exerciseId,
    workoutTypeId: workout.workoutTypeId,
    goalId: workout.goalId,
    equipmentIds: constraints.equipmentIds ?? workout.equipmentIds,
    safetyFlagIds: constraints.safetyFlagIds ?? workout.safetyFlags,
    experienceLevel: constraints.experienceLevel ?? workout.experienceLevel ?? 'beginner',
    catalog: prepared.catalog,
    intelligence: prepared.intelligence,
    limit: constraints.limit ?? 5,
  };
  if (source?.movementPatternIds) substitutionInput.movementPatternIds = source.movementPatternIds;
  if (source?.primaryMuscleIds) substitutionInput.primaryMuscleIds = source.primaryMuscleIds;
  if (constraints.dislikedExerciseIds) substitutionInput.dislikedExerciseIds = constraints.dislikedExerciseIds;
  const optionsList = rankExerciseSubstitutions(substitutionInput);
  const result = {
    sourceExerciseId: exerciseId,
    options: optionsList,
    selected: optionsList[0] ?? null,
  };
  if (constraints.userId && result.selected) {
    await emitRecommendationTelemetry(constraints.userId, 'exercise_substituted', {
      generatedWorkoutId: constraints.generatedWorkoutId ?? null,
      workout,
      payload: {
        sourceExerciseId: exerciseId,
        selectedExerciseId: result.selected.exerciseId,
        optionCount: result.options.length,
        reason: result.selected.rationale,
        matchedRuleId: result.selected.matchedRuleId ?? null,
      },
    }, options);
  }
  return result;
}
