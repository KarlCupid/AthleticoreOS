import { generateWeeklyWorkoutProgram } from '../workout-programming/programBuilder.ts';
import { buildBoxingWorkoutPlanViewModel } from './boxingWorkoutPlanViewModel.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
}

console.log('\n-- boxing workout plan presentation view model --');

const sparringProgram = generateWeeklyWorkoutProgram({
  goalId: 'boxing_support',
  durationMinutes: 45,
  equipmentIds: ['bodyweight', 'mat', 'open_space', 'resistance_band', 'stationary_bike'],
  experienceLevel: 'intermediate',
  readinessBand: 'green',
  availableDays: [1, 2, 3, 4, 5],
  boxingTrainingContext: { track: 'amateur_open', allowSameDaySupportSessions: true },
  protectedWorkouts: [
    { id: 'sparring-2', label: 'Hard Sparring', dayIndex: 2, durationMinutes: 75, intensity: 'hard' },
    { id: 'sparring-4', label: 'Hard Sparring', dayIndex: 4, durationMinutes: 75, intensity: 'hard' },
  ],
});

const redProgram = generateWeeklyWorkoutProgram({
  goalId: 'boxing_support',
  durationMinutes: 35,
  equipmentIds: ['bodyweight', 'mat', 'open_space'],
  experienceLevel: 'intermediate',
  readinessBand: 'red',
  boxingTrainingContext: { track: 'pro_development' },
});

const noRunningProgram = generateWeeklyWorkoutProgram({
  goalId: 'boxing_support',
  durationMinutes: 40,
  equipmentIds: ['bodyweight', 'stationary_bike', 'mat', 'open_space'],
  experienceLevel: 'intermediate',
  readinessBand: 'green',
  safetyFlags: ['no_running'],
  boxingTrainingContext: { track: 'amateur_open' },
});

const sparringViewModel = buildBoxingWorkoutPlanViewModel(sparringProgram);
const redViewModel = buildBoxingWorkoutPlanViewModel(redProgram);
const noRunningViewModel = buildBoxingWorkoutPlanViewModel(noRunningProgram);

assert('view model exposes headline and summary', Boolean(sparringViewModel?.headline && sparringViewModel.summary && sparringViewModel.nextBestAction));
assert('view model exposes quality gaps and variance plan', Boolean(sparringViewModel?.qualityGaps.length && sparringViewModel.variancePlan));
assert('why-not explains hard cap after sparring', Boolean(sparringViewModel?.whyNotExplanations.some((line) => /sparring|hard work was capped/i.test(line))));
assert('why-not explains readiness downgrade', Boolean(redViewModel?.whyNotExplanations.some((line) => /readiness downgraded/i.test(line))));
assert('why-not can explain roadwork replacement', Boolean(noRunningViewModel && (noRunningViewModel.whyNotExplanations.length === 0 || noRunningViewModel.whyNotExplanations.some((line) => /roadwork|running|safer option/i.test(line)))));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
if (failed > 0) process.exitCode = 1;
