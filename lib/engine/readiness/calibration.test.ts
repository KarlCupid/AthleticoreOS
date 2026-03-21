/**
 * Standalone test script for lib/engine/readiness/calibration.ts
 * Run with: npx tsx lib/engine/readiness/calibration.test.ts
 */

import { calibrateBudgetValue } from './calibration.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

console.log('\n── calibrateBudgetValue ──');

// Empty history: no change
assert('empty history returns unchanged', calibrateBudgetValue(60, []) === 60);

// High compliance (avg >= 0.9): +3
const highCompliance = Array(10).fill(0.95);
assert('avg 0.95 → +3', calibrateBudgetValue(60, highCompliance) === 63);

// Exactly 0.9 threshold: +3
assert('avg exactly 0.9 → +3', calibrateBudgetValue(70, Array(5).fill(0.9)) === 73);

// Mid compliance (0.7–0.89): no change
const midCompliance = Array(10).fill(0.80);
assert('avg 0.80 → no change', calibrateBudgetValue(60, midCompliance) === 60);

// Exactly 0.7: not < 0.7, so no change
assert('avg exactly 0.7 → no change', calibrateBudgetValue(70, Array(5).fill(0.7)) === 70);

// Low compliance (avg < 0.7): -3
const lowCompliance = Array(10).fill(0.60);
assert('avg 0.60 → -3', calibrateBudgetValue(60, lowCompliance) === 57);

// Just below 0.7: -3
const nearLow = Array(5).fill(0.69);
assert('avg 0.69 → -3', calibrateBudgetValue(50, nearLow) === 47);

// Works from a different base budget
assert('works from budget=80: high compliance → 83', calibrateBudgetValue(80, highCompliance) === 83);
assert('works from budget=80: low compliance → 77', calibrateBudgetValue(80, lowCompliance) === 77);

// Mixed history averaging to ~0.84 → no change
const mixed = [0.8, 0.9, 0.8, 0.85, 0.8];
assert('avg ~0.83 → no change', calibrateBudgetValue(50, mixed) === 50);

// Single entry at 1.0 → high compliance
assert('single 1.0 entry → +3', calibrateBudgetValue(55, [1.0]) === 58);

// Single entry at 0.0 → low compliance
assert('single 0.0 entry → -3', calibrateBudgetValue(55, [0.0]) === 52);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
