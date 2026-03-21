/**
 * Standalone test script for lib/engine/phases/buildPhaseWaves.ts
 * Run with: npx tsx lib/engine/phases/buildPhaseWaves.test.ts
 */

import { getBuildPhaseWave } from './buildPhaseWaves.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

console.log('\n── getBuildPhaseWave ──');

// Week 1: Accumulate
const w1 = getBuildPhaseWave(1);
assert('week 1: phase = accumulate', w1.phase === 'accumulate');
assert('week 1: volumeMultiplier = 1.0', w1.volumeMultiplier === 1.0);
assert('week 1: intensityOffset = 0', w1.intensityOffset === 0);
assert('week 1: focusBias = full_body', w1.focusBias === 'full_body');
assert('week 1: weekInBlock = 1', w1.weekInBlock === 1);

// Week 2: Intensify
const w2 = getBuildPhaseWave(2);
assert('week 2: phase = intensify', w2.phase === 'intensify');
assert('week 2: volumeMultiplier = 1.05', w2.volumeMultiplier === 1.05);
assert('week 2: intensityOffset = 1', w2.intensityOffset === 1);
assert('week 2: focusBias = full_body', w2.focusBias === 'full_body');
assert('week 2: weekInBlock = 2', w2.weekInBlock === 2);

// Week 3: Realize
const w3 = getBuildPhaseWave(3);
assert('week 3: phase = realize', w3.phase === 'realize');
assert('week 3: volumeMultiplier = 0.92', w3.volumeMultiplier === 0.92);
assert('week 3: intensityOffset = 2', w3.intensityOffset === 2);
assert('week 3: focusBias = sport_specific', w3.focusBias === 'sport_specific');
assert('week 3: weekInBlock = 3', w3.weekInBlock === 3);
assert('week 3: note mentions sharpen', w3.note.toLowerCase().includes('sharpen'));

// Week 4: Deload (pivot)
const w4 = getBuildPhaseWave(4);
assert('week 4: phase = pivot', w4.phase === 'pivot');
assert('week 4: volumeMultiplier = 0.72', w4.volumeMultiplier === 0.72);
assert('week 4: intensityOffset = -1', w4.intensityOffset === -1);
assert('week 4: focusBias = recovery', w4.focusBias === 'recovery');
assert('week 4: weekInBlock = 4', w4.weekInBlock === 4);
assert('week 4: note mentions deload', w4.note.toLowerCase().includes('deload'));

// Cycle wraps: week 5 → same as week 1
const w5 = getBuildPhaseWave(5);
assert('week 5 wraps to accumulate', w5.phase === 'accumulate');
assert('week 5: volumeMultiplier matches week 1', w5.volumeMultiplier === w1.volumeMultiplier);

// Week 8 → same as week 4 (deload)
const w8 = getBuildPhaseWave(8);
assert('week 8 wraps to pivot/deload', w8.phase === 'pivot');

// Week 9 → same as week 1
const w9 = getBuildPhaseWave(9);
assert('week 9 wraps to accumulate', w9.phase === 'accumulate');

// Every wave has a note
assert('all waves have non-empty note', [w1, w2, w3, w4].every(w => w.note.length > 0));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
