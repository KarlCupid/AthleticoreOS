/**
 * Standalone test script for lib/engine/nutrition/redistributeDeficit.ts
 * Run with: npx tsx lib/engine/nutrition/redistributeDeficit.test.ts
 */

import { getRestDayDeficitRedistribution } from './redistributeDeficit.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

console.log('\n── getRestDayDeficitRedistribution ──');

assert('even split across rest days', getRestDayDeficitRedistribution({ deficitBankDelta: 600, remainingRestDays: 3 }) === 200);
assert('caps at 500', getRestDayDeficitRedistribution({ deficitBankDelta: 3000, remainingRestDays: 2 }) === 500);
assert('single rest day within cap', getRestDayDeficitRedistribution({ deficitBankDelta: 300, remainingRestDays: 1 }) === 300);
assert('single rest day large delta capped', getRestDayDeficitRedistribution({ deficitBankDelta: 2000, remainingRestDays: 1 }) === 500);
assert('zero delta returns 0', getRestDayDeficitRedistribution({ deficitBankDelta: 0, remainingRestDays: 5 }) === 0);
assert('negative delta returns 0', getRestDayDeficitRedistribution({ deficitBankDelta: -100, remainingRestDays: 3 }) === 0);
assert('zero rest days returns 0', getRestDayDeficitRedistribution({ deficitBankDelta: 500, remainingRestDays: 0 }) === 0);
assert('result is an integer', Number.isInteger(getRestDayDeficitRedistribution({ deficitBankDelta: 100, remainingRestDays: 3 })));
assert('small delta divides correctly', getRestDayDeficitRedistribution({ deficitBankDelta: 200, remainingRestDays: 4 }) === 50);
assert('result never exceeds cap', getRestDayDeficitRedistribution({ deficitBankDelta: 9999, remainingRestDays: 1 }) <= 500);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
