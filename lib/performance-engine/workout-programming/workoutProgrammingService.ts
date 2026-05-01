import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import {
  loadUserWorkoutProfile,
  loadWorkoutProgrammingCatalog,
  logWorkoutCompletion as persistWorkoutCompletion,
  saveGeneratedWorkout,
  saveProgressionDecision,
  type WorkoutProgrammingPersistenceOptions,
} from './persistenceService.ts';
import { generateWeeklyWorkoutProgram } from './programBuilder.ts';
import { rankExerciseSubstitutions } from './substitutionEngine.ts';
import { validateWorkoutDomain } from './validationEngine.ts';
import { generateWorkoutDescription } from './workoutDescriptionService.ts';
import type {
  DescriptionToneVariant,
  ExerciseSubstitutionOption,
  GeneratedProgram,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  ProgressionDecision,
  ProtectedWorkoutInput,
  WorkoutCompletionLog,
  WorkoutExperienceLevel,
  WorkoutProgrammingCatalog,
  WorkoutReadinessBand,
  WorkoutValidationResult,
} from './types.ts';

export interface WorkoutProgrammingServiceOptions extends WorkoutProgrammingPersistenceOptions {
  persistGeneratedWorkout?: boolean;
}

export type WorkoutProgrammingPreviewRequest = PersonalizedWorkoutInput;

export type WorkoutProgrammingUserRequest = Pick<PersonalizedWorkoutInput, 'goalId'> & Partial<PersonalizedWorkoutInput>;

export interface WorkoutProgrammingSubstitutionConstraints {
  equipmentIds?: string[];
  safetyFlagIds?: string[];
  experienceLevel?: WorkoutExperienceLevel;
  dislikedExerciseIds?: string[];
  limit?: number;
}

export interface WorkoutProgrammingSubstitutionResult {
  sourceExerciseId: string;
  options: ExerciseSubstitutionOption[];
  selected: ExerciseSubstitutionOption | null;
}

export interface WorkoutProgrammingCompletionResult {
  workoutCompletionId: string | null;
  progressionDecision: ProgressionDecision;
  progressionDecisionId: string | null;
}

export type WorkoutProgrammingProgramRequest = Pick<PersonalizedWorkoutInput, 'goalId'> & Partial<PersonalizedWorkoutInput> & {
  secondaryGoalIds?: string[];
  weekCount?: number;
  desiredProgramLengthWeeks?: number;
  sessionsPerWeek?: number;
  availableDays?: number[];
  protectedWorkouts?: ProtectedWorkoutInput[];
  readinessTrend?: WorkoutReadinessBand[];
  deloadStrategy?: 'none' | 'week_four' | 'readiness_based' | 'every_fourth_week';
};

function mergeProfileRequest(
  userId: string,
  profile: Awaited<ReturnType<typeof loadUserWorkoutProfile>>,
  request: WorkoutProgrammingUserRequest,
): PersonalizedWorkoutInput {
  const input: PersonalizedWorkoutInput = {
    ...request,
    userId,
    goalId: request.goalId,
    durationMinutes: request.durationMinutes ?? request.preferredDurationMinutes ?? profile.preferredDurationMinutes,
    preferredDurationMinutes: request.preferredDurationMinutes ?? profile.preferredDurationMinutes,
    equipmentIds: request.equipmentIds ?? profile.equipmentIds,
    experienceLevel: request.experienceLevel ?? profile.experienceLevel,
    safetyFlags: [...profile.safetyFlags, ...(request.safetyFlags ?? [])],
    painFlags: [...profile.painFlags, ...(request.painFlags ?? [])],
    dislikedExerciseIds: [...profile.dislikedExerciseIds, ...(request.dislikedExerciseIds ?? [])],
    likedExerciseIds: [...(profile.likedExerciseIds ?? []), ...(request.likedExerciseIds ?? [])],
    readinessBand: request.readinessBand ?? profile.readinessBand,
  };
  const workoutEnvironment = request.workoutEnvironment ?? profile.workoutEnvironment;
  const preferredToneVariant = request.preferredToneVariant ?? profile.preferredToneVariant;
  if (workoutEnvironment) input.workoutEnvironment = workoutEnvironment;
  if (preferredToneVariant) input.preferredToneVariant = preferredToneVariant;
  return input;
}

function attachValidatedDescription(
  workout: GeneratedWorkout,
  catalog: WorkoutProgrammingCatalog,
  toneVariant?: DescriptionToneVariant,
): GeneratedWorkout {
  const descriptionOptions = {
    templates: workoutIntelligenceCatalog.descriptionTemplates,
  };
  const description = generateWorkoutDescription(workout, toneVariant ? {
    ...descriptionOptions,
    toneVariant,
  } : descriptionOptions);
  const described: GeneratedWorkout = {
    ...workout,
    sessionIntent: workout.sessionIntent ?? description.sessionIntent,
    userFacingSummary: workout.userFacingSummary ?? description.plainLanguageSummary,
    description,
    descriptions: [description],
    coachingNotes: workout.coachingNotes ?? [description.coachExplanation, description.effortExplanation],
  };
  const validation = validateWorkoutDomain(described, catalog);
  return {
    ...described,
    validation,
    validationWarnings: validation.warnings,
    validationErrors: validation.errors,
  };
}

export async function getWorkoutProgrammingCatalog(
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<WorkoutProgrammingCatalog> {
  return loadWorkoutProgrammingCatalog(options);
}

export async function generateWorkoutForUser(
  userId: string,
  request: WorkoutProgrammingUserRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkout> {
  const [catalog, profile] = await Promise.all([
    loadWorkoutProgrammingCatalog(options),
    loadUserWorkoutProfile(userId, options),
  ]);
  const input = mergeProfileRequest(userId, profile, request);
  const workout = generatePersonalizedWorkout(input, catalog, workoutIntelligenceCatalog);
  const enriched = attachValidatedDescription(workout, catalog, input.preferredToneVariant);
  if (options?.persistGeneratedWorkout !== false) {
    await saveGeneratedWorkout(userId, enriched, options);
  }
  return enriched;
}

export async function generatePreviewWorkout(
  request: WorkoutProgrammingPreviewRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkout> {
  const catalog = await loadWorkoutProgrammingCatalog(options);
  const workout = generatePersonalizedWorkout(request, catalog, workoutIntelligenceCatalog);
  return attachValidatedDescription(workout, catalog, request.preferredToneVariant);
}

export async function validateWorkout(
  workout: GeneratedWorkout,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<WorkoutValidationResult> {
  const catalog = await loadWorkoutProgrammingCatalog(options);
  return validateWorkoutDomain(workout, catalog);
}

export async function substituteExercise(
  workout: GeneratedWorkout,
  exerciseId: string,
  constraints: WorkoutProgrammingSubstitutionConstraints = {},
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<WorkoutProgrammingSubstitutionResult> {
  const catalog = await loadWorkoutProgrammingCatalog(options);
  const source = workout.blocks.flatMap((block) => block.exercises).find((exercise) => exercise.exerciseId === exerciseId);
  const substitutionInput: Parameters<typeof rankExerciseSubstitutions>[0] = {
    sourceExerciseId: exerciseId,
    workoutTypeId: workout.workoutTypeId,
    goalId: workout.goalId,
    equipmentIds: constraints.equipmentIds ?? workout.equipmentIds,
    safetyFlagIds: constraints.safetyFlagIds ?? workout.safetyFlags,
    experienceLevel: constraints.experienceLevel ?? workout.experienceLevel ?? 'beginner',
    catalog,
    intelligence: workoutIntelligenceCatalog,
    limit: constraints.limit ?? 5,
  };
  if (source?.movementPatternIds) substitutionInput.movementPatternIds = source.movementPatternIds;
  if (source?.primaryMuscleIds) substitutionInput.primaryMuscleIds = source.primaryMuscleIds;
  if (constraints.dislikedExerciseIds) substitutionInput.dislikedExerciseIds = constraints.dislikedExerciseIds;
  const optionsList = rankExerciseSubstitutions(substitutionInput);
  return {
    sourceExerciseId: exerciseId,
    options: optionsList,
    selected: optionsList[0] ?? null,
  };
}

export async function logWorkoutCompletion(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: WorkoutProgrammingServiceOptions & {
    generatedWorkoutId?: string | null;
    workoutCompletionId?: string | null;
  },
): Promise<WorkoutProgrammingCompletionResult> {
  const workoutCompletionId = options?.workoutCompletionId
    ?? await persistWorkoutCompletion(
      userId,
      completion,
      options?.generatedWorkoutId == null ? options : { ...options, generatedWorkoutId: options.generatedWorkoutId },
    );
  const progressionDecision = await getNextProgression(userId, completion, {
    ...options,
    workoutCompletionId,
  });
  const progressionDecisionId = await saveProgressionDecision(userId, progressionDecision, {
    ...options,
    workoutCompletionId,
  });
  return {
    workoutCompletionId,
    progressionDecision,
    progressionDecisionId,
  };
}

export async function getNextProgression(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: WorkoutProgrammingServiceOptions & {
    workout?: GeneratedWorkout;
    recentWorkoutCompletions?: WorkoutCompletionLog[];
    workoutCompletionId?: string | null;
  },
): Promise<ProgressionDecision> {
  void userId;
  const { recommendNextProgression } = await import('./personalizationEngine.ts');
  const input: Parameters<typeof recommendNextProgression>[0] = {
    completionLog: completion,
  };
  if (options?.workout) input.workout = options.workout;
  const workoutTypeId = completion.workoutTypeId ?? options?.workout?.workoutTypeId;
  const goalId = completion.goalId ?? options?.workout?.goalId;
  if (workoutTypeId) input.workoutTypeId = workoutTypeId;
  if (goalId) input.goalId = goalId;
  if (completion.prescriptionTemplateId) input.prescriptionTemplateId = completion.prescriptionTemplateId;
  if (options?.recentWorkoutCompletions) input.recentWorkoutCompletions = options.recentWorkoutCompletions;
  if (completion.readinessBefore) input.readinessBefore = completion.readinessBefore;
  if (completion.readinessAfter) input.readinessAfter = completion.readinessAfter;
  return recommendNextProgression(input);
}

export async function generateWeeklyProgramForUser(
  userId: string,
  request: WorkoutProgrammingProgramRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  const profile = await loadUserWorkoutProfile(userId, options);
  const input = mergeProfileRequest(userId, profile, request);
  return generateWeeklyWorkoutProgram({
    ...request,
    ...input,
  });
}

export function getWorkoutDescription(
  workout: GeneratedWorkout,
  toneVariant?: DescriptionToneVariant,
) {
  const options = {
    templates: workoutIntelligenceCatalog.descriptionTemplates,
  };
  return generateWorkoutDescription(workout, toneVariant ? { ...options, toneVariant } : options);
}

export const workoutProgrammingService = {
  getWorkoutProgrammingCatalog,
  generateWorkoutForUser,
  generatePreviewWorkout,
  validateWorkout,
  substituteExercise,
  logWorkoutCompletion,
  getNextProgression,
  generateWeeklyProgramForUser,
  getWorkoutDescription,
};
