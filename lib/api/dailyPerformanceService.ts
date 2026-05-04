import { supabase } from '../supabase';
import {
  DAILY_ENGINE_VERSION,
  type DailyAthleteSummary,
  type DailyEngineState,
  type WeeklyAthleteSummaryPlan,
  type WeeklyPlanEntryRow,
} from '../engine/index.ts';
import { getAthleteContext } from './athleteContextService';
import { getScheduledActivities } from './scheduleService';
import { resolveWeeklyAthleteSummaryWithDependencies } from './weeklyAthleteSummaryResolver';
import {
  dailyEngineStateCache,
  dailyEngineStateInFlight,
  weeklyAthleteSummaryCache,
  weeklyAthleteSummaryInFlight,
} from './engineInvalidation';
import { getDailyEngineStateCacheKey, getWeeklyAthleteSummaryCacheKey } from './dailyPerformance/cacheKeys';
import { getWeekWindow } from './dailyPerformance/dateWindow';
import { addMonitoringBreadcrumb } from '../observability/breadcrumbs';
import { buildDailyAthleteSummaryFromUnified } from './dailyPerformance/summaryMapping';
import { resolveUnifiedDailyPerformance } from './dailyPerformance/unifiedDailyPerformance';
import { getOrComputeCachedValue } from './dailyPerformance/cacheOrchestration';
import { resolveHydrationAndRisk } from './dailyPerformance/hydrationRisk';
import { deriveMEDStatus } from './dailyPerformance/medStatus';
import {
  pickPrimaryScheduledActivity,
  resolveDailyPlanSelection,
} from './dailyPerformance/planSelection';
import { resolveObjectiveContextWithDependencies } from './dailyPerformance/objectiveContext';
import {
  resolveACWRWithDependencies,
  resolveReadinessProfileWithDependencies,
} from './dailyPerformance/readinessResolution';
import { resolveWorkoutPrescriptionWithDependencies } from './dailyPerformance/prescriptionResolution';
import { resolveUpeHandoff } from './dailyPerformance/upeHandoff';

interface DailyPerformanceOptions {
  forceRefresh?: boolean | undefined;
}

export { invalidateEngineDataCache, withEngineInvalidation } from './engineInvalidation';

export async function resolveObjectiveContext(userId: string, date: string) {
  return resolveObjectiveContextWithDependencies(userId, date);
}

export async function getDailyAthleteSummary(
  userId: string,
  date: string,
  options: DailyPerformanceOptions = {},
): Promise<DailyAthleteSummary> {
  const state = await getDailyEngineState(userId, date, options);
  return state.mission;
}

async function computeDailyEngineState(
  userId: string,
  date: string,
  _options: DailyPerformanceOptions = {},
): Promise<DailyEngineState> {
  const weekWindow = getWeekWindow(date);

  const [objectiveContext, athleteContext, planSelection, scheduledActivities] = await Promise.all([
    resolveObjectiveContext(userId, date),
    getAthleteContext(userId),
    resolveDailyPlanSelection({
      userId,
      date,
      weekStart: weekWindow.weekStart,
      weekEnd: weekWindow.weekEnd,
    }),
    getScheduledActivities(userId, date, date),
  ]);

  const profile = athleteContext.profile;
  const profileCycleDay = typeof profile?.cycle_day === 'number' ? profile.cycle_day : null;
  const canonicalCurrentWeight = objectiveContext.currentWeightLbs ?? profile?.base_weight ?? null;
  const canonicalTargetWeight = objectiveContext.targetWeightLbs ?? null;
  const currentWeight = canonicalCurrentWeight ?? 150;
  const targetWeight = canonicalTargetWeight ?? currentWeight;
  const acwr = await resolveACWRWithDependencies({
    userId,
    date,
    phase: objectiveContext.phase,
    fitnessLevel: athleteContext.fitnessLevel,
    hasActiveWeightClassPlan: athleteContext.hasActiveWeightClassPlan,
    cycleDay: profileCycleDay,
  });
  const { readinessProfile, readinessState, constraintSet, todayCheckin } = await resolveReadinessProfileWithDependencies({
    userId,
    date,
    acwr,
    objectiveContext,
    trainingIntensityCap: null,
    cycleDay: profileCycleDay,
  });
  const medStatus = deriveMEDStatus(planSelection.weeklyEntries, date);
  const workoutPrescription = await resolveWorkoutPrescriptionWithDependencies({
    userId,
    date,
    phase: objectiveContext.phase,
    readinessState,
    readinessProfile,
    constraintSet,
    acwr,
    fitnessLevel: athleteContext.fitnessLevel,
    trainingAge: athleteContext.trainingAge,
    performanceGoalType: athleteContext.performanceGoalType,
    weeklyPlanEntry: planSelection.primaryEnginePlanEntry,
    objectiveContext,
    medStatus,
  });
  const { hydration, riskAssessment } = resolveHydrationAndRisk({
    objectiveContext,
    fightStatus: profile?.fight_status ?? 'amateur',
    currentWeightLbs: currentWeight,
    targetWeightLbs: targetWeight,
    acwrRatio: acwr.ratio,
  });
  const { unifiedPerformance, mission, nutritionTargets } = resolveUpeHandoff({
    userId,
    date,
    athleteContext,
    objectiveContext,
    readinessProfile,
    constraintSet,
    medStatus,
    hydration,
    workoutPrescription,
    acwr,
    todayCheckin,
    scheduledActivities,
    currentWeight: canonicalCurrentWeight,
    targetWeight: canonicalTargetWeight,
    weekStart: weekWindow.weekStart,
  }, {
    resolveUnifiedDailyPerformance,
    buildDailyAthleteSummaryFromUnified,
    addMonitoringBreadcrumb,
  });

  return {
    date,
    engineVersion: mission.engineVersion ?? DAILY_ENGINE_VERSION,
    objectiveContext,
    acwr,
    readinessState,
    readinessProfile,
    constraintSet,
    nutritionTargets,
    hydration,
    scheduledActivities,
    weeklyPlanEntries: planSelection.weeklyPlanEntries,
    primaryScheduledActivity: pickPrimaryScheduledActivity(scheduledActivities),
    primaryPlanEntry: planSelection.primaryPlanEntry,
    primaryEnginePlanEntry: planSelection.primaryEnginePlanEntry,
    workoutPrescription: workoutPrescription ?? null,
    mission,
    campRisk: riskAssessment,
    medStatus,
    unifiedPerformance,
  };
}

export async function getDailyEngineState(
  userId: string,
  date: string,
  options: DailyPerformanceOptions = {},
): Promise<DailyEngineState> {
  return getOrComputeCachedValue({
    cacheKey: getDailyEngineStateCacheKey(userId, date),
    forceRefresh: options.forceRefresh,
    cache: dailyEngineStateCache,
    inFlight: dailyEngineStateInFlight,
    compute: () => computeDailyEngineState(userId, date, options),
  });
}

async function computeWeeklyAthleteSummary(
  userId: string,
  weekStart: string,
  options: DailyPerformanceOptions = {},
): Promise<WeeklyAthleteSummaryPlan> {
  return resolveWeeklyAthleteSummaryWithDependencies(userId, weekStart, options, {
    loadWeeklyPlanEntries: async (targetUserId, targetWeekStart) => {
      const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('week_start_date', targetWeekStart)
        .order('date')
        .order('slot');

      if (error) throw error;
      return (data ?? []) as WeeklyPlanEntryRow[];
    },
    getDailyAthleteSummary,
  });
}

export async function getWeeklyAthleteSummary(
  userId: string,
  weekStart: string,
  options: DailyPerformanceOptions = {},
): Promise<WeeklyAthleteSummaryPlan> {
  return getOrComputeCachedValue({
    cacheKey: getWeeklyAthleteSummaryCacheKey(userId, weekStart),
    forceRefresh: options.forceRefresh,
    cache: weeklyAthleteSummaryCache,
    inFlight: weeklyAthleteSummaryInFlight,
    compute: () => computeWeeklyAthleteSummary(userId, weekStart, options),
  });
}
