import { supabase } from '../supabase';
import {
  buildDailyMission,
  buildMicrocyclePlan,
  calculateCampRisk,
  calculateNutritionTargets,
  calculateWeightCorrection,
  calculateWeightTrend,
  generateWorkoutV2,
  getGlobalReadinessState,
  getHydrationProtocol,
  resolveDailyNutritionTargets,
  type ACWRResult,
  type DailyMission,
  type MacrocycleContext,
  type PerformanceObjective,
  type Phase,
  type ReadinessState,
  type ResolvedNutritionTargets,
  type WeeklyMissionPlan,
  type WeeklyPlanEntryRow,
} from '../engine';
import { calculateACWR } from '../engine/calculateACWR';
import { determineCampPhase, toCampEnginePhase } from '../engine/calculateCamp';
import { getAthleteContext, normalizeActivityLevel, normalizeNutritionGoal } from './athleteContextService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getDefaultGymProfile } from './gymProfileService';
import { getRecentExerciseIds, getExerciseLibrary } from './scService';
import { getScheduledActivities } from './scheduleService';
import { getEffectiveWeight, getWeightHistory } from './weightService';

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
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

async function getPlanEntryForDate(userId: string, date: string): Promise<WeeklyPlanEntryRow | null> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('slot')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as WeeklyPlanEntryRow | null) ?? null;
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

async function resolveReadinessState(userId: string, date: string, acwr: ACWRResult, weightPenalty: number): Promise<ReadinessState> {
  const { data: checkin } = await supabase
    .from('daily_checkins')
    .select('sleep_quality, readiness')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  return getGlobalReadinessState({
    sleep: checkin?.sleep_quality ?? 4,
    readiness: checkin?.readiness ?? 4,
    acwr: acwr.ratio,
    weightPenalty,
  });
}

async function resolveNutritionTargets(input: {
  userId: string;
  date: string;
  phase: Phase;
  currentWeight: number;
  profile: NonNullable<Awaited<ReturnType<typeof getAthleteContext>>['profile']>;
  weightTrend: MacrocycleContext['weightTrend'];
}): Promise<ResolvedNutritionTargets> {
  const { userId, date, phase, currentWeight, profile, weightTrend } = input;
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
    scheduledActivities
      .filter((activity) => activity.status !== 'skipped')
      .map((activity) => ({
        activity_type: activity.activity_type,
        expected_intensity: activity.expected_intensity,
        estimated_duration_min: activity.estimated_duration_min,
      })),
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

async function resolveWorkoutPrescription(input: {
  userId: string;
  date: string;
  phase: Phase;
  readinessState: ReadinessState;
  acwr: ACWRResult;
  fitnessLevel: string;
  weeklyPlanEntry: WeeklyPlanEntryRow | null;
  cutProtocol: Awaited<ReturnType<typeof getCutProtocolForDate>>;
}): Promise<WeeklyPlanEntryRow['prescription_snapshot']> {
  if (input.weeklyPlanEntry?.daily_mission_snapshot?.trainingDirective?.prescription) {
    return input.weeklyPlanEntry.daily_mission_snapshot.trainingDirective.prescription;
  }
  if (input.weeklyPlanEntry?.prescription_snapshot) {
    return input.weeklyPlanEntry.prescription_snapshot;
  }

  const [gym, library, recentIds] = await Promise.all([
    getDefaultGymProfile(input.userId),
    getExerciseLibrary(),
    getRecentExerciseIds(input.userId),
  ]);

  return generateWorkoutV2({
    readinessState: input.readinessState,
    phase: input.phase,
    acwr: input.acwr.ratio,
    exerciseLibrary: library,
    recentExerciseIds: recentIds,
    recentMuscleVolume: {
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
    },
    trainingDate: input.date,
    focus: input.weeklyPlanEntry?.focus ?? undefined,
    trainingIntensityCap: input.cutProtocol?.training_intensity_cap ?? undefined,
    fitnessLevel: input.fitnessLevel as any,
    availableMinutes: input.weeklyPlanEntry?.estimated_duration_min,
    gymEquipment: gym?.equipment ?? [],
    exerciseHistory: new Map(),
    isDeloadWeek: input.weeklyPlanEntry?.is_deload ?? false,
    weeklyPlanFocus: input.weeklyPlanEntry?.focus ?? undefined,
  });
}

export async function getDailyMission(userId: string, date: string): Promise<DailyMission> {
  const [objectiveContext, athleteContext, weeklyPlanEntry] = await Promise.all([
    resolveObjectiveContext(userId, date),
    getAthleteContext(userId),
    getPlanEntryForDate(userId, date),
  ]);

  const profile = athleteContext.profile;
  const currentWeight = objectiveContext.currentWeightLbs ?? profile?.base_weight ?? 150;
  const targetWeight = objectiveContext.targetWeightLbs ?? currentWeight;
  const acwr = await resolveACWR(userId, date, objectiveContext.phase, athleteContext.fitnessLevel, athleteContext.isOnActiveCut);
  const weightPenalty = 0;
  const readinessState = await resolveReadinessState(userId, date, acwr, weightPenalty);
  const cutProtocol = athleteContext.isOnActiveCut ? await getCutProtocolForDate(userId, date) : null;

  const nutritionTargets = profile
    ? await resolveNutritionTargets({
      userId,
      date,
      phase: objectiveContext.phase,
      currentWeight,
      profile,
      weightTrend: objectiveContext.weightTrend,
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
    acwr,
    fitnessLevel: athleteContext.fitnessLevel,
    weeklyPlanEntry,
    cutProtocol,
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

  return buildDailyMission({
    date,
    macrocycleContext: objectiveContext,
    readinessState,
    acwr,
    nutritionTargets,
    hydration,
    scheduledActivities: scheduledActivities.map((activity) => ({
      date: activity.date,
      activity_type: activity.activity_type,
      estimated_duration_min: activity.estimated_duration_min,
      expected_intensity: activity.expected_intensity,
      status: activity.status,
    })),
    cutProtocol,
    workoutPrescription: workoutPrescription ?? null,
    weeklyPlanEntry,
    riskScore: riskAssessment?.score ?? null,
    riskDrivers: riskAssessment?.drivers ?? [],
  });
}

export async function getWeeklyMission(userId: string, weekStart: string): Promise<WeeklyMissionPlan> {
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

  if (entries.every((entry) => entry.daily_mission_snapshot)) {
    return {
      entries: entries.map((entry) => ({
        ...entry,
        daily_mission_snapshot: entry.daily_mission_snapshot ?? null,
      })),
      headline: 'Weekly mission',
      summary: `${entries.length} sessions loaded from saved mission snapshots.`,
    };
  }

  const objectiveContext = await resolveObjectiveContext(userId, weekStart);
  const athleteContext = await getAthleteContext(userId);
  const acwr = await resolveACWR(userId, weekStart, objectiveContext.phase, athleteContext.fitnessLevel, athleteContext.isOnActiveCut);
  const readinessState = await resolveReadinessState(userId, weekStart, acwr, 0);
  const currentWeight = objectiveContext.currentWeightLbs ?? athleteContext.profile?.base_weight ?? 150;
  const targetWeight = objectiveContext.targetWeightLbs ?? currentWeight;
  const nutritionTargets = athleteContext.profile
    ? await resolveNutritionTargets({
      userId,
      date: weekStart,
      phase: objectiveContext.phase,
      currentWeight,
      profile: athleteContext.profile,
      weightTrend: objectiveContext.weightTrend,
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
    } as ResolvedNutritionTargets);
  const hydration = getHydrationProtocol({
    phase: objectiveContext.phase,
    fightStatus: athleteContext.profile?.fight_status ?? 'amateur',
    currentWeightLbs: currentWeight,
    targetWeightLbs: targetWeight,
    weeklyVelocityLbs: objectiveContext.weightTrend?.weeklyVelocityLbs,
  });

  return buildMicrocyclePlan({
    entries,
    macrocycleContext: objectiveContext,
    readinessState,
    acwr,
    baseNutritionTargets: nutritionTargets,
    hydration,
  });
}
