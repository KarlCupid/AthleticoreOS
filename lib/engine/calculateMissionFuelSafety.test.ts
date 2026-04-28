import { buildDailyMission } from './calculateMission.ts';
import { deriveReadinessProfile, deriveStimulusConstraintSet } from './readiness/profile.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function makeInput() {
  const readinessProfile = deriveReadinessProfile({
    sleepQuality: 4,
    subjectiveReadiness: 4,
    confidenceLevel: 4,
    stressLevel: 2,
    sorenessLevel: 2,
    acwrRatio: 1.05,
    readinessHistory: [4, 4, 4],
  });
  const constraintSet = deriveStimulusConstraintSet(readinessProfile, {
    phase: 'fight-camp',
    goalMode: 'fight_camp',
    daysOut: 7,
  });

  return {
    date: '2026-03-10',
    macrocycleContext: {
      date: '2026-03-10',
      phase: 'fight-camp',
      goalMode: 'fight_camp',
      performanceGoalType: 'fight_camp',
      performanceObjective: {
        mode: 'fight_camp',
        goalType: 'fight_camp',
        primaryOutcome: 'Arrive sharp',
        secondaryConstraint: 'weight_trajectory',
        goalLabel: 'Fight camp',
        targetMetric: 'body_weight_lbs',
        targetValue: 170,
        targetUnit: 'lbs',
        deadline: '2026-03-17',
        horizonWeeks: null,
        successWindow: '2026-03-17',
      },
      buildGoal: null,
      camp: null,
      campPhase: 'peak',
      weightCutState: 'driving',
      weighInTiming: 'next_day',
      daysOut: 7,
      isTravelWindow: false,
      isOnActiveCut: true,
      currentWeightLbs: 174,
      targetWeightLbs: 170,
      remainingWeightLbs: 4,
      weightTrend: null,
    },
    readinessState: 'Prime',
    readinessProfile,
    constraintSet,
    acwr: {
      ratio: 1.05,
      acute: 900,
      chronic: 750,
      status: 'safe',
      message: 'Load is in range.',
      daysOfData: 28,
      thresholds: {
        caution: 1.3,
        redline: 1.5,
        confidence: 'high',
        personalizationFactors: [],
      },
      loadMetrics: {
        acuteLoad: 900,
        chronicLoad: 750,
        acuteToChronicRatio: 1.05,
        strain: 0,
        monotony: 0,
      },
    },
    nutritionTargets: {
      tdee: 2600,
      adjustedCalories: 1900,
      protein: 175,
      carbs: 205,
      fat: 42,
      proteinModifier: 1,
      phaseMultiplier: 0,
      weightCorrectionDeficit: 0,
      message: 'Weight cut protocol, safety-adjusted.',
      source: 'weight_cut_protocol_safety_adjusted',
      fuelState: 'cut_protect',
      prioritySession: 'cut_protect',
      deficitClass: 'steady_cut',
      recoveryNutritionFocus: 'hydration_restore',
      sessionDemandScore: 55,
      hydrationBoostOz: 20,
      hydrationPlan: {
        dailyTargetOz: 140,
        sodiumTargetMg: 600,
        emphasis: 'cut',
        notes: [],
      },
      sessionFuelingPlan: {
        priority: 'cut_protect',
        priorityLabel: 'Cut-protect session',
        sessionLabel: 'Allowed training window',
        preSession: { label: 'Before training', timing: '60-90 min', carbsG: 35, proteinG: 20, notes: [] },
        intraSession: { fluidsOz: 16, electrolytesMg: 400, carbsG: 0, notes: [] },
        betweenSessions: null,
        postSession: { label: 'After training', timing: 'Within 60 min', carbsG: 30, proteinG: 35, notes: [] },
        hydrationNotes: [],
        coachingNotes: [],
      },
      reasonLines: ['Active weight-class context is safety-adjusted by the normal day engine.'],
      energyAvailability: 25,
      fuelingFloorTriggered: true,
      deficitBankDelta: 450,
      safetyWarning: 'fueling_floor_applied',
      safetyEvents: [],
      traceLines: ['Fueling floor activated.'],
    },
    hydration: {
      dailyWaterOz: 120,
      waterLoadOz: null,
      shedCapPercent: 2,
      shedCapLbs: 3,
      message: 'Hydration normal.',
    },
    scheduledActivities: [
      {
        date: '2026-03-10',
        activity_type: 'sc',
        estimated_duration_min: 45,
        expected_intensity: 5,
        status: 'planned',
      },
    ],
    cutProtocol: {
      cut_phase: 'fight_week_cut',
      training_intensity_cap: 4,
      prescribed_calories: 1450,
      prescribed_protein: 190,
      prescribed_carbs: 80,
      prescribed_fat: 41,
      water_target_oz: 140,
      sodium_target_mg: 600,
    },
    workoutPrescription: null,
    weeklyPlanEntry: null,
    medStatus: null,
    riskScore: 8,
    riskDrivers: [],
  } as any;
}

console.log('\n-- calculateMission fuel safety --');

(() => {
  const mission = buildDailyMission(makeInput());

  assert('Cut mission uses safety-adjusted calories, not raw cut protocol', mission.fuelDirective.calories === 1900);
  assert('Cut mission uses safety-adjusted macros, not raw cut protocol', mission.fuelDirective.carbs === 205);
  assert('Cut mission keeps weight-cut source after safety adjustment', mission.fuelDirective.source === 'weight_cut_protocol');
  assert('Cut mission carries fueling floor warning', mission.fuelDirective.safetyWarning === 'fueling_floor_applied');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
