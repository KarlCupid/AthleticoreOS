/**
 * Standalone test for lib/engine/calculateNutrition.ts
 */

import {
  calculateNutritionTargets,
  computeMacroAdherence,
  resolveDailyNutritionTargets,
  resolveDailyMacros,
} from '.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} ±${tolerance})`); }
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

console.log('\n-- calculateNutritionTargets --');

// === Mifflin-St Jeor BMR ===
(() => {
  // Male: 10*kg + 6.25*cm - 5*age + 5
  // 180 lbs = 81.64656 kg, 70 in = 177.8 cm, age 25
  // BMR = 10*81.64656 + 6.25*177.8 - 5*25 + 5 = 816.47 + 1111.25 - 125 + 5 = 1807.72
  // TDEE = round(1807.72 * 1.4) = round(2530.8) = 2531
  const r = calculateNutritionTargets(baseInput());
  assertClose('Male BMR-based TDEE (moderate)', r.tdee, 2531, 2);
  assert('Off-season maintain phaseMultiplier = 0', r.phaseMultiplier === 0);
})();

(() => {
  // Female: 10*kg + 6.25*cm - 5*age - 161
  // BMR = 816.47 + 1111.25 - 125 - 161 = 1641.72
  // TDEE = round(1641.72 * 1.4) = round(2298.4) = 2298
  const r = calculateNutritionTargets(baseInput({ biologicalSex: 'female' }));
  assertClose('Female BMR-based TDEE (moderate)', r.tdee, 2298, 2);
})();

// === Simplified BMR (no height/age) ===
(() => {
  const r = calculateNutritionTargets(baseInput({ heightInches: null, age: null }));
  // BMR = 10 * 180 = 1800, TDEE = round(1800 * 1.4) = 2520
  assertClose('Simplified BMR TDEE', r.tdee, 2520, 1);
})();

// === Activity multipliers ===
(() => {
  const levels = [
    ['sedentary', 1.15],
    ['light', 1.25],
    ['moderate', 1.4],
    ['very_active', 1.6],
    ['extra_active', 1.75],
  ] as const;

  for (const [level, mult] of levels) {
    const r = calculateNutritionTargets(baseInput({ activityLevel: level }));
    // BMR ~ 1808, TDEE = round(1808 * mult)
    const expectedTDEE = Math.round(1808 * mult);
    assertClose(`Activity ${level} → TDEE ~${expectedTDEE}`, r.tdee, expectedTDEE, 3);
  }
})();

// === Phase + goal modifiers ===
(() => {
  const offCut = calculateNutritionTargets(baseInput({ nutritionGoal: 'cut' }));
  assert('Off-season cut: phaseMultiplier = -0.1', offCut.phaseMultiplier === -0.1);

  const fcCut = calculateNutritionTargets(baseInput({ phase: 'fight-camp', nutritionGoal: 'cut' }));
  assert('Fight-camp cut: phaseMultiplier = -0.25', fcCut.phaseMultiplier === -0.25);

  const cbMaint = calculateNutritionTargets(baseInput({ phase: 'camp-base', nutritionGoal: 'maintain' }));
  assert('Camp-base maintain: phaseMultiplier = 0.05', cbMaint.phaseMultiplier === 0.05);

  const ctCut = calculateNutritionTargets(baseInput({ phase: 'camp-taper', nutritionGoal: 'cut' }));
  assert('Camp-taper cut: phaseMultiplier = -0.2', ctCut.phaseMultiplier === -0.2);
})();

// === Calorie floors ===
(() => {
  const r = calculateNutritionTargets(baseInput({
    biologicalSex: 'female',
    coachCaloriesOverride: 900,
    phase: 'fight-camp',
    nutritionGoal: 'cut',
  }));
  assert('Female calorie floor enforced (>= 1200)', r.adjustedCalories >= 1200);
})();

(() => {
  const r = calculateNutritionTargets(baseInput({
    biologicalSex: 'male',
    coachCaloriesOverride: 1000,
    phase: 'fight-camp',
    nutritionGoal: 'cut',
  }));
  assert('Male calorie floor enforced (>= 1500)', r.adjustedCalories >= 1500);
})();

// === Biology modifier (protein) ===
(() => {
  const follicular = calculateNutritionTargets(baseInput({
    biologicalSex: 'female',
    cycleDay: 10,
  }));
  const lutealLate = calculateNutritionTargets(baseInput({
    biologicalSex: 'female',
    cycleDay: 24,
  }));
  assert('Late-luteal proteinModifier is 1.15', lutealLate.proteinModifier === 1.15);
  assert('Follicular proteinModifier is 1.0', follicular.proteinModifier === 1.0);
  assert('Late-luteal protein > follicular protein', lutealLate.protein > follicular.protein);
})();

// === Weight correction deficit ===
(() => {
  const base = calculateNutritionTargets(baseInput());
  const withCorrection = calculateNutritionTargets(baseInput({ weightCorrectionDeficit: 200 }));
  assert('Positive correction reduces calories', withCorrection.adjustedCalories < base.adjustedCalories);
  assert('Correction message mentions correction', withCorrection.message.includes('correction'));
})();

(() => {
  const base = calculateNutritionTargets(baseInput());
  const ahead = calculateNutritionTargets(baseInput({ weightCorrectionDeficit: -125 }));
  assert('Negative correction increases calories (ahead)', ahead.adjustedCalories > base.adjustedCalories);
  assert('Ahead message mentions deficit reduced', ahead.message.includes('Deficit reduced'));
})();

// === Coach overrides ===
(() => {
  const r = calculateNutritionTargets(baseInput({ coachProteinOverride: 250 }));
  assert('Coach protein override applied', r.protein === 250);
})();

// === Protein scales with deficit ===
(() => {
  const maintain = calculateNutritionTargets(baseInput({ nutritionGoal: 'maintain' }));
  const cut = calculateNutritionTargets(baseInput({ phase: 'fight-camp', nutritionGoal: 'cut' }));
  assert('Protein scales up in deeper deficit', cut.protein > maintain.protein);
})();

// === Macro reconciliation ===
(() => {
  const r = calculateNutritionTargets(baseInput());
  const reconciledCal = r.protein * 4 + r.carbs * 4 + r.fat * 9;
  assert('Macros reconcile to adjustedCalories', r.adjustedCalories === reconciledCal);
})();

// === computeMacroAdherence ===
console.log('\n-- computeMacroAdherence --');

(() => {
  const r = computeMacroAdherence(
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('Perfect adherence → Target Met', r.overall === 'Target Met');
  assert('All percentages 100%', r.caloriesPct === 100 && r.proteinPct === 100);
})();

(() => {
  const r = computeMacroAdherence(
    { calories: 1990, protein: 151, carbs: 201, fat: 61 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('Near-perfect (within 10%) → Target Met', r.overall === 'Target Met');
})();

(() => {
  // 15% off on calories: 2000 * 0.85 = 1700
  const r = computeMacroAdherence(
    { calories: 1700, protein: 150, carbs: 200, fat: 60 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('15% off calories → Close Enough', r.overall === 'Close Enough');
})();

(() => {
  // 25% off on protein: 150 * 0.75 = 112
  const r = computeMacroAdherence(
    { calories: 2000, protein: 112, carbs: 200, fat: 60 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('25% off protein → Missed It', r.overall === 'Missed It');
})();

(() => {
  // Zero prescribed and zero actual
  const r = computeMacroAdherence(
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  assert('Zero/zero → 100% → Target Met', r.overall === 'Target Met');
})();

// === resolveDailyMacros ===
console.log('\n-- resolveDailyMacros --');

(() => {
  const base = calculateNutritionTargets(baseInput({
    phase: 'camp-build',
    nutritionGoal: 'maintain',
  }));

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

  const reconciledCalories = (result.protein * 4) + (result.carbs * 4) + (result.fat * 9);
  assert('Cut protocol macros reconcile', result.calories === reconciledCalories);
  assert('Cut protocol source', result.source === 'weight_cut_protocol' || result.source === 'weight_cut_protocol_safety_adjusted');
})();

(() => {
  const base = calculateNutritionTargets(baseInput({
    phase: 'fight-camp',
    nutritionGoal: 'cut',
    coachCaloriesOverride: 1800,
  }));

  const resolved = resolveDailyNutritionTargets(
    base,
    null,
    [{ activity_type: 'sparring' as any, expected_intensity: 9, estimated_duration_min: 75 }],
  );

  assert('Fueling floor triggers on hard training day', resolved.fuelingFloorTriggered === true);
  assert('EA protected to 30+', (resolved.energyAvailability ?? 0) >= 20);
  assert('Trace lines populated', resolved.traceLines.length > 0);
})();

(() => {
  const base = calculateNutritionTargets(baseInput());
  const resolved = resolveDailyNutritionTargets(base, null, []);
  assert('No activities → source is base', resolved.source === 'base');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
