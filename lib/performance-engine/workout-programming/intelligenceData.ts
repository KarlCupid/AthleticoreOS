import type {
  CoachingCueSet,
  CommonMistakeSet,
  DescriptionTemplate,
  SubstitutionRule,
  ValidationRule,
  WorkoutIntelligenceCatalog,
  WorkoutRule,
  WorkoutSafetyFlag,
} from './types.ts';

const goalIds = [
  'beginner_strength',
  'hypertrophy',
  'zone2_cardio',
  'mobility',
  'recovery',
  'limited_equipment',
  'no_equipment',
  'full_gym_strength',
  'dumbbell_hypertrophy',
  'low_impact_conditioning',
  'core_durability',
  'upper_body_strength',
  'lower_body_strength',
  'boxing_support',
  'return_to_training',
];

function rule(prefix: string, index: number, action: string): WorkoutRule {
  const goalId = goalIds[index % goalIds.length]!;
  return {
    id: `${prefix}_${index + 1}`,
    label: `${prefix.replace(/_/g, ' ')} ${index + 1}`,
    appliesToGoalIds: [goalId],
    trigger: index % 2 === 0 ? 'successful completion with low pain and target RPE' : 'repeatable completion within prescribed range',
    action,
    explanation: `${action} for ${goalId} only when safety flags and readiness allow it.`,
  };
}

export const progressionRules: WorkoutRule[] = Array.from({ length: 20 }, (_, index) => (
  rule('progression_rule', index, index % 3 === 0 ? 'Add one set or two minutes next time.' : index % 3 === 1 ? 'Add a small load increase.' : 'Repeat with slightly cleaner execution.')
));

export const regressionRules: WorkoutRule[] = Array.from({ length: 20 }, (_, index) => (
  rule('regression_rule', index, index % 3 === 0 ? 'Reduce volume by 25 percent.' : index % 3 === 1 ? 'Use the first safe substitution.' : 'Lower target RPE by one.')
));

export const deloadRules: WorkoutRule[] = Array.from({ length: 10 }, (_, index) => (
  rule('deload_rule', index, index % 2 === 0 ? 'Use recovery or mobility template.' : 'Cut hard sets and interval density in half.')
));

export const safetyFlags: WorkoutSafetyFlag[] = [
  { id: 'red_flag_symptoms', label: 'Red-Flag Symptoms', severity: 'block', summary: 'Symptoms that require stopping hard training.', blocksHardTraining: true, contraindicationTags: ['red_flag_symptoms'] },
  { id: 'acute_chest_pain', label: 'Acute Chest Pain', severity: 'block', summary: 'Chest pain blocks workout generation.', blocksHardTraining: true, contraindicationTags: ['acute_chest_pain'] },
  { id: 'fainting', label: 'Fainting', severity: 'block', summary: 'Fainting blocks workout generation.', blocksHardTraining: true, contraindicationTags: ['fainting'] },
  { id: 'severe_dizziness', label: 'Severe Dizziness', severity: 'block', summary: 'Severe dizziness blocks hard training.', blocksHardTraining: true, contraindicationTags: ['severe_dizziness'] },
  { id: 'acute_neurological_symptoms', label: 'Acute Neurological Symptoms', severity: 'block', summary: 'Neurological symptoms block training.', blocksHardTraining: true, contraindicationTags: ['acute_neurological_symptoms'] },
  { id: 'poor_readiness', label: 'Poor Readiness', severity: 'restriction', summary: 'Poor readiness caps intensity.', blocksHardTraining: true, contraindicationTags: [] },
  { id: 'unknown_readiness', label: 'Unknown Readiness', severity: 'caution', summary: 'Missing readiness is unknown, not safe.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'knee_caution', label: 'Knee Caution', severity: 'restriction', summary: 'Avoid knee-irritating movements and jumps.', blocksHardTraining: false, contraindicationTags: ['knee_caution', 'no_jumping'] },
  { id: 'back_caution', label: 'Back Caution', severity: 'restriction', summary: 'Avoid high spinal load and sloppy hinges.', blocksHardTraining: false, contraindicationTags: ['back_caution'] },
  { id: 'shoulder_caution', label: 'Shoulder Caution', severity: 'restriction', summary: 'Avoid painful pressing and aggressive overhead work.', blocksHardTraining: false, contraindicationTags: ['shoulder_caution'] },
  { id: 'wrist_caution', label: 'Wrist Caution', severity: 'caution', summary: 'Avoid wrist-loaded positions if painful.', blocksHardTraining: false, contraindicationTags: ['wrist_caution'] },
  { id: 'no_jumping', label: 'No Jumping', severity: 'restriction', summary: 'Jump and land patterns are removed.', blocksHardTraining: false, contraindicationTags: ['no_jumping'] },
  { id: 'no_running', label: 'No Running', severity: 'restriction', summary: 'Running patterns are removed.', blocksHardTraining: false, contraindicationTags: ['no_running'] },
  { id: 'low_energy', label: 'Low Energy', severity: 'caution', summary: 'Intensity and volume should be conservative.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'poor_sleep', label: 'Poor Sleep', severity: 'caution', summary: 'Reduce hard work if poor sleep is present.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'high_soreness', label: 'High Soreness', severity: 'restriction', summary: 'Reduce volume and avoid high eccentric load.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'illness_caution', label: 'Illness Caution', severity: 'restriction', summary: 'Use recovery until symptoms improve.', blocksHardTraining: true, contraindicationTags: [] },
  { id: 'under_fueled', label: 'Under-Fueled', severity: 'restriction', summary: 'Avoid hard conditioning and high-volume work.', blocksHardTraining: true, contraindicationTags: [] },
  { id: 'hydration_caution', label: 'Hydration Caution', severity: 'caution', summary: 'Keep intensity modest and monitor symptoms.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'new_athlete', label: 'New Athlete', severity: 'caution', summary: 'Use beginner prescriptions and conservative progression.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'equipment_limited', label: 'Equipment Limited', severity: 'info', summary: 'Select bodyweight or available-equipment substitutions.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'time_limited', label: 'Time Limited', severity: 'info', summary: 'Reduce optional slots before main work.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'pain_increased_last_session', label: 'Pain Increased Last Session', severity: 'restriction', summary: 'Regress or substitute the aggravating pattern.', blocksHardTraining: false, contraindicationTags: [] },
  { id: 'post_competition_recovery', label: 'Post-Competition Recovery', severity: 'restriction', summary: 'Bias recovery and mobility.', blocksHardTraining: true, contraindicationTags: [] },
  { id: 'coach_review_needed', label: 'Coach Review Needed', severity: 'caution', summary: 'Generate conservative output and ask for review.', blocksHardTraining: false, contraindicationTags: [] },
];

export const substitutionRules: SubstitutionRule[] = [
  { id: 'sub_goblet_squat_knee', sourceExerciseId: 'goblet_squat', substituteExerciseIds: ['box_squat', 'glute_bridge'], conditionFlags: ['knee_caution'], rationale: 'Reduces knee range and preserves lower-body intent.' },
  { id: 'sub_push_up_wrist', sourceExerciseId: 'push_up', substituteExerciseIds: ['incline_push_up', 'floor_press'], conditionFlags: ['wrist_caution'], rationale: 'Reduces wrist load or changes hand position.' },
  { id: 'sub_overhead_press_shoulder', sourceExerciseId: 'overhead_press', substituteExerciseIds: ['landmine_press', 'band_external_rotation'], conditionFlags: ['shoulder_caution'], rationale: 'Uses a friendlier shoulder angle.' },
  { id: 'sub_rdl_back', sourceExerciseId: 'romanian_deadlift', substituteExerciseIds: ['glute_bridge', 'hip_hinge_dowel'], conditionFlags: ['back_caution'], rationale: 'Keeps hip-extension work with lower spinal demand.' },
  { id: 'sub_box_jump_no_jump', sourceExerciseId: 'box_jump', substituteExerciseIds: ['step_up', 'sled_push'], conditionFlags: ['no_jumping'], rationale: 'Removes jumping while preserving lower-body drive.' },
  { id: 'sub_pogo_no_jump', sourceExerciseId: 'pogo_hop', substituteExerciseIds: ['ankle_rocker', 'single_leg_balance'], conditionFlags: ['no_jumping'], rationale: 'Keeps ankle/foot work without contacts.' },
  { id: 'sub_jump_rope_no_jump', sourceExerciseId: 'jump_rope_easy', substituteExerciseIds: ['stationary_bike_zone2', 'easy_walk'], conditionFlags: ['no_jumping'], rationale: 'Keeps conditioning without repeated contacts.' },
  { id: 'sub_rower_back', sourceExerciseId: 'rower_zone2', substituteExerciseIds: ['stationary_bike_zone2', 'incline_walk'], conditionFlags: ['back_caution'], rationale: 'Keeps Zone 2 with less hinge repetition.' },
  { id: 'sub_bear_crawl_wrist', sourceExerciseId: 'bear_crawl', substituteExerciseIds: ['dead_bug', 'front_plank'], conditionFlags: ['wrist_caution'], rationale: 'Preserves trunk demand without loaded wrists.' },
  { id: 'sub_side_plank_shoulder', sourceExerciseId: 'side_plank', substituteExerciseIds: ['pallof_press', 'dead_bug'], conditionFlags: ['shoulder_caution'], rationale: 'Keeps anti-rotation with less shoulder compression.' },
  { id: 'sub_medball_throw_shoulder', sourceExerciseId: 'med_ball_rotational_throw', substituteExerciseIds: ['pallof_press', 'cable_woodchop'], conditionFlags: ['shoulder_caution'], rationale: 'Reduces ballistic shoulder demand.' },
  { id: 'sub_sled_knee', sourceExerciseId: 'sled_push', substituteExerciseIds: ['stationary_bike_zone2', 'battle_rope_wave'], conditionFlags: ['knee_caution'], rationale: 'Keeps conditioning with less knee drive.' },
  { id: 'sub_step_up_knee', sourceExerciseId: 'step_up', substituteExerciseIds: ['glute_bridge', 'box_squat'], conditionFlags: ['knee_caution'], rationale: 'Reduces step height and knee stress.' },
  { id: 'sub_landmine_shoulder', sourceExerciseId: 'landmine_press', substituteExerciseIds: ['band_pull_apart', 'band_external_rotation'], conditionFlags: ['shoulder_caution'], rationale: 'Moves to shoulder prep instead of pressing.' },
  { id: 'sub_lat_pulldown_shoulder', sourceExerciseId: 'lat_pulldown', substituteExerciseIds: ['band_row', 'seated_cable_row'], conditionFlags: ['shoulder_caution'], rationale: 'Moves from vertical to horizontal pull.' },
  { id: 'sub_triceps_wrist', sourceExerciseId: 'cable_triceps_pressdown', substituteExerciseIds: ['band_pull_apart', 'wall_slide'], conditionFlags: ['wrist_caution'], rationale: 'Avoids irritated grip/wrist positions.' },
  { id: 'sub_lateral_raise_shoulder', sourceExerciseId: 'dumbbell_lateral_raise', substituteExerciseIds: ['wall_slide', 'band_external_rotation'], conditionFlags: ['shoulder_caution'], rationale: 'Regresses shoulder accessory work.' },
  { id: 'sub_trap_bar_back', sourceExerciseId: 'trap_bar_deadlift', substituteExerciseIds: ['goblet_squat', 'glute_bridge'], conditionFlags: ['back_caution'], rationale: 'Removes heavy axial and hinge demand.' },
  { id: 'sub_worlds_wrist', sourceExerciseId: 'worlds_greatest_stretch', substituteExerciseIds: ['half_kneeling_hip_flexor', 'thoracic_open_book'], conditionFlags: ['wrist_caution'], rationale: 'Keeps mobility without loaded hands.' },
  { id: 'sub_easy_walk_no_running', sourceExerciseId: 'easy_walk', substituteExerciseIds: ['stationary_bike_zone2', 'crocodile_breathing'], conditionFlags: ['no_running'], rationale: 'Uses non-running recovery options.' },
  { id: 'sub_incline_walk_no_running', sourceExerciseId: 'incline_walk', substituteExerciseIds: ['stationary_bike_zone2', 'assault_bike_zone2'], conditionFlags: ['no_running'], rationale: 'Keeps aerobic work off foot-strike patterns.' },
  { id: 'sub_bike_unavailable', sourceExerciseId: 'stationary_bike_zone2', substituteExerciseIds: ['easy_walk', 'crocodile_breathing'], conditionFlags: ['equipment_limited'], rationale: 'Falls back to no-equipment recovery work.' },
  { id: 'sub_dumbbell_press_shoulder', sourceExerciseId: 'dumbbell_bench_press', substituteExerciseIds: ['floor_press', 'incline_push_up'], conditionFlags: ['shoulder_caution'], rationale: 'Reduces shoulder range.' },
  { id: 'sub_split_squat_knee', sourceExerciseId: 'split_squat', substituteExerciseIds: ['box_squat', 'glute_bridge'], conditionFlags: ['knee_caution'], rationale: 'Keeps lower-body work more stable.' },
  { id: 'sub_reverse_lunge_knee', sourceExerciseId: 'reverse_lunge', substituteExerciseIds: ['box_squat', 'step_up'], conditionFlags: ['knee_caution'], rationale: 'Uses more controlled lower-body options.' },
];

const cueExerciseIds = [
  'goblet_squat', 'push_up', 'romanian_deadlift', 'one_arm_dumbbell_row', 'dead_bug',
  'front_plank', 'pallof_press', 'stationary_bike_zone2', 'worlds_greatest_stretch', 'band_pull_apart',
];

export const coachingCueSets: CoachingCueSet[] = Array.from({ length: 30 }, (_, index) => {
  const exerciseId = cueExerciseIds[index % cueExerciseIds.length]!;
  return {
    id: `cue_set_${index + 1}`,
    exerciseId,
    cues: ['Start easier than you think.', 'Stop on sharp pain.', 'Keep reps clean and repeatable.'],
  };
});

export const commonMistakeSets: CommonMistakeSet[] = Array.from({ length: 30 }, (_, index) => {
  const exerciseId = cueExerciseIds[index % cueExerciseIds.length]!;
  return {
    id: `mistake_set_${index + 1}`,
    exerciseId,
    mistakes: ['Chasing fatigue before technique.', 'Ignoring pain signals.', 'Rushing the lowering phase.'],
  };
});

export const descriptionTemplates: DescriptionTemplate[] = Array.from({ length: 20 }, (_, index) => {
  const goalId = goalIds[index % goalIds.length]!;
  return {
    id: `description_template_${index + 1}`,
    appliesToGoalIds: [goalId],
    summaryTemplate: `This session supports ${goalId.replace(/_/g, ' ')} with conservative, trackable work.`,
  };
});

export const validationRules: ValidationRule[] = [
  { id: 'valid_json', label: 'Valid JSON', severity: 'error', explanation: 'Generated workouts must match the generated-workout-v1 shape.' },
  { id: 'exercise_exists', label: 'Exercise Exists', severity: 'error', explanation: 'Every selected exercise must exist in the catalog.' },
  { id: 'complete_prescription', label: 'Complete Prescription', severity: 'error', explanation: 'Every exercise must include sets or time, RPE, and rest.' },
  { id: 'warmup_required', label: 'Warm-Up Required', severity: 'error', explanation: 'Every workout needs a warm-up block.' },
  { id: 'main_required', label: 'Main Block Required', severity: 'error', explanation: 'Every workout needs a main block.' },
  { id: 'cooldown_required', label: 'Cooldown Required', severity: 'error', explanation: 'Every workout needs a cooldown block.' },
  { id: 'equipment_respected', label: 'Equipment Respected', severity: 'error', explanation: 'Selected exercises must match available equipment.' },
  { id: 'duration_fit', label: 'Duration Fit', severity: 'error', explanation: 'Estimated duration must stay within 110 percent of requested time.' },
  { id: 'safety_filter', label: 'Safety Filter', severity: 'error', explanation: 'Contraindicated exercises must not be selected.' },
  { id: 'red_flag_block', label: 'Red-Flag Block', severity: 'error', explanation: 'Red-flag symptoms block hard training.' },
];

export const workoutIntelligenceCatalog: WorkoutIntelligenceCatalog = {
  progressionRules,
  regressionRules,
  deloadRules,
  substitutionRules,
  safetyFlags,
  coachingCueSets,
  commonMistakeSets,
  descriptionTemplates,
  validationRules,
};
