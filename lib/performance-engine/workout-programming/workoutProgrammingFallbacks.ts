import type { ContentReviewMode } from './contentReview.ts';
import {
  DatabaseUnavailableError,
  UnauthorizedError,
  ValidationError,
} from './persistenceService.ts';
import { GENERATED_WORKOUT_SAFETY_COPY } from './workoutSafetyCopy.ts';

export const LOCAL_GENERATED_WORKOUT_BETA_USER_ID = 'local-generated-workout-beta-user';

export const GENERATED_WORKOUT_FALLBACK_COPY = {
  generatedLocallyPersistenceUnavailable: GENERATED_WORKOUT_SAFETY_COPY.persistence.generatedLocallyPersistenceUnavailable,
  completedLocallyPersistenceUnavailable: GENERATED_WORKOUT_SAFETY_COPY.persistence.completedLocallyPersistenceUnavailable,
  sessionBlockedBySafetyReview: GENERATED_WORKOUT_SAFETY_COPY.user.sessionBlockedBySafetyReview,
  noSafeGeneratedWorkoutFound: GENERATED_WORKOUT_SAFETY_COPY.persistence.noSafeGeneratedWorkoutFound,
  generatedSessionLocal: GENERATED_WORKOUT_SAFETY_COPY.persistence.generatedSessionLocal,
  sessionStartedLocalPersistenceUnavailable: GENERATED_WORKOUT_SAFETY_COPY.persistence.sessionStartedLocalPersistenceUnavailable,
  sessionPausedLocalPersistenceUnavailable: GENERATED_WORKOUT_SAFETY_COPY.persistence.sessionPausedLocalPersistenceUnavailable,
  sessionResumedLocalPersistenceUnavailable: GENERATED_WORKOUT_SAFETY_COPY.persistence.sessionResumedLocalPersistenceUnavailable,
  sessionAbandonedLocalPersistenceUnavailable: GENERATED_WORKOUT_SAFETY_COPY.persistence.sessionAbandonedLocalPersistenceUnavailable,
} as const;

export type GeneratedWorkoutContentReviewSurface =
  | 'beta-persisted'
  | 'beta-local-fallback'
  | 'dev-preview';

export interface GeneratedWorkoutContentReviewOptions {
  contentReviewMode: ContentReviewMode;
  allowDraftContent: boolean;
}

export interface GeneratedWorkoutFeatureFlagInput {
  betaFlag?: string;
  previewFlag?: string;
  dev?: boolean;
}

export function resolveGeneratedWorkoutFeatureFlags({
  betaFlag,
  previewFlag,
  dev = false,
}: GeneratedWorkoutFeatureFlagInput) {
  const betaEnabled = betaFlag === '1';
  return {
    betaEnabled,
    previewEnabled: !betaEnabled && dev && previewFlag === '1',
  };
}

export function resolveGeneratedWorkoutContentReviewOptions(
  surface: GeneratedWorkoutContentReviewSurface,
): GeneratedWorkoutContentReviewOptions {
  if (surface === 'dev-preview') {
    return {
      contentReviewMode: 'preview',
      allowDraftContent: true,
    };
  }

  return {
    contentReviewMode: 'production',
    allowDraftContent: false,
  };
}

function messageFromUnknown(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }
  return null;
}

function isSafetyOrValidationMessage(message: string): boolean {
  return /safety|unsafe|blocked|red flag|validation|contraindication|no safe generated workout/i.test(message);
}

export function normalizeGeneratedWorkoutError(error: unknown, fallback: string): string {
  const message = messageFromUnknown(error);
  if (!message) return fallback;
  if (error instanceof ValidationError || isSafetyOrValidationMessage(message)) return message;
  if (error instanceof UnauthorizedError) return 'You do not have access to this generated workout.';
  return fallback;
}

export function isGeneratedWorkoutPersistenceUnavailable(error: unknown): boolean {
  if (error instanceof DatabaseUnavailableError) return true;
  const message = messageFromUnknown(error) ?? '';
  if (isSafetyOrValidationMessage(message)) return false;
  return /database unavailable|persistence unavailable|network|fetch|timeout|rpc|supabase|unavailable|ECONN|ENOTFOUND/i.test(message);
}

export function canUseLocalGeneratedWorkoutFallback(error: unknown): boolean {
  return isGeneratedWorkoutPersistenceUnavailable(error);
}

export function canUseLocalCompletionFallback({
  userId,
  error,
}: {
  userId: string | null | undefined;
  error: unknown;
}): boolean {
  return Boolean(userId) && isGeneratedWorkoutPersistenceUnavailable(error);
}

export function generatedWorkoutLifecycleOptionsForUser(
  userId: string | null | undefined,
  occurredAt: string,
) {
  return userId
    ? { useSupabase: true as const, occurredAt }
    : { occurredAt };
}

export function generatedWorkoutCompletionOptionsForUser(
  userId: string | null | undefined,
) {
  return userId
    ? { useSupabase: true as const }
    : { persistGeneratedWorkout: false as const };
}

export function generatedWorkoutFlowUserId(userId: string | null | undefined): string {
  return userId ?? LOCAL_GENERATED_WORKOUT_BETA_USER_ID;
}

export function formatGeneratedWorkoutPersistenceFallbackMessage(
  copy: keyof typeof GENERATED_WORKOUT_FALLBACK_COPY,
  error: unknown,
  fallbackDetail: string,
): string {
  const detail = normalizeGeneratedWorkoutError(error, fallbackDetail);
  return detail === fallbackDetail
    ? GENERATED_WORKOUT_FALLBACK_COPY[copy]
    : `${GENERATED_WORKOUT_FALLBACK_COPY[copy]} ${detail}`;
}

export function formatGeneratedWorkoutLocalCompletionMessage(fallbackMessage: string | null | undefined): string | null {
  return fallbackMessage ? `${GENERATED_WORKOUT_SAFETY_COPY.persistence.completedLocallyPrefix} ${fallbackMessage}` : null;
}
