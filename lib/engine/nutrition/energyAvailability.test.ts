import {
  applyFuelingFloor as floor,
  calculateEnergyAvailability,
  estimateTrainingExpenditure,
  estimateLeanMassKg,
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
    console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} ±${tolerance})`);
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
  assert('Fueling floor protects EA to 30+', result.energyAvailability >= 30);
})();

// --- New tests: training expenditure ---
(() => {
  // boxing_practice multiplier=7.5, 60 min=1h, intensity 6 → factor=max(0.5, 6/6)=1
  // expenditure = 7.5 * 60 * 1 * 1 = 450
  const exp = estimateTrainingExpenditure([
    { activity_type: 'boxing_practice', expected_intensity: 6, estimated_duration_min: 60 },
  ]);
  assert('Boxing practice 60min intensity 6 → 450 cal', exp === 450);

  // Multiple activities sum
  const expMulti = estimateTrainingExpenditure([
    { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 45 },
    { activity_type: 'sc', expected_intensity: 7, estimated_duration_min: 60 },
  ]);
  assert('Multiple activities produce positive total', expMulti > 0);
  assert('Multi-activity expenditure > single session', expMulti > exp);

  // Rest day → 0 expenditure (multiplier=0)
  const expRest = estimateTrainingExpenditure([
    { activity_type: 'rest', expected_intensity: 0, estimated_duration_min: 0 },
  ]);
  assert('Rest day expenditure is 0', expRest === 0);
})();

// --- New tests: lean mass estimation ---
(() => {
  // 180 lbs → 180 * 0.453592 = 81.65 kg, * 0.85 = 69.4 kg
  const lm180 = estimateLeanMassKg(180);
  assertClose('180 lbs → ~69.4 kg lean mass', lm180, 69.4, 0.1);

  // Very light athlete: minimum 40 kg floor
  const lmMin = estimateLeanMassKg(80);
  // 80*0.453592=36.3 kg, *0.85=30.8 → clamped to 40
  assert('Lean mass has minimum floor of 40 kg', lmMin === 40);
})();

// --- New tests: energy availability calculation ---
(() => {
  // EA = (targetCalories - expenditure) / leanMassKg
  // (2500 - 500) / 60 = 33.33
  const ea = calculateEnergyAvailability(2500, 500, 60);
  assertClose('EA = (2500-500)/60 = 33.3', ea, 33.3, 0.1);

  // Zero lean mass returns 0
  const eaZero = calculateEnergyAvailability(2000, 500, 0);
  assert('Zero lean mass returns EA of 0', eaZero === 0);
})();

// --- New tests: fueling floor enforcement ---
(() => {
  // Training day with very low calories should trigger floor
  // leanMassKg=60, expenditure=500
  // trainingFloor = 30*60 + 500 = 2300
  // If target is 1800 < 2300, floor raises to 2300
  const result = floor({
    targetCalories: 1800,
    estimatedExpenditure: 500,
    leanMassKg: 60,
    isTrainingDay: true,
  });
  assert('Fueling floor triggers when target < floor', result.fuelingFloorTriggered === true);
  assert('Adjusted calories ≥ training floor (2300)', result.adjustedCalories >= 2300);
  assert('EA is ≥ 30 after floor applied', result.energyAvailability >= 30);
  assert('Deficit bank delta is positive', result.deficitBankDelta > 0);

  // Non-training day does NOT apply fueling floor
  const restResult = floor({
    targetCalories: 1500,
    estimatedExpenditure: 500,
    leanMassKg: 60,
    isTrainingDay: false,
  });
  assert('Non-training day does not trigger floor', restResult.fuelingFloorTriggered === false);
  assert('Non-training day keeps original calories', restResult.adjustedCalories === 1500);
})();

// --- New tests: safety warnings ---
(() => {
  assert('EA < 20 → critical warning', getNutritionSafetyWarning(18, true, 5) === 'critical_energy_availability');
  assert('EA < 30 on training day → fueling_floor_applied', getNutritionSafetyWarning(28, true, null) === 'fueling_floor_applied');
  assert('EA = 35 on training day → none', getNutritionSafetyWarning(35, true, null) === 'none');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
