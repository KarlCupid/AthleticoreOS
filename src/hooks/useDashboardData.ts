import { useState, useEffect, useCallback } from 'react';
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

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [acwr, setAcwr] = useState<ACWRResult | null>(null);
  const [biology, setBiology] = useState<BiologyResult | null>(null);
  const [hydration, setHydration] = useState<HydrationResult | null>(null);

  const [checkinDone, setCheckinDone] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [morningWeight, setMorningWeight] = useState<string | null>(null);
  const [readinessSubjective, setReadinessSubjective] = useState<number | null>(null);

  const [todayActivities, setTodayActivities] = useState<ScheduledActivityRow[]>([]);
  const [primaryActivity, setPrimaryActivity] = useState<ScheduledActivityRow | null>(null);
  const [currentLedger, setCurrentLedger] = useState<MacroLedgerRow | null>(null);
  const [prescriptionMessage, setPrescriptionMessage] = useState<string | null>(null);
  const [workoutPrescription, setWorkoutPrescription] = useState<WorkoutPrescription | null>(null);
  const [weightTrend, setWeightTrend] = useState<WeightTrendResult | null>(null);
  const [dailyMission, setDailyMission] = useState<DailyMission | null>(null);
  const [todayPlanEntry, setTodayPlanEntry] = useState<WeeklyPlanEntryRow | null>(null);

  const { setReadiness, currentLevel } = useReadinessTheme();

  const [nutritionTargets, setNutritionTargets] = useState<ResolvedNutritionTargets | null>(null);
  const [actualNutrition, setActualNutrition] = useState<DashboardNutritionTotals>(EMPTY_NUTRITION);
  const [activeCutProtocol, setActiveCutProtocol] = useState<DailyCutProtocolRow | null>(null);
  const [campStatusLabel, setCampStatusLabel] = useState<string>('Build Phase');
  const [campRisk, setCampRisk] = useState<CampRiskAssessment | null>(null);
  const [goalMode, setGoalMode] = useState<'fight_camp' | 'build_phase'>('build_phase');
  const [hasActiveFightCamp, setHasActiveFightCamp] = useState(false);

  const loadDashboardData = useCallback(async (forceRefresh: boolean = false) => {
    const userId = await getActiveUserId();
    if (!userId) {
      setCampRisk(null);
      setGoalMode('build_phase');
      setHasActiveFightCamp(false);
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
      setGoalMode(athleteContext.goalMode);

      let campStatus: Awaited<ReturnType<typeof getFightCampStatus>> | null = null;
      try {
        campStatus = await getFightCampStatus(userId, todayStr);
        setHasActiveFightCamp(Boolean(campStatus.camp));
        setCampStatusLabel(campStatus.label);
      } catch (error) {
        logError('useDashboardData.getFightCampStatus', error, { userId });
        setHasActiveFightCamp(false);
        setCampStatusLabel('Build Phase');
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

      const checkin = (checkinData as DailyCheckinRow | null) ?? null;

      setCheckinDone(Boolean(checkin));
      if (checkin) {
        setSleepQuality(checkin.sleep_quality);
        setMorningWeight(checkin.morning_weight != null ? String(checkin.morning_weight) : null);
        setReadinessSubjective(checkin.readiness);
      } else {
        setSleepQuality(null);
        setMorningWeight(null);
        setReadinessSubjective(null);
      }

      setSessionDone(Boolean(trainingSessions && trainingSessions.length > 0));
      setCurrentLedger((ledger as MacroLedgerRow | null) ?? null);
      const cycleDay = normalizeCycleDay(checkin?.cycle_day ?? profile?.cycle_day ?? null);
      setTodayActivities(engineState.scheduledActivities ?? []);
      setPrimaryActivity(engineState.primaryScheduledActivity);
      setTodayPlanEntry((engineState.primaryEnginePlanEntry as WeeklyPlanEntryRow | null) ?? null);
      const currentWeightTrend = engineState.objectiveContext.weightTrend ?? null;
      setWeightTrend(currentWeightTrend);
      setAcwr(engineState.acwr);
      setActiveCutProtocol((engineState.cutProtocol as DailyCutProtocolRow | null) ?? null);
      setReadiness(engineState.readinessState);
      setWorkoutPrescription((engineState.workoutPrescription as WorkoutPrescription | null) ?? null);
      setDailyMission(engineState.mission);
      setCampRisk(engineState.campRisk);
      setNutritionTargets(engineState.nutritionTargets);
      setHydration(engineState.hydration);
      setPrescriptionMessage(engineState.mission.summary);
      setLoading(false);
      setRefreshing(false);

      void (async () => {
        if (!profile) {
          setBiology(null);
          setHydration(null);
          setNutritionTargets(null);
          setActualNutrition(EMPTY_NUTRITION);
          return;
        }

        if (profile.biological_sex === 'female' && profile.cycle_tracking && cycleDay != null) {
          try {
            const bioResult = adjustForBiology({ cycleDay });
            setBiology(bioResult);
          } catch (error) {
            logError('useDashboardData.adjustForBiology', error, { userId, cycleDay });
            setBiology(null);
          }
        } else {
          setBiology(null);
        }

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
          const actuals = computeActualNutrition(
            nutritionData.foodLog as {
              logged_calories?: number | null;
              logged_protein?: number | null;
              logged_carbs?: number | null;
              logged_fat?: number | null;
            }[],
            nutritionData.summary?.total_water_oz,
          );
          setActualNutrition(actuals);
        } catch (error) {
          logError('useDashboardData.getDailyNutrition', error, { userId });
          setActualNutrition(EMPTY_NUTRITION);
        }
      })();
    } catch (error) {
      logError('useDashboardData.loadDashboardData', error, { userId });
      setCampRisk(null);
      setLoading(false);
      setRefreshing(false);
    }
  }, [setReadiness]);

  useEffect(() => {
    let isActive = true;
    InteractionManager.runAfterInteractions(() => {
      if (isActive) {
        void loadDashboardData();
      }
    });
    return () => {
      isActive = false;
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
    acwr,
    biology,
    hydration,
    checkinDone,
    sessionDone,
    sleepQuality,
    morningWeight,
    readinessSubjective,
    todayActivities,
    primaryActivity,
    currentLedger,
    currentLevel,
    prescriptionMessage,
    workoutPrescription,
    todayPlanEntry,
    weightTrend,
    nutritionTargets,
    actualNutrition,
    activeCutProtocol,
    campStatusLabel,
    campRisk,
    dailyMission,
    goalMode,
    hasActiveFightCamp,
  };
}



















