import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '../../lib/supabase';
import { getDailyEngineState } from '../../lib/api/dailyPerformanceService';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import {
  buildGuidedReadinessViewModel,
  buildUnifiedPerformanceViewModel,
  type GuidedReadinessViewModel,
  type UnifiedPerformanceViewModel,
} from '../../lib/performance-engine';
import type {
  CoachingFocus,
  DailyCoachDebrief,
  NutritionBarrier,
  Phase,
  PrimaryLimiter,
} from '../../lib/engine/types';
import { formatLocalDate, formatShortWeekdayMonthDay, todayLocalDate } from '../../lib/utils/date';
import { logError, logWarn } from '../../lib/utils/logger';
import { calculateCaloriesFromMacros } from '../../lib/utils/nutrition';
import type { NutritionStatus } from '../components/NutritionCheckIn';

export interface NutritionTrackerState {
  targets: { calories: number; protein: number; carbs: number; fat: number } | null;
  actual: { calories: number; protein: number; carbs: number; fat: number };
  waterOz: number;
  mealCount: number;
}

export type NutritionActualDraft = Record<keyof NutritionTrackerState['actual'], string>;

export interface LogScreenInitialValues {
  weight: string;
  sleep: number;
  readiness: number;
  energyLevel: number;
  painLevel: number;
  readinessScore: number | null;
  stressLevel: number;
  sorenessLevel: number;
  confidenceLevel: number;
  primaryLimiter: PrimaryLimiter;
  macroAdherence: NutritionStatus;
  nutritionBarrier: NutritionBarrier;
  coachingFocus: CoachingFocus;
  savedDebrief: DailyCoachDebrief | null;
}

export interface TrainingLoadSummary {
  totalMinutes: number;
  weightedIntensity: number;
  totalLoad: number;
  sessionCount: number;
}

export interface AcwrContextState {
  ratio: number;
  status: 'safe' | 'caution' | 'redline';
  acute: number;
  chronic: number;
  phase: Phase;
  hasActiveWeightClassPlan: boolean;
}

export interface PreviousDebriefState {
  education_topic?: string | null;
  risk_flags?: string[] | null;
  primary_limiter?: PrimaryLimiter | null;
}

interface DailyCheckinRow {
  morning_weight: number | null;
  sleep_quality: number | null;
  readiness: number | null;
  energy_level?: number | null;
  pain_level?: number | null;
  readiness_score?: number | null;
  macro_adherence: NutritionStatus;
  stress_level?: number | null;
  soreness_level?: number | null;
  confidence_level?: number | null;
  primary_limiter?: PrimaryLimiter | null;
  nutrition_barrier?: NutritionBarrier | null;
  coaching_focus?: CoachingFocus | null;
  coach_debrief?: unknown;
}

interface ActivityLoadRow {
  duration_min: number | null;
  intensity: number | null;
}

interface MacroLedgerRow {
  prescribed_calories: number | null;
  prescribed_protein: number | null;
  prescribed_carbs: number | null;
  prescribed_fats: number | null;
  actual_calories: number | null;
  actual_protein: number | null;
  actual_carbs: number | null;
  actual_fat: number | null;
}

interface DailyNutritionSummaryRow {
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  total_water_oz: number | null;
  meal_count: number | null;
}

interface LogScreenDataState {
  loadingContext: boolean;
  version: number;
  initialValues: LogScreenInitialValues;
  previousDebrief: PreviousDebriefState | null;
  todayTrainingLoad: TrainingLoadSummary;
  nutritionTracker: NutritionTrackerState;
  nutritionActualDraft: NutritionActualDraft;
  nutritionWaterDraft: string;
  acwrContext: AcwrContextState;
  performanceContext: UnifiedPerformanceViewModel;
  guidedReadiness: GuidedReadinessViewModel;
}

const DEFAULT_INITIAL_VALUES: LogScreenInitialValues = {
  weight: '',
  sleep: 3,
  readiness: 3,
  energyLevel: 3,
  painLevel: 1,
  readinessScore: null,
  stressLevel: 3,
  sorenessLevel: 3,
  confidenceLevel: 3,
  primaryLimiter: 'none',
  macroAdherence: null,
  nutritionBarrier: 'none',
  coachingFocus: 'recovery',
  savedDebrief: null,
};

const DEFAULT_TRAINING_LOAD: TrainingLoadSummary = {
  totalMinutes: 0,
  weightedIntensity: 0,
  totalLoad: 0,
  sessionCount: 0,
};

const DEFAULT_TRACKER_STATE: NutritionTrackerState = {
  targets: null,
  actual: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  waterOz: 0,
  mealCount: 0,
};

const DEFAULT_NUTRITION_DRAFT: NutritionActualDraft = {
  calories: '0',
  protein: '0',
  carbs: '0',
  fat: '0',
};

const DEFAULT_ACWR_CONTEXT: AcwrContextState = {
  ratio: 0,
  status: 'safe',
  acute: 0,
  chronic: 0,
  phase: 'off-season',
  hasActiveWeightClassPlan: false,
};

function pctDelta(actual: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 1;
  return Math.abs(actual - target) / target;
}

function roundPercent(actual: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

function assessTrackedNutrition(
  targets: NutritionTrackerState['targets'],
  actual: NutritionTrackerState['actual'],
): NutritionStatus | null {
  if (!targets) return null;

  const hasAnyActual = actual.calories > 0 || actual.protein > 0 || actual.carbs > 0 || actual.fat > 0;
  if (!hasAnyActual) return null;

  const calDelta = pctDelta(actual.calories, targets.calories);
  const macroDeltas = [
    pctDelta(actual.protein, targets.protein),
    pctDelta(actual.carbs, targets.carbs),
    pctDelta(actual.fat, targets.fat),
  ];
  const macroTight = macroDeltas.filter((delta) => delta <= 0.15).length;
  const macroLoose = macroDeltas.filter((delta) => delta <= 0.25).length;

  return calDelta <= 0.1 && macroTight >= 2
    ? 'Target Met'
    : calDelta <= 0.2 && macroLoose >= 2
      ? 'Close Enough'
      : 'Missed It';
}

function isDailyCoachDebrief(value: unknown): value is DailyCoachDebrief {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.headline === 'string' && Array.isArray(v.action_steps) && typeof v.education_topic === 'string';
}

function isPrimaryLimiter(value: unknown): value is PrimaryLimiter {
  return ['sleep', 'stress', 'soreness', 'nutrition', 'hydration', 'time', 'none'].includes(String(value));
}

function isNutritionBarrier(value: unknown): value is NutritionBarrier {
  return ['appetite', 'timing', 'cravings', 'prep', 'social', 'none'].includes(String(value));
}

function isCoachingFocus(value: unknown): value is CoachingFocus {
  return ['recovery', 'execution', 'consistency', 'nutrition'].includes(String(value));
}

function buildDefaultState(): LogScreenDataState {
  return {
    loadingContext: true,
    version: 0,
    initialValues: DEFAULT_INITIAL_VALUES,
    previousDebrief: null,
    todayTrainingLoad: DEFAULT_TRAINING_LOAD,
    nutritionTracker: DEFAULT_TRACKER_STATE,
    nutritionActualDraft: DEFAULT_NUTRITION_DRAFT,
    nutritionWaterDraft: '0',
    acwrContext: DEFAULT_ACWR_CONTEXT,
    performanceContext: buildUnifiedPerformanceViewModel(null),
    guidedReadiness: buildGuidedReadinessViewModel(null),
  };
}

export function useLogScreenData() {
  const logDate = todayLocalDate();
  const nutritionDateObj = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }, [logDate]);
  const nutritionLogDate = useMemo(() => formatLocalDate(nutritionDateObj), [nutritionDateObj]);
  const todayFormatted = useMemo(() => formatShortWeekdayMonthDay(logDate), [logDate]);
  const nutritionFormatted = useMemo(() => formatShortWeekdayMonthDay(nutritionDateObj), [nutritionDateObj]);

  const [state, setState] = useState<LogScreenDataState>(() => buildDefaultState());
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadContext = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, loadingContext: true }));

    try {
      const userId = await getActiveUserId();
      if (!userId) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setState((prev) => ({ ...prev, loadingContext: false }));
        return;
      }

      const [
        todayRes,
        yesterdayRes,
        activityRes,
        ledgerRes,
        nutritionSummaryRes,
        engineState,
      ] = await Promise.all([
        supabase.from('daily_checkins').select('*').eq('user_id', userId).eq('date', logDate).maybeSingle(),
        supabase.from('daily_checkins').select('coach_debrief,primary_limiter').eq('user_id', userId).eq('date', nutritionLogDate).maybeSingle(),
        supabase.from('activity_log').select('duration_min,intensity').eq('user_id', userId).eq('date', logDate),
        supabase
          .from('macro_ledger')
          .select('prescribed_calories,prescribed_protein,prescribed_carbs,prescribed_fats,actual_calories,actual_protein,actual_carbs,actual_fat')
          .eq('user_id', userId)
          .eq('date', nutritionLogDate)
          .maybeSingle(),
        supabase
          .from('daily_nutrition_summary')
          .select('total_calories,total_protein,total_carbs,total_fat,total_water_oz,meal_count')
          .eq('user_id', userId)
          .eq('date', nutritionLogDate)
          .maybeSingle(),
        getDailyEngineState(userId, logDate),
      ]);

      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      const todayCheckin = (todayRes.data as DailyCheckinRow | null) ?? null;
      const prior = yesterdayRes.data as { coach_debrief?: unknown; primary_limiter?: PrimaryLimiter | null } | null;
      const previousDebrief = prior?.coach_debrief && typeof prior.coach_debrief === 'object'
        ? {
          education_topic: typeof (prior.coach_debrief as Record<string, unknown>).education_topic === 'string'
            ? ((prior.coach_debrief as Record<string, unknown>).education_topic as string)
            : null,
          risk_flags: Array.isArray((prior.coach_debrief as Record<string, unknown>).risk_flags)
            ? ((prior.coach_debrief as Record<string, unknown>).risk_flags as unknown[]).filter((entry): entry is string => typeof entry === 'string')
            : null,
          primary_limiter: isPrimaryLimiter(prior.primary_limiter) ? prior.primary_limiter : null,
        }
        : null;

      if (activityRes.error) {
        logWarn('useLogScreenData.loadContext.activityLog', activityRes.error, { targetDate: logDate });
      }
      if (ledgerRes.error) {
        logWarn('useLogScreenData.loadContext.macroLedger', ledgerRes.error, { targetDate: nutritionLogDate });
      }
      if (nutritionSummaryRes.error) {
        logWarn('useLogScreenData.loadContext.nutritionSummary', nutritionSummaryRes.error, { targetDate: nutritionLogDate });
      }

      const activityRows = (activityRes.data as ActivityLoadRow[] | null) ?? [];
      const validLoadRows = activityRows.filter((row) =>
        Number.isFinite(row.duration_min) && row.duration_min != null && row.duration_min > 0 &&
        Number.isFinite(row.intensity) && row.intensity != null && row.intensity > 0,
      );
      const totalMinutes = validLoadRows.reduce((sum, row) => sum + (row.duration_min as number), 0);
      const weightedIntensity = totalMinutes > 0
        ? Math.round(validLoadRows.reduce((sum, row) => sum + ((row.duration_min as number) * (row.intensity as number)), 0) / totalMinutes)
        : 0;

      const ledger = (ledgerRes.data as MacroLedgerRow | null) ?? null;
      const nutritionSummary = (nutritionSummaryRes.data as DailyNutritionSummaryRow | null) ?? null;
      const targets = ledger
        ? {
          calories: calculateCaloriesFromMacros(
            ledger.prescribed_protein ?? 0,
            ledger.prescribed_carbs ?? 0,
            ledger.prescribed_fats ?? 0,
          ),
          protein: ledger.prescribed_protein ?? 0,
          carbs: ledger.prescribed_carbs ?? 0,
          fat: ledger.prescribed_fats ?? 0,
        }
        : null;
      const actual = {
        calories: calculateCaloriesFromMacros(
          nutritionSummary?.total_protein ?? ledger?.actual_protein ?? 0,
          nutritionSummary?.total_carbs ?? ledger?.actual_carbs ?? 0,
          nutritionSummary?.total_fat ?? ledger?.actual_fat ?? 0,
        ),
        protein: nutritionSummary?.total_protein ?? ledger?.actual_protein ?? 0,
        carbs: nutritionSummary?.total_carbs ?? ledger?.actual_carbs ?? 0,
        fat: nutritionSummary?.total_fat ?? ledger?.actual_fat ?? 0,
      };
      const autoMacroAdherence = assessTrackedNutrition(targets, actual);

      const nextState: Omit<LogScreenDataState, 'version'> = {
        loadingContext: false,
        initialValues: {
          weight: todayCheckin?.morning_weight != null ? String(todayCheckin.morning_weight) : '',
          sleep: todayCheckin?.sleep_quality ?? 3,
          readiness: todayCheckin?.readiness ?? 3,
          energyLevel: todayCheckin?.energy_level ?? todayCheckin?.readiness ?? 3,
          painLevel: todayCheckin?.pain_level ?? 1,
          readinessScore: todayCheckin?.readiness_score ?? null,
          stressLevel: todayCheckin?.stress_level ?? 3,
          sorenessLevel: todayCheckin?.soreness_level ?? 3,
          confidenceLevel: todayCheckin?.confidence_level ?? 3,
          macroAdherence: todayCheckin?.macro_adherence ?? autoMacroAdherence ?? null,
          primaryLimiter: isPrimaryLimiter(todayCheckin?.primary_limiter) ? todayCheckin.primary_limiter : 'none',
          nutritionBarrier: isNutritionBarrier(todayCheckin?.nutrition_barrier) ? todayCheckin.nutrition_barrier : 'none',
          coachingFocus: isCoachingFocus(todayCheckin?.coaching_focus) ? todayCheckin.coaching_focus : 'recovery',
          savedDebrief: isDailyCoachDebrief(todayCheckin?.coach_debrief) ? todayCheckin.coach_debrief : null,
        },
        previousDebrief,
        todayTrainingLoad: {
          totalMinutes,
          weightedIntensity,
          totalLoad: totalMinutes * weightedIntensity,
          sessionCount: validLoadRows.length,
        },
        nutritionTracker: {
          targets,
          actual,
          waterOz: nutritionSummary?.total_water_oz ?? 0,
          mealCount: nutritionSummary?.meal_count ?? 0,
        },
        nutritionActualDraft: {
          calories: String(Math.round(actual.calories)),
          protein: String(Math.round(actual.protein)),
          carbs: String(Math.round(actual.carbs)),
          fat: String(Math.round(actual.fat)),
        },
        nutritionWaterDraft: String(Math.round(nutritionSummary?.total_water_oz ?? 0)),
        acwrContext: {
          ratio: engineState.acwr.ratio,
          status: engineState.acwr.status,
          acute: engineState.acwr.acute,
          chronic: engineState.acwr.chronic,
          phase: engineState.objectiveContext.phase,
          hasActiveWeightClassPlan: engineState.objectiveContext.hasActiveWeightClassPlan,
        },
        performanceContext: buildUnifiedPerformanceViewModel(engineState.unifiedPerformance),
        guidedReadiness: buildGuidedReadinessViewModel(engineState.unifiedPerformance),
      };

      setState((prev) => ({
        ...nextState,
        version: prev.version + 1,
      }));
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      logError('useLogScreenData.loadContext', error, { targetDate: logDate });
      setState((prev) => ({ ...prev, loadingContext: false }));
    }
  }, [logDate, nutritionLogDate]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const trackedNutritionSummary = useMemo(() => {
    const targets = state.nutritionTracker.targets;
    const actual = state.nutritionTracker.actual;
    if (!targets) return null;

    return `Tracked vs target: ${roundPercent(actual.calories, targets.calories)}% kcal, ${roundPercent(actual.protein, targets.protein)}% protein, ${roundPercent(actual.carbs, targets.carbs)}% carbs, ${roundPercent(actual.fat, targets.fat)}% fat.`;
  }, [state.nutritionTracker]);

  return {
    ...state,
    logDate,
    nutritionLogDate,
    todayFormatted,
    nutritionFormatted,
    reload: loadContext,
    trackedNutritionSummary,
  };
}
