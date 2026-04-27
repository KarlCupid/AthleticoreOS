import type {
  SCModality,
  SCSessionFamily,
  TrackingWizardKind,
  TrainingSessionFamily,
  TrainingSessionRole,
  WorkoutFocus,
  WorkoutPrescriptionV2,
  WorkoutType,
} from './types.ts';

function titleize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const BROAD_SESSION_FAMILIES = new Set<TrainingSessionFamily>([
  'sparring',
  'boxing_skill',
  'conditioning',
  'strength',
  'durability_core',
  'recovery',
  'rest',
]);

const SC_SESSION_FAMILY_META: Record<SCSessionFamily, { label: string; modality: SCModality }> = {
  max_strength: { label: 'Max Strength', modality: 'strength' },
  hypertrophy: { label: 'Hypertrophy', modality: 'strength' },
  strength_endurance: { label: 'Strength Endurance', modality: 'strength' },
  unilateral_strength: { label: 'Unilateral Strength', modality: 'strength' },
  durability: { label: 'Durability', modality: 'strength' },
  olympic_lift_power: { label: 'Olympic Lift Power', modality: 'power' },
  med_ball_power: { label: 'Med Ball Power', modality: 'power' },
  loaded_jump_power: { label: 'Loaded Jump Power', modality: 'power' },
  contrast_power: { label: 'Contrast Power', modality: 'power' },
  low_contact_plyometrics: { label: 'Low-Contact Plyometrics', modality: 'plyometric' },
  bounding: { label: 'Bounding', modality: 'plyometric' },
  hops: { label: 'Hops', modality: 'plyometric' },
  lateral_plyometrics: { label: 'Lateral Plyometrics', modality: 'plyometric' },
  depth_drop_progression: { label: 'Depth/Drop Progression', modality: 'plyometric' },
  acceleration: { label: 'Acceleration Sprints', modality: 'sprint' },
  max_velocity: { label: 'Max Velocity Sprints', modality: 'sprint' },
  hill_sprints: { label: 'Hill Sprints', modality: 'sprint' },
  resisted_sprints: { label: 'Resisted Sprints', modality: 'sprint' },
  repeated_sprint_ability: { label: 'Repeated Sprint Ability', modality: 'sprint' },
  aerobic_base: { label: 'Aerobic Base', modality: 'conditioning' },
  tempo: { label: 'Tempo', modality: 'conditioning' },
  threshold: { label: 'Threshold', modality: 'conditioning' },
  hiit: { label: 'HIIT', modality: 'conditioning' },
  sit: { label: 'Sprint Interval Training', modality: 'conditioning' },
  mixed_intervals: { label: 'Mixed Intervals', modality: 'conditioning' },
  sport_round_conditioning: { label: 'Sport-Round Conditioning', modality: 'conditioning' },
  strength_endurance_circuit: { label: 'Strength-Endurance Circuit', modality: 'circuit' },
  metabolic_circuit: { label: 'Metabolic Circuit', modality: 'circuit' },
  bodyweight_circuit: { label: 'Bodyweight Circuit', modality: 'circuit' },
  kettlebell_circuit: { label: 'Kettlebell Circuit', modality: 'circuit' },
  sled_rope_circuit: { label: 'Sled/Rope Circuit', modality: 'circuit' },
  combat_specific_circuit: { label: 'Combat-Specific Circuit', modality: 'circuit' },
  planned_cod: { label: 'Planned COD', modality: 'agility' },
  reactive_agility: { label: 'Reactive Agility', modality: 'agility' },
  footwork: { label: 'Footwork', modality: 'agility' },
  deceleration: { label: 'Deceleration', modality: 'agility' },
  mobility_flow: { label: 'Mobility Flow', modality: 'mobility' },
  tissue_capacity: { label: 'Tissue Capacity', modality: 'mobility' },
  breathwork: { label: 'Breathwork', modality: 'recovery' },
  easy_aerobic_flush: { label: 'Easy Aerobic Flush', modality: 'recovery' },
};

type SessionLabelPrescription = Pick<
  WorkoutPrescriptionV2,
  | 'sessionFamily'
  | 'scSessionFamily'
  | 'sessionPrescription'
  | 'workoutType'
  | 'focus'
  | 'modality'
  | 'wizardKind'
  | 'primaryAdaptation'
>;

function isBroadSessionFamily(value: string | null | undefined): value is TrainingSessionFamily {
  return Boolean(value && BROAD_SESSION_FAMILIES.has(value as TrainingSessionFamily));
}

function getSCSessionFamilyMeta(
  family: string | null | undefined,
  modality?: SCModality | string | null,
  wizardKind?: TrackingWizardKind | string | null,
): { label: string; modality: SCModality | string | null } | null {
  if (!family) return null;

  const known = SC_SESSION_FAMILY_META[family as SCSessionFamily];
  if (known) return known;

  const inferredModality = modality ?? (wizardKind === 'sprint' ? 'sprint' : null);
  return {
    label: titleize(family),
    modality: inferredModality,
  };
}

function shouldPreferSpecificSCLabel(
  meta: { label: string; modality: SCModality | string | null } | null,
): meta is { label: string; modality: SCModality | string } {
  if (!meta) return false;
  return meta.modality !== null && meta.modality !== 'strength';
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
  sessionFamily?: TrainingSessionFamily | string | null;
  scSessionFamily?: SCSessionFamily | string | null;
  modality?: SCModality | string | null;
  wizardKind?: TrackingWizardKind | string | null;
  prescription?: SessionLabelPrescription | null;
}): string {
  const sessionType = input.sessionType ?? null;
  const workoutType = input.prescription?.workoutType ?? input.workoutType ?? null;
  const focus = input.prescription?.focus ?? input.focus ?? null;
  const rawSessionFamily = input.prescription?.sessionFamily ?? input.sessionFamily ?? null;
  const sessionFamily = isBroadSessionFamily(rawSessionFamily) ? rawSessionFamily : null;
  const scSessionFamily = input.prescription?.scSessionFamily
    ?? input.prescription?.sessionPrescription?.sessionFamily
    ?? input.scSessionFamily
    ?? (isBroadSessionFamily(rawSessionFamily) ? null : rawSessionFamily)
    ?? null;
  const scMeta = getSCSessionFamilyMeta(
    scSessionFamily,
    input.prescription?.modality ?? input.prescription?.sessionPrescription?.modality ?? input.modality ?? null,
    input.prescription?.wizardKind ?? input.prescription?.sessionPrescription?.wizardKind ?? input.wizardKind ?? null,
  );

  if (shouldPreferSpecificSCLabel(scMeta)) {
    return scMeta.label;
  }

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
  if (scMeta) return scMeta.label;
  if (sessionType) return titleize(sessionType);
  return 'Training Session';
}
