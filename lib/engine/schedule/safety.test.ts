import { adjustNutritionForDay, detectOvertrainingRisk } from './safety.ts';

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

console.log('\n-- schedule/safety --');

(() => {
  const baseTargets = {
    adjustedCalories: 2500,
    protein: 200,
    carbs: 250,
    fat: 80,
  };

  // Rest day modifiers
  const restResult = adjustNutritionForDay(baseTargets as any, [
    { activity_type: 'rest', expected_intensity: 0, estimated_duration_min: 0 },
  ]);
  assert('Rest day carbModifierPct is -15', restResult.carbModifierPct === -15);
  assert('Rest day calorieModifier is -10% of base', restResult.calorieModifier === Math.round(2500 * -0.10));
  assert('Rest day fuelState is rest', restResult.fuelState === 'rest');
  assert('Rest day sessionDemandScore is 0', restResult.sessionDemandScore === 0);

  // Active recovery only
  const recoveryResult = adjustNutritionForDay(baseTargets as any, [
    { activity_type: 'active_recovery', expected_intensity: 3, estimated_duration_min: 30 },
  ]);
  assert('Recovery-only carbModifierPct is -5', recoveryResult.carbModifierPct === -5);
  assert('Recovery-only fuelState is active_recovery', recoveryResult.fuelState === 'active_recovery');

  // Sparring session
  const sparResult = adjustNutritionForDay(baseTargets as any, [
    { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 60 },
  ]);
  assert('Sparring raises carbModifierPct > 0', sparResult.carbModifierPct > 0);
  assert('Sparring raises calorieModifier > 0', sparResult.calorieModifier > 0);
  assert('Sparring fuelState is spar_support', sparResult.fuelState === 'spar_support');
  assert('Sparring proteinModifier > 0', sparResult.proteinModifier > 0);

  // Heavy S&C session (intensity >= 7)
  const scResult = adjustNutritionForDay(baseTargets as any, [
    { activity_type: 'sc', expected_intensity: 8, estimated_duration_min: 60 },
  ]);
  assert('Heavy SC fuelState is strength_power', scResult.fuelState === 'strength_power');

  // Multiple sessions in a day
  const multiResult = adjustNutritionForDay(baseTargets as any, [
    { activity_type: 'boxing_practice', expected_intensity: 7, estimated_duration_min: 60 },
    { activity_type: 'sc', expected_intensity: 7, estimated_duration_min: 45 },
  ]);
  assert('Multi-session fuelState is double_day', multiResult.fuelState === 'double_day');
  assert('Multi-session demandScore > single session', multiResult.sessionDemandScore > scResult.sessionDemandScore);

  // detectOvertrainingRisk: high ACWR triggers danger warning
  const highACWRWarnings = detectOvertrainingRisk(
    [
      { activity_type: 'sparring', expected_intensity: 9, estimated_duration_min: 60, date: '2026-03-16' },
      { activity_type: 'sc', expected_intensity: 8, estimated_duration_min: 60, date: '2026-03-17' },
    ],
    1.8,   // very high ACWR
    4.0,   // decent sleep
    false,
  );
  assert('High ACWR (1.8) produces at least one warning', highACWRWarnings.length > 0);

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
