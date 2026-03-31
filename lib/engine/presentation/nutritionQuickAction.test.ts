/**
 * Standalone test script for lib/engine/presentation/nutritionQuickAction.ts
 * Run with: npx tsx lib/engine/presentation/nutritionQuickAction.test.ts
 */

import { buildNutritionQuickActionViewModel } from './nutritionQuickAction.ts';
import type { DailyMission } from '../types/mission.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

const ZERO_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const HALF_TOTALS = { calories: 1000, protein: 100, carbs: 150, fat: 40 };

function makeMission(overrides: Partial<DailyMission> = {}): DailyMission {
  return {
    date: '2026-03-18',
    engineVersion: 'v3',
    generatedAt: '2026-03-18T06:00:00Z',
    headline: 'Training day',
    summary: 'Go for it.',
    objective: {} as any,
    macrocycleContext: {} as any,
    trainingDirective: {
      sessionRole: 'develop',
      interventionState: 'none' as any,
      isMandatoryRecovery: false,
      focus: 'strength',
      workoutType: 'sc' as any,
      intent: 'Build strength',
      reason: 'Following the plan.',
      intensityCap: null,
      durationMin: 60,
      volumeTarget: 'moderate',
      keyQualities: [],
      source: 'daily_engine',
      prescription: null,
    },
    fuelDirective: {
      state: 'strength_power' as any,
      sessionDemandScore: 8,
      calories: 2500,
      protein: 200,
      carbs: 300,
      fat: 80,
      preSessionCarbsG: 60,
      intraSessionCarbsG: 30,
      postSessionProteinG: 40,
      intraSessionHydrationOz: 20,
      hydrationBoostOz: 8,
      sodiumTargetMg: null,
      compliancePriority: 'performance',
      adjustmentFlag: null,
      source: 'daily_engine',
      message: 'Fuel up for performance.',
      reasons: [],
      energyAvailability: null,
      fuelingFloorTriggered: false,
      safetyWarning: 'none',
    },
    hydrationDirective: {} as any,
    recoveryDirective: {} as any,
    riskState: { level: 'low', score: 0, label: 'Low', drivers: [] },
    decisionTrace: [],
    overrideState: { status: 'following_plan', note: '' },
    ...overrides,
  };
}

console.log('\n── null mission ──');

const nullResult = buildNutritionQuickActionViewModel(null, ZERO_TOTALS);
assert('null: fuelDirectiveHeadline has default', nullResult.fuelDirectiveHeadline.length > 0);
assert('null: preSessionCue = null', nullResult.preSessionCue === null);
assert('null: postSessionCue = null', nullResult.postSessionCue === null);
assert('null: intraSessionCue = null', nullResult.intraSessionCue === null);
assert('null: quickIntentOptions empty', nullResult.quickIntentOptions.length === 0);
assert('null: isTrainingDay = false', nullResult.isTrainingDay === false);
assert('null: safetyWarning = null', nullResult.safetyWarning === null);

console.log('\n── training day ──');

const mission = makeMission();
const result = buildNutritionQuickActionViewModel(mission, ZERO_TOTALS);

assert('training day: isTrainingDay = true', result.isTrainingDay === true);
assert('training day: fuelDirectiveHeadline from message', result.fuelDirectiveHeadline === 'Fuel up for performance.');
assert('training day: preSessionCue present (preSessionCarbsG > 0)', result.preSessionCue !== null);
assert('training day: preSessionCue mentions carbs', result.preSessionCue!.includes('60g of carbs'));
assert('training day: intraSessionCue present (intraSessionCarbsG > 0)', result.intraSessionCue !== null);
assert('training day: intraSessionCue mentions 30g', result.intraSessionCue!.includes('30g of carbs'));
assert('training day: postSessionCue present (postSessionProteinG > 0)', result.postSessionCue !== null);
assert('training day: postSessionCue mentions 40g protein', result.postSessionCue!.includes('40g of protein'));

console.log('\n── rest day ──');

const restMission = makeMission({
  trainingDirective: { ...makeMission().trainingDirective, sessionRole: 'rest' },
  fuelDirective: { ...makeMission().fuelDirective, preSessionCarbsG: 0, intraSessionCarbsG: 0, postSessionProteinG: 0 },
});
const restResult = buildNutritionQuickActionViewModel(restMission, ZERO_TOTALS);

assert('rest day: isTrainingDay = false', restResult.isTrainingDay === false);
assert('rest day: no preSessionCue', restResult.preSessionCue === null);

console.log('\n── quickIntentOptions ──');

// Training day with preSessionCarbsG > 0 gets 3 intents (pre_workout + recovery_meal + balanced_meal)
assert('training day + pre: 3 quick intents', result.quickIntentOptions.length === 3);
assert('first intent id = pre_workout', result.quickIntentOptions[0].id === 'pre_workout');
assert('second intent id = recovery_meal', result.quickIntentOptions[1].id === 'recovery_meal');
assert('third intent id = balanced_meal', result.quickIntentOptions[2].id === 'balanced_meal');

// Rest day (no preSessionCarbsG): 2 intents (recovery_meal + balanced_meal, but label = Main meal)
const restWithCals = makeMission({
  trainingDirective: { ...makeMission().trainingDirective, sessionRole: 'rest' },
  fuelDirective: { ...makeMission().fuelDirective, preSessionCarbsG: 0 },
});
const restIntents = buildNutritionQuickActionViewModel(restWithCals, ZERO_TOTALS);
assert('rest day: 2 quick intents (no pre_workout)', restIntents.quickIntentOptions.length === 2);
assert('rest day: first intent = recovery_meal with Main meal label', restIntents.quickIntentOptions[0].id === 'recovery_meal' && restIntents.quickIntentOptions[0].label === 'Main meal');

// calTargets are non-negative
assert('all calTargets are non-negative', result.quickIntentOptions.every(i => i.calTarget >= 0));

// Partial totals: remaining is reduced
const partialResult = buildNutritionQuickActionViewModel(mission, HALF_TOTALS);
const fullResult = buildNutritionQuickActionViewModel(mission, ZERO_TOTALS);
assert('partial totals reduce calTarget', partialResult.quickIntentOptions[1].calTarget < fullResult.quickIntentOptions[1].calTarget);

console.log('\n── safety warnings ──');

const warnMission = makeMission({
  fuelDirective: { ...makeMission().fuelDirective, safetyWarning: 'low_energy_availability' },
});
const warnResult = buildNutritionQuickActionViewModel(warnMission, ZERO_TOTALS);
assert('low_energy_availability: safetyWarning present', warnResult.safetyWarning !== null);
assert('low_energy_availability: warning message is non-empty string', warnResult.safetyWarning!.length > 0);

const criticalMission = makeMission({
  fuelDirective: { ...makeMission().fuelDirective, safetyWarning: 'critical_energy_availability' },
});
const critResult = buildNutritionQuickActionViewModel(criticalMission, ZERO_TOTALS);
assert('critical_energy_availability: safetyWarning present', critResult.safetyWarning !== null);

const noneWarnMission = makeMission({
  fuelDirective: { ...makeMission().fuelDirective, safetyWarning: 'none' },
});
const noneResult = buildNutritionQuickActionViewModel(noneWarnMission, ZERO_TOTALS);
assert('safetyWarning = none → null', noneResult.safetyWarning === null);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
