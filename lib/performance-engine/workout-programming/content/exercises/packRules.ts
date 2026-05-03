import type { Exercise } from '../../types.ts';
import { hasAny } from '../helpers.ts';

export type ExerciseContentPackName = 'lowerBody' | 'upperBody' | 'core' | 'cardio' | 'mobility' | 'recovery' | 'power';

const powerWorkoutTypes = new Set(['power', 'boxing_support']);
const powerPatterns = new Set(['jump_land', 'rotation']);
const cardioWorkoutTypes = new Set(['zone2_cardio', 'conditioning', 'low_impact_conditioning']);
const mobilityCategories = new Set(['mobility', 'flexibility', 'prehab']);
const recoveryWorkoutTypes = new Set(['recovery']);
const corePatterns = new Set(['anti_extension', 'anti_rotation', 'trunk_flexion', 'carry', 'crawl', 'balance']);
const upperPatterns = new Set(['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'shoulder_prehab']);
const lowerPatterns = new Set(['squat', 'hinge', 'lunge']);

export function exerciseContentPackFor(exercise: Exercise): ExerciseContentPackName {
  if (exercise.category === 'power' || hasAny(exercise.workoutTypeIds, powerWorkoutTypes) || hasAny(exercise.movementPatternIds, powerPatterns)) {
    return 'power';
  }

  if (exercise.category === 'cardio' || exercise.category === 'conditioning' || hasAny(exercise.workoutTypeIds, cardioWorkoutTypes)) {
    return 'cardio';
  }

  if (exercise.category && mobilityCategories.has(exercise.category)) {
    return 'mobility';
  }

  if (hasAny(exercise.workoutTypeIds, recoveryWorkoutTypes) || exercise.category === 'recovery') {
    return 'recovery';
  }

  if (hasAny(exercise.movementPatternIds, corePatterns)) {
    return 'core';
  }

  if (hasAny(exercise.movementPatternIds, upperPatterns)) {
    return 'upperBody';
  }

  if (hasAny(exercise.movementPatternIds, lowerPatterns)) {
    return 'lowerBody';
  }

  return 'core';
}
