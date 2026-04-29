/**
 * Standalone test for the legacy nutrition entry points.
 *
 * These exports remain because current app services still call them, but their
 * implementation must delegate to the canonical Nutrition and Fueling Engine.
 */

import {
  calculateNutritionTargetEstimate,
  computeMacroAdherence,
  resolveDailyNutritionTargetEstimate,
  resolveNutritionMacros,
} from './calculateNutrition.ts';

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

const baseInput = (overrides: Record<string, any> = {}) => ({
  weightLbs: 180,
  heightInches: 70,
  age: 25,
  biologicalSex: 'male' as const,
  activityLevel: 'moderate' as const,
  phase: 'off-season' as const,
  nutritionGoal: 'maintain' as const,
  cycleDay: null,
  coachProteinOverride: null,
  coachCarbsOverride: null,
  coachFatOverride: null,
  coachCaloriesOverride: null,
  ...overrides,
});

console.log('\n-- calculateNutritionTargetEstimate via Nutrition and Fueling Engine --');

(() => {
  const target = calculateNutritionTargetEstimate(baseInput());

  assert('legacy entry point identifies canonical engine', target.engineVersion === 'nutrition_fueling_engine_v1');
  assert('legacy entry point resolves canonical phase', target.canonicalPhase === 'build');
  assert('engine message is explicit', target.message.includes('Nutrition and Fueling Engine'));
  assert('macro calories reconcile to target calories', target.adjustedCalories === target.protein * 4 + target.carbs * 4 + target.fat * 9);
})();

(() => {
  const build = calculateNutritionTargetEstimate(baseInput({ phase: 'off-season', nutritionGoal: 'maintain' }));
  const camp = calculateNutritionTargetEstimate(baseInput({ phase: 'fight-camp', nutritionGoal: 'maintain' }));

  assert('phase-aware target raises camp support above build', camp.adjustedCalories > build.adjustedCalories);
  assert('camp phase maps to canonical camp', camp.canonicalPhase === 'camp');
})();

(() => {
  const unsafeOverride = calculateNutritionTargetEstimate(baseInput({
    coachCaloriesOverride: 900,
    nutritionGoal: 'cut',
    phase: 'fight-camp',
  }));

  assert('unsafe low calorie override is raised to safety floor', unsafeOverride.adjustedCalories >= 180 * 11.5);
  assert('unsafe override is explained', unsafeOverride.message.includes('safety floor'));
})();

(() => {
  const cut = calculateNutritionTargetEstimate(baseInput({ nutritionGoal: 'cut', phase: 'fight-camp' }));
  const bulk = calculateNutritionTargetEstimate(baseInput({ nutritionGoal: 'bulk', phase: 'off-season' }));

  assert('cut remains lower than bulk without using old macro tables', cut.adjustedCalories < bulk.adjustedCalories);
  assert('cut support is framed as safety-first', cut.message.includes('under-fueling floors'));
})();

console.log('\n-- computeMacroAdherence --');

(() => {
  const result = computeMacroAdherence(
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );

  assert('perfect adherence still reports target met', result.overall === 'Target Met');
  assert('percentages are still calculated', result.caloriesPct === 100 && result.proteinPct === 100);
})();

(() => {
  const result = computeMacroAdherence(
    { calories: 1600, protein: 90, carbs: 120, fat: 80 },
    { calories: 2000, protein: 150, carbs: 220, fat: 60 },
  );

  assert('clear miss remains a missed macro day', result.overall === 'Missed It');
})();

console.log('\n-- resolveDailyNutritionTargetEstimate via Nutrition and Fueling Engine --');

(() => {
  const base = calculateNutritionTargetEstimate(baseInput());
  const resolved = resolveDailyNutritionTargetEstimate(base, []);

  assert('no activities remains base source', resolved.source === 'base');
  assert('rest day has rest fuel state', resolved.fuelState === 'rest');
  assert('canonical trace is present', resolved.traceLines.some((line) => line.includes('Canonical Nutrition and Fueling Engine')));
})();

(() => {
  const base = calculateNutritionTargetEstimate(baseInput({
    phase: 'fight-camp',
    nutritionGoal: 'maintain',
  }));
  const resolved = resolveDailyNutritionTargetEstimate(
    base,
    [{ activity_type: 'sparring' as any, expected_intensity: 9, estimated_duration_min: 75, custom_label: 'Team sparring' }],
    {
      bodyweightLbs: 180,
      macrocycleContext: {
        goalMode: 'fight_camp',
        phase: 'fight-camp',
        campPhase: 'build',
      } as any,
    },
  );

  assert('sparring day uses daily activity source', resolved.source === 'daily_activity_adjusted');
  assert('sparring day gets sparring priority', resolved.prioritySession === 'sparring');
  assert('sparring day pre-session carbs are present', resolved.sessionFuelingPlan.preSession.carbsG > 0);
  assert('sparring day explanation survives adapter', resolved.reasonLines.some((line) => line.includes('Sparring')));
})();

(() => {
  const base = calculateNutritionTargetEstimate(baseInput({
    phase: 'camp-build',
    nutritionGoal: 'maintain',
  }));
  const resolved = resolveDailyNutritionTargetEstimate(
    base,
    [
      { activity_type: 'boxing_practice' as any, expected_intensity: 7, estimated_duration_min: 60, start_time: '09:00' },
      { activity_type: 'sc' as any, expected_intensity: 7, estimated_duration_min: 50, start_time: '17:00' },
    ],
  );

  assert('double session keeps two-a-day priority', resolved.prioritySession === 'double_session');
  assert('double session has between-session fueling', resolved.sessionFuelingPlan.betweenSessions != null);
  assert('daily target is not a shallow macro-only calculation', resolved.sessionFuelingPlan.coachingNotes.some((line) => line.includes('Nutrition and Fueling Engine')));
})();

(() => {
  const base = calculateNutritionTargetEstimate(baseInput({
    phase: 'camp-build',
    nutritionGoal: 'cut',
  }));
  const resolved = resolveDailyNutritionTargetEstimate(
    base,
    [{ activity_type: 'boxing_practice' as any, expected_intensity: 6, estimated_duration_min: 45 }],
    {
      bodyweightLbs: 180,
      daysToWeighIn: 3,
    },
  );

  assert('body-mass context no longer uses old weight-class protocol source', !String(resolved.source).includes('weight_class_protocol'));
  assert('body-mass context still applies safety floor when needed', resolved.adjustedCalories >= 180 * 11.5);
  assert('hydration guidance avoids unsafe dehydration copy', !resolved.hydrationPlan.notes.join(' ').toLowerCase().includes('water dump'));
})();

(() => {
  const base = calculateNutritionTargetEstimate(baseInput());
  const result = resolveNutritionMacros(
    base,
    [{ activity_type: 'conditioning' as any, expected_intensity: 8, estimated_duration_min: 50 }],
  );

  assert('resolveNutritionMacros uses the new resolver source', result.source === 'daily_activity_adjusted');
  assert('resolveNutritionMacros returns macro shape for current call sites', result.calories > 0 && result.protein > 0 && result.carbs > 0 && result.fat > 0);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
