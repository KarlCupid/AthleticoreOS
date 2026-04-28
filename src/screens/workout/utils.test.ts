import {
  buildTrainTodaySummary,
  buildWorkoutProgressSummary,
} from './utils.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
    return;
  }

  failed += 1;
  console.error(`  FAIL ${label}`);
}

console.log('\n-- train today summary fallbacks --');

const fallbackSummary = buildTrainTodaySummary({
  floorVM: null,
  sessionLabel: null,
  targetIntensity: null,
  durationMin: null,
});

assert('uses default session label', fallbackSummary.sessionLabel === "Today's training");
assert('uses default goal', fallbackSummary.goal === 'Get good work done today.');
assert(
  'uses default reason',
  fallbackSummary.reason === 'Stick with today\'s plan and keep it clean.',
);

console.log('\n-- train today summary effort guidance --');

const cappedSummary = buildTrainTodaySummary({
  floorVM: {
    sessionGoal: 'Build repeatable power',
    reasonSentence: 'You are fresh enough to train hard.',
    activationGuidance: 'Finish the activation block before the main work.',
    estimatedDurationMin: 45,
  },
  sessionLabel: 'Full Body Power',
  targetIntensity: 4,
  durationMin: 50,
});

assert('canonical target intensity drives easy-day title', cappedSummary.effortTitle === 'Keep it easy today');
assert('canonical target intensity detail references cap', cappedSummary.effortDetail.includes('RPE 4/10'));
assert(
  'guardrails include activation guidance',
  cappedSummary.guardrails.includes('Finish the activation block before the main work.'),
);

const noActivationSummary = buildTrainTodaySummary({
  floorVM: {
    sessionGoal: 'Move well today',
    reasonSentence: 'Recovery matters here.',
    activationGuidance: null,
    estimatedDurationMin: 25,
  },
  sessionLabel: 'Recovery Session',
  targetIntensity: 6,
  durationMin: 25,
});

assert('guardrails stay empty when canonical floor has no activation guidance', noActivationSummary.guardrails.length === 0);

console.log('\n-- workout progress summary labels --');

const strongProgress = buildWorkoutProgressSummary({
  trainingLoadData: Array.from({ length: 13 }, (_, index) => ({ x: index, y: 100 + index })),
  acwrData: [{ x: 0, y: 1.08 }],
  sleepData: [{ x: 0, y: 4 }, { x: 1, y: 4.2 }, { x: 2, y: 4.4 }],
  checkinDates: new Set(['2026-03-20', '2026-03-21']),
});

assert('strong consistency headline', strongProgress.cards[0].headline === 'You are building real momentum');
assert('balanced load headline', strongProgress.cards[1].headline === 'Your load looks well balanced');
assert('solid recovery headline', strongProgress.cards[2].headline === 'Recovery looks solid');

const emptyProgress = buildWorkoutProgressSummary({
  trainingLoadData: [],
  acwrData: [],
  sleepData: [],
  checkinDates: new Set(),
});

assert('empty progress reports no primary data', emptyProgress.hasPrimaryData === false);
assert('empty consistency message prompts first workout', emptyProgress.cards[0].headline === 'No training rhythm yet');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
