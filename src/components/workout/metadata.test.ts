/**
 * Standalone test script for src/components/workout/metadata.ts
 * Run with: node --experimental-strip-types src/components/workout/metadata.test.ts
 */

import {
  getExerciseCardDisplayMeta,
  getLoadingStrategyActionHint,
  getLoadingStrategyEducation,
  getLoadingStrategyMeta,
} from './metadata.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
}

console.log('\n-- workout metadata: loading strategy labels --');

const topSetLabel = getLoadingStrategyMeta('top_set_backoff');
assert('top_set_backoff label', topSetLabel?.label === 'Top Set + Backoff');

const straightSetLabel = getLoadingStrategyMeta('straight_sets');
assert('straight_sets label', straightSetLabel?.label === 'Straight Sets');

console.log('\n-- workout metadata: loading strategy education --');

const topSetEducation = getLoadingStrategyEducation({
  strategy: 'top_set_backoff',
  setPrescriptions: [
    { sets: 1, reps: 5, targetRPE: 8 },
    { sets: 3, reps: 7, targetRPE: 7 },
  ],
  currentWeight: 200,
  formatWeight: (value) => String(value),
});
assert(
  'top_set_backoff summary is action-first',
  topSetEducation?.summary === 'Do 1 hard top set first, then lower the weight and finish the backoff sets.',
);
assert(
  'top_set_backoff details include exact top-set and backoff prescriptions',
  topSetEducation?.details?.includes('1 x 5 @ RPE 8') === true
    && topSetEducation?.details?.includes('3 x 7 @ RPE 7') === true,
);
assert(
  'top_set_backoff details include explicit logging steps',
  topSetEducation?.details?.includes('Log that set at the weight you actually used.') === true
    && topSetEducation?.details?.includes('Log each backoff set at the lighter weight you actually used.') === true,
);
assert(
  'top_set_backoff includes explicit logging instruction',
  topSetEducation?.loggingInstruction?.includes('What to log') === true
    && topSetEducation?.loggingInstruction?.includes('real weight, reps, and RPE') === true,
);
assert(
  'top_set_backoff includes personalized backoff example when current weight exists',
  topSetEducation?.example === 'If your top set is 200 lb, your backoff sets should usually be about 180-188 lb.',
);

const topSetEducationWithoutWeight = getLoadingStrategyEducation({
  strategy: 'top_set_backoff',
  setPrescriptions: [
    { sets: 1, reps: 5, targetRPE: 8 },
    { sets: 3, reps: 7, targetRPE: 7 },
  ],
});
assert(
  'top_set_backoff omits personalized example when current weight is unavailable',
  topSetEducationWithoutWeight?.example === null,
);

const straightSetEducation = getLoadingStrategyEducation({ strategy: 'straight_sets' });
assert(
  'straight_sets summary is simplified',
  straightSetEducation?.summary === 'Use the same working setup across sets and let consistency drive the work.',
);
assert(
  'straight_sets details teach repeatable quality',
  straightSetEducation?.details?.includes('repeatable quality') === true,
);

console.log('\n-- workout metadata: exercise card meta --');

const interactiveMeta = getExerciseCardDisplayMeta({
  mode: 'interactive',
  loadingStrategy: 'top_set_backoff',
  loadingNotes: 'Legacy note that should not drive the live teaching copy.',
  setPrescriptions: [
    { sets: 1, reps: 5, targetRPE: 8 },
    { sets: 3, reps: 7, targetRPE: 7 },
  ],
  currentWeight: 200,
  formatWeight: (value) => String(value),
  coachingCues: ['Brace before you descend.', 'Drive through the floor.'],
});
assert('interactive mode exposes one how-it-works label', interactiveMeta.howItWorksLabel === 'How this works');
assert(
  'interactive mode uses loading strategy summary',
  interactiveMeta.howItWorksSummary === 'Do 1 hard top set first, then lower the weight and finish the backoff sets.',
);
assert(
  'interactive mode exposes expanded educational details',
  interactiveMeta.howItWorksDetails?.includes('Build to your top set: 1 x 5 @ RPE 8.') === true,
);
assert(
  'interactive mode exposes logging instruction and personalized example',
  interactiveMeta.howItWorksLoggingInstruction?.includes('What to log') === true
    && interactiveMeta.howItWorksExample === 'If your top set is 200 lb, your backoff sets should usually be about 180-188 lb.',
);
assert('interactive mode keeps only one visible focus cue', interactiveMeta.focusCue === 'Brace before you descend.');

const readonlyMeta = getExerciseCardDisplayMeta({
  mode: 'readonly',
  loadingStrategy: 'straight_sets',
  loadingNotes: 'Leave a little room in the tank.',
  setPrescriptions: null,
  coachingCues: ['Stay stacked.'],
});
assert('readonly mode hides how-it-works label', readonlyMeta.howItWorksLabel === null);
assert('readonly mode hides how-it-works summary', readonlyMeta.howItWorksSummary === null);
assert('readonly mode hides how-it-works logging instruction', readonlyMeta.howItWorksLoggingInstruction === null);
assert('readonly mode still exposes focus cue for caller control', readonlyMeta.focusCue === 'Stay stacked.');

console.log('\n-- workout metadata: action hint --');

const topSetAction = getLoadingStrategyActionHint({
  loadingStrategy: 'top_set_backoff',
  setPrescriptions: [
    { sets: 1, reps: 5, targetRPE: 8 },
    { sets: 3, reps: 7, targetRPE: 7 },
  ],
  workingSetsLogged: 0,
});
assert(
  'top-set action hint tells the athlete to log the top set',
  topSetAction === 'Now: log your top set at the weight you reach for 1 x 5 @ RPE 8.',
);

const backoffAction = getLoadingStrategyActionHint({
  loadingStrategy: 'top_set_backoff',
  setPrescriptions: [
    { sets: 1, reps: 5, targetRPE: 8 },
    { sets: 3, reps: 7, targetRPE: 7 },
  ],
  workingSetsLogged: 1,
});
assert(
  'backoff action hint tells the athlete to lower the load and log backoff sets',
  backoffAction === 'Now: lower the weight 6-10% and log 3 x 7 @ RPE 7.',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
