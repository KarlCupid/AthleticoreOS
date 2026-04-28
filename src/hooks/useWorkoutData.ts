import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getWorkoutHistory,
} from '../../lib/api/scService';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import { logError } from '../../lib/utils/logger';
import { getDailyEngineState, getWeeklyMission } from '../../lib/api/dailyMissionService';
import {
  buildUnifiedPerformanceViewModel,
  type UnifiedPerformanceViewModel,
} from '../../lib/performance-engine';
import type {
  WorkoutPrescriptionV2,
  WorkoutLogRow,
  ScheduledActivityRow,
  DailyCutProtocolRow,
  DailyEngineState,
  DailyMission,
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
}

interface WorkoutNavigation {
  navigate: (screen: string, params: Record<string, unknown>) => void;
}

export function useWorkoutData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [prescription, setPrescription] = useState<WorkoutPrescriptionV2 | null>(null);
  const [todayActivities, setTodayActivities] = useState<ScheduledActivityRow[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLogRow[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [cutProtocol, setCutProtocol] = useState<DailyCutProtocolRow | null>(null);
  const [engineState, setEngineState] = useState<DailyEngineState | null>(null);
  const [dailyMission, setDailyMission] = useState<DailyMission | null>(null);
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

  const loadHistoryData = useCallback(async (resolvedUserId?: string) => {
    const currentUserId = resolvedUserId ?? userId ?? await getActiveUserId();
    if (!currentUserId) {
      return;
    }

    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const history = await getWorkoutHistory(currentUserId, 20);
      setWorkoutHistory(history);
      setHistoryLoaded(true);
    } catch (error) {
      logError('useWorkoutData.loadHistoryData', error);
      setHistoryError('Could not load your recent sessions.');
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  const loadAnalyticsData = useCallback(async (resolvedUserId?: string) => {
    const currentUserId = resolvedUserId ?? userId ?? await getActiveUserId();
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
      const [{ data: checkinsRes }, { data: sessionsRes }] = await Promise.all([
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
      ]);

      if (checkinsRes) setCheckins(checkinsRes as DailyCheckin[]);
      if (sessionsRes) setSessions(sessionsRes as TrainingSession[]);
      setAnalyticsLoaded(true);
    } catch (error) {
      logError('useWorkoutData.loadAnalyticsData', error, { todayStr });
      setAnalyticsError('Could not load your progress right now.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [userId]);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    const currentUserId = await getActiveUserId();
    if (!currentUserId) {
      setPerformanceContext(buildUnifiedPerformanceViewModel(null));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setInitialLoadError(null);
      setUserId(currentUserId);
      const todayStr = todayLocalDate();
      const engineState = await getDailyEngineState(currentUserId, todayStr, { forceRefresh });
      const weekStart = engineState.primaryPlanEntry?.week_start_date
        ?? engineState.weeklyPlanEntries[0]?.week_start_date
        ?? todayStr;
      const weeklyMission = await getWeeklyMission(currentUserId, weekStart, { forceRefresh });

      setEngineState(engineState);
      setPerformanceContext(buildUnifiedPerformanceViewModel(engineState.unifiedPerformance));
      setDailyMission(engineState.mission);
      setTodayActivities(engineState.scheduledActivities ?? []);
      setWeeklyEntries(weeklyMission.entries ?? []);
      setIsDeloadWeek((weeklyMission.entries ?? []).some((entry) => entry.is_deload));
      setCutProtocol((engineState.cutProtocol as DailyCutProtocolRow | null) ?? null);
      setPrescription((engineState.workoutPrescription as WorkoutPrescriptionV2 | null) ?? null);

      const backgroundLoads: Array<Promise<void>> = [];
      if (historyLoaded) {
        backgroundLoads.push(loadHistoryData(currentUserId));
      }
      if (analyticsLoaded) {
        backgroundLoads.push(loadAnalyticsData(currentUserId));
      }
      if (backgroundLoads.length > 0) {
        await Promise.all(backgroundLoads);
      }
    } catch (error) {
      logError('useWorkoutData.loadData', error);
      setInitialLoadError('Could not load your training screen.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [analyticsLoaded, historyLoaded, loadAnalyticsData, loadHistoryData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const handleStartWorkout = async (navigation: WorkoutNavigation) => {
    if (!prescription) return;
    if (!engineState?.primaryEnginePlanEntry) {
      navigation.navigate('WeeklyPlanSetup', {});
    }
  };

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
    cutProtocol,
    engineState,
    performanceContext,
    dailyMission,
    todayPlanEntry: (engineState?.primaryEnginePlanEntry as WeeklyPlanEntryRow | null) ?? null,
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
    handleStartWorkout,
  };
}

export { computeACWRTimeSeries } from './workout/computeACWRTimeSeries';
