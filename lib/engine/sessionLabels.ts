import type { TrainingSessionRole, WorkoutFocus, WorkoutPrescriptionV2, WorkoutType } from './types.ts';

function titleize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getFocusLabel(focus: WorkoutFocus | string | null | undefined): string | null {
  if (!focus) return null;

  switch (focus) {
    case 'upper_push':
      return 'Upper Push';
    case 'upper_pull':
      return 'Upper Pull';
    case 'lower':
      return 'Lower Body';
    case 'full_body':
      return 'Full Body';
    case 'sport_specific':
      return 'Boxing Skill';
    case 'conditioning':
      return 'Conditioning';
    case 'recovery':
      return 'Recovery';
    default:
      return titleize(String(focus));
  }
}

export function getSessionRoleLabel(role: TrainingSessionRole | null | undefined): string {
  switch (role) {
    case 'rest':
      return 'Rest Day';
    case 'develop':
      return 'Development Session';
    case 'express':
      return 'Performance Expression';
    case 'recover':
      return 'Recovery Day';
    case 'spar_support':
      return 'Sparring Support';
    case 'cut_protect':
      return 'Cut Protection';
    case 'taper_sharpen':
      return 'Taper & Sharpen';
    default:
      return 'Training Session';
  }
}

export function getSessionFamilyLabel(input: {
  sessionType?: string | null;
  workoutType?: WorkoutType | null;
  focus?: WorkoutFocus | string | null;
  prescription?: Pick<WorkoutPrescriptionV2, 'sessionFamily' | 'workoutType' | 'focus'> | null;
}): string {
  const sessionType = input.sessionType ?? null;
  const workoutType = input.prescription?.workoutType ?? input.workoutType ?? null;
  const focus = input.prescription?.focus ?? input.focus ?? null;
  const sessionFamily = input.prescription?.sessionFamily ?? null;

  if (sessionFamily === 'sparring' || sessionType === 'sparring') return 'Sparring';
  if (sessionFamily === 'boxing_skill' || sessionType === 'boxing_practice') return 'Boxing Skill';
  if (sessionFamily === 'conditioning' || workoutType === 'conditioning' || sessionType === 'conditioning' || focus === 'conditioning') {
    return 'Conditioning';
  }
  if (sessionFamily === 'durability_core') return 'Durability & Core';
  if (sessionFamily === 'recovery' || workoutType === 'recovery' || sessionType === 'active_recovery' || focus === 'recovery') {
    return 'Recovery';
  }
  if (sessionFamily === 'rest' || sessionType === 'rest') return 'Rest Day';
  if (sessionFamily === 'strength' || workoutType === 'strength' || sessionType === 'sc') {
    const focusLabel = getFocusLabel(focus);
    return focusLabel && focus !== 'conditioning' && focus !== 'recovery' && focus !== 'sport_specific'
      ? `${focusLabel} Strength`
      : 'Strength';
  }
  if (focus === 'sport_specific') return 'Boxing Skill';

  const focusLabel = getFocusLabel(focus);
  if (focusLabel) return focusLabel;
  if (sessionType) return titleize(sessionType);
  return 'Training Session';
}
