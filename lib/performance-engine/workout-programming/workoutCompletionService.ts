import type { GeneratedWorkoutCompletionSurface } from './historyAnalyticsAdapter.ts';
import { isGeneratedWorkoutCompletion } from './historyAnalyticsAdapter.ts';
import {
  loadProgressionDecisionsForCompletion,
  loadRecentCompletions,
  logWorkoutCompletionWithExerciseResults as persistWorkoutCompletion,
  saveProgressionDecision,
  saveRecommendationFeedback,
  upsertExercisePreferences,
} from './persistenceService.ts';
import type { WorkoutCompletionLog } from './types.ts';
import {
  completeGeneratedWorkoutSessionLifecycle,
} from './workoutGenerationService.ts';
import {
  emitRecommendationTelemetry,
  localGeneratedWorkoutLifecycle,
  sessionDifficultyEventKind,
} from './workoutServiceShared.ts';
import type {
  GeneratedWorkoutLifecycleResult,
  GeneratedWorkoutSessionCompletionInput,
  GeneratedWorkoutSessionCompletionResult,
  LogWorkoutCompletionOptions,
  WorkoutProgrammingCompletionResult,
  WorkoutProgrammingServiceOptions,
} from './workoutProgrammingServiceTypes.ts';
import { getNextProgression } from './workoutProgressionService.ts';

export async function logWorkoutCompletion(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: LogWorkoutCompletionOptions,
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
  const generatedWorkoutId = options?.generatedWorkoutId ?? completion.generatedWorkoutId ?? null;
  if (generatedWorkoutId || completion.source === 'generated_workout') {
    await emitRecommendationTelemetry(userId, 'progression_decision_created', {
      generatedWorkoutId,
      workout: options?.workout,
      timestamp: completion.completedAt,
      payload: {
        workoutCompletionId,
        progressionDecisionId,
        direction: progressionDecision.direction,
        reason: progressionDecision.reason,
        nextAdjustment: progressionDecision.nextAdjustment,
        affectedExerciseIds: progressionDecision.affectedExerciseIds ?? [],
        safetyFlags: progressionDecision.safetyFlags,
      },
    }, options);
  }
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
  await emitRecommendationTelemetry(userId, 'workout_completed', {
    generatedWorkoutId: input.generatedWorkoutId ?? null,
    workout: input.workout,
    timestamp: completionLog.completedAt,
    payload: {
      workoutCompletionId: completion.workoutCompletionId,
      progressionDecisionId: completion.progressionDecisionId,
      completionStatus: input.completionStatus ?? 'completed',
      sessionRpe: input.sessionRpe,
      painScoreBefore: input.painScoreBefore ?? null,
      painScoreAfter: input.painScoreAfter ?? null,
      rating: input.rating ?? null,
      feedbackTags: input.feedbackTags ?? [],
      completedExerciseCount: completionLog.exerciseResults.filter((exercise) => exercise.completedAsPrescribed).length,
      totalExerciseCount: completionLog.exerciseResults.length,
      substitutionsUsed: input.substitutionsUsed ?? [],
    },
  }, options);
  if ((input.substitutionsUsed?.length ?? 0) > 0) {
    await emitRecommendationTelemetry(userId, 'exercise_substituted', {
      generatedWorkoutId: input.generatedWorkoutId ?? null,
      workout: input.workout,
      timestamp: completionLog.completedAt,
      payload: {
        substitutionsUsed: input.substitutionsUsed ?? [],
        source: 'completion_log',
      },
    }, options);
  }
  if ((input.likedExerciseIds?.length ?? 0) > 0) {
    await emitRecommendationTelemetry(userId, 'exercise_liked', {
      generatedWorkoutId: input.generatedWorkoutId ?? null,
      workout: input.workout,
      timestamp: completionLog.completedAt,
      payload: {
        exerciseIds: input.likedExerciseIds ?? [],
      },
    }, options);
  }
  if ((input.dislikedExerciseIds?.length ?? 0) > 0) {
    await emitRecommendationTelemetry(userId, 'exercise_disliked', {
      generatedWorkoutId: input.generatedWorkoutId ?? null,
      workout: input.workout,
      timestamp: completionLog.completedAt,
      payload: {
        exerciseIds: input.dislikedExerciseIds ?? [],
      },
    }, options);
  }
  if (typeof input.painScoreBefore === 'number' && typeof input.painScoreAfter === 'number' && input.painScoreAfter > input.painScoreBefore) {
    await emitRecommendationTelemetry(userId, 'pain_increased', {
      generatedWorkoutId: input.generatedWorkoutId ?? null,
      workout: input.workout,
      timestamp: completionLog.completedAt,
      payload: {
        painScoreBefore: input.painScoreBefore,
        painScoreAfter: input.painScoreAfter,
        delta: input.painScoreAfter - input.painScoreBefore,
      },
    }, options);
  }
  await emitRecommendationTelemetry(userId, sessionDifficultyEventKind(input), {
    generatedWorkoutId: input.generatedWorkoutId ?? null,
    workout: input.workout,
    timestamp: completionLog.completedAt,
    payload: {
      sessionRpe: input.sessionRpe,
      feedbackTags: input.feedbackTags ?? [],
      rating: input.rating ?? null,
    },
  }, options);
  return result;
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
