import { buildSectionedWorkoutSession } from './workoutSessionBuilder.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function makeExercise(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ex-' + Math.random().toString(36).slice(2, 8),
    name: 'Test Exercise',
    type: 'heavy_lift',
    cns_load: 5,
    muscle_group: 'quads',
    equipment: 'barbell',
    description: 'Test exercise',
    cues: 'Move with intent.',
    sport_tags: ['boxing'],
    ...overrides,
  } as any;
}

function makeScoredExercise(overrides: Record<string, unknown> = {}) {
  const exercise = makeExercise(overrides);
  return {
    exercise,
    score: (overrides.score as number | undefined) ?? 80,
    recoveryCost: (overrides.recoveryCost as number | undefined) ?? exercise.cns_load,
  };
}

function makeRisk(level: 'green' | 'yellow' | 'orange' | 'red') {
  return {
    level,
    intensityCap: level === 'red' ? 4 : level === 'orange' ? 6 : level === 'yellow' ? 7 : 9,
    volumeMultiplier: level === 'red' ? 0.65 : level === 'orange' ? 0.82 : level === 'yellow' ? 0.9 : 1,
    cnsMultiplier: level === 'red' ? 0.6 : level === 'orange' ? 0.82 : level === 'yellow' ? 0.9 : 1,
    allowHighImpact: level === 'green' || level === 'yellow',
    reasons: [level],
    constraintSet: {
      blockedStimuli: [],
      allowedStimuli: [],
      strengthBudget: 80,
      explosiveBudget: 80,
      aerobicBudget: 80,
      volumeMultiplier: 1,
      hardCaps: { intensityCap: 8, allowImpact: true, allowHardSparring: true, maxConditioningRounds: null },
    },
  } as any;
}

function buildLowerScoredExercises() {
  return [
    makeScoredExercise({ id: 'act-1', name: 'Hip Airplane', type: 'mobility', cns_load: 1, muscle_group: 'glutes', score: 68, recoveryCost: 1 }),
    makeScoredExercise({ id: 'act-2', name: 'Ankle Rocks', type: 'mobility', cns_load: 1, muscle_group: 'calves', score: 66, recoveryCost: 1 }),
    makeScoredExercise({ id: 'pow-1', name: 'Box Jump', type: 'power', cns_load: 4, muscle_group: 'quads', score: 84, recoveryCost: 4 }),
    makeScoredExercise({ id: 'main-1', name: 'Back Squat', type: 'heavy_lift', cns_load: 8, muscle_group: 'quads', score: 92, recoveryCost: 8 }),
    makeScoredExercise({ id: 'main-2', name: 'Front Squat', type: 'heavy_lift', cns_load: 7, muscle_group: 'quads', score: 88, recoveryCost: 7 }),
    makeScoredExercise({ id: 'sec-1', name: 'RDL', type: 'heavy_lift', cns_load: 7, muscle_group: 'hamstrings', score: 90, recoveryCost: 7 }),
    makeScoredExercise({ id: 'sec-2', name: 'Split Squat', type: 'heavy_lift', cns_load: 5, muscle_group: 'glutes', score: 86, recoveryCost: 5 }),
    makeScoredExercise({ id: 'acc-repeat', name: 'Hip Thrust', type: 'heavy_lift', cns_load: 5, muscle_group: 'glutes', score: 87, recoveryCost: 5 }),
    makeScoredExercise({ id: 'acc-fresh', name: 'Reverse Lunge', type: 'heavy_lift', cns_load: 5, muscle_group: 'glutes', score: 82, recoveryCost: 5 }),
    makeScoredExercise({ id: 'acc-3', name: 'Hamstring Curl', type: 'heavy_lift', cns_load: 4, muscle_group: 'hamstrings', score: 81, recoveryCost: 4 }),
    makeScoredExercise({ id: 'dur-1', name: 'Pallof Press', type: 'mobility', cns_load: 2, muscle_group: 'core', score: 78, recoveryCost: 2 }),
    makeScoredExercise({ id: 'cool-1', name: 'Breathing Reset', type: 'active_recovery', cns_load: 1, muscle_group: 'core', score: 70, recoveryCost: 1 }),
    makeScoredExercise({ id: 'fin-1', name: 'Sled March', type: 'conditioning', cns_load: 4, muscle_group: 'quads', score: 76, recoveryCost: 4 }),
  ];
}

function buildConditioningScoredExercises() {
  return [
    makeScoredExercise({ id: 'cond-act-1', name: 'Breathing Lunge', type: 'mobility', cns_load: 1, muscle_group: 'glutes', score: 70, recoveryCost: 1 }),
    makeScoredExercise({ id: 'cond-act-2', name: 'Band Reach', type: 'active_recovery', cns_load: 1, muscle_group: 'shoulders', score: 68, recoveryCost: 1 }),
    makeScoredExercise({ id: 'cond-main-1', name: 'Air Bike Sprint', type: 'conditioning', cns_load: 6, muscle_group: 'full_body', score: 92, recoveryCost: 6 }),
    makeScoredExercise({ id: 'cond-main-2', name: 'Med Ball Punch Throw', type: 'sport_specific', cns_load: 5, muscle_group: 'core', score: 86, recoveryCost: 5 }),
    makeScoredExercise({ id: 'cond-acc-1', name: 'Walking Lunge', type: 'heavy_lift', cns_load: 4, muscle_group: 'quads', score: 82, recoveryCost: 4 }),
    makeScoredExercise({ id: 'cond-acc-2', name: 'TRX Row', type: 'heavy_lift', cns_load: 4, muscle_group: 'back', score: 80, recoveryCost: 4 }),
    makeScoredExercise({ id: 'cond-cool-1', name: 'Box Breathing', type: 'active_recovery', cns_load: 1, muscle_group: 'core', score: 74, recoveryCost: 1 }),
  ];
}

function buildSportSpecificScoredExercises() {
  return [
    makeScoredExercise({ id: 'sport-act-1', name: 'Footwork Flow', type: 'mobility', cns_load: 1, muscle_group: 'calves', score: 70, recoveryCost: 1 }),
    makeScoredExercise({ id: 'sport-act-2', name: 'Band Shoulder Prep', type: 'active_recovery', cns_load: 1, muscle_group: 'shoulders', score: 69, recoveryCost: 1 }),
    makeScoredExercise({ id: 'sport-pow-1', name: 'Rotational Med Ball Throw', type: 'power', cns_load: 5, muscle_group: 'core', score: 90, recoveryCost: 5 }),
    makeScoredExercise({ id: 'sport-main-1', name: 'Landmine Press', type: 'heavy_lift', cns_load: 6, muscle_group: 'shoulders', score: 91, recoveryCost: 6 }),
    makeScoredExercise({ id: 'sport-sec-1', name: 'Chest-Supported Row', type: 'heavy_lift', cns_load: 5, muscle_group: 'back', score: 88, recoveryCost: 5 }),
    makeScoredExercise({ id: 'sport-acc-1', name: 'Neck Harness Hold', type: 'sport_specific', cns_load: 3, muscle_group: 'neck', score: 83, recoveryCost: 3 }),
    makeScoredExercise({ id: 'sport-acc-2', name: 'Single-Arm Cable Press', type: 'heavy_lift', cns_load: 4, muscle_group: 'shoulders', score: 85, recoveryCost: 4 }),
    makeScoredExercise({ id: 'sport-acc-3', name: 'Banded Grip Pulldown', type: 'sport_specific', cns_load: 3, muscle_group: 'back', score: 86, recoveryCost: 3 }),
    makeScoredExercise({ id: 'sport-dur-1', name: 'Pallof Press', type: 'mobility', cns_load: 2, muscle_group: 'core', score: 80, recoveryCost: 2 }),
    makeScoredExercise({ id: 'sport-fin-1', name: 'Heavy Bag Flurry', type: 'conditioning', cns_load: 4, muscle_group: 'full_body', score: 84, recoveryCost: 4 }),
    makeScoredExercise({ id: 'sport-cool-1', name: 'Supine Breathing Reset', type: 'active_recovery', cns_load: 1, muscle_group: 'core', score: 76, recoveryCost: 1 }),
  ];
}

console.log('\n-- workoutSessionBuilder --');

(() => {
  const scoredExercises = buildLowerScoredExercises();
  const result = buildSectionedWorkoutSession({
    focus: 'lower',
    scoredExercises,
    usableExerciseLibrary: scoredExercises.map((item) => item.exercise),
    readinessState: 'Prime',
    rpeCap: 8,
    performanceRisk: makeRisk('green'),
    performanceGoalType: 'strength',
    blockContext: { weekInBlock: 1, phase: 'accumulate', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'build' },
    availableMinutes: 90,
    fitnessLevel: 'intermediate',
    exerciseHistory: new Map(),
    isDeloadWeek: false,
    targetExerciseCount: 4,
    recoveryBudget: 40,
    trainingDate: '2026-03-11',
  });

  const countedExercises = result.exercises.filter((exercise) => !['activation', 'cooldown'].includes(exercise.sectionTemplate ?? ''));
  const supportExercises = result.exercises.filter((exercise) => ['activation', 'cooldown'].includes(exercise.sectionTemplate ?? ''));
  const countedCNS = countedExercises.reduce((sum, exercise) => sum + exercise.exercise.cns_load, 0);

  assert('Support sections do not count against exercise cap', countedExercises.length <= 4 && result.exercises.length > countedExercises.length);
  assert('Support sections do not count toward used CNS', result.usedCNS === countedCNS);
  assert('Protected floor keeps secondary strength present', result.sections.some((section) => section.template === 'secondary_strength'));
  assert('Power can be skipped when protected floors use the cap', !result.sections.some((section) => section.template === 'power'));
  assert('Support sections are still present', supportExercises.length >= 2);
})();

(() => {
  const scoredExercises = buildLowerScoredExercises();
  const result = buildSectionedWorkoutSession({
    focus: 'lower',
    scoredExercises,
    usableExerciseLibrary: scoredExercises.map((item) => item.exercise),
    readinessState: 'Prime',
    rpeCap: 8,
    performanceRisk: makeRisk('green'),
    performanceGoalType: 'strength',
    blockContext: { weekInBlock: 1, phase: 'accumulate', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'build' },
    availableMinutes: 90,
    fitnessLevel: 'intermediate',
    exerciseHistory: new Map(),
    isDeloadWeek: false,
    targetExerciseCount: 3,
    recoveryBudget: 50,
    trainingDate: '2026-03-11',
  });

  const mainStrength = result.exercises.find((exercise) => exercise.sectionTemplate === 'main_strength');
  assert('Remaining budget scales main strength sets upward', (mainStrength?.targetSets ?? 0) >= 6);
})();

(() => {
  const scoredExercises = buildLowerScoredExercises();
  const result = buildSectionedWorkoutSession({
    focus: 'lower',
    scoredExercises,
    usableExerciseLibrary: scoredExercises.map((item) => item.exercise),
    readinessState: 'Caution',
    rpeCap: 6,
    performanceRisk: makeRisk('orange'),
    performanceGoalType: 'strength',
    blockContext: { weekInBlock: 2, phase: 'intensify', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'orange' },
    availableMinutes: 75,
    fitnessLevel: 'intermediate',
    exerciseHistory: new Map(),
    isDeloadWeek: false,
    targetExerciseCount: 5,
    recoveryBudget: 40,
    trainingDate: '2026-03-12',
  });

  const countedExercises = result.exercises.filter((exercise) => !['activation', 'cooldown'].includes(exercise.sectionTemplate ?? ''));
  assert('Orange session still yields at least four counted exercises', countedExercises.length >= 4);
  assert('Orange session omits power work', !result.sections.some((section) => section.template === 'power'));
})();

(() => {
  const scoredExercises = buildLowerScoredExercises();
  const exerciseHistory = new Map([
    ['acc-repeat', [
      { date: '2026-03-10', bestSetWeight: 225, bestSetReps: 6, bestSetRPE: 8, totalVolume: 2700, workingSets: 3, estimated1RM: 260 },
      { date: '2026-03-06', bestSetWeight: 225, bestSetReps: 6, bestSetRPE: 8, totalVolume: 2700, workingSets: 3, estimated1RM: 260 },
      { date: '2026-03-01', bestSetWeight: 225, bestSetReps: 6, bestSetRPE: 8, totalVolume: 2700, workingSets: 3, estimated1RM: 260 },
    ]],
  ]) as any;

  const result = buildSectionedWorkoutSession({
    focus: 'lower',
    scoredExercises,
    usableExerciseLibrary: scoredExercises.map((item) => item.exercise),
    readinessState: 'Prime',
    rpeCap: 8,
    performanceRisk: makeRisk('green'),
    performanceGoalType: 'strength',
    blockContext: { weekInBlock: 1, phase: 'accumulate', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'rotation' },
    availableMinutes: 75,
    fitnessLevel: 'intermediate',
    exerciseHistory,
    isDeloadWeek: false,
    targetExerciseCount: 5,
    recoveryBudget: 45,
    trainingDate: '2026-03-11',
  });

  const accessoryNames = result.sections
    .filter((section) => section.template === 'accessory')
    .flatMap((section) => section.exercises.map((exercise) => exercise.exercise.name));
  assert('Accessory selection rotates off overused candidate when alternative is viable', !accessoryNames.includes('Hip Thrust'));
})();

(() => {
  const scoredExercises = buildConditioningScoredExercises();
  const result = buildSectionedWorkoutSession({
    focus: 'conditioning',
    scoredExercises,
    usableExerciseLibrary: scoredExercises.map((item) => item.exercise),
    readinessState: 'Prime',
    rpeCap: 8,
    performanceRisk: makeRisk('green'),
    performanceGoalType: 'conditioning',
    blockContext: { weekInBlock: 2, phase: 'accumulate', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'density' },
    availableMinutes: 60,
    fitnessLevel: 'intermediate',
    exerciseHistory: new Map(),
    isDeloadWeek: false,
    targetExerciseCount: 4,
    recoveryBudget: 35,
    trainingDate: '2026-03-13',
  });

  const mainStrength = result.exercises.find((exercise) => exercise.sectionTemplate === 'main_strength');
  const accessory = result.exercises.find((exercise) => exercise.sectionTemplate === 'accessory');
  assert('Conditioning main strength uses EMOM', mainStrength?.loadingStrategy === 'emom');
  assert('Conditioning main strength includes EMOM timedWork', mainStrength?.setPrescription?.[0]?.timedWork?.format === 'emom');
  assert('Conditioning accessory uses AMRAP density block', accessory?.loadingStrategy === 'amrap');
  assert('Conditioning accessory includes AMRAP timedWork', accessory?.setPrescription?.[0]?.timedWork?.format === 'amrap');
})();

(() => {
  const scoredExercises = buildLowerScoredExercises();
  const result = buildSectionedWorkoutSession({
    focus: 'lower',
    scoredExercises,
    usableExerciseLibrary: scoredExercises.map((item) => item.exercise),
    readinessState: 'Prime',
    rpeCap: 8,
    performanceRisk: makeRisk('green'),
    performanceGoalType: 'conditioning',
    blockContext: { weekInBlock: 3, phase: 'realize', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'tabata' },
    availableMinutes: 140,
    fitnessLevel: 'intermediate',
    exerciseHistory: new Map(),
    isDeloadWeek: false,
    targetExerciseCount: 10,
    recoveryBudget: 55,
    trainingDate: '2026-03-14',
  });

  const finisher = result.exercises.find((exercise) => exercise.sectionTemplate === 'finisher');
  assert('Lower finisher can use Tabata', finisher?.loadingStrategy === 'tabata');
  assert('Lower finisher carries Tabata timedWork', finisher?.setPrescription?.[0]?.timedWork?.format === 'tabata');
})();

(() => {
  const scoredExercises = buildSportSpecificScoredExercises();
  const result = buildSectionedWorkoutSession({
    focus: 'sport_specific',
    scoredExercises,
    usableExerciseLibrary: scoredExercises.map((item) => item.exercise),
    readinessState: 'Prime',
    rpeCap: 8,
    performanceRisk: makeRisk('green'),
    performanceGoalType: 'boxing_skill',
    blockContext: { weekInBlock: 2, phase: 'intensify', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'for-time' },
    availableMinutes: 150,
    fitnessLevel: 'advanced',
    exerciseHistory: new Map(),
    isDeloadWeek: false,
    targetExerciseCount: 9,
    recoveryBudget: 50,
    trainingDate: '2026-03-15',
  });

  const mainStrength = result.exercises.find((exercise) => exercise.sectionTemplate === 'main_strength');
  const finisher = result.exercises.find((exercise) => exercise.sectionTemplate === 'finisher');
  assert('Sport-specific main strength uses EMOM', mainStrength?.loadingStrategy === 'emom');
  assert('Sport-specific finisher uses for-time', finisher?.loadingStrategy === 'for_time');
  assert('Sport-specific finisher carries movement list metadata', (finisher?.setPrescription?.[0]?.circuitRound?.movements.length ?? 0) >= 3);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
