import type {
  BodyWeightState,
  ExerciseLibraryRow,
  WarmupPrescription,
  Phase,
  ReadinessState,
  TrainingSessionRow,
} from './types/foundational.ts';

/**
 * @ANTI-WIRING:
 * Pure logic for generating dynamic warmup protocols.
 * No database or external service calls.
 */

// ─── Warmup Movement Database ─────────────────────────────────

const MOVEMENT_LIB: Record<string, WarmupMove> = {
  // GPP / General
  'jog': { name: 'Light Jog', primary_target: 'full_body', cue: 'Stay light on feet, keep RPE 2-3' },
  'jumping_jacks': { name: 'Jumping Jacks', primary_target: 'full_body', cue: 'Full range of motion in arms' },
  'arm_circles': { name: 'Arm Circles', primary_target: 'shoulders', cue: 'Gradually increase circle size' },
  'leg_swings': { name: 'Leg Swings', primary_target: 'hips', cue: 'Keep torso upright, swing freely' },

  // Mobility
  'worlds_greatest': { name: "World's Greatest Stretch", primary_target: 'full_mobility', cue: 'Rotate deep toward front leg' },
  'cat_cow': { name: 'Cat-Cow', primary_target: 'spine', cue: 'Move with breath' },
  'pigeon': { name: 'Pigeon Pose', primary_target: 'hips', cue: 'Keep hips square' },
  '90_90': { name: '90/90 Hip Switches', primary_target: 'hips', cue: 'Keep heels pinned, rotate through groin' },
  'scap_cars': { name: 'Scapular CARs', primary_target: 'scapula', cue: 'Trace outer box with shoulder blades' },

  // Activation
  'glute_bridge': { name: 'Glute Bridges', primary_target: 'glutes', cue: 'Drive through heels, squeeze at top' },
  'monster_walk': { name: 'Lateral Monster Walk', primary_target: 'hip_abductors', cue: 'Don\'t let knees cave in' },
  'plank': { name: 'Forearm Plank', primary_target: 'core', cue: 'Brace core as if about to be punched' },
  'dead_bug': { name: 'Dead Bug', primary_target: 'core', cue: 'Keep lower back pinned to ground' },

  // Potentiation (Striking)
  'shadow_boxing_flow': { name: 'Shadow Boxing (Flow)', primary_target: 'striking_rhythm', cue: 'Loose limbs, focus on breath' },
  'shoulder_taps': { name: 'Plank Shoulder Taps', primary_target: 'core_shoulder_stability', cue: 'Minimize hip sway' },
  'pogo_jumps': { name: 'Pogo Jumps', primary_target: 'ankles_elasticity', cue: 'Bounce only from ankles' },

  // Potentiation (Grappling)
  'hip_escapes': { name: 'Hip Escapes (Shrimping)', primary_target: 'grappling_movement', cue: 'Explode off the floor' },
  'bridge_and_roll': { name: 'Bridge and Roll', primary_target: 'grappling_movement', cue: 'High bridge, look where you turn' },
  'sprawls': { name: 'Light Sprawls', primary_target: 'defense_mobility', cue: 'Hips to mat, eyes forward' },
};

// ─── Phase Generators ──────────────────────────────────────────

function getGPPPhase(intensity: number): WarmupPhase {
  const moves = intensity > 5 ? ['jog', 'jumping_jacks', 'arm_circles'] : ['arm_circles', 'leg_swings'];
  return {
    name: 'General Warmup (GPP)',
    duration_min: 5,
    description: 'Elevate core temperature and heart rate.',
    movements: moves.map(id => ({ ...MOVEMENT_LIB[id], reps: '2-3 min total' })),
  };
}

function getMobilityPhase(focus: 'striking' | 'grappling' | 's_c' | 'general'): WarmupPhase {
  let moves = ['worlds_greatest', '90_90'];
  if (focus === 'striking') moves.push('scap_cars');
  if (focus === 'grappling') moves.push('cat_cow');
  if (focus === 's_c') moves = ['worlds_greatest', '90_90', 'cat_cow', 'pigeon'];

  return {
    name: 'Dynamic Mobility',
    duration_min: 5,
    description: 'Improve range of motion in session-specific joints.',
    movements: moves.map(id => ({ ...MOVEMENT_LIB[id], reps: '10 per side' })),
  };
}

function getActivationPhase(injuryHistory: string[] = []): WarmupPhase {
  const moves = ['dead_bug', 'glute_bridge'];
  if (injuryHistory.includes('shoulder')) moves.push('scap_cars');
  if (injuryHistory.includes('knee') || injuryHistory.includes('hip')) moves.push('monster_walk');

  return {
    name: 'Specific Activation',
    duration_min: 3,
    description: 'Wake up stabilizing muscles and address weak points.',
    movements: moves.map(id => ({ ...MOVEMENT_LIB[id], reps: '15 reps' })),
  };
}

function getPotentiationPhase(type: 'striking' | 'grappling' | 's_c' | 'general'): WarmupPhase {
  let moves: string[] = [];
  if (type === 'striking') moves = ['shadow_boxing_flow', 'pogo_jumps'];
  if (type === 'grappling') moves = ['hip_escapes', 'bridge_and_roll', 'sprawls'];
  if (type === 's_c') moves = ['pogo_jumps', 'shoulder_taps'];
  if (type === 'general') moves = ['shadow_boxing_flow'];

  return {
    name: 'Neural Potentiation',
    duration_min: 3,
    description: 'Ramp up nervous system for high-intensity output.',
    movements: moves.map(id => ({ ...MOVEMENT_LIB[id], reps: '1-2 rounds light' })),
  };
}

// ─── Main Entry Point ──────────────────────────────────────────

/**
 * Generates a dynamic warmup protocol based on session type, intensity, and athlete state.
 */
export function generateWarmupSets(input: WarmupInput): WarmupResult {
  const { session_type, expected_intensity, readiness_score, injury_history, body_weight_state } = input;

  // 1. Adjust duration based on readiness
  let total_duration = 15;
  if (readiness_score < 40) total_duration += 5; // Extra time for stiff/tired athletes
  if (expected_intensity >= 8) total_duration += 5; // High intensity needs better ramp

  // 2. Map session type to internal focus
  let focus: 'striking' | 'grappling' | 's_c' | 'general' = 'general';
  if (['boxing', 'muay_thai', 'mman_striking'].includes(session_type)) focus = 'striking';
  if (['bjj', 'wrestling', 'mman_grappling'].includes(session_type)) focus = 'grappling';
  if (['strength', 'power', 'conditioning'].includes(session_type)) focus = 's_c';

  // 3. Assemble phases
  const phases: WarmupPhase[] = [
    getGPPPhase(expected_intensity),
    getMobilityPhase(focus),
    getActivationPhase(injury_history),
  ];

  // Potentiation only for higher intensity
  if (expected_intensity >= 6) {
    phases.push(getPotentiationPhase(focus));
  }

  // 4. Weight cut specific adjustment
  let safety_warning: string | undefined;
  if (body_weight_state === 'dehydrated') {
    safety_warning = '⚠️ WEIGHT CUT ALERT: Low intensity only. Focus on breathing and mobility. Do not elevate heart rate significantly via GPP.';
    // Modify GPP phase if dehydrated
    phases[0].movements = [{ ...MOVEMENT_LIB['arm_circles'], reps: '5 min very slow' }];
  }

  return {
    total_duration_min: phases.reduce((acc, p) => acc + p.duration_min, 0),
    focus,
    phases,
    safety_warning,
  };
}
