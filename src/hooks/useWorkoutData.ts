import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getExerciseLibrary,
  getWorkoutHistory,
} from '../../lib/api/scService';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import { logError } from '../../lib/utils/logger';
import { getDailyEngineState, getWeeklyMission } from '../../lib/api/dailyMissionService';
import type {
  WorkoutPrescription,
  WorkoutLogRow,
  ScheduledActivityRow,
  ExerciseLibraryRow,
  ReadinessState,
  DailyCutProtocolRow,
  DailyEngineState,
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

export function useWorkoutData(currentLevel: ReadinessState | null) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [prescription, setPrescription] = useState<WorkoutPrescription | null>(null);
  const [todayActivities, setTodayActivities] = useState<ScheduledActivityRow[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLogRow[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryRow[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [cutProtocol, setCutProtocol] = useState<DailyCutProtocolRow | null>(null);
  const [engineState, setEngineState] = useState<DailyEngineState | null>(null);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyPlanEntryRow[]>([]);
  const [isDeloadWeek, setIsDeloadWeek] = useState(false);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    const currentUserId = await getActiveUserId();
    if (!currentUserId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const todayStr = todayLocalDate();

    try {
      setUserId(currentUserId);
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 30);
      const sinceStr = formatLocalDate(sinceDate);

      const [library, engineState, { data: checkinsRes }, { data: sessionsRes }] = await Promise.all([
        getExerciseLibrary(),
        getDailyEngineState(currentUserId, todayStr, { forceRefresh }),
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
      const weekStart = engineState.primaryPlanEntry?.week_start_date
        ?? engineState.weeklyPlanEntries[0]?.week_start_date
        ?? todayStr;
      const weeklyMission = await getWeeklyMission(currentUserId, weekStart, { forceRefresh });

      setExerciseLibrary(library);
      setEngineState(engineState);
      setTodayActivities(engineState.scheduledActivities ?? []);
      setWeeklyEntries(weeklyMission.entries ?? []);
      setIsDeloadWeek((weeklyMission.entries ?? []).some((entry) => entry.is_deload));
      if (checkinsRes) setCheckins(checkinsRes as DailyCheckin[]);
      if (sessionsRes) setSessions(sessionsRes as TrainingSession[]);
      setCutProtocol((engineState.cutProtocol as DailyCutProtocolRow | null) ?? null);
      setPrescription((engineState.workoutPrescription as WorkoutPrescription | null) ?? null);

      const history = await getWorkoutHistory(currentUserId, 20);
      setWorkoutHistory(history);
    } catch (error) {
      logError('useWorkoutData.loadData', error);
    }

    setLoading(false);
    setRefreshing(false);
  }, [currentLevel]);

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
    exerciseLibrary,
    checkins,
    sessions,
    userId,
    cutProtocol,
    engineState,
    todayPlanEntry: (engineState?.primaryEnginePlanEntry as WeeklyPlanEntryRow | null) ?? null,
    weeklyEntries,
    isDeloadWeek,
    handleStartWorkout,
  };
}

export { computeACWRTimeSeries } from './workout/computeACWRTimeSeries';
