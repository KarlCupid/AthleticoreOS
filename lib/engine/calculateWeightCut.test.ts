/**
 * Standalone test script for lib/engine/calculateWeightCut.ts
 */

import {
  generateCutPlan,
  determineCutPhase,
  computeDailyCutProtocol,
} from './calculateWeightCut';
import type { WeightCutPlanRow, NutritionTargets } from './types';

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
    user_id: 'user-1',
    start_weight: 180,
    target_weight: 170,
    weight_class_name: 'Lightweight',
    sport: 'mma',
    fight_date: '2026-03-15',
    weigh_in_date: '2026-03-14',
    plan_created_date: '2026-01-01',
    fight_status: 'amateur',
    max_water_cut_pct: 3,
    total_cut_lbs: 10,
    diet_phase_target_lbs: 6,
    water_cut_allocation_lbs: 4,
    chronic_phase_start: '2026-01-01',
    chronic_phase_end: '2026-02-15',
    intensified_phase_start: '2026-02-16',
    intensified_phase_end: '2026-03-06',
    fight_week_start: '2026-03-07',
    weigh_in_day: '2026-03-14',
    rehydration_start: '2026-03-15',
    status: 'active',
    completed_at: null,
    safe_weekly_loss_rate: 2.0,
    calorie_floor: 1500,
    baseline_cognitive_score: null,
    coach_notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const baseTargets: NutritionTargets = {
  tdee: 2600,
  adjustedCalories: 2200,
  protein: 180,
  carbs: 220,
  fat: 70,
  proteinModifier: 1,
  phaseMultiplier: -0.15,
  weightCorrectionDeficit: 0,
  message: 'base',
};

console.log('\n-- calculateWeightCut --');

(() => {
  const result = generateCutPlan({
    startWeight: 180,
    targetWeight: 170,
    fightDate: '2026-04-01',
    weighInDate: '2026-03-31',
    fightStatus: 'amateur',
    biologicalSex: 'male',
    sport: 'mma',
  });

  assert('Valid cut plan returns valid=true', result.valid === true);
  assert('Cut lbs computed correctly', result.totalCutLbs === 10);
})();

(() => {
  const plan = makePlan();
  assert('3 days out is fight_week_cut', determineCutPhase(plan, '2026-03-11') === 'fight_week_cut');
  assert('Weigh-in day resolves weigh_in', determineCutPhase(plan, '2026-03-14') === 'weigh_in');
})();

(() => {
  const plan = makePlan();
  const result = computeDailyCutProtocol({
    plan,
    date: '2026-03-11', // 3 days to weigh-in => fight_week_cut
    currentWeight: 174,
    weightHistory: [
      { date: '2026-03-01', weight: 176 },
      { date: '2026-03-02', weight: 175.8 },
      { date: '2026-03-03', weight: 175.5 },
      { date: '2026-03-04', weight: 175.3 },
      { date: '2026-03-05', weight: 175.1 },
      { date: '2026-03-06', weight: 174.8 },
      { date: '2026-03-07', weight: 174.6 },
      { date: '2026-03-08', weight: 174.4 },
      { date: '2026-03-09', weight: 174.2 },
      { date: '2026-03-10', weight: 174.0 },
    ],
    baseNutritionTargets: baseTargets,
    dayActivities: [],
    readinessState: 'Caution',
    acwr: 1.1,
    biologicalSex: 'male',
    cycleDay: null,
    weeklyVelocityLbs: -1.4,
    lastRefeedDate: null,
    lastDietBreakDate: null,
    baselineCognitiveScore: null,
    latestCognitiveScore: null,
    urineColor: 3,
    bodyTempF: 98.6,
    consecutiveDepletedDays: 0,
  });

  const macroCalories = result.prescribedProtein * 4 + result.prescribedCarbs * 4 + result.prescribedFat * 9;

  assert('Fight-week calories are not forcibly clamped to calorie floor', result.prescribedCalories < plan.calorie_floor);
  assert('Calories and macros are internally consistent', Math.abs(macroCalories - result.prescribedCalories) <= 8);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
