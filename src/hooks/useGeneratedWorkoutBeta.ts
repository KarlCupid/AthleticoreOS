import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GeneratedWorkoutBetaCompletionDraft,
  GeneratedWorkoutBetaConfig,
  GeneratedWorkoutBetaStage,
} from '../components/workout/GeneratedWorkoutBetaSessionCard';
import {
  GENERATED_WORKOUT_FALLBACK_COPY,
  canUseLocalCompletionFallback,
  canUseLocalGeneratedWorkoutFallback,
  formatGeneratedWorkoutPersistenceFallbackMessage,
  formatGeneratedWorkoutLocalCompletionMessage,
  generatedWorkoutCompletionOptionsForUser,
  generatedWorkoutFlowUserId,
  generatedWorkoutLifecycleOptionsForUser,
  normalizeGeneratedWorkoutError,
  resolveGeneratedWorkoutContentReviewOptions,
  resolveGeneratedWorkoutFeatureFlags,
  workoutProgrammingService,
  type GeneratedWorkout,
  type GeneratedWorkoutSessionLifecycleStatus,
  type ProgressionDecision,
  type WorkoutReadinessBand,
} from '../../lib/performance-engine/workout-programming';

type ReloadWorkoutData = (userId?: string) => void | Promise<void>;

interface UseGeneratedWorkoutBetaOptions {
  userId: string | null | undefined;
  currentLevel: string | null | undefined;
  historyLoaded: boolean;
  analyticsLoaded: boolean;
  loadHistoryData: ReloadWorkoutData;
  loadAnalyticsData: ReloadWorkoutData;
}

export interface GeneratedWorkoutBetaController {
  userAuthenticated: boolean;
  stage: GeneratedWorkoutBetaStage;
  workout: GeneratedWorkout | null;
  generatedWorkoutId: string | null;
  persisted: boolean;
  startedAt: string | null;
  lifecycleStatus: GeneratedWorkoutSessionLifecycleStatus | null;
  lifecycleMessage: string | null;
  loading: boolean;
  completing: boolean;
  error: string | null;
  progressionDecision: ProgressionDecision | null;
  defaultReadinessBand: WorkoutReadinessBand;
  generate: (config: GeneratedWorkoutBetaConfig) => Promise<void>;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  abandon: () => Promise<void>;
  complete: (draft: GeneratedWorkoutBetaCompletionDraft) => Promise<void>;
  reset: () => void;
}

export interface UseGeneratedWorkoutBetaResult {
  betaEnabled: boolean;
  beta: GeneratedWorkoutBetaController;
}

function readinessBandFromLevel(level: string | null | undefined): WorkoutReadinessBand {
  const normalized = level?.toLowerCase() ?? '';
  if (normalized.includes('prime') || normalized.includes('green') || normalized.includes('ready')) return 'green';
  if (normalized.includes('steady') || normalized.includes('yellow')) return 'yellow';
  if (normalized.includes('caution') || normalized.includes('orange')) return 'orange';
  if (normalized.includes('red') || normalized.includes('depleted')) return 'red';
  return 'unknown';
}

function betaStageFromLifecycleStatus(status: GeneratedWorkoutSessionLifecycleStatus): GeneratedWorkoutBetaStage {
  if (status === 'completed') return 'completed';
  if (status === 'started' || status === 'paused' || status === 'resumed') return 'started';
  return 'inspect';
}

function resetBetaState(setters: {
  setWorkout: (workout: GeneratedWorkout | null) => void;
  setGeneratedWorkoutId: (generatedWorkoutId: string | null) => void;
  setPersisted: (persisted: boolean) => void;
  setStage: (stage: GeneratedWorkoutBetaStage) => void;
  setStartedAt: (startedAt: string | null) => void;
  setLifecycleStatus: (status: GeneratedWorkoutSessionLifecycleStatus | null) => void;
  setLifecycleMessage: (message: string | null) => void;
  setProgressionDecision: (decision: ProgressionDecision | null) => void;
  setError: (error: string | null) => void;
}) {
  setters.setWorkout(null);
  setters.setGeneratedWorkoutId(null);
  setters.setPersisted(false);
  setters.setStage('configure');
  setters.setStartedAt(null);
  setters.setLifecycleStatus(null);
  setters.setLifecycleMessage(null);
  setters.setProgressionDecision(null);
  setters.setError(null);
}

export function useGeneratedWorkoutBeta({
  userId,
  currentLevel,
  historyLoaded,
  analyticsLoaded,
  loadHistoryData,
  loadAnalyticsData,
}: UseGeneratedWorkoutBetaOptions): UseGeneratedWorkoutBetaResult {
  const { betaEnabled } = resolveGeneratedWorkoutFeatureFlags({
    betaFlag: process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA,
  });
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [generatedWorkoutId, setGeneratedWorkoutId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [stage, setStage] = useState<GeneratedWorkoutBetaStage>('configure');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [lifecycleStatus, setLifecycleStatus] = useState<GeneratedWorkoutSessionLifecycleStatus | null>(null);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressionDecision, setProgressionDecision] = useState<ProgressionDecision | null>(null);

  const defaultReadinessBand = useMemo(() => readinessBandFromLevel(currentLevel), [currentLevel]);

  useEffect(() => {
    if (!betaEnabled || !userId || workout || stage !== 'configure') return;
    let cancelled = false;
    async function loadActiveGeneratedSession() {
      try {
        const lifecycle = await workoutProgrammingService.loadActiveGeneratedWorkoutSession(userId!, { useSupabase: true });
        if (!lifecycle || cancelled) return;
        const loadedWorkout = await workoutProgrammingService.loadGeneratedWorkoutForUser(userId!, lifecycle.generatedWorkoutId, { useSupabase: true });
        if (!loadedWorkout || cancelled) return;
        setWorkout(loadedWorkout);
        setGeneratedWorkoutId(lifecycle.generatedWorkoutId);
        setPersisted(true);
        setStage(betaStageFromLifecycleStatus(lifecycle.status));
        setStartedAt(lifecycle.startedAt ?? lifecycle.resumedAt ?? null);
        setLifecycleStatus(lifecycle.status);
        setLifecycleMessage('Restored an active generated workout session.');
      } catch (loadError) {
        if (!cancelled) setLifecycleMessage(normalizeGeneratedWorkoutError(loadError, 'Unable to restore active generated workout session.'));
      }
    }
    void loadActiveGeneratedSession();
    return () => { cancelled = true; };
  }, [betaEnabled, stage, userId, workout]);

  const generate = useCallback(async (config: GeneratedWorkoutBetaConfig) => {
    if (!betaEnabled) return;
    const experienceLevel = config.goalId === 'dumbbell_hypertrophy' ? 'intermediate' as const : 'beginner' as const;
    const workoutEnvironment = config.equipmentIds.includes('stationary_bike') ? 'gym' as const : 'home' as const;
    const request = {
      goalId: config.goalId,
      durationMinutes: config.durationMinutes,
      preferredDurationMinutes: config.durationMinutes,
      equipmentIds: config.equipmentIds,
      readinessBand: config.readinessBand,
      experienceLevel,
      workoutEnvironment,
      preferredToneVariant: 'coach_like' as const,
    };

    setLoading(true);
    setCompleting(false);
    setError(null);
    setProgressionDecision(null);
    setStartedAt(null);
    setLifecycleStatus(null);
    setLifecycleMessage(null);
    try {
      if (userId) {
        try {
          const result = await workoutProgrammingService.generateGeneratedWorkoutSessionForUser(userId, request, {
            useSupabase: true,
            ...resolveGeneratedWorkoutContentReviewOptions('beta-persisted'),
          });
          setWorkout(result.workout);
          setGeneratedWorkoutId(result.generatedWorkoutId);
          setPersisted(result.persisted);
          setStage('inspect');
          setLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'inspected');
          setLifecycleMessage(result.lifecycleFallbackMessage ? `Using local lifecycle fallback: ${result.lifecycleFallbackMessage}` : null);
          return;
        } catch (persistError) {
          if (!canUseLocalGeneratedWorkoutFallback(persistError)) {
            setError(normalizeGeneratedWorkoutError(persistError, GENERATED_WORKOUT_FALLBACK_COPY.noSafeGeneratedWorkoutFound));
            return;
          }
          const localWorkout = await workoutProgrammingService.generatePreviewWorkout(request, {
            persistGeneratedWorkout: false,
            ...resolveGeneratedWorkoutContentReviewOptions('beta-local-fallback'),
          });
          setWorkout(localWorkout);
          setGeneratedWorkoutId(null);
          setPersisted(false);
          setStage('inspect');
          setLifecycleStatus('inspected');
          setLifecycleMessage(GENERATED_WORKOUT_FALLBACK_COPY.generatedSessionLocal);
          setError(formatGeneratedWorkoutPersistenceFallbackMessage('generatedLocallyPersistenceUnavailable', persistError, 'Unable to save generated workout.'));
          return;
        }
      }

      const localWorkout = await workoutProgrammingService.generatePreviewWorkout(request, {
        persistGeneratedWorkout: false,
        ...resolveGeneratedWorkoutContentReviewOptions('beta-local-fallback'),
      });
      setWorkout(localWorkout);
      setGeneratedWorkoutId(null);
      setPersisted(false);
      setStage('inspect');
      setLifecycleStatus('inspected');
      setLifecycleMessage(GENERATED_WORKOUT_FALLBACK_COPY.generatedSessionLocal);
    } catch (generateError) {
      setError(normalizeGeneratedWorkoutError(generateError, GENERATED_WORKOUT_FALLBACK_COPY.noSafeGeneratedWorkoutFound));
    } finally {
      setLoading(false);
    }
  }, [betaEnabled, userId]);

  const start = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setStartedAt(occurredAt);
    setStage('started');
    setLifecycleStatus('started');
    setError(null);
    try {
      const lifecycle = await workoutProgrammingService.startGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      setStartedAt(lifecycle.lifecycle.startedAt ?? occurredAt);
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? null : 'Session started locally. Persistence will resume when available.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session started locally: ${lifecycle.fallbackMessage}`);
    } catch (startError) {
      setLifecycleMessage(formatGeneratedWorkoutPersistenceFallbackMessage('sessionStartedLocalPersistenceUnavailable', startError, 'Unable to persist start state.'));
    }
  }, [generatedWorkoutId, userId]);

  const pause = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setLifecycleStatus('paused');
    setLifecycleMessage('Session paused.');
    try {
      const lifecycle = await workoutProgrammingService.pauseGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? 'Session paused and saved.' : 'Session paused locally.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session paused locally: ${lifecycle.fallbackMessage}`);
    } catch (pauseError) {
      setLifecycleMessage(formatGeneratedWorkoutPersistenceFallbackMessage('sessionPausedLocalPersistenceUnavailable', pauseError, 'Unable to persist pause state.'));
    }
  }, [generatedWorkoutId, userId]);

  const resume = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setStage('started');
    setLifecycleStatus('resumed');
    setLifecycleMessage('Session resumed.');
    try {
      const lifecycle = await workoutProgrammingService.resumeGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      setStartedAt((current) => current ?? lifecycle.lifecycle.startedAt ?? occurredAt);
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? 'Session resumed and saved.' : 'Session resumed locally.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session resumed locally: ${lifecycle.fallbackMessage}`);
    } catch (resumeError) {
      setLifecycleMessage(formatGeneratedWorkoutPersistenceFallbackMessage('sessionResumedLocalPersistenceUnavailable', resumeError, 'Unable to persist resume state.'));
    }
  }, [generatedWorkoutId, userId]);

  const abandon = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    try {
      const lifecycle = await workoutProgrammingService.abandonGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      resetBetaState({
        setWorkout,
        setGeneratedWorkoutId,
        setPersisted,
        setStage,
        setStartedAt,
        setLifecycleStatus,
        setLifecycleMessage,
        setProgressionDecision,
        setError,
      });
      if (lifecycle.fallbackMessage) setError(`Abandoned locally: ${lifecycle.fallbackMessage}`);
    } catch (abandonError) {
      resetBetaState({
        setWorkout,
        setGeneratedWorkoutId,
        setPersisted,
        setStage,
        setStartedAt,
        setLifecycleStatus,
        setLifecycleMessage,
        setProgressionDecision,
        setError,
      });
      setError(formatGeneratedWorkoutPersistenceFallbackMessage('sessionAbandonedLocalPersistenceUnavailable', abandonError, 'Unable to persist abandon state.'));
    }
  }, [generatedWorkoutId, userId]);

  const complete = useCallback(async (draft: GeneratedWorkoutBetaCompletionDraft) => {
    if (!workout) return;
    const completionInput = {
      workout,
      generatedWorkoutId,
      startedAt,
      completedAt: new Date().toISOString(),
      ...draft,
    };
    const fallbackUserId = generatedWorkoutFlowUserId(userId);

    setCompleting(true);
    setError(null);
    try {
      const result = await workoutProgrammingService.completeGeneratedWorkoutSession(fallbackUserId, completionInput, generatedWorkoutCompletionOptionsForUser(userId));
      setProgressionDecision(result.progressionDecision);
      setStage('completed');
      setLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'completed');
      setLifecycleMessage(formatGeneratedWorkoutLocalCompletionMessage(result.lifecycleFallbackMessage));
      if (userId && historyLoaded) void loadHistoryData(userId);
      if (userId && analyticsLoaded) void loadAnalyticsData(userId);
    } catch (persistError) {
      if (!userId || !canUseLocalCompletionFallback({ userId, error: persistError })) {
        setError(normalizeGeneratedWorkoutError(persistError, 'Generated workout completion failed.'));
        return;
      }
      try {
        const result = await workoutProgrammingService.completeGeneratedWorkoutSession(generatedWorkoutFlowUserId(null), completionInput, {
          persistGeneratedWorkout: false,
        });
        setProgressionDecision(result.progressionDecision);
        setStage('completed');
        setLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'completed');
        setLifecycleMessage(formatGeneratedWorkoutLocalCompletionMessage(result.lifecycleFallbackMessage));
        setError(formatGeneratedWorkoutPersistenceFallbackMessage('completedLocallyPersistenceUnavailable', persistError, 'Unable to save completion.'));
        if (historyLoaded) void loadHistoryData(userId);
        if (analyticsLoaded) void loadAnalyticsData(userId);
      } catch (localError) {
        setError(normalizeGeneratedWorkoutError(localError, 'Generated workout completion failed.'));
      }
    } finally {
      setCompleting(false);
    }
  }, [analyticsLoaded, generatedWorkoutId, historyLoaded, loadAnalyticsData, loadHistoryData, startedAt, userId, workout]);

  const reset = useCallback(() => {
    resetBetaState({
      setWorkout,
      setGeneratedWorkoutId,
      setPersisted,
      setStage,
      setStartedAt,
      setLifecycleStatus,
      setLifecycleMessage,
      setProgressionDecision,
      setError,
    });
  }, []);

  return {
    betaEnabled,
    beta: {
      userAuthenticated: Boolean(userId),
      stage,
      workout,
      generatedWorkoutId,
      persisted,
      startedAt,
      lifecycleStatus,
      lifecycleMessage,
      loading,
      completing,
      error,
      progressionDecision,
      defaultReadinessBand,
      generate,
      start,
      pause,
      resume,
      abandon,
      complete,
      reset,
    },
  };
}
