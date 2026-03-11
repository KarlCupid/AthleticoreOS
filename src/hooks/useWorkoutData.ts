import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { calculateACWR } from '../../lib/engine/calculateACWR';
import { generateWorkout } from '../../lib/engine/calculateSC';
import {
  getExerciseLibrary,
  getWorkoutHistory,
  getRecentExerciseIds,
  startWorkout,
} from '../../lib/api/scService';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { getAthleteContext, getActiveUserId } from '../../lib/api/athleteContextService';
import { logError } from '../../lib/utils/logger';
import type {
  WorkoutPrescription,
  WorkoutLogRow,
  DailyTimelineRow,
  ExerciseLibraryRow,
  MuscleGroup,
  ReadinessState,
  DailyCutProtocolRow,
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

const EMPTY_VOLUME: Record<MuscleGroup, number> = {
  chest: 0,
  back: 0,
  shoulders: 0,
  quads: 0,
  hamstrings: 0,
  glutes: 0,
  arms: 0,
  core: 0,
  full_body: 0,
  neck: 0,
  calves: 0,
};

export function useWorkoutData(currentLevel: ReadinessState | null) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [prescription, setPrescription] = useState<WorkoutPrescription | null>(null);
  const [timelineBlocks, setTimelineBlocks] = useState<DailyTimelineRow[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLogRow[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryRow[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [cutProtocol, setCutProtocol] = useState<DailyCutProtocolRow | null>(null);

  const loadData = useCallback(async () => {
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

      const [
        athleteContext,
        library,
        { data: blocks },
        { data: checkinsRes },
        { data: sessionsRes },
      ] = await Promise.all([
        getAthleteContext(currentUserId),
        getExerciseLibrary(),
        supabase
          .from('daily_timeline')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('date', todayStr)
          .order('id', { ascending: true }),
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

      setExerciseLibrary(library);
      if (blocks) setTimelineBlocks(blocks as DailyTimelineRow[]);
      if (checkinsRes) setCheckins(checkinsRes as DailyCheckin[]);
      if (sessionsRes) setSessions(sessionsRes as TrainingSession[]);

      const readinessState: ReadinessState = currentLevel ?? 'Prime';

      let todayCutProtocol: DailyCutProtocolRow | null = null;
      if (athleteContext.isOnActiveCut) {
        const { data: proto } = await supabase
          .from('daily_cut_protocols')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('date', todayStr)
          .maybeSingle();
        todayCutProtocol = (proto as DailyCutProtocolRow | null) ?? null;
      }
      setCutProtocol(todayCutProtocol);

      let acwr = 1.0;
      try {
        const acwrResult = await calculateACWR({
          userId: currentUserId,
          supabaseClient: supabase,
          asOfDate: todayStr,
          fitnessLevel: athleteContext.fitnessLevel,
          phase: athleteContext.phase,
          isOnActiveCut: athleteContext.isOnActiveCut,
        });
        acwr = acwrResult.ratio;
      } catch (error) {
        logError('useWorkoutData.calculateACWR', error, { userId: currentUserId });
      }

      const recentIds = await getRecentExerciseIds(currentUserId);

      const workout = generateWorkout({
        readinessState,
        phase: athleteContext.phase,
        acwr,
        exerciseLibrary: library,
        recentExerciseIds: recentIds,
        recentMuscleVolume: { ...EMPTY_VOLUME },
        trainingDate: todayStr,
        fitnessLevel: athleteContext.fitnessLevel,
      });
      setPrescription(workout);

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
    loadData();
  }, [loadData]);

  const handleStartWorkout = async (navigation: WorkoutNavigation) => {
    if (!prescription) return;

    const currentUserId = await getActiveUserId();
    if (!currentUserId) return;

    try {
      const workoutLog = await startWorkout(currentUserId, {
        workoutType: prescription.workoutType,
        focus: prescription.focus,
      });
      navigation.navigate('ActiveWorkout', {
        workoutLogId: workoutLog.id,
        focus: prescription.focus,
        workoutType: prescription.workoutType,
      });
    } catch (error) {
      logError('useWorkoutData.handleStartWorkout', error, { userId: currentUserId });
    }
  };

  return {
    loading,
    refreshing,
    loadData,
    onRefresh,
    prescription,
    timelineBlocks,
    workoutHistory,
    exerciseLibrary,
    checkins,
    sessions,
    userId,
    cutProtocol,
    handleStartWorkout,
  };
}

export { computeACWRTimeSeries } from './workout/computeACWRTimeSeries';
