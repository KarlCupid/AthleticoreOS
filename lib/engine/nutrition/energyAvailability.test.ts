import {
  applyFuelingFloor as floor,
  calculateEnergyAvailability,
  estimateLeanMassKg,
  estimateTrainingExpenditure,
  getNutritionSafetyWarning,
} from './energyAvailability.ts';

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

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} +/- ${tolerance})`);
  }
}

console.log('\n-- nutrition/energyAvailability --');

(() => {
  const ea = calculateEnergyAvailability(2200, 600, 55);
  assert('Energy availability calculates', ea > 0);
})();

(() => {
  const result = floor({
    targetCalories: 1800,
    estimatedExpenditure: 900,
    leanMassKg: 55,
    isTrainingDay: true,
    daysToWeighIn: 5,
  });

  assert('Fueling floor raises calories', result.adjustedCalories > 1800);
  assert('Fueling floor protects EA to the <=7 day floor of 23+', result.energyAvailability >= 23);
})();

(() => {
  const exp = estimateTrainingExpenditure([
    { activity_type: 'boxing_practice', expected_intensity: 6, estimated_duration_min: 60 },
  ]);
  assert('Boxing practice 60 min intensity 6 uses 450 cal', exp === 450);

  const expMulti = estimateTrainingExpenditure([
    { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 45 },
    { activity_type: 'sc', expected_intensity: 7, estimated_duration_min: 60 },
  ]);
  assert('Multiple activities produce positive total', expMulti > 0);
  assert('Multi-activity expenditure exceeds single session', expMulti > exp);

  const expRest = estimateTrainingExpenditure([
    { activity_type: 'rest', expected_intensity: 0, estimated_duration_min: 0 },
  ]);
  assert('Rest day expenditure is 0', expRest === 0);
})();

(() => {
  const lm180 = estimateLeanMassKg(180);
  assertClose('180 lbs maps to about 69.4 kg lean mass', lm180, 69.4, 0.1);

  const lmMin = estimateLeanMassKg(80);
  assert('Lean mass keeps a 40 kg floor', lmMin === 40);
})();

(() => {
  const ea = calculateEnergyAvailability(2500, 500, 60);
  assertClose('EA = (2500-500)/60 = 33.3', ea, 33.3, 0.1);

  const eaZero = calculateEnergyAvailability(2000, 500, 0);
  assert('Zero lean mass returns EA of 0', eaZero === 0);
})();

(() => {
  const result = floor({
    targetCalories: 1800,
    estimatedExpenditure: 500,
    leanMassKg: 60,
    isTrainingDay: true,
  });
  assert('Fueling floor triggers when target < floor', result.fuelingFloorTriggered === true);
  assert('Adjusted calories meet the 25 kcal/kg floor', result.adjustedCalories >= 2000);
  assert('EA is >= 25 after floor applied', result.energyAvailability >= 25);
  assert('Deficit bank delta is positive', result.deficitBankDelta > 0);

  const restResult = floor({
    targetCalories: 1500,
    estimatedExpenditure: 0,
    leanMassKg: 60,
    isTrainingDay: false,
  });
  assert('Non-training day above hard floor does not trigger floor', restResult.fuelingFloorTriggered === false);
  assert('Non-training day above hard floor keeps original calories', restResult.adjustedCalories === 1500);
})();

(() => {
  const result = floor({
    targetCalories: 900,
    estimatedExpenditure: 0,
    leanMassKg: 60,
    isTrainingDay: false,
  });

  assert('Non-training day below hard EA floor raises calories', result.adjustedCalories === 1200);
  assert('Non-training floor protects EA to 20+', result.energyAvailability >= 20);
  assert('Non-training floor reports fueling floor warning', result.safetyWarning === 'fueling_floor_applied');
})();

(() => {
  assert('EA < 20 returns the critical warning', getNutritionSafetyWarning(18, true, 5) === 'critical_energy_availability');
  assert('EA < 25 inside the final week returns low EA warning', getNutritionSafetyWarning(24, true, 5) === 'low_energy_availability');
  assert('EA < 30 outside fight-week still surfaces fueling floor', getNutritionSafetyWarning(28, true, null) === 'fueling_floor_applied');
  assert('EA = 35 on training day returns none', getNutritionSafetyWarning(35, true, null) === 'none');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
