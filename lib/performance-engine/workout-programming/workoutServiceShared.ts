import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import type {
  ContentReviewMode,
  PreparedWorkoutProgrammingContent,
} from './contentReview.ts';
import {
  DatabaseUnavailableError,
  loadUserWorkoutProfile,
  NotFoundError,
  saveRecommendationEvent,
  type GeneratedWorkoutSessionLifecycleOptions,
  type WorkoutProgrammingPersistenceOptions,
} from './persistenceService.ts';
import { validateWorkoutDomain } from './validationEngine.ts';
import { generateWorkoutDescription } from './workoutDescriptionService.ts';
import type {
  GeneratedWorkout,
  GeneratedWorkoutRecommendationEventKind,
  GeneratedWorkoutSessionLifecycle,
  GeneratedWorkoutSessionLifecycleStatus,
  PersonalizedWorkoutInput,
  RecommendationEventDecisionTrace,
  WorkoutProgrammingCatalog,
} from './types.ts';
import type {
  GeneratedWorkoutLifecycleResult,
  GeneratedWorkoutSessionCompletionInput,
  WorkoutProgrammingServiceOptions,
  WorkoutProgrammingUserRequest,
} from './workoutProgrammingServiceTypes.ts';

export function mergeProfileRequest(
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

export function attachValidatedDescription(
  workout: GeneratedWorkout,
  catalog: WorkoutProgrammingCatalog,
  toneVariant?: PersonalizedWorkoutInput['preferredToneVariant'],
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

export function contentReviewOptions(
  options: { contentReviewMode?: ContentReviewMode; allowDraftContent?: boolean } | undefined,
  defaultMode: ContentReviewMode,
) {
  return {
    mode: options?.contentReviewMode ?? defaultMode,
    allowDraftContent: options?.allowDraftContent ?? defaultMode !== 'production',
  };
}

const workoutProgrammingAppContextVersion = 'workout-programming-service-v1';

function telemetryEnabled(options?: WorkoutProgrammingServiceOptions): boolean {
  return options?.telemetryEnabled !== false;
}

function withoutUndefined(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function workoutDecisionTrace(workout?: GeneratedWorkout): RecommendationEventDecisionTrace {
  return [
    ...(workout?.decisionTrace ?? []),
    ...(workout?.validation?.decisionTrace ?? []),
  ];
}

export async function emitRecommendationTelemetry(
  userId: string,
  eventKind: GeneratedWorkoutRecommendationEventKind,
  input: {
    generatedWorkoutId?: string | null | undefined;
    workout?: GeneratedWorkout | undefined;
    decisionTrace?: RecommendationEventDecisionTrace | undefined;
    payload?: Record<string, unknown> | undefined;
    timestamp?: string | undefined;
  },
  options?: WorkoutProgrammingServiceOptions,
): Promise<void> {
  if (!telemetryEnabled(options)) return;
  try {
    const event = {
      generatedWorkoutId: input.generatedWorkoutId ?? null,
      eventKind,
      decisionTrace: input.decisionTrace ?? workoutDecisionTrace(input.workout),
      payload: withoutUndefined(input.payload ?? {}),
      appContextVersion: options?.appContextVersion ?? workoutProgrammingAppContextVersion,
      engineVersion: options?.engineVersion ?? input.workout?.schemaVersion ?? 'generated-workout-v1',
      contentVersion: options?.contentVersion ?? null,
    };
    if (input.timestamp) {
      await saveRecommendationEvent(userId, { ...event, timestamp: input.timestamp }, options);
    } else {
      await saveRecommendationEvent(userId, event, options);
    }
  } catch {
    // Recommendation telemetry is observability only; never couple it to the user flow.
  }
}

export async function emitGeneratedWorkoutTelemetry(
  userId: string,
  workout: GeneratedWorkout,
  generatedWorkoutId: string | null,
  request: WorkoutProgrammingUserRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<void> {
  const payload = {
    workoutTypeId: workout.workoutTypeId,
    goalId: workout.goalId,
    templateId: workout.templateId,
    requestedDurationMinutes: workout.requestedDurationMinutes,
    estimatedDurationMinutes: workout.estimatedDurationMinutes,
    blocked: workout.blocked === true,
    validationWarningCount: workout.validationWarnings?.length ?? 0,
    validationErrorCount: workout.validationErrors?.length ?? 0,
    contentReviewMode: options?.contentReviewMode ?? 'production',
    exerciseCount: workout.blocks.flatMap((block) => block.exercises).length,
  };
  await emitRecommendationTelemetry(userId, 'workout_generated', {
    generatedWorkoutId,
    workout,
    payload,
  }, options);
  if (request.regeneratedFromGeneratedWorkoutId) {
    await emitRecommendationTelemetry(userId, 'workout_regenerated', {
      generatedWorkoutId,
      workout,
      payload: {
        ...payload,
        regeneratedFromGeneratedWorkoutId: request.regeneratedFromGeneratedWorkoutId,
      },
    }, options);
  }
  if (workout.blocked) {
    await emitRecommendationTelemetry(userId, 'workout_blocked_by_safety', {
      generatedWorkoutId,
      workout,
      payload: {
        ...payload,
        safetyFlags: workout.safetyFlags,
        validationWarnings: workout.validationWarnings ?? [],
      },
    }, options);
  }
  if ((workout.validationWarnings?.length ?? 0) > 0) {
    await emitRecommendationTelemetry(userId, 'validation_warning_shown', {
      generatedWorkoutId,
      workout,
      payload: {
        ...payload,
        validationWarnings: workout.validationWarnings ?? [],
      },
    }, options);
  }
}

export async function emitLifecycleTelemetry(
  userId: string,
  generatedWorkoutId: string | null | undefined,
  eventKind: GeneratedWorkoutRecommendationEventKind,
  result: GeneratedWorkoutLifecycleResult,
  options?: WorkoutProgrammingServiceOptions & GeneratedWorkoutSessionLifecycleOptions,
): Promise<void> {
  await emitRecommendationTelemetry(userId, eventKind, {
    generatedWorkoutId,
    timestamp: result.lifecycle.lastActiveAt,
    payload: {
      status: result.lifecycle.status,
      persisted: result.persisted,
      completionStatus: result.lifecycle.completionStatus ?? null,
      activeBlockId: result.lifecycle.activeBlockId ?? null,
      activeExerciseId: result.lifecycle.activeExerciseId ?? null,
      fallbackMessage: result.fallbackMessage ?? null,
    },
  }, options);
  if (!result.persisted) {
    await emitRecommendationTelemetry(userId, 'persistence_fallback_used', {
      generatedWorkoutId,
      timestamp: result.lifecycle.lastActiveAt,
      payload: {
        operation: `lifecycle:${result.lifecycle.status}`,
        fallbackMessage: result.fallbackMessage ?? 'Generated workout lifecycle used local fallback.',
      },
    }, options);
  }
}

export function sessionDifficultyEventKind(
  input: GeneratedWorkoutSessionCompletionInput,
): GeneratedWorkoutRecommendationEventKind {
  const tags = new Set((input.feedbackTags ?? []).map((tag) => tag.toLowerCase()));
  if (tags.has('too_easy') || tags.has('easy')) return 'session_too_easy';
  if (tags.has('too_hard') || tags.has('hard')) return 'session_too_hard';
  if (tags.has('right') || tags.has('just_right') || tags.has('good_fit')) return 'session_right';
  if (input.sessionRpe <= 4) return 'session_too_easy';
  if (input.sessionRpe >= 8) return 'session_too_hard';
  return 'session_right';
}

export function localGeneratedWorkoutLifecycle(
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

function hasLifecyclePersistenceTarget(
  generatedWorkoutId: string | null | undefined,
  options?: WorkoutProgrammingPersistenceOptions,
): generatedWorkoutId is string {
  return Boolean(generatedWorkoutId && (options?.client || options?.useSupabase));
}

export async function runLifecycleMutationWithFallback(
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

export function applyContentReviewDiagnostics(
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

export function attachAppStateDecisionTrace(
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
