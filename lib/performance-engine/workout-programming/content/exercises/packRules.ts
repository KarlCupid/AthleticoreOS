import type { Exercise } from '../../types.ts';
import { hasAny } from '../helpers.ts';

export type ExerciseContentPackName = 'boxing' | 'lowerBody' | 'upperBody' | 'core' | 'cardio' | 'mobility' | 'recovery' | 'power';

const powerWorkoutTypes = new Set(['power', 'boxing_support']);
const boxingWorkoutTypes = new Set(['boxing_progression', 'boxing_support', 'boxing_conditioning_support', 'boxing_durability', 'roadwork_tempo', 'roadwork_intervals']);
const boxingGoals = new Set([
  'boxing_skill_microdose',
  'footwork_agility',
  'shadowboxing_quality',
  'boxing_progression',
  'roadwork_aerobic_base',
  'roadwork_tempo',
  'roadwork_intervals',
  'alactic_repeat_power',
  'glycolytic_round_tolerance',
  'rotational_power',
  'trunk_rotation_durability',
  'shoulder_scap_durability',
  'neck_trap_durability',
  'hip_ankle_mobility',
  'hip_footwork_durability',
  'mobility_prehab',
  'recovery_reset',
]);
const powerPatterns = new Set(['jump_land', 'rotation']);
const cardioWorkoutTypes = new Set(['zone2_cardio', 'conditioning', 'low_impact_conditioning']);
const mobilityCategories = new Set(['mobility', 'flexibility', 'prehab']);
const recoveryWorkoutTypes = new Set(['recovery']);
const corePatterns = new Set(['anti_extension', 'anti_rotation', 'trunk_flexion', 'carry', 'crawl', 'balance']);
const upperPatterns = new Set(['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'shoulder_prehab']);
const lowerPatterns = new Set(['squat', 'hinge', 'lunge']);

export function exerciseContentPackFor(exercise: Exercise): ExerciseContentPackName {
  if (hasAny(exercise.workoutTypeIds, boxingWorkoutTypes) || hasAny(exercise.goalIds, boxingGoals)) {
    return 'boxing';
  }

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
