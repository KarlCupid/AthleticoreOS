import { applyFuelingFloor as floor, calculateEnergyAvailability } from './energyAvailability.ts';

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

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
