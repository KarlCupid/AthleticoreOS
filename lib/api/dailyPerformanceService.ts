import { supabase } from '../supabase';
import {
  DAILY_ENGINE_VERSION,
  calculateCampRisk,
  calculateWeightTrend,
  deriveReadinessProfile,
  deriveStimulusConstraintSet,
  generateWorkoutV2,
  getHydrationProtocol,
  type ACWRResult,
  type DailyAthleteSummary,
  type MacrocycleContext,
  type MEDStatus,
  type PerformanceObjective,
  type Phase,
  type ReadinessProfile,
  type ReadinessState,
  type ScheduledActivityRow,
  type StimulusConstraintSet,
  type DailyEngineState,
  type WeeklyAthleteSummaryPlan,
  type WeeklyPlanEntryRow,
} from '../engine/index.ts';
import { calculateACWR } from '../engine/calculateACWR';
import { determineCampPhase, toCampEnginePhase } from '../engine/calculateCamp';
import { getAthleteContext } from './athleteContextService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getDefaultGymProfile } from './gymProfileService';
import { getExerciseHistoryBatch, getRecentExerciseIds, getExerciseLibrary, getRecentMuscleVolume } from './scService';
import { getScheduledActivities } from './scheduleService';
import { getEffectiveWeight, getWeightHistory } from './weightService';
import { isActiveGuidedEnginePlanEntry } from '../engine/sessionOwnership';
import { adaptPrescriptionToDailyReadiness } from '../engine/readiness/dailyCheck.ts';
import { resolveWeeklyAthleteSummaryWithDependencies } from './weeklyAthleteSummaryResolver';
import {
  dailyEngineStateCache,
  dailyEngineStateInFlight,
  weeklyAthleteSummaryCache,
  weeklyAthleteSummaryInFlight,
} from './engineInvalidation';
import type { WorkoutPrescriptionV2 } from '../engine/types';
import { getDailyEngineStateCacheKey, getWeeklyAthleteSummaryCacheKey } from './dailyPerformance/cacheKeys';
import { addDays, daysBetween, getWeekWindow } from './dailyPerformance/dateWindow';
import { buildDailyAthleteSummaryFromUnified } from './dailyPerformance/summaryMapping';
import { resolveUnifiedDailyPerformance } from './dailyPerformance/unifiedDailyPerformance';
import type { DailyReadinessCheckinRow } from './dailyPerformance/trackingEntries';
import { addMonitoringBreadcrumb } from '../observability/breadcrumbs';
import { logError } from '../utils/logger';

interface DailyPerformanceOptions {
  forceRefresh?: boolean | undefined;
}

let hasDailyPerformanceCheckColumns: boolean | null = null;

const DAILY_CHECKIN_LEGACY_SELECT = 'date, sleep_quality, readiness, stress_level, soreness_level, confidence_level';
const DAILY_CHECKIN_PERFORMANCE_SELECT = `${DAILY_CHECKIN_LEGACY_SELECT}, energy_level, pain_level`;
const DAILY_PERFORMANCE_CHECK_COLUMNS = [
  'energy_level',
  'pain_level',
  'readiness_score',
  'checkin_version',
] as const;

function isMissingDailyPerformanceCheckColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  const message = typeof maybe.message === 'string' ? maybe.message : '';
  return (maybe.code === 'PGRST204' || maybe.code === '42703')
    && DAILY_PERFORMANCE_CHECK_COLUMNS.some((column) => message.includes(column));
}

export { invalidateEngineDataCache, withEngineInvalidation } from './engineInvalidation';

function buildPerformanceObjective(input: {
  goalMode: MacrocycleContext['goalMode'];
  performanceGoalType: MacrocycleContext['performanceGoalType'];
  buildGoal: MacrocycleContext['buildGoal'];
  phase: Phase;
  camp: MacrocycleContext['camp'];
  weightClassState: MacrocycleContext['weightClassState'];
  targetWeightLbs: number | null;
}): PerformanceObjective {
  const { goalMode, performanceGoalType, buildGoal, phase, camp, weightClassState, targetWeightLbs } = input;

  if (goalMode === 'fight_camp') {
    const primaryOutcome = weightClassState === 'driving'
      ? 'Arrive sharp and on weight for the fight'
      : 'Peak performance for the target fight';

    return {
      mode: 'fight_camp',
      goalType: performanceGoalType,
      primaryOutcome,
      secondaryConstraint: weightClassState === 'driving' ? 'weight_trajectory' : 'protect_recovery',
      goalLabel: camp ? `Fight camp ending ${camp.fightDate}` : 'Fight camp',
      targetMetric: targetWeightLbs != null ? 'body_weight_lbs' : 'fight_readiness',
      targetValue: targetWeightLbs,
      targetUnit: targetWeightLbs != null ? 'lbs' : null,
      deadline: camp?.fightDate ?? null,
      horizonWeeks: camp?.totalWeeks ?? null,
      successWindow: camp?.fightDate ?? null,
    };
  }

  return {
    mode: 'build_phase',
    goalType: buildGoal?.goal_type ?? performanceGoalType,
    primaryOutcome: buildGoal?.primary_outcome ?? buildGoal?.goal_statement ?? `Build ${phase.replace(/-/g, ' ')} capacity`,
    secondaryConstraint: buildGoal?.secondary_constraint ?? 'protect_recovery',
    goalLabel: buildGoal?.goal_label ?? null,
    targetMetric: buildGoal?.target_metric ?? 'training_consistency',
    targetValue: buildGoal?.target_value ?? null,
    targetUnit: buildGoal?.target_unit ?? null,
    deadline: buildGoal?.target_date ?? null,
    horizonWeeks: buildGoal?.target_horizon_weeks ?? null,
    successWindow: buildGoal?.success_window ?? null,
  };
}

export async function resolveObjectiveContext(userId: string, date: string): Promise<MacrocycleContext> {
  const [athleteContext, buildGoal, camp] = await Promise.all([
    getAthleteContext(userId),
    getActiveBuildPhaseGoal(userId),
    getActiveFightCamp(userId),
  ]);

  const profile = athleteContext.profile;
  const effectiveWeight = profile?.base_weight != null
    ? await getEffectiveWeight(userId, profile.base_weight)
    : null;
  const weightHistory = await getWeightHistory(userId, 30);

  const campPhase = camp ? determineCampPhase(camp, date) : null;
  const phase = campPhase ? toCampEnginePhase(campPhase) : athleteContext.phase;
  const targetWeightLbs = camp?.targetWeight ?? profile?.target_weight ?? null;

  const weightTrend = profile && effectiveWeight != null
    ? calculateWeightTrend({
      weightHistory,
      targetWeightLbs,
      baseWeightLbs: profile.base_weight ?? effectiveWeight,
      phase,
      deadlineDate: camp?.fightDate ?? profile.fight_date ?? null,
    })
    : null;

  const weightClassState = camp?.weightClassState
    ?? (athleteContext.hasActiveWeightClassPlan ? 'driving' : 'none');
  const daysOut = camp?.fightDate ? Math.max(0, daysBetween(date, camp.fightDate)) : null;
  const isTravelWindow = Boolean(
    camp?.travelStartDate
    && camp.travelStartDate <= date
    && (!camp.travelEndDate || date <= camp.travelEndDate),
  );

  const performanceObjective = buildPerformanceObjective({
    goalMode: athleteContext.goalMode,
    performanceGoalType: athleteContext.performanceGoalType,
    buildGoal,
    phase,
    camp,
    weightClassState,
    targetWeightLbs,
  });

  return {
    date,
    phase,
    goalMode: athleteContext.goalMode,
    performanceGoalType: athleteContext.performanceGoalType,
    performanceObjective,
    buildGoal,
    camp,
    campPhase,
    weightClassState,
    hasActiveWeightClassPlan: athleteContext.hasActiveWeightClassPlan,
    weighInTiming: camp?.weighInTiming ?? null,
    daysOut,
    isTravelWindow,
    currentWeightLbs: weightTrend?.currentWeight ?? effectiveWeight,
    targetWeightLbs,
    remainingWeightLbs: weightTrend?.remainingLbs ?? (effectiveWeight != null && targetWeightLbs != null ? Math.max(0, effectiveWeight - targetWeightLbs) : null),
    weightTrend,
  };
}

async function getPlanEntriesForDate(userId: string, date: string): Promise<WeeklyPlanEntryRow[]> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('slot');

  if (error) throw error;
  return (data ?? []) as WeeklyPlanEntryRow[];
}

async function getPlanEntriesForRange(userId: string, startDate: string, endDate: string): Promise<WeeklyPlanEntryRow[]> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('slot');

  if (error) throw error;
  return (data ?? []) as WeeklyPlanEntryRow[];
}

function pickPrimaryPlanEntry(entries: WeeklyPlanEntryRow[]): WeeklyPlanEntryRow | null {
  if (entries.length === 0) return null;

  const slotRank: Record<WeeklyPlanEntryRow['slot'], number> = {
    single: 0,
    pm: 1,
    am: 2,
  };

  return [...entries].sort((a, b) => {
    const intensityDelta = (b.target_intensity ?? 0) - (a.target_intensity ?? 0);
    if (intensityDelta !== 0) return intensityDelta;

    const durationDelta = b.estimated_duration_min - a.estimated_duration_min;
    if (durationDelta !== 0) return durationDelta;

    return slotRank[a.slot] - slotRank[b.slot];
  })[0] ?? null;
}

function pickPrimaryEnginePlanEntry(entries: WeeklyPlanEntryRow[]): WeeklyPlanEntryRow | null {
  return entries.find((entry) => isActiveGuidedEnginePlanEntry(entry)) ?? null;
}

function pickPrimaryScheduledActivity(activities: ScheduledActivityRow[]): ScheduledActivityRow | null {
  const activeActivities = activities.filter((activity) => activity.status !== 'skipped');
  if (activeActivities.length === 0) return null;

  const activityRank = (activity: ScheduledActivityRow): number => {
    switch (activity.activity_type) {
      case 'sparring':
        return 0;
      case 'boxing_practice':
        return 1;
      case 'sc':
        return 2;
      case 'conditioning':
        return 3;
      case 'road_work':
      case 'running':
        return 4;
      default:
        return 5;
    }
  };

  return [...activeActivities].sort((a, b) => {
    const rankDelta = activityRank(a) - activityRank(b);
    if (rankDelta !== 0) return rankDelta;

    const intensityDelta = (b.expected_intensity ?? 0) - (a.expected_intensity ?? 0);
    if (intensityDelta !== 0) return intensityDelta;

    return (b.estimated_duration_min ?? 0) - (a.estimated_duration_min ?? 0);
  })[0] ?? null;
}

async function resolveACWR(
  userId: string,
  date: string,
  phase: Phase,
  fitnessLevel: string,
  hasActiveWeightClassPlan: boolean,
  cycleDay: number | null,
): Promise<ACWRResult> {
  return calculateACWR({
    userId,
    supabaseClient: supabase,
    asOfDate: date,
    fitnessLevel: fitnessLevel as any,
    phase,
    hasActiveWeightClassPlan,
    cycleDay,
  });
}

async function resolveReadinessProfile(input: {
  userId: string;
  date: string;
  acwr: ACWRResult;
  objectiveContext: MacrocycleContext;
  trainingIntensityCap?: number | null;
  cycleDay?: number | null;
}): Promise<{
  readinessProfile: ReadinessProfile;
  readinessState: ReadinessState;
  constraintSet: StimulusConstraintSet;
  todayCheckin: DailyReadinessCheckinRow | null;
}> {
  const { userId, date, acwr, objectiveContext, trainingIntensityCap = null, cycleDay = null } = input;
  const historyStart = addDays(date, -6);
  const recentActivityStart = addDays(date, -5);

  let checkinsResult: any = { data: [] };
  let recentActivities: any[] = [];
  let activationResult: any = { data: [] };
  const checkinSelect = hasDailyPerformanceCheckColumns === false
    ? DAILY_CHECKIN_LEGACY_SELECT
    : DAILY_CHECKIN_PERFORMANCE_SELECT;

  try {
    const [cRes, rAct, aRes] = await Promise.all([
      supabase
        .from('daily_checkins')
        .select(checkinSelect)
        .eq('user_id', userId)
        .gte('date', historyStart)
        .lte('date', date)
        .order('date'),
      getScheduledActivities(userId, recentActivityStart, date),
      supabase
        .from('workout_log')
        .select('date, activation_rpe')
        .eq('user_id', userId)
        .not('activation_rpe', 'is', null)
        .lte('date', date)
        .order('date', { ascending: false })
        .limit(1),
    ]);
    checkinsResult = cRes;
    recentActivities = rAct;
    activationResult = aRes;

    if (cRes.error) throw cRes.error;
    if (aRes.error) throw aRes.error;
    if (checkinSelect === DAILY_CHECKIN_PERFORMANCE_SELECT) {
      hasDailyPerformanceCheckColumns = true;
    }
  } catch (error) {
    if (isMissingDailyPerformanceCheckColumnError(error)) {
      hasDailyPerformanceCheckColumns = false;
    } else {
      logError('dailyPerformanceService.resolveReadinessProfile', error, { date });
    }
    // Fallback: If queries fail (e.g. missing columns), try a minimal checkin fetch
    try {
      const fallbackCheckins = await supabase
        .from('daily_checkins')
        .select(DAILY_CHECKIN_LEGACY_SELECT)
        .eq('user_id', userId)
        .gte('date', historyStart)
        .lte('date', date);
      checkinsResult = fallbackCheckins;
    } catch (fallbackError) {
      logError('dailyPerformanceService.resolveReadinessProfile.fallback', fallbackError, { date });
    }
  }

  const checkins = ((checkinsResult.data ?? []) as DailyReadinessCheckinRow[]);
  const todayCheckin = checkins.find((checkin) => checkin.date === date) ?? null;
  const readinessHistory = checkins
    .map((checkin) => checkin.readiness)
    .filter((value): value is number => typeof value === 'number');
  const recentSparringCount48h = recentActivities.filter((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped').length;
  const recentSparringDecayLoad5d = recentActivities
    .filter((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped')
    .reduce((sum, activity) => {
      const hoursAgo = Math.max(0, daysBetween(activity.date, date) * 24);
      return sum + (Math.exp(-hoursAgo / 72) * ((activity.expected_intensity ?? 0) / 10));
    }, 0);
  const recentHighImpactCount48h = recentActivities.filter((activity) =>
    (activity.activity_type === 'sparring' || activity.activity_type === 'boxing_practice')
    && activity.expected_intensity >= 7
    && activity.status !== 'skipped',
  ).length;
  const recentHeavyStrengthCount48h = recentActivities.filter((activity) =>
    activity.activity_type === 'sc'
    && activity.expected_intensity >= 7
    && activity.status !== 'skipped',
  ).length;
  const latestActivationRPE = (activationResult.data as Array<{ date: string; activation_rpe?: number | null }> | null)?.[0]?.activation_rpe ?? null;
  const profile = deriveReadinessProfile({
    sleepQuality: todayCheckin?.sleep_quality ?? null,
    subjectiveReadiness: todayCheckin?.readiness ?? null,
    energyLevel: todayCheckin?.energy_level ?? null,
    fuelHydrationStatus: null,
    painLevel: todayCheckin?.pain_level ?? null,
    confidenceLevel: todayCheckin?.confidence_level ?? null,
    stressLevel: todayCheckin?.stress_level ?? null,
    sorenessLevel: todayCheckin?.soreness_level ?? null,
    acwrRatio: acwr.ratio,
    loadMetrics: acwr.loadMetrics,
    externalHeartRateLoad: null,
    activationRPE: latestActivationRPE,
    expectedActivationRPE: 4,
    baselineCognitiveScore: null,
    latestCognitiveScore: null,
    urineColor: null,
    bodyTempF: null,
    bodyMassIntensityCap: trainingIntensityCap,
    recentSparringCount48h,
    recentSparringDecayLoad5d,
    recentHighImpactCount48h,
    recentHeavyStrengthCount48h,
    goalMode: objectiveContext.goalMode,
    phase: objectiveContext.phase,
    daysOut: objectiveContext.daysOut,
    hasActiveWeightClassPlan: objectiveContext.hasActiveWeightClassPlan,
    hasHardSparringScheduled: recentActivities.some((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped'),
    hasTechnicalSessionScheduled: recentActivities.some((activity) => activity.activity_type === 'boxing_practice' && activity.status !== 'skipped'),
    readinessHistory,
    cycleDay,
  });
  const constraintSet = deriveStimulusConstraintSet(profile, {
    phase: objectiveContext.phase,
    goalMode: objectiveContext.goalMode,
    daysOut: objectiveContext.daysOut,
    trainingIntensityCap,
  });

  return {
    readinessProfile: profile,
    readinessState: profile.readinessState,
    constraintSet,
    todayCheckin,
  };
}

function inferPowerTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.primaryAdaptation === 'power') return true;
  return entry.focus === 'sport_specific'
    || entry.focus === 'full_body';
}

function inferStrengthTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.doseCredits?.some((credit) => credit.bucket === 'strength' && credit.credit > 0)) return true;
  if (entry.prescription_snapshot?.primaryAdaptation === 'strength') return true;
  return entry.session_type === 'sc'
    || entry.focus === 'lower'
    || entry.focus === 'upper_push'
    || entry.focus === 'upper_pull'
    || entry.focus === 'full_body';
}

function inferConditioningTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.doseCredits?.some((credit) => credit.bucket === 'conditioning' && credit.credit > 0)) return true;
  if (entry.prescription_snapshot?.primaryAdaptation === 'conditioning') return true;
  return entry.session_type === 'conditioning'
    || entry.session_type === 'road_work'
    || entry.focus === 'conditioning';
}

function summarizeMedExposure(targetTouches: number, scheduledTouches: number, dayIndex: number): { targetTouches: number; scheduledTouches: number; remainingTouches: number; status: 'met' | 'pending' | 'at_risk' | 'missed' } {
  const remainingTouches = Math.max(0, targetTouches - scheduledTouches);
  if (scheduledTouches >= targetTouches) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'met' };
  }
  if (dayIndex >= 5 && remainingTouches > 1) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'missed' };
  }
  if (dayIndex >= 4 && remainingTouches >= 1) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'at_risk' };
  }
  return { targetTouches, scheduledTouches, remainingTouches, status: 'pending' };
}

function deriveMEDStatus(entries: WeeklyPlanEntryRow[], date: string): MEDStatus {
  const weekStart = getWeekWindow(date).weekStart;
  const dayIndex = Math.max(0, daysBetween(weekStart, date));
  const activeEntries = entries.filter((entry) => entry.status !== 'skipped');
  const powerTouches = activeEntries.filter(inferPowerTouch).length;
  const strengthTouches = activeEntries.filter(inferStrengthTouch).length;
  const conditioningTouches = activeEntries.filter(inferConditioningTouch).length;

  const power = summarizeMedExposure(1, powerTouches, dayIndex);
  const strength = summarizeMedExposure(2, strengthTouches, dayIndex);
  const conditioning = summarizeMedExposure(2, conditioningTouches, dayIndex);
  const statuses = [power.status, strength.status, conditioning.status];
  const overall = statuses.includes('missed')
    ? 'missed'
    : statuses.includes('at_risk')
      ? 'at_risk'
      : 'on_track';

  return {
    power,
    strength,
    conditioning,
    overall,
    summary: overall === 'on_track'
      ? 'Minimum effective dose exposures are on track this week.'
      : overall === 'at_risk'
        ? 'At least one key quality is drifting toward a missed weekly exposure.'
        : 'The current week is missing at least one minimum effective dose target.',
  };
}

async function resolveWorkoutPrescription(input: {
  userId: string;
  date: string;
  phase: Phase;
  readinessState: ReadinessState;
  readinessProfile: ReadinessProfile;
  constraintSet: StimulusConstraintSet;
  acwr: ACWRResult;
  fitnessLevel: string;
  trainingAge: 'novice' | 'intermediate' | 'advanced';
  performanceGoalType: MacrocycleContext['performanceGoalType'];
  weeklyPlanEntry: WeeklyPlanEntryRow | null;
  objectiveContext: MacrocycleContext;
  medStatus: MEDStatus | null;
}): Promise<WorkoutPrescriptionV2 | null> {
  if (!input.weeklyPlanEntry) {
    return null;
  }

  const storedPrescription = input.weeklyPlanEntry.prescription_snapshot ?? null;

  if (storedPrescription) {
    return adaptPrescriptionToDailyReadiness({
      prescription: storedPrescription,
      readinessProfile: input.readinessProfile,
      constraintSet: input.constraintSet,
    });
  }

  const [gym, library, recentIds, recentMuscleVolume] = await Promise.all([
    getDefaultGymProfile(input.userId),
    getExerciseLibrary(),
    getRecentExerciseIds(input.userId),
    getRecentMuscleVolume(input.userId),
  ]);

  const exerciseHistory = await getExerciseHistoryBatch(
    input.userId,
    library.map((exercise) => exercise.id),
  );

  const generatedPrescription = generateWorkoutV2({
    readinessState: input.readinessState,
    readinessProfile: input.readinessProfile,
    constraintSet: input.constraintSet,
    phase: input.phase,
    acwr: input.acwr.ratio,
    exerciseLibrary: library,
    recentExerciseIds: recentIds,
    recentMuscleVolume,
    trainingDate: input.date,
    focus: input.weeklyPlanEntry?.focus ?? undefined,
    trainingIntensityCap: undefined,
    fitnessLevel: input.fitnessLevel as any,
    trainingAge: input.trainingAge,
    performanceGoalType: input.performanceGoalType,
    availableMinutes: input.weeklyPlanEntry?.estimated_duration_min,
    gymEquipment: gym?.equipment ?? [],
    exerciseHistory,
    isDeloadWeek: input.weeklyPlanEntry?.is_deload ?? false,
    weeklyPlanFocus: input.weeklyPlanEntry?.focus ?? undefined,
    medStatus: input.medStatus,
  });

  return adaptPrescriptionToDailyReadiness({
    prescription: generatedPrescription,
    readinessProfile: input.readinessProfile,
    constraintSet: input.constraintSet,
  });
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

  const [objectiveContext, athleteContext, weeklyPlanEntries, weeklyEntries, scheduledActivities] = await Promise.all([
    resolveObjectiveContext(userId, date),
    getAthleteContext(userId),
    getPlanEntriesForDate(userId, date),
    getPlanEntriesForRange(userId, weekWindow.weekStart, weekWindow.weekEnd),
    getScheduledActivities(userId, date, date),
  ]);

  const primaryPlanEntry = pickPrimaryPlanEntry(weeklyPlanEntries);
  const primaryEnginePlanEntry = pickPrimaryEnginePlanEntry(weeklyPlanEntries);

  const profile = athleteContext.profile;
  const profileCycleDay = typeof (profile as { cycle_day?: number | null } | null)?.cycle_day === 'number'
    ? (profile as { cycle_day?: number | null }).cycle_day ?? null
    : null;
  const canonicalCurrentWeight = objectiveContext.currentWeightLbs ?? profile?.base_weight ?? null;
  const canonicalTargetWeight = objectiveContext.targetWeightLbs ?? null;
  const currentWeight = canonicalCurrentWeight ?? 150;
  const targetWeight = canonicalTargetWeight ?? currentWeight;
  const acwr = await resolveACWR(
    userId,
    date,
    objectiveContext.phase,
    athleteContext.fitnessLevel,
    athleteContext.hasActiveWeightClassPlan,
    profileCycleDay,
  );
  const { readinessProfile, readinessState, constraintSet, todayCheckin } = await resolveReadinessProfile({
    userId,
    date,
    acwr,
    objectiveContext,
    trainingIntensityCap: null,
    cycleDay: profileCycleDay,
  });
  const medStatus = deriveMEDStatus(weeklyEntries, date);
  const workoutPrescription = await resolveWorkoutPrescription({
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
    weeklyPlanEntry: primaryEnginePlanEntry,
    objectiveContext,
    medStatus,
  });

  const hydration = getHydrationProtocol({
    phase: objectiveContext.phase,
    fightStatus: profile?.fight_status ?? 'amateur',
    currentWeightLbs: currentWeight,
    targetWeightLbs: targetWeight,
    weeklyVelocityLbs: objectiveContext.weightTrend?.weeklyVelocityLbs,
  });

  const riskAssessment = calculateCampRisk({
    goalMode: objectiveContext.goalMode,
    weightClassState: objectiveContext.weightClassState,
    daysOut: objectiveContext.daysOut,
    remainingWeightLbs: objectiveContext.remainingWeightLbs,
    weighInTiming: objectiveContext.weighInTiming,
    acwrRatio: acwr.ratio,
    isTravelWindow: objectiveContext.isTravelWindow,
  });
  const unifiedPerformance = resolveUnifiedDailyPerformance({
    userId,
    date,
    athleteContext,
    objectiveContext,
    readinessProfile,
    acwr,
    todayCheckin,
    scheduledActivities,
    currentWeight: canonicalCurrentWeight,
    targetWeight: canonicalTargetWeight,
    weekStart: weekWindow.weekStart,
  });
  const { summary: mission, nutritionTarget: nutritionTargets } = buildDailyAthleteSummaryFromUnified({
    date,
    objectiveContext,
    readinessProfile,
    constraintSet,
    medStatus,
    hydration,
    workoutPrescription,
    unifiedPerformance,
  });

  for (const event of nutritionTargets.safetyEvents ?? []) {
    addMonitoringBreadcrumb('daily_engine', 'nutrition_safety_event', {
      date,
      code: event.code,
      source: event.source,
      hasAdjustment: event.adjustedValue != null,
    });
  }

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
    weeklyPlanEntries,
    primaryScheduledActivity: pickPrimaryScheduledActivity(scheduledActivities),
    primaryPlanEntry,
    primaryEnginePlanEntry,
    workoutPrescription: workoutPrescription ?? null,
    mission,
    campRisk: riskAssessment ?? null,
    medStatus,
    unifiedPerformance,
  };
}

export async function getDailyEngineState(
  userId: string,
  date: string,
  options: DailyPerformanceOptions = {},
): Promise<DailyEngineState> {
  const cacheKey = getDailyEngineStateCacheKey(userId, date);

  if (!options.forceRefresh) {
    const cached = dailyEngineStateCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = dailyEngineStateInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  } else {
    dailyEngineStateCache.delete(cacheKey);
    dailyEngineStateInFlight.delete(cacheKey);
  }

  const request = computeDailyEngineState(userId, date, options)
    .then((result) => {
      dailyEngineStateCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      dailyEngineStateInFlight.delete(cacheKey);
    });

  dailyEngineStateInFlight.set(cacheKey, request);
  return request;
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
  const cacheKey = getWeeklyAthleteSummaryCacheKey(userId, weekStart);

  if (!options.forceRefresh) {
    const cached = weeklyAthleteSummaryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = weeklyAthleteSummaryInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  } else {
    weeklyAthleteSummaryCache.delete(cacheKey);
    weeklyAthleteSummaryInFlight.delete(cacheKey);
  }

  const request = computeWeeklyAthleteSummary(userId, weekStart, options)
    .then((result) => {
      weeklyAthleteSummaryCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      weeklyAthleteSummaryInFlight.delete(cacheKey);
    });

  weeklyAthleteSummaryInFlight.set(cacheKey, request);
  return request;
}
