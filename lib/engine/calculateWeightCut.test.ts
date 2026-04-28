import {
  computeCarbCycle,
  computeDailyCutProtocol,
  computeRehydrationProtocol,
  detectStall,
  determineCutPhase,
  generateCutPlan,
  getDailyCutIntensityCap,
  validateCutSafety,
} from './calculateWeightCut.ts';
import type { CutSafetyInput, WeightCutPlanRow } from './types.ts';

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

function makePlan(overrides: Partial<WeightCutPlanRow> = {}): WeightCutPlanRow {
  return {
    id: 'plan-1',
    user_id: 'athlete-1',
    start_weight: 170,
    target_weight: 165,
    weight_class_name: '165',
    sport: 'boxing',
    fight_date: '2026-06-15',
    weigh_in_date: '2026-06-14',
    plan_created_date: '2026-04-28',
    fight_status: 'amateur',
    max_water_cut_pct: 0,
    total_cut_lbs: 5,
    diet_phase_target_lbs: 5,
    water_cut_allocation_lbs: 0,
    chronic_phase_start: '2026-04-28',
    chronic_phase_end: '2026-06-06',
    intensified_phase_start: '2026-04-28',
    intensified_phase_end: '2026-06-06',
    fight_week_start: '2026-06-07',
    weigh_in_day: '2026-06-14',
    rehydration_start: '2026-06-14',
    status: 'active',
    completed_at: null,
    safe_weekly_loss_rate: 1.3,
    calorie_floor: 1800,
    baseline_cognitive_score: null,
    coach_notes: null,
    biological_sex: 'male',
    risk_acknowledged_at: null,
    risk_acknowledgement_version: null,
    risk_warning_snapshot: null,
    created_at: '2026-04-28T00:00:00.000Z',
    updated_at: '2026-04-28T00:00:00.000Z',
    ...overrides,
  };
}

function makeSafetyInput(overrides: Partial<CutSafetyInput> = {}): CutSafetyInput {
  return {
    cutPhase: 'chronic',
    startWeightLbs: 170,
    currentWeightLbs: 168,
    weeklyVelocityLbs: -1,
    prescribedCalories: 2300,
    calorieFloor: 1800,
    readinessState: 'Prime',
    consecutiveDepletedDays: 0,
    acwr: 1,
    urineColor: null,
    bodyTempF: null,
    baselineCognitiveScore: null,
    latestCognitiveScore: null,
    waterCutAllocationLbs: 0,
    remainingLbsToTarget: 3,
    daysToWeighIn: 30,
    fightStatus: 'amateur',
    safetyContext: {
      age: 25,
      sex: 'male',
      weighInTiming: 'next_day',
      competitionPhase: 'fight-camp',
      asOfDate: '2026-04-28',
    },
    projectedWeightByWeighIn: null,
    ...overrides,
  };
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

const BANNED_METHODS = [
  'sauna',
  'sweat suit',
  'diuretic',
  'laxative',
  'vomiting',
  'severe fasting',
  'extreme fluid restriction',
];

console.log('\n-- calculateWeightCut safety adapter --');

(() => {
  const result = generateCutPlan({
    asOfDate: '2026-06-10',
    startWeight: 180,
    targetWeight: 160,
    fightDate: '2026-06-15',
    weighInDate: '2026-06-14',
    fightStatus: 'amateur',
    biologicalSex: 'male',
    sport: 'boxing',
    athleteAge: 25,
    weighInTiming: 'next_day',
  });

  assert('unsafe cut is blocked', !result.valid);
  assert('unsafe cut does not allocate acute loss', result.waterCutAllocationLbs === 0 && result.maxWaterCutPct === 0);
  assert('unsafe cut returns safety warning', result.cutWarning?.code === 'unsafe_weight_class_target');
})();

(() => {
  const result = generateCutPlan({
    asOfDate: '2026-05-20',
    startWeight: 175,
    targetWeight: 165,
    fightDate: '2026-06-15',
    weighInDate: '2026-06-14',
    fightStatus: 'amateur',
    biologicalSex: 'male',
    sport: 'boxing',
    athleteAge: 25,
    weighInTiming: 'next_day',
  });

  assert('high-risk plan does not generate a protocol', !result.valid);
  assert('safer alternatives are surfaced', result.safetyWarnings.some((warning) => warning.includes('Choose a safer class')));
})();

(() => {
  const result = generateCutPlan({
    asOfDate: '2026-04-28',
    startWeight: 170,
    targetWeight: 165,
    fightDate: '2026-06-15',
    weighInDate: '2026-06-14',
    fightStatus: 'amateur',
    biologicalSex: 'male',
    sport: 'boxing',
    athleteAge: 25,
    weighInTiming: 'next_day',
  });

  assert('gradual target can be planned', result.valid);
  assert('old acute loss allocation is removed', result.waterCutAllocationLbs === 0);
})();

(() => {
  const result = generateCutPlan({
    asOfDate: '2026-04-28',
    startWeight: 170,
    targetWeight: 166,
    fightDate: '2026-06-15',
    weighInDate: '2026-06-14',
    fightStatus: 'amateur',
    biologicalSex: 'male',
    sport: 'boxing',
    athleteAge: 16,
    weighInTiming: 'next_day',
  });

  assert('minor athlete gets review warning', result.safetyWarnings.some((warning) => warning.includes('qualified review')));
})();

(() => {
  const plan = makePlan();

  assert('past weigh-in is post weigh-in recovery', determineCutPhase(plan, '2026-06-15') === 'rehydration');
  assert('weigh-in day is weigh_in', determineCutPhase(plan, '2026-06-14') === 'weigh_in');
  assert('competition week is monitoring, not final cut', determineCutPhase(plan, '2026-06-13') === 'fight_week_load');
  assert('legacy final-cut phase is not returned', determineCutPhase(plan, '2026-06-12') !== 'fight_week_cut');
  assert('competition week gets conservative cap', getDailyCutIntensityCap(plan, '2026-06-12') === 5);
  assert('non-active plan has no cap', getDailyCutIntensityCap(makePlan({ status: 'paused' }), '2026-06-12') === null);
})();

(() => {
  const result = computeCarbCycle({
    baseCalories: 2400,
    baseProtein: 170,
    baseCarbs: 260,
    baseFat: 80,
    isTrainingDay: false,
    hasHighIntensitySession: false,
    cutPhase: 'chronic',
  });

  assert('carb cycle does not create low day', result.cycleType !== 'low');
  assert('carb cycle preserves calories', result.adjustedCalories === 2400);
})();

(() => {
  const result = detectStall({
    weightHistory: [
      { date: '2026-04-01', weight: 170 },
      { date: '2026-04-14', weight: 170 },
    ],
    daysAtDeficit: 30,
    lastRefeedDate: null,
    lastDietBreakDate: null,
  });

  assert('stall logic does not escalate restriction', result.recommendation === 'none');
})();

(() => {
  const flags = validateCutSafety(makeSafetyInput({
    weeklyVelocityLbs: -3,
  }));

  assert('rapid body mass decline triggers risk flag', flags.some((flag) => flag.code === 'rapid_body_mass_change'));
})();

(() => {
  const flags = validateCutSafety(makeSafetyInput({
    safetyContext: {
      age: 16,
      sex: 'male',
      weighInTiming: 'next_day',
      competitionPhase: 'fight-camp',
      asOfDate: '2026-04-28',
    },
  }));

  assert('minor athlete requires professional review', flags.some((flag) => flag.code === 'professional_review_required'));
})();

(() => {
  const protocol = computeDailyCutProtocol({
    plan: makePlan({
      start_weight: 180,
      target_weight: 160,
      fight_date: '2026-06-15',
      weigh_in_date: '2026-06-14',
    }),
    date: '2026-06-10',
    currentWeight: 180,
    weightHistory: [
      { date: '2026-06-01', weight: 184 },
      { date: '2026-06-10', weight: 180 },
    ],
    baseNutritionTargets: {
      tdee: 2700,
      adjustedCalories: 2300,
      protein: 180,
      carbs: 260,
      fat: 70,
      proteinModifier: 1,
      phaseMultiplier: 0,
      weightCorrectionDeficit: 0,
      message: 'base',
    },
    dayActivities: [],
    readinessState: 'Prime',
    acwr: 1,
    biologicalSex: 'male',
    cycleDay: null,
    weeklyVelocityLbs: -1,
    lastRefeedDate: null,
    lastDietBreakDate: null,
    baselineCognitiveScore: null,
    latestCognitiveScore: null,
    urineColor: null,
    bodyTempF: null,
    consecutiveDepletedDays: 0,
    safetyContext: {
      age: 25,
      sex: 'male',
      weighInTiming: 'next_day',
      competitionPhase: 'fight-camp',
      asOfDate: '2026-06-10',
    },
  });

  assert('high-risk daily protocol is blocked', protocol.activeCutWarning?.code === 'unsafe_weight_class_target');
  assert('daily protocol keeps nutrition floor', protocol.prescribedCalories >= 1800);
  assert('daily protocol does not recommend banned methods', BANNED_METHODS.every((method) => !allText(protocol).includes(method)));
})();

(() => {
  const protocol = computeRehydrationProtocol({
    currentWeight: 165,
    targetWeight: 170,
    hoursToFight: 24,
    biologicalSex: 'male',
  });

  assert('post weigh-in recovery does not force weight regain target', protocol.targetRegainLbs === 0);
  assert('post weigh-in recovery uses monitoring metrics', protocol.monitorMetrics.includes('stomach comfort'));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
