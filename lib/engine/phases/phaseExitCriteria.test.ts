/**
 * Standalone test script for lib/engine/phases/phaseExitCriteria.ts
 * Run with: npx tsx lib/engine/phases/phaseExitCriteria.test.ts
 */

import { getPhaseExtensionDays, PHASE_EXIT_CRITERIA } from './phaseExitCriteria.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

console.log('\n── PHASE_EXIT_CRITERIA constants ──');
assert('base: minACWR = 0.8', PHASE_EXIT_CRITERIA.base.minACWR === 0.8);
assert('base: maxACWR = 1.2', PHASE_EXIT_CRITERIA.base.maxACWR === 1.2);
assert('base: minReadiness = Caution', PHASE_EXIT_CRITERIA.base.minReadiness === 'Caution');
assert('build: maxACWR = 1.3 (more tolerant)', PHASE_EXIT_CRITERIA.build.maxACWR === 1.3);
assert('peak: maxACWR = 1.1 (tightest)', PHASE_EXIT_CRITERIA.peak.maxACWR === 1.1);
assert('peak: minReadiness = Prime (strictest)', PHASE_EXIT_CRITERIA.peak.minReadiness === 'Prime');

console.log('\n── getPhaseExtensionDays ──');

// Perfect conditions → 0 extension
assert('base + Prime + ACWR 1.0 → 0 days', getPhaseExtensionDays({ phase: 'base', acwr: 1.0, readinessState: 'Prime' }) === 0);
assert('build + Caution + ACWR 1.1 → 0 days', getPhaseExtensionDays({ phase: 'build', acwr: 1.1, readinessState: 'Caution' }) === 0);
assert('peak + Prime + ACWR 1.0 → 0 days', getPhaseExtensionDays({ phase: 'peak', acwr: 1.0, readinessState: 'Prime' }) === 0);

// ACWR too high (1 miss)
assert('base + Prime + ACWR 1.5 → 1 day', getPhaseExtensionDays({ phase: 'base', acwr: 1.5, readinessState: 'Prime' }) === 1);

// ACWR too low (1 miss)
assert('base + Prime + ACWR 0.5 → 1 day', getPhaseExtensionDays({ phase: 'base', acwr: 0.5, readinessState: 'Prime' }) === 1);

// Readiness miss only (1 miss)
assert('base + Depleted + ACWR 1.0 → 1 day', getPhaseExtensionDays({ phase: 'base', acwr: 1.0, readinessState: 'Depleted' }) === 1);

// Both ACWR and readiness miss (2 days)
assert('base + Depleted + ACWR 1.5 → 2 days', getPhaseExtensionDays({ phase: 'base', acwr: 1.5, readinessState: 'Depleted' }) === 2);

// Peak: Caution is a readiness miss (peak requires Prime)
assert('peak + Caution + ACWR 0.9 → 1 day', getPhaseExtensionDays({ phase: 'peak', acwr: 0.9, readinessState: 'Caution' }) === 1);

// Peak: Depleted + high ACWR = 2 days
assert('peak + Depleted + ACWR 1.5 → 2 days', getPhaseExtensionDays({ phase: 'peak', acwr: 1.5, readinessState: 'Depleted' }) === 2);

// Build: Caution meets minimum for build
assert('build + Caution + in-range ACWR → 0 days', getPhaseExtensionDays({ phase: 'build', acwr: 1.0, readinessState: 'Caution' }) === 0);

// Result is always 0–3
const allResults = [
  getPhaseExtensionDays({ phase: 'base', acwr: 1.0, readinessState: 'Prime' }),
  getPhaseExtensionDays({ phase: 'base', acwr: 1.5, readinessState: 'Depleted' }),
  getPhaseExtensionDays({ phase: 'peak', acwr: 0.5, readinessState: 'Depleted' }),
];
assert('result always 0-3', allResults.every(r => r >= 0 && r <= 3));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
