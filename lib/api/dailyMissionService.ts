import { supabase } from '../supabase';
import {
  DAILY_ENGINE_VERSION,
  buildDailyMission,
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
import { getDailyEngineSnapshot, getDailyEngineSnapshotsForDates, upsertDailyEngineSnapshot } from './dailyEngineSnapshotService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getDefaultGymProfile } from './gymProfileService';
import { getExerciseHistoryBatch, getRecentExerciseIds, getExerciseLibrary, getRecentMuscleVolume } from './scService';
import { getScheduledActivities } from './scheduleService';
import { getEffectiveWeight, getWeightHistory } from './weightService';
import { updateDailyMissionSnapshotsByDate } from './weeklyPlanService';

interface DailyMissionOptions {
  forceRefresh?: boolean;
}

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
  weeklyPlanEntries?: WeeklyPlanEntryRow[];
}): Promise<ResolvedNutritionTargets> {
  const { userId, date, phase, currentWeight, profile, weightTrend, weeklyPlanEntries = [] } = input;
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
          }))
      : weeklyPlanEntries
          .filter((entry) => entry.status !== 'skipped')
          .map((entry) => ({
            activity_type: entry.session_type as any,
            expected_intensity: entry.target_intensity ?? 5,
            estimated_duration_min: entry.estimated_duration_min,
          }))),
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
    phase: input.phase,
    acwr: input.acwr.ratio,
    exerciseLibrary: library,
    recentExerciseIds: recentIds,
    recentMuscleVolume,
    trainingDate: input.date,
    focus: input.weeklyPlanEntry?.focus ?? undefined,
    trainingIntensityCap: input.cutProtocol?.training_intensity_cap ?? undefined,
    fitnessLevel: input.fitnessLevel as any,
    availableMinutes: input.weeklyPlanEntry?.estimated_duration_min,
    gymEquipment: gym?.equipment ?? [],
    exerciseHistory,
    isDeloadWeek: input.weeklyPlanEntry?.is_deload ?? false,
    weeklyPlanFocus: input.weeklyPlanEntry?.focus ?? undefined,
  });
}

export async function getDailyMission(
  userId: string,
  date: string,
  options: DailyMissionOptions = {},
): Promise<DailyMission> {
  const snapshot = options.forceRefresh ? null : await getDailyEngineSnapshot(userId, date);
  if (!options.forceRefresh && snapshot?.mission_snapshot?.engineVersion === DAILY_ENGINE_VERSION) {
    return snapshot.mission_snapshot;
  }

  const [objectiveContext, athleteContext, weeklyPlanEntries] = await Promise.all([
    resolveObjectiveContext(userId, date),
    getAthleteContext(userId),
    getPlanEntriesForDate(userId, date),
  ]);

  const primaryPlanEntry = pickPrimaryPlanEntry(weeklyPlanEntries);

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
      sessionDemandScore: 0,
      hydrationBoostOz: 0,
      reasonLines: [],
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
    weeklyPlanEntry: primaryPlanEntry,
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

  const mission = buildDailyMission({
    date,
    macrocycleContext: objectiveContext,
    readinessState,
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
      : weeklyPlanEntries.map((entry) => ({
          date: entry.date,
          activity_type: entry.session_type as any,
          estimated_duration_min: entry.estimated_duration_min,
          expected_intensity: entry.target_intensity ?? 5,
          status: toMissionActivityStatus(entry.status),
        }))),
    cutProtocol,
    workoutPrescription: workoutPrescription ?? null,
    weeklyPlanEntry: primaryPlanEntry,
    riskScore: riskAssessment?.score ?? null,
    riskDrivers: riskAssessment?.drivers ?? [],
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

  return mission;
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
