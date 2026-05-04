import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GeneratedWorkoutBetaCompletionDraft,
  GeneratedWorkoutBetaConfig,
  GeneratedWorkoutBetaStage,
} from '../components/workout/GeneratedWorkoutBetaSessionCard';
import {
  workoutProgrammingService,
  workoutProgrammingServiceFixtures,
  type GeneratedWorkout,
  type GeneratedWorkoutSessionLifecycleStatus,
  type ProgressionDecision,
  type WorkoutReadinessBand,
} from '../../lib/performance-engine/workout-programming';

type ReloadWorkoutData = (userId?: string) => void | Promise<void>;

interface UseGeneratedWorkoutBetaOptions {
  userId: string | null | undefined;
  currentLevel: string | null | undefined;
  previewActive: boolean;
  historyLoaded: boolean;
  analyticsLoaded: boolean;
  loadHistoryData: ReloadWorkoutData;
  loadAnalyticsData: ReloadWorkoutData;
}

export interface GeneratedWorkoutPreviewController {
  workout: GeneratedWorkout | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
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
  previewEnabled: boolean;
  preview: GeneratedWorkoutPreviewController;
  beta: GeneratedWorkoutBetaController;
}

const LOCAL_GENERATED_WORKOUT_BETA_USER_ID = 'local-generated-workout-beta-user';

function generatedWorkoutFeatureFlags() {
  const betaEnabled = process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA === '1';
  const previewEnabled = !betaEnabled
    && typeof __DEV__ !== 'undefined'
    && __DEV__
    && process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW === '1';
  return { betaEnabled, previewEnabled };
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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
  previewActive,
  historyLoaded,
  analyticsLoaded,
  loadHistoryData,
  loadAnalyticsData,
}: UseGeneratedWorkoutBetaOptions): UseGeneratedWorkoutBetaResult {
  const { betaEnabled, previewEnabled } = generatedWorkoutFeatureFlags();
  const [previewWorkout, setPreviewWorkout] = useState<GeneratedWorkout | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
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

  const loadPreview = useCallback(async () => {
    if (!previewEnabled) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const generatedPreview = await workoutProgrammingService.generatePreviewWorkout(
        workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
        { persistGeneratedWorkout: false },
      );
      setPreviewWorkout(generatedPreview);
    } catch (loadError) {
      setPreviewError(errorMessage(loadError, 'Generated workout preview failed.'));
    } finally {
      setPreviewLoading(false);
    }
  }, [previewEnabled]);

  useEffect(() => {
    if (previewEnabled && previewActive && !previewWorkout && !previewLoading) {
      void loadPreview();
    }
  }, [loadPreview, previewActive, previewEnabled, previewLoading, previewWorkout]);

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
        if (!cancelled) setLifecycleMessage(errorMessage(loadError, 'Unable to restore active generated workout session.'));
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
            contentReviewMode: 'production',
          });
          setWorkout(result.workout);
          setGeneratedWorkoutId(result.generatedWorkoutId);
          setPersisted(result.persisted);
          setStage('inspect');
          setLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'inspected');
          setLifecycleMessage(result.lifecycleFallbackMessage ? `Using local lifecycle fallback: ${result.lifecycleFallbackMessage}` : null);
          return;
        } catch (persistError) {
          const localWorkout = await workoutProgrammingService.generatePreviewWorkout(request, {
            persistGeneratedWorkout: false,
            contentReviewMode: 'preview',
          });
          setWorkout(localWorkout);
          setGeneratedWorkoutId(null);
          setPersisted(false);
          setStage('inspect');
          setLifecycleStatus('inspected');
          setLifecycleMessage('Generated session is local on this device.');
          setError(`Generated locally. Persistence unavailable: ${errorMessage(persistError, 'Unable to save generated workout.')}`);
          return;
        }
      }

      const localWorkout = await workoutProgrammingService.generatePreviewWorkout(request, {
        persistGeneratedWorkout: false,
        contentReviewMode: 'preview',
      });
      setWorkout(localWorkout);
      setGeneratedWorkoutId(null);
      setPersisted(false);
      setStage('inspect');
      setLifecycleStatus('inspected');
      setLifecycleMessage('Generated session is local on this device.');
    } catch (generateError) {
      setError(errorMessage(generateError, 'Generated workout failed.'));
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
      const lifecycle = await workoutProgrammingService.startGeneratedWorkoutSession(userId ?? LOCAL_GENERATED_WORKOUT_BETA_USER_ID, generatedWorkoutId, userId ? {
        useSupabase: true,
        occurredAt,
      } : {
        occurredAt,
      });
      setStartedAt(lifecycle.lifecycle.startedAt ?? occurredAt);
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? null : 'Session started locally. Persistence will resume when available.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session started locally: ${lifecycle.fallbackMessage}`);
    } catch (startError) {
      setLifecycleMessage(`Session started locally. Persistence unavailable: ${errorMessage(startError, 'Unable to persist start state.')}`);
    }
  }, [generatedWorkoutId, userId]);

  const pause = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setLifecycleStatus('paused');
    setLifecycleMessage('Session paused.');
    try {
      const lifecycle = await workoutProgrammingService.pauseGeneratedWorkoutSession(userId ?? LOCAL_GENERATED_WORKOUT_BETA_USER_ID, generatedWorkoutId, userId ? {
        useSupabase: true,
        occurredAt,
      } : {
        occurredAt,
      });
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? 'Session paused and saved.' : 'Session paused locally.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session paused locally: ${lifecycle.fallbackMessage}`);
    } catch (pauseError) {
      setLifecycleMessage(`Session paused locally. Persistence unavailable: ${errorMessage(pauseError, 'Unable to persist pause state.')}`);
    }
  }, [generatedWorkoutId, userId]);

  const resume = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setStage('started');
    setLifecycleStatus('resumed');
    setLifecycleMessage('Session resumed.');
    try {
      const lifecycle = await workoutProgrammingService.resumeGeneratedWorkoutSession(userId ?? LOCAL_GENERATED_WORKOUT_BETA_USER_ID, generatedWorkoutId, userId ? {
        useSupabase: true,
        occurredAt,
      } : {
        occurredAt,
      });
      setStartedAt((current) => current ?? lifecycle.lifecycle.startedAt ?? occurredAt);
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? 'Session resumed and saved.' : 'Session resumed locally.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session resumed locally: ${lifecycle.fallbackMessage}`);
    } catch (resumeError) {
      setLifecycleMessage(`Session resumed locally. Persistence unavailable: ${errorMessage(resumeError, 'Unable to persist resume state.')}`);
    }
  }, [generatedWorkoutId, userId]);

  const abandon = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    try {
      const lifecycle = await workoutProgrammingService.abandonGeneratedWorkoutSession(userId ?? LOCAL_GENERATED_WORKOUT_BETA_USER_ID, generatedWorkoutId, userId ? {
        useSupabase: true,
        occurredAt,
      } : {
        occurredAt,
      });
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
      setError(`Abandoned locally. Persistence unavailable: ${errorMessage(abandonError, 'Unable to persist abandon state.')}`);
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
    const fallbackUserId = userId ?? LOCAL_GENERATED_WORKOUT_BETA_USER_ID;

    setCompleting(true);
    setError(null);
    try {
      const result = await workoutProgrammingService.completeGeneratedWorkoutSession(fallbackUserId, completionInput, userId ? {
        useSupabase: true,
      } : {
        persistGeneratedWorkout: false,
      });
      setProgressionDecision(result.progressionDecision);
      setStage('completed');
      setLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'completed');
      setLifecycleMessage(result.lifecycleFallbackMessage ? `Completed locally: ${result.lifecycleFallbackMessage}` : null);
      if (userId && historyLoaded) void loadHistoryData(userId);
      if (userId && analyticsLoaded) void loadAnalyticsData(userId);
    } catch (persistError) {
      if (!userId) {
        setError(errorMessage(persistError, 'Generated workout completion failed.'));
        return;
      }
      try {
        const result = await workoutProgrammingService.completeGeneratedWorkoutSession(LOCAL_GENERATED_WORKOUT_BETA_USER_ID, completionInput, {
          persistGeneratedWorkout: false,
        });
        setProgressionDecision(result.progressionDecision);
        setStage('completed');
        setLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'completed');
        setLifecycleMessage(result.lifecycleFallbackMessage ? `Completed locally: ${result.lifecycleFallbackMessage}` : null);
        setError(`Completed locally. Persistence unavailable: ${errorMessage(persistError, 'Unable to save completion.')}`);
        if (historyLoaded) void loadHistoryData(userId);
        if (analyticsLoaded) void loadAnalyticsData(userId);
      } catch (localError) {
        setError(errorMessage(localError, 'Generated workout completion failed.'));
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
    previewEnabled,
    preview: {
      workout: previewWorkout,
      loading: previewLoading,
      error: previewError,
      load: loadPreview,
    },
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
