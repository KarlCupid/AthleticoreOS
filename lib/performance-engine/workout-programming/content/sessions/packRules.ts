import type { SessionTemplate } from '../../types.ts';

export type SessionContentPackName = 'boxing' | 'strength' | 'hypertrophy' | 'cardio' | 'mobility' | 'recovery' | 'balance' | 'power';

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

export function sessionContentPackFor(template: SessionTemplate): SessionContentPackName {
  if (boxingWorkoutTypes.has(template.workoutTypeId) || template.goalIds.some((goalId) => boxingGoals.has(goalId))) return 'boxing';
  if (template.workoutTypeId === 'hypertrophy') return 'hypertrophy';
  if (template.workoutTypeId === 'zone2_cardio') return 'cardio';
  if (template.workoutTypeId === 'mobility') return 'mobility';
  if (template.workoutTypeId === 'recovery') return 'recovery';
  if (template.workoutTypeId === 'core_durability') return 'balance';
  if (template.workoutTypeId === 'power' || template.workoutTypeId === 'boxing_support') return 'power';
  return 'strength';
}
