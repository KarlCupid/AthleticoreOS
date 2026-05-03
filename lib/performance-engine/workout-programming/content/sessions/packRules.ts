import type { SessionTemplate } from '../../types.ts';

export type SessionContentPackName = 'strength' | 'hypertrophy' | 'cardio' | 'mobility' | 'recovery' | 'balance' | 'power';

export function sessionContentPackFor(template: SessionTemplate): SessionContentPackName {
  if (template.workoutTypeId === 'hypertrophy') return 'hypertrophy';
  if (template.workoutTypeId === 'zone2_cardio') return 'cardio';
  if (template.workoutTypeId === 'mobility') return 'mobility';
  if (template.workoutTypeId === 'recovery') return 'recovery';
  if (template.workoutTypeId === 'core_durability') return 'balance';
  if (template.workoutTypeId === 'power' || template.workoutTypeId === 'boxing_support') return 'power';
  return 'strength';
}
