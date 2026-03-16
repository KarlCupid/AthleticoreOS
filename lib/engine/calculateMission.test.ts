import { buildDailyMission } from '.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (error: any) {
    failed++;
    console.error(`  FAIL ${name}: ${error.message}`);
  }
}

function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) throw new Error(`${value} !== ${expected}`);
    },
    toContain: (expected: string) => {
      if (typeof value !== 'string' || !value.includes(expected)) {
        throw new Error(`"${String(value)}" does not contain "${expected}"`);
      }
    },
  };
}

function makeInput(overrides: Record<string, any> = {}) {
  return {
    date: '2026-03-10',
    macrocycleContext: {
      date: '2026-03-10',
      phase: 'fight-camp',
      goalMode: 'fight_camp',
      performanceGoalType: 'fight_camp',
      performanceObjective: {
        goalType: 'fight_camp',
        primaryOutcome: 'Arrive sharp',
      },
      buildGoal: null,
      camp: null,
      campPhase: 'peak',
      weightCutState: 'driving',
      weighInTiming: 'am',
      daysOut: 4,
      isDeloadWeek: false,
      isTravelWindow: false,
      isOnActiveCut: true,
      currentWeightLbs: 174,
      targetWeightLbs: 170,
      remainingWeightLbs: 4,
      weightTrend: null,
    },
    readinessState: 'Caution',
    acwr: {
      ratio: 1.2,
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
        acuteToChronicRatio: 1.2,
        strain: 0,
        monotony: 0,
      },
    },
    nutritionTargets: {
      tdee: 2600,
      adjustedCalories: 2200,
      protein: 180,
      carbs: 200,
      fat: 70,
      proteinModifier: 1,
      phaseMultiplier: 0,
      weightCorrectionDeficit: 0,
      message: 'Base targets active.',
      source: 'base',
      fuelState: 'strength_power',
      sessionDemandScore: 5,
      hydrationBoostOz: 16,
      reasonLines: ['Base targets active.'],
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
        estimated_duration_min: 60,
        expected_intensity: 7,
        status: 'planned',
      },
    ],
    cutProtocol: {
      cut_phase: 'fight_week_cut',
      training_intensity_cap: 4,
      sodium_target_mg: 400,
      sodium_instruction: 'Minimal sodium. Water dump starts now.',
      water_target_oz: 96,
      fiber_instruction: 'Low residue',
      weight_drift_lbs: null,
      intervention_reason: null,
    },
    workoutPrescription: null,
    weeklyPlanEntry: null,
    riskScore: 50,
    riskDrivers: [],
    ...overrides,
  } as any;
}

console.log('\n-- calculateMission --');

test('Critical risk forces mandatory recovery and cap 2', () => {
  const mission = buildDailyMission(makeInput({
    acwr: {
      ratio: 1.95,
      acute: 1950,
      chronic: 1000,
      status: 'redline',
      message: 'Redline load.',
      daysOfData: 28,
      thresholds: {
        caution: 1.3,
        redline: 1.5,
        confidence: 'high',
        personalizationFactors: [],
      },
      loadMetrics: {
        acuteLoad: 1950,
        chronicLoad: 1000,
        acuteToChronicRatio: 1.95,
        strain: 0,
        monotony: 0,
      },
    },
    readinessState: 'Depleted',
    riskScore: 60,
  }));

  expect(mission.trainingDirective.interventionState).toBe('hard');
  expect(mission.trainingDirective.sessionRole).toBe('recover');
  expect(mission.trainingDirective.intensityCap).toBe(2);
  expect(mission.trainingDirective.isMandatoryRecovery).toBe(true);
});

test('High risk applies soft cap 4 without mandatory recovery', () => {
  const mission = buildDailyMission(makeInput({
    acwr: {
      ratio: 1.55,
      acute: 1550,
      chronic: 1000,
      status: 'caution',
      message: 'Caution load.',
      daysOfData: 28,
      thresholds: {
        caution: 1.3,
        redline: 1.5,
        confidence: 'high',
        personalizationFactors: [],
      },
      loadMetrics: {
        acuteLoad: 1550,
        chronicLoad: 1000,
        acuteToChronicRatio: 1.55,
        strain: 0,
        monotony: 0,
      },
    },
    readinessState: 'Prime',
    riskScore: 45,
  }));

  expect(mission.trainingDirective.interventionState).toBe('soft');
  expect(mission.trainingDirective.intensityCap).toBe(4);
  expect(mission.trainingDirective.isMandatoryRecovery).toBe(false);
});

test('Decision trace includes ACWR and sodium human interpretations', () => {
  const mission = buildDailyMission(makeInput({
    acwr: {
      ratio: 1.7,
      acute: 1700,
      chronic: 1000,
      status: 'redline',
      message: 'Redline load.',
      daysOfData: 28,
      thresholds: {
        caution: 1.3,
        redline: 1.5,
        confidence: 'high',
        personalizationFactors: [],
      },
      loadMetrics: {
        acuteLoad: 1700,
        chronicLoad: 1000,
        acuteToChronicRatio: 1.7,
        strain: 0,
        monotony: 0,
      },
    },
  }));

  const riskTrace = mission.decisionTrace.find((item) => item.title === 'Risk control');
  const sodiumTrace = mission.decisionTrace.find((item) => item.title === 'Sodium restriction');

  expect(riskTrace?.humanInterpretation).toContain('digging a hole');
  expect(sodiumTrace?.humanInterpretation).toContain('Stay away from salt');
});

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
