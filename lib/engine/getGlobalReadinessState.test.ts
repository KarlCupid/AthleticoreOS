/**
 * Standalone test for lib/engine/getGlobalReadinessState.ts
 */

import { getGlobalReadinessState } from './getGlobalReadinessState.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

console.log('\n-- getGlobalReadinessState --');

(() => {
  // === Depleted path (checked first) ===
  assert('Depleted: readiness=1, other values good',
    getGlobalReadinessState({ sleep: 5, readiness: 1, acwr: 0.8 }) === 'Depleted');

  assert('Depleted: acwr=1.5, other values good',
    getGlobalReadinessState({ sleep: 5, readiness: 5, acwr: 1.5 }) === 'Depleted');

  assert('Depleted: acwr=1.6 (above 1.5)',
    getGlobalReadinessState({ sleep: 5, readiness: 5, acwr: 1.6 }) === 'Depleted');

  assert('Depleted: acwr=2.0 extreme',
    getGlobalReadinessState({ sleep: 5, readiness: 5, acwr: 2.0 }) === 'Depleted');

  // === Caution path ===
  assert('Caution: sleep=2',
    getGlobalReadinessState({ sleep: 2, readiness: 4, acwr: 1.0 }) === 'Caution');

  assert('Caution: sleep=1',
    getGlobalReadinessState({ sleep: 1, readiness: 4, acwr: 1.0 }) === 'Caution');

  assert('Caution: readiness=2',
    getGlobalReadinessState({ sleep: 4, readiness: 2, acwr: 1.0 }) === 'Caution');

  assert('Caution: acwr=1.31 (lower ACWR caution bound)',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.31 }) === 'Caution');

  assert('Caution: acwr=1.49 (upper ACWR caution bound)',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.49 }) === 'Caution');

  assert('Caution: acwr=1.40 (mid ACWR caution range)',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.40 }) === 'Caution');

  // === Prime path ===
  assert('Prime: sleep=4, readiness=4, acwr=1.0',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.0 }) === 'Prime');

  assert('Prime: sleep=5, readiness=5, acwr=0.5',
    getGlobalReadinessState({ sleep: 5, readiness: 5, acwr: 0.5 }) === 'Prime');

  assert('Caution: exact boundary acwr=1.3 enters caution band',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.3 }) === 'Caution');

  // === Prime boundary inclusivity ===
  assert('Prime: sleep=3, readiness=3, acwr=1.0',
    getGlobalReadinessState({ sleep: 3, readiness: 3, acwr: 1.0 }) === 'Prime');

  assert('Prime: sleep=3, readiness=4, acwr=1.0',
    getGlobalReadinessState({ sleep: 3, readiness: 4, acwr: 1.0 }) === 'Prime');

  assert('Prime: sleep=4, readiness=3, acwr=1.0',
    getGlobalReadinessState({ sleep: 4, readiness: 3, acwr: 1.0 }) === 'Prime');

  // === Boundary precision ===
  assert('Boundary: acwr=1.30 is Caution',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.30 }) === 'Caution');

  assert('Boundary: acwr=1.50 is Depleted not Caution',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.50 }) === 'Depleted');

  // === weightPenalty ===
  assert('weightPenalty reduces readiness to Depleted',
    getGlobalReadinessState({ sleep: 5, readiness: 3, acwr: 0.8, weightPenalty: 2 }) === 'Depleted');

  assert('weightPenalty floors at 1',
    getGlobalReadinessState({ sleep: 5, readiness: 2, acwr: 0.8, weightPenalty: 5 }) === 'Depleted');

  assert('weightPenalty=0 has no effect (Prime)',
    getGlobalReadinessState({ sleep: 5, readiness: 5, acwr: 0.8, weightPenalty: 0 }) === 'Prime');

  assert('weightPenalty=undefined has no effect (Prime)',
    getGlobalReadinessState({ sleep: 5, readiness: 5, acwr: 0.8 }) === 'Prime');

  assert('weightPenalty=1 reduces readiness 4->3, still Prime',
    getGlobalReadinessState({ sleep: 4, readiness: 4, acwr: 1.0, weightPenalty: 1 }) === 'Prime');

  assert('weightPenalty=1 reduces readiness 5->4, still Prime',
    getGlobalReadinessState({ sleep: 5, readiness: 5, acwr: 1.0, weightPenalty: 1 }) === 'Prime');

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
