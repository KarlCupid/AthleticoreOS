/**
 * Standalone test script for lib/engine/presentation/morningFlow.ts
 * Run with: npx tsx lib/engine/presentation/morningFlow.test.ts
 */

import { buildMorningFlowViewModel } from './morningFlow.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function assertClose(label: string, actual: number, expected: number, tolerance = 0.01) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label} (got ${actual}, expected ~${expected})`); }
}

console.log('\n── buildMorningFlowViewModel: step routing ──');

// Nothing done: first step is check-in
const allFalse = buildMorningFlowViewModel({ checkinDone: false, sessionDone: false, nutritionLogged: false });
assert('nothing done: nextStepTarget = checkin', allFalse.nextStepTarget === 'checkin');
assert('nothing done: nextStepLabel includes check-in', allFalse.nextStepLabel.toLowerCase().includes('check'));
assert('nothing done: progressFraction = 0', allFalse.progressFraction === 0);

// Checkin done, session not done: next is training
const checkinDone = buildMorningFlowViewModel({ checkinDone: true, sessionDone: false, nutritionLogged: false });
assert('checkin done: nextStepTarget = training', checkinDone.nextStepTarget === 'training');
assert('checkin done: progressFraction = 1/3', Math.abs(checkinDone.progressFraction - 1/3) < 0.01);

// Checkin + session done: next is nutrition
const sessionDone = buildMorningFlowViewModel({ checkinDone: true, sessionDone: true, nutritionLogged: false });
assert('session done: nextStepTarget = nutrition', sessionDone.nextStepTarget === 'nutrition');
assert('session done: progressFraction = 2/3', Math.abs(sessionDone.progressFraction - 2/3) < 0.01);

// All done: next is still nutrition (last logged item)
const allDone = buildMorningFlowViewModel({ checkinDone: true, sessionDone: true, nutritionLogged: true });
assert('all done: nextStepTarget = nutrition', allDone.nextStepTarget === 'nutrition');
assert('all done: progressFraction = 1.0', allDone.progressFraction === 1.0);

console.log('\n── buildMorningFlowViewModel: state fields ──');

assert('checkinDone reflected', allFalse.checkinDone === false && checkinDone.checkinDone === true);
assert('sessionDone reflected', sessionDone.sessionDone === true);
assert('nutritionLogged reflected', allDone.nutritionLogged === true && allFalse.nutritionLogged === false);

// Edge: nutrition logged but session not done (step priority: session before nutrition)
const nutritionOnly = buildMorningFlowViewModel({ checkinDone: true, sessionDone: false, nutritionLogged: true });
assert('nutrition logged but session not done: next = training', nutritionOnly.nextStepTarget === 'training');
assertClose('nutrition only: progressFraction = 2/3 (checkin + nutrition)', nutritionOnly.progressFraction, 2/3);

// Edge: session done without checkin (unusual but valid)
const sessionNoCheckin = buildMorningFlowViewModel({ checkinDone: false, sessionDone: true, nutritionLogged: false });
assert('session done without checkin: next = checkin (priority)', sessionNoCheckin.nextStepTarget === 'checkin');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
