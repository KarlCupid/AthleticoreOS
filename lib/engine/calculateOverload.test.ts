/**
 * Standalone test script for lib/engine/calculateOverload.ts
 */

import {
  estimateE1RM,
  suggestOverload,
  shouldDeload,
  selectProgressionModel,
} from '.ts';
import type { ExerciseHistoryEntry } from '.ts';

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

function makeHistory(weight: number, reps: number, rpe: number | null, n: number): ExerciseHistoryEntry[] {
  const out: ExerciseHistoryEntry[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      bestSetWeight: weight,
      bestSetReps: reps,
      bestSetRPE: rpe,
      totalVolume: weight * reps * 3,
      workingSets: 3,
      estimated1RM: weight,
    });
  }
  return out;
}

console.log('\n-- calculateOverload --');

(() => {
  const e1rm = estimateE1RM(200, 5, 8);
  assert('E1RM is greater than lifted weight for multi-rep set', e1rm > 200);
})();

(() => {
  const suggestion = suggestOverload({
    exerciseId: 'ex-1',
    exerciseName: 'Bench Press',
    history: makeHistory(185, 5, 7.5, 4),
    fitnessLevel: 'intermediate',
    progressionModel: 'linear',
    isDeloadWeek: false,
    readinessState: 'Prime',
    targetRPE: 8,
    targetReps: 5,
    muscleGroup: 'chest',
  });

  assert('Linear progression increases weight when RPE is on target', suggestion.suggestedWeight > 185);
})();

(() => {
  const suggestion = suggestOverload({
    exerciseId: 'ex-2',
    exerciseName: 'Back Squat',
    history: makeHistory(315, 5, 8.5, 5),
    fitnessLevel: 'advanced',
    progressionModel: 'wave',
    isDeloadWeek: true,
    readinessState: 'Prime',
    targetRPE: 8,
    targetReps: 5,
    muscleGroup: 'quads',
  });

  assert('Deload marks deload set', suggestion.isDeloadSet === true);
  assert('Deload lowers RPE cap', suggestion.suggestedRPE <= 5);
})();

(() => {
  const deload = shouldDeload({
    weeksSinceLastDeload: 3,
    autoDeloadIntervalWeeks: 6,
    acwr: 1.45,
    readinessState: 'Caution',
    recentSessionRPEs: [8, 9, 8, 9],
    consecutiveCautionDays: 2,
  });

  assert('High ACWR triggers deload', deload.shouldDeload === true);
})();

(() => {
  assert('Beginner uses linear progression', selectProgressionModel('beginner', 20) === 'linear');
  assert('Intermediate with history uses wave', selectProgressionModel('intermediate', 20) === 'wave');
  assert('Elite with history uses block', selectProgressionModel('elite', 20) === 'block');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
