import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '../../lib/supabase';
import { adjustForBiology } from '../../lib/engine/adjustForBiology';
import { getDailyNutrition, ensureDailyLedger } from '../../lib/api/nutritionService';
import { getDailyEngineState } from '../../lib/api/dailyMissionService';
import { generateRollingSchedule } from '../../lib/api/scheduleService';
import {
  getAthleteContext,
  getActiveUserId,
  normalizeCycleDay,
} from '../../lib/api/athleteContextService';
import { logError } from '../../lib/utils/logger';
import type {
  ACWRResult,
  BiologyResult,
  DailyMission,
  HydrationResult,
  ResolvedNutritionTargets,
  WeightTrendResult,
  ScheduledActivityRow,
  MacroLedgerRow,
  WorkoutPrescription,
  DailyCutProtocolRow,
  WeeklyPlanEntryRow,
} from '../../lib/engine/types';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { todayLocalDate } from '../../lib/utils/date';
import { getFightCampStatus } from '../../lib/api/fightCampService';
import type { CampRiskAssessment } from '../../lib/engine/calculateCampRisk';
import {
  computeActualNutrition,
  type DashboardNutritionTotals,
} from './dashboard/utils';

interface DailyCheckinRow {
  cycle_day?: number | null;
  sleep_quality: number;
  morning_weight: number | null;
  readiness: number;
}

const EMPTY_NUTRITION: DashboardNutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  water: 0,
};

interface DashboardDataState {
  acwr: ACWRResult | null;
  biology: BiologyResult | null;
  hydration: HydrationResult | null;
  checkinDone: boolean;
  sessionDone: boolean;
  sleepQuality: number | null;
  morningWeight: string | null;
  readinessSubjective: number | null;
  readinessScore: number | null;
  todayActivities: ScheduledActivityRow[];
  primaryActivity: ScheduledActivityRow | null;
  currentLedger: MacroLedgerRow | null;
  prescriptionMessage: string | null;
  workoutPrescription: WorkoutPrescription | null;
  weightTrend: WeightTrendResult | null;
  dailyMission: DailyMission | null;
  todayPlanEntry: WeeklyPlanEntryRow | null;
  nutritionTargets: ResolvedNutritionTargets | null;
  actualNutrition: DashboardNutritionTotals;
  activeCutProtocol: DailyCutProtocolRow | null;
  campStatusLabel: string;
  campRisk: CampRiskAssessment | null;
  goalMode: 'fight_camp' | 'build_phase';
  hasActiveFightCamp: boolean;
  hasActiveCutPlan: boolean;
}

const INITIAL_STATE: DashboardDataState = {
  acwr: null,
  biology: null,
  hydration: null,
  checkinDone: false,
  sessionDone: false,
  sleepQuality: null,
  morningWeight: null,
  readinessSubjective: null,
  readinessScore: null,
  todayActivities: [],
  primaryActivity: null,
  currentLedger: null,
  prescriptionMessage: null,
  workoutPrescription: null,
  weightTrend: null,
  dailyMission: null,
  todayPlanEntry: null,
  nutritionTargets: null,
  actualNutrition: EMPTY_NUTRITION,
  activeCutProtocol: null,
  campStatusLabel: 'Build Phase',
  campRisk: null,
  goalMode: 'build_phase',
  hasActiveFightCamp: false,
  hasActiveCutPlan: false,
};

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<DashboardDataState>(INITIAL_STATE);

  const { setReadiness, currentLevel } = useReadinessTheme();
  const requestIdRef = useRef(0);

  const loadDashboardData = useCallback(async (forceRefresh: boolean = false) => {
    const requestId = ++requestIdRef.current;
    const userId = await getActiveUserId();

    const isCurrentRequest = () => requestId === requestIdRef.current;

    if (!userId) {
      if (!isCurrentRequest()) {
        return;
      }

      setState(INITIAL_STATE);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const todayStr = todayLocalDate();

    try {
      void generateRollingSchedule(userId, 4).catch((error) => {
        logError('useDashboardData.generateRollingSchedule', error, { userId });
      });

      const athleteContext = await getAthleteContext(userId);
      const profile = athleteContext.profile;

      let hasActiveFightCamp = false;
      let campStatusLabel = 'Build Phase';
      try {
        const campStatus = await getFightCampStatus(userId, todayStr);
        hasActiveFightCamp = Boolean(campStatus.camp);
        campStatusLabel = campStatus.label;
      } catch (error) {
        logError('useDashboardData.getFightCampStatus', error, { userId });
      }

      const [
        { data: checkinData },
        { data: trainingSessions },
        { data: ledger },
        engineState,
      ] = await Promise.all([
        supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr)
          .maybeSingle(),
        supabase
          .from('training_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr),
        supabase
          .from('macro_ledger')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr)
          .maybeSingle(),
        getDailyEngineState(userId, todayStr, { forceRefresh }),
      ]);

      if (!isCurrentRequest()) {
        return;
      }

      const checkin = (checkinData as DailyCheckinRow | null) ?? null;
      const cycleDay = normalizeCycleDay(checkin?.cycle_day ?? profile?.cycle_day ?? null);

      let biology: BiologyResult | null = null;
      if (profile?.biological_sex === 'female' && profile.cycle_tracking && cycleDay != null) {
        try {
          biology = adjustForBiology({ cycleDay });
        } catch (error) {
          logError('useDashboardData.adjustForBiology', error, { userId, cycleDay });
        }
      }

      setReadiness(engineState.readinessState);
      setState({
        acwr: engineState.acwr,
        biology,
        hydration: engineState.hydration,
        checkinDone: Boolean(checkin),
        sessionDone: Boolean(trainingSessions && trainingSessions.length > 0),
        sleepQuality: checkin?.sleep_quality ?? null,
        morningWeight: checkin?.morning_weight != null ? String(checkin.morning_weight) : null,
        readinessSubjective: checkin?.readiness ?? null,
        readinessScore: engineState.readinessProfile.overallReadiness,
        todayActivities: engineState.scheduledActivities ?? [],
        primaryActivity: engineState.primaryScheduledActivity,
        currentLedger: (ledger as MacroLedgerRow | null) ?? null,
        prescriptionMessage: engineState.mission.summary,
        workoutPrescription: (engineState.workoutPrescription as WorkoutPrescription | null) ?? null,
        weightTrend: engineState.objectiveContext.weightTrend ?? null,
        dailyMission: engineState.mission,
        todayPlanEntry: (engineState.primaryEnginePlanEntry as WeeklyPlanEntryRow | null) ?? null,
        nutritionTargets: engineState.nutritionTargets,
        actualNutrition: EMPTY_NUTRITION,
        activeCutProtocol: (engineState.cutProtocol as DailyCutProtocolRow | null) ?? null,
        campStatusLabel,
        campRisk: engineState.campRisk,
        goalMode: athleteContext.goalMode,
        hasActiveFightCamp,
        hasActiveCutPlan: Boolean(profile?.active_cut_plan_id),
      });
      setLoading(false);
      setRefreshing(false);

      void (async () => {
        try {
          await ensureDailyLedger(userId, todayStr, {
            tdee: engineState.nutritionTargets.tdee,
            calories: engineState.mission.fuelDirective.calories,
            protein: engineState.mission.fuelDirective.protein,
            carbs: engineState.mission.fuelDirective.carbs,
            fat: engineState.mission.fuelDirective.fat,
            weightCorrectionDeficit: engineState.nutritionTargets.weightCorrectionDeficit,
            targetSource: engineState.mission.fuelDirective.source === 'weight_cut_protocol'
              ? 'weight_cut_protocol'
              : engineState.mission.fuelDirective.source === 'daily_engine'
                ? 'daily_activity_adjusted'
                : 'base',
          });
        } catch (error) {
            logError('useDashboardData.ensureDailyLedger', error, { userId });
        }

        try {
          const nutritionData = await getDailyNutrition(userId, todayStr);
          if (!isCurrentRequest()) {
            return;
          }

          const actuals = computeActualNutrition(
            nutritionData.foodLog as {
              logged_calories?: number | null;
              logged_protein?: number | null;
              logged_carbs?: number | null;
              logged_fat?: number | null;
            }[],
            nutritionData.summary?.total_water_oz,
          );
          setState((currentState) => ({
            ...currentState,
            actualNutrition: actuals,
          }));
        } catch (error) {
          if (!isCurrentRequest()) {
            return;
          }

          logError('useDashboardData.getDailyNutrition', error, { userId });
          setState((currentState) => ({
            ...currentState,
            actualNutrition: EMPTY_NUTRITION,
          }));
        }
      })();
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      logError('useDashboardData.loadDashboardData', error, { userId });
      setState((currentState) => ({
        ...currentState,
        campRisk: null,
      }));
      setLoading(false);
      setRefreshing(false);
    }
  }, [setReadiness]);

  useEffect(() => {
    let isActive = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (isActive) {
        void loadDashboardData();
      }
    });
    return () => {
      isActive = false;
      requestIdRef.current += 1;
      task.cancel?.();
    };
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData(true);
  }, [loadDashboardData]);

  return {
    loading,
    refreshing,
    onRefresh,
    currentLevel,
    ...state,
  };
}



















