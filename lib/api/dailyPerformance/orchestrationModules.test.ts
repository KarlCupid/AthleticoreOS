import type {
  ACWRResult,
  DailyAthleteSummary,
  FitnessLevel,
  HydrationResult,
  MacrocycleContext,
  MEDStatus,
  NutritionFuelingTarget,
  ReadinessProfile,
  ScheduledActivityRow,
  StimulusConstraintSet,
  WeeklyPlanEntryRow,
} from '../../engine/index.ts';
import type { WorkoutPrescriptionV2 } from '../../engine/types';
import type { UnifiedPerformanceEngineResult } from '../../performance-engine/index.ts';
import type { AthleteProfileRow } from '../athleteContextService';
import { getOrComputeCachedValue } from './cacheOrchestration';
import { resolveHydrationAndRisk } from './hydrationRisk';
import { deriveMEDStatus } from './medStatus';
import {
  pickPrimaryScheduledActivity,
  resolveDailyPlanSelection,
  type PlanSelectionDependencies,
} from './planSelection';
import {
  resolveObjectiveContextWithDependencies,
  type AthleteContextSnapshot,
  type ObjectiveContextDependencies,
} from './objectiveContext';
import {
  resolveACWRWithDependencies,
  resolveReadinessProfileWithDependencies,
  type DailyPerformanceCheckColumnState,
  type ReadinessResolutionDependencies,
} from './readinessResolution';
import {
  resolveWorkoutPrescriptionWithDependencies,
  type PrescriptionResolutionDependencies,
} from './prescriptionResolution';
import {
  resolveUpeHandoff,
  type UpeHandoffDependencies,
} from './upeHandoff';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

async function assertRejects(label: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
    assert(label, false);
  } catch {
    assert(label, true);
  }
}

function makeProfile(overrides: Partial<AthleteProfileRow> = {}): AthleteProfileRow {
  return {
    user_id: 'user-1',
    phase: 'off-season',
    fitness_level: 'intermediate',
    active_weight_class_plan_id: null,
    base_weight: 160,
    target_weight: 154,
    fight_date: null,
    height_inches: 70,
    age: 28,
    biological_sex: 'male',
    activity_level: 'moderate',
    nutrition_goal: 'maintain',
    cycle_day: null,
    cycle_tracking: false,
    fight_status: 'amateur',
    coach_protein_override: null,
    coach_carbs_override: null,
    coach_fat_override: null,
    coach_calories_override: null,
    athlete_goal_mode: 'build_phase',
    performance_goal_type: 'conditioning',
    planning_setup_version: 1,
    first_run_guidance_status: 'completed',
    first_run_guidance_intro_seen_at: null,
    training_age: 'intermediate',
    ...overrides,
  };
}

function makeAthleteContext(overrides: Partial<AthleteContextSnapshot> = {}): AthleteContextSnapshot {
  const fitnessLevel = overrides.fitnessLevel ?? 'intermediate';
  return {
    profile: makeProfile({ fitness_level: fitnessLevel }),
    phase: 'off-season',
    fitnessLevel,
    trainingAge: 'intermediate',
    hasActiveWeightClassPlan: false,
    goalMode: 'build_phase',
    performanceGoalType: 'conditioning',
    planningSetupVersion: 1,
    ...overrides,
  };
}

function makeMacrocycleContext(overrides: Partial<MacrocycleContext> = {}): MacrocycleContext {
  return {
    date: '2026-04-20',
    phase: 'off-season',
    goalMode: 'build_phase',
    performanceGoalType: 'conditioning',
    performanceObjective: {
      mode: 'build_phase',
      goalType: 'conditioning',
      primaryOutcome: 'Build off season capacity',
      secondaryConstraint: 'protect_recovery',
      goalLabel: null,
      targetMetric: 'training_consistency',
      targetValue: null,
      targetUnit: null,
      deadline: null,
      horizonWeeks: null,
      successWindow: null,
    },
    buildGoal: null,
    camp: null,
    campPhase: null,
    weightClassState: 'none',
    hasActiveWeightClassPlan: false,
    weighInTiming: null,
    daysOut: null,
    isTravelWindow: false,
    currentWeightLbs: 160,
    targetWeightLbs: 154,
    remainingWeightLbs: 6,
    weightTrend: null,
    ...overrides,
  };
}

function makeLoadMetrics(): ACWRResult['loadMetrics'] {
  return {
    weeklyLoad: 420,
    monotony: 1.1,
    strain: 462,
    acuteEWMA: 210,
    chronicEWMA: 190,
    rollingFatigueRatio: 1.1,
    rollingFatigueScore: 55,
    fatigueBand: 'moderate',
    safetyThreshold: 1.4,
    thresholdSource: 'standard_chronic',
    dailyLoads: [50, 60],
  };
}

function makeAcwr(ratio = 1.05): ACWRResult {
  return {
    ratio,
    acute: 210,
    chronic: 200,
    acuteEWMA: 210,
    chronicEWMA: 200,
    status: 'safe',
    message: 'Load is stable.',
    daysOfData: 14,
    thresholds: {
      caution: 1.3,
      redline: 1.5,
      detrained: 0.7,
      confidence: 'medium',
      personalizationFactors: [],
      source: 'ewma_personalized',
    },
    loadMetrics: makeLoadMetrics(),
  };
}

function makeReadinessProfile(overrides: Partial<ReadinessProfile> = {}): ReadinessProfile {
  return {
    neuralReadiness: 82,
    structuralReadiness: 80,
    metabolicReadiness: 84,
    overallReadiness: 82,
    trend: 'stable',
    dataConfidence: 'medium',
    dataSufficiency: 'established',
    cardioModifier: 1,
    proteinModifier: 1,
    flags: [],
    performanceAnchors: [],
    readinessState: 'Prime',
    ...overrides,
  };
}

function makeConstraintSet(overrides: Partial<StimulusConstraintSet> = {}): StimulusConstraintSet {
  return {
    explosiveBudget: 1,
    impactBudget: 1,
    strengthBudget: 1,
    aerobicBudget: 1,
    volumeMultiplier: 1,
    hardCaps: {
      intensityCap: null,
      allowImpact: true,
      allowHardSparring: true,
      maxConditioningRounds: null,
    },
    allowedStimuli: ['technical_skill'],
    blockedStimuli: [],
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WeeklyPlanEntryRow> = {}): WeeklyPlanEntryRow {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    week_start_date: '2026-04-20',
    day_of_week: 1,
    date: '2026-04-20',
    slot: 'am',
    session_type: 'sc',
    focus: 'full_body',
    estimated_duration_min: 45,
    target_intensity: 7,
    status: 'planned',
    rescheduled_to: null,
    workout_log_id: null,
    prescription_snapshot: null,
    engine_notes: null,
    is_deload: false,
    created_at: '2026-04-20T00:00:00.000Z',
    ...overrides,
  };
}

function makeActivity(overrides: Partial<ScheduledActivityRow> = {}): ScheduledActivityRow {
  return {
    id: 'activity-1',
    recurring_activity_id: null,
    user_id: 'user-1',
    date: '2026-04-20',
    activity_type: 'sc',
    custom_label: null,
    start_time: null,
    estimated_duration_min: 45,
    expected_intensity: 6,
    session_components: [],
    source: 'manual',
    status: 'scheduled',
    actual_duration_min: null,
    actual_rpe: null,
    notes: null,
    engine_recommendation: null,
    ...overrides,
  };
}

function makeHydration(): HydrationResult {
  return {
    dailyWaterOz: 96,
    waterLoadOz: null,
    shedCapPercent: 2,
    shedCapLbs: 3,
    message: 'Hydrate steadily.',
  };
}

function makeNutritionTarget(safetyEvents: NutritionFuelingTarget['safetyEvents'] = []): NutritionFuelingTarget {
  return {
    engineVersion: 'nutrition_fueling_engine_v1',
    canonicalPhase: 'build',
    tdee: 2600,
    adjustedCalories: 2600,
    protein: 180,
    carbs: 300,
    fat: 75,
    proteinModifier: 1,
    phaseMultiplier: 0,
    weightCorrectionDeficit: 0,
    message: 'Fuel the session.',
    source: 'daily_activity_adjusted',
    fuelState: 'strength_power',
    prioritySession: 'heavy_sc',
    deficitClass: 'steady_maintain',
    recoveryNutritionFocus: 'none',
    sessionDemandScore: 60,
    hydrationBoostOz: 8,
    hydrationPlan: {
      dailyTargetOz: 96,
      sodiumTargetMg: null,
      emphasis: 'performance',
      notes: ['Hydrate steadily.'],
    },
    sessionFuelingPlan: {
      priority: 'heavy_sc',
      priorityLabel: 'heavy sc',
      sessionLabel: 'Strength',
      preSession: { label: 'Before', timing: 'Before session', carbsG: 30, proteinG: 20, notes: [] },
      intraSession: { fluidsOz: 12, electrolytesMg: null, carbsG: 0, notes: [] },
      betweenSessions: null,
      postSession: { label: 'After', timing: 'After session', carbsG: 40, proteinG: 30, notes: [] },
      hydrationNotes: [],
      coachingNotes: [],
    },
    reasonLines: ['UPE target'],
    energyAvailability: null,
    fuelingFloorTriggered: false,
    deficitBankDelta: 0,
    safetyWarning: 'none',
    safetyEvents,
    traceLines: ['UPE target'],
  };
}

function makeMission(date = '2026-04-20'): DailyAthleteSummary {
  return {
    date,
    engineVersion: 'unified-performance-engine-v1',
  } as unknown as DailyAthleteSummary;
}

function makePrescription(id: string): WorkoutPrescriptionV2 {
  return {
    focus: 'full_body',
    workoutType: 'strength',
    exercises: [],
    totalCNSBudget: 10,
    usedCNS: 3,
    message: id,
    estimatedDurationMin: 45,
    isDeloadWorkout: false,
    equipmentProfile: null,
    campPhaseContext: null,
    weeklyPlanDay: null,
    sparringDayGuidance: null,
    sessionIntent: null,
    primaryAdaptation: 'strength',
    performanceRisk: null,
    blockContext: null,
    decisionTrace: [],
  };
}

async function testObjectiveContext(): Promise<void> {
  const camp = {
    id: 'camp-1',
    user_id: 'user-1',
    fightDate: '2026-05-18',
    campStartDate: '2026-04-06',
    totalWeeks: 6,
    hasConcurrentWeightClassPlan: true,
    basePhaseDates: { start: '2026-04-06', end: '2026-04-19' },
    buildPhaseDates: { start: '2026-04-20', end: '2026-05-03' },
    peakPhaseDates: { start: '2026-05-04', end: '2026-05-10' },
    taperPhaseDates: { start: '2026-05-11', end: '2026-05-18' },
    status: 'active',
    weighInTiming: 'same_day',
    targetWeight: 154,
    travelStartDate: '2026-05-15',
    travelEndDate: '2026-05-18',
    weightClassState: 'driving',
  } satisfies NonNullable<MacrocycleContext['camp']>;
  const dependencies: ObjectiveContextDependencies = {
    getAthleteContext: async () => makeAthleteContext({
      profile: makeProfile({ athlete_goal_mode: 'fight_camp', fight_date: '2026-05-18' }),
      goalMode: 'fight_camp',
      hasActiveWeightClassPlan: true,
    }),
    getActiveBuildPhaseGoal: async () => null,
    getActiveFightCamp: async () => camp,
    getEffectiveWeight: async () => 160,
    getWeightHistory: async () => [{ date: '2026-04-20', weight: 160 }],
  };

  const result = await resolveObjectiveContextWithDependencies('user-1', '2026-04-20', dependencies);
  assert('objective context resolves fight camp phase and objective', result.phase === 'camp-build' && result.performanceObjective.mode === 'fight_camp');
  assert('objective context keeps body-mass context explicit', result.currentWeightLbs === 160 && result.targetWeightLbs === 154);

  await assertRejects('objective context propagates dependency failure', () =>
    resolveObjectiveContextWithDependencies('user-1', '2026-04-20', {
      ...dependencies,
      getAthleteContext: async () => {
        throw new Error('profile unavailable');
      },
    }));
}

async function testPlanSelection(): Promise<void> {
  const engineEntry = makeEntry({ id: 'engine', target_intensity: 5, estimated_duration_min: 30 });
  const heavyEntry = makeEntry({ id: 'heavy', target_intensity: 8, estimated_duration_min: 30, slot: 'pm' });
  const dependencies: PlanSelectionDependencies = {
    loadPlanEntriesForDate: async () => [engineEntry, heavyEntry],
    loadPlanEntriesForRange: async () => [engineEntry, heavyEntry],
    isActiveGuidedEnginePlanEntry: (entry) => entry.id === 'engine',
  };

  const result = await resolveDailyPlanSelection({
    userId: 'user-1',
    date: '2026-04-20',
    weekStart: '2026-04-20',
    weekEnd: '2026-04-26',
  }, dependencies);
  assert('plan selection picks highest-priority daily entry', result.primaryPlanEntry?.id === 'heavy');
  assert('plan selection keeps guided engine entry separate', result.primaryEnginePlanEntry?.id === 'engine');

  const scheduled = pickPrimaryScheduledActivity([
    makeActivity({ id: 'skipped', activity_type: 'sparring', status: 'skipped', expected_intensity: 10 }),
    makeActivity({ id: 'boxing', activity_type: 'boxing_practice', expected_intensity: 5 }),
    makeActivity({ id: 'conditioning', activity_type: 'conditioning', expected_intensity: 9 }),
  ]);
  assert('plan selection ignores skipped anchors when picking scheduled activity', scheduled?.id === 'boxing');

  await assertRejects('plan selection propagates plan load failure', () =>
    resolveDailyPlanSelection({
      userId: 'user-1',
      date: '2026-04-20',
      weekStart: '2026-04-20',
      weekEnd: '2026-04-26',
    }, {
      ...dependencies,
      loadPlanEntriesForRange: async () => {
        throw new Error('range unavailable');
      },
    }));
}

async function testReadinessResolution(): Promise<void> {
  const columnState: DailyPerformanceCheckColumnState = { hasDailyPerformanceCheckColumns: null };
  let requestedSelect = '';
  let capturedReadinessHistory = 0;
  const dependencies: ReadinessResolutionDependencies = {
    calculateACWR: async () => makeAcwr(1.12),
    loadDailyCheckins: async (input) => {
      requestedSelect = input.select;
      return {
        data: [
          { date: '2026-04-19', readiness: 3, sleep_quality: 3 },
          { date: '2026-04-20', readiness: 5, sleep_quality: 4, energy_level: 5, pain_level: 1 },
        ],
        error: null,
      };
    },
    loadRecentActivities: async () => [
      makeActivity({ activity_type: 'sparring', expected_intensity: 8 }),
      makeActivity({ activity_type: 'boxing_practice', expected_intensity: 7 }),
    ],
    loadLatestActivationRpe: async () => ({ data: [{ date: '2026-04-20', activation_rpe: 4 }], error: null }),
    deriveReadinessProfile: (input) => {
      capturedReadinessHistory = input.readinessHistory?.length ?? 0;
      return makeReadinessProfile({ readinessState: input.painLevel === 1 ? 'Prime' : 'Caution' });
    },
    deriveStimulusConstraintSet: () => makeConstraintSet(),
    logError: () => undefined,
    columnState,
  };

  const acwr = await resolveACWRWithDependencies({
    userId: 'user-1',
    date: '2026-04-20',
    phase: 'off-season',
    fitnessLevel: 'intermediate',
    hasActiveWeightClassPlan: false,
    cycleDay: null,
    supabaseClient: {} as never,
  }, dependencies);
  assert('readiness ACWR resolution delegates typed fitness level', acwr.ratio === 1.12);

  const result = await resolveReadinessProfileWithDependencies({
    userId: 'user-1',
    date: '2026-04-20',
    acwr,
    objectiveContext: makeMacrocycleContext(),
  }, dependencies);
  assert('readiness resolution uses performance check-in columns when available', requestedSelect.includes('energy_level') && columnState.hasDailyPerformanceCheckColumns === true);
  assert('readiness resolution returns today check-in and derived state', result.todayCheckin?.date === '2026-04-20' && result.readinessState === 'Prime');
  assert('readiness resolution preserves readiness history', capturedReadinessHistory === 2);

  const fallbackState: DailyPerformanceCheckColumnState = { hasDailyPerformanceCheckColumns: null };
  let fallbackSelect = '';
  const fallbackResult = await resolveReadinessProfileWithDependencies({
    userId: 'user-1',
    date: '2026-04-20',
    acwr,
    objectiveContext: makeMacrocycleContext(),
  }, {
    ...dependencies,
    columnState: fallbackState,
    loadDailyCheckins: async (input) => {
      fallbackSelect = input.select;
      if (input.select.includes('energy_level')) {
        return { data: null, error: { code: 'PGRST204', message: 'energy_level missing' } };
      }
      return { data: [{ date: '2026-04-20', readiness: 4, sleep_quality: 4 }], error: null };
    },
  });
  assert('readiness resolution falls back to legacy check-in columns on schema mismatch', fallbackState.hasDailyPerformanceCheckColumns === false && !fallbackSelect.includes('energy_level'));
  assert('readiness resolution still returns a profile after fallback', fallbackResult.todayCheckin?.readiness === 4);
}

function testMedStatus(): void {
  const onTrack = deriveMEDStatus([
    makeEntry({ id: 'power', focus: 'sport_specific' }),
    makeEntry({ id: 'strength-1', session_type: 'sc', focus: 'lower' }),
    makeEntry({ id: 'strength-2', session_type: 'sc', focus: 'upper_push' }),
    makeEntry({ id: 'conditioning-1', session_type: 'conditioning', focus: 'conditioning' }),
    makeEntry({ id: 'conditioning-2', session_type: 'road_work', focus: 'conditioning' }),
  ], '2026-04-20');
  assert('MED status reports on track when weekly touches are present', onTrack.overall === 'on_track');

  const missed = deriveMEDStatus([], '2026-04-25');
  assert('MED status reports missed late-week exposure failures', missed.overall === 'missed');
}

async function testPrescriptionResolution(): Promise<void> {
  const stored = makePrescription('stored');
  let generated = false;
  const dependencies: PrescriptionResolutionDependencies = {
    adaptPrescriptionToDailyReadiness: ({ prescription }) => prescription
      ? ({ ...prescription, message: `${prescription.message}:adapted` })
      : null,
    generateWorkoutV2: () => {
      generated = true;
      return makePrescription('generated');
    },
    getDefaultGymProfile: async () => ({ equipment: ['barbell'] } as Awaited<ReturnType<PrescriptionResolutionDependencies['getDefaultGymProfile']>>),
    getExerciseLibrary: async () => [],
    getRecentExerciseIds: async () => [],
    getRecentMuscleVolume: async () => ({
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
    }),
    getExerciseHistoryBatch: async () => new Map(),
  };

  const result = await resolveWorkoutPrescriptionWithDependencies({
    userId: 'user-1',
    date: '2026-04-20',
    phase: 'off-season',
    readinessState: 'Prime',
    readinessProfile: makeReadinessProfile(),
    constraintSet: makeConstraintSet(),
    acwr: makeAcwr(),
    fitnessLevel: 'intermediate',
    trainingAge: 'intermediate',
    performanceGoalType: 'conditioning',
    weeklyPlanEntry: makeEntry({ prescription_snapshot: stored }),
    objectiveContext: makeMacrocycleContext(),
    medStatus: null,
  }, dependencies);
  assert('prescription resolution adapts stored weekly snapshot without generating', result?.message === 'stored:adapted' && generated === false);

  const absent = await resolveWorkoutPrescriptionWithDependencies({
    userId: 'user-1',
    date: '2026-04-20',
    phase: 'off-season',
    readinessState: 'Prime',
    readinessProfile: makeReadinessProfile(),
    constraintSet: makeConstraintSet(),
    acwr: makeAcwr(),
    fitnessLevel: 'intermediate',
    trainingAge: 'intermediate',
    performanceGoalType: 'conditioning',
    weeklyPlanEntry: null,
    objectiveContext: makeMacrocycleContext(),
    medStatus: null,
  }, dependencies);
  assert('prescription resolution returns null without a plan entry', absent === null);

  await assertRejects('prescription resolution propagates generation failures', () =>
    resolveWorkoutPrescriptionWithDependencies({
      userId: 'user-1',
      date: '2026-04-20',
      phase: 'off-season',
      readinessState: 'Prime',
      readinessProfile: makeReadinessProfile(),
      constraintSet: makeConstraintSet(),
      acwr: makeAcwr(),
      fitnessLevel: 'intermediate',
      trainingAge: 'intermediate',
      performanceGoalType: 'conditioning',
      weeklyPlanEntry: makeEntry(),
      objectiveContext: makeMacrocycleContext(),
      medStatus: null,
    }, {
      ...dependencies,
      generateWorkoutV2: () => {
        throw new Error('generation failed');
      },
    }));
}

async function testHydrationRisk(): Promise<void> {
  const result = resolveHydrationAndRisk({
    objectiveContext: makeMacrocycleContext({ goalMode: 'fight_camp', weightClassState: 'driving', daysOut: 10 }),
    fightStatus: 'amateur',
    currentWeightLbs: 160,
    targetWeightLbs: 154,
    acwrRatio: 1.1,
  }, {
    getHydrationProtocol: () => makeHydration(),
    calculateCampRisk: () => ({
      level: 'moderate',
      score: 42,
      projectedMakeWeightStatus: 'Monitor closely',
      drivers: ['weight trajectory'],
    }),
  });
  assert('hydration/risk resolves both hydration and camp risk', result.hydration.dailyWaterOz === 96 && result.riskAssessment?.score === 42);

  await assertRejects('hydration/risk propagates hydration failures', async () => {
    resolveHydrationAndRisk({
      objectiveContext: makeMacrocycleContext(),
      fightStatus: 'amateur',
      currentWeightLbs: 160,
      targetWeightLbs: 154,
      acwrRatio: 1,
    }, {
      getHydrationProtocol: () => {
        throw new Error('hydration unavailable');
      },
      calculateCampRisk: () => null,
    });
  });
}

async function testUpeHandoff(): Promise<void> {
  const breadcrumbs: Array<{ category: string; message: string }> = [];
  const safetyEvents: NonNullable<NutritionFuelingTarget['safetyEvents']> = [{
    code: 'fueling_floor_applied',
    source: 'fueling_floor',
    priorValue: 1800,
    adjustedValue: 2200,
    reason: 'Protect fueling floor.',
  }];
  const dependencies: UpeHandoffDependencies = {
    resolveUnifiedDailyPerformance: () => ({ engineVersion: 'unified-performance-engine-v1' } as unknown as UnifiedPerformanceEngineResult),
    buildDailyAthleteSummaryFromUnified: ({ unifiedPerformance }) => ({
      summary: makeMission(unifiedPerformance ? '2026-04-20' : 'missing'),
      nutritionTarget: makeNutritionTarget(safetyEvents),
    }),
    addMonitoringBreadcrumb: (category, message) => {
      breadcrumbs.push({ category, message });
    },
  };

  const result = resolveUpeHandoff({
    userId: 'user-1',
    date: '2026-04-20',
    athleteContext: makeAthleteContext(),
    objectiveContext: makeMacrocycleContext(),
    readinessProfile: makeReadinessProfile(),
    constraintSet: makeConstraintSet(),
    medStatus: { overall: 'on_track' } as MEDStatus,
    hydration: makeHydration(),
    workoutPrescription: makePrescription('stored'),
    acwr: makeAcwr(),
    todayCheckin: { date: '2026-04-20', readiness: 5 },
    scheduledActivities: [makeActivity()],
    currentWeight: 160,
    targetWeight: 154,
    weekStart: '2026-04-20',
  }, dependencies);
  assert('UPE handoff returns summary and canonical nutrition target', result.mission.date === '2026-04-20' && result.nutritionTargets.adjustedCalories === 2600);
  assert('UPE handoff records nutrition safety breadcrumbs', breadcrumbs.some((item) => item.category === 'daily_engine' && item.message === 'nutrition_safety_event'));

  await assertRejects('UPE handoff propagates summary mapping failures', async () => {
    resolveUpeHandoff({
      userId: 'user-1',
      date: '2026-04-20',
      athleteContext: makeAthleteContext(),
      objectiveContext: makeMacrocycleContext(),
      readinessProfile: makeReadinessProfile(),
      constraintSet: makeConstraintSet(),
      medStatus: null,
      hydration: makeHydration(),
      workoutPrescription: null,
      acwr: makeAcwr(),
      todayCheckin: null,
      scheduledActivities: [],
      currentWeight: null,
      targetWeight: null,
      weekStart: '2026-04-20',
    }, {
      ...dependencies,
      buildDailyAthleteSummaryFromUnified: () => {
        throw new Error('summary unavailable');
      },
    });
  });
}

async function testCacheOrchestration(): Promise<void> {
  const cache = new Map<string, string>();
  const inFlight = new Map<string, Promise<string>>();
  let calls = 0;
  const first = await getOrComputeCachedValue({
    cacheKey: 'user-1::2026-04-20',
    cache,
    inFlight,
    compute: async () => {
      calls++;
      return 'computed';
    },
  });
  const second = await getOrComputeCachedValue({
    cacheKey: 'user-1::2026-04-20',
    cache,
    inFlight,
    compute: async () => {
      calls++;
      return 'again';
    },
  });
  assert('cache orchestration stores and reuses computed values', first === 'computed' && second === 'computed' && calls === 1);

  const failingCache = new Map<string, string>();
  const failingInFlight = new Map<string, Promise<string>>();
  await assertRejects('cache orchestration propagates compute failures', () =>
    getOrComputeCachedValue({
      cacheKey: 'user-1::2026-04-21',
      cache: failingCache,
      inFlight: failingInFlight,
      compute: async () => {
        throw new Error('compute failed');
      },
    }));
  assert('cache orchestration clears failed in-flight requests', failingInFlight.size === 0 && failingCache.size === 0);
}

async function run(): Promise<void> {
  console.log('\n-- daily performance orchestration modules --');
  await testObjectiveContext();
  await testPlanSelection();
  await testReadinessResolution();
  testMedStatus();
  await testPrescriptionResolution();
  await testHydrationRisk();
  await testUpeHandoff();
  await testCacheOrchestration();
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
