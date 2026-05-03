import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import {
  buildPersonalizedWorkoutInputFromPerformanceState,
  type WorkoutProgrammingAppStateAdapterInput,
} from './appStateAdapter.ts';
import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import {
  filterIntelligenceForContentReview,
  prepareWorkoutProgrammingContentForMode,
  type ContentReviewMode,
  type PreparedWorkoutProgrammingContent,
} from './contentReview.ts';
import {
  abandonGeneratedWorkoutSession as persistAbandonGeneratedWorkoutSession,
  archiveProgram as persistArchiveProgram,
  attachGeneratedWorkoutToProgramSession as persistAttachGeneratedWorkoutToProgramSession,
  completeGeneratedWorkoutSessionLifecycle as persistCompleteGeneratedWorkoutSessionLifecycle,
  DatabaseUnavailableError,
  listUserPrograms as persistListUserPrograms,
  listActiveGeneratedWorkoutSessions as persistListActiveGeneratedWorkoutSessions,
  loadActiveGeneratedWorkoutSession as persistLoadActiveGeneratedWorkoutSession,
  loadGeneratedWorkout as persistLoadGeneratedWorkout,
  loadGeneratedProgram as persistLoadGeneratedProgram,
  loadRecentCompletions,
  loadProgressionDecisionsForCompletion,
  loadRecentProgressionDecisionsForUser,
  loadRecentReadiness,
  loadUserWorkoutProfile,
  loadWorkoutProgrammingCatalog,
  logWorkoutCompletionWithExerciseResults as persistWorkoutCompletion,
  markGeneratedWorkoutInspected as persistMarkGeneratedWorkoutInspected,
  markProgramSessionCompleted as persistMarkProgramSessionCompleted,
  NotFoundError,
  pauseGeneratedWorkoutSession as persistPauseGeneratedWorkoutSession,
  resumeGeneratedWorkoutSession as persistResumeGeneratedWorkoutSession,
  saveGeneratedProgram as persistGeneratedProgram,
  saveGeneratedWorkoutWithExercises,
  saveProgressionDecision,
  saveRecommendationFeedback,
  startGeneratedWorkoutSession as persistStartGeneratedWorkoutSession,
  stopGeneratedWorkoutSession as persistStopGeneratedWorkoutSession,
  updateProgramSession as persistUpdateProgramSession,
  upsertExercisePreferences,
  type ActiveGeneratedWorkoutSessionListOptions,
  type GeneratedWorkoutSessionLifecycleOptions,
  type ProgramSessionUpdate,
  type WorkoutProgrammingPersistenceOptions,
} from './persistenceService.ts';
import type { GeneratedWorkoutCompletionSurface } from './historyAnalyticsAdapter.ts';
import { isGeneratedWorkoutCompletion } from './historyAnalyticsAdapter.ts';
import { generateWeeklyWorkoutProgram } from './programBuilder.ts';
import { rankExerciseSubstitutions } from './substitutionEngine.ts';
import { validateWorkoutDomain } from './validationEngine.ts';
import { generateWorkoutDescription } from './workoutDescriptionService.ts';
import type {
  DescriptionToneVariant,
  ExerciseSubstitutionOption,
  GeneratedProgram,
  GeneratedWorkout,
  GeneratedWorkoutSessionLifecycle,
  GeneratedWorkoutSessionLifecycleStatus,
  ProgramCalendarEvent,
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
  persistGeneratedProgram?: boolean;
  contentReviewMode?: ContentReviewMode;
  allowDraftContent?: boolean;
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
  nextSessionRecommendation: string;
}

export interface GeneratedWorkoutSessionResult {
  workout: GeneratedWorkout;
  generatedWorkoutId: string | null;
  persisted: boolean;
  lifecycle?: GeneratedWorkoutLifecycleResult;
  lifecycleFallbackMessage?: string;
}

export interface GeneratedWorkoutLifecycleResult {
  lifecycle: GeneratedWorkoutSessionLifecycle;
  persisted: boolean;
  fallbackMessage?: string;
}

export interface GeneratedWorkoutSessionExerciseCompletionInput {
  exerciseId: string;
  setsCompleted?: number | null;
  repsCompleted?: number | null;
  durationSecondsCompleted?: number | null;
  durationMinutesCompleted?: number | null;
  actualRpe?: number | null;
  painScore?: number | null;
  completedAsPrescribed?: boolean;
}

export interface GeneratedWorkoutSessionCompletionInput {
  workout: GeneratedWorkout;
  generatedWorkoutId?: string | null;
  startedAt?: string | null;
  completedAt?: string;
  completedExerciseIds?: string[];
  exerciseResults?: GeneratedWorkoutSessionExerciseCompletionInput[];
  sessionRpe: number;
  painScoreBefore?: number | null;
  painScoreAfter?: number | null;
  notes?: string | null;
  completionStatus?: 'completed' | 'partial' | 'stopped';
  substitutionsUsed?: string[];
  rating?: number | null;
  feedbackTags?: string[];
  likedExerciseIds?: string[];
  dislikedExerciseIds?: string[];
}

export interface GeneratedWorkoutSessionCompletionResult extends WorkoutProgrammingCompletionResult {
  feedbackId: string | null;
  lifecycle?: GeneratedWorkoutLifecycleResult;
  lifecycleFallbackMessage?: string;
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
  startDate?: string;
  calendarEvents?: ProgramCalendarEvent[];
  existingCalendarEvents?: ProgramCalendarEvent[];
};

export type WorkoutProgrammingPerformanceStateRequest = WorkoutProgrammingAppStateAdapterInput;

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
  intelligence = workoutIntelligenceCatalog,
): GeneratedWorkout {
  const descriptionOptions = {
    templates: intelligence.descriptionTemplates,
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

function contentReviewOptions(
  options: { contentReviewMode?: ContentReviewMode; allowDraftContent?: boolean } | undefined,
  defaultMode: ContentReviewMode,
) {
  return {
    mode: options?.contentReviewMode ?? defaultMode,
    allowDraftContent: options?.allowDraftContent ?? defaultMode !== 'production',
  };
}

function localGeneratedWorkoutLifecycle(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  status: GeneratedWorkoutSessionLifecycleStatus,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): GeneratedWorkoutSessionLifecycle {
  const timestamp = options?.occurredAt ?? new Date().toISOString();
  const lifecycle: GeneratedWorkoutSessionLifecycle = {
    generatedWorkoutId: generatedWorkoutId || `local-generated-workout-${status}`,
    userId,
    status,
    lastActiveAt: timestamp,
  };
  if (status === 'inspected') lifecycle.inspectedAt = timestamp;
  if (status === 'started') lifecycle.startedAt = timestamp;
  if (status === 'paused') lifecycle.pausedAt = timestamp;
  if (status === 'resumed') lifecycle.resumedAt = timestamp;
  if (status === 'completed') lifecycle.completedAt = timestamp;
  if (status === 'abandoned') lifecycle.abandonedAt = timestamp;
  if (status === 'stopped') lifecycle.stoppedAt = timestamp;
  if (options?.activeBlockId !== undefined) lifecycle.activeBlockId = options.activeBlockId;
  if (options?.activeExerciseId !== undefined) lifecycle.activeExerciseId = options.activeExerciseId;
  if (options?.completionStatus !== undefined) lifecycle.completionStatus = options.completionStatus;
  if (options?.notes !== undefined) lifecycle.notes = options.notes;
  return lifecycle;
}

function hasLifecyclePersistenceTarget(generatedWorkoutId: string | null | undefined, options?: WorkoutProgrammingPersistenceOptions): generatedWorkoutId is string {
  return Boolean(generatedWorkoutId && (options?.client || options?.useSupabase));
}

async function runLifecycleMutationWithFallback(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  status: GeneratedWorkoutSessionLifecycleStatus,
  persist: (id: string) => Promise<GeneratedWorkoutSessionLifecycle | null>,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  if (!hasLifecyclePersistenceTarget(generatedWorkoutId, options)) {
    return {
      lifecycle: localGeneratedWorkoutLifecycle(userId, generatedWorkoutId, status, options),
      persisted: false,
    };
  }

  try {
    const lifecycle = await persist(generatedWorkoutId);
    if (lifecycle) return { lifecycle, persisted: true };
    return {
      lifecycle: localGeneratedWorkoutLifecycle(userId, generatedWorkoutId, status, options),
      persisted: false,
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    const fallbackMessage = error instanceof DatabaseUnavailableError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Generated workout lifecycle persistence failed.';
    return {
      lifecycle: localGeneratedWorkoutLifecycle(userId, generatedWorkoutId, status, options),
      persisted: false,
      fallbackMessage,
    };
  }
}

function applyContentReviewDiagnostics(
  workout: GeneratedWorkout,
  prepared: PreparedWorkoutProgrammingContent,
  mode: ContentReviewMode,
): GeneratedWorkout {
  const previewWarnings = prepared.warnings.map((warning) => warning.message);
  const reviewTrace = {
    id: 'content_review_gate',
    step: 'content_review',
    reason: mode === 'production'
      ? `Production content review gate excluded ${prepared.excluded.length} non-production record(s).`
      : `Preview content review gate allowed ${prepared.warnings.length} review warning(s) and excluded ${prepared.excluded.length} blocked record(s).`,
    rejectedIds: prepared.excluded.map((issue) => `${issue.recordType}:${issue.id}`),
    metadata: {
      mode,
      warningCount: prepared.warnings.length,
      excludedCount: prepared.excluded.length,
      warnings: prepared.warnings,
      excluded: prepared.excluded,
    },
  };
  return {
    ...workout,
    validationWarnings: [...(workout.validationWarnings ?? []), ...previewWarnings],
    decisionTrace: [...(workout.decisionTrace ?? []), reviewTrace],
  };
}

function attachAppStateDecisionTrace(
  workout: GeneratedWorkout,
  decisionTrace: GeneratedWorkout['decisionTrace'],
): GeneratedWorkout {
  if (!decisionTrace?.length) return workout;
  return {
    ...workout,
    explanations: [
      ...workout.explanations,
      'Workout-programming context was resolved from the app-wide PerformanceState/profile/readiness adapter.',
    ],
    decisionTrace: [
      ...decisionTrace,
      ...(workout.decisionTrace ?? []),
    ],
  };
}

async function buildWorkoutForUser(
  userId: string,
  request: WorkoutProgrammingUserRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<{ workout: GeneratedWorkout; input: PersonalizedWorkoutInput }> {
  const [catalog, profile] = await Promise.all([
    loadWorkoutProgrammingCatalog(options),
    loadUserWorkoutProfile(userId, options),
  ]);
  const input = mergeProfileRequest(userId, profile, request);
  const prepared = prepareWorkoutProgrammingContentForMode(catalog, workoutIntelligenceCatalog, contentReviewOptions(options, 'production'));
  const workout = generatePersonalizedWorkout(input, prepared.catalog, prepared.intelligence);
  const enriched = applyContentReviewDiagnostics(
    attachValidatedDescription(workout, prepared.catalog, input.preferredToneVariant, prepared.intelligence),
    prepared,
    options?.contentReviewMode ?? 'production',
  );
  return { workout: enriched, input };
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
  const { workout: enriched } = await buildWorkoutForUser(userId, request, options);
  if (options?.persistGeneratedWorkout !== false) {
    await saveGeneratedWorkoutWithExercises(userId, enriched, options);
  }
  return enriched;
}

export async function markGeneratedWorkoutInspected(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  return runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'inspected',
    (id) => persistMarkGeneratedWorkoutInspected(userId, id, options),
    options,
  );
}

export async function startGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  return runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'started',
    (id) => persistStartGeneratedWorkoutSession(userId, id, options),
    options,
  );
}

export async function pauseGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  return runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'paused',
    (id) => persistPauseGeneratedWorkoutSession(userId, id, options),
    options,
  );
}

export async function resumeGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  return runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'resumed',
    (id) => persistResumeGeneratedWorkoutSession(userId, id, options),
    options,
  );
}

export async function abandonGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  return runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'abandoned',
    (id) => persistAbandonGeneratedWorkoutSession(userId, id, options),
    { ...options, completionStatus: options?.completionStatus ?? 'abandoned' },
  );
}

export async function stopGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  return runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'stopped',
    (id) => persistStopGeneratedWorkoutSession(userId, id, options),
    { ...options, completionStatus: options?.completionStatus ?? 'stopped' },
  );
}

export async function completeGeneratedWorkoutSessionLifecycle(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  return runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'completed',
    (id) => persistCompleteGeneratedWorkoutSessionLifecycle(userId, id, options),
    { ...options, completionStatus: options?.completionStatus ?? 'completed' },
  );
}

export async function loadActiveGeneratedWorkoutSession(
  userId: string,
  options?: WorkoutProgrammingServiceOptions & ActiveGeneratedWorkoutSessionListOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return persistLoadActiveGeneratedWorkoutSession(userId, options);
}

export async function listActiveGeneratedWorkoutSessions(
  userId: string,
  options?: WorkoutProgrammingServiceOptions & ActiveGeneratedWorkoutSessionListOptions,
): Promise<GeneratedWorkoutSessionLifecycle[]> {
  return persistListActiveGeneratedWorkoutSessions(userId, options);
}

export async function generateGeneratedWorkoutSessionForUser(
  userId: string,
  request: WorkoutProgrammingUserRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkoutSessionResult> {
  const { workout } = await buildWorkoutForUser(userId, request, options);
  const shouldPersist = options?.persistGeneratedWorkout !== false;
  const generatedWorkoutId = shouldPersist
    ? await saveGeneratedWorkoutWithExercises(userId, workout, options)
    : null;
  const result: GeneratedWorkoutSessionResult = {
    workout,
    generatedWorkoutId,
    persisted: Boolean(generatedWorkoutId),
  };
  const lifecycle = await markGeneratedWorkoutInspected(userId, generatedWorkoutId, options);
  result.lifecycle = lifecycle;
  if (lifecycle.fallbackMessage) result.lifecycleFallbackMessage = lifecycle.fallbackMessage;
  return result;
}

export async function generatePreviewWorkout(
  request: WorkoutProgrammingPreviewRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkout> {
  const catalog = await loadWorkoutProgrammingCatalog(options);
  const prepared = prepareWorkoutProgrammingContentForMode(catalog, workoutIntelligenceCatalog, contentReviewOptions(options, 'preview'));
  const workout = generatePersonalizedWorkout(request, prepared.catalog, prepared.intelligence);
  return applyContentReviewDiagnostics(
    attachValidatedDescription(workout, prepared.catalog, request.preferredToneVariant, prepared.intelligence),
    prepared,
    options?.contentReviewMode ?? 'preview',
  );
}

export async function generatePreviewWorkoutFromPerformanceState(
  request: WorkoutProgrammingPerformanceStateRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkout> {
  const mapped = buildPersonalizedWorkoutInputFromPerformanceState(request);
  const workout = await generatePreviewWorkout(mapped.input, options);
  return attachAppStateDecisionTrace(workout, mapped.decisionTrace);
}

export async function generateWorkoutForUserFromPerformanceState(
  userId: string,
  request: WorkoutProgrammingPerformanceStateRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkout> {
  const mapped = buildPersonalizedWorkoutInputFromPerformanceState({
    ...request,
    request: {
      ...(request.request ?? {}),
      userId,
    },
  });
  const workout = await generateWorkoutForUser(userId, mapped.input, options);
  return attachAppStateDecisionTrace(workout, mapped.decisionTrace);
}

export async function validateWorkout(
  workout: GeneratedWorkout,
  options?: WorkoutProgrammingServiceOptions,
): Promise<WorkoutValidationResult> {
  const catalog = await loadWorkoutProgrammingCatalog(options);
  const prepared = prepareWorkoutProgrammingContentForMode(catalog, workoutIntelligenceCatalog, contentReviewOptions(options, 'production'));
  return validateWorkoutDomain(workout, prepared.catalog);
}

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
    workout?: GeneratedWorkout;
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
    nextSessionRecommendation: progressionDecision.userMessage ?? progressionDecision.nextAdjustment,
  };
}

function plannedRepsValue(reps: string | null): number | null {
  if (!reps) return null;
  const matches = reps.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  return Number(matches[matches.length - 1]);
}

function buildCompletionLogFromGeneratedWorkout(
  input: GeneratedWorkoutSessionCompletionInput,
): WorkoutCompletionLog {
  const completedSet = new Set(input.completedExerciseIds ?? input.workout.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId)));
  const exerciseResultById = new Map((input.exerciseResults ?? []).map((result) => [result.exerciseId, result]));
  const feedbackNotes = [
    input.notes?.trim() || null,
    input.completionStatus ? `Status: ${input.completionStatus}` : null,
    input.startedAt ? `Started at: ${input.startedAt}` : null,
    input.substitutionsUsed && input.substitutionsUsed.length > 0 ? `Substitutions used: ${input.substitutionsUsed.join(', ')}` : null,
    input.feedbackTags && input.feedbackTags.length > 0 ? `Feedback: ${input.feedbackTags.join(', ')}` : null,
  ].filter((item): item is string => Boolean(item));
  return {
    workoutId: input.generatedWorkoutId ?? input.workout.templateId,
    generatedWorkoutId: input.generatedWorkoutId ?? null,
    source: 'generated_workout',
    completedAt: input.completedAt ?? new Date().toISOString(),
    workoutTypeId: input.workout.workoutTypeId,
    goalId: input.workout.goalId,
    completionStatus: input.completionStatus ?? 'completed',
    substitutionsUsed: input.substitutionsUsed ?? [],
    plannedDurationMinutes: input.workout.estimatedDurationMinutes,
    actualDurationMinutes: input.workout.estimatedDurationMinutes,
    sessionRpe: input.sessionRpe,
    painScoreBefore: input.painScoreBefore ?? null,
    painScoreAfter: input.painScoreAfter ?? null,
    notes: feedbackNotes.length > 0 ? feedbackNotes.join('\n') : null,
    exerciseResults: input.workout.blocks.flatMap((block) => block.exercises.map((exercise) => {
      const completed = completedSet.has(exercise.exerciseId);
      const logged = exerciseResultById.get(exercise.exerciseId);
      const prescribedReps = plannedRepsValue(exercise.prescription.reps);
      const loggedCompleted = logged?.completedAsPrescribed ?? completed;
      return {
        exerciseId: exercise.exerciseId,
        setsCompleted: logged?.setsCompleted ?? (loggedCompleted ? exercise.prescription.sets ?? 0 : 0),
        setsPrescribed: exercise.prescription.sets,
        repsCompleted: logged?.repsCompleted ?? (loggedCompleted ? prescribedReps : null),
        repsPrescribed: prescribedReps,
        durationSecondsCompleted: logged?.durationSecondsCompleted ?? (loggedCompleted ? exercise.prescription.durationSeconds : null),
        durationSecondsPrescribed: exercise.prescription.durationSeconds,
        durationMinutesCompleted: logged?.durationMinutesCompleted ?? (loggedCompleted ? exercise.prescription.durationMinutes : null),
        durationMinutesPrescribed: exercise.prescription.durationMinutes,
        actualRpe: logged?.actualRpe ?? (loggedCompleted ? input.sessionRpe : null),
        targetRpe: exercise.prescription.targetRpe,
        painScore: logged?.painScore ?? input.painScoreAfter ?? null,
        completedAsPrescribed: loggedCompleted,
      };
    })),
  };
}

export async function completeGeneratedWorkoutSession(
  userId: string,
  input: GeneratedWorkoutSessionCompletionInput,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkoutSessionCompletionResult> {
  const completionLog = buildCompletionLogFromGeneratedWorkout(input);
  const completion = await logWorkoutCompletion(userId, completionLog, {
    ...options,
    generatedWorkoutId: input.generatedWorkoutId ?? null,
    workout: input.workout,
  });
  const feedbackNotes = [
    input.notes?.trim() || null,
    input.feedbackTags && input.feedbackTags.length > 0 ? `Tags: ${input.feedbackTags.join(', ')}` : null,
    input.likedExerciseIds && input.likedExerciseIds.length > 0 ? `Liked: ${input.likedExerciseIds.join(', ')}` : null,
    input.dislikedExerciseIds && input.dislikedExerciseIds.length > 0 ? `Disliked: ${input.dislikedExerciseIds.join(', ')}` : null,
  ].filter((item): item is string => Boolean(item));
  const feedbackId = input.rating != null || feedbackNotes.length > 0
    ? await saveRecommendationFeedback(userId, {
      generatedWorkoutId: input.generatedWorkoutId ?? null,
      rating: input.rating ?? null,
      notes: feedbackNotes.length > 0 ? feedbackNotes.join('\n') : null,
    }, options)
    : null;
  const preferenceRows = [
    ...(input.likedExerciseIds ?? []).map((exerciseId) => ({ exerciseId, preference: 'like' as const })),
    ...(input.dislikedExerciseIds ?? []).map((exerciseId) => ({ exerciseId, preference: 'dislike' as const })),
  ];
  if (preferenceRows.length > 0) {
    await upsertExercisePreferences(userId, preferenceRows, options);
  }
  let lifecycle: GeneratedWorkoutLifecycleResult | undefined;
  let lifecycleFallbackMessage: string | undefined;
  try {
    lifecycle = await completeGeneratedWorkoutSessionLifecycle(userId, input.generatedWorkoutId, {
      ...options,
      occurredAt: completionLog.completedAt,
      completionStatus: input.completionStatus ?? 'completed',
      notes: input.notes ?? null,
    });
    lifecycleFallbackMessage = lifecycle.fallbackMessage;
  } catch (error) {
    lifecycleFallbackMessage = error instanceof Error
      ? error.message
      : 'Generated workout completion lifecycle was not persisted.';
    lifecycle = {
      lifecycle: localGeneratedWorkoutLifecycle(userId, input.generatedWorkoutId, 'completed', {
        occurredAt: completionLog.completedAt,
        completionStatus: input.completionStatus ?? 'completed',
        notes: input.notes ?? null,
      }),
      persisted: false,
      fallbackMessage: lifecycleFallbackMessage,
    };
  }
  const result: GeneratedWorkoutSessionCompletionResult = {
    ...completion,
    feedbackId,
  };
  if (lifecycle) result.lifecycle = lifecycle;
  if (lifecycleFallbackMessage) result.lifecycleFallbackMessage = lifecycleFallbackMessage;
  return result;
}

export async function getNextProgression(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: WorkoutProgrammingServiceOptions & {
    workout?: GeneratedWorkout;
    recentWorkoutCompletions?: WorkoutCompletionLog[];
    recentProgressionDecisions?: ProgressionDecision[];
    readinessTrend?: WorkoutReadinessBand[];
    workoutCompletionId?: string | null;
  },
): Promise<ProgressionDecision> {
  const { recommendNextProgression } = await import('./personalizationEngine.ts');
  const loadedRecentCompletions = options?.recentWorkoutCompletions
    ?? (await loadRecentCompletions(userId, { ...options, limit: 5 })).filter((recent) => {
      if (options?.workoutCompletionId && recent.id === options.workoutCompletionId) return false;
      return recent.completedAt !== completion.completedAt || recent.workoutId !== completion.workoutId;
    });
  const loadedProgressionDecisions = options?.recentProgressionDecisions
    ?? await loadRecentProgressionDecisionsForUser(userId, { ...options, limit: 5 });
  const loadedReadinessTrend = options?.readinessTrend
    ?? (await loadRecentReadiness(userId, { ...options, limit: 5 })).map((log) => log.readinessBand);
  const input: Parameters<typeof recommendNextProgression>[0] = {
    completionLog: completion,
  };
  if (options?.workout) input.workout = options.workout;
  const workoutTypeId = completion.workoutTypeId ?? options?.workout?.workoutTypeId;
  const goalId = completion.goalId ?? options?.workout?.goalId;
  if (workoutTypeId) input.workoutTypeId = workoutTypeId;
  if (goalId) input.goalId = goalId;
  if (completion.prescriptionTemplateId) input.prescriptionTemplateId = completion.prescriptionTemplateId;
  if (loadedRecentCompletions.length > 0) input.recentWorkoutCompletions = loadedRecentCompletions;
  if (loadedProgressionDecisions.length > 0) input.recentProgressionDecisions = loadedProgressionDecisions;
  if (loadedReadinessTrend.length > 0) input.readinessTrend = loadedReadinessTrend;
  if (completion.readinessBefore) input.readinessBefore = completion.readinessBefore;
  if (completion.readinessAfter) input.readinessAfter = completion.readinessAfter;
  return recommendNextProgression(input);
}

export async function loadGeneratedWorkoutCompletionSurfacesForUser(
  userId: string,
  options?: WorkoutProgrammingServiceOptions & { limit?: number },
): Promise<GeneratedWorkoutCompletionSurface[]> {
  const completions = (await loadRecentCompletions(userId, {
    ...options,
    limit: options?.limit ?? 20,
  })).filter(isGeneratedWorkoutCompletion);

  const surfaces: GeneratedWorkoutCompletionSurface[] = [];
  for (const completion of completions) {
    const decisions = completion.id
      ? await loadProgressionDecisionsForCompletion(completion.id, options)
      : [];
    surfaces.push({
      completion,
      progressionDecision: decisions[0] ?? null,
    });
  }
  return surfaces;
}

export async function generateWeeklyProgramForUser(
  userId: string,
  request: WorkoutProgrammingProgramRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  const profile = await loadUserWorkoutProfile(userId, options);
  const input = mergeProfileRequest(userId, profile, request);
  const program = generateWeeklyWorkoutProgram({
    ...request,
    ...input,
  });
  if (!options?.persistGeneratedProgram) return program;
  const userProgramId = await persistGeneratedProgram(userId, program, options);
  if (!userProgramId) return program;
  const fallbackProgram: GeneratedProgram = {
    ...program,
    persistenceId: userProgramId,
  };
  try {
    return await persistLoadGeneratedProgram(userId, userProgramId, options) ?? fallbackProgram;
  } catch (error) {
    if (error instanceof NotFoundError) return fallbackProgram;
    throw error;
  }
}

export async function saveGeneratedProgramForUser(
  userId: string,
  program: GeneratedProgram,
  options?: WorkoutProgrammingServiceOptions,
): Promise<string | null> {
  return persistGeneratedProgram(userId, program, options);
}

export async function loadGeneratedProgramForUser(
  userId: string,
  userProgramId: string,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram | null> {
  return persistLoadGeneratedProgram(userId, userProgramId, options);
}

export async function loadGeneratedWorkoutForUser(
  userId: string,
  generatedWorkoutId: string,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkout | null> {
  return persistLoadGeneratedWorkout(userId, generatedWorkoutId, options);
}

export async function listGeneratedProgramsForUser(
  userId: string,
  options?: WorkoutProgrammingServiceOptions & { limit?: number; status?: GeneratedProgram['status'] },
): Promise<GeneratedProgram[]> {
  return persistListUserPrograms(userId, options);
}

export async function updateGeneratedProgramSessionForUser(
  userId: string,
  userProgramId: string,
  sessionId: string,
  update: ProgramSessionUpdate,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistUpdateProgramSession(userId, userProgramId, sessionId, update, options);
}

export async function attachGeneratedWorkoutToProgramSessionForUser(
  userId: string,
  userProgramId: string,
  sessionId: string,
  workout: GeneratedWorkout,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistAttachGeneratedWorkoutToProgramSession(userId, userProgramId, sessionId, workout, options);
}

export async function markGeneratedProgramSessionCompletedForUser(
  userId: string,
  userProgramId: string,
  sessionId: string,
  completion: { completedAt?: string; workoutCompletionId?: string | null } = {},
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistMarkProgramSessionCompleted(userId, userProgramId, sessionId, completion, options);
}

export async function archiveGeneratedProgramForUser(
  userId: string,
  userProgramId: string,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistArchiveProgram(userId, userProgramId, options);
}

export async function generateWeeklyProgramFromPerformanceState(
  request: WorkoutProgrammingPerformanceStateRequest & Partial<WorkoutProgrammingProgramRequest>,
): Promise<GeneratedProgram> {
  const mapped = buildPersonalizedWorkoutInputFromPerformanceState(request);
  const programRequest: Parameters<typeof generateWeeklyWorkoutProgram>[0] = {
    ...mapped.input,
    goalId: mapped.input.goalId,
  };
  if (request.secondaryGoalIds) programRequest.secondaryGoalIds = request.secondaryGoalIds;
  if (request.weekCount != null) programRequest.weekCount = request.weekCount;
  if (request.desiredProgramLengthWeeks != null) programRequest.desiredProgramLengthWeeks = request.desiredProgramLengthWeeks;
  if (request.sessionsPerWeek != null) programRequest.sessionsPerWeek = request.sessionsPerWeek;
  if (request.availableDays) programRequest.availableDays = request.availableDays;
  if (request.deloadStrategy) programRequest.deloadStrategy = request.deloadStrategy;
  if (mapped.input.protectedWorkouts) {
    programRequest.protectedWorkouts = mapped.input.protectedWorkouts;
  } else if (request.protectedWorkouts) {
    programRequest.protectedWorkouts = request.protectedWorkouts;
  }
  if (request.readinessTrend) programRequest.readinessTrend = request.readinessTrend;
  return generateWeeklyWorkoutProgram(programRequest);
}

export function getWorkoutDescription(
  workout: GeneratedWorkout,
  toneVariant?: DescriptionToneVariant,
  reviewOptions?: Pick<WorkoutProgrammingServiceOptions, 'contentReviewMode' | 'allowDraftContent'>,
) {
  const gate = filterIntelligenceForContentReview(
    workoutIntelligenceCatalog,
    contentReviewOptions(reviewOptions, reviewOptions?.contentReviewMode ?? 'production'),
  );
  const descriptionOptions = {
    templates: gate.intelligence.descriptionTemplates,
  };
  return generateWorkoutDescription(workout, toneVariant ? { ...descriptionOptions, toneVariant } : descriptionOptions);
}

export const workoutProgrammingService = {
  getWorkoutProgrammingCatalog,
  generateWorkoutForUser,
  generateGeneratedWorkoutSessionForUser,
  markGeneratedWorkoutInspected,
  startGeneratedWorkoutSession,
  pauseGeneratedWorkoutSession,
  resumeGeneratedWorkoutSession,
  abandonGeneratedWorkoutSession,
  stopGeneratedWorkoutSession,
  completeGeneratedWorkoutSessionLifecycle,
  loadActiveGeneratedWorkoutSession,
  listActiveGeneratedWorkoutSessions,
  generatePreviewWorkout,
  generatePreviewWorkoutFromPerformanceState,
  generateWorkoutForUserFromPerformanceState,
  validateWorkout,
  substituteExercise,
  logWorkoutCompletion,
  completeGeneratedWorkoutSession,
  getNextProgression,
  loadGeneratedWorkoutCompletionSurfacesForUser,
  generateWeeklyProgramForUser,
  loadGeneratedWorkoutForUser,
  saveGeneratedProgramForUser,
  loadGeneratedProgramForUser,
  listGeneratedProgramsForUser,
  updateGeneratedProgramSessionForUser,
  attachGeneratedWorkoutToProgramSessionForUser,
  markGeneratedProgramSessionCompletedForUser,
  archiveGeneratedProgramForUser,
  generateWeeklyProgramFromPerformanceState,
  getWorkoutDescription,
};
