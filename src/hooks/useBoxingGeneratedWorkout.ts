import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BoxingGeneratedWorkoutCompletionDraft,
  BoxingGeneratedWorkoutConfig,
  BoxingGeneratedWorkoutStage,
} from '../components/workout/BoxingGeneratedWorkoutSessionCard';
import { addMonitoringBreadcrumb } from '../../lib/observability/breadcrumbs';
import { logError } from '../../lib/utils/logger';
import {
  GENERATED_WORKOUT_FALLBACK_COPY,
  canUseLocalCompletionFallback,
  canUseLocalGeneratedWorkoutFallback,
  formatGeneratedWorkoutPersistenceFallbackMessage,
  formatGeneratedWorkoutLocalCompletionMessage,
  generatedWorkoutCompletionOptionsForUser,
  generatedWorkoutFlowUserId,
  generatedWorkoutLifecycleOptionsForUser,
  readinessBandFromLevel,
  normalizeGeneratedWorkoutError,
  resolveBoxingSAndCEngineFlags,
  resolveGeneratedWorkoutContentReviewOptions,
  workoutProgrammingService,
  type GeneratedWorkout,
  type GeneratedWorkoutSessionLifecycleStatus,
  type ProgressionDecision,
  type WorkoutReadinessBand,
} from '../../lib/performance-engine/workout-programming';

type ReloadWorkoutData = (userId?: string) => void | Promise<void>;

export interface UseBoxingGeneratedWorkoutOptions {
  userId: string | null | undefined;
  currentLevel: string | null | undefined;
  historyLoaded: boolean;
  analyticsLoaded: boolean;
  loadHistoryData: ReloadWorkoutData;
  loadAnalyticsData: ReloadWorkoutData;
}

export interface BoxingGeneratedWorkoutController {
  userAuthenticated: boolean;
  stage: BoxingGeneratedWorkoutStage;
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
  generate: (config: BoxingGeneratedWorkoutConfig) => Promise<void>;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  abandon: () => Promise<void>;
  complete: (draft: BoxingGeneratedWorkoutCompletionDraft) => Promise<void>;
  reset: () => void;
}

export interface UseBoxingGeneratedWorkoutResult {
  engineEnabled: boolean;
  support: BoxingGeneratedWorkoutController;
}

function supportStageFromLifecycleStatus(status: GeneratedWorkoutSessionLifecycleStatus): BoxingGeneratedWorkoutStage {
  if (status === 'completed') return 'completed';
  if (status === 'started' || status === 'paused' || status === 'resumed') return 'started';
  return 'inspect';
}

function resetSupportState(setters: {
  setWorkout: (workout: GeneratedWorkout | null) => void;
  setGeneratedWorkoutId: (generatedWorkoutId: string | null) => void;
  setPersisted: (persisted: boolean) => void;
  setStage: (stage: BoxingGeneratedWorkoutStage) => void;
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

export function useBoxingGeneratedWorkout({
  userId,
  currentLevel,
  historyLoaded,
  analyticsLoaded,
  loadHistoryData,
  loadAnalyticsData,
}: UseBoxingGeneratedWorkoutOptions): UseBoxingGeneratedWorkoutResult {
  const engineEnabled = resolveBoxingSAndCEngineFlags().engineEnabled;
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [generatedWorkoutId, setGeneratedWorkoutId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [stage, setStage] = useState<BoxingGeneratedWorkoutStage>('configure');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [lifecycleStatus, setLifecycleStatus] = useState<GeneratedWorkoutSessionLifecycleStatus | null>(null);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressionDecision, setProgressionDecision] = useState<ProgressionDecision | null>(null);

  const defaultReadinessBand = useMemo(() => readinessBandFromLevel(currentLevel), [currentLevel]);

  useEffect(() => {
    if (!engineEnabled || !userId || workout || stage !== 'configure') return;
    let cancelled = false;
    async function loadActiveGeneratedSession() {
      addMonitoringBreadcrumb('generated_workout', 'restore_active_session_started', { hasUserId: Boolean(userId) });
      try {
        const lifecycle = await workoutProgrammingService.loadActiveGeneratedWorkoutSession(userId!, { useSupabase: true });
        if (!lifecycle || cancelled) return;
        const loadedWorkout = await workoutProgrammingService.loadGeneratedWorkoutForUser(userId!, lifecycle.generatedWorkoutId, { useSupabase: true });
        if (!loadedWorkout || cancelled) return;
        setWorkout(loadedWorkout);
        setGeneratedWorkoutId(lifecycle.generatedWorkoutId);
        setPersisted(true);
        setStage(supportStageFromLifecycleStatus(lifecycle.status));
        setStartedAt(lifecycle.startedAt ?? lifecycle.resumedAt ?? null);
        setLifecycleStatus(lifecycle.status);
        setLifecycleMessage('Restored an active Athleticore support session.');
        addMonitoringBreadcrumb('generated_workout', 'restore_active_session_succeeded', {
          status: lifecycle.status,
          generatedWorkoutIdPresent: Boolean(lifecycle.generatedWorkoutId),
        });
      } catch (loadError) {
        if (!cancelled) {
          logError('useBoxingGeneratedWorkout.restoreActiveSession', loadError, { hasUserId: Boolean(userId) });
          setLifecycleMessage(normalizeGeneratedWorkoutError(loadError, 'Unable to restore active Athleticore support session.'));
        }
      }
    }
    void loadActiveGeneratedSession();
    return () => { cancelled = true; };
  }, [engineEnabled, stage, userId, workout]);

  const generate = useCallback(async (config: BoxingGeneratedWorkoutConfig) => {
    if (!engineEnabled) return;
    const roadwork = config.intendedBoxingSessionFamily.startsWith('roadwork_');
    const request = {
      goalId: config.goalId,
      durationMinutes: config.durationMinutes,
      preferredDurationMinutes: config.durationMinutes,
      equipmentIds: config.equipmentIds,
      readinessBand: config.readinessBand,
      experienceLevel: 'beginner' as const,
      workoutEnvironment: roadwork ? 'outdoor' as const : 'home' as const,
      preferredToneVariant: 'coach_like' as const,
      intendedBoxingSessionFamily: config.intendedBoxingSessionFamily,
      intendedBoxingSessionRole: config.intendedBoxingSessionRole,
      intendedSessionDoseCategory: config.intendedSessionDoseCategory,
      athleticDevelopmentDomain: config.athleticDevelopmentDomain,
      preferredSessionTemplateId: config.preferredSessionTemplateId,
      boxingTrainingContext: config.boxingTrainingContext ?? { track: 'aspiring_boxer' as const },
    };

    setLoading(true);
    setCompleting(false);
    setError(null);
    setProgressionDecision(null);
    setStartedAt(null);
    setLifecycleStatus(null);
    setLifecycleMessage(null);
    addMonitoringBreadcrumb('generated_workout', 'generate_started', {
      goalId: config.goalId,
      equipmentCount: config.equipmentIds.length,
      durationMinutes: config.durationMinutes,
      hasUserId: Boolean(userId),
    });
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
          setLifecycleMessage(result.lifecycleFallbackMessage ? `Using local session save fallback: ${result.lifecycleFallbackMessage}` : null);
          addMonitoringBreadcrumb('generated_workout', 'generate_persisted_succeeded', {
            persisted: result.persisted,
            lifecycleStatus: result.lifecycle?.lifecycle.status ?? 'inspected',
          });
          return;
        } catch (persistError) {
          if (!canUseLocalGeneratedWorkoutFallback(persistError)) {
            logError('useBoxingGeneratedWorkout.generatePersisted', persistError, {
              goalId: config.goalId,
              equipmentCount: config.equipmentIds.length,
              durationMinutes: config.durationMinutes,
            });
            setError(normalizeGeneratedWorkoutError(persistError, GENERATED_WORKOUT_FALLBACK_COPY.noSafeGeneratedWorkoutFound));
            return;
          }
          logError('useBoxingGeneratedWorkout.generatePersistedFallback', persistError, {
            goalId: config.goalId,
            fallbackAllowed: true,
          });
          const localWorkout = await workoutProgrammingService.generatePreviewWorkout(request, {
            persistGeneratedWorkout: false,
            ...resolveGeneratedWorkoutContentReviewOptions('beta-local-fallback'),
          });
          setWorkout(localWorkout);
          setGeneratedWorkoutId(null);
          setPersisted(false);
          setStage('inspect');
          setLifecycleStatus('inspected');
          setLifecycleMessage('Generated Athleticore support session locally. Sign in or reconnect to save it.');
          setError(formatGeneratedWorkoutPersistenceFallbackMessage('generatedLocallyPersistenceUnavailable', persistError, 'Unable to save generated workout.'));
          addMonitoringBreadcrumb('generated_workout', 'generate_local_fallback_succeeded', {
            goalId: config.goalId,
          });
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
        setLifecycleMessage('Generated Athleticore support session locally. Sign in to save completions and progression.');
      addMonitoringBreadcrumb('generated_workout', 'generate_local_succeeded', {
        goalId: config.goalId,
      });
    } catch (generateError) {
      logError('useBoxingGeneratedWorkout.generate', generateError, {
        goalId: config.goalId,
        equipmentCount: config.equipmentIds.length,
        durationMinutes: config.durationMinutes,
      });
      setError(normalizeGeneratedWorkoutError(generateError, GENERATED_WORKOUT_FALLBACK_COPY.noSafeGeneratedWorkoutFound));
    } finally {
      setLoading(false);
    }
  }, [engineEnabled, userId]);

  const start = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setStartedAt(occurredAt);
    setStage('started');
    setLifecycleStatus('started');
    setError(null);
    addMonitoringBreadcrumb('generated_workout', 'start_started', {
      generatedWorkoutIdPresent: Boolean(generatedWorkoutId),
      hasUserId: Boolean(userId),
    });
    try {
      const lifecycle = await workoutProgrammingService.startGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      setStartedAt(lifecycle.lifecycle.startedAt ?? occurredAt);
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? null : 'Session started locally. Saving will resume when available.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session started locally: ${lifecycle.fallbackMessage}`);
      addMonitoringBreadcrumb('generated_workout', 'start_succeeded', {
        persisted: lifecycle.persisted,
        lifecycleStatus: lifecycle.lifecycle.status,
      });
    } catch (startError) {
      logError('useBoxingGeneratedWorkout.start', startError, { generatedWorkoutIdPresent: Boolean(generatedWorkoutId) });
      setLifecycleMessage(formatGeneratedWorkoutPersistenceFallbackMessage('sessionStartedLocalPersistenceUnavailable', startError, 'Unable to save start state.'));
    }
  }, [generatedWorkoutId, userId]);

  const pause = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setLifecycleStatus('paused');
    setLifecycleMessage('Session paused.');
    addMonitoringBreadcrumb('generated_workout', 'pause_started', { generatedWorkoutIdPresent: Boolean(generatedWorkoutId) });
    try {
      const lifecycle = await workoutProgrammingService.pauseGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? 'Session paused and saved.' : 'Session paused locally.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session paused locally: ${lifecycle.fallbackMessage}`);
      addMonitoringBreadcrumb('generated_workout', 'pause_succeeded', {
        persisted: lifecycle.persisted,
        lifecycleStatus: lifecycle.lifecycle.status,
      });
    } catch (pauseError) {
      logError('useBoxingGeneratedWorkout.pause', pauseError, { generatedWorkoutIdPresent: Boolean(generatedWorkoutId) });
      setLifecycleMessage(formatGeneratedWorkoutPersistenceFallbackMessage('sessionPausedLocalPersistenceUnavailable', pauseError, 'Unable to persist pause state.'));
    }
  }, [generatedWorkoutId, userId]);

  const resume = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    setStage('started');
    setLifecycleStatus('resumed');
    setLifecycleMessage('Session resumed.');
    addMonitoringBreadcrumb('generated_workout', 'resume_started', { generatedWorkoutIdPresent: Boolean(generatedWorkoutId) });
    try {
      const lifecycle = await workoutProgrammingService.resumeGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      setStartedAt((current) => current ?? lifecycle.lifecycle.startedAt ?? occurredAt);
      setLifecycleStatus(lifecycle.lifecycle.status);
      setLifecycleMessage(lifecycle.persisted ? 'Session resumed and saved.' : 'Session resumed locally.');
      if (lifecycle.fallbackMessage) setLifecycleMessage(`Session resumed locally: ${lifecycle.fallbackMessage}`);
      addMonitoringBreadcrumb('generated_workout', 'resume_succeeded', {
        persisted: lifecycle.persisted,
        lifecycleStatus: lifecycle.lifecycle.status,
      });
    } catch (resumeError) {
      logError('useBoxingGeneratedWorkout.resume', resumeError, { generatedWorkoutIdPresent: Boolean(generatedWorkoutId) });
      setLifecycleMessage(formatGeneratedWorkoutPersistenceFallbackMessage('sessionResumedLocalPersistenceUnavailable', resumeError, 'Unable to persist resume state.'));
    }
  }, [generatedWorkoutId, userId]);

  const abandon = useCallback(async () => {
    const occurredAt = new Date().toISOString();
    addMonitoringBreadcrumb('generated_workout', 'abandon_started', { generatedWorkoutIdPresent: Boolean(generatedWorkoutId) });
    try {
      const lifecycle = await workoutProgrammingService.abandonGeneratedWorkoutSession(generatedWorkoutFlowUserId(userId), generatedWorkoutId, generatedWorkoutLifecycleOptionsForUser(userId, occurredAt));
      resetSupportState({
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
      addMonitoringBreadcrumb('generated_workout', 'abandon_succeeded', {
        persisted: lifecycle.persisted,
        lifecycleStatus: lifecycle.lifecycle.status,
      });
    } catch (abandonError) {
      logError('useBoxingGeneratedWorkout.abandon', abandonError, { generatedWorkoutIdPresent: Boolean(generatedWorkoutId) });
      resetSupportState({
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

  const complete = useCallback(async (draft: BoxingGeneratedWorkoutCompletionDraft) => {
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
    addMonitoringBreadcrumb('generated_workout', 'complete_started', {
      generatedWorkoutIdPresent: Boolean(generatedWorkoutId),
      persisted,
    });
    try {
      const result = await workoutProgrammingService.completeGeneratedWorkoutSession(fallbackUserId, completionInput, generatedWorkoutCompletionOptionsForUser(userId));
      setProgressionDecision(result.progressionDecision);
      setStage('completed');
      setLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'completed');
      setLifecycleMessage(formatGeneratedWorkoutLocalCompletionMessage(result.lifecycleFallbackMessage));
      if (userId && historyLoaded) void loadHistoryData(userId);
      if (userId && analyticsLoaded) void loadAnalyticsData(userId);
      addMonitoringBreadcrumb('generated_workout', 'complete_succeeded', {
        lifecycleStatus: result.lifecycle?.lifecycle.status ?? 'completed',
      });
    } catch (persistError) {
      if (!userId || !canUseLocalCompletionFallback({ userId, error: persistError })) {
        logError('useBoxingGeneratedWorkout.completePersisted', persistError, {
          generatedWorkoutIdPresent: Boolean(generatedWorkoutId),
        });
        setError(normalizeGeneratedWorkoutError(persistError, 'Generated workout completion failed.'));
        return;
      }
      logError('useBoxingGeneratedWorkout.completePersistedFallback', persistError, {
        generatedWorkoutIdPresent: Boolean(generatedWorkoutId),
        fallbackAllowed: true,
      });
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
        addMonitoringBreadcrumb('generated_workout', 'complete_local_fallback_succeeded', {
          lifecycleStatus: result.lifecycle?.lifecycle.status ?? 'completed',
        });
      } catch (localError) {
        logError('useBoxingGeneratedWorkout.completeLocalFallback', localError, {
          generatedWorkoutIdPresent: Boolean(generatedWorkoutId),
        });
        setError(normalizeGeneratedWorkoutError(localError, 'Generated workout completion failed.'));
      }
    } finally {
      setCompleting(false);
    }
  }, [analyticsLoaded, generatedWorkoutId, historyLoaded, loadAnalyticsData, loadHistoryData, persisted, startedAt, userId, workout]);

  const reset = useCallback(() => {
    resetSupportState({
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
    engineEnabled,
    support: {
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
