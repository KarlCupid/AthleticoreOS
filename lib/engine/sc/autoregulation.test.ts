/**
 * Standalone test script for lib/engine/sc/autoregulation.ts
 * Run with: npx tsx lib/engine/sc/autoregulation.test.ts
 */

import { autoregulateSession } from './autoregulation.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function makeSession(exerciseOverrides: any[] = [], sessionOverrides: any = {}) {
  const exercises = exerciseOverrides.length > 0 ? exerciseOverrides : [
    { name: 'Squat', sectionTemplate: 'main', targetSets: 4, targetRPE: 7, suggestedWeight: 100 },
    { name: 'Press', sectionTemplate: 'main', targetSets: 3, targetRPE: 7, suggestedWeight: 60 },
    { name: 'Cool Down', sectionTemplate: 'cooldown', targetSets: 1, targetRPE: 3, suggestedWeight: null },
    { name: 'Activation', sectionTemplate: 'activation', targetSets: 2, targetRPE: 4, suggestedWeight: null },
  ];
  return {
    exercises,
    expectedActivationRPE: 4,
    decisionTrace: [] as string[],
    message: 'Base session.',
    ...sessionOverrides,
  } as any;
}

console.log('\n── No change: deviation < 2 ──');

const exact = autoregulateSession(makeSession(), 4, 4);
assert('deviation 0: no change to sets', exact.exercises[0].targetSets === 4);
assert('deviation 0: decisionTrace unchanged', exact.decisionTrace.length === 0);

const small = autoregulateSession(makeSession(), 5, 4);
assert('deviation +1: no change', small.exercises[0].targetSets === 4);

const smallNeg = autoregulateSession(makeSession(), 3, 4);
assert('deviation -1: no change', smallNeg.exercises[0].targetSets === 4);

console.log('\n── Downshift: activation RPE >= expected + 2 ──');

const down = autoregulateSession(makeSession(), 6, 4);
assert('downshift: main sets reduced by 1', down.exercises[0].targetSets === 3);
assert('downshift: main RPE reduced by 1', down.exercises[0].targetRPE === 6);
assert('downshift: main weight reduced to 90%', down.exercises[0].suggestedWeight === 90);
assert('downshift: cooldown section unchanged', down.exercises[2].targetSets === 1);
assert('downshift: activation section unchanged', down.exercises[3].targetSets === 2);
assert('downshift: decisionTrace has downshift tag', (down.decisionTrace as string[]).includes('autoregulation:downshift'));
assert('downshift: message updated', down.message.includes('downshifted'));
assert('downshift: activation RPE logged in trace', (down.decisionTrace as string[]).some(t => t.startsWith('activation_rpe:')));

console.log('\n── Upshift: activation RPE <= expected - 2 ──');

const up = autoregulateSession(makeSession(), 2, 4);
assert('upshift: main sets unchanged', up.exercises[0].targetSets === 4);
assert('upshift: main RPE unchanged', up.exercises[0].targetRPE === 7);
assert('upshift: main weight unchanged', up.exercises[0].suggestedWeight === 100);
assert('upshift: cooldown unchanged', up.exercises[2].targetSets === 1);
assert('upshift: decisionTrace unchanged', (up.decisionTrace as string[]).length === 0);
assert('upshift: message unchanged', up.message === 'Base session.');

console.log('\n── Edge cases ──');

// Min sets = 1 on downshift
const minSets = autoregulateSession(makeSession([
  { sectionTemplate: 'main', targetSets: 1, targetRPE: 6, suggestedWeight: 80 },
], { decisionTrace: [], message: '' }), 8, 4);
assert('downshift: sets cannot go below 1', minSets.exercises[0].targetSets === 1);

// Max RPE = 10 on upshift
const maxRPE = autoregulateSession(makeSession([
  { sectionTemplate: 'main', targetSets: 3, targetRPE: 10, suggestedWeight: 100 },
], { decisionTrace: [], message: '' }), 2, 4);
assert('easy activation does not raise RPE', maxRPE.exercises[0].targetRPE === 10);

// Min RPE = 4 on downshift
const minRPE = autoregulateSession(makeSession([
  { sectionTemplate: 'main', targetSets: 3, targetRPE: 4, suggestedWeight: 100 },
], { decisionTrace: [], message: '' }), 8, 4);
assert('downshift: RPE floored at 4', minRPE.exercises[0].targetRPE === 4);

// null suggestedWeight passes through unchanged on downshift
const nullWeight = autoregulateSession(makeSession([
  { sectionTemplate: 'main', targetSets: 3, targetRPE: 7, suggestedWeight: null },
], { decisionTrace: [], message: '' }), 6, 4);
assert('downshift: null weight stays null', nullWeight.exercises[0].suggestedWeight === null);

// Uses session.expectedActivationRPE when arg is null
const withSessionRPE = autoregulateSession(
  makeSession([], { expectedActivationRPE: 5, decisionTrace: [], message: '' }),
  7,
  null,
);
assert('uses session expectedActivationRPE when arg null', (withSessionRPE.decisionTrace as string[]).includes('autoregulation:downshift'));

// Uses default of 4 when both are null/undefined
const bothNull = autoregulateSession(
  makeSession([], { expectedActivationRPE: undefined, decisionTrace: [], message: '' }),
  6,
  null,
);
assert('default expected RPE = 4 when both null', (bothNull.decisionTrace as string[]).includes('autoregulation:downshift'));

// Existing decisionTrace entries are preserved
const withTrace = autoregulateSession(
  makeSession([], { decisionTrace: ['existing_entry'], message: '' }),
  6,
  4,
);
assert('existing trace entries preserved', (withTrace.decisionTrace as string[]).includes('existing_entry'));

const severe = autoregulateSession(makeSession(), 7, 4);
assert('severe downshift blocks high-speed/high-impact sections', severe.exercises.every((exercise: any) => exercise.sectionTemplate !== 'power' && exercise.sectionTemplate !== 'finisher'));
assert('severe downshift has severe trace tag', (severe.decisionTrace as string[]).includes('autoregulation:severe_downshift'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
