/**
 * Standalone test script for lib/engine/calculateNutrition.ts
 */

import {
  calculateNutritionTargets,
  computeMacroAdherence,
  resolveDailyMacros,
} from './calculateNutrition';

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

console.log('\n-- calculateNutrition --');

(() => {
  const targets = calculateNutritionTargets({
    weightLbs: 150,
    heightInches: 64,
    age: 28,
    biologicalSex: 'female',
    activityLevel: 'sedentary',
    phase: 'fight-camp',
    nutritionGoal: 'cut',
    cycleDay: null,
    coachProteinOverride: null,
    coachCarbsOverride: null,
    coachFatOverride: null,
    coachCaloriesOverride: 900,
  });

  assert('Female calorie floor enforced', targets.adjustedCalories >= 1200);
})();

(() => {
  const baseline = calculateNutritionTargets({
    weightLbs: 160,
    heightInches: 68,
    age: 27,
    biologicalSex: 'female',
    activityLevel: 'moderate',
    phase: 'pre-camp',
    nutritionGoal: 'maintain',
    cycleDay: 10,
    coachProteinOverride: null,
    coachCarbsOverride: null,
    coachFatOverride: null,
    coachCaloriesOverride: null,
  });

  const lutealLate = calculateNutritionTargets({
    weightLbs: 160,
    heightInches: 68,
    age: 27,
    biologicalSex: 'female',
    activityLevel: 'moderate',
    phase: 'pre-camp',
    nutritionGoal: 'maintain',
    cycleDay: 24,
    coachProteinOverride: null,
    coachCarbsOverride: null,
    coachFatOverride: null,
    coachCaloriesOverride: null,
  });

  assert('Late-luteal protein is higher than follicular', lutealLate.protein > baseline.protein);
})();

(() => {
  const adherence = computeMacroAdherence(
    { calories: 1990, protein: 151, carbs: 201, fat: 61 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );

  assert('Near-perfect adherence is Target Met', adherence.overall === 'Target Met');
})();

(() => {
  const base = calculateNutritionTargets({
    weightLbs: 170,
    heightInches: 70,
    age: 30,
    biologicalSex: 'male',
    activityLevel: 'moderate',
    phase: 'camp-build',
    nutritionGoal: 'maintain',
    cycleDay: null,
    coachProteinOverride: null,
    coachCarbsOverride: null,
    coachFatOverride: null,
    coachCaloriesOverride: null,
  });

  const result = resolveDailyMacros(
    base,
    {
      prescribed_calories: 2200,
      prescribed_protein: 180,
      prescribed_carbs: 200,
      prescribed_fat: 70,
    } as any,
    [],
  );

  assert('Active cut protocol overrides base calories', result.calories === 2200);
  assert('Active cut protocol source selected', result.source === 'weight_cut_protocol');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
