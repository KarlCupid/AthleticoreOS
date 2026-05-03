import type { PrescriptionTemplate } from '../../types.ts';
import { hasAny } from '../helpers.ts';

export type PrescriptionContentPackName = 'strength' | 'hypertrophy' | 'cardio' | 'intervals' | 'mobility' | 'flexibility' | 'recovery' | 'balance' | 'power';

const hypertrophyGoals = new Set(['hypertrophy', 'dumbbell_hypertrophy']);
const strengthWorkoutTypes = new Set(['strength', 'bodyweight_strength', 'full_body_strength', 'upper_strength', 'lower_strength', 'core_durability']);

export function prescriptionContentPackFor(template: PrescriptionTemplate): PrescriptionContentPackName {
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
