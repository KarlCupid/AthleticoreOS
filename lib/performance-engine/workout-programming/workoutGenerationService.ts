import {
  buildPersonalizedWorkoutInputFromPerformanceState,
} from './appStateAdapter.ts';
import { prepareWorkoutProgrammingContentForMode } from './contentReview.ts';
import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import {
  abandonGeneratedWorkoutSession as persistAbandonGeneratedWorkoutSession,
  completeGeneratedWorkoutSessionLifecycle as persistCompleteGeneratedWorkoutSessionLifecycle,
  listActiveGeneratedWorkoutSessions as persistListActiveGeneratedWorkoutSessions,
  loadActiveGeneratedWorkoutSession as persistLoadActiveGeneratedWorkoutSession,
  loadGeneratedWorkout as persistLoadGeneratedWorkout,
  loadUserWorkoutProfile,
  loadWorkoutProgrammingCatalog,
  markGeneratedWorkoutInspected as persistMarkGeneratedWorkoutInspected,
  pauseGeneratedWorkoutSession as persistPauseGeneratedWorkoutSession,
  resumeGeneratedWorkoutSession as persistResumeGeneratedWorkoutSession,
  saveGeneratedWorkoutWithExercises,
  startGeneratedWorkoutSession as persistStartGeneratedWorkoutSession,
  stopGeneratedWorkoutSession as persistStopGeneratedWorkoutSession,
  type ActiveGeneratedWorkoutSessionListOptions,
  type GeneratedWorkoutSessionLifecycleOptions,
  type WorkoutProgrammingPersistenceOptions,
} from './persistenceService.ts';
import { validateWorkoutDomain } from './validationEngine.ts';
import type {
  GeneratedWorkout,
  GeneratedWorkoutSessionLifecycle,
  PersonalizedWorkoutInput,
  WorkoutProgrammingCatalog,
  WorkoutValidationResult,
} from './types.ts';
import {
  applyContentReviewDiagnostics,
  attachAppStateDecisionTrace,
  attachValidatedDescription,
  contentReviewOptions,
  emitGeneratedWorkoutTelemetry,
  emitLifecycleTelemetry,
  mergeProfileRequest,
  runLifecycleMutationWithFallback,
} from './workoutServiceShared.ts';
import type {
  GeneratedWorkoutLifecycleResult,
  GeneratedWorkoutSessionResult,
  WorkoutProgrammingPerformanceStateRequest,
  WorkoutProgrammingPreviewRequest,
  WorkoutProgrammingServiceOptions,
  WorkoutProgrammingUserRequest,
} from './workoutProgrammingServiceTypes.ts';

export async function buildWorkoutForUser(
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
  let generatedWorkoutId: string | null = null;
  if (options?.persistGeneratedWorkout !== false && !enriched.blocked) {
    generatedWorkoutId = await saveGeneratedWorkoutWithExercises(userId, enriched, options);
  }
  await emitGeneratedWorkoutTelemetry(userId, enriched, generatedWorkoutId, request, options);
  return enriched;
}

export async function markGeneratedWorkoutInspected(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  const result = await runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'inspected',
    (id) => persistMarkGeneratedWorkoutInspected(userId, id, options),
    options,
  );
  await emitLifecycleTelemetry(userId, generatedWorkoutId, 'workout_inspected', result, options);
  return result;
}

export async function startGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  const result = await runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'started',
    (id) => persistStartGeneratedWorkoutSession(userId, id, options),
    options,
  );
  await emitLifecycleTelemetry(userId, generatedWorkoutId, 'workout_started', result, options);
  return result;
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
  const result = await runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'abandoned',
    (id) => persistAbandonGeneratedWorkoutSession(userId, id, options),
    { ...options, completionStatus: options?.completionStatus ?? 'abandoned' },
  );
  await emitLifecycleTelemetry(userId, generatedWorkoutId, 'workout_abandoned', result, options);
  return result;
}

export async function stopGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  const result = await runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'stopped',
    (id) => persistStopGeneratedWorkoutSession(userId, id, options),
    { ...options, completionStatus: options?.completionStatus ?? 'stopped' },
  );
  await emitLifecycleTelemetry(userId, generatedWorkoutId, 'workout_stopped', result, options);
  return result;
}

export async function completeGeneratedWorkoutSessionLifecycle(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutLifecycleResult> {
  const result = await runLifecycleMutationWithFallback(
    userId,
    generatedWorkoutId,
    'completed',
    (id) => persistCompleteGeneratedWorkoutSessionLifecycle(userId, id, options),
    { ...options, completionStatus: options?.completionStatus ?? 'completed' },
  );
  await emitLifecycleTelemetry(userId, generatedWorkoutId, 'workout_completed', result, options);
  return result;
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
  const shouldPersist = options?.persistGeneratedWorkout !== false && !workout.blocked;
  const generatedWorkoutId = shouldPersist
    ? await saveGeneratedWorkoutWithExercises(userId, workout, options)
    : null;
  const result: GeneratedWorkoutSessionResult = {
    workout,
    generatedWorkoutId,
    persisted: Boolean(generatedWorkoutId),
  };
  await emitGeneratedWorkoutTelemetry(userId, workout, generatedWorkoutId, request, options);
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
  const enriched = applyContentReviewDiagnostics(
    attachValidatedDescription(workout, prepared.catalog, request.preferredToneVariant, prepared.intelligence),
    prepared,
    options?.contentReviewMode ?? 'preview',
  );
  if (request.userId) {
    await emitGeneratedWorkoutTelemetry(request.userId, enriched, null, request, {
      ...options,
      contentReviewMode: options?.contentReviewMode ?? 'preview',
    });
  }
  return enriched;
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

export async function loadGeneratedWorkoutForUser(
  userId: string,
  generatedWorkoutId: string,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedWorkout | null> {
  return persistLoadGeneratedWorkout(userId, generatedWorkoutId, options);
}
