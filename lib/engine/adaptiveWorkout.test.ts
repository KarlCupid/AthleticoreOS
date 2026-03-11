/**
 * Standalone test script for lib/engine/adaptiveWorkout.ts
 */

import {
  initFatigueState,
  processSetCompletion,
  findSubstituteExercise,
  getRestDuration,
} from './adaptiveWorkout';
import type { ExerciseLibraryRow, PrescribedExerciseV2 } from './types';

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

function ex(overrides: Partial<ExerciseLibraryRow>): ExerciseLibraryRow {
  return {
    id: 'ex-' + Math.random().toString(36).slice(2, 8),
    name: 'Exercise',
    type: 'heavy_lift',
    cns_load: 8,
    muscle_group: 'back',
    equipment: 'barbell',
    description: '',
    cues: '',
    sport_tags: [],
    ...overrides,
  };
}

console.log('\n-- adaptiveWorkout --');

(() => {
  const state = initFatigueState();
  const lib = [
    ex({ id: 'heavy-1', name: 'Heavy Row', cns_load: 8, muscle_group: 'back', type: 'heavy_lift', equipment: 'barbell' }),
    ex({ id: 'light-1', name: 'Band Row', cns_load: 3, muscle_group: 'back', type: 'active_recovery', equipment: 'band' }),
  ];

  const remaining: PrescribedExerciseV2[] = [
    {
      exercise: lib[0],
      targetSets: 3,
      targetReps: 8,
      targetRPE: 7,
      supersetGroup: null,
      score: 70,
    },
  ];

  const result = processSetCompletion({
    exerciseId: 'heavy-1',
    exerciseName: 'Heavy Row',
    setNumber: 2,
    actualWeight: 185,
    actualReps: 7,
    actualRPE: 9,
    targetWeight: 185,
    targetReps: 8,
    targetRPE: 7,
    currentFatigueState: {
      ...state,
      setsCompleted: 2,
      cumulativeRPEDelta: 2,
      avgRPEDelta: 1,
      consecutiveHighRPESets: 2,
      fatigueScore: 50,
      fatigueLevel: 'high',
    },
    remainingExercises: remaining,
    exerciseLibrary: lib,
    availableEquipment: ['barbell', 'resistance_bands'],
  });

  const hasWeightReduction = result.adjustments.some((a) => a.adjustmentType === 'weight_reduction');
  const hasRepReduction = result.adjustments.some((a) => a.adjustmentType === 'rep_reduction');
  const hasSwap = result.adjustments.some((a) => a.adjustmentType === 'exercise_swap');

  assert('High RPE delta triggers weight reduction', hasWeightReduction);
  assert('High RPE delta triggers rep reduction', hasRepReduction);
  assert('3rd consecutive high-RPE set triggers swap', hasSwap);
})();

(() => {
  const heavy = ex({ id: 'heavy-2', name: 'Heavy Squat', cns_load: 9, muscle_group: 'quads', equipment: 'barbell' });
  const alt = ex({ id: 'alt-2', name: 'Bodyweight Split Squat', cns_load: 4, muscle_group: 'quads', equipment: 'bodyweight', type: 'active_recovery' });
  const picked = findSubstituteExercise(heavy, [heavy, alt], ['barbell']);

  assert('Substitute finder returns lower-CNS option', picked?.id === 'alt-2');
})();

(() => {
  const restNormal = getRestDuration('heavy_lift', 'moderate');
  const restHigh = getRestDuration('heavy_lift', 'high');

  assert('High fatigue increases rest duration', restHigh > restNormal);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
