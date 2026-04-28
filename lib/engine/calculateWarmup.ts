import type { ExerciseType, FitnessLevel } from './types/foundational.ts';
import type {
  WarmupInput as StrengthWarmupInput,
  WarmupResult as StrengthWarmupResult,
  WarmupSet,
} from './types/training.ts';

type DynamicWarmupFocus = 'striking' | 'grappling' | 's_c' | 'general';

interface DynamicWarmupMove {
  name: string;
  primary_target: string;
  cue: string;
  reps: string;
}

interface WarmupMoveSeed {
  name: string;
  primary_target: string;
  cue: string;
}

interface DynamicWarmupPhase {
  name: string;
  duration_min: number;
  description: string;
  movements: DynamicWarmupMove[];
}

interface DynamicWarmupInput {
  session_type: string;
  expected_intensity: number;
  readiness_score: number;
  injury_history: string[];
  body_weight_state: 'normal' | 'dehydrated';
}

interface DynamicWarmupResult {
  total_duration_min: number;
  focus: DynamicWarmupFocus;
  phases: DynamicWarmupPhase[];
  safety_warning?: string;
}

const MOVEMENT_LIB: Record<string, WarmupMoveSeed> = {
  jog: { name: 'Light Jog', primary_target: 'full_body', cue: 'Stay light on feet, keep RPE 2-3' },
  jumping_jacks: { name: 'Jumping Jacks', primary_target: 'full_body', cue: 'Full range of motion in arms' },
  arm_circles: { name: 'Arm Circles', primary_target: 'shoulders', cue: 'Gradually increase circle size' },
  leg_swings: { name: 'Leg Swings', primary_target: 'hips', cue: 'Keep torso upright, swing freely' },
  worlds_greatest: { name: "World's Greatest Stretch", primary_target: 'full_mobility', cue: 'Rotate deep toward front leg' },
  cat_cow: { name: 'Cat-Cow', primary_target: 'spine', cue: 'Move with breath' },
  pigeon: { name: 'Pigeon Pose', primary_target: 'hips', cue: 'Keep hips square' },
  '90_90': { name: '90/90 Hip Switches', primary_target: 'hips', cue: 'Keep heels pinned, rotate through groin' },
  scap_cars: { name: 'Scapular CARs', primary_target: 'scapula', cue: 'Trace outer box with shoulder blades' },
  glute_bridge: { name: 'Glute Bridges', primary_target: 'glutes', cue: 'Drive through heels, squeeze at top' },
  monster_walk: { name: 'Lateral Monster Walk', primary_target: 'hip_abductors', cue: "Don't let knees cave in" },
  plank: { name: 'Forearm Plank', primary_target: 'core', cue: 'Brace core as if about to be punched' },
  dead_bug: { name: 'Dead Bug', primary_target: 'core', cue: 'Keep lower back pinned to ground' },
  shadow_boxing_flow: { name: 'Shadow Boxing (Flow)', primary_target: 'striking_rhythm', cue: 'Loose limbs, focus on breath' },
  shoulder_taps: { name: 'Plank Shoulder Taps', primary_target: 'core_shoulder_stability', cue: 'Minimize hip sway' },
  pogo_jumps: { name: 'Pogo Jumps', primary_target: 'ankles_elasticity', cue: 'Bounce only from ankles' },
  hip_escapes: { name: 'Hip Escapes (Shrimping)', primary_target: 'grappling_movement', cue: 'Explode off the floor' },
  bridge_and_roll: { name: 'Bridge and Roll', primary_target: 'grappling_movement', cue: 'High bridge, look where you turn' },
  sprawls: { name: 'Light Sprawls', primary_target: 'defense_mobility', cue: 'Hips to mat, eyes forward' },
};

function roundWeight(value: number): number {
  return Math.round(value / 5) * 5;
}

function buildDynamicPhase(name: string, durationMin: number, description: string, ids: string[], reps: string): DynamicWarmupPhase {
  return {
    name,
    duration_min: durationMin,
    description,
    movements: ids.map((id) => ({ ...MOVEMENT_LIB[id], reps })),
  };
}

function getGPPPhase(intensity: number): DynamicWarmupPhase {
  const moves = intensity > 5 ? ['jog', 'jumping_jacks', 'arm_circles'] : ['arm_circles', 'leg_swings'];
  return buildDynamicPhase('General Warmup (GPP)', 5, 'Elevate core temperature and heart rate.', moves, '2-3 min total');
}

function getMobilityPhase(focus: DynamicWarmupFocus): DynamicWarmupPhase {
  let moves = ['worlds_greatest', '90_90'];
  if (focus === 'striking') moves.push('scap_cars');
  if (focus === 'grappling') moves.push('cat_cow');
  if (focus === 's_c') moves = ['worlds_greatest', '90_90', 'cat_cow', 'pigeon'];

  return buildDynamicPhase('Dynamic Mobility', 5, 'Improve range of motion in session-specific joints.', moves, '10 per side');
}

function getActivationPhase(injuryHistory: string[] = []): DynamicWarmupPhase {
  const moves = ['dead_bug', 'glute_bridge'];
  if (injuryHistory.includes('shoulder')) moves.push('scap_cars');
  if (injuryHistory.includes('knee') || injuryHistory.includes('hip')) moves.push('monster_walk');

  return buildDynamicPhase('Specific Activation', 3, 'Wake up stabilizing muscles and address weak points.', moves, '15 reps');
}

function getPotentiationPhase(type: DynamicWarmupFocus): DynamicWarmupPhase {
  let moves: string[] = [];
  if (type === 'striking') moves = ['shadow_boxing_flow', 'pogo_jumps'];
  if (type === 'grappling') moves = ['hip_escapes', 'bridge_and_roll', 'sprawls'];
  if (type === 's_c') moves = ['pogo_jumps', 'shoulder_taps'];
  if (type === 'general') moves = ['shadow_boxing_flow'];

  return buildDynamicPhase('Neural Potentiation', 3, 'Ramp up nervous system for high-intensity output.', moves, '1-2 rounds light');
}

function resolveDynamicFocus(sessionType: string): DynamicWarmupFocus {
  if (['boxing', 'muay_thai', 'mman_striking'].includes(sessionType)) return 'striking';
  if (['bjj', 'wrestling', 'mman_grappling'].includes(sessionType)) return 'grappling';
  if (['strength', 'power', 'conditioning'].includes(sessionType)) return 's_c';
  return 'general';
}

function generateDynamicWarmup(input: DynamicWarmupInput): DynamicWarmupResult {
  const { session_type, expected_intensity, readiness_score, injury_history, body_weight_state } = input;
  const focus = resolveDynamicFocus(session_type);
  const phases: DynamicWarmupPhase[] = [
    getGPPPhase(expected_intensity),
    getMobilityPhase(focus),
    getActivationPhase(injury_history),
  ];

  if (expected_intensity >= 6) {
    phases.push(getPotentiationPhase(focus));
  }

  if (body_weight_state === 'dehydrated') {
    phases[0] = buildDynamicPhase(
      'General Warmup (GPP)',
      5,
      'Elevate core temperature and heart rate.',
      ['arm_circles'],
      '5 min very slow',
    );
  }

  let totalDuration = phases.reduce((sum, phase) => sum + phase.duration_min, 0);
  if (readiness_score < 40) totalDuration += 5;
  if (expected_intensity >= 8) totalDuration += 5;

  return {
    total_duration_min: totalDuration,
    focus,
    phases,
    safety_warning: body_weight_state === 'dehydrated'
      ? 'Body-mass safety alert: low intensity only. Focus on breathing and mobility.'
      : undefined,
  };
}

function shouldSkipStrengthWarmup(exerciseType: ExerciseType): boolean {
  return exerciseType === 'mobility' || exerciseType === 'active_recovery';
}

function buildStrengthWarmupSets(input: StrengthWarmupInput): StrengthWarmupResult {
  const { workingWeight, exerciseType, isFirstExerciseForMuscle, fitnessLevel } = input;

  if (workingWeight <= 0 || shouldSkipStrengthWarmup(exerciseType)) {
    return {
      sets: [],
      totalWarmupSets: 0,
      estimatedTimeMinutes: 0,
    };
  }

  const profiles: Record<FitnessLevel, Array<{ pct: number; reps: number }>> = {
    beginner: [
      { pct: 0.4, reps: 8 },
      { pct: 0.55, reps: 5 },
      { pct: 0.7, reps: 3 },
    ],
    intermediate: [
      { pct: 0.4, reps: 6 },
      { pct: 0.6, reps: 4 },
      { pct: 0.75, reps: 2 },
    ],
    advanced: [
      { pct: 0.35, reps: 5 },
      { pct: 0.55, reps: 4 },
      { pct: 0.72, reps: 2 },
      { pct: 0.82, reps: 1 },
    ],
    elite: [
      { pct: 0.35, reps: 5 },
      { pct: 0.55, reps: 3 },
      { pct: 0.72, reps: 2 },
      { pct: 0.85, reps: 1 },
    ],
  };

  const powerProfiles: Record<FitnessLevel, Array<{ pct: number; reps: number }>> = {
    beginner: [{ pct: 0.35, reps: 5 }, { pct: 0.5, reps: 3 }],
    intermediate: [{ pct: 0.35, reps: 4 }, { pct: 0.55, reps: 3 }],
    advanced: [{ pct: 0.3, reps: 4 }, { pct: 0.5, reps: 3 }, { pct: 0.65, reps: 2 }],
    elite: [{ pct: 0.3, reps: 4 }, { pct: 0.5, reps: 2 }, { pct: 0.65, reps: 2 }],
  };

  let profile = exerciseType === 'power' ? powerProfiles[fitnessLevel] : profiles[fitnessLevel];
  if (!isFirstExerciseForMuscle) {
    profile = profile.slice(1);
  }

  const sets: WarmupSet[] = profile.map((step, index) => ({
    setNumber: index + 1,
    weight: Math.max(5, roundWeight(workingWeight * step.pct)),
    reps: step.reps,
    label: `Warm-up ${index + 1}`,
    isCompleted: false,
  }));

  return {
    sets,
    totalWarmupSets: sets.length,
    estimatedTimeMinutes: Math.max(2, sets.length * 2),
  };
}

function isDynamicWarmupInput(input: StrengthWarmupInput | DynamicWarmupInput): input is DynamicWarmupInput {
  return 'session_type' in input;
}

export function generateWarmupSets(input: DynamicWarmupInput): DynamicWarmupResult;
export function generateWarmupSets(input: StrengthWarmupInput): StrengthWarmupResult;
export function generateWarmupSets(input: StrengthWarmupInput | DynamicWarmupInput): StrengthWarmupResult | DynamicWarmupResult {
  if (isDynamicWarmupInput(input)) {
    return generateDynamicWarmup(input);
  }

  return buildStrengthWarmupSets(input);
}

export type { DynamicWarmupInput, DynamicWarmupPhase, DynamicWarmupResult, DynamicWarmupMove };
