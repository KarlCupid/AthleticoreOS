import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getWorkoutHistory,
} from '../../lib/api/scService';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import { logError } from '../../lib/utils/logger';
import { getDailyEngineState } from '../../lib/api/dailyPerformanceService';
import { getWeeklyPlanEntriesForWeek } from '../../lib/api/weeklyPlanReadService';
import {
  buildUnifiedPerformanceViewModel,
  type UnifiedPerformanceViewModel,
} from '../../lib/performance-engine';
import {
  generatedCompletionSurfacesToAnalyticsSessions,
  generatedCompletionSurfacesToHistoryEntries,
  getBoxingSnapshotFromWeeklyPlanEntry,
  isActiveAthleticoreSupportPlanEntry,
  mergeWorkoutAnalyticsSessions,
  mergeWorkoutHistoryEntries,
  workoutProgrammingService,
  type UnifiedWorkoutHistoryEntry,
} from '../../lib/performance-engine/workout-programming';
import type {
  WorkoutPrescriptionV2,
  ScheduledActivityRow,
  DailyEngineState,
  DailyAthleteSummary,
  WeeklyPlanEntryRow,
} from '../../lib/engine/types';
import type { ACWRTrainingSession } from './workout/computeACWRTimeSeries';

export interface DailyCheckin {
  date: string;
  morning_weight: number | null;
  sleep_quality: number;
  readiness: number;
}

export interface TrainingSession extends ACWRTrainingSession {
  duration_minutes: number;
  intensity_srpe: number;
  source?: 'legacy' | 'generated';
  sourceLabel?: string;
  workoutCompletionId?: string | null;
  generatedWorkoutId?: string | null;
}

function resolveTodayPlanEntry(engineState: DailyEngineState | null): WeeklyPlanEntryRow | null {
  if (!engineState) return null;
  if (engineState.primaryTrainingPlanEntry) return engineState.primaryTrainingPlanEntry as WeeklyPlanEntryRow;
  const activeSupportEntry = engineState.weeklyPlanEntries.find(isActiveAthleticoreSupportPlanEntry);
  if (activeSupportEntry) return activeSupportEntry as WeeklyPlanEntryRow;
  if (engineState.primaryPlanEntry && getBoxingSnapshotFromWeeklyPlanEntry(engineState.primaryPlanEntry)) {
    return engineState.primaryPlanEntry as WeeklyPlanEntryRow;
  }
  return (engineState.primaryEnginePlanEntry as WeeklyPlanEntryRow | null) ?? null;
}

export function useWorkoutData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [prescription, setPrescription] = useState<WorkoutPrescriptionV2 | null>(null);
  const [todayActivities, setTodayActivities] = useState<ScheduledActivityRow[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<UnifiedWorkoutHistoryEntry[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [engineState, setEngineState] = useState<DailyEngineState | null>(null);
  const [dailyAthleteSummary, setDailyAthleteSummary] = useState<DailyAthleteSummary | null>(null);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyPlanEntryRow[]>([]);
  const [isDeloadWeek, setIsDeloadWeek] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [performanceContext, setPerformanceContext] = useState<UnifiedPerformanceViewModel>(() => buildUnifiedPerformanceViewModel(null));
  const userIdRef = useRef('');
  const historyLoadedRef = useRef(false);
  const analyticsLoadedRef = useRef(false);
  const mainLoadRequestIdRef = useRef(0);
  const historyLoadRequestIdRef = useRef(0);
  const analyticsLoadRequestIdRef = useRef(0);

  useEffect(() => () => {
    mainLoadRequestIdRef.current += 1;
    historyLoadRequestIdRef.current += 1;
    analyticsLoadRequestIdRef.current += 1;
  }, []);

  const setResolvedUserId = useCallback((nextUserId: string) => {
    userIdRef.current = nextUserId;
    setUserId(nextUserId);
  }, []);

  const loadHistoryData = useCallback(async (resolvedUserId?: string) => {
    const requestId = ++historyLoadRequestIdRef.current;
    let currentUserId: string | null = resolvedUserId ?? userIdRef.current;
    if (!currentUserId) currentUserId = await getActiveUserId();
    if (!currentUserId) {
      return;
    }

    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const [historyResult, generatedResult] = await Promise.allSettled([
        getWorkoutHistory(currentUserId, 20),
        workoutProgrammingService.loadGeneratedWorkoutCompletionSurfacesForUser(currentUserId, {
          useSupabase: true,
          limit: 20,
        }),
      ]);

      if (historyResult.status === 'rejected') {
        throw historyResult.reason;
      }

      const generatedSurfaces = generatedResult.status === 'fulfilled'
        ? generatedResult.value
        : [];
      if (generatedResult.status === 'rejected') {
        logError('useWorkoutData.loadHistoryData.generatedCompletions', generatedResult.reason);
      }

      const generatedHistory = generatedCompletionSurfacesToHistoryEntries(generatedSurfaces);
      if (requestId !== historyLoadRequestIdRef.current) return;
      setWorkoutHistory(mergeWorkoutHistoryEntries(historyResult.value, generatedHistory, 20));
      historyLoadedRef.current = true;
      setHistoryLoaded(true);
    } catch (error) {
      if (requestId !== historyLoadRequestIdRef.current) return;
      logError('useWorkoutData.loadHistoryData', error);
      setHistoryError('Could not load your recent sessions.');
    } finally {
      if (requestId !== historyLoadRequestIdRef.current) return;
      setHistoryLoading(false);
    }
  }, []);

  const loadAnalyticsData = useCallback(async (resolvedUserId?: string) => {
    const requestId = ++analyticsLoadRequestIdRef.current;
    let currentUserId: string | null = resolvedUserId ?? userIdRef.current;
    if (!currentUserId) currentUserId = await getActiveUserId();
    if (!currentUserId) {
      return;
    }

    setAnalyticsError(null);
    setAnalyticsLoading(true);
    const todayStr = todayLocalDate();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);
    const sinceStr = formatLocalDate(sinceDate);

    try {
      const [{ data: checkinsRes }, { data: sessionsRes }, generatedSurfaces] = await Promise.all([
        supabase
          .from('daily_checkins')
          .select('date, morning_weight, sleep_quality, readiness')
          .eq('user_id', currentUserId)
          .gte('date', sinceStr)
          .order('date'),
        supabase
          .from('training_sessions')
          .select('date, total_load, duration_minutes, intensity_srpe')
          .eq('user_id', currentUserId)
          .gte('date', sinceStr)
          .order('date'),
        workoutProgrammingService.loadGeneratedWorkoutCompletionSurfacesForUser(currentUserId, {
          useSupabase: true,
          limit: 60,
        }).catch((error) => {
          logError('useWorkoutData.loadAnalyticsData.generatedCompletions', error);
          return [];
        }),
      ]);

      if (requestId !== analyticsLoadRequestIdRef.current) return;
      if (checkinsRes) setCheckins(checkinsRes as DailyCheckin[]);
      const generatedSessions = generatedCompletionSurfacesToAnalyticsSessions(generatedSurfaces);
      setSessions(mergeWorkoutAnalyticsSessions((sessionsRes ?? []) as TrainingSession[], generatedSessions) as TrainingSession[]);
      analyticsLoadedRef.current = true;
      setAnalyticsLoaded(true);
    } catch (error) {
      if (requestId !== analyticsLoadRequestIdRef.current) return;
      logError('useWorkoutData.loadAnalyticsData', error, { todayStr });
      setAnalyticsError('Could not load your progress right now.');
    } finally {
      if (requestId !== analyticsLoadRequestIdRef.current) return;
      setAnalyticsLoading(false);
    }
  }, []);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    const requestId = ++mainLoadRequestIdRef.current;
    const currentUserId = await getActiveUserId();
    if (requestId !== mainLoadRequestIdRef.current) return;
    if (!currentUserId) {
      setResolvedUserId('');
      setPerformanceContext(buildUnifiedPerformanceViewModel(null));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setInitialLoadError(null);
      setResolvedUserId(currentUserId);
      const todayStr = todayLocalDate();
      const engineState = await getDailyEngineState(currentUserId, todayStr, { forceRefresh });
      const weekStart = engineState.primaryPlanEntry?.week_start_date
        ?? engineState.weeklyPlanEntries[0]?.week_start_date
        ?? todayStr;
      const weeklyEntries = await getWeeklyPlanEntriesForWeek(currentUserId, weekStart);

      if (requestId !== mainLoadRequestIdRef.current) return;
      setEngineState(engineState);
      setPerformanceContext(buildUnifiedPerformanceViewModel(engineState.unifiedPerformance));
      setDailyAthleteSummary(engineState.mission);
      setTodayActivities(engineState.scheduledActivities ?? []);
      setWeeklyEntries(weeklyEntries);
      setIsDeloadWeek(weeklyEntries.some((entry) => entry.is_deload));
      setPrescription((engineState.workoutPrescription as WorkoutPrescriptionV2 | null) ?? null);

      const backgroundLoads: Array<Promise<void>> = [];
      if (historyLoadedRef.current) {
        backgroundLoads.push(loadHistoryData(currentUserId));
      }
      if (analyticsLoadedRef.current) {
        backgroundLoads.push(loadAnalyticsData(currentUserId));
      }
      if (backgroundLoads.length > 0) {
        await Promise.all(backgroundLoads);
      }
    } catch (error) {
      if (requestId !== mainLoadRequestIdRef.current) return;
      logError('useWorkoutData.loadData', error);
      setInitialLoadError('Could not load your training screen.');
    } finally {
      if (requestId !== mainLoadRequestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAnalyticsData, loadHistoryData, setResolvedUserId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const todayPlanEntry = resolveTodayPlanEntry(engineState);

  return {
    loading,
    refreshing,
    loadData,
    onRefresh,
    prescription,
    todayActivities,
    workoutHistory,
    checkins,
    sessions,
    userId,
    engineState,
    performanceContext,
    dailyAthleteSummary,
    todayPlanEntry,
    weeklyEntries,
    isDeloadWeek,
    historyLoaded,
    analyticsLoaded,
    historyLoading,
    analyticsLoading,
    initialLoadError,
    historyError,
    analyticsError,
    loadHistoryData,
    loadAnalyticsData,
  };
}

export { computeACWRTimeSeries } from './workout/computeACWRTimeSeries';
