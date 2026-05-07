import type { PrescriptionTemplate } from '../../types.ts';
import { hasAny } from '../helpers.ts';

export type PrescriptionContentPackName = 'boxing' | 'strength' | 'hypertrophy' | 'cardio' | 'intervals' | 'mobility' | 'flexibility' | 'recovery' | 'balance' | 'power';

const hypertrophyGoals = new Set(['hypertrophy', 'dumbbell_hypertrophy']);
const strengthWorkoutTypes = new Set(['strength', 'bodyweight_strength', 'full_body_strength', 'upper_strength', 'lower_strength', 'core_durability']);
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
const boxingWorkoutTypes = new Set(['boxing_progression', 'boxing_support', 'boxing_conditioning_support', 'boxing_durability', 'roadwork_tempo', 'roadwork_intervals']);

export function prescriptionContentPackFor(template: PrescriptionTemplate): PrescriptionContentPackName {
  if (hasAny(template.appliesToGoalIds, boxingGoals) || hasAny(template.appliesToWorkoutTypeIds, boxingWorkoutTypes)) return 'boxing';
  if (template.kind === 'power') return 'power';
  if (template.kind === 'cardio') return 'cardio';
  if (template.kind === 'interval' || template.kind === 'conditioning') return 'intervals';
  if (template.kind === 'mobility') return 'mobility';
  if (template.kind === 'flexibility') return 'flexibility';
  if (template.kind === 'recovery') return 'recovery';
  if (template.kind === 'balance') return 'balance';
  if (hasAny(template.appliesToGoalIds, hypertrophyGoals) || template.label.toLowerCase().includes('hypertrophy') || template.label.toLowerCase().includes('volume')) {
    return 'hypertrophy';
  }
  if (hasAny(template.appliesToWorkoutTypeIds, strengthWorkoutTypes)) return 'strength';
  return 'strength';
}
