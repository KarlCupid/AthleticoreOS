/**
 * Standalone test script for lib/engine/load/safetyThresholds.ts
 * Run with: npx tsx lib/engine/load/safetyThresholds.test.ts
 */

import { getSafetyThreshold } from './safetyThresholds.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

console.log('\n── getSafetyThreshold ──');

const low = getSafetyThreshold(200);
assert('low_chronic: caution = 1.24', low.caution === 1.24);
assert('low_chronic: redline = 1.4', low.redline === 1.4);
assert('low_chronic: source', low.source === 'low_chronic');

const mid = getSafetyThreshold(450);
assert('standard_chronic: caution = 1.27', mid.caution === 1.27);
assert('standard_chronic: redline = 1.45', mid.redline === 1.45);
assert('standard_chronic: source', mid.source === 'standard_chronic');

const high = getSafetyThreshold(950);
assert('high_chronic: caution = 1.28', high.caution === 1.28);
assert('high_chronic: redline = 1.5', high.redline === 1.5);
assert('high_chronic: source', high.source === 'high_chronic');

// Boundary at 300: exactly 300 = standard_chronic
const at300 = getSafetyThreshold(300);
assert('at exactly 300: standard_chronic', at300.source === 'standard_chronic');

// Boundary at 900: exactly 900 = high_chronic
const at900 = getSafetyThreshold(900);
assert('at exactly 900: high_chronic', at900.source === 'high_chronic');

// Just below 300: low_chronic
const at299 = getSafetyThreshold(299);
assert('at 299: low_chronic', at299.source === 'low_chronic');

// Just below 900: standard_chronic
const at899 = getSafetyThreshold(899);
assert('at 899: standard_chronic', at899.source === 'standard_chronic');

// Invariant: redline always > caution across all tiers
assert('redline > caution (low)', low.redline > low.caution);
assert('redline > caution (standard)', mid.redline > mid.caution);
assert('redline > caution (high)', high.redline > high.caution);

// Zero chronic load = low_chronic
const zero = getSafetyThreshold(0);
assert('zero load: low_chronic', zero.source === 'low_chronic');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
