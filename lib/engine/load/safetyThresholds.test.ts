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
assert('low_chronic: caution = 1.2', low.caution === 1.2);
assert('low_chronic: redline = 1.32', low.redline === 1.32);
assert('low_chronic: source', low.source === 'low_chronic');

const mid = getSafetyThreshold(450);
assert('standard_chronic: caution = 1.3', mid.caution === 1.3);
assert('standard_chronic: redline = 1.42', mid.redline === 1.42);
assert('standard_chronic: source', mid.source === 'standard_chronic');

const high = getSafetyThreshold(700);
assert('high_chronic: caution = 1.5', high.caution === 1.5);
assert('high_chronic: redline = 1.62', high.redline === 1.62);
assert('high_chronic: source', high.source === 'high_chronic');

// Boundary at 300: exactly 300 = standard_chronic
const at300 = getSafetyThreshold(300);
assert('at exactly 300: standard_chronic', at300.source === 'standard_chronic');

// Boundary at 600: exactly 600 = high_chronic
const at600 = getSafetyThreshold(600);
assert('at exactly 600: high_chronic', at600.source === 'high_chronic');

// Just below 300: low_chronic
const at299 = getSafetyThreshold(299);
assert('at 299: low_chronic', at299.source === 'low_chronic');

// Just below 600: standard_chronic
const at599 = getSafetyThreshold(599);
assert('at 599: standard_chronic', at599.source === 'standard_chronic');

// Invariant: redline always > caution across all tiers
assert('redline > caution (low)', low.redline > low.caution);
assert('redline > caution (standard)', mid.redline > mid.caution);
assert('redline > caution (high)', high.redline > high.caution);

// Zero chronic load = low_chronic
const zero = getSafetyThreshold(0);
assert('zero load: low_chronic', zero.source === 'low_chronic');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
