import { generateWorkoutV2 } from './calculateSC.ts';
import { assessPerformanceRisk } from './performancePlanner.ts';
import type { ExerciseHistoryEntry, ExerciseLibraryRow, MuscleGroup } from './types.ts';

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

function makeExercise(overrides: Partial<ExerciseLibraryRow> = {}): ExerciseLibraryRow {
  return {
    id: 'ex-' + Math.random().toString(36).slice(2, 8),
    name: 'Test Exercise',
    type: 'heavy_lift',
    cns_load: 5,
    muscle_group: 'quads',
    equipment: 'barbell',
    description: 'Test exercise',
    cues: 'Own every rep.',
    sport_tags: ['boxing'],
    ...overrides,
  };
}

const EMPTY_VOLUME: Record<MuscleGroup, number> = {
  chest: 0,
  back: 0,
  shoulders: 0,
  quads: 0,
  hamstrings: 0,
  glutes: 0,
  arms: 0,
  core: 0,
  full_body: 0,
  neck: 0,
  calves: 0,
};

const LIBRARY: ExerciseLibraryRow[] = [
  makeExercise({ id: 'act-1', name: 'Hip Airplane', type: 'mobility', cns_load: 1, muscle_group: 'glutes' }),
  makeExercise({ id: 'act-2', name: 'Ankle Rocks', type: 'mobility', cns_load: 1, muscle_group: 'calves' }),
  makeExercise({ id: 'act-3', name: 'Breathing Reset', type: 'active_recovery', cns_load: 1, muscle_group: 'core' }),
  makeExercise({ id: 'pow-1', name: 'Box Jump', type: 'power', cns_load: 4, muscle_group: 'quads', normalized_recovery_cost: 4 }),
  makeExercise({ id: 'main-1', name: 'Back Squat', type: 'heavy_lift', cns_load: 8, muscle_group: 'quads', normalized_recovery_cost: 9 }),
  makeExercise({ id: 'main-2', name: 'Front Squat', type: 'heavy_lift', cns_load: 7, muscle_group: 'quads', normalized_recovery_cost: 8 }),
  makeExercise({ id: 'main-3', name: 'Trap Bar Deadlift', type: 'heavy_lift', cns_load: 8, muscle_group: 'glutes', normalized_recovery_cost: 9 }),
  makeExercise({ id: 'sec-1', name: 'RDL', type: 'heavy_lift', cns_load: 6, muscle_group: 'hamstrings', normalized_recovery_cost: 6 }),
  makeExercise({ id: 'sec-2', name: 'Bulgarian Split Squat', type: 'heavy_lift', cns_load: 4, muscle_group: 'glutes', normalized_recovery_cost: 5 }),
  makeExercise({ id: 'sec-3', name: 'Step-Up', type: 'heavy_lift', cns_load: 3, muscle_group: 'quads', normalized_recovery_cost: 4 }),
  makeExercise({ id: 'acc-1', name: 'Sled March', type: 'conditioning', cns_load: 4, muscle_group: 'quads', normalized_recovery_cost: 4 }),
  makeExercise({ id: 'acc-2', name: 'Rotational Cable Punch', type: 'sport_specific', cns_load: 4, muscle_group: 'core', normalized_recovery_cost: 4 }),
  makeExercise({ id: 'acc-3', name: 'Battle Rope Waves', type: 'conditioning', cns_load: 4, muscle_group: 'shoulders', normalized_recovery_cost: 4 }),
  makeExercise({ id: 'acc-4', name: 'Medicine Ball Scoop Toss', type: 'sport_specific', cns_load: 4, muscle_group: 'core', normalized_recovery_cost: 4 }),
  makeExercise({ id: 'acc-5', name: 'Tempo Bike', type: 'conditioning', cns_load: 4, muscle_group: 'full_body', normalized_recovery_cost: 4 }),
  makeExercise({ id: 'dur-1', name: 'Pallof Press', type: 'mobility', cns_load: 2, muscle_group: 'core', normalized_recovery_cost: 2 }),
  makeExercise({ id: 'dur-2', name: 'Copenhagen Plank', type: 'mobility', cns_load: 2, muscle_group: 'core', normalized_recovery_cost: 2 }),
  makeExercise({ id: 'dur-3', name: 'Neck Harness Hold', type: 'active_recovery', cns_load: 2, muscle_group: 'neck', normalized_recovery_cost: 2 }),
  makeExercise({ id: 'dur-4', name: 'Shoulder CARs', type: 'mobility', cns_load: 1, muscle_group: 'shoulders', normalized_recovery_cost: 1 }),
  makeExercise({ id: 'fin-1', name: 'Assault Bike Sprint', type: 'conditioning', cns_load: 4, muscle_group: 'full_body', normalized_recovery_cost: 4 }),
];

console.log('\n-- workoutRotation --');

(() => {
  const recentExerciseIds: string[] = [];
  const recentMuscleVolume = { ...EMPTY_VOLUME };
  const exerciseHistory = new Map<string, ExerciseHistoryEntry[]>();
  const mainAnchors: string[] = [];
  const nonAnchorUnique = new Set<string>();
  const dates = ['2026-03-03', '2026-03-10', '2026-03-17', '2026-03-24'];

  for (const date of dates) {
    const result = generateWorkoutV2({
      readinessState: 'Prime',
      phase: 'off-season',
      acwr: 1.0,
      exerciseLibrary: LIBRARY,
      exerciseHistory,
      recentExerciseIds,
      recentMuscleVolume,
      fitnessLevel: 'advanced',
      weeklyPlanFocus: 'lower',
      performanceGoalType: 'strength',
      blockContext: { weekInBlock: 1, phase: 'accumulate', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'rotation' },
      availableMinutes: 120,
      trainingDate: date,
    });

    const mainExercise = result.sections.find((section) => section.template === 'main_strength')?.exercises[0];
    if (mainExercise) {
      mainAnchors.push(mainExercise.exercise.name);
    }

    result.sections
      .filter((section) => ['accessory', 'durability', 'power'].includes(section.template))
      .flatMap((section) => section.exercises)
      .forEach((exercise) => nonAnchorUnique.add(exercise.exercise.name));

    for (const exercise of result.exercises.filter((item) => !['activation', 'cooldown'].includes(item.sectionTemplate ?? ''))) {
      recentExerciseIds.unshift(exercise.exercise.id);
      recentMuscleVolume[exercise.exercise.muscle_group] = (recentMuscleVolume[exercise.exercise.muscle_group] ?? 0) + exercise.targetSets;
      const history = exerciseHistory.get(exercise.exercise.id) ?? [];
      history.unshift({
        date,
        bestSetWeight: 0,
        bestSetReps: exercise.targetReps,
        bestSetRPE: exercise.targetRPE,
        totalVolume: exercise.targetSets * exercise.targetReps,
        workingSets: exercise.targetSets,
        estimated1RM: 0,
      });
      exerciseHistory.set(exercise.exercise.id, history);
    }

    recentExerciseIds.splice(20);
    for (const muscle of Object.keys(recentMuscleVolume) as MuscleGroup[]) {
      recentMuscleVolume[muscle] = Math.max(0, recentMuscleVolume[muscle] * 0.8);
    }
  }

  assert('Main lift anchor stays sticky for most of the block', mainAnchors.slice(0, 3).every((name) => name === mainAnchors[0]));
  assert('Non-anchor rotation covers at least 80% of a 5-exercise pool over 4 weeks', nonAnchorUnique.size >= 4);
})();

(() => {
  const orangeRisk = assessPerformanceRisk({
    readinessState: 'Prime',
    acwr: 1.45,
    trainingIntensityCap: 6,
  });

  const result = generateWorkoutV2({
    readinessState: 'Prime',
    phase: 'camp-build',
    acwr: 1.45,
    exerciseLibrary: LIBRARY,
    recentExerciseIds: [],
    recentMuscleVolume: { ...EMPTY_VOLUME },
    fitnessLevel: 'intermediate',
    weeklyPlanFocus: 'lower',
    performanceGoalType: 'strength',
    performanceRisk: orangeRisk,
    blockContext: { weekInBlock: 2, phase: 'intensify', volumeMultiplier: 1, intensityOffset: 0, focusBias: null, note: 'camp' },
    availableMinutes: 75,
    trainingDate: '2026-03-24',
    trainingIntensityCap: 6,
    sparringDaysThisWeek: 2,
  });

  const countedExercises = result.exercises.filter((exercise) => !['activation', 'cooldown'].includes(exercise.sectionTemplate ?? ''));
  const workingSets = countedExercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);

  assert('Orange risk with two sparring days still yields at least four exercises', countedExercises.length >= 4);
  assert('Orange risk with two sparring days still yields at least twelve working sets', workingSets >= 12);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
