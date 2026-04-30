import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '../../lib/supabase';
import { adjustForBiology } from '../../lib/engine/adjustForBiology';
import { getDailyNutrition, ensureDailyLedger } from '../../lib/api/nutritionService';
import { getDailyEngineState } from '../../lib/api/dailyPerformanceService';
import { ensureRollingScheduleFresh, getWeeklyReview } from '../../lib/api/scheduleService';
import {
  getAthleteContext,
  getActiveUserId,
  normalizeCycleDay,
} from '../../lib/api/athleteContextService';
import { getWeightHistory } from '../../lib/api/weightService';
import { logError } from '../../lib/utils/logger';
import type {
  ACWRResult,
  BiologyResult,
  DailyAthleteSummary,
  HydrationResult,
  NutritionFuelingTarget,
  WeightTrendResult,
  ScheduledActivityRow,
  MacroLedgerRow,
  WorkoutPrescription,
  WeeklyPlanEntryRow,
  WeightDataPoint,
  WeeklyComplianceReport,
} from '../../lib/engine/types';
import type { RecentTrainingSessionSummary } from '../../lib/engine/presentation/missionDashboard';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { addDays, todayLocalDate } from '../../lib/utils/date';
import { getFightCampStatus } from '../../lib/api/fightCampService';
import {
  buildGuidedPhaseTransitionViewModel,
  buildTodaysMissionViewModel,
  buildUnifiedPerformanceViewModel,
  nutritionNumbersFromUnifiedTarget,
  type GuidedPhaseTransitionViewModel,
  type ReadinessBand,
  type TodayMissionViewModel,
  type UnifiedPerformanceViewModel,
} from '../../lib/performance-engine';
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

interface RecentTrainingSessionRow {
  date: string;
  duration_minutes: number | null;
  intensity_srpe: number | null;
}

const EMPTY_NUTRITION: DashboardNutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  water: 0,
};

export type DashboardLoadErrorKind =
  | 'profile'
  | 'schedule'
  | 'engine_state'
  | 'nutrition'
  | 'weekly_review'
  | 'network'
  | 'unknown';

export interface DashboardLoadError {
  kind: DashboardLoadErrorKind;
  message: string;
}

interface DashboardDataState {
  error: DashboardLoadError | null;
  nutritionWarning: DashboardLoadError | null;
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
  weightHistory: WeightDataPoint[];
  dailyAthleteSummary: DailyAthleteSummary | null;
  todayPlanEntry: WeeklyPlanEntryRow | null;
  nutritionTargets: NutritionFuelingTarget | null;
  actualNutrition: DashboardNutritionTotals;
  weeklyReview: WeeklyComplianceReport | null;
  recentTrainingSessions: RecentTrainingSessionSummary[];
  campStatusLabel: string;
  campRisk: CampRiskAssessment | null;
  goalMode: 'fight_camp' | 'build_phase';
  hasActiveFightCamp: boolean;
  hasActiveWeightClassPlan: boolean;
  performanceContext: UnifiedPerformanceViewModel;
  todayMission: TodayMissionViewModel;
  phaseTransition: GuidedPhaseTransitionViewModel;
}

const INITIAL_STATE: DashboardDataState = {
  error: null,
  nutritionWarning: null,
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
  weightHistory: [],
  dailyAthleteSummary: null,
  todayPlanEntry: null,
  nutritionTargets: null,
  actualNutrition: EMPTY_NUTRITION,
  weeklyReview: null,
  recentTrainingSessions: [],
  campStatusLabel: 'Build Phase',
  campRisk: null,
  goalMode: 'build_phase',
  hasActiveFightCamp: false,
  hasActiveWeightClassPlan: false,
  performanceContext: buildUnifiedPerformanceViewModel(null),
  todayMission: buildTodaysMissionViewModel(null),
  phaseTransition: buildGuidedPhaseTransitionViewModel(null),
};

function getWeekStart(dateStr: string): string {
  const target = new Date(`${dateStr}T00:00:00`);
  const day = target.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(dateStr, mondayOffset);
}

function mapUnifiedReadinessToLegacy(band: ReadinessBand) {
  if (band === 'green') return 'Prime' as const;
  if (band === 'yellow' || band === 'orange') return 'Caution' as const;
  return 'Depleted' as const;
}

class DashboardLoadFailure extends Error {
  constructor(
    readonly kind: DashboardLoadErrorKind,
    readonly originalError: unknown,
  ) {
    super(originalError instanceof Error ? originalError.message : 'Dashboard load failed');
    this.name = 'DashboardLoadFailure';
  }
}

function failDashboardLoad(kind: DashboardLoadErrorKind, error: unknown): never {
  throw new DashboardLoadFailure(kind, error);
}

function isNetworkLikeError(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');

  return /network|fetch|timeout|timed out|offline|connection|abort/i.test(message);
}

function createDashboardLoadError(
  error: unknown,
  fallbackKind: DashboardLoadErrorKind = 'unknown',
): DashboardLoadError {
  const originalError = error instanceof DashboardLoadFailure
    ? error.originalError
    : error;
  const kind = error instanceof DashboardLoadFailure
    ? error.kind
    : isNetworkLikeError(originalError)
      ? 'network'
      : fallbackKind;

  return {
    kind,
    message: kind === 'nutrition'
      ? "Nutrition totals couldn't refresh. Fuel targets are still available, but logged intake may be out of date."
      : "Some data may be out of date. Try again before making training decisions.",
  };
}

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<DashboardDataState>(INITIAL_STATE);

  const { setReadiness, currentLevel } = useReadinessTheme();
  const requestIdRef = useRef(0);
  const firstDashboardLoadRef = useRef(true);

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
      if (forceRefresh || firstDashboardLoadRef.current) {
        try {
          await ensureRollingScheduleFresh(userId, todayStr, 4);
        } catch (error) {
          logError('useDashboardData.ensureRollingScheduleFresh', error, { userId });
          failDashboardLoad('schedule', error);
        }
      }

      let athleteContext: Awaited<ReturnType<typeof getAthleteContext>>;
      try {
        athleteContext = await getAthleteContext(userId);
      } catch (error) {
        logError('useDashboardData.getAthleteContext', error, { userId });
        failDashboardLoad('profile', error);
      }
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
        checkinResult,
        trainingSessionsResult,
        ledgerResult,
        engineState,
        weightHistory,
        weeklyReview,
        recentTrainingResult,
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
        getDailyEngineState(userId, todayStr, { forceRefresh }).catch((error) => {
          logError('useDashboardData.getDailyEngineState', error, { userId, todayStr });
          failDashboardLoad('engine_state', error);
        }),
        getWeightHistory(userId, 30),
        getWeeklyReview(userId, getWeekStart(todayStr)).catch((error) => {
          logError('useDashboardData.getWeeklyReview', error, { userId });
          return null;
        }),
        supabase
          .from('training_sessions')
          .select('date,duration_minutes,intensity_srpe')
          .eq('user_id', userId)
          .gte('date', addDays(todayStr, -13))
          .lte('date', todayStr)
          .order('date', { ascending: true }),
      ]);

      if (!isCurrentRequest()) {
        return;
      }

      if (checkinResult.error) {
        logError('useDashboardData.dailyCheckin', checkinResult.error, { userId, todayStr });
        failDashboardLoad(
          isNetworkLikeError(checkinResult.error) ? 'network' : 'unknown',
          checkinResult.error,
        );
      }

      if (trainingSessionsResult.error) {
        logError('useDashboardData.trainingSessions', trainingSessionsResult.error, { userId, todayStr });
        failDashboardLoad(
          isNetworkLikeError(trainingSessionsResult.error) ? 'network' : 'unknown',
          trainingSessionsResult.error,
        );
      }

      const nutritionWarning = ledgerResult.error
        ? createDashboardLoadError(new DashboardLoadFailure('nutrition', ledgerResult.error))
        : null;
      if (ledgerResult.error) {
        logError('useDashboardData.macroLedger', ledgerResult.error, { userId, todayStr });
      }

      const checkinData = checkinResult.data;
      const trainingSessions = trainingSessionsResult.data;
      const ledger = ledgerResult.error ? null : ledgerResult.data;
      const checkin = (checkinData as DailyCheckinRow | null) ?? null;
      const cycleDay = normalizeCycleDay(checkin?.cycle_day ?? profile?.cycle_day ?? null);
      if (recentTrainingResult.error) {
        logError('useDashboardData.recentTrainingSessions', recentTrainingResult.error, { userId });
      }
      const recentTrainingSessions = recentTrainingResult.error
        ? []
        : ((recentTrainingResult.data ?? []) as RecentTrainingSessionRow[]).map((session) => ({
          date: session.date,
          total_volume: null,
          session_rpe: session.intensity_srpe,
          duration_minutes: session.duration_minutes,
        }));

      let biology: BiologyResult | null = null;
      if (profile?.biological_sex === 'female' && profile.cycle_tracking && cycleDay != null) {
        try {
          biology = adjustForBiology({ cycleDay });
        } catch (error) {
          logError('useDashboardData.adjustForBiology', error, { userId, cycleDay });
        }
      }

      setReadiness(
        engineState.unifiedPerformance?.canonicalOutputs.readiness.readinessBand
          ? mapUnifiedReadinessToLegacy(engineState.unifiedPerformance.canonicalOutputs.readiness.readinessBand)
          : engineState.readinessState,
      );
      const performanceContext = buildUnifiedPerformanceViewModel(engineState.unifiedPerformance);
      const macroLedger = (ledger as MacroLedgerRow | null) ?? null;
      const todayMission = buildTodaysMissionViewModel(engineState.unifiedPerformance, {
        checkInLogged: Boolean(checkin),
        trainingCompleted: Boolean(trainingSessions && trainingSessions.length > 0),
        fuelingStarted: Boolean(
          (macroLedger?.actual_calories ?? 0) > 0
          || (macroLedger?.actual_protein ?? 0) > 0
          || (macroLedger?.actual_carbs ?? 0) > 0
          || (macroLedger?.actual_fat ?? 0) > 0,
        ),
        weeklyPlanAvailable: Boolean(engineState.primaryEnginePlanEntry || (engineState.scheduledActivities ?? []).length > 0),
      });
      const phaseTransition = buildGuidedPhaseTransitionViewModel(engineState.unifiedPerformance);
      const canonicalNutritionNumbers = nutritionNumbersFromUnifiedTarget(
        engineState.unifiedPerformance?.canonicalOutputs.nutritionTarget,
      );
      const resolvedFuel = {
        calories: Math.round(canonicalNutritionNumbers.calories ?? engineState.mission.fuelDirective.calories),
        protein: Math.round(canonicalNutritionNumbers.proteinG ?? engineState.mission.fuelDirective.protein),
        carbs: Math.round(canonicalNutritionNumbers.carbsG ?? engineState.mission.fuelDirective.carbs),
        fat: Math.round(canonicalNutritionNumbers.fatG ?? engineState.mission.fuelDirective.fat),
      };
      setState({
        error: null,
        nutritionWarning,
        acwr: engineState.acwr,
        biology,
        hydration: engineState.hydration,
        checkinDone: Boolean(checkin),
        sessionDone: Boolean(trainingSessions && trainingSessions.length > 0),
        sleepQuality: checkin?.sleep_quality ?? null,
        morningWeight: checkin?.morning_weight != null ? String(checkin.morning_weight) : null,
        readinessSubjective: checkin?.readiness ?? null,
        readinessScore: engineState.unifiedPerformance?.canonicalOutputs.readiness.overallReadiness
          ?? engineState.readinessProfile.overallReadiness,
        todayActivities: engineState.scheduledActivities ?? [],
        primaryActivity: engineState.primaryScheduledActivity,
        currentLedger: macroLedger,
        prescriptionMessage: engineState.mission.summary,
        workoutPrescription: (engineState.workoutPrescription as WorkoutPrescription | null) ?? null,
        weightTrend: engineState.objectiveContext.weightTrend ?? null,
        weightHistory,
        dailyAthleteSummary: engineState.mission,
        todayPlanEntry: (engineState.primaryEnginePlanEntry as WeeklyPlanEntryRow | null) ?? null,
        nutritionTargets: {
          ...engineState.nutritionTargets,
          adjustedCalories: resolvedFuel.calories,
          protein: resolvedFuel.protein,
          carbs: resolvedFuel.carbs,
          fat: resolvedFuel.fat,
          message: performanceContext.nutrition.explanation,
        },
        actualNutrition: EMPTY_NUTRITION,
        weeklyReview,
        recentTrainingSessions,
        campStatusLabel,
        campRisk: engineState.campRisk,
        goalMode: athleteContext.goalMode,
        hasActiveFightCamp,
        hasActiveWeightClassPlan: Boolean(profile?.active_weight_class_plan_id),
        performanceContext,
        todayMission,
        phaseTransition,
      });
      firstDashboardLoadRef.current = false;
      setLoading(false);
      setRefreshing(false);

      void (async () => {
        try {
          await ensureDailyLedger(userId, todayStr, {
            tdee: engineState.nutritionTargets.tdee,
            calories: resolvedFuel.calories,
            protein: resolvedFuel.protein,
            carbs: resolvedFuel.carbs,
            fat: resolvedFuel.fat,
            weightCorrectionDeficit: engineState.nutritionTargets.weightCorrectionDeficit,
            targetSource: engineState.nutritionTargets.source,
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
            nutritionWarning: null,
            actualNutrition: actuals,
          }));
        } catch (error) {
          if (!isCurrentRequest()) {
            return;
          }

          logError('useDashboardData.getDailyNutrition', error, { userId });
          setState((currentState) => ({
            ...currentState,
            nutritionWarning: createDashboardLoadError(new DashboardLoadFailure('nutrition', error)),
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
        error: createDashboardLoadError(error),
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



















