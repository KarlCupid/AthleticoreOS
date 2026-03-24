import { supabase } from '../supabase';
import {
  DAILY_ENGINE_VERSION,
  buildDailyMission,
  calculateCampRisk,
  calculateNutritionTargets,
  calculateWeightCorrection,
  calculateWeightTrend,
  deriveProtectWindowFromRecentMissions,
  deriveReadinessProfile,
  deriveStimulusConstraintSet,
  generateWorkoutV2,
  getHydrationProtocol,
  resolveDailyNutritionTargets,
  type ACWRResult,
  type DailyMission,
  type MacrocycleContext,
  type MEDStatus,
  type PerformanceObjective,
  type Phase,
  type ReadinessProfile,
  type ReadinessState,
  type ResolvedNutritionTargets,
  type ScheduledActivityRow,
  type StimulusConstraintSet,
  type DailyEngineState,
  type WeeklyMissionPlan,
  type WeeklyPlanEntryRow,
} from '../engine/index.ts';
import type { WeightCutPlanRow } from '../engine/types';
import { calculateACWR } from '../engine/calculateACWR';
import { determineCampPhase, toCampEnginePhase } from '../engine/calculateCamp';
import { computeDailyCutProtocol } from '../engine/calculateWeightCut';
import { getAthleteContext, normalizeActivityLevel, normalizeNutritionGoal } from './athleteContextService';
import { getDailyEngineSnapshot, getDailyEngineSnapshotsForDates, upsertDailyEngineSnapshot } from './dailyEngineSnapshotService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getDefaultGymProfile } from './gymProfileService';
import { getExerciseHistoryBatch, getRecentExerciseIds, getExerciseLibrary, getRecentMuscleVolume } from './scService';
import { getScheduledActivities } from './scheduleService';
import { getEffectiveWeight, getWeightHistory } from './weightService';
import { updateDailyMissionSnapshotsByDate } from './weeklyPlanService';
import { getConsecutiveDepletedDays, getLastRefeedDate, upsertDailyCutProtocol } from './weightCutService';
import { isActiveGuidedEnginePlanEntry } from '../engine/sessionOwnership';

interface DailyMissionOptions {
  forceRefresh?: boolean;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function addDays(date: string, delta: number): string {
  const target = new Date(`${date}T00:00:00`);
  target.setDate(target.getDate() + delta);
  return target.toISOString().slice(0, 10);
}

function getWeekWindow(date: string): { weekStart: string; weekEnd: string } {
  const target = new Date(`${date}T00:00:00`);
  const day = target.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + mondayOffset);
  const weekStart = target.toISOString().slice(0, 10);
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
  };
}

function buildPerformanceObjective(input: {
  goalMode: MacrocycleContext['goalMode'];
  performanceGoalType: MacrocycleContext['performanceGoalType'];
  buildGoal: MacrocycleContext['buildGoal'];
  phase: Phase;
  camp: MacrocycleContext['camp'];
  weightCutState: MacrocycleContext['weightCutState'];
  targetWeightLbs: number | null;
}): PerformanceObjective {
  const { goalMode, performanceGoalType, buildGoal, phase, camp, weightCutState, targetWeightLbs } = input;

  if (goalMode === 'fight_camp') {
    const primaryOutcome = weightCutState === 'driving'
      ? 'Arrive sharp and on weight for the fight'
      : 'Peak performance for the target fight';

    return {
      mode: 'fight_camp',
      goalType: performanceGoalType,
      primaryOutcome,
      secondaryConstraint: weightCutState === 'driving' ? 'weight_trajectory' : 'protect_recovery',
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

  const weightCutState = camp?.weightCutState
    ?? (athleteContext.isOnActiveCut ? 'driving' : 'none');
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
    weightCutState,
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
    weightCutState,
    isOnActiveCut: athleteContext.isOnActiveCut,
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

function toMissionActivityStatus(status: WeeklyPlanEntryRow['status']): 'scheduled' | 'modified' | 'completed' | 'skipped' {
  switch (status) {
    case 'rescheduled':
      return 'modified';
    case 'completed':
      return 'completed';
    case 'skipped':
      return 'skipped';
    case 'planned':
    default:
      return 'scheduled';
  }
}

async function resolveACWR(userId: string, date: string, phase: Phase, fitnessLevel: string, isOnActiveCut: boolean): Promise<ACWRResult> {
  return calculateACWR({
    userId,
    supabaseClient: supabase,
    asOfDate: date,
    fitnessLevel: fitnessLevel as any,
    phase,
    isOnActiveCut,
  });
}

async function resolveReadinessProfile(input: {
  userId: string;
  date: string;
  acwr: ACWRResult;
  objectiveContext: MacrocycleContext;
  trainingIntensityCap?: number | null;
}): Promise<{
  readinessProfile: ReadinessProfile;
  readinessState: ReadinessState;
  constraintSet: StimulusConstraintSet;
}> {
  const { userId, date, acwr, objectiveContext, trainingIntensityCap = null } = input;
  const historyStart = addDays(date, -6);
  const recentActivityStart = addDays(date, -1);

  const [checkinsResult, recentActivities, activationResult] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('date, sleep_quality, readiness, stress_level, soreness_level, confidence_level, external_heart_rate_load, cognitive_score, urine_color, body_temp_f')
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

  const checkins = ((checkinsResult.data ?? []) as Array<{
    date: string;
    sleep_quality?: number | null;
    readiness?: number | null;
    stress_level?: number | null;
    soreness_level?: number | null;
    confidence_level?: number | null;
    external_heart_rate_load?: number | null;
    cognitive_score?: number | null;
    urine_color?: number | null;
    body_temp_f?: number | null;
  }>);
  const todayCheckin = checkins.find((checkin) => checkin.date === date) ?? null;
  const readinessHistory = checkins
    .map((checkin) => checkin.readiness)
    .filter((value): value is number => typeof value === 'number');
  const recentSparringCount48h = recentActivities.filter((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped').length;
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
    confidenceLevel: todayCheckin?.confidence_level ?? null,
    stressLevel: todayCheckin?.stress_level ?? null,
    sorenessLevel: todayCheckin?.soreness_level ?? null,
    acwrRatio: acwr.ratio,
    loadMetrics: acwr.loadMetrics,
    externalHeartRateLoad: todayCheckin?.external_heart_rate_load ?? null,
    activationRPE: latestActivationRPE,
    expectedActivationRPE: 4,
    baselineCognitiveScore: null,
    latestCognitiveScore: todayCheckin?.cognitive_score ?? null,
    urineColor: todayCheckin?.urine_color ?? null,
    bodyTempF: todayCheckin?.body_temp_f ?? null,
    weightCutIntensityCap: trainingIntensityCap,
    recentSparringCount48h,
    recentHighImpactCount48h,
    recentHeavyStrengthCount48h,
    goalMode: objectiveContext.goalMode,
    phase: objectiveContext.phase,
    daysOut: objectiveContext.daysOut,
    isOnActiveCut: objectiveContext.isOnActiveCut,
    hasHardSparringScheduled: recentActivities.some((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped'),
    hasTechnicalSessionScheduled: recentActivities.some((activity) => activity.activity_type === 'boxing_practice' && activity.status !== 'skipped'),
    readinessHistory,
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
  };
}

function inferPowerTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.primaryAdaptation === 'power') return true;
  return entry.focus === 'sport_specific'
    || entry.focus === 'full_body';
}

function inferStrengthTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.primaryAdaptation === 'strength') return true;
  return entry.session_type === 'sc'
    || entry.focus === 'lower'
    || entry.focus === 'upper_push'
    || entry.focus === 'upper_pull'
    || entry.focus === 'full_body';
}

function inferConditioningTouch(entry: WeeklyPlanEntryRow): boolean {
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

async function resolveNutritionTargets(input: {
  userId: string;
  date: string;
  phase: Phase;
  currentWeight: number;
  profile: NonNullable<Awaited<ReturnType<typeof getAthleteContext>>['profile']>;
  weightTrend: MacrocycleContext['weightTrend'];
  macrocycleContext: MacrocycleContext;
  readinessProfile: ReadinessProfile;
  constraintSet: StimulusConstraintSet;
  medStatus?: MEDStatus | null;
  weeklyPlanEntries?: WeeklyPlanEntryRow[];
}): Promise<ResolvedNutritionTargets> {
  const {
    userId,
    date,
    phase,
    currentWeight,
    profile,
    weightTrend,
    macrocycleContext,
    readinessProfile,
    constraintSet,
    medStatus = null,
    weeklyPlanEntries = [],
  } = input;
  const scheduledActivities = await getScheduledActivities(userId, date, date);

  let cutProtocol = null as Awaited<ReturnType<typeof getCutProtocolForDate>>;
  if (profile.active_cut_plan_id) {
    cutProtocol = await getCutProtocolForDate(userId, date);
  }

  const baseTDEE = calculateNutritionTargets({
    weightLbs: currentWeight,
    heightInches: profile.height_inches ?? null,
    age: profile.age ?? null,
    biologicalSex: profile.biological_sex ?? 'male',
    activityLevel: normalizeActivityLevel(profile.activity_level),
    phase,
    nutritionGoal: normalizeNutritionGoal(profile.nutrition_goal),
    cycleDay: null,
    coachProteinOverride: null,
    coachCarbsOverride: null,
    coachFatOverride: null,
    coachCaloriesOverride: null,
  }).tdee;

  const correctionDeficit = weightTrend
    ? calculateWeightCorrection({
      weightTrend,
      phase,
      currentTDEE: baseTDEE,
      deadlineDate: profile.fight_date ?? null,
    }).correctionDeficitCal
    : 0;

  const tempTargets = calculateNutritionTargets({
    weightLbs: currentWeight,
    heightInches: profile.height_inches ?? null,
    age: profile.age ?? null,
    biologicalSex: profile.biological_sex ?? 'male',
    activityLevel: normalizeActivityLevel(profile.activity_level),
    phase,
    nutritionGoal: normalizeNutritionGoal(profile.nutrition_goal),
    cycleDay: null,
    coachProteinOverride: profile.coach_protein_override ?? null,
    coachCarbsOverride: profile.coach_carbs_override ?? null,
    coachFatOverride: profile.coach_fat_override ?? null,
    coachCaloriesOverride: profile.coach_calories_override ?? null,
    weightCorrectionDeficit: correctionDeficit,
  });

  return resolveDailyNutritionTargets(
    tempTargets,
    cutProtocol,
    (scheduledActivities.length > 0
      ? scheduledActivities
          .filter((activity) => activity.status !== 'skipped')
          .map((activity) => ({
            activity_type: activity.activity_type,
            expected_intensity: activity.expected_intensity,
            estimated_duration_min: activity.estimated_duration_min,
            start_time: activity.start_time,
            custom_label: activity.custom_label,
          }))
      : weeklyPlanEntries
          .filter((entry) => entry.status !== 'skipped')
          .map((entry) => ({
            activity_type: entry.session_type as any,
            expected_intensity: entry.target_intensity ?? 5,
            estimated_duration_min: entry.estimated_duration_min,
            start_time: null,
            custom_label: null,
          }))),
    {
      daysToWeighIn: cutProtocol?.days_to_weigh_in ?? null,
      readinessProfile,
      constraintSet,
      macrocycleContext,
      medStatus,
    },
  );
}

async function getCutProtocolForDate(userId: string, date: string) {
  const { data } = await supabase
    .from('daily_cut_protocols')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  return data as any;
}

async function ensureCutProtocolForDate(input: {
  userId: string;
  date: string;
  profile: NonNullable<Awaited<ReturnType<typeof getAthleteContext>>['profile']>;
  phase: Phase;
  currentWeight: number;
  readinessState: ReadinessState;
  acwr: ACWRResult;
}): Promise<Awaited<ReturnType<typeof getCutProtocolForDate>>> {
  const { userId, date, profile, phase, currentWeight, readinessState, acwr } = input;

  if (!profile.active_cut_plan_id) {
    return null;
  }

  const existingProtocol = await getCutProtocolForDate(userId, date);
  if (existingProtocol) {
    return existingProtocol;
  }

  const [planResult, weightHistory, lastRefeedDate, consecutiveDepletedDays, todayActivitiesResult, todayCheckinResult] = await Promise.all([
    supabase
      .from('weight_cut_plans')
      .select('*')
      .eq('id', profile.active_cut_plan_id)
      .maybeSingle(),
    getWeightHistory(userId, 14),
    getLastRefeedDate(userId, profile.active_cut_plan_id),
    getConsecutiveDepletedDays(userId),
    supabase
      .from('scheduled_activities')
      .select('activity_type, expected_intensity, estimated_duration_min')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('status', 'scheduled'),
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle(),
  ]);

  const plan = (planResult.data as WeightCutPlanRow | null) ?? null;
  if (!plan) {
    return null;
  }

  const profileCycleDayRaw = (profile as { cycle_day?: number | null }).cycle_day;
  const profileCycleDay = typeof profileCycleDayRaw === 'number' && Number.isInteger(profileCycleDayRaw) && profileCycleDayRaw >= 1 && profileCycleDayRaw <= 28
    ? profileCycleDayRaw
    : null;
  const todayCheckin = todayCheckinResult.data as {
    readiness?: number | null;
    cognitive_score?: number | null;
    urine_color?: number | null;
    body_temp_f?: number | null;
    cycle_day?: number | null;
  } | null;
  const rawCycleDay = todayCheckin?.cycle_day ?? profileCycleDay;
  const cycleDay = typeof rawCycleDay === 'number' && Number.isInteger(rawCycleDay) && rawCycleDay >= 1 && rawCycleDay <= 28
    ? rawCycleDay
    : null;

  const baseNutritionTargets = calculateNutritionTargets({
    weightLbs: currentWeight,
    heightInches: profile.height_inches ?? null,
    age: profile.age ?? null,
    biologicalSex: profile.biological_sex ?? 'male',
    activityLevel: normalizeActivityLevel(profile.activity_level),
    phase,
    nutritionGoal: normalizeNutritionGoal(profile.nutrition_goal),
    cycleDay: profileCycleDay,
    coachProteinOverride: profile.coach_protein_override ?? null,
    coachCarbsOverride: profile.coach_carbs_override ?? null,
    coachFatOverride: profile.coach_fat_override ?? null,
    coachCaloriesOverride: profile.coach_calories_override ?? null,
  });

  let weeklyVelocityLbs = 0;
  if (weightHistory.length >= 7) {
    const recent7 = weightHistory.slice(-7).reduce((sum, point) => sum + point.weight, 0) / 7;
    const previous7Slice = weightHistory.length >= 14
      ? weightHistory.slice(-14, -7)
      : weightHistory.slice(0, Math.max(1, weightHistory.length - 7));
    const previous7 = previous7Slice.reduce((sum, point) => sum + point.weight, 0) / previous7Slice.length;
    weeklyVelocityLbs = Math.round((recent7 - previous7) * 10) / 10;
  }

  const protocol = computeDailyCutProtocol({
    plan,
    date,
    currentWeight,
    weightHistory,
    baseNutritionTargets,
    dayActivities: (todayActivitiesResult.data ?? []) as Array<{
      activity_type: ScheduledActivityRow['activity_type'];
      expected_intensity: number;
      estimated_duration_min: number;
    }>,
    readinessState: todayCheckin?.readiness != null
      ? todayCheckin.readiness >= 4
        ? 'Prime'
        : todayCheckin.readiness >= 3
          ? 'Caution'
          : 'Depleted'
      : readinessState,
    acwr: acwr.ratio,
    biologicalSex: profile.biological_sex ?? 'male',
    cycleDay,
    weeklyVelocityLbs,
    lastRefeedDate,
    lastDietBreakDate: null,
    baselineCognitiveScore: plan.baseline_cognitive_score,
    latestCognitiveScore: todayCheckin?.cognitive_score ?? null,
    urineColor: todayCheckin?.urine_color ?? null,
    bodyTempF: todayCheckin?.body_temp_f ?? null,
    consecutiveDepletedDays,
  });

  await upsertDailyCutProtocol(userId, plan.id, date, protocol);
  return getCutProtocolForDate(userId, date);
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
  cutProtocol: Awaited<ReturnType<typeof getCutProtocolForDate>>;
  objectiveContext: MacrocycleContext;
  medStatus: MEDStatus | null;
}): Promise<WeeklyPlanEntryRow['prescription_snapshot']> {
  const scheduledActivities = await getScheduledActivities(input.userId, input.date, input.date);
  const activeScheduledActivities = scheduledActivities.filter((activity) => activity.status !== 'skipped');
  const hasCombatAnchor = activeScheduledActivities.some((activity) =>
    activity.activity_type === 'sparring' || activity.activity_type === 'boxing_practice',
  );

  if (input.weeklyPlanEntry?.daily_mission_snapshot?.trainingDirective?.prescription) {
    return input.weeklyPlanEntry.daily_mission_snapshot.trainingDirective.prescription;
  }
  if (input.weeklyPlanEntry?.prescription_snapshot) {
    return input.weeklyPlanEntry.prescription_snapshot;
  }

  if (!input.weeklyPlanEntry) {
    return null;
  }

  if (hasCombatAnchor) {
    return null;
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

  return generateWorkoutV2({
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
    trainingIntensityCap: input.cutProtocol?.training_intensity_cap ?? undefined,
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
}

export async function getDailyMission(
  userId: string,
  date: string,
  options: DailyMissionOptions = {},
): Promise<DailyMission> {
  const state = await getDailyEngineState(userId, date, options);
  return state.mission;
}

export async function getDailyEngineState(
  userId: string,
  date: string,
  options: DailyMissionOptions = {},
): Promise<DailyEngineState> {
  const snapshot = options.forceRefresh ? null : await getDailyEngineSnapshot(userId, date);
  const weekWindow = getWeekWindow(date);

  const [objectiveContext, athleteContext, weeklyPlanEntries, weeklyEntries] = await Promise.all([
    resolveObjectiveContext(userId, date),
    getAthleteContext(userId),
    getPlanEntriesForDate(userId, date),
    getPlanEntriesForRange(userId, weekWindow.weekStart, weekWindow.weekEnd),
  ]);

  const primaryPlanEntry = pickPrimaryPlanEntry(weeklyPlanEntries);
  const primaryEnginePlanEntry = pickPrimaryEnginePlanEntry(weeklyPlanEntries);

  const profile = athleteContext.profile;
  const currentWeight = objectiveContext.currentWeightLbs ?? profile?.base_weight ?? 150;
  const targetWeight = objectiveContext.targetWeightLbs ?? currentWeight;
  const acwr = await resolveACWR(userId, date, objectiveContext.phase, athleteContext.fitnessLevel, athleteContext.isOnActiveCut);
  const initialReadiness = await resolveReadinessProfile({
    userId,
    date,
    acwr,
    objectiveContext,
  });
  const cutProtocol = athleteContext.isOnActiveCut && profile
    ? await ensureCutProtocolForDate({
      userId,
      date,
      profile,
      phase: objectiveContext.phase,
      currentWeight,
      readinessState: initialReadiness.readinessState,
      acwr,
    })
    : null;
  const { readinessProfile, readinessState, constraintSet } = await resolveReadinessProfile({
    userId,
    date,
    acwr,
    objectiveContext,
    trainingIntensityCap: cutProtocol?.training_intensity_cap ?? null,
  });
  const medStatus = deriveMEDStatus(weeklyEntries, date);

  const nutritionTargets = profile
    ? await resolveNutritionTargets({
      userId,
      date,
      phase: objectiveContext.phase,
      currentWeight,
      profile,
      weightTrend: objectiveContext.weightTrend,
      macrocycleContext: objectiveContext,
      readinessProfile,
      constraintSet,
      medStatus,
      weeklyPlanEntries,
    })
    : ({
      tdee: 0,
      adjustedCalories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      proteinModifier: 1,
      phaseMultiplier: 0,
      weightCorrectionDeficit: 0,
      message: '',
      source: 'base',
      fuelState: 'rest',
      prioritySession: 'recovery',
      deficitClass: 'steady_maintain',
      recoveryNutritionFocus: 'none',
      sessionDemandScore: 0,
      hydrationBoostOz: 0,
      hydrationPlan: {
        dailyTargetOz: 96,
        sodiumTargetMg: null,
        emphasis: 'baseline',
        notes: [],
      },
      sessionFuelingPlan: {
        priority: 'recovery',
        priorityLabel: 'Recovery day',
        sessionLabel: 'Recovery day',
        preSession: { label: 'Before training', timing: 'No timed pre-session fueling needed', carbsG: 0, proteinG: 0, notes: [] },
        intraSession: { fluidsOz: 0, electrolytesMg: null, carbsG: 0, notes: [] },
        betweenSessions: null,
        postSession: { label: 'After training', timing: 'Use normal meals', carbsG: 0, proteinG: 25, notes: [] },
        hydrationNotes: [],
        coachingNotes: [],
      },
      reasonLines: [],
      energyAvailability: null,
      fuelingFloorTriggered: false,
      deficitBankDelta: 0,
      safetyWarning: 'none',
      traceLines: [],
    } as ResolvedNutritionTargets);

  const hydration = getHydrationProtocol({
    phase: objectiveContext.phase,
    fightStatus: profile?.fight_status ?? 'amateur',
    currentWeightLbs: currentWeight,
    targetWeightLbs: targetWeight,
    weeklyVelocityLbs: objectiveContext.weightTrend?.weeklyVelocityLbs,
  });

  const scheduledActivities = await getScheduledActivities(userId, date, date);
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
    cutProtocol,
    objectiveContext,
    medStatus,
  });

  const riskAssessment = calculateCampRisk({
    goalMode: objectiveContext.goalMode,
    weightCutState: objectiveContext.weightCutState,
    daysOut: objectiveContext.daysOut,
    remainingWeightLbs: objectiveContext.remainingWeightLbs,
    weighInTiming: objectiveContext.weighInTiming,
    acwrRatio: acwr.ratio,
    isTravelWindow: objectiveContext.isTravelWindow,
  });
  const previousDates = [3, 2, 1].map((delta) => addDays(date, -delta));
  const previousSnapshots = options.forceRefresh
    ? new Map()
    : await getDailyEngineSnapshotsForDates(userId, previousDates);
  const protectWindow = deriveProtectWindowFromRecentMissions(
    previousDates
      .map((previousDate) => previousSnapshots.get(previousDate)?.mission_snapshot)
      .filter((mission): mission is DailyMission => mission != null),
  );

  const mission = buildDailyMission({
    date,
    macrocycleContext: objectiveContext,
    readinessState,
    readinessProfile,
    constraintSet,
    acwr,
    nutritionTargets,
    hydration,
    scheduledActivities: (scheduledActivities.length > 0
      ? scheduledActivities.map((activity) => ({
          date: activity.date,
          activity_type: activity.activity_type,
          estimated_duration_min: activity.estimated_duration_min,
          expected_intensity: activity.expected_intensity,
          status: activity.status,
        }))
      : weeklyPlanEntries.map((entry: WeeklyPlanEntryRow) => ({
          date: entry.date,
          activity_type: entry.session_type as any,
          estimated_duration_min: entry.estimated_duration_min,
          expected_intensity: entry.target_intensity ?? 5,
          status: toMissionActivityStatus(entry.status),
        }))),
    cutProtocol,
    workoutPrescription: workoutPrescription ?? null,
    weeklyPlanEntry: primaryPlanEntry,
    medStatus,
    riskScore: riskAssessment?.score ?? null,
    riskDrivers: riskAssessment?.drivers ?? [],
    protectWindow,
  });

  await upsertDailyEngineSnapshot({
    userId,
    date,
    engineVersion: mission.engineVersion ?? DAILY_ENGINE_VERSION,
    objectiveContext,
    nutritionTargets,
    workoutPrescription: workoutPrescription ?? null,
    mission,
  });
  await updateDailyMissionSnapshotsByDate(userId, [{ date, mission }]);

  return {
    date,
    engineVersion: mission.engineVersion ?? DAILY_ENGINE_VERSION,
    objectiveContext,
    acwr,
    readinessState,
    readinessProfile,
    constraintSet,
    cutProtocol,
    nutritionTargets: snapshot?.nutrition_targets_snapshot ?? nutritionTargets,
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
  };
}

export async function getWeeklyMission(
  userId: string,
  weekStart: string,
  options: DailyMissionOptions = {},
): Promise<WeeklyMissionPlan> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStart)
    .order('date')
    .order('slot');

  if (error) throw error;

  const entries = ((data ?? []) as WeeklyPlanEntryRow[]);
  if (entries.length === 0) {
    return {
      entries: [],
      headline: 'No weekly mission',
      summary: 'There is no active weekly plan for this window.',
    };
  }

  if (
    !options.forceRefresh
    && entries.every((entry) => entry.daily_mission_snapshot?.engineVersion === DAILY_ENGINE_VERSION)
  ) {
    return {
      entries: entries.map((entry) => ({
        ...entry,
        daily_mission_snapshot: entry.daily_mission_snapshot ?? null,
      })),
      headline: 'Weekly mission',
      summary: `${entries.length} sessions loaded from saved mission snapshots.`,
    };
  }
  const uniqueDates = Array.from(new Set(entries.map((entry) => entry.date)));
  const storedSnapshots = options.forceRefresh
    ? new Map()
    : await getDailyEngineSnapshotsForDates(userId, uniqueDates);
  const snapshotsToWrite: Array<{ date: string; mission: DailyMission }> = [];
  const missionsByDate = new Map<string, DailyMission>();

  for (const date of uniqueDates) {
    const storedMission = storedSnapshots.get(date)?.mission_snapshot;
    if (storedMission?.engineVersion === DAILY_ENGINE_VERSION) {
      missionsByDate.set(date, storedMission);
      continue;
    }

    const entryMission = entries.find((entry) => entry.date === date)?.daily_mission_snapshot;
    if (entryMission?.engineVersion === DAILY_ENGINE_VERSION) {
      missionsByDate.set(date, entryMission);
      continue;
    }

    const mission = await getDailyMission(userId, date, { forceRefresh: options.forceRefresh });
    missionsByDate.set(date, mission);
    snapshotsToWrite.push({ date, mission });
  }

  if (snapshotsToWrite.length > 0) {
    await updateDailyMissionSnapshotsByDate(userId, snapshotsToWrite);
  }

  return {
    entries: entries.map((entry) => ({
      ...entry,
      daily_mission_snapshot: missionsByDate.get(entry.date) ?? entry.daily_mission_snapshot ?? null,
    })),
    headline: 'Weekly mission',
    summary: `${uniqueDates.length} daily missions aligned to the current block and saved for reuse.`,
  };
}
