/**
 * Standalone test for lib/engine/calculateNutrition.ts
 */

import {
  calculateNutritionTargets,
  computeMacroAdherence,
  resolveDailyNutritionTargets,
  resolveDailyMacros,
} from './calculateNutrition.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} +/- ${tolerance})`); }
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

(() => {
  const r = calculateNutritionTargets(baseInput());
  assertClose('Male BMR-based TDEE (moderate)', r.tdee, 2531, 2);
  assert('Off-season maintain phaseMultiplier = 0', r.phaseMultiplier === 0);
})();

(() => {
  const r = calculateNutritionTargets(baseInput({ biologicalSex: 'female' }));
  assertClose('Female BMR-based TDEE (moderate)', r.tdee, 2298, 2);
})();

(() => {
  const r = calculateNutritionTargets(baseInput({ heightInches: null, age: null }));
  assertClose('Simplified BMR TDEE', r.tdee, 2520, 1);
})();

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
    const expectedTDEE = Math.round(1808 * mult);
    assertClose(`Activity ${level} -> TDEE ~${expectedTDEE}`, r.tdee, expectedTDEE, 3);
  }
})();

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

(() => {
  const r = calculateNutritionTargets(baseInput({ coachProteinOverride: 250 }));
  assert('Coach protein override applied', r.protein === 250);
})();

(() => {
  const maintain = calculateNutritionTargets(baseInput({ nutritionGoal: 'maintain' }));
  const cut = calculateNutritionTargets(baseInput({ phase: 'fight-camp', nutritionGoal: 'cut' }));
  assert('Protein scales up in deeper deficit', cut.protein > maintain.protein);
})();

(() => {
  const r = calculateNutritionTargets(baseInput());
  const reconciledCal = r.protein * 4 + r.carbs * 4 + r.fat * 9;
  assert('Macros reconcile to adjustedCalories', r.adjustedCalories === reconciledCal);
})();

console.log('\n-- computeMacroAdherence --');

(() => {
  const r = computeMacroAdherence(
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('Perfect adherence -> Target Met', r.overall === 'Target Met');
  assert('All percentages 100%', r.caloriesPct === 100 && r.proteinPct === 100);
})();

(() => {
  const r = computeMacroAdherence(
    { calories: 1990, protein: 151, carbs: 201, fat: 61 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('Near-perfect (within 10%) -> Target Met', r.overall === 'Target Met');
})();

(() => {
  const r = computeMacroAdherence(
    { calories: 1700, protein: 150, carbs: 200, fat: 60 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('15% off calories -> Close Enough', r.overall === 'Close Enough');
})();

(() => {
  const r = computeMacroAdherence(
    { calories: 2000, protein: 112, carbs: 200, fat: 60 },
    { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  );
  assert('25% off protein -> Missed It', r.overall === 'Missed It');
})();

(() => {
  const r = computeMacroAdherence(
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  assert('Zero/zero -> 100% -> Target Met', r.overall === 'Target Met');
})();

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
  assert('EA protected to 20+', (resolved.energyAvailability ?? 0) >= 20);
  assert('Trace lines populated', resolved.traceLines.length > 0);
  assert('Hard training day builds sparring fueling plan', resolved.sessionFuelingPlan.priority === 'sparring');
  assert('Hard training day hydration plan is populated', resolved.hydrationPlan.dailyTargetOz > 0);
})();

(() => {
  const base = calculateNutritionTargets(baseInput());
  const resolved = resolveDailyNutritionTargets(base, null, []);
  assert('No activities -> source is base', resolved.source === 'base');
  assert('No activities -> recovery priority', resolved.prioritySession === 'recovery');
})();

(() => {
  const base = calculateNutritionTargets(baseInput({
    phase: 'camp-build',
    nutritionGoal: 'maintain',
  }));
  const baseline = resolveDailyNutritionTargets(
    base,
    null,
    [{ activity_type: 'boxing_practice' as any, expected_intensity: 7, estimated_duration_min: 60, start_time: '10:00' }],
    {
      macrocycleContext: {
        goalMode: 'fight_camp',
        campPhase: 'build',
      } as any,
    },
  );
  const resolved = resolveDailyNutritionTargets(
    base,
    null,
    [{ activity_type: 'boxing_practice' as any, expected_intensity: 7, estimated_duration_min: 60, start_time: '10:00' }],
    {
      readinessProfile: {
        readinessState: 'Caution',
        neuralReadiness: 48,
        structuralReadiness: 76,
        metabolicReadiness: 72,
        trend: 'stable',
        flags: [],
        performanceAnchors: [],
      } as any,
      macrocycleContext: {
        goalMode: 'fight_camp',
        campPhase: 'build',
      } as any,
    },
  );

  assert('Low neural practice day keeps boxing priority', resolved.prioritySession === 'boxing_practice');
  assert('Low neural practice day preserves or raises pre-session carbs', resolved.sessionFuelingPlan.preSession.carbsG >= baseline.sessionFuelingPlan.preSession.carbsG);
  assert('Low neural practice day raises hydration support', resolved.hydrationBoostOz > baseline.hydrationBoostOz);
  assert('Low neural practice day does not cut calories below the baseline practice day', resolved.adjustedCalories >= baseline.adjustedCalories);
})();

(() => {
  const base = calculateNutritionTargets(baseInput({
    phase: 'camp-build',
    nutritionGoal: 'maintain',
  }));
  const resolved = resolveDailyNutritionTargets(
    base,
    null,
    [{ activity_type: 'sparring' as any, expected_intensity: 8, estimated_duration_min: 60 }],
    {
      readinessProfile: {
        readinessState: 'Caution',
        neuralReadiness: 72,
        structuralReadiness: 42,
        metabolicReadiness: 70,
        trend: 'stable',
        flags: [],
        performanceAnchors: [],
      } as any,
    },
  );

  assert('Low structural day marks impact recovery focus', resolved.recoveryNutritionFocus === 'impact_recovery');
  assert('Low structural day keeps protein elevated', resolved.protein >= base.protein + 6);
  assert('Low structural day still gives recovery protein target', resolved.sessionFuelingPlan.postSession.proteinG >= 30);
})();

(() => {
  const base = calculateNutritionTargets(baseInput({
    phase: 'fight-camp',
    nutritionGoal: 'cut',
    coachCaloriesOverride: 1950,
  }));
  const resolved = resolveDailyNutritionTargets(
    base,
    null,
    [{ activity_type: 'conditioning' as any, expected_intensity: 8, estimated_duration_min: 50 }],
    {
      readinessProfile: {
        readinessState: 'Caution',
        neuralReadiness: 66,
        structuralReadiness: 68,
        metabolicReadiness: 40,
        trend: 'dropping',
        flags: [],
        performanceAnchors: [],
      } as any,
      macrocycleContext: {
        goalMode: 'fight_camp',
        campPhase: 'peak',
      } as any,
    },
  );

  assert('Low metabolic day marks hydration restore focus', resolved.recoveryNutritionFocus === 'hydration_restore');
  assert('Low metabolic day raises hydration plan notes', resolved.hydrationPlan.notes.length > 0);
  assert('Low metabolic day reduces deficit pressure', resolved.adjustedCalories >= base.adjustedCalories);
})();

(() => {
  const base = calculateNutritionTargets(baseInput({
    phase: 'camp-build',
    nutritionGoal: 'maintain',
  }));
  const resolved = resolveDailyNutritionTargets(
    base,
    null,
    [
      { activity_type: 'boxing_practice' as any, expected_intensity: 7, estimated_duration_min: 60, start_time: '09:00' },
      { activity_type: 'sc' as any, expected_intensity: 7, estimated_duration_min: 50, start_time: '17:00' },
    ],
  );

  assert('Double-session day uses double-session priority', resolved.prioritySession === 'double_session');
  assert('Double-session day has between-session refuel', resolved.sessionFuelingPlan.betweenSessions != null);
})();

(() => {
  const base = calculateNutritionTargets(baseInput({
    phase: 'camp-build',
    nutritionGoal: 'cut',
  }));
  const resolved = resolveDailyNutritionTargets(
    base,
    {
      prescribed_calories: 1900,
      prescribed_protein: 190,
      prescribed_carbs: 120,
      prescribed_fat: 55,
      cut_phase: 'fight_week_cut',
      training_intensity_cap: 4,
      water_target_oz: 140,
      sodium_target_mg: 600,
      days_to_weigh_in: 3,
    } as any,
    [{ activity_type: 'boxing_practice' as any, expected_intensity: 5, estimated_duration_min: 40 }],
  );

  assert('Cut protocol still uses cut-protect fuel state', resolved.fuelState === 'cut_protect');
  assert('Cut protocol still builds session fueling plan', resolved.sessionFuelingPlan.preSession.carbsG > 0);
  assert('Cut protocol hydration plan follows cut target', resolved.hydrationPlan.dailyTargetOz >= 140);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
