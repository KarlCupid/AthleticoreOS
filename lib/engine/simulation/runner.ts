import type { 
  DailySimulationLog, 
  SimulationConfig, 
  SimulationResult,
  SimulationState
} from './types.ts';
import { 
  buildDailyMission, 
  deriveReadinessProfile,
  deriveStimulusConstraintSet,
  getGlobalReadinessState,
  getBoxingIntensityScalar,
  generateCampPlan,
  generateSmartWeekPlan,
  prescribeConditioning,
  generateCutPlan,
  computeDailyCutProtocol
} from '../index.ts';
import { EXERCISE_SEED } from '../../data/exerciseSeed.ts';
import type { ExerciseLibraryRow } from '../types.ts';
import type {
  MacrocycleContext,
  PerformanceObjective,
} from '../types/mission.ts';
import type {
  ACWRResult,
} from '../types/readiness.ts';
import type {
  ScheduledActivityRow,
} from '../types/schedule.ts';

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addIsoDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

function buildSimulationCutPlan(input: {
  startDate: string;
  fightDate: string;
  startWeight: number;
  targetWeight: number;
}) {
  const { startDate, fightDate, startWeight, targetWeight } = input;
  const plan = generateCutPlan({
    startWeight,
    targetWeight,
    fightDate: addIsoDays(fightDate, 1),
    weighInDate: fightDate,
    fightStatus: 'pro',
    biologicalSex: 'male',
    sport: 'boxing',
  });

  return {
    id: 'sim-cut-plan',
    user_id: 'sim-user',
    start_weight: startWeight,
    target_weight: targetWeight,
    weight_class_name: 'Simulation',
    sport: 'boxing',
    fight_date: addIsoDays(fightDate, 1),
    weigh_in_date: fightDate,
    plan_created_date: startDate,
    fight_status: 'pro',
    max_water_cut_pct: plan.maxWaterCutPct,
    total_cut_lbs: plan.totalCutLbs,
    diet_phase_target_lbs: plan.dietPhaseTargetLbs,
    water_cut_allocation_lbs: plan.waterCutAllocationLbs,
    chronic_phase_start: plan.chronicPhaseDates?.start ?? startDate,
    chronic_phase_end: plan.chronicPhaseDates?.end ?? plan.intensifiedPhaseDates.start,
    intensified_phase_start: plan.intensifiedPhaseDates.start,
    intensified_phase_end: plan.intensifiedPhaseDates.end,
    fight_week_start: plan.fightWeekDates.start,
    weigh_in_day: fightDate,
    rehydration_start: addIsoDays(fightDate, 1),
    status: 'active',
    completed_at: null,
    safe_weekly_loss_rate: plan.safeWeeklyLossRateLbs,
    calorie_floor: plan.calorieFloor,
    baseline_cognitive_score: 100,
    coach_notes: null,
    created_at: `${startDate}T00:00:00Z`,
    updated_at: `${startDate}T00:00:00Z`,
  };
}

function normalizeCutProtocol(protocol: any) {
  if (!protocol) return null;
  return {
    ...protocol,
    cut_phase: protocol.cutPhase,
    days_to_weigh_in: protocol.daysToWeighIn,
    weight_drift_lbs: protocol.weightDriftLbs,
    prescribed_calories: protocol.prescribedCalories,
    prescribed_protein: protocol.prescribedProtein,
    prescribed_carbs: protocol.prescribedCarbs,
    prescribed_fat: protocol.prescribedFat,
    water_target_oz: protocol.waterTargetOz,
    sodium_target_mg: protocol.sodiumTargetMg,
    sodium_instruction: protocol.sodiumInstruction,
    fiber_instruction: protocol.fiberInstruction,
    training_recommendation: protocol.trainingRecommendation,
    training_intensity_cap: protocol.trainingIntensityCap,
    intervention_reason: protocol.interventionReason,
    morning_protocol: protocol.morningProtocol,
    afternoon_protocol: protocol.afternoonProtocol,
    evening_protocol: protocol.eveningProtocol,
    rehydration_protocol: protocol.rehydrationProtocol,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getWeekStartDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().split('T')[0];
}

function buildSimulationPlanConfig() {
  const availableDays = [1, 2, 3, 4, 5, 6];
  return {
    id: 'sim-plan-config',
    user_id: 'sim-user',
    available_days: availableDays,
    availability_windows: availableDays.map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '08:00',
      endTime: '20:00',
    })),
    session_duration_min: 60,
    allow_two_a_days: false,
    two_a_day_days: [],
    am_session_type: 'sc',
    pm_session_type: 'boxing_practice',
    preferred_gym_profile_id: null,
    auto_deload_interval_weeks: 4,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as const;
}

function buildSimulationRecurringActivities() {
  return [
    {
      id: 'sim-boxing-mon',
      user_id: 'sim-user',
      activity_type: 'boxing_practice',
      custom_label: 'Technical Bag Work',
      start_time: '18:00:00',
      estimated_duration_min: 60,
      expected_intensity: 6,
      session_components: [],
      recurrence: { frequency: 'weekly', interval: 1, days_of_week: [1] },
      is_active: true,
    },
    {
      id: 'sim-boxing-tue',
      user_id: 'sim-user',
      activity_type: 'boxing_practice',
      custom_label: 'Pad Work & Drills',
      start_time: '18:00:00',
      estimated_duration_min: 45,
      expected_intensity: 7,
      session_components: [],
      recurrence: { frequency: 'weekly', interval: 1, days_of_week: [2] },
      is_active: true,
    },
    {
      id: 'sim-spar-thu',
      user_id: 'sim-user',
      activity_type: 'sparring',
      custom_label: 'Hard Sparring',
      start_time: '18:00:00',
      estimated_duration_min: 60,
      expected_intensity: 9,
      session_components: [],
      recurrence: { frequency: 'weekly', interval: 1, days_of_week: [4] },
      is_active: true,
    },
    {
      id: 'sim-spar-fri',
      user_id: 'sim-user',
      activity_type: 'sparring',
      custom_label: 'Technical Sparring',
      start_time: '18:00:00',
      estimated_duration_min: 45,
      expected_intensity: 6,
      session_components: [],
      recurrence: { frequency: 'weekly', interval: 1, days_of_week: [5] },
      is_active: true,
    },
  ] as any[];
}

function simulateExerciseLogs(input: {
  prescription: any;
  trainingComplied: boolean;
  persona: { rpeBias: number };
  riskLevel: string;
  isMandatoryRecovery: boolean;
  random: () => number;
}) {
  const {
    prescription,
    trainingComplied,
    persona,
    riskLevel,
    isMandatoryRecovery,
    random,
  } = input;

  if (!prescription?.exercises?.length) return [];

  const riskPenalty = riskLevel === 'critical'
    ? 0.25
    : riskLevel === 'high'
      ? 0.15
      : riskLevel === 'moderate'
        ? 0.08
        : 0;

  return prescription.exercises.map((exercise: any, index: number) => {
    const completionChance = trainingComplied
      ? clamp(0.95 - (index * 0.04) - riskPenalty - (isMandatoryRecovery ? 0.35 : 0), 0.3, 0.98)
      : 0;
    const completed = random() < completionChance;
    const targetSets = Math.max(1, Number(exercise.targetSets ?? 1));
    const targetReps = Math.max(1, Number(exercise.targetReps ?? 1));
    const targetRpe = clamp(Number(exercise.targetRPE ?? 6), 1, 10);
    const sectionTitle = exercise.sectionIntent ?? exercise.sectionTemplate ?? null;
    const suggestedWeight = typeof exercise.suggestedWeight === 'number'
      ? Math.round(exercise.suggestedWeight)
      : null;

    if (!completed) {
      return {
        exerciseId: exercise.exercise.id,
        exerciseName: exercise.exercise.name,
        sectionTitle,
        targetSets,
        completedSets: 0,
        targetReps,
        actualReps: 0,
        targetRpe,
        actualRpe: null,
        suggestedWeight,
        actualWeight: null,
        completed: false,
        note: isMandatoryRecovery
          ? 'Skipped because the day was locked to recovery.'
          : 'Skipped after simulated athlete drop-off.',
      };
    }

    const setDropChance = 0.12 + riskPenalty + (index * 0.03);
    const repVariance = Math.round((random() - 0.5) * 2);
    const rpeNoise = (random() - 0.5) * 1.2;
    const completedSets = random() < setDropChance
      ? Math.max(1, targetSets - 1)
      : targetSets;
    const actualReps = clamp(targetReps + repVariance, 1, Math.max(20, targetReps + 3));
    const actualRpe = clamp(targetRpe + (persona.rpeBias * 0.45) + rpeNoise + (completedSets < targetSets ? 0.35 : 0), 1, 10);
    const actualWeight = suggestedWeight != null
      ? Math.max(0, Math.round(suggestedWeight * (1 + ((actualRpe - targetRpe) * 0.025))))
      : null;

    let note = 'Completed as prescribed.';
    if (completedSets < targetSets) {
      note = 'Dropped one set because simulated fatigue built up mid-session.';
    } else if (actualRpe >= targetRpe + 1) {
      note = 'Logged harder than prescribed; athlete input drifted upward.';
    } else if (actualRpe <= targetRpe - 1) {
      note = 'Logged easier than prescribed; athlete moved well today.';
    }

    return {
      exerciseId: exercise.exercise.id,
      exerciseName: exercise.exercise.name,
      sectionTitle,
      targetSets,
      completedSets,
      targetReps,
      actualReps,
      targetRpe,
      actualRpe: Number(actualRpe.toFixed(1)),
      suggestedWeight,
      actualWeight,
      completed: true,
      note,
    };
  });
}

function simulateConditioningLog(input: {
  prescription: any;
  trainingComplied: boolean;
  persona: { rpeBias: number };
  riskLevel: string;
  random: () => number;
}) {
  const { prescription, trainingComplied, persona, riskLevel, random } = input;
  if (!prescription) return null;

  const riskPenalty = riskLevel === 'critical'
    ? 0.22
    : riskLevel === 'high'
      ? 0.14
      : riskLevel === 'moderate'
        ? 0.08
        : 0;

  const completionBase = trainingComplied ? clamp(0.94 - riskPenalty, 0.45, 0.98) : 0.2;
  const completedRounds = Math.max(
    0,
    Math.min(
      prescription.rounds,
      Math.round(prescription.rounds * clamp(completionBase + ((random() - 0.5) * 0.18), 0, 1)),
    ),
  );
  const completionRate = prescription.rounds > 0 ? completedRounds / prescription.rounds : 0;
  const completedDurationMin = Math.round(prescription.totalDurationMin * completionRate);
  const actualRpe = completedRounds > 0
    ? Number(clamp((prescription.intensityLabel === 'hard' ? 7.5 : prescription.intensityLabel === 'moderate' ? 6 : 4.5) + persona.rpeBias * 0.4 + ((random() - 0.5) * 1.2), 1, 10).toFixed(1))
    : null;

  const drillLogs = (prescription.exercises ?? []).map((drill: any, index: number) => {
    const drillCompletionChance = clamp(completionBase - (index * 0.03), 0.2, 0.98);
    const completed = random() < drillCompletionChance && completedRounds > 0;
    const drillRounds = completed ? Math.max(1, Math.min(drill.rounds ?? prescription.rounds, completedRounds)) : 0;
    let note = 'Completed cleanly at the prescribed conditioning rhythm.';
    if (!completed) {
      note = 'Dropped from the simulated conditioning block before this drill was completed.';
    } else if (drillRounds < (drill.rounds ?? prescription.rounds)) {
      note = 'Only partial rounds were completed before the athlete faded.';
    } else if (actualRpe != null && actualRpe >= 8) {
      note = 'Logged as a hard effort with fatigue accumulating late.';
    }

    return {
      name: drill.name,
      targetRounds: drill.rounds ?? prescription.rounds,
      completedRounds: drillRounds,
      durationSec: drill.durationSec ?? null,
      reps: drill.reps ?? null,
      restSec: drill.restSec ?? prescription.restIntervalSec,
      completed,
      note,
    };
  });

  let note = 'Conditioning session completed close to plan.';
  if (completedRounds === 0) {
    note = 'Conditioning session was effectively missed by the simulated athlete.';
  } else if (completionRate < 0.7) {
    note = 'Conditioning volume dropped off before the full prescription was completed.';
  } else if (actualRpe != null && actualRpe >= 8) {
    note = 'Conditioning landed harder than prescribed and should be reviewed against readiness.';
  }

  return {
    completedRounds,
    prescribedRounds: prescription.rounds,
    completedDurationMin,
    targetDurationMin: prescription.totalDurationMin,
    actualRpe,
    completionRate: Number(completionRate.toFixed(2)),
    note,
    drillLogs,
  };
}


/**
 * Core loop to run a simulation for a specific persona
 */
export async function runSimulation(config: SimulationConfig): Promise<SimulationResult> {
  const { startDate, weeks, persona, initialState } = config;
  const days = weeks * 7;
  const dailyLogs: DailySimulationLog[] = [];
  const random = createSeededRandom(config.seed ?? 42);

  // 1. Initialize Simulation State
  let simState: SimulationState = {
    fatigue: {
      centralFatigue: 0,
      muscularDamage: 0,
      accumulationHistory: []
    },
    metabolism: {
      currentWeightLbs: initialState.weightLbs,
      glycogenStores: 1.0,
      hydrationState: 1.0
    },
    consecutiveDepletedDays: 0
  };

  // Simulated Ledgers (History)
  let sessionHistory: any[] = [];
  let recentExerciseIds: string[] = [];
  let recentMuscleVolume: Record<string, number> = {};
  const simulationCutPlan = initialState.goalMode === 'fight_camp' && initialState.targetWeight && initialState.fightDate
    ? buildSimulationCutPlan({
        startDate,
        fightDate: initialState.fightDate,
        startWeight: initialState.weightLbs,
        targetWeight: initialState.targetWeight,
      })
    : null;
  const simulationCampConfig = initialState.goalMode === 'fight_camp' && initialState.fightDate
    ? generateCampPlan({
        userId: 'sim-user',
        campStartDate: startDate,
        fightDate: initialState.fightDate,
        hasConcurrentCut: simulationCutPlan != null,
      })
    : null;
  const simulationPlanConfig = buildSimulationPlanConfig();
  const simulationRecurringActivities = buildSimulationRecurringActivities();

  for (let i = 0; i < days; i++) {
    const dateStr = addIsoDays(startDate, i);
    
    // Deep clone state Before
    const stateBefore: SimulationState = JSON.parse(JSON.stringify(simState));

    // --- STEP 1: Simulate Morning State ---
    
    // Readiness is impacted by central fatigue
    const fatiguePenalty = (simState.fatigue.centralFatigue / 40); // up to -2.5 points on 1-5 scale
    const baseReadiness = persona.averageReadiness - fatiguePenalty;
    const readinessLogged = Math.max(1, Math.min(5, Math.round(baseReadiness + (random() - 0.5) * persona.readinessVolatility * 10)));

    // Sleep is impacted by overtraining/fatigue spikes
    const sleepPenalty = simState.fatigue.centralFatigue > 80 ? 1 : 0;
    const sleepLogged = Math.max(1, Math.min(5, Math.round(persona.averageSleepQuality - sleepPenalty + (random() - 0.5) * persona.readinessVolatility * 10)));

    if (readinessLogged <= 2) {
      simState.consecutiveDepletedDays++;
    } else {
      simState.consecutiveDepletedDays = 0;
    }

    // --- STEP 2: Engine Decision Loop ---

    const prescribedIntensity = 7; // Moderate-high fallback when mission doesn't provide a cap

    // Compute ACWR based on simulated muscular damage (proxy for load)
    const mockACWR: ACWRResult = {
      ratio: 1.0 + (simState.fatigue.muscularDamage / 200), // Simple proxy — divided by 200 to prevent ACWR death spiral
      status: simState.fatigue.muscularDamage > 100 ? 'redline' : simState.fatigue.muscularDamage > 60 ? 'caution' : 'safe',
      acute: simState.fatigue.muscularDamage,
      chronic: 50,
      acuteEWMA: 50,
      chronicEWMA: 50,
      daysOfData: i,
      message: 'Simulated Biological ACWR',
      thresholds: { caution: 1.2, redline: 1.5, confidence: 'high', personalizationFactors: [], source: 'ewma_personalized' },
      loadMetrics: {
        weeklyLoad: Math.round(simState.fatigue.muscularDamage),
        monotony: 1,
        strain: Math.round(simState.fatigue.muscularDamage),
        acuteEWMA: simState.fatigue.muscularDamage,
        chronicEWMA: 50,
        rollingFatigueRatio: 1,
        rollingFatigueScore: simState.fatigue.centralFatigue,
        fatigueBand: simState.fatigue.centralFatigue > 75 ? 'very_high' : simState.fatigue.centralFatigue > 55 ? 'high' : simState.fatigue.centralFatigue > 30 ? 'moderate' : 'low',
        safetyThreshold: 1.2,
        thresholdSource: 'low_chronic',
        dailyLoads: [],
      }
    } as any;

    const baselineTdee = simState.metabolism.currentWeightLbs * 15.5; // Activity-adjusted baseline for a fighter
    const currentExercises: ExerciseLibraryRow[] = EXERCISE_SEED.map((ex, idx) => ({ ...ex, id: `seed-${idx}` }));

    // --- STEP 1: External Loads & Camp Context ---
    const dayOfWeek = (i % 7) + 1; // 1=Mon, 7=Sun
    const isFightWeek = i >= (days - 7);
    const daysOut = Math.max(0, days - i);
    const isOnActiveCut = initialState.goalMode === 'fight_camp' && daysOut <= 14;
    const simulatedCampPhase = daysOut <= 7 ? 'taper' : daysOut <= 14 ? 'peak' : 'build';
    const simulatedPerformanceGoalType = initialState.goalMode === 'fight_camp' ? 'boxing_skill' : 'strength';
    const weekStartDate = getWeekStartDate(dateStr);
    const simulatedPhase = initialState.goalMode === 'fight_camp'
      ? (simulatedCampPhase === 'build' ? 'camp-build' : simulatedCampPhase === 'peak' ? 'camp-peak' : 'camp-taper')
      : 'off-season';

    const readinessState = getGlobalReadinessState({
      sleep: sleepLogged,
      readiness: readinessLogged,
      acwr: mockACWR.ratio,
      weightPenalty: 0 
    });

    const weeklyPlan = generateSmartWeekPlan({
      config: simulationPlanConfig as any,
      readinessState,
      phase: simulatedPhase as any,
      acwr: mockACWR.ratio,
      fitnessLevel: initialState.fitnessLevel as any,
      performanceGoalType: simulatedPerformanceGoalType as any,
      exerciseLibrary: currentExercises,
      recentExerciseIds,
      recentMuscleVolume: recentMuscleVolume as any,
      campConfig: simulationCampConfig as any,
      activeCutPlan: simulationCutPlan as any,
      weeksSinceLastDeload: Math.max(0, Math.floor(i / 7) % 4),
      gymProfile: null,
      weekStartDate,
      recurringActivities: simulationRecurringActivities as any,
    });

    const todaysPlanEntries = weeklyPlan.entries.filter((entry) => entry.date === dateStr);
    const primaryPlanEntry = todaysPlanEntries.find((entry) => entry.focus != null || entry.prescription_snapshot != null)
      ?? todaysPlanEntries[0]
      ?? null;
    const primaryEnginePlanEntry = todaysPlanEntries.find((entry) => entry.focus != null || entry.prescription_snapshot != null) ?? null;
    const scheduledActivities: ScheduledActivityRow[] = todaysPlanEntries.map((entry, entryIndex) => ({
      id: `sim-${dateStr}-${entryIndex}`,
      recurring_activity_id: null,
      user_id: 'sim-user',
      date: dateStr,
      activity_type: entry.session_type as any,
      custom_label: entry.session_type === 'boxing_practice'
        ? (dayOfWeek === 1 ? 'Technical Bag Work' : 'Pad Work & Drills')
        : entry.session_type === 'sparring'
          ? (dayOfWeek === 4 ? 'Hard Sparring' : 'Technical Sparring')
          : entry.focus?.replace(/_/g, ' ') ?? entry.session_type,
      start_time: entry.slot === 'pm' ? '18:00:00' : entry.slot === 'am' ? '08:00:00' : null,
      estimated_duration_min: entry.estimated_duration_min,
      session_components: [],
      source: 'engine',
      status: 'scheduled',
      actual_duration_min: null,
      actual_rpe: null,
      notes: entry.engine_notes ?? null,
      engine_recommendation: entry.engine_notes ?? null,
      expected_intensity: entry.target_intensity ?? 5,
    } as any));
    const todayBoxingActivity = scheduledActivities.find((activity) =>
      activity.activity_type === 'boxing_practice' || activity.activity_type === 'sparring',
    ) ?? null;
    const todayBoxing = todayBoxingActivity ? {
      name: todayBoxingActivity.custom_label ?? todayBoxingActivity.activity_type,
      type: todayBoxingActivity.activity_type,
      intensity: todayBoxingActivity.expected_intensity,
      duration: todayBoxingActivity.estimated_duration_min,
    } : null;

    const performanceObjective: PerformanceObjective = {
      mode: initialState.goalMode,
      goalType: simulatedPerformanceGoalType,
      primaryOutcome: initialState.goalMode === 'fight_camp' ? 'Fight Readiness' : 'Build Strength',
      secondaryConstraint: 'protect_recovery',
      goalLabel: 'Simulated Goal',
      targetMetric: 'fight_readiness',
      targetValue: null,
      targetUnit: null,
      deadline: initialState.fightDate || null,
      horizonWeeks: weeks,
      successWindow: null
    };

    const macrocycleContext: MacrocycleContext = {
      date: dateStr,
      phase: simulatedPhase as any,
      goalMode: initialState.goalMode,
      performanceGoalType: simulatedPerformanceGoalType as any,
      performanceObjective,
      buildGoal: null,
      camp: simulationCampConfig ? {
        ...simulationCampConfig,
        targetWeight: initialState.targetWeight || 170,
        weightCutState: isOnActiveCut ? 'driving' : 'none',
        createdAt: '',
        updatedAt: ''
      } as any : null,
      campPhase: simulatedCampPhase as any,
      weightCutState: isOnActiveCut ? 'driving' : 'none',
      isOnActiveCut,
      weighInTiming: null,
      daysOut,
      isTravelWindow: false,
      currentWeightLbs: simState.metabolism.currentWeightLbs,
      targetWeightLbs: initialState.targetWeight || null,
      remainingWeightLbs: (initialState.targetWeight && simState.metabolism.currentWeightLbs) ? (simState.metabolism.currentWeightLbs - initialState.targetWeight) : null,
      weightTrend: null
    };

    // Trigger Weight Cut Protocol (Simulation 6.0)
    let cutProtocol: any = null;
    if (simulationCutPlan && isOnActiveCut) {
      const rawCutProtocol = computeDailyCutProtocol({
        plan: simulationCutPlan as any,
        date: dateStr,
        currentWeight: simState.metabolism.currentWeightLbs,
        weightHistory: dailyLogs.slice(-14).map((log) => ({
          date: log.date,
          weight: log.stateAfter.metabolism.currentWeightLbs,
        })),
        baseNutritionTargets: { 
          tdee: baselineTdee,
          adjustedCalories: baselineTdee,
          protein: 180,
          carbs: 300,
          fat: 80,
          fuelState: 'aerobic'
        } as any,
        dayActivities: scheduledActivities as any,
        readinessState,
        acwr: mockACWR.ratio,
        cycleDay: null,
        weeklyVelocityLbs: -1.5,
        lastRefeedDate: null,
        lastDietBreakDate: null,
        baselineCognitiveScore: 100,
        latestCognitiveScore: isFightWeek ? 85 : 100,
        urineColor: isFightWeek ? 5 : 2,
        bodyTempF: 98.6,
        consecutiveDepletedDays: simState.consecutiveDepletedDays,
        biologicalSex: 'male'
      });
      cutProtocol = normalizeCutProtocol(rawCutProtocol);
    }

    const simulatedRiskDrivers: string[] = [];
    const combatLoad = scheduledActivities
      .filter((activity) => activity.activity_type === 'boxing_practice' || activity.activity_type === 'sparring')
      .reduce((sum, activity) => sum + ((activity.expected_intensity * activity.estimated_duration_min) / 10), 0);
    const guidedLoad = scheduledActivities
      .filter((activity) => activity.activity_type === 'sc' || activity.activity_type === 'conditioning')
      .reduce((sum, activity) => sum + ((activity.expected_intensity * activity.estimated_duration_min) / 12), 0);
    const simulatedRiskScore = Math.max(
      0,
      Math.round((simState.fatigue.centralFatigue - 39) + (combatLoad * 0.31) + (guidedLoad * 0.12) + (scheduledActivities.length >= 2 ? 4 : 0)),
    );
    if (scheduledActivities.length >= 2) {
      simulatedRiskDrivers.push('Double-session day is stacking combat and S&C stress.');
    }
    if (scheduledActivities.some((activity) => activity.activity_type === 'sparring' && activity.expected_intensity >= 7)) {
      simulatedRiskDrivers.push('Hard sparring is on the schedule today.');
    }
    if (simState.fatigue.centralFatigue >= 85) {
      simulatedRiskDrivers.push('Central fatigue is above 85 and needs intervention.');
    }
    if (simState.metabolism.glycogenStores <= 0.3) {
      simulatedRiskDrivers.push('Glycogen stores are critically depleted.');
    }

    const readinessProfile = deriveReadinessProfile({
      sleepQuality: sleepLogged,
      subjectiveReadiness: readinessLogged,
      acwrRatio: mockACWR.ratio,
      loadMetrics: mockACWR.loadMetrics,
      readinessHistory: [readinessLogged],
    });
    const constraintSet = deriveStimulusConstraintSet(readinessProfile, {
      phase: macrocycleContext.phase,
      goalMode: macrocycleContext.goalMode,
      daysOut,
    });

    const mission = buildDailyMission({
      date: dateStr,
      macrocycleContext,
      readinessState,
      readinessProfile,
      constraintSet,
      acwr: mockACWR,
      nutritionTargets: {
        tdee: baselineTdee,
        adjustedCalories: baselineTdee,
        protein: 180,
        carbs: 300,
        fat: 80,
        proteinModifier: 1.0,
        phaseMultiplier: 1.0,
        weightCorrectionDeficit: 0,
        message: 'Base Simulation TDEE',
        source: 'base',
        fuelState: 'aerobic',
        prioritySession: todayBoxing?.type === 'sparring'
          ? 'sparring'
          : todayBoxing?.type === 'boxing_practice'
            ? 'boxing_practice'
            : primaryPlanEntry?.session_type === 'conditioning'
              ? 'conditioning'
              : 'heavy_sc',
        deficitClass: initialState.goalMode === 'fight_camp' ? 'steady_cut' : 'steady_maintain',
        recoveryNutritionFocus: 'none',
        sessionDemandScore: 50,
        hydrationBoostOz: 0,
        hydrationPlan: {
          dailyTargetOz: cutProtocol?.water_target_oz || 128,
          sodiumTargetMg: cutProtocol?.sodium_target_mg || null,
          emphasis: cutProtocol ? 'cut' : 'performance',
          notes: [],
        },
        sessionFuelingPlan: {
          priority: todayBoxing?.type === 'sparring'
            ? 'sparring'
            : todayBoxing?.type === 'boxing_practice'
              ? 'boxing_practice'
              : primaryPlanEntry?.session_type === 'conditioning'
                ? 'conditioning'
                : 'heavy_sc',
          priorityLabel: todayBoxing?.type === 'sparring'
            ? 'Sparring'
            : todayBoxing?.type === 'boxing_practice'
              ? 'Boxing practice'
              : primaryPlanEntry?.session_type === 'conditioning'
                ? 'Conditioning'
                : 'Heavy S&C',
          sessionLabel: todayBoxing?.name || primaryPlanEntry?.focus?.replace(/_/g, ' ') || 'Simulation training',
          preSession: { label: 'Before training', timing: '60-90 min', carbsG: 40, proteinG: 20, notes: [] },
          intraSession: { fluidsOz: 20, electrolytesMg: 600, carbsG: 15, notes: [] },
          betweenSessions: null,
          postSession: { label: 'After training', timing: 'Within 60 min', carbsG: 35, proteinG: 30, notes: [] },
          hydrationNotes: [],
          coachingNotes: [],
        },
        reasonLines: [],
        energyAvailability: 35,
        fuelingFloorTriggered: false,
        deficitBankDelta: 0,
        safetyWarning: 'none',
        traceLines: []
      } as any,
      hydration: { dailyWaterOz: cutProtocol?.water_target_oz || 128, message: 'Simulated' } as any,
      scheduledActivities: scheduledActivities.map(a => ({
        date: a.date,
        activity_type: a.activity_type,
        estimated_duration_min: a.estimated_duration_min,
        expected_intensity: a.expected_intensity
      })),
      cutProtocol: cutProtocol as any,
      workoutPrescription: primaryPlanEntry?.prescription_snapshot ?? null,
      weeklyPlanEntry: primaryPlanEntry as any,
      medStatus: null,
      riskScore: simulatedRiskScore,
      riskDrivers: simulatedRiskDrivers
    });

    const hasStructuredPrescription = Array.isArray(mission.trainingDirective.prescription?.exercises)
      && mission.trainingDirective.prescription.exercises.length > 0;

    const fallbackConditioningPrescription = mission.trainingDirective.workoutType === 'conditioning'
      && !hasStructuredPrescription
      ? prescribeConditioning({
          phase: macrocycleContext.phase,
          fitnessLevel: initialState.fitnessLevel,
          readinessState,
          readinessProfile,
          constraintSet,
          acwr: mockACWR.ratio,
          sessionIndex: Math.floor(i / 7),
          activeCutPlan: simulationCutPlan as any,
          trainingIntensityCap: mission.trainingDirective.intensityCap,
        })
      : null;

    // --- STEP 2.5: Weight Cut & Fatigue Physics (Simulation 6.0) ---
    if (cutProtocol) {
      // Acute Weight Shift Physics
      if (cutProtocol.cutPhase === 'fight_week_cut') {
        const waterLoss = (random() * 1.5) + 1.0;
        simState.metabolism.currentWeightLbs -= waterLoss;
        // Severe fatigue penalty for dehydration/fog
        simState.fatigue.centralFatigue = Math.min(100, simState.fatigue.centralFatigue + 20);
      } else if (cutProtocol.cutPhase === 'rehydration') {
        const waterRegain = (random() * 4) + 3;
        simState.metabolism.currentWeightLbs += waterRegain;
      }

      // Glycogen Stores impact
      if (cutProtocol.cutPhase === 'intensified' || cutProtocol.cutPhase === 'fight_week_cut') {
        simState.metabolism.glycogenStores = Math.max(0.1, simState.metabolism.glycogenStores - 0.2);
        simState.consecutiveDepletedDays++;
      } else {
        simState.consecutiveDepletedDays = 0;
      }
    }

    const workoutBlueprint = hasStructuredPrescription
      ? mission.trainingDirective.prescription.exercises.map((e: any) =>
        `${e.exercise.name} (${e.targetSets}x${e.targetReps} @ RPE ${e.targetRPE})`
      ).join(' | ')
      : fallbackConditioningPrescription
        ? fallbackConditioningPrescription.exercises.map((exercise: any) => {
          const effort = exercise.durationSec != null
            ? `${exercise.rounds} rounds x ${exercise.durationSec}s`
            : `${exercise.rounds} rounds x ${exercise.reps ?? 0} reps`;
          return `${exercise.name} (${effort})`;
        }).join(' | ')
        : todayBoxing
          ? `${todayBoxing.name} (${todayBoxing.duration} min @ RPE ${todayBoxing.intensity})`
          : 'Rest Day';

    // --- STEP 3: Persona Reaction & Biological Physics ---

    // A. Nutrition (Simulation 5.0: Variety & Role Adaptation)
    const isCheatDay = random() < (persona.cheatDayProbability || 0);
    const nutritionComplied = !isCheatDay && random() < persona.nutritionCompliance;
    
    // Base targets from engine
    let actualCalories = mission.fuelDirective.calories;
    let actualProtein = mission.fuelDirective.protein;
    let actualCarbs = mission.fuelDirective.carbs;
    let actualFat = mission.fuelDirective.fat;

    // Apply "Compliant Variance" (+/- 10%)
    const variance = 0.9 + (random() * 0.2);
    if (nutritionComplied) {
      actualCalories *= variance;
      actualProtein *= variance;
      actualCarbs *= variance;
      actualFat *= variance;
    } else if (isCheatDay) {
      actualCalories += (persona.cheatDayCalorieBurden || 1000);
      actualCarbs += 150; // Cheat days are usually carb-heavy
      actualFat += 50;
    } else {
      // Non-compliant but not cheat: higher variance
      const badVariance = 0.7 + (random() * 0.6); // 70% to 130%
      actualCalories *= badVariance;
      actualProtein *= badVariance;
      actualCarbs *= badVariance;
      actualFat *= badVariance;
    }

    // Role Adaptation: Develop days get a carb boost, recovery days get more protein ratio
    if (mission.trainingDirective.sessionRole === 'develop') {
      actualCarbs += 30; // Extra fueling for hard work
    } else if (mission.trainingDirective.sessionRole === 'recover') {
      actualCarbs -= 20; // Lower demand
    }

    // Physics Check (Simulation 3.0/5.0)
    // actualCalories, actualProtein, etc are already defined above

    // Physics: Use dynamic baselineTdee for deficit calculation
    const calorieDelta = actualCalories - baselineTdee; 
    const weightChange = (calorieDelta / 3500) + (random() * 0.1 - 0.05);
    simState.metabolism.currentWeightLbs += weightChange;

    // Boxing execution follows the shared taper rule, then mission intervention can shut it down.
    if (todayBoxing) {
      if (mission.trainingDirective.isMandatoryRecovery) {
        todayBoxing.intensity = 0;
        todayBoxing.name = `SKIPPED: ${todayBoxing.name} (Mandatory Recovery)`;
      } else if (simState.fatigue.centralFatigue > 90) {
        todayBoxing.intensity = 0;
        todayBoxing.name = `SKIPPED: ${todayBoxing.name} (Extreme Fatigue)`;
      } else if (mission.trainingDirective.intensityCap != null) {
        todayBoxing.intensity = Math.min(todayBoxing.intensity, mission.trainingDirective.intensityCap);
      }
    }

    // B. Training (Simulation 5.0: Healing Physics)
    const trainingComplied = random() < persona.workoutCompliance;
    
    // Use the capped intensity from the mission as the limit
    const missionCap = mission.trainingDirective.intensityCap;
    const baseIntensity = missionCap ?? prescribedIntensity;
    
    let actualRpe = trainingComplied ? Math.max(0, Math.min(10, baseIntensity + persona.rpeBias)) : 0;
    
    // Limit the overshoot by Grinders in moderate/high risk scenarios
    if (missionCap !== null && actualRpe > missionCap + 1.5) {
      actualRpe = missionCap + 1.5; 
    }

    if (trainingComplied) {
      const duration = mission.trainingDirective.durationMin || 60;
      const isRecoverySession = mission.trainingDirective.workoutType === 'recovery' || mission.trainingDirective.sessionRole === 'recover';
      
      if (isRecoverySession && actualRpe <= 5.5) {
        // Healing Physics: Stronger subtraction to break redline loops
        // Lower RPE = higher recovery power
        const recoveryPower = (6 - actualRpe) * (duration / 60) * 4; 
        simState.fatigue.centralFatigue = Math.max(0, simState.fatigue.centralFatigue - recoveryPower);
        simState.fatigue.muscularDamage = Math.max(0, simState.fatigue.muscularDamage - (recoveryPower * 2));
      } else {
        // Standard Accumulation
        const fatigueGenerated = (Math.pow(actualRpe, 2) * (duration / 60)) / 2;
        simState.fatigue.centralFatigue = Math.min(100, simState.fatigue.centralFatigue + fatigueGenerated);
        simState.fatigue.muscularDamage = Math.min(100, simState.fatigue.muscularDamage + (fatigueGenerated * 1.2));
      }
    }

    if (todayBoxing && todayBoxing.intensity > 0) {
      const boxingStressMultiplier = todayBoxing.type === 'sparring' ? 1.25 : 0.85;
      const boxingFatigue = ((Math.pow(todayBoxing.intensity, 2) * (todayBoxing.duration / 60)) / 2) * boxingStressMultiplier;
      simState.fatigue.centralFatigue = Math.min(100, simState.fatigue.centralFatigue + (boxingFatigue * 0.85));
      simState.fatigue.muscularDamage = Math.min(100, simState.fatigue.muscularDamage + (boxingFatigue * (todayBoxing.type === 'sparring' ? 0.95 : 0.65)));
      simState.metabolism.glycogenStores = Math.max(
        0.1,
        simState.metabolism.glycogenStores - (todayBoxing.type === 'sparring' ? 0.08 : 0.04),
      );
    }

    // C. Natural Recovery (Overnight)
    // Add Biological Variance (+/- 20% to recovery efficiency)
    const recoveryEfficiency = 0.8 + (random() * 0.4);
    simState.fatigue.centralFatigue = Math.max(0, simState.fatigue.centralFatigue - (sleepLogged * 5.0 * recoveryEfficiency));
    simState.fatigue.muscularDamage = Math.max(0, simState.fatigue.muscularDamage - (sleepLogged * 5.0 * recoveryEfficiency));

    const completedSession = trainingComplied ? {
      type: mission.trainingDirective.workoutType || 'unknown',
      sessionName: fallbackConditioningPrescription?.message || mission.trainingDirective.focus || 'Strength & Conditioning',
      prescribedRpe: baseIntensity,
      actualRpe,
      prescribedDuration: mission.trainingDirective.durationMin || fallbackConditioningPrescription?.totalDurationMin || 60,
      actualDuration: mission.trainingDirective.durationMin || fallbackConditioningPrescription?.totalDurationMin || 60,
      tonnage: actualRpe * 1000 // Mock tonnage
    } : null;
    const exerciseLogs = simulateExerciseLogs({
      prescription: hasStructuredPrescription ? mission.trainingDirective.prescription : null,
      trainingComplied,
      persona,
      riskLevel: mission.riskState.level,
      isMandatoryRecovery: mission.trainingDirective.isMandatoryRecovery,
      random,
    });
    const conditioningLog = simulateConditioningLog({
      prescription: fallbackConditioningPrescription,
      trainingComplied,
      persona,
      riskLevel: mission.riskState.level,
      random,
    });

    // --- STEP 4: Narrative Auditor (Simulation 3.0) ---
    let coachingInsight = '';
    let athleteMonologue = '';

    if (mission.riskState.level === 'moderate' || mission.riskState.level === 'high' || mission.riskState.level === 'critical') {
      coachingInsight = `Engine detected high risk (${mission.riskState.level}): ${mission.riskState.drivers[0]}. Pulled back to ${mission.trainingDirective.sessionRole} role.`;
      athleteMonologue = `I'm feeling pretty beat up. My ${mission.riskState.drivers[0].toLowerCase()} is catching up to me. Glad the engine saw it.`;
    } else if (readinessLogged >= 5) {
      coachingInsight = `Athlete is in Prime shape. Prescribing high-intensity ${mission.trainingDirective.focus} work to capitalize on readiness.`;
      athleteMonologue = `Feeling like a beast today. Ready to smash this session.`;
    } else {
      coachingInsight = `Steady state progression. Maintaining ${mission.trainingDirective.sessionRole} volume to build consistency.`;
      athleteMonologue = `Just another day at the office. Grinding through the plan.`;
    }

    if (isCheatDay) {
      coachingInsight += ` | Note: Large caloric surplus detected today. Engine will monitor weight trend for metabolic correction.`;
      athleteMonologue += ` | Had a bit of a binge today. Feeling guilty but the food was worth it.`;
    }

    // --- STEP 5: Log the Day ---
    dailyLogs.push({
      date: dateStr,
      engineState: {
        date: dateStr,
        engineVersion: 'sim-v3',
        objectiveContext: macrocycleContext,
        acwr: mockACWR,
        readinessState,
        readinessProfile,
        constraintSet,
        cutProtocol: cutProtocol as any,
        nutritionTargets: mission.fuelDirective as any,
        hydration: mission.hydrationDirective as any,
        scheduledActivities: scheduledActivities as any,
        weeklyPlanEntries: todaysPlanEntries as any,
        primaryScheduledActivity: scheduledActivities[0] ?? null,
        primaryPlanEntry: primaryPlanEntry as any,
        primaryEnginePlanEntry: primaryEnginePlanEntry as any,
        workoutPrescription: mission.trainingDirective.prescription ?? null,
        mission,
        campRisk: null,
        medStatus: null,
      },
      stateBefore,
      stateAfter: JSON.parse(JSON.stringify(simState)),
      personaAction: {
        readinessLogged,
        sleepLogged,
        didWarmup: trainingComplied && (random() < 0.8),
        sessionsCompleted: [
          ...(completedSession ? [completedSession] : []),
          ...(todayBoxing && todayBoxing.intensity > 0 ? [{
            type: todayBoxing.type,
            sessionName: todayBoxing.name,
            prescribedRpe: todayBoxing.intensity,
            actualRpe: todayBoxing.intensity, // Assume boxing compliance for now
            prescribedDuration: todayBoxing.duration,
            actualDuration: todayBoxing.duration
          }] : [])
        ],
        nutritionAdherence: persona.nutritionCompliance,
        isCheatDay,
        actualCalories: Math.round(actualCalories),
        actualProtein: Math.round(actualProtein),
        actualCarbs: Math.round(actualCarbs),
        actualFat: Math.round(actualFat),
        cutPhase: cutProtocol?.cutPhase || 'none',
        waterTargetOz: cutProtocol?.waterTargetOz || 0,
        sodiumTargetMg: cutProtocol?.sodiumTargetMg || null,
        fiberState: cutProtocol?.fiberInstruction || 'Normal',
        interventionState: mission.trainingDirective.interventionState,
        isMandatoryRecovery: mission.trainingDirective.isMandatoryRecovery,
        weightDriftLbs: cutProtocol?.weightDriftLbs ?? null,
        cutInterventionReason: cutProtocol?.interventionReason ?? null,
        workoutBlueprint,
        coachingInsight,
        athleteMonologue,
        conditioningPrescription: fallbackConditioningPrescription,
        conditioningLog,
        exerciseLogs,
      } as any
    });

    if (completedSession) {
      sessionHistory.push(completedSession);
      
      // Update Rolling History
      if (hasStructuredPrescription) {
        const newlyDoneIds = mission.trainingDirective.prescription.exercises.map((e: any) => e.exercise.id);
        recentExerciseIds = [...newlyDoneIds, ...recentExerciseIds].slice(0, 20); // Keep last 20 IDs (~3 sessions)
        
        // Update Muscle Volume (approximate sets)
        mission.trainingDirective.prescription.exercises.forEach((e: any) => {
          const mg = e.exercise.muscle_group;
          recentMuscleVolume[mg] = (recentMuscleVolume[mg] || 0) + e.targetSets;
        });
      }
    }

    // Decay Muscle Volume slightly each day to simulate recovery
    Object.keys(recentMuscleVolume).forEach(mg => {
      recentMuscleVolume[mg] = Math.max(0, recentMuscleVolume[mg] * 0.8);
    });
  }

  return {
    config,
    dailyLogs
  };
}
