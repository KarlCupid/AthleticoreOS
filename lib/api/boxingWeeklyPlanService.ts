import { supabase } from '../supabase';
import type {
  ActivityType,
  BuildPhaseGoalRow,
  CampConfig,
  CampPlanRow,
  FitnessLevel,
  GymProfileRow,
  ReadinessState,
  RecurringActivityRow,
  SmartWeekPlanResult,
  TrainingSessionFamily,
  WeeklyPlanConfigRow,
  WeeklyPlanEntryRow,
  WeeklyTrainingMixPlan,
  WorkoutDoseBucket,
} from '../engine/types';
import { formatLocalDate, todayLocalDate } from '../utils/date';
import { logWarn } from '../utils/logger';
import { getAthleteContext } from './athleteContextService';
import { getDailyEngineState } from './dailyPerformanceService';
import { saveWeekPlan } from './weeklyPlanService';
import { getRecurringActivities } from './scheduleService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import {
  generatedProgramToWeeklyPlanEntries,
  inferProtectedWorkoutModality,
  readinessBandFromLevel,
  resolveBoxingSAndCEngineFlags,
  workoutProgrammingService,
  type BoxingTrainingContext,
  type BoxingTrainingTrack,
  type ProtectedWorkoutInput,
  type ProtectedWorkoutModality,
  type WorkoutIntensity,
} from '../performance-engine/workout-programming';

const TARGET_FAMILIES: TrainingSessionFamily[] = [
  'sparring',
  'boxing_skill',
  'conditioning',
  'strength',
  'durability_core',
  'recovery',
  'rest',
];

const EQUIPMENT_ALIASES: Record<string, string> = {
  barbell: 'barbell',
  dumbbells: 'dumbbells',
  kettlebells: 'kettlebell',
  cables: 'cable_machine',
  cable_crossover: 'cable_machine',
  pull_up_bar: 'pull_up_bar',
  resistance_bands: 'resistance_band',
  heavy_bag: 'heavy_bag',
  medicine_balls: 'medicine_ball',
  battle_ropes: 'battle_rope',
  sled: 'sled',
  assault_bike: 'assault_bike',
  rowing_machine: 'rowing_machine',
  jump_rope: 'jump_rope',
  squat_rack: 'squat_rack',
  bench: 'bench',
  plyo_box: 'plyo_box',
  trx: 'trx',
  leg_press_machine: 'leg_press',
  lat_pulldown_machine: 'lat_pulldown',
};

export function isBoxingWorkoutEngineEnabled(flag = process.env.EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED): boolean {
  return resolveBoxingSAndCEngineFlags({
    ...(process.env as Record<string, string | undefined>),
    EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED: flag,
  }).engineEnabled;
}

function todayStr(): string {
  return todayLocalDate();
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

function normalizeCampConfig(raw: CampPlanRow | CampConfig): CampConfig {
  if ('fightDate' in raw && 'campStartDate' in raw) return raw;
  const row = raw as CampPlanRow;
  return {
    id: row.id,
    user_id: row.user_id,
    fightDate: row.fight_date,
    campStartDate: row.camp_start_date,
    totalWeeks: row.total_weeks,
    hasConcurrentWeightClassPlan: row.has_concurrent_weight_class_plan,
    basePhaseDates: { start: row.base_phase_start, end: row.base_phase_end },
    buildPhaseDates: { start: row.build_phase_start, end: row.build_phase_end },
    peakPhaseDates: { start: row.peak_phase_start, end: row.peak_phase_end },
    taperPhaseDates: { start: row.taper_phase_start, end: row.taper_phase_end },
    status: row.status,
  };
}

function normalizeEquipment(equipment: GymProfileRow['equipment']): string[] {
  const mapped = equipment
    .map((item) => EQUIPMENT_ALIASES[item] ?? item)
    .filter((item) => item.trim().length > 0);
  return Array.from(new Set(['bodyweight', 'mat', 'open_space', 'track_or_road', ...mapped]));
}

function intensityFromRpe(value: number | null | undefined): WorkoutIntensity {
  if (value == null) return 'moderate';
  if (value <= 2.5) return 'recovery';
  if (value <= 4.5) return 'low';
  if (value <= 6.5) return 'moderate';
  return 'hard';
}

function modalityFromActivity(activity: RecurringActivityRow): ProtectedWorkoutModality {
  const label = activity.custom_label ?? activity.activity_type;
  const explicit = (() => {
    switch (activity.activity_type as ActivityType) {
      case 'sparring':
        return 'sparring';
      case 'boxing_practice':
        return 'boxing_skill';
      case 'running':
      case 'road_work':
        return 'roadwork_zone2';
      case 'conditioning':
        return 'boxing_conditioning';
      case 'active_recovery':
        return 'recovery';
      case 'sc':
        return 'strength_power';
      default:
        return 'unknown';
    }
  })();
  return inferProtectedWorkoutModality({ label, modality: explicit as ProtectedWorkoutModality });
}

function dayIndexForDate(weekStart: string, date: string): number {
  return Math.max(1, Math.min(7, daysBetween(weekStart, date) + 1));
}

function dateForLegacyDayOfWeek(weekStart: string, dayOfWeek: number): string | null {
  const startDow = new Date(`${weekStart}T00:00:00.000Z`).getUTCDay();
  const normalized = dayOfWeek === 7 ? 0 : dayOfWeek;
  if (normalized < 0 || normalized > 6) return null;
  const offset = (normalized - startDow + 7) % 7;
  return addDays(weekStart, offset);
}

function availableProgramDays(config: WeeklyPlanConfigRow, weekStart: string): number[] {
  const fromConfig = config.available_days
    .map((day) => dateForLegacyDayOfWeek(weekStart, Number(day)))
    .filter((date): date is string => Boolean(date))
    .map((date) => dayIndexForDate(weekStart, date));
  return Array.from(new Set(fromConfig.length > 0 ? fromConfig : [1, 2, 3, 4, 5])).sort((a, b) => a - b);
}

function protectedWorkoutsFromRecurringActivities(
  weekStart: string,
  recurringActivities: RecurringActivityRow[],
): ProtectedWorkoutInput[] {
  const protectedWorkouts: ProtectedWorkoutInput[] = [];
  for (const activity of recurringActivities.filter((item) => item.is_active)) {
    const days = activity.recurrence?.days_of_week?.length ? activity.recurrence.days_of_week : [];
    for (const day of days) {
      const date = dateForLegacyDayOfWeek(weekStart, Number(day));
      if (!date) continue;
      const modality = modalityFromActivity(activity);
      const protectedWorkout: ProtectedWorkoutInput = {
        id: `${activity.id}:${date}`,
        label: activity.custom_label ?? activity.activity_type.replace(/_/g, ' '),
        dayIndex: dayIndexForDate(weekStart, date),
        durationMinutes: Math.max(1, activity.estimated_duration_min),
        intensity: intensityFromRpe(activity.intended_intensity ?? activity.expected_intensity),
        modality,
        countsAsHardDay: modality === 'sparring' || modality === 'competition' || (activity.intended_intensity ?? activity.expected_intensity) >= 7,
        canStackGeneratedSession: activity.athlete_locked !== true,
        estimatedRpe: activity.intended_intensity ?? activity.expected_intensity,
        protectedDurationMinutes: Math.max(1, activity.estimated_duration_min),
      };
      if (activity.rounds != null) protectedWorkout.roundCount = activity.rounds;
      if (activity.round_duration_sec) protectedWorkout.roundMinutes = Math.round(activity.round_duration_sec / 60);
      protectedWorkouts.push(protectedWorkout);
    }
  }
  return protectedWorkouts;
}

function trackForAthlete(input: {
  fitnessLevel: FitnessLevel;
  fightStatus?: 'amateur' | 'pro' | null;
  phase: string;
  campConfig?: CampConfig | null;
}): BoxingTrainingTrack {
  const campLike = Boolean(input.campConfig) || input.phase.includes('camp') || input.phase.includes('taper');
  if (input.fightStatus === 'pro') return campLike ? 'pro_4_6_round' : 'pro_development';
  if (campLike || input.fitnessLevel === 'advanced' || input.fitnessLevel === 'elite') return 'amateur_open';
  if (input.fitnessLevel === 'intermediate') return 'amateur_novice';
  return 'aspiring_boxer';
}

function fightCampWeeksOut(fightDate: string | null | undefined, weekStart: string): number | undefined {
  if (!fightDate) return undefined;
  const days = daysBetween(weekStart, fightDate);
  if (!Number.isFinite(days)) return undefined;
  return Math.max(0, Math.ceil(days / 7));
}

function boxingTrainingContext(input: {
  track: BoxingTrainingTrack;
  config: WeeklyPlanConfigRow;
  protectedWorkouts: ProtectedWorkoutInput[];
  campConfig?: CampConfig | null;
  activeBuildGoal?: BuildPhaseGoalRow | null;
  weekStart: string;
  fightStatus?: 'amateur' | 'pro' | null;
}): BoxingTrainingContext {
  const boxingModalities = new Set([
    'boxing_skill',
    'shadowboxing',
    'footwork',
    'bag_work',
    'pad_work',
    'sparring',
    'competition',
  ]);
  const roadworkModalities = new Set(['roadwork_zone2', 'roadwork_tempo', 'roadwork_intervals']);
  const protectedBoxing = input.protectedWorkouts.filter((workout) => boxingModalities.has(workout.modality ?? 'unknown'));
  const technical = input.protectedWorkouts.filter((workout) => ['boxing_skill', 'shadowboxing', 'footwork'].includes(workout.modality ?? ''));
  const bagOrPad = input.protectedWorkouts.filter((workout) => ['bag_work', 'pad_work'].includes(workout.modality ?? ''));
  const sparring = input.protectedWorkouts.filter((workout) => workout.modality === 'sparring');
  const roadwork = input.protectedWorkouts.filter((workout) => roadworkModalities.has(workout.modality ?? 'unknown'));
  const conditioning = input.protectedWorkouts.filter((workout) => workout.modality === 'boxing_conditioning');
  const context: BoxingTrainingContext = {
    track: input.track,
    boxingSessionsPerWeek: protectedBoxing.length,
    technicalSessionsPerWeek: technical.length,
    bagOrPadSessionsPerWeek: bagOrPad.length,
    sparringSessionsPerWeek: sparring.length,
    roadworkSessionsPerWeek: roadwork.length,
    conditioningSessionsPerWeek: conditioning.length,
    allowSameDaySupportSessions: input.config.allow_two_a_days,
    roundCount: input.fightStatus === 'pro' ? 6 : 3,
    roundMinutes: 3,
    restSeconds: 60,
  };
  if (input.activeBuildGoal?.goal_type) {
    context.buildPhaseGoalType = input.activeBuildGoal.goal_type;
  }
  if (input.activeBuildGoal?.secondary_constraint) {
    context.buildPhaseSecondaryConstraint = input.activeBuildGoal.secondary_constraint;
  }
  const weeksOut = fightCampWeeksOut(input.campConfig?.fightDate, input.weekStart);
  if (weeksOut != null) context.fightCampWeeksOut = weeksOut;
  return context;
}

function generatedProgramWeekCount(input: {
  activeBuildGoal?: BuildPhaseGoalRow | null;
  campConfig?: CampConfig | null;
  weekStart: string;
}): number {
  const weeksUntilFight = fightCampWeeksOut(input.campConfig?.fightDate, input.weekStart);
  if (weeksUntilFight != null) return Math.max(1, Math.min(4, weeksUntilFight));
  return Math.max(4, Math.min(8, input.activeBuildGoal?.target_horizon_weeks ?? 4));
}

function mapDoseBucketToFamily(bucket: WorkoutDoseBucket): TrainingSessionFamily {
  if (bucket === 'conditioning') return 'conditioning';
  if (bucket === 'durability') return 'durability_core';
  if (bucket === 'recovery') return 'recovery';
  return 'strength';
}

function inferEntryFamily(entry: WeeklyPlanEntryRow): TrainingSessionFamily {
  if (entry.session_family) return entry.session_family;
  if (entry.session_type === 'sparring') return 'sparring';
  if (entry.session_type === 'boxing_practice') return 'boxing_skill';
  if (entry.session_type === 'conditioning' || entry.session_type === 'road_work' || entry.session_type === 'running') return 'conditioning';
  if (entry.session_type === 'active_recovery' || entry.focus === 'recovery') return 'recovery';
  return entry.focus ? 'strength' : 'rest';
}

function buildWeeklyMixPlanFromEntries(entries: WeeklyPlanEntryRow[], summary: string, weekStart: string): WeeklyTrainingMixPlan {
  const placementCounts = new Map<TrainingSessionFamily, number>();
  const realizedCounts = new Map<TrainingSessionFamily, number>();
  for (const entry of entries) {
    const family = inferEntryFamily(entry);
    placementCounts.set(family, (placementCounts.get(family) ?? 0) + 1);
    const realizedBuckets = entry.realized_dose_buckets ?? [];
    if (realizedBuckets.length > 0) {
      for (const bucket of realizedBuckets) {
        const realizedFamily = mapDoseBucketToFamily(bucket);
        realizedCounts.set(realizedFamily, (realizedCounts.get(realizedFamily) ?? 0) + 1);
      }
    } else if (entry.placement_source === 'locked') {
      realizedCounts.set(family, (realizedCounts.get(family) ?? 0) + 1);
    }
  }

  return {
    weekStartDate: weekStart,
    weekIntent: summary,
    sessionTargets: TARGET_FAMILIES.map((family) => {
      const target = placementCounts.get(family) ?? 0;
      const realized = realizedCounts.get(family) ?? 0;
      return {
        family,
        min: target > 0 ? 1 : 0,
        target,
        max: target,
        scheduled: realized,
        completed: entries.filter((entry) => inferEntryFamily(entry) === family && entry.status === 'completed').length,
        floor: target > 0 ? 1 : 0,
        realized,
        debt: Math.max(0, target - realized),
        metBySubstitution: 0,
        missReason: target > 0 && realized === 0 ? 'No realized boxing dose was saved for this target.' : null,
      };
    }),
    scDoseSummary: {
      hardSets: entries.reduce((sum, entry) => sum + (entry.dose_summary?.hardSets ?? 0), 0),
      sprintMeters: entries.reduce((sum, entry) => sum + (entry.dose_summary?.sprintMeters ?? 0), 0),
      plyoContacts: entries.reduce((sum, entry) => sum + (entry.dose_summary?.plyoContacts ?? 0), 0),
      hiitMinutes: entries.reduce((sum, entry) => sum + (entry.dose_summary?.hiitMinutes ?? 0), 0),
      aerobicMinutes: entries.reduce((sum, entry) => sum + (entry.dose_summary?.aerobicMinutes ?? 0), 0),
      circuitRounds: entries.reduce((sum, entry) => sum + (entry.dose_summary?.circuitRounds ?? 0), 0),
      highImpactCount: entries.reduce((sum, entry) => sum + (entry.dose_summary?.highImpactCount ?? 0), 0),
      tissueStressLoad: entries.reduce((sum, entry) => sum + (entry.dose_summary?.tissueStressLoad ?? 0), 0),
    },
    dailyPlacements: entries.map((entry) => ({
      date: entry.date,
      day_of_week: entry.day_of_week,
      slot: entry.slot,
      dayOrder: entry.day_order ?? null,
      sessionFamily: inferEntryFamily(entry),
      scSessionFamily: entry.sc_session_family ?? null,
      sessionType: entry.session_type as ActivityType | 'sc',
      focus: entry.focus,
      durationMin: entry.estimated_duration_min,
      targetIntensity: entry.target_intensity,
      source: entry.placement_source ?? 'generated',
      locked: entry.placement_source === 'locked',
      progressionIntent: entry.progression_intent ?? null,
      notes: entry.engine_notes,
      sessionModules: entry.session_modules ?? [],
      doseCredits: entry.dose_credits ?? [],
      doseSummary: entry.dose_summary ?? null,
      realizedDoseBuckets: entry.realized_dose_buckets ?? [],
      recurringActivityId: null,
    })),
    carryForwardAdjustments: [],
  };
}

export async function generateAndSaveBoxingWeeklyPlan(
  userId: string,
  planConfig: WeeklyPlanConfigRow,
  gym: GymProfileRow | null,
  weekStart: string,
): Promise<SmartWeekPlanResult> {
  if (!isBoxingWorkoutEngineEnabled()) {
    throw new Error('The Boxing S&C support engine is disabled for this build. Enable EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED to generate an Athleticore support week.');
  }
  if (!gym) {
    throw new Error('Create a gym profile before generating a boxing S&C support plan.');
  }

  const [athleteContext, engineState, recurringActivities, activeBuildGoal, campResult] = await Promise.all([
    getAthleteContext(userId),
    getDailyEngineState(userId, todayStr(), { forceRefresh: true }),
    getRecurringActivities(userId),
    getActiveBuildPhaseGoal(userId),
    supabase
      .from('fight_camps')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (campResult.error) throw campResult.error;
  const campConfig = campResult.data ? normalizeCampConfig(campResult.data as CampPlanRow | CampConfig) : null;
  const protectedWorkouts = protectedWorkoutsFromRecurringActivities(weekStart, recurringActivities);
  const fightStatus = athleteContext.profile?.fight_status ?? null;
  const track = trackForAthlete({
    fitnessLevel: athleteContext.fitnessLevel,
    fightStatus,
    phase: athleteContext.phase,
    campConfig,
  });
  const boxingContext = boxingTrainingContext({
    track,
    config: planConfig,
    protectedWorkouts,
    campConfig,
    activeBuildGoal,
    weekStart,
    fightStatus,
  });
  const readinessBand = engineState.unifiedPerformance?.canonicalOutputs.readiness.readinessBand
    ?? readinessBandFromLevel(engineState.readinessState as ReadinessState);

  const weekCount = generatedProgramWeekCount({ activeBuildGoal, campConfig, weekStart });
  const program = await workoutProgrammingService.generateWeeklyProgramForUser(userId, {
    goalId: 'boxing_support',
    durationMinutes: planConfig.session_duration_min,
    preferredDurationMinutes: planConfig.session_duration_min,
    equipmentIds: normalizeEquipment(gym.equipment),
    experienceLevel: athleteContext.fitnessLevel === 'elite' || athleteContext.fitnessLevel === 'advanced' ? 'advanced' : athleteContext.fitnessLevel,
    readinessBand,
    workoutEnvironment: 'gym',
    preferredToneVariant: 'coach_like',
    weekCount,
    desiredProgramLengthWeeks: weekCount,
    sessionsPerWeek: planConfig.available_days.length,
    availableDays: availableProgramDays(planConfig, weekStart),
    protectedWorkouts,
    boxingTrainingContext: boxingContext,
    startDate: weekStart,
    deloadStrategy: planConfig.auto_deload_interval_weeks > 0 ? 'week_four' : 'none',
  }, {
    useSupabase: true,
    persistGeneratedProgram: false,
    catalogFallback: 'safe',
    contentReviewMode: 'production',
    allowDraftContent: false,
  });

  const adapted = generatedProgramToWeeklyPlanEntries({
    userId,
    weekStart,
    program,
    planConfig,
    includeGeneratedWorkoutForSession: (session) => session.weekIndex === 1,
  });

  if (adapted.entries.length === 0) {
    throw new Error('The boxing engine could not place any sessions for this week. Check availability, protected anchors, and readiness data.');
  }

  const savedPlanEntries = await saveWeekPlan(userId, adapted.entries);
  void workoutProgrammingService.saveGeneratedProgramForUser(userId, program, {
    useSupabase: true,
    catalogFallback: 'safe',
    contentReviewMode: 'production',
    allowDraftContent: false,
  })
    .then((userProgramId) => {
      if (userProgramId) program.persistenceId = userProgramId;
    })
    .catch((persistError) => {
      logWarn('generateAndSaveBoxingWeeklyPlan.programPersistence', persistError, {
        userId,
        weekStart,
        savedEntryCount: savedPlanEntries.length,
      });
    });

  const savedEntries = savedPlanEntries;
  const firstWeek = program.weeks[0];
  const message = firstWeek?.weeklyAthleticDevelopmentSummary
    ?? firstWeek?.weeklyBoxingSummary
    ?? program.weeklyAthleticDevelopmentSummary
    ?? program.weeklyBoxingSummary
    ?? 'Athleticore support week generated from protected boxing anchors, readiness, and S&C support sessions.';

  return {
    entries: savedEntries,
    isDeloadWeek: firstWeek?.phase === 'deload',
    deloadReason: firstWeek?.phase === 'deload' ? 'Boxing engine deload strategy resolved this as a recovery-biased week.' : null,
    weeklyFocusSplit: {},
    weeklyMixPlan: buildWeeklyMixPlanFromEntries(savedEntries, message, weekStart),
    message,
  };
}
