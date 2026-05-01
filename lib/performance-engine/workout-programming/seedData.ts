import type {
  EquipmentType,
  Exercise,
  MovementPlane,
  MuscleGroup,
  PrescriptionTemplate,
  SessionTemplate,
  WorkoutProgrammingCatalog,
  WorkoutTaxonomyItem,
} from './types.ts';

export const workoutTypes: WorkoutTaxonomyItem[] = [
  { id: 'strength', label: 'Strength', summary: 'Force production with controlled rest and technically crisp sets.' },
  { id: 'hypertrophy', label: 'Hypertrophy', summary: 'Muscle-building volume with moderate load and repeatable effort.' },
  { id: 'zone2_cardio', label: 'Zone 2 Cardio', summary: 'Easy aerobic work that supports recovery and repeatability.' },
  { id: 'mobility', label: 'Mobility', summary: 'Controlled range-of-motion work without chasing fatigue.' },
  { id: 'recovery', label: 'Recovery', summary: 'Low-stress work that downshifts the system and tracks symptoms.' },
  { id: 'conditioning', label: 'Conditioning', summary: 'Structured intervals or circuits with explicit density.' },
  { id: 'power', label: 'Power', summary: 'Explosive low-volume work that prioritizes speed and quality.' },
  { id: 'core_durability', label: 'Core Durability', summary: 'Trunk control, bracing, anti-rotation, and carry capacity.' },
  { id: 'upper_strength', label: 'Upper Strength', summary: 'Upper-body push and pull strength work.' },
  { id: 'lower_strength', label: 'Lower Strength', summary: 'Lower-body squat, hinge, and unilateral strength work.' },
  { id: 'full_body_strength', label: 'Full-Body Strength', summary: 'Balanced strength exposure for the whole body.' },
  { id: 'low_impact_conditioning', label: 'Low-Impact Conditioning', summary: 'Conditioning that avoids jumping and hard landings.' },
  { id: 'bodyweight_strength', label: 'Bodyweight Strength', summary: 'Strength work using body mass and simple supports.' },
  { id: 'boxing_support', label: 'Boxing Support', summary: 'S&C support for punch mechanics, footwork, and trunk resilience.' },
  { id: 'assessment', label: 'Assessment', summary: 'Repeatable measures of strength, conditioning, mobility, and symptoms.' },
];

export const trainingGoals: WorkoutTaxonomyItem[] = [
  { id: 'beginner_strength', label: 'Beginner Strength', summary: 'Build basic full-body strength safely.' },
  { id: 'hypertrophy', label: 'Hypertrophy', summary: 'Accumulate muscle-building volume.' },
  { id: 'zone2_cardio', label: 'Zone 2 Cardio', summary: 'Improve aerobic base at conversational effort.' },
  { id: 'mobility', label: 'Mobility', summary: 'Improve usable range and movement comfort.' },
  { id: 'recovery', label: 'Recovery', summary: 'Restore readiness with low stress.' },
  { id: 'limited_equipment', label: 'Limited Equipment', summary: 'Train effectively with a small equipment footprint.' },
  { id: 'no_equipment', label: 'No Equipment', summary: 'Generate a safe bodyweight-only session.' },
  { id: 'full_gym_strength', label: 'Full-Gym Strength', summary: 'Use gym equipment for balanced strength.' },
  { id: 'dumbbell_hypertrophy', label: 'Dumbbell Hypertrophy', summary: 'Build muscle with dumbbells and benches.' },
  { id: 'low_impact_conditioning', label: 'Low-Impact Conditioning', summary: 'Condition without running or jumping.' },
  { id: 'core_durability', label: 'Core Durability', summary: 'Improve trunk control and fatigue resistance.' },
  { id: 'upper_body_strength', label: 'Upper Body Strength', summary: 'Bias presses, rows, and shoulder stability.' },
  { id: 'lower_body_strength', label: 'Lower Body Strength', summary: 'Bias squat, hinge, and single-leg patterns.' },
  { id: 'boxing_support', label: 'Boxing Support', summary: 'Support boxing with trunk, shoulder, and conditioning work.' },
  { id: 'return_to_training', label: 'Return to Training', summary: 'Re-enter training with conservative stress.' },
];

export const workoutFormats: WorkoutTaxonomyItem[] = [
  { id: 'straight_sets', label: 'Straight Sets', summary: 'Complete all sets before moving to the next movement.' },
  { id: 'superset', label: 'Superset', summary: 'Pair compatible movements to save time.' },
  { id: 'circuit', label: 'Circuit', summary: 'Rotate through movements for multiple rounds.' },
  { id: 'emom', label: 'EMOM', summary: 'Start prescribed work every minute on the minute.' },
  { id: 'amrap', label: 'AMRAP', summary: 'Complete repeatable quality work inside a time box.' },
  { id: 'intervals', label: 'Intervals', summary: 'Alternate work and recovery intervals.' },
  { id: 'steady_state', label: 'Steady State', summary: 'Sustain a stable aerobic effort.' },
  { id: 'mobility_flow', label: 'Mobility Flow', summary: 'Move continuously through controlled positions.' },
  { id: 'recovery_flow', label: 'Recovery Flow', summary: 'Low-stress sequence for breathing, mobility, and easy movement.' },
  { id: 'density_block', label: 'Density Block', summary: 'Accumulate quality work inside a fixed block.' },
  { id: 'ramp_sets', label: 'Ramp Sets', summary: 'Build gradually toward working sets.' },
  { id: 'time_cap', label: 'Time Cap', summary: 'Stop at the cap even if all work is not complete.' },
  { id: 'skill_practice', label: 'Skill Practice', summary: 'Quality-first reps with generous rest.' },
  { id: 'tempo_sets', label: 'Tempo Sets', summary: 'Use tempo to control joint stress and execution quality.' },
  { id: 'checklist', label: 'Checklist', summary: 'Complete a short list of recovery or assessment tasks.' },
];

export const movementPatterns: WorkoutTaxonomyItem[] = [
  { id: 'squat', label: 'Squat', summary: 'Knee-dominant lower-body pattern.' },
  { id: 'hinge', label: 'Hinge', summary: 'Hip-dominant posterior-chain pattern.' },
  { id: 'lunge', label: 'Lunge', summary: 'Split-stance and single-leg knee-dominant work.' },
  { id: 'horizontal_push', label: 'Horizontal Push', summary: 'Pressing away from the torso.' },
  { id: 'vertical_push', label: 'Vertical Push', summary: 'Pressing overhead.' },
  { id: 'horizontal_pull', label: 'Horizontal Pull', summary: 'Rowing toward the torso.' },
  { id: 'vertical_pull', label: 'Vertical Pull', summary: 'Pulling down or up vertically.' },
  { id: 'carry', label: 'Carry', summary: 'Loaded locomotion and trunk bracing.' },
  { id: 'anti_extension', label: 'Anti-Extension', summary: 'Resist spinal extension.' },
  { id: 'anti_rotation', label: 'Anti-Rotation', summary: 'Resist rotation under load.' },
  { id: 'rotation', label: 'Rotation', summary: 'Controlled trunk and hip rotation.' },
  { id: 'locomotion', label: 'Locomotion', summary: 'Walking, running, cycling, rowing, or similar cyclic work.' },
  { id: 'jump_land', label: 'Jump/Land', summary: 'Jumping and landing mechanics.' },
  { id: 'crawl', label: 'Crawl', summary: 'Quadruped locomotion and coordination.' },
  { id: 'shoulder_prehab', label: 'Shoulder Prehab', summary: 'Scapular and rotator cuff support.' },
  { id: 'hip_mobility', label: 'Hip Mobility', summary: 'Hip range and control.' },
  { id: 'thoracic_mobility', label: 'Thoracic Mobility', summary: 'Upper-back rotation and extension.' },
  { id: 'ankle_mobility', label: 'Ankle Mobility', summary: 'Ankle range and calf capacity.' },
  { id: 'breathing', label: 'Breathing', summary: 'Down-regulation and breath mechanics.' },
  { id: 'balance', label: 'Balance', summary: 'Static or dynamic balance control.' },
];

export const muscleGroups: MuscleGroup[] = [
  { id: 'quads', label: 'Quads', region: 'lower', summary: 'Knee-extension dominant thigh musculature.' },
  { id: 'hamstrings', label: 'Hamstrings', region: 'lower', summary: 'Posterior thigh hip-extension and knee-flexion musculature.' },
  { id: 'glutes', label: 'Glutes', region: 'lower', summary: 'Hip-extension and pelvic-control musculature.' },
  { id: 'calves', label: 'Calves', region: 'lower', summary: 'Ankle plantar flexors and lower-leg stiffness support.' },
  { id: 'adductors', label: 'Adductors', region: 'lower', summary: 'Inner-thigh muscles for stance and lateral control.' },
  { id: 'hip_flexors', label: 'Hip Flexors', region: 'lower', summary: 'Hip flexion and pelvis-positioning muscles.' },
  { id: 'chest', label: 'Chest', region: 'upper', summary: 'Horizontal pressing muscles.' },
  { id: 'lats', label: 'Lats', region: 'upper', summary: 'Primary vertical pulling and shoulder-extension muscles.' },
  { id: 'upper_back', label: 'Upper Back', region: 'upper', summary: 'Scapular retraction, posture, and pulling support.' },
  { id: 'shoulders', label: 'Shoulders', region: 'upper', summary: 'Deltoids and shoulder-control muscles.' },
  { id: 'rear_delts', label: 'Rear Delts', region: 'upper', summary: 'Posterior shoulder and scapular control.' },
  { id: 'biceps', label: 'Biceps', region: 'upper', summary: 'Elbow flexion and pulling support.' },
  { id: 'triceps', label: 'Triceps', region: 'upper', summary: 'Elbow extension and pressing support.' },
  { id: 'forearms', label: 'Forearms', region: 'upper', summary: 'Grip and wrist-control muscles.' },
  { id: 'neck', label: 'Neck', region: 'upper', summary: 'Neck strength and support.' },
  { id: 'rectus_abs', label: 'Rectus Abs', region: 'core', summary: 'Anterior trunk bracing musculature.' },
  { id: 'obliques', label: 'Obliques', region: 'core', summary: 'Lateral and rotational trunk control.' },
  { id: 'transverse_abs', label: 'Transverse Abs', region: 'core', summary: 'Deep trunk pressure and bracing support.' },
  { id: 'spinal_erectors', label: 'Spinal Erectors', region: 'core', summary: 'Back-extension and posture support.' },
  { id: 'multifidus', label: 'Multifidus', region: 'core', summary: 'Segmental spine stability.' },
  { id: 'rotator_cuff', label: 'Rotator Cuff', region: 'upper', summary: 'Shoulder centering and control.' },
  { id: 'core', label: 'Core', region: 'core', summary: 'General trunk-control and bracing musculature.' },
  { id: 'full_body', label: 'Full Body', region: 'full_body', summary: 'Distributed whole-body demand.' },
  { id: 'aerobic_system', label: 'Aerobic System', region: 'full_body', summary: 'Cardiorespiratory aerobic demand.' },
  { id: 'feet_intrinsics', label: 'Feet Intrinsics', region: 'lower', summary: 'Foot control and arch support.' },
  { id: 'diaphragm', label: 'Diaphragm', region: 'core', summary: 'Breathing and pressure regulation.' },
];

export const equipmentTypes: EquipmentType[] = [
  { id: 'bodyweight', label: 'Bodyweight', category: 'bodyweight', summary: 'No external load required.' },
  { id: 'dumbbells', label: 'Dumbbells', category: 'free_weight', summary: 'Pair or single dumbbell loading.' },
  { id: 'kettlebell', label: 'Kettlebell', category: 'free_weight', summary: 'Kettlebell ballistic and strength loading.' },
  { id: 'barbell', label: 'Barbell', category: 'free_weight', summary: 'Barbell lifts and landmine setups.' },
  { id: 'squat_rack', label: 'Squat Rack', category: 'machine', summary: 'Rack support for loaded squats and presses.' },
  { id: 'bench', label: 'Bench', category: 'accessory', summary: 'Flat or adjustable bench.' },
  { id: 'pull_up_bar', label: 'Pull-Up Bar', category: 'accessory', summary: 'Vertical pulling station.' },
  { id: 'cable_machine', label: 'Cable Machine', category: 'machine', summary: 'Adjustable cable station.' },
  { id: 'resistance_band', label: 'Resistance Band', category: 'accessory', summary: 'Band resistance or assistance.' },
  { id: 'medicine_ball', label: 'Medicine Ball', category: 'accessory', summary: 'Throws, slams, and trunk power.' },
  { id: 'jump_rope', label: 'Jump Rope', category: 'accessory', summary: 'Rope skipping and foot rhythm.' },
  { id: 'assault_bike', label: 'Assault Bike', category: 'cardio', summary: 'Fan bike for low-impact intervals.' },
  { id: 'rowing_machine', label: 'Rowing Machine', category: 'cardio', summary: 'Low-impact rowing ergometer.' },
  { id: 'treadmill', label: 'Treadmill', category: 'cardio', summary: 'Indoor running and walking.' },
  { id: 'stationary_bike', label: 'Stationary Bike', category: 'cardio', summary: 'Bike ergometer or spin bike.' },
  { id: 'sled', label: 'Sled', category: 'accessory', summary: 'Pushing, dragging, and low-eccentric conditioning.' },
  { id: 'battle_rope', label: 'Battle Rope', category: 'accessory', summary: 'Upper-body conditioning rope.' },
  { id: 'trx', label: 'TRX', category: 'accessory', summary: 'Suspension trainer.' },
  { id: 'foam_roller', label: 'Foam Roller', category: 'accessory', summary: 'Soft-tissue recovery support.' },
  { id: 'mat', label: 'Mat', category: 'accessory', summary: 'Floor-work comfort.' },
  { id: 'plyo_box', label: 'Plyo Box', category: 'accessory', summary: 'Box jumps, step-ups, and supports.' },
  { id: 'leg_press', label: 'Leg Press', category: 'machine', summary: 'Machine leg press.' },
  { id: 'lat_pulldown', label: 'Lat Pulldown', category: 'machine', summary: 'Vertical pull machine.' },
  { id: 'open_space', label: 'Open Space', category: 'space', summary: 'Room for carries, crawling, and circuits.' },
  { id: 'track_or_road', label: 'Track or Road', category: 'space', summary: 'Outdoor running or walking surface.' },
];

export const trackingMetrics: WorkoutTaxonomyItem[] = [
  { id: 'sets_completed', label: 'Sets Completed', summary: 'Number of working sets completed.' },
  { id: 'reps_completed', label: 'Reps Completed', summary: 'Completed reps per exercise.' },
  { id: 'load_used', label: 'Load Used', summary: 'Weight or external load used.' },
  { id: 'target_rpe', label: 'Target RPE', summary: 'Intended perceived effort.' },
  { id: 'actual_rpe', label: 'Actual RPE', summary: 'Reported perceived effort.' },
  { id: 'rest_seconds', label: 'Rest Seconds', summary: 'Rest interval between sets or rounds.' },
  { id: 'tempo', label: 'Tempo', summary: 'Movement tempo prescription.' },
  { id: 'duration_minutes', label: 'Duration Minutes', summary: 'Session or block time.' },
  { id: 'heart_rate_zone', label: 'Heart Rate Zone', summary: 'Aerobic intensity zone.' },
  { id: 'distance', label: 'Distance', summary: 'Distance covered.' },
  { id: 'rounds_completed', label: 'Rounds Completed', summary: 'Rounds completed in circuits or intervals.' },
  { id: 'work_seconds', label: 'Work Seconds', summary: 'Length of work interval.' },
  { id: 'pain_score_before', label: 'Pain Before', summary: 'Pain score before training.' },
  { id: 'pain_score_after', label: 'Pain After', summary: 'Pain score after training.' },
  { id: 'movement_quality', label: 'Movement Quality', summary: 'Self or coach quality rating.' },
  { id: 'breathing_quality', label: 'Breathing Quality', summary: 'Breath control or downshift quality.' },
  { id: 'range_quality', label: 'Range Quality', summary: 'Usable range and control quality.' },
  { id: 'symptom_change', label: 'Symptom Change', summary: 'Whether symptoms improved, stayed, or worsened.' },
  { id: 'completion_status', label: 'Completion Status', summary: 'Completed, modified, or stopped.' },
  { id: 'readiness_after', label: 'Readiness After', summary: 'Post-session readiness feel.' },
  { id: 'heart_rate_avg', label: 'Average Heart Rate', summary: 'Average heart rate if available.' },
  { id: 'pace', label: 'Pace', summary: 'Running, walking, or machine pace.' },
  { id: 'calories_optional', label: 'Calories Optional', summary: 'Machine-estimated calories when available.' },
  { id: 'notes', label: 'Notes', summary: 'Free-text athlete notes.' },
  { id: 'substitution_used', label: 'Substitution Used', summary: 'Whether the athlete substituted a movement.' },
];

export const assessmentMetrics: WorkoutTaxonomyItem[] = [
  { id: 'session_rpe', label: 'Session RPE', summary: 'Global session effort.' },
  { id: 'readiness_score', label: 'Readiness Score', summary: 'Current readiness rating.' },
  { id: 'sleep_quality', label: 'Sleep Quality', summary: 'Recent sleep quality.' },
  { id: 'soreness', label: 'Soreness', summary: 'Whole-body or local soreness.' },
  { id: 'pain_location', label: 'Pain Location', summary: 'Location of reported pain.' },
  { id: 'pain_severity', label: 'Pain Severity', summary: 'Severity of pain signal.' },
  { id: 'range_of_motion', label: 'Range of Motion', summary: 'Movement range tolerance.' },
  { id: 'resting_hr', label: 'Resting HR', summary: 'Resting heart rate.' },
  { id: 'hrv', label: 'HRV', summary: 'Heart-rate variability when available.' },
  { id: 'body_mass', label: 'Body Mass', summary: 'Current body mass.' },
  { id: 'hydration_status', label: 'Hydration Status', summary: 'Hydration and thirst markers.' },
  { id: 'energy_level', label: 'Energy Level', summary: 'Subjective energy.' },
  { id: 'technical_quality', label: 'Technical Quality', summary: 'Observed movement quality.' },
  { id: 'breathing_recovery', label: 'Breathing Recovery', summary: 'Ability to recover breathing.' },
  { id: 'completion_tolerance', label: 'Completion Tolerance', summary: 'How well the athlete tolerated the prescription.' },
];

const optionalSupportEquipmentIds = new Set(['mat', 'open_space', 'track_or_road', 'bench', 'plyo_box', 'squat_rack']);
const homeEquipmentIds = new Set(['bodyweight', 'dumbbells', 'kettlebell', 'resistance_band', 'mat', 'open_space', 'jump_rope', 'bench', 'plyo_box', 'trx']);
const gymEquipmentIds = new Set(['barbell', 'squat_rack', 'bench', 'pull_up_bar', 'cable_machine', 'medicine_ball', 'assault_bike', 'rowing_machine', 'treadmill', 'stationary_bike', 'sled', 'battle_rope', 'foam_roller', 'leg_press', 'lat_pulldown', 'open_space']);

const exerciseRelationships: Record<string, Pick<Exercise, 'regressionExerciseIds' | 'progressionExerciseIds' | 'substitutionExerciseIds'>> = {
  goblet_squat: { regressionExerciseIds: ['box_squat', 'bodyweight_squat'], progressionExerciseIds: ['trap_bar_deadlift', 'leg_press'], substitutionExerciseIds: ['bodyweight_squat', 'box_squat', 'leg_press'] },
  bodyweight_squat: { regressionExerciseIds: ['box_squat'], progressionExerciseIds: ['goblet_squat', 'split_squat'], substitutionExerciseIds: ['box_squat', 'reverse_lunge'] },
  box_squat: { regressionExerciseIds: [], progressionExerciseIds: ['bodyweight_squat', 'goblet_squat'], substitutionExerciseIds: ['bodyweight_squat', 'leg_press'] },
  split_squat: { regressionExerciseIds: ['bodyweight_squat'], progressionExerciseIds: ['reverse_lunge', 'step_up'], substitutionExerciseIds: ['reverse_lunge', 'step_up'] },
  reverse_lunge: { regressionExerciseIds: ['split_squat'], progressionExerciseIds: ['step_up'], substitutionExerciseIds: ['split_squat', 'step_up'] },
  romanian_deadlift: { regressionExerciseIds: ['hip_hinge_dowel', 'glute_bridge'], progressionExerciseIds: ['trap_bar_deadlift', 'kettlebell_swing'], substitutionExerciseIds: ['glute_bridge', 'hip_hinge_dowel'] },
  hip_hinge_dowel: { regressionExerciseIds: [], progressionExerciseIds: ['glute_bridge', 'romanian_deadlift'], substitutionExerciseIds: ['glute_bridge', 'cat_cow'] },
  glute_bridge: { regressionExerciseIds: ['hip_hinge_dowel'], progressionExerciseIds: ['romanian_deadlift', 'kettlebell_swing'], substitutionExerciseIds: ['hip_hinge_dowel', 'bodyweight_squat'] },
  trap_bar_deadlift: { regressionExerciseIds: ['romanian_deadlift', 'goblet_squat'], progressionExerciseIds: [], substitutionExerciseIds: ['romanian_deadlift', 'leg_press'] },
  push_up: { regressionExerciseIds: ['incline_push_up'], progressionExerciseIds: ['dumbbell_bench_press', 'floor_press'], substitutionExerciseIds: ['incline_push_up', 'floor_press'] },
  incline_push_up: { regressionExerciseIds: [], progressionExerciseIds: ['push_up', 'floor_press'], substitutionExerciseIds: ['push_up', 'floor_press'] },
  dumbbell_bench_press: { regressionExerciseIds: ['floor_press', 'push_up'], progressionExerciseIds: [], substitutionExerciseIds: ['floor_press', 'push_up'] },
  floor_press: { regressionExerciseIds: ['incline_push_up'], progressionExerciseIds: ['dumbbell_bench_press'], substitutionExerciseIds: ['push_up', 'dumbbell_bench_press'] },
  overhead_press: { regressionExerciseIds: ['landmine_press', 'wall_slide'], progressionExerciseIds: [], substitutionExerciseIds: ['landmine_press', 'dumbbell_lateral_raise'] },
  landmine_press: { regressionExerciseIds: ['wall_slide'], progressionExerciseIds: ['overhead_press'], substitutionExerciseIds: ['overhead_press', 'pallof_press'] },
  one_arm_dumbbell_row: { regressionExerciseIds: ['band_row'], progressionExerciseIds: ['seated_cable_row'], substitutionExerciseIds: ['band_row', 'seated_cable_row'] },
  inverted_row: { regressionExerciseIds: ['band_row'], progressionExerciseIds: ['assisted_pull_up'], substitutionExerciseIds: ['band_row', 'one_arm_dumbbell_row'] },
  band_row: { regressionExerciseIds: [], progressionExerciseIds: ['one_arm_dumbbell_row', 'inverted_row'], substitutionExerciseIds: ['seated_cable_row', 'one_arm_dumbbell_row'] },
  lat_pulldown: { regressionExerciseIds: ['band_row'], progressionExerciseIds: ['assisted_pull_up'], substitutionExerciseIds: ['assisted_pull_up', 'seated_cable_row'] },
  assisted_pull_up: { regressionExerciseIds: ['lat_pulldown', 'band_row'], progressionExerciseIds: [], substitutionExerciseIds: ['lat_pulldown', 'inverted_row'] },
  dead_bug: { regressionExerciseIds: ['crocodile_breathing'], progressionExerciseIds: ['front_plank', 'bird_dog'], substitutionExerciseIds: ['bird_dog', 'front_plank'] },
  front_plank: { regressionExerciseIds: ['dead_bug'], progressionExerciseIds: ['bear_crawl'], substitutionExerciseIds: ['dead_bug', 'side_plank'] },
  side_plank: { regressionExerciseIds: ['dead_bug'], progressionExerciseIds: ['suitcase_carry'], substitutionExerciseIds: ['pallof_press', 'front_plank'] },
  pallof_press: { regressionExerciseIds: ['dead_bug'], progressionExerciseIds: ['cable_woodchop'], substitutionExerciseIds: ['side_plank', 'cable_woodchop'] },
  suitcase_carry: { regressionExerciseIds: ['side_plank', 'pallof_press'], progressionExerciseIds: ['farmers_carry'], substitutionExerciseIds: ['farmers_carry', 'pallof_press'] },
  farmers_carry: { regressionExerciseIds: ['suitcase_carry'], progressionExerciseIds: [], substitutionExerciseIds: ['suitcase_carry', 'sled_push'] },
  med_ball_rotational_throw: { regressionExerciseIds: ['cable_woodchop'], progressionExerciseIds: [], substitutionExerciseIds: ['medicine_ball_slam', 'cable_woodchop'] },
  medicine_ball_slam: { regressionExerciseIds: ['battle_rope_wave'], progressionExerciseIds: ['med_ball_rotational_throw'], substitutionExerciseIds: ['battle_rope_wave', 'sled_push'] },
  kettlebell_swing: { regressionExerciseIds: ['romanian_deadlift', 'glute_bridge'], progressionExerciseIds: [], substitutionExerciseIds: ['romanian_deadlift', 'sled_push'] },
  step_up: { regressionExerciseIds: ['split_squat'], progressionExerciseIds: ['reverse_lunge'], substitutionExerciseIds: ['split_squat', 'box_squat'] },
  box_jump: { regressionExerciseIds: ['step_up', 'pogo_hop'], progressionExerciseIds: [], substitutionExerciseIds: ['step_up', 'sled_push'] },
  pogo_hop: { regressionExerciseIds: ['ankle_rocker'], progressionExerciseIds: ['box_jump'], substitutionExerciseIds: ['ankle_rocker', 'jump_rope_easy'] },
  assault_bike_zone2: { regressionExerciseIds: ['easy_walk'], progressionExerciseIds: ['stationary_bike_zone2'], substitutionExerciseIds: ['stationary_bike_zone2', 'rower_zone2'] },
  stationary_bike_zone2: { regressionExerciseIds: ['easy_walk'], progressionExerciseIds: ['assault_bike_zone2', 'rower_zone2'], substitutionExerciseIds: ['assault_bike_zone2', 'incline_walk'] },
  rower_zone2: { regressionExerciseIds: ['stationary_bike_zone2'], progressionExerciseIds: [], substitutionExerciseIds: ['stationary_bike_zone2', 'incline_walk'] },
  incline_walk: { regressionExerciseIds: ['easy_walk'], progressionExerciseIds: ['rower_zone2'], substitutionExerciseIds: ['easy_walk', 'stationary_bike_zone2'] },
  easy_walk: { regressionExerciseIds: [], progressionExerciseIds: ['incline_walk', 'stationary_bike_zone2'], substitutionExerciseIds: ['stationary_bike_zone2', 'incline_walk'] },
  sled_push: { regressionExerciseIds: ['incline_walk'], progressionExerciseIds: [], substitutionExerciseIds: ['stationary_bike_zone2', 'battle_rope_wave'] },
  battle_rope_wave: { regressionExerciseIds: ['band_pull_apart'], progressionExerciseIds: ['medicine_ball_slam'], substitutionExerciseIds: ['stationary_bike_zone2', 'sled_push'] },
  bear_crawl: { regressionExerciseIds: ['front_plank', 'bird_dog'], progressionExerciseIds: [], substitutionExerciseIds: ['bird_dog', 'front_plank'] },
  bird_dog: { regressionExerciseIds: ['dead_bug'], progressionExerciseIds: ['bear_crawl'], substitutionExerciseIds: ['dead_bug', 'single_leg_balance'] },
  cat_cow: { regressionExerciseIds: ['childs_pose_breathing'], progressionExerciseIds: ['worlds_greatest_stretch'], substitutionExerciseIds: ['thoracic_open_book', 'childs_pose_breathing'] },
  worlds_greatest_stretch: { regressionExerciseIds: ['half_kneeling_hip_flexor', 'thoracic_open_book'], progressionExerciseIds: [], substitutionExerciseIds: ['half_kneeling_hip_flexor', 'thoracic_open_book'] },
  half_kneeling_hip_flexor: { regressionExerciseIds: ['glute_bridge'], progressionExerciseIds: ['worlds_greatest_stretch'], substitutionExerciseIds: ['ankle_rocker', 'worlds_greatest_stretch'] },
  ankle_rocker: { regressionExerciseIds: [], progressionExerciseIds: ['pogo_hop', 'worlds_greatest_stretch'], substitutionExerciseIds: ['half_kneeling_hip_flexor', 'cat_cow'] },
  thoracic_open_book: { regressionExerciseIds: ['cat_cow'], progressionExerciseIds: ['worlds_greatest_stretch'], substitutionExerciseIds: ['cat_cow', 'band_pull_apart'] },
  band_pull_apart: { regressionExerciseIds: ['wall_slide'], progressionExerciseIds: ['band_external_rotation'], substitutionExerciseIds: ['wall_slide', 'band_external_rotation'] },
  band_external_rotation: { regressionExerciseIds: ['wall_slide'], progressionExerciseIds: ['band_pull_apart'], substitutionExerciseIds: ['wall_slide', 'band_pull_apart'] },
  wall_slide: { regressionExerciseIds: [], progressionExerciseIds: ['band_pull_apart', 'band_external_rotation'], substitutionExerciseIds: ['band_pull_apart', 'thoracic_open_book'] },
  childs_pose_breathing: { regressionExerciseIds: [], progressionExerciseIds: ['cat_cow', 'crocodile_breathing'], substitutionExerciseIds: ['crocodile_breathing', 'cat_cow'] },
  crocodile_breathing: { regressionExerciseIds: ['childs_pose_breathing'], progressionExerciseIds: ['dead_bug'], substitutionExerciseIds: ['childs_pose_breathing', 'cat_cow'] },
  single_leg_balance: { regressionExerciseIds: ['bird_dog'], progressionExerciseIds: ['step_up'], substitutionExerciseIds: ['bird_dog', 'ankle_rocker'] },
  leg_press: { regressionExerciseIds: ['box_squat', 'goblet_squat'], progressionExerciseIds: ['trap_bar_deadlift'], substitutionExerciseIds: ['goblet_squat', 'box_squat'] },
  cable_woodchop: { regressionExerciseIds: ['pallof_press'], progressionExerciseIds: ['med_ball_rotational_throw'], substitutionExerciseIds: ['pallof_press', 'medicine_ball_slam'] },
  dumbbell_lateral_raise: { regressionExerciseIds: ['wall_slide'], progressionExerciseIds: ['overhead_press'], substitutionExerciseIds: ['band_pull_apart', 'overhead_press'] },
  dumbbell_curl: { regressionExerciseIds: ['band_row'], progressionExerciseIds: [], substitutionExerciseIds: ['cable_triceps_pressdown', 'band_row'] },
  cable_triceps_pressdown: { regressionExerciseIds: ['incline_push_up'], progressionExerciseIds: ['push_up'], substitutionExerciseIds: ['floor_press', 'push_up'] },
  seated_cable_row: { regressionExerciseIds: ['band_row'], progressionExerciseIds: ['one_arm_dumbbell_row'], substitutionExerciseIds: ['one_arm_dumbbell_row', 'lat_pulldown'] },
  jump_rope_easy: { regressionExerciseIds: ['pogo_hop', 'ankle_rocker'], progressionExerciseIds: ['box_jump'], substitutionExerciseIds: ['incline_walk', 'stationary_bike_zone2'] },
};

function uniqueValues<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function primaryPattern(exercise: Exercise): string {
  return exercise.movementPatternIds[0] ?? 'general';
}

function includesAny(items: readonly string[], targets: readonly string[]): boolean {
  return targets.some((target) => items.includes(target));
}

function categoryFor(exercise: Exercise): NonNullable<Exercise['category']> {
  if (exercise.defaultPrescriptionTemplateId === 'power_quality' || exercise.workoutTypeIds.includes('power')) return 'power';
  if (exercise.defaultPrescriptionTemplateId === 'conditioning_interval') return 'conditioning';
  if (exercise.defaultPrescriptionTemplateId === 'zone2_steady') return 'cardio';
  if (exercise.defaultPrescriptionTemplateId === 'breathing_reset' || exercise.defaultPrescriptionTemplateId === 'recovery_easy') return 'recovery';
  if (exercise.defaultPrescriptionTemplateId === 'shoulder_prehab') return 'prehab';
  if (exercise.defaultPrescriptionTemplateId === 'mobility_hold') return exercise.name.toLowerCase().includes('stretch') ? 'flexibility' : 'mobility';
  if (exercise.defaultPrescriptionTemplateId === 'hypertrophy_straight' || exercise.defaultPrescriptionTemplateId === 'accessory_volume') return 'hypertrophy';
  if (exercise.movementPatternIds.includes('balance')) return 'balance';
  return 'strength';
}

function subPatternIdsFor(exercise: Exercise): string[] {
  const ids: string[] = [];
  for (const patternId of exercise.movementPatternIds) {
    if (patternId === 'squat') ids.push(exercise.equipmentIds.includes('bodyweight') ? 'bodyweight_squat_pattern' : 'loaded_squat_pattern');
    if (patternId === 'hinge') ids.push(exercise.id.includes('swing') ? 'ballistic_hip_hinge' : 'controlled_hip_hinge');
    if (patternId === 'lunge') ids.push('unilateral_knee_dominant');
    if (patternId === 'horizontal_push') ids.push(exercise.equipmentIds.includes('bodyweight') ? 'bodyweight_press' : 'loaded_horizontal_press');
    if (patternId === 'vertical_push') ids.push('overhead_pressing');
    if (patternId === 'horizontal_pull') ids.push(exercise.equipmentIds.includes('bodyweight') ? 'bodyweight_row' : 'loaded_row');
    if (patternId === 'vertical_pull') ids.push('shoulder_adduction_pull');
    if (patternId === 'carry') ids.push(exercise.id.includes('suitcase') ? 'unilateral_loaded_carry' : 'bilateral_loaded_carry');
    if (patternId === 'anti_extension') ids.push('anterior_core_control');
    if (patternId === 'anti_rotation') ids.push('rotary_stability');
    if (patternId === 'rotation') ids.push(exercise.defaultPrescriptionTemplateId === 'power_quality' ? 'rotational_power' : 'controlled_rotation');
    if (patternId === 'locomotion') ids.push(exercise.defaultPrescriptionTemplateId === 'zone2_steady' ? 'steady_aerobic' : 'interval_locomotion');
    if (patternId === 'jump_land') ids.push('elastic_lower_leg');
    if (patternId === 'crawl') ids.push('contralateral_crawl');
    if (patternId === 'shoulder_prehab') ids.push('scapular_rotator_cuff_control');
    if (patternId === 'hip_mobility') ids.push('hip_extension_rotation_range');
    if (patternId === 'thoracic_mobility') ids.push('thoracic_rotation_extension');
    if (patternId === 'ankle_mobility') ids.push('ankle_dorsiflexion_control');
    if (patternId === 'breathing') ids.push('parasympathetic_breathing');
    if (patternId === 'balance') ids.push('single_leg_postural_control');
  }
  return uniqueValues(ids);
}

function jointsFor(exercise: Exercise): string[] {
  const joints: string[] = [];
  if (includesAny(exercise.movementPatternIds, ['squat', 'hinge', 'lunge', 'hip_mobility', 'locomotion', 'jump_land', 'balance'])) joints.push('hips');
  if (includesAny(exercise.movementPatternIds, ['squat', 'lunge', 'locomotion', 'jump_land'])) joints.push('knees');
  if (includesAny(exercise.movementPatternIds, ['squat', 'lunge', 'locomotion', 'jump_land', 'ankle_mobility', 'balance'])) joints.push('ankles');
  if (includesAny(exercise.movementPatternIds, ['hinge', 'anti_extension', 'anti_rotation', 'rotation', 'crawl', 'breathing', 'thoracic_mobility'])) joints.push('spine');
  if (includesAny(exercise.movementPatternIds, ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'carry', 'crawl', 'shoulder_prehab', 'rotation'])) joints.push('shoulders');
  if (includesAny(exercise.movementPatternIds, ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'shoulder_prehab'])) joints.push('elbows');
  if (includesAny(exercise.movementPatternIds, ['horizontal_push', 'horizontal_pull', 'vertical_pull', 'carry', 'crawl', 'shoulder_prehab'])) joints.push('wrists');
  return uniqueValues(joints.length ? joints : ['spine']);
}

function planeFor(exercise: Exercise): NonNullable<Exercise['planeOfMotion']> {
  const planes: MovementPlane[] = [];
  if (includesAny(exercise.movementPatternIds, ['squat', 'hinge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'locomotion', 'jump_land', 'hip_mobility', 'ankle_mobility'])) planes.push('sagittal');
  if (includesAny(exercise.movementPatternIds, ['lunge', 'carry', 'balance'])) planes.push('frontal');
  if (includesAny(exercise.movementPatternIds, ['anti_rotation', 'rotation', 'thoracic_mobility'])) planes.push('transverse');
  if (includesAny(exercise.movementPatternIds, ['breathing', 'anti_extension'])) planes.push('static');
  const flat = uniqueValues(planes);
  return flat.length > 1 ? flat : flat[0] ?? 'sagittal';
}

function setupTypeFor(exercise: Exercise): NonNullable<Exercise['setupType']> {
  if (exercise.equipmentIds.some((id) => ['leg_press', 'lat_pulldown', 'assault_bike', 'rowing_machine', 'treadmill', 'stationary_bike'].includes(id))) return 'machine';
  if (exercise.equipmentIds.includes('bench')) return 'bench';
  if (exercise.equipmentIds.includes('mat') || includesAny(exercise.movementPatternIds, ['anti_extension', 'breathing'])) return 'floor';
  if (exercise.movementPatternIds.includes('locomotion') || exercise.movementPatternIds.includes('carry')) return 'locomotion';
  if (exercise.equipmentIds.includes('plyo_box') || exercise.equipmentIds.includes('trx')) return 'supported';
  return 'standing';
}

function technicalComplexityFor(exercise: Exercise): NonNullable<Exercise['technicalComplexity']> {
  if (['box_jump', 'pogo_hop', 'kettlebell_swing', 'med_ball_rotational_throw', 'medicine_ball_slam', 'trap_bar_deadlift'].includes(exercise.id)) return 'high';
  if (includesAny(exercise.movementPatternIds, ['hinge', 'lunge', 'carry', 'rotation', 'crawl']) || exercise.id === 'rower_zone2') return 'moderate';
  return 'low';
}

function loadabilityFor(exercise: Exercise): NonNullable<Exercise['loadability']> {
  if (exercise.defaultPrescriptionTemplateId === 'strength_heavy' || exercise.equipmentIds.some((id) => ['barbell', 'leg_press', 'sled'].includes(id))) return 'high';
  if (exercise.equipmentIds.some((id) => ['dumbbells', 'kettlebell', 'cable_machine', 'lat_pulldown', 'battle_rope', 'medicine_ball'].includes(id))) return 'moderate';
  return 'low';
}

function fatigueCostFor(exercise: Exercise): NonNullable<Exercise['fatigueCost']> {
  if (exercise.intensity === 'hard' || exercise.defaultPrescriptionTemplateId === 'conditioning_interval' || exercise.defaultPrescriptionTemplateId === 'power_quality') return 'high';
  if (exercise.intensity === 'moderate' || exercise.defaultPrescriptionTemplateId === 'hypertrophy_straight' || exercise.defaultPrescriptionTemplateId === 'strength_beginner') return 'moderate';
  return 'low';
}

function demandFor(exercise: Exercise, area: 'knee' | 'hip' | 'shoulder' | 'wrist' | 'ankle' | 'balance' | 'cardio'): NonNullable<Exercise['kneeDemand']> {
  const patterns = exercise.movementPatternIds;
  if (area === 'knee') return includesAny(patterns, ['squat', 'lunge', 'jump_land']) ? 'high' : patterns.includes('locomotion') ? 'moderate' : 'low';
  if (area === 'hip') return includesAny(patterns, ['hinge', 'squat', 'lunge', 'hip_mobility', 'carry']) ? 'high' : patterns.includes('locomotion') ? 'moderate' : 'low';
  if (area === 'shoulder') return includesAny(patterns, ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'crawl', 'shoulder_prehab', 'rotation']) ? 'high' : patterns.includes('carry') ? 'moderate' : 'low';
  if (area === 'wrist') return includesAny(patterns, ['horizontal_push', 'crawl']) ? 'high' : includesAny(patterns, ['carry', 'horizontal_pull', 'vertical_pull', 'shoulder_prehab']) ? 'moderate' : 'low';
  if (area === 'ankle') return includesAny(patterns, ['jump_land', 'ankle_mobility']) ? 'high' : includesAny(patterns, ['squat', 'lunge', 'locomotion', 'balance']) ? 'moderate' : 'low';
  if (area === 'balance') return includesAny(patterns, ['balance', 'lunge', 'carry', 'crawl', 'rotation']) ? 'high' : includesAny(patterns, ['squat', 'hinge', 'locomotion']) ? 'moderate' : 'low';
  if (exercise.workoutTypeIds.includes('zone2_cardio') || exercise.workoutTypeIds.includes('conditioning') || exercise.workoutTypeIds.includes('low_impact_conditioning')) return 'high';
  return includesAny(patterns, ['carry', 'crawl', 'jump_land']) ? 'moderate' : 'low';
}

function spineLoadingFor(exercise: Exercise): NonNullable<Exercise['spineLoading']> {
  if (exercise.contraindicationFlags.includes('back_caution') || exercise.defaultPrescriptionTemplateId === 'strength_heavy') return 'high';
  if (includesAny(exercise.movementPatternIds, ['hinge', 'squat', 'carry', 'rotation', 'crawl'])) return 'moderate';
  if (includesAny(exercise.movementPatternIds, ['anti_extension', 'anti_rotation', 'thoracic_mobility', 'breathing'])) return 'low';
  return 'none';
}

function spaceRequiredFor(exercise: Exercise): NonNullable<Exercise['spaceRequired']> {
  if (exercise.equipmentIds.some((id) => ['assault_bike', 'rowing_machine', 'treadmill', 'stationary_bike', 'leg_press', 'lat_pulldown', 'cable_machine'].includes(id))) return ['machine_station'];
  if (includesAny(exercise.movementPatternIds, ['carry', 'locomotion']) || exercise.equipmentIds.includes('sled')) return ['lane', 'open_space'];
  if (includesAny(exercise.movementPatternIds, ['jump_land', 'crawl', 'rotation']) || exercise.equipmentIds.includes('battle_rope')) return ['open_space'];
  if (exercise.equipmentIds.includes('mat') || exercise.movementPatternIds.includes('breathing')) return ['mat'];
  return ['small_space'];
}

function requiredEquipmentFor(exercise: Exercise): string[] {
  if (exercise.equipmentIds.includes('bodyweight')) return ['bodyweight'];
  const required = exercise.equipmentIds.filter((id) => !optionalSupportEquipmentIds.has(id));
  return required.length ? required : [exercise.equipmentIds[0]!];
}

function optionalEquipmentFor(exercise: Exercise, required: string[]): string[] {
  return exercise.equipmentIds.filter((id) => !required.includes(id));
}

function setupInstructionsFor(exercise: Exercise): string[] {
  const equipment = exercise.equipmentIds.filter((id) => id !== 'bodyweight').join(', ') || 'bodyweight';
  const pattern = primaryPattern(exercise);
  if (pattern === 'squat') return [`Set feet in a stable squat stance and position ${equipment} so the torso can stay braced.`, 'Choose a depth target that is pain-free before the first working rep.'];
  if (pattern === 'hinge') return [`Set ${equipment} close to the body and soften the knees before sending the hips back.`, 'Brace the trunk before each rep so the hinge comes from the hips, not the low back.'];
  if (pattern === 'lunge') return ['Start in a stance that lets the front foot stay rooted and the pelvis stay square.', 'Use bodyweight first if balance or knee comfort is uncertain.'];
  if (includesAny(exercise.movementPatternIds, ['horizontal_push', 'vertical_push'])) return [`Set hands and ${equipment} so shoulders start comfortable and ribs stay stacked over the pelvis.`, 'Use a range that avoids pinching at the front of the shoulder.'];
  if (includesAny(exercise.movementPatternIds, ['horizontal_pull', 'vertical_pull'])) return [`Set the handle, band, or support so the first pull starts with relaxed neck and active shoulder blades.`, 'Pick a load or body angle that allows a controlled pause.'];
  if (exercise.movementPatternIds.includes('locomotion')) return [`Set up the ${equipment} path or machine and confirm cadence feels smooth before starting the working interval.`, 'Begin below target effort for the first minute so intensity can settle gradually.'];
  if (includesAny(exercise.movementPatternIds, ['hip_mobility', 'thoracic_mobility', 'ankle_mobility', 'shoulder_prehab'])) return ['Start from a supported position where the target joint can move without compensation.', 'Use a small range first, then expand only if symptoms stay quiet.'];
  if (exercise.movementPatternIds.includes('breathing')) return ['Choose a comfortable position that lets the neck and jaw relax.', 'Place attention on slow nasal inhales and longer exhales before adding movement.'];
  if (includesAny(exercise.movementPatternIds, ['anti_extension', 'anti_rotation', 'balance', 'carry', 'crawl'])) return ['Set the trunk before moving and keep a stable base of support.', 'Place any load or support where posture can stay tall and controlled.'];
  return ['Set up in a stable start position with the target joints pain-free.', 'Confirm the first rep can be performed without rushing or compensation.'];
}

function executionInstructionsFor(exercise: Exercise): string[] {
  const pattern = primaryPattern(exercise);
  if (pattern === 'squat') return ['Descend under control with knees tracking over the middle toes.', 'Stand by driving the floor away while keeping the ribs stacked and feet rooted.'];
  if (pattern === 'hinge') return ['Push the hips back until hamstrings load while the spine position stays unchanged.', 'Return by squeezing the glutes and bringing the hips through without leaning back.'];
  if (pattern === 'lunge') return ['Lower with control, keep the front foot planted, and avoid bouncing out of the bottom.', 'Drive through the front foot and finish tall before the next rep.'];
  if (includesAny(exercise.movementPatternIds, ['horizontal_push', 'vertical_push'])) return ['Press smoothly without shrugging or losing trunk position.', 'Stop the set when shoulder comfort, wrist position, or rep speed changes.'];
  if (includesAny(exercise.movementPatternIds, ['horizontal_pull', 'vertical_pull'])) return ['Start each rep by setting the shoulder blade, then pull without neck tension.', 'Control the return instead of letting the load pull posture out of position.'];
  if (exercise.movementPatternIds.includes('locomotion')) return ['Build into the target effort gradually and keep the rhythm repeatable.', 'Reduce pace or resistance if breathing becomes sharp or mechanics deteriorate.'];
  if (exercise.movementPatternIds.includes('jump_land')) return ['Keep contacts quiet and springy with knees and ankles aligned.', 'Stop when landing quality, rhythm, or lower-leg comfort drops.'];
  if (includesAny(exercise.movementPatternIds, ['hip_mobility', 'thoracic_mobility', 'ankle_mobility', 'shoulder_prehab'])) return ['Move slowly through the available range and pause where control is weakest.', 'Keep the target joint moving without forcing neighboring joints to compensate.'];
  if (exercise.movementPatternIds.includes('breathing')) return ['Let each exhale soften the rib cage and slow the system down.', 'Keep the effort easy enough that symptoms do not rise.'];
  if (includesAny(exercise.movementPatternIds, ['anti_extension', 'anti_rotation', 'balance', 'carry', 'crawl'])) return ['Maintain trunk position while the limbs or load move around it.', 'End the set before posture collapses or balance becomes a scramble.'];
  return ['Move with controlled tempo and finish each rep in the same position you started.', 'Keep effort repeatable across the full prescription.'];
}

function breathingInstructionsFor(exercise: Exercise): string[] {
  if (exercise.movementPatternIds.includes('breathing')) return ['Inhale quietly through the nose when possible.', 'Use a longer exhale to downshift effort and track whether symptoms improve.'];
  if (exercise.defaultPrescriptionTemplateId === 'zone2_steady') return ['Keep breathing conversational throughout the main block.', 'Lower pace if talking requires broken sentences.'];
  if (exercise.defaultPrescriptionTemplateId === 'conditioning_interval') return ['Exhale through hard efforts and regain control during rest.', 'Start each round only when breathing has settled enough to repeat quality.'];
  if (includesAny(exercise.movementPatternIds, ['squat', 'hinge', 'lunge', 'horizontal_push', 'vertical_push', 'carry'])) return ['Inhale and brace before the hard part of each rep.', 'Exhale through the finish without losing trunk position.'];
  return ['Use steady nasal or quiet mouth breathing.', 'Do not hold the breath during low-intensity mobility or control work.'];
}

function safetyNotesFor(exercise: Exercise): string[] {
  const notes: string[] = [];
  if (exercise.contraindicationFlags.includes('knee_caution')) notes.push('Skip or regress if knee pain increases during the set or after the session.');
  if (exercise.contraindicationFlags.includes('back_caution')) notes.push('Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp.');
  if (exercise.contraindicationFlags.includes('shoulder_caution')) notes.push('Use a smaller range or substitute if shoulder pinching, instability, or pain appears.');
  if (exercise.contraindicationFlags.includes('wrist_caution')) notes.push('Use a neutral wrist option or substitute if wrist pressure becomes painful.');
  if (exercise.contraindicationFlags.includes('no_jumping')) notes.push('Do not use when jump or landing restrictions are active.');
  if (exercise.defaultPrescriptionTemplateId === 'zone2_steady') notes.push('Keep effort conversational; this is not a test of toughness or max output.');
  if (exercise.defaultPrescriptionTemplateId === 'conditioning_interval') notes.push('Intervals should remain repeatable; stop before form becomes sloppy or symptoms climb.');
  if (notes.length === 0) notes.push('Stop the exercise if pain, dizziness, or unusual symptoms appear.');
  return notes;
}

function prescriptionRangesFor(exercise: Exercise): NonNullable<Exercise['defaultPrescriptionRanges']> {
  if (exercise.defaultPrescriptionTemplateId === 'strength_heavy') return { sets: { min: 3, max: 5 }, reps: { min: 3, max: 6 }, rpe: { min: 6, max: 8 }, restSeconds: { min: 120, max: 180 }, load: { min: 70, max: 85, unit: 'percent_estimated_max' } };
  if (exercise.defaultPrescriptionTemplateId === 'strength_beginner') return { sets: { min: 2, max: 4 }, reps: { min: 6, max: 10 }, rpe: { min: 5, max: 7 }, restSeconds: { min: 60, max: 120 } };
  if (exercise.defaultPrescriptionTemplateId === 'hypertrophy_straight') return { sets: { min: 2, max: 4 }, reps: { min: 8, max: 12 }, rpe: { min: 6, max: 8 }, rir: { min: 2, max: 4 }, restSeconds: { min: 60, max: 90 } };
  if (exercise.defaultPrescriptionTemplateId === 'accessory_volume') return { sets: { min: 2, max: 3 }, reps: { min: 12, max: 15 }, rpe: { min: 6, max: 8 }, restSeconds: { min: 30, max: 60 } };
  if (exercise.defaultPrescriptionTemplateId === 'power_quality') return { sets: { min: 3, max: 5 }, reps: { min: 3, max: 5 }, rpe: { min: 5, max: 7 }, restSeconds: { min: 90, max: 150 } };
  if (exercise.defaultPrescriptionTemplateId === 'conditioning_interval') return { rounds: { min: 4, max: 8 }, workSeconds: { min: 20, max: 45 }, restIntervalSeconds: { min: 30, max: 60 }, rpe: { min: 5, max: 7 } };
  if (exercise.defaultPrescriptionTemplateId === 'zone2_steady') return { durationMinutes: { min: 20, max: 45 }, rpe: { min: 3, max: 5 }, heartRateZone: { min: 2, max: 2, unit: 'zone' }, pace: { target: 'conversational' }, talkTest: 'Can speak in full sentences without gasping.' };
  if (exercise.defaultPrescriptionTemplateId === 'recovery_easy') return { durationMinutes: { min: 8, max: 25 }, rpe: { min: 1, max: 3 }, talkTest: 'Easy nasal or conversational breathing.' };
  if (exercise.defaultPrescriptionTemplateId === 'mobility_hold') return { sets: { min: 1, max: 3 }, reps: { target: '4-8 controlled reps per side' }, holdSeconds: { min: 10, max: 30 }, rpe: { min: 1, max: 3 }, targetJoints: jointsFor(exercise), targetTissues: exercise.primaryMuscleIds, rangeOfMotionIntent: 'Increase usable pain-free range while keeping control at the end position.' };
  if (exercise.defaultPrescriptionTemplateId === 'breathing_reset') return { durationMinutes: { min: 2, max: 6 }, rpe: { min: 1, max: 2 }, talkTest: 'Breathing should feel calm enough to speak normally.' };
  if (exercise.defaultPrescriptionTemplateId === 'shoulder_prehab') return { sets: { min: 1, max: 3 }, reps: { min: 10, max: 15 }, rpe: { min: 2, max: 4 }, targetJoints: ['shoulders', 'scapulae'], targetTissues: ['rotator_cuff', 'rear_delts', 'upper_back'], rangeOfMotionIntent: 'Restore shoulder control without pinching or fatigue.' };
  if (exercise.defaultPrescriptionTemplateId === 'carry_control') return { sets: { min: 2, max: 4 }, durationSeconds: { min: 20, max: 45 }, rpe: { min: 5, max: 7 }, restSeconds: { min: 45, max: 90 } };
  return { sets: { min: 2, max: 3 }, reps: { min: 6, max: 10 }, rpe: { min: 3, max: 6 }, restSeconds: { min: 30, max: 60 } };
}

function trackingMetricsFor(exercise: Exercise): string[] {
  const additions: string[] = [];
  if (exercise.defaultPrescriptionTemplateId === 'zone2_steady') additions.push('duration_minutes', 'heart_rate_zone', 'heart_rate_avg', 'actual_rpe', 'pace');
  if (exercise.defaultPrescriptionTemplateId === 'conditioning_interval') additions.push('rounds_completed', 'work_seconds', 'actual_rpe');
  if (includesAny(exercise.equipmentIds, ['dumbbells', 'kettlebell', 'barbell', 'cable_machine', 'leg_press', 'lat_pulldown', 'sled'])) additions.push('load_used');
  if (includesAny(exercise.movementPatternIds, ['hip_mobility', 'thoracic_mobility', 'ankle_mobility', 'shoulder_prehab'])) additions.push('range_quality');
  if (includesAny(exercise.movementPatternIds, ['breathing'])) additions.push('breathing_quality');
  if (!exercise.trackingMetricIds.includes('actual_rpe') && !includesAny(exercise.movementPatternIds, ['breathing', 'hip_mobility', 'thoracic_mobility', 'ankle_mobility', 'shoulder_prehab'])) additions.push('actual_rpe');
  return uniqueValues([...exercise.trackingMetricIds, ...additions]);
}

function ex(input: Exercise): Exercise {
  const requiredEquipment = input.equipmentRequiredIds ?? requiredEquipmentFor(input);
  const relationships = exerciseRelationships[input.id] ?? {};
  return {
    ...input,
    shortName: input.shortName ?? input.name.replace(/^Dumbbell /, '').replace(/^Easy /, ''),
    category: input.category ?? categoryFor(input),
    subPatternIds: input.subPatternIds ?? subPatternIdsFor(input),
    jointsInvolved: input.jointsInvolved ?? jointsFor(input),
    planeOfMotion: input.planeOfMotion ?? planeFor(input),
    equipmentRequiredIds: requiredEquipment,
    equipmentOptionalIds: input.equipmentOptionalIds ?? optionalEquipmentFor(input, requiredEquipment),
    setupType: input.setupType ?? setupTypeFor(input),
    technicalComplexity: input.technicalComplexity ?? technicalComplexityFor(input),
    loadability: input.loadability ?? loadabilityFor(input),
    fatigueCost: input.fatigueCost ?? fatigueCostFor(input),
    spineLoading: input.spineLoading ?? spineLoadingFor(input),
    kneeDemand: input.kneeDemand ?? demandFor(input, 'knee'),
    hipDemand: input.hipDemand ?? demandFor(input, 'hip'),
    shoulderDemand: input.shoulderDemand ?? demandFor(input, 'shoulder'),
    wristDemand: input.wristDemand ?? demandFor(input, 'wrist'),
    ankleDemand: input.ankleDemand ?? demandFor(input, 'ankle'),
    balanceDemand: input.balanceDemand ?? demandFor(input, 'balance'),
    cardioDemand: input.cardioDemand ?? demandFor(input, 'cardio'),
    spaceRequired: input.spaceRequired ?? spaceRequiredFor(input),
    homeFriendly: input.homeFriendly ?? input.equipmentIds.every((id) => homeEquipmentIds.has(id)),
    gymFriendly: input.gymFriendly ?? input.equipmentIds.some((id) => gymEquipmentIds.has(id)),
    beginnerFriendly: input.beginnerFriendly ?? (input.minExperience === 'beginner' && technicalComplexityFor(input) !== 'high'),
    regressionExerciseIds: input.regressionExerciseIds ?? relationships.regressionExerciseIds ?? [],
    progressionExerciseIds: input.progressionExerciseIds ?? relationships.progressionExerciseIds ?? [],
    substitutionExerciseIds: input.substitutionExerciseIds ?? relationships.substitutionExerciseIds ?? [],
    setupInstructions: input.setupInstructions ?? setupInstructionsFor(input),
    executionInstructions: input.executionInstructions ?? executionInstructionsFor(input),
    breathingInstructions: input.breathingInstructions ?? breathingInstructionsFor(input),
    safetyNotes: input.safetyNotes ?? safetyNotesFor(input),
    trackingMetricIds: trackingMetricsFor(input),
    defaultPrescriptionRanges: input.defaultPrescriptionRanges ?? prescriptionRangesFor(input),
  };
}

export const exercises: Exercise[] = [
  ex({ id: 'goblet_squat', name: 'Goblet Squat', summary: 'Beginner-friendly squat pattern with load held in front.', coachingSummary: 'Stay tall, brace, and sit between the hips without knee pain.', movementPatternIds: ['squat'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['core', 'adductors'], equipmentIds: ['dumbbells', 'kettlebell'], workoutTypeIds: ['strength', 'hypertrophy', 'full_body_strength', 'lower_strength'], goalIds: ['beginner_strength', 'hypertrophy', 'limited_equipment', 'lower_body_strength', 'dumbbell_hypertrophy'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['knee_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used', 'actual_rpe'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'bodyweight_squat', name: 'Bodyweight Squat', summary: 'Unloaded squat for strength, warm-up, or no-equipment sessions.', coachingSummary: 'Use pain-free depth, feet planted, and steady tempo.', movementPatternIds: ['squat'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['core'], equipmentIds: ['bodyweight'], workoutTypeIds: ['strength', 'bodyweight_strength', 'recovery'], goalIds: ['beginner_strength', 'no_equipment', 'limited_equipment', 'return_to_training'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['knee_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'box_squat', name: 'Box Squat', summary: 'Squat to a box for range control and confidence.', coachingSummary: 'Control to the box, keep tension, and stand without rocking.', movementPatternIds: ['squat'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['core'], equipmentIds: ['bodyweight', 'plyo_box', 'dumbbells'], workoutTypeIds: ['strength', 'recovery', 'lower_strength'], goalIds: ['beginner_strength', 'return_to_training', 'limited_equipment'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'split_squat', name: 'Split Squat', summary: 'Static single-leg strength pattern.', coachingSummary: 'Keep front foot rooted and use a range that keeps the knee comfortable.', movementPatternIds: ['lunge'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['adductors', 'core'], equipmentIds: ['bodyweight', 'dumbbells'], workoutTypeIds: ['strength', 'hypertrophy', 'bodyweight_strength'], goalIds: ['beginner_strength', 'hypertrophy', 'no_equipment', 'dumbbell_hypertrophy'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['knee_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'reverse_lunge', name: 'Reverse Lunge', summary: 'Deceleration-friendly lunge variation.', coachingSummary: 'Step back softly and drive through the front foot.', movementPatternIds: ['lunge'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['hamstrings', 'core'], equipmentIds: ['bodyweight', 'dumbbells'], workoutTypeIds: ['strength', 'hypertrophy', 'lower_strength'], goalIds: ['beginner_strength', 'hypertrophy', 'limited_equipment'], minExperience: 'beginner', intensity: 'moderate', impact: 'low', contraindicationFlags: ['knee_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'romanian_deadlift', name: 'Romanian Deadlift', summary: 'Hip hinge for hamstrings and glutes.', coachingSummary: 'Push hips back, keep ribs down, and stop before back position changes.', movementPatternIds: ['hinge'], primaryMuscleIds: ['hamstrings', 'glutes'], secondaryMuscleIds: ['spinal_erectors', 'forearms'], equipmentIds: ['dumbbells', 'barbell'], workoutTypeIds: ['strength', 'hypertrophy', 'lower_strength'], goalIds: ['beginner_strength', 'hypertrophy', 'dumbbell_hypertrophy', 'full_gym_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['back_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used', 'actual_rpe'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'hip_hinge_dowel', name: 'Hip Hinge Drill', summary: 'Low-load hinge patterning drill.', coachingSummary: 'Keep three points of contact and learn the hip-back pattern.', movementPatternIds: ['hinge'], primaryMuscleIds: ['hamstrings', 'glutes'], secondaryMuscleIds: ['spinal_erectors'], equipmentIds: ['bodyweight'], workoutTypeIds: ['mobility', 'recovery', 'bodyweight_strength'], goalIds: ['mobility', 'recovery', 'no_equipment', 'return_to_training'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['movement_quality', 'range_quality'], defaultPrescriptionTemplateId: 'mobility_hold' }),
  ex({ id: 'glute_bridge', name: 'Glute Bridge', summary: 'Floor-based hip extension.', coachingSummary: 'Drive through heels and keep ribs down at lockout.', movementPatternIds: ['hinge'], primaryMuscleIds: ['glutes', 'hamstrings'], secondaryMuscleIds: ['core'], equipmentIds: ['bodyweight', 'resistance_band'], workoutTypeIds: ['strength', 'recovery', 'bodyweight_strength'], goalIds: ['beginner_strength', 'no_equipment', 'recovery', 'return_to_training'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'trap_bar_deadlift', name: 'Trap Bar Deadlift', summary: 'Loaded hinge/squat hybrid with neutral handles.', coachingSummary: 'Brace first, push the floor away, and avoid grinding reps.', movementPatternIds: ['hinge', 'squat'], primaryMuscleIds: ['glutes', 'quads', 'hamstrings'], secondaryMuscleIds: ['spinal_erectors', 'forearms'], equipmentIds: ['barbell'], workoutTypeIds: ['strength', 'full_body_strength', 'lower_strength'], goalIds: ['full_gym_strength', 'lower_body_strength'], minExperience: 'intermediate', intensity: 'hard', impact: 'none', contraindicationFlags: ['back_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used', 'actual_rpe'], defaultPrescriptionTemplateId: 'strength_heavy' }),
  ex({ id: 'push_up', name: 'Push-Up', summary: 'Bodyweight horizontal press.', coachingSummary: 'Brace the trunk and keep shoulders comfortable.', movementPatternIds: ['horizontal_push', 'anti_extension'], primaryMuscleIds: ['chest', 'triceps'], secondaryMuscleIds: ['shoulders', 'core'], equipmentIds: ['bodyweight'], workoutTypeIds: ['strength', 'hypertrophy', 'bodyweight_strength'], goalIds: ['beginner_strength', 'no_equipment', 'limited_equipment', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['wrist_caution', 'shoulder_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'incline_push_up', name: 'Incline Push-Up', summary: 'Regressed push-up using a bench or box.', coachingSummary: 'Use a height that allows clean reps without shoulder or wrist pain.', movementPatternIds: ['horizontal_push', 'anti_extension'], primaryMuscleIds: ['chest', 'triceps'], secondaryMuscleIds: ['shoulders', 'core'], equipmentIds: ['bodyweight', 'bench', 'plyo_box'], workoutTypeIds: ['strength', 'bodyweight_strength', 'recovery'], goalIds: ['beginner_strength', 'no_equipment', 'return_to_training'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['wrist_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'dumbbell_bench_press', name: 'Dumbbell Bench Press', summary: 'Dumbbell horizontal press for upper-body strength and size.', coachingSummary: 'Control the bottom and keep the shoulder blades set.', movementPatternIds: ['horizontal_push'], primaryMuscleIds: ['chest', 'triceps'], secondaryMuscleIds: ['shoulders'], equipmentIds: ['dumbbells', 'bench'], workoutTypeIds: ['strength', 'hypertrophy', 'upper_strength'], goalIds: ['hypertrophy', 'dumbbell_hypertrophy', 'upper_body_strength', 'full_gym_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used', 'actual_rpe'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'floor_press', name: 'Dumbbell Floor Press', summary: 'Shoulder-friendly dumbbell press from the floor.', coachingSummary: 'Pause the upper arm on the floor and press smoothly.', movementPatternIds: ['horizontal_push'], primaryMuscleIds: ['chest', 'triceps'], secondaryMuscleIds: ['shoulders'], equipmentIds: ['dumbbells'], workoutTypeIds: ['strength', 'hypertrophy', 'upper_strength'], goalIds: ['limited_equipment', 'dumbbell_hypertrophy', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'overhead_press', name: 'Dumbbell Overhead Press', summary: 'Vertical press using dumbbells.', coachingSummary: 'Brace hard and press without leaning back.', movementPatternIds: ['vertical_push'], primaryMuscleIds: ['shoulders', 'triceps'], secondaryMuscleIds: ['core'], equipmentIds: ['dumbbells'], workoutTypeIds: ['strength', 'hypertrophy', 'upper_strength'], goalIds: ['hypertrophy', 'dumbbell_hypertrophy', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'landmine_press', name: 'Landmine Press', summary: 'Angled press that can be easier on shoulders than overhead work.', coachingSummary: 'Press up and forward while staying stacked through the trunk.', movementPatternIds: ['vertical_push', 'anti_rotation'], primaryMuscleIds: ['shoulders', 'triceps'], secondaryMuscleIds: ['obliques', 'chest'], equipmentIds: ['barbell'], workoutTypeIds: ['strength', 'boxing_support', 'upper_strength'], goalIds: ['boxing_support', 'upper_body_strength', 'full_gym_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'one_arm_dumbbell_row', name: 'One-Arm Dumbbell Row', summary: 'Unilateral horizontal pull.', coachingSummary: 'Pull to the hip and avoid twisting through the torso.', movementPatternIds: ['horizontal_pull'], primaryMuscleIds: ['lats', 'upper_back'], secondaryMuscleIds: ['biceps', 'forearms'], equipmentIds: ['dumbbells', 'bench'], workoutTypeIds: ['strength', 'hypertrophy', 'upper_strength'], goalIds: ['beginner_strength', 'hypertrophy', 'dumbbell_hypertrophy', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'inverted_row', name: 'Inverted Row', summary: 'Bodyweight horizontal pulling pattern.', coachingSummary: 'Keep body long and pull the chest toward the handle or bar.', movementPatternIds: ['horizontal_pull', 'anti_extension'], primaryMuscleIds: ['upper_back', 'lats'], secondaryMuscleIds: ['biceps', 'core'], equipmentIds: ['trx', 'pull_up_bar'], workoutTypeIds: ['strength', 'bodyweight_strength', 'upper_strength'], goalIds: ['beginner_strength', 'limited_equipment', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'band_row', name: 'Band Row', summary: 'Low-equipment row variation.', coachingSummary: 'Pause with shoulder blades back and ribs down.', movementPatternIds: ['horizontal_pull'], primaryMuscleIds: ['upper_back', 'lats'], secondaryMuscleIds: ['biceps', 'rear_delts'], equipmentIds: ['resistance_band'], workoutTypeIds: ['strength', 'hypertrophy', 'recovery'], goalIds: ['limited_equipment', 'recovery', 'return_to_training'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'lat_pulldown', name: 'Lat Pulldown', summary: 'Machine vertical pull.', coachingSummary: 'Pull elbows down, not back, and avoid neck jutting.', movementPatternIds: ['vertical_pull'], primaryMuscleIds: ['lats'], secondaryMuscleIds: ['biceps', 'upper_back'], equipmentIds: ['lat_pulldown'], workoutTypeIds: ['strength', 'hypertrophy', 'upper_strength'], goalIds: ['hypertrophy', 'full_gym_strength', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'assisted_pull_up', name: 'Assisted Pull-Up', summary: 'Regressed vertical pull using assistance.', coachingSummary: 'Use enough assistance to keep full range and shoulder control.', movementPatternIds: ['vertical_pull'], primaryMuscleIds: ['lats', 'upper_back'], secondaryMuscleIds: ['biceps', 'forearms'], equipmentIds: ['pull_up_bar', 'resistance_band'], workoutTypeIds: ['strength', 'upper_strength', 'bodyweight_strength'], goalIds: ['beginner_strength', 'limited_equipment', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'strength_beginner' }),
  ex({ id: 'dead_bug', name: 'Dead Bug', summary: 'Supine anti-extension trunk control.', coachingSummary: 'Exhale, keep low back quiet, and move slowly.', movementPatternIds: ['anti_extension'], primaryMuscleIds: ['transverse_abs', 'rectus_abs'], secondaryMuscleIds: ['hip_flexors'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['core_durability', 'recovery', 'mobility'], goalIds: ['beginner_strength', 'core_durability', 'recovery', 'no_equipment'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'core_control' }),
  ex({ id: 'front_plank', name: 'Front Plank', summary: 'Anti-extension isometric trunk hold.', coachingSummary: 'Make a straight line and stop before low-back sag.', movementPatternIds: ['anti_extension'], primaryMuscleIds: ['rectus_abs', 'transverse_abs'], secondaryMuscleIds: ['shoulders', 'glutes'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['core_durability', 'bodyweight_strength', 'recovery'], goalIds: ['beginner_strength', 'no_equipment', 'core_durability'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['duration_minutes', 'actual_rpe', 'movement_quality'], defaultPrescriptionTemplateId: 'core_control' }),
  ex({ id: 'side_plank', name: 'Side Plank', summary: 'Lateral trunk stability hold.', coachingSummary: 'Stack hips and keep pressure away from painful shoulders.', movementPatternIds: ['anti_rotation'], primaryMuscleIds: ['obliques', 'transverse_abs'], secondaryMuscleIds: ['shoulders', 'glutes'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['core_durability', 'bodyweight_strength', 'recovery'], goalIds: ['core_durability', 'no_equipment', 'beginner_strength'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['duration_minutes', 'movement_quality'], defaultPrescriptionTemplateId: 'core_control' }),
  ex({ id: 'pallof_press', name: 'Pallof Press', summary: 'Cable or band anti-rotation press.', coachingSummary: 'Press straight out and resist rotation through the trunk.', movementPatternIds: ['anti_rotation'], primaryMuscleIds: ['obliques', 'transverse_abs'], secondaryMuscleIds: ['shoulders'], equipmentIds: ['resistance_band', 'cable_machine'], workoutTypeIds: ['core_durability', 'boxing_support', 'strength'], goalIds: ['core_durability', 'boxing_support', 'limited_equipment'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'core_control' }),
  ex({ id: 'suitcase_carry', name: 'Suitcase Carry', summary: 'Loaded carry resisting side bend.', coachingSummary: 'Walk tall and do not lean toward the load.', movementPatternIds: ['carry', 'anti_rotation'], primaryMuscleIds: ['obliques', 'forearms'], secondaryMuscleIds: ['glutes', 'shoulders'], equipmentIds: ['dumbbells', 'kettlebell', 'open_space'], workoutTypeIds: ['core_durability', 'strength', 'boxing_support'], goalIds: ['core_durability', 'limited_equipment', 'boxing_support'], minExperience: 'beginner', intensity: 'moderate', impact: 'low', contraindicationFlags: ['back_caution'], trackingMetricIds: ['duration_minutes', 'load_used', 'actual_rpe'], defaultPrescriptionTemplateId: 'carry_control' }),
  ex({ id: 'farmers_carry', name: 'Farmer Carry', summary: 'Two-hand loaded carry for grip and trunk endurance.', coachingSummary: 'Stay tall, take short steps, and stop before posture collapses.', movementPatternIds: ['carry'], primaryMuscleIds: ['forearms', 'upper_back'], secondaryMuscleIds: ['obliques', 'glutes'], equipmentIds: ['dumbbells', 'kettlebell', 'open_space'], workoutTypeIds: ['strength', 'core_durability', 'conditioning'], goalIds: ['full_gym_strength', 'limited_equipment', 'core_durability'], minExperience: 'beginner', intensity: 'moderate', impact: 'low', contraindicationFlags: ['back_caution'], trackingMetricIds: ['duration_minutes', 'load_used', 'actual_rpe'], defaultPrescriptionTemplateId: 'carry_control' }),
  ex({ id: 'med_ball_rotational_throw', name: 'Med Ball Rotational Throw', summary: 'Explosive trunk rotation throw.', coachingSummary: 'Rotate through hips and keep reps snappy, not fatiguing.', movementPatternIds: ['rotation'], primaryMuscleIds: ['obliques', 'glutes'], secondaryMuscleIds: ['shoulders', 'full_body'], equipmentIds: ['medicine_ball', 'open_space'], workoutTypeIds: ['power', 'boxing_support'], goalIds: ['boxing_support'], minExperience: 'intermediate', intensity: 'moderate', impact: 'none', contraindicationFlags: ['shoulder_caution', 'back_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'power_quality' }),
  ex({ id: 'medicine_ball_slam', name: 'Medicine Ball Slam', summary: 'Full-body medicine ball power and conditioning.', coachingSummary: 'Slam with control and stop before technique gets sloppy.', movementPatternIds: ['hinge', 'rotation'], primaryMuscleIds: ['full_body', 'rectus_abs'], secondaryMuscleIds: ['shoulders', 'lats'], equipmentIds: ['medicine_ball'], workoutTypeIds: ['power', 'conditioning', 'boxing_support'], goalIds: ['boxing_support', 'low_impact_conditioning'], minExperience: 'beginner', intensity: 'moderate', impact: 'low', contraindicationFlags: ['shoulder_caution', 'back_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'conditioning_interval' }),
  ex({ id: 'kettlebell_swing', name: 'Kettlebell Swing', summary: 'Ballistic hip hinge for power endurance.', coachingSummary: 'Hinge, snap the hips, and avoid turning it into a squat raise.', movementPatternIds: ['hinge'], primaryMuscleIds: ['glutes', 'hamstrings'], secondaryMuscleIds: ['spinal_erectors', 'forearms'], equipmentIds: ['kettlebell'], workoutTypeIds: ['power', 'conditioning', 'strength'], goalIds: ['limited_equipment', 'low_impact_conditioning'], minExperience: 'intermediate', intensity: 'moderate', impact: 'low', contraindicationFlags: ['back_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'conditioning_interval' }),
  ex({ id: 'step_up', name: 'Step-Up', summary: 'Low-impact single-leg strength pattern.', coachingSummary: 'Step through the whole foot and control the descent.', movementPatternIds: ['lunge'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['hamstrings', 'calves'], equipmentIds: ['plyo_box', 'dumbbells', 'bodyweight'], workoutTypeIds: ['strength', 'hypertrophy', 'low_impact_conditioning'], goalIds: ['beginner_strength', 'low_impact_conditioning', 'limited_equipment'], minExperience: 'beginner', intensity: 'moderate', impact: 'low', contraindicationFlags: ['knee_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'box_jump', name: 'Box Jump', summary: 'Vertical jump to a box.', coachingSummary: 'Jump only while landings are quiet and pain-free.', movementPatternIds: ['jump_land'], primaryMuscleIds: ['quads', 'glutes', 'calves'], secondaryMuscleIds: ['full_body'], equipmentIds: ['plyo_box'], workoutTypeIds: ['power'], goalIds: ['boxing_support'], minExperience: 'intermediate', intensity: 'moderate', impact: 'moderate', contraindicationFlags: ['no_jumping', 'knee_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'power_quality' }),
  ex({ id: 'pogo_hop', name: 'Pogo Hop', summary: 'Low-amplitude ankle stiffness drill.', coachingSummary: 'Keep contacts quiet and stop on Achilles, ankle, or knee pain.', movementPatternIds: ['jump_land', 'ankle_mobility'], primaryMuscleIds: ['calves', 'feet_intrinsics'], secondaryMuscleIds: ['quads'], equipmentIds: ['bodyweight'], workoutTypeIds: ['power', 'conditioning'], goalIds: ['boxing_support'], minExperience: 'intermediate', intensity: 'moderate', impact: 'moderate', contraindicationFlags: ['no_jumping', 'knee_caution'], trackingMetricIds: ['sets_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'power_quality' }),
  ex({ id: 'assault_bike_zone2', name: 'Assault Bike Zone 2', summary: 'Low-impact steady aerobic bike work.', coachingSummary: 'Keep breathing controlled and stay conversational.', movementPatternIds: ['locomotion'], primaryMuscleIds: ['aerobic_system'], secondaryMuscleIds: ['quads', 'shoulders'], equipmentIds: ['assault_bike'], workoutTypeIds: ['zone2_cardio', 'recovery', 'low_impact_conditioning'], goalIds: ['zone2_cardio', 'low_impact_conditioning', 'recovery'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'heart_rate_zone', 'actual_rpe'], defaultPrescriptionTemplateId: 'zone2_steady' }),
  ex({ id: 'stationary_bike_zone2', name: 'Stationary Bike Zone 2', summary: 'Steady bike work with minimal joint impact.', coachingSummary: 'Hold a smooth cadence and nasal/conversational breathing when possible.', movementPatternIds: ['locomotion'], primaryMuscleIds: ['aerobic_system'], secondaryMuscleIds: ['quads', 'glutes'], equipmentIds: ['stationary_bike'], workoutTypeIds: ['zone2_cardio', 'recovery', 'low_impact_conditioning'], goalIds: ['zone2_cardio', 'low_impact_conditioning', 'recovery'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'heart_rate_zone', 'actual_rpe'], defaultPrescriptionTemplateId: 'zone2_steady' }),
  ex({ id: 'rower_zone2', name: 'Rower Zone 2', summary: 'Steady rowing machine aerobic work.', coachingSummary: 'Drive with legs, swing, pull, and keep the effort easy.', movementPatternIds: ['locomotion', 'horizontal_pull'], primaryMuscleIds: ['aerobic_system', 'upper_back'], secondaryMuscleIds: ['quads', 'glutes'], equipmentIds: ['rowing_machine'], workoutTypeIds: ['zone2_cardio', 'low_impact_conditioning'], goalIds: ['zone2_cardio', 'low_impact_conditioning'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['back_caution'], trackingMetricIds: ['duration_minutes', 'heart_rate_zone', 'pace', 'actual_rpe'], defaultPrescriptionTemplateId: 'zone2_steady' }),
  ex({ id: 'incline_walk', name: 'Incline Walk', summary: 'Low-impact treadmill or hill walking.', coachingSummary: 'Walk tall at a pace that keeps breathing controlled.', movementPatternIds: ['locomotion'], primaryMuscleIds: ['aerobic_system', 'glutes'], secondaryMuscleIds: ['calves', 'hamstrings'], equipmentIds: ['treadmill', 'track_or_road'], workoutTypeIds: ['zone2_cardio', 'recovery', 'low_impact_conditioning'], goalIds: ['zone2_cardio', 'low_impact_conditioning', 'recovery'], minExperience: 'beginner', intensity: 'low', impact: 'low', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'heart_rate_zone', 'pace'], defaultPrescriptionTemplateId: 'zone2_steady' }),
  ex({ id: 'easy_walk', name: 'Easy Walk', summary: 'No-equipment low-intensity aerobic work.', coachingSummary: 'Keep it easy enough to finish feeling better than when you started.', movementPatternIds: ['locomotion', 'breathing'], primaryMuscleIds: ['aerobic_system'], secondaryMuscleIds: ['calves', 'glutes'], equipmentIds: ['bodyweight', 'track_or_road'], workoutTypeIds: ['zone2_cardio', 'recovery'], goalIds: ['zone2_cardio', 'recovery', 'no_equipment', 'return_to_training'], minExperience: 'beginner', intensity: 'recovery', impact: 'low', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'actual_rpe', 'symptom_change'], defaultPrescriptionTemplateId: 'recovery_easy' }),
  ex({ id: 'sled_push', name: 'Sled Push', summary: 'Low-eccentric conditioning and leg drive.', coachingSummary: 'Push with stable posture and stop before knees or back complain.', movementPatternIds: ['locomotion', 'squat'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['calves', 'aerobic_system'], equipmentIds: ['sled', 'open_space'], workoutTypeIds: ['conditioning', 'low_impact_conditioning'], goalIds: ['low_impact_conditioning', 'full_gym_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'low', contraindicationFlags: ['knee_caution'], trackingMetricIds: ['duration_minutes', 'rounds_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'conditioning_interval' }),
  ex({ id: 'battle_rope_wave', name: 'Battle Rope Wave', summary: 'Low-impact upper-body conditioning.', coachingSummary: 'Keep ribs down and rhythm steady.', movementPatternIds: ['horizontal_push', 'breathing'], primaryMuscleIds: ['shoulders', 'aerobic_system'], secondaryMuscleIds: ['forearms', 'core'], equipmentIds: ['battle_rope'], workoutTypeIds: ['conditioning', 'low_impact_conditioning', 'boxing_support'], goalIds: ['low_impact_conditioning', 'boxing_support'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['work_seconds', 'rounds_completed', 'actual_rpe'], defaultPrescriptionTemplateId: 'conditioning_interval' }),
  ex({ id: 'bear_crawl', name: 'Bear Crawl', summary: 'Bodyweight crawl for trunk and shoulder endurance.', coachingSummary: 'Move slowly with hips low and wrists comfortable.', movementPatternIds: ['crawl', 'anti_extension'], primaryMuscleIds: ['shoulders', 'transverse_abs'], secondaryMuscleIds: ['quads', 'forearms'], equipmentIds: ['bodyweight', 'open_space'], workoutTypeIds: ['conditioning', 'core_durability', 'bodyweight_strength'], goalIds: ['no_equipment', 'core_durability', 'limited_equipment'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['wrist_caution', 'shoulder_caution'], trackingMetricIds: ['duration_minutes', 'movement_quality', 'actual_rpe'], defaultPrescriptionTemplateId: 'conditioning_interval' }),
  ex({ id: 'bird_dog', name: 'Bird Dog', summary: 'Low-load trunk and hip control drill.', coachingSummary: 'Move slowly and keep the pelvis level.', movementPatternIds: ['anti_rotation', 'balance'], primaryMuscleIds: ['multifidus', 'glutes'], secondaryMuscleIds: ['shoulders', 'transverse_abs'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['mobility', 'recovery', 'core_durability'], goalIds: ['recovery', 'mobility', 'return_to_training', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'core_control' }),
  ex({ id: 'cat_cow', name: 'Cat-Cow', summary: 'Gentle spinal flexion-extension mobility.', coachingSummary: 'Move through a pain-free range and breathe slowly.', movementPatternIds: ['thoracic_mobility', 'breathing'], primaryMuscleIds: ['spinal_erectors', 'diaphragm'], secondaryMuscleIds: ['rectus_abs'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['mobility', 'recovery'], goalIds: ['mobility', 'recovery', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'range_quality', 'breathing_quality'], defaultPrescriptionTemplateId: 'mobility_hold' }),
  ex({ id: 'worlds_greatest_stretch', name: 'Worlds Greatest Stretch', summary: 'Integrated hip and thoracic mobility flow.', coachingSummary: 'Own each position and avoid forcing end ranges.', movementPatternIds: ['hip_mobility', 'thoracic_mobility'], primaryMuscleIds: ['hip_flexors', 'glutes'], secondaryMuscleIds: ['obliques', 'adductors'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['mobility', 'recovery'], goalIds: ['mobility', 'recovery', 'no_equipment'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['wrist_caution'], trackingMetricIds: ['duration_minutes', 'range_quality', 'movement_quality'], defaultPrescriptionTemplateId: 'mobility_hold' }),
  ex({ id: 'half_kneeling_hip_flexor', name: 'Half-Kneeling Hip Flexor Stretch', summary: 'Hip flexor mobility with pelvis control.', coachingSummary: 'Squeeze the back glute and avoid arching the low back.', movementPatternIds: ['hip_mobility'], primaryMuscleIds: ['hip_flexors'], secondaryMuscleIds: ['glutes', 'rectus_abs'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['mobility', 'recovery'], goalIds: ['mobility', 'recovery', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'range_quality'], defaultPrescriptionTemplateId: 'mobility_hold' }),
  ex({ id: 'ankle_rocker', name: 'Ankle Rocker', summary: 'Knee-over-toe ankle mobility drill.', coachingSummary: 'Move slowly and keep heel heavy.', movementPatternIds: ['ankle_mobility'], primaryMuscleIds: ['calves', 'feet_intrinsics'], secondaryMuscleIds: ['quads'], equipmentIds: ['bodyweight'], workoutTypeIds: ['mobility', 'recovery'], goalIds: ['mobility', 'recovery', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'range_quality'], defaultPrescriptionTemplateId: 'mobility_hold' }),
  ex({ id: 'thoracic_open_book', name: 'Thoracic Open Book', summary: 'Side-lying thoracic rotation drill.', coachingSummary: 'Rotate through the upper back, not by forcing the shoulder.', movementPatternIds: ['thoracic_mobility', 'rotation'], primaryMuscleIds: ['obliques', 'spinal_erectors'], secondaryMuscleIds: ['shoulders'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['mobility', 'recovery'], goalIds: ['mobility', 'recovery', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'range_quality'], defaultPrescriptionTemplateId: 'mobility_hold' }),
  ex({ id: 'band_pull_apart', name: 'Band Pull-Apart', summary: 'Shoulder and upper-back prehab.', coachingSummary: 'Keep ribs down and pull the band without shrugging.', movementPatternIds: ['shoulder_prehab', 'horizontal_pull'], primaryMuscleIds: ['rear_delts', 'upper_back'], secondaryMuscleIds: ['rotator_cuff'], equipmentIds: ['resistance_band'], workoutTypeIds: ['mobility', 'recovery', 'boxing_support'], goalIds: ['mobility', 'recovery', 'boxing_support', 'limited_equipment'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'shoulder_prehab' }),
  ex({ id: 'band_external_rotation', name: 'Band External Rotation', summary: 'Rotator cuff control exercise.', coachingSummary: 'Keep elbow pinned and move only through pain-free range.', movementPatternIds: ['shoulder_prehab'], primaryMuscleIds: ['rotator_cuff'], secondaryMuscleIds: ['rear_delts'], equipmentIds: ['resistance_band'], workoutTypeIds: ['mobility', 'recovery', 'boxing_support'], goalIds: ['mobility', 'recovery', 'boxing_support'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'movement_quality'], defaultPrescriptionTemplateId: 'shoulder_prehab' }),
  ex({ id: 'wall_slide', name: 'Wall Slide', summary: 'Scapular control and shoulder mobility drill.', coachingSummary: 'Slide only as high as ribs and shoulders stay controlled.', movementPatternIds: ['shoulder_prehab', 'thoracic_mobility'], primaryMuscleIds: ['rotator_cuff', 'rear_delts'], secondaryMuscleIds: ['shoulders'], equipmentIds: ['bodyweight'], workoutTypeIds: ['mobility', 'recovery'], goalIds: ['mobility', 'recovery', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'range_quality'], defaultPrescriptionTemplateId: 'shoulder_prehab' }),
  ex({ id: 'childs_pose_breathing', name: 'Childs Pose Breathing', summary: 'Low-stress breathing and back expansion drill.', coachingSummary: 'Long exhales, relaxed neck, and no forced stretch.', movementPatternIds: ['breathing', 'thoracic_mobility'], primaryMuscleIds: ['diaphragm'], secondaryMuscleIds: ['lats', 'spinal_erectors'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['recovery', 'mobility'], goalIds: ['recovery', 'mobility', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'breathing_quality', 'symptom_change'], defaultPrescriptionTemplateId: 'breathing_reset' }),
  ex({ id: 'crocodile_breathing', name: 'Crocodile Breathing', summary: 'Prone breathing drill for down-regulation.', coachingSummary: 'Breathe into the floor and lengthen the exhale.', movementPatternIds: ['breathing'], primaryMuscleIds: ['diaphragm'], secondaryMuscleIds: ['transverse_abs'], equipmentIds: ['bodyweight', 'mat'], workoutTypeIds: ['recovery', 'mobility'], goalIds: ['recovery', 'return_to_training', 'no_equipment'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'breathing_quality', 'readiness_after'], defaultPrescriptionTemplateId: 'breathing_reset' }),
  ex({ id: 'single_leg_balance', name: 'Single-Leg Balance', summary: 'Static balance and foot control drill.', coachingSummary: 'Hold posture and use support if needed.', movementPatternIds: ['balance'], primaryMuscleIds: ['feet_intrinsics', 'glutes'], secondaryMuscleIds: ['calves', 'obliques'], equipmentIds: ['bodyweight'], workoutTypeIds: ['mobility', 'recovery', 'core_durability'], goalIds: ['mobility', 'recovery', 'return_to_training'], minExperience: 'beginner', intensity: 'recovery', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['duration_minutes', 'movement_quality'], defaultPrescriptionTemplateId: 'core_control' }),
  ex({ id: 'leg_press', name: 'Leg Press', summary: 'Machine squat pattern for controlled lower-body volume.', coachingSummary: 'Use controlled depth and avoid locking knees hard.', movementPatternIds: ['squat'], primaryMuscleIds: ['quads', 'glutes'], secondaryMuscleIds: ['hamstrings'], equipmentIds: ['leg_press'], workoutTypeIds: ['hypertrophy', 'lower_strength'], goalIds: ['hypertrophy', 'full_gym_strength', 'lower_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['knee_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'cable_woodchop', name: 'Cable Woodchop', summary: 'Controlled rotational cable pattern.', coachingSummary: 'Rotate through hips and trunk without yanking through the back.', movementPatternIds: ['rotation'], primaryMuscleIds: ['obliques'], secondaryMuscleIds: ['shoulders', 'glutes'], equipmentIds: ['cable_machine'], workoutTypeIds: ['core_durability', 'boxing_support', 'hypertrophy'], goalIds: ['core_durability', 'boxing_support', 'full_gym_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: ['back_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'core_control' }),
  ex({ id: 'dumbbell_lateral_raise', name: 'Dumbbell Lateral Raise', summary: 'Shoulder hypertrophy accessory.', coachingSummary: 'Raise smoothly and stop short of shoulder pinch.', movementPatternIds: ['vertical_push'], primaryMuscleIds: ['shoulders'], secondaryMuscleIds: ['rotator_cuff'], equipmentIds: ['dumbbells'], workoutTypeIds: ['hypertrophy', 'upper_strength'], goalIds: ['hypertrophy', 'dumbbell_hypertrophy', 'upper_body_strength'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['shoulder_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'accessory_volume' }),
  ex({ id: 'dumbbell_curl', name: 'Dumbbell Curl', summary: 'Simple arm accessory for hypertrophy.', coachingSummary: 'Keep elbows quiet and control the lower.', movementPatternIds: ['vertical_pull'], primaryMuscleIds: ['biceps'], secondaryMuscleIds: ['forearms'], equipmentIds: ['dumbbells'], workoutTypeIds: ['hypertrophy', 'upper_strength'], goalIds: ['hypertrophy', 'dumbbell_hypertrophy', 'upper_body_strength'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['wrist_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'accessory_volume' }),
  ex({ id: 'cable_triceps_pressdown', name: 'Cable Triceps Pressdown', summary: 'Elbow-extension accessory.', coachingSummary: 'Pin elbows and finish without shoulder roll.', movementPatternIds: ['horizontal_push'], primaryMuscleIds: ['triceps'], secondaryMuscleIds: ['forearms'], equipmentIds: ['cable_machine', 'resistance_band'], workoutTypeIds: ['hypertrophy', 'upper_strength'], goalIds: ['hypertrophy', 'upper_body_strength', 'full_gym_strength'], minExperience: 'beginner', intensity: 'low', impact: 'none', contraindicationFlags: ['wrist_caution'], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'accessory_volume' }),
  ex({ id: 'seated_cable_row', name: 'Seated Cable Row', summary: 'Machine-supported horizontal row.', coachingSummary: 'Sit tall and pull without shrugging.', movementPatternIds: ['horizontal_pull'], primaryMuscleIds: ['upper_back', 'lats'], secondaryMuscleIds: ['biceps', 'rear_delts'], equipmentIds: ['cable_machine'], workoutTypeIds: ['hypertrophy', 'strength', 'upper_strength'], goalIds: ['hypertrophy', 'full_gym_strength', 'upper_body_strength'], minExperience: 'beginner', intensity: 'moderate', impact: 'none', contraindicationFlags: [], trackingMetricIds: ['sets_completed', 'reps_completed', 'load_used'], defaultPrescriptionTemplateId: 'hypertrophy_straight' }),
  ex({ id: 'jump_rope_easy', name: 'Easy Jump Rope', summary: 'Rhythm and light conditioning with contacts.', coachingSummary: 'Keep contacts quiet and stop on knee, ankle, or foot pain.', movementPatternIds: ['jump_land', 'locomotion'], primaryMuscleIds: ['calves', 'aerobic_system'], secondaryMuscleIds: ['shoulders', 'feet_intrinsics'], equipmentIds: ['jump_rope'], workoutTypeIds: ['conditioning'], goalIds: ['boxing_support'], minExperience: 'beginner', intensity: 'moderate', impact: 'moderate', contraindicationFlags: ['no_jumping', 'knee_caution'], trackingMetricIds: ['duration_minutes', 'actual_rpe', 'movement_quality'], defaultPrescriptionTemplateId: 'conditioning_interval' }),
];

export const prescriptionTemplates: PrescriptionTemplate[] = [
  { id: 'strength_beginner', label: 'Beginner Strength Sets', appliesToWorkoutTypeIds: ['strength', 'bodyweight_strength', 'full_body_strength'], defaultSets: 3, defaultReps: '6-10', defaultRpe: 6, restSeconds: 90, tempo: 'controlled', intensityCue: 'Leave 3-4 reps in reserve and stop on pain or form loss.' },
  { id: 'strength_heavy', label: 'Heavy Strength Sets', appliesToWorkoutTypeIds: ['strength', 'lower_strength', 'upper_strength'], defaultSets: 4, defaultReps: '3-6', defaultRpe: 7, restSeconds: 150, tempo: 'controlled', intensityCue: 'Crisp forceful reps; no grinding for MVP prescriptions.' },
  { id: 'hypertrophy_straight', label: 'Hypertrophy Straight Sets', appliesToWorkoutTypeIds: ['hypertrophy'], defaultSets: 3, defaultReps: '8-12', defaultRpe: 7, restSeconds: 75, tempo: '2-0-2', intensityCue: 'Accumulate clean reps with 2-3 reps in reserve.' },
  { id: 'accessory_volume', label: 'Accessory Volume', appliesToWorkoutTypeIds: ['hypertrophy', 'upper_strength'], defaultSets: 2, defaultReps: '12-15', defaultRpe: 7, restSeconds: 45, tempo: 'smooth', intensityCue: 'Small-muscle work should burn, not irritate joints.' },
  { id: 'power_quality', label: 'Power Quality', appliesToWorkoutTypeIds: ['power', 'boxing_support'], defaultSets: 4, defaultReps: '3-5', defaultRpe: 6, restSeconds: 90, tempo: 'fast intent', intensityCue: 'Stop the set when speed or landing quality drops.' },
  { id: 'conditioning_interval', label: 'Conditioning Intervals', appliesToWorkoutTypeIds: ['conditioning', 'low_impact_conditioning'], defaultSets: 6, defaultDurationSeconds: 40, defaultRpe: 6, restSeconds: 40, intensityCue: 'Repeatable hard work, never all-out in the MVP generator.' },
  { id: 'zone2_steady', label: 'Zone 2 Steady Work', appliesToWorkoutTypeIds: ['zone2_cardio'], defaultDurationMinutes: 24, defaultRpe: 4, restSeconds: 0, intensityCue: 'Conversational effort; reduce pace if breathing gets sharp.' },
  { id: 'recovery_easy', label: 'Easy Recovery Work', appliesToWorkoutTypeIds: ['recovery'], defaultDurationMinutes: 12, defaultRpe: 2, restSeconds: 0, intensityCue: 'Finish feeling better or stop early.' },
  { id: 'mobility_hold', label: 'Mobility Control', appliesToWorkoutTypeIds: ['mobility', 'recovery'], defaultSets: 2, defaultReps: '5 slow reps/side', defaultRpe: 2, restSeconds: 20, tempo: 'slow', intensityCue: 'Explore range without forcing symptoms.' },
  { id: 'breathing_reset', label: 'Breathing Reset', appliesToWorkoutTypeIds: ['recovery', 'mobility'], defaultDurationMinutes: 4, defaultRpe: 1, restSeconds: 0, intensityCue: 'Long exhales and low effort.' },
  { id: 'shoulder_prehab', label: 'Shoulder Prehab', appliesToWorkoutTypeIds: ['mobility', 'recovery', 'boxing_support'], defaultSets: 2, defaultReps: '12-15', defaultRpe: 3, restSeconds: 30, tempo: 'controlled', intensityCue: 'Light activation only; avoid pinching or sharp pain.' },
  { id: 'carry_control', label: 'Carry Control', appliesToWorkoutTypeIds: ['strength', 'core_durability'], defaultSets: 3, defaultDurationSeconds: 30, defaultRpe: 6, restSeconds: 60, intensityCue: 'Stay tall and stop when posture changes.' },
  { id: 'core_control', label: 'Core Control', appliesToWorkoutTypeIds: ['core_durability', 'strength', 'recovery'], defaultSets: 2, defaultReps: '6-10 controlled reps or 20-30 sec', defaultRpe: 4, restSeconds: 45, tempo: 'slow', intensityCue: 'Own trunk position and stop before compensation.' },
];

function block(id: string, kind: 'warmup' | 'main' | 'cooldown', title: string, durationMinutes: number, prescriptionTemplateId: string) {
  return { id, kind, title, durationMinutes, prescriptionTemplateId };
}

function slot(
  id: string,
  blockId: string,
  movementPatternIds: string[],
  order: number,
  optional = false,
  preferredExerciseIds?: string[],
): SessionTemplate['movementSlots'][number] {
  const value: SessionTemplate['movementSlots'][number] = { id, blockId, movementPatternIds, order, optional };
  if (preferredExerciseIds) {
    value.preferredExerciseIds = preferredExerciseIds;
  }
  return value;
}

export const sessionTemplates: SessionTemplate[] = [
  {
    id: 'beginner_full_body_strength',
    label: 'Beginner Full-Body Strength',
    summary: 'A safe squat, push, pull, hinge, and trunk session for new athletes.',
    workoutTypeId: 'strength',
    goalIds: ['beginner_strength', 'limited_equipment', 'no_equipment'],
    formatId: 'straight_sets',
    minDurationMinutes: 25,
    defaultDurationMinutes: 40,
    maxDurationMinutes: 60,
    experienceLevels: ['beginner', 'intermediate'],
    blocks: [block('warmup', 'warmup', 'Movement Prep', 7, 'mobility_hold'), block('main', 'main', 'Full-Body Strength', 28, 'strength_beginner'), block('cooldown', 'cooldown', 'Downshift', 5, 'breathing_reset')],
    movementSlots: [slot('warmup_hip', 'warmup', ['hip_mobility'], 1), slot('warmup_shoulder', 'warmup', ['shoulder_prehab'], 2, true), slot('main_squat', 'main', ['squat'], 1), slot('main_push', 'main', ['horizontal_push'], 2), slot('main_pull', 'main', ['horizontal_pull', 'vertical_pull'], 3), slot('main_hinge', 'main', ['hinge'], 4), slot('main_core', 'main', ['anti_extension', 'anti_rotation'], 5), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['All reps stay pain-free.', 'RPE stays at or below the target.', 'The athlete records sets, reps, and session RPE.'],
  },
  {
    id: 'dumbbell_hypertrophy',
    label: 'Dumbbell Hypertrophy',
    summary: 'Moderate-volume dumbbell session with balanced upper/lower exposure.',
    workoutTypeId: 'hypertrophy',
    goalIds: ['hypertrophy', 'dumbbell_hypertrophy'],
    formatId: 'superset',
    minDurationMinutes: 30,
    defaultDurationMinutes: 45,
    maxDurationMinutes: 70,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Tissue Prep', 6, 'mobility_hold'), block('main', 'main', 'Hypertrophy Work', 34, 'hypertrophy_straight'), block('cooldown', 'cooldown', 'Range Reset', 5, 'mobility_hold')],
    movementSlots: [slot('warmup_thoracic', 'warmup', ['thoracic_mobility'], 1), slot('main_squat_lunge', 'main', ['squat', 'lunge'], 1), slot('main_push', 'main', ['horizontal_push', 'vertical_push'], 2), slot('main_pull', 'main', ['horizontal_pull'], 3), slot('main_hinge', 'main', ['hinge'], 4), slot('main_accessory', 'main', ['vertical_push', 'vertical_pull'], 5, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['No set reaches failure.', 'The athlete logs load and reps.', 'Joint discomfort does not increase during the session.'],
  },
  {
    id: 'full_gym_strength',
    label: 'Full-Gym Strength',
    summary: 'Gym-based strength session with heavier anchors and controlled accessories.',
    workoutTypeId: 'full_body_strength',
    goalIds: ['full_gym_strength', 'lower_body_strength', 'upper_body_strength'],
    formatId: 'straight_sets',
    minDurationMinutes: 40,
    defaultDurationMinutes: 55,
    maxDurationMinutes: 75,
    experienceLevels: ['intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Ramp and Prep', 8, 'mobility_hold'), block('main', 'main', 'Strength Anchors', 42, 'strength_heavy'), block('cooldown', 'cooldown', 'Recovery Reset', 5, 'breathing_reset')],
    movementSlots: [slot('warmup_hips', 'warmup', ['hip_mobility', 'ankle_mobility'], 1), slot('main_lower', 'main', ['squat', 'hinge'], 1, false, ['trap_bar_deadlift']), slot('main_press', 'main', ['horizontal_push', 'vertical_push'], 2), slot('main_pull', 'main', ['horizontal_pull', 'vertical_pull'], 3), slot('main_carry', 'main', ['carry'], 4, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['Heavy sets stay submaximal.', 'No contraindicated exercise is selected.', 'Load, reps, and RPE are captured.'],
  },
  {
    id: 'zone2_cardio',
    label: 'Zone 2 Cardio',
    summary: 'Steady aerobic work with a short prep and cooldown.',
    workoutTypeId: 'zone2_cardio',
    goalIds: ['zone2_cardio', 'low_impact_conditioning'],
    formatId: 'steady_state',
    minDurationMinutes: 20,
    defaultDurationMinutes: 35,
    maxDurationMinutes: 60,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Easy Ramp', 5, 'recovery_easy'), block('main', 'main', 'Zone 2 Steady Work', 25, 'zone2_steady'), block('cooldown', 'cooldown', 'Easy Cooldown', 5, 'recovery_easy')],
    movementSlots: [slot('warmup_locomotion', 'warmup', ['locomotion'], 1), slot('main_locomotion', 'main', ['locomotion'], 1), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['Breathing remains conversational.', 'Duration and RPE are logged.', 'The athlete finishes without symptom escalation.'],
  },
  {
    id: 'mobility_flow',
    label: 'Mobility Flow',
    summary: 'Hip, thoracic, ankle, and shoulder mobility with breathing.',
    workoutTypeId: 'mobility',
    goalIds: ['mobility', 'return_to_training'],
    formatId: 'mobility_flow',
    minDurationMinutes: 15,
    defaultDurationMinutes: 25,
    maxDurationMinutes: 40,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Breathing Entry', 3, 'breathing_reset'), block('main', 'main', 'Mobility Flow', 18, 'mobility_hold'), block('cooldown', 'cooldown', 'Downshift', 4, 'breathing_reset')],
    movementSlots: [slot('warmup_breathing', 'warmup', ['breathing'], 1), slot('main_hip', 'main', ['hip_mobility'], 1), slot('main_tspine', 'main', ['thoracic_mobility'], 2), slot('main_ankle', 'main', ['ankle_mobility'], 3), slot('main_shoulder', 'main', ['shoulder_prehab'], 4, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['Range improves or stays comfortable.', 'Pain does not increase.', 'Breathing quality is logged.'],
  },
  {
    id: 'recovery_reset',
    label: 'Recovery Reset',
    summary: 'Low-stress movement, breathwork, and symptom tracking.',
    workoutTypeId: 'recovery',
    goalIds: ['recovery', 'return_to_training'],
    formatId: 'recovery_flow',
    minDurationMinutes: 10,
    defaultDurationMinutes: 20,
    maxDurationMinutes: 35,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Check-In', 3, 'breathing_reset'), block('main', 'main', 'Easy Recovery Work', 12, 'recovery_easy'), block('cooldown', 'cooldown', 'Breathing Downshift', 5, 'breathing_reset')],
    movementSlots: [slot('warmup_breathing', 'warmup', ['breathing'], 1), slot('main_easy', 'main', ['locomotion', 'hip_mobility', 'thoracic_mobility'], 1), slot('main_control', 'main', ['anti_extension', 'balance'], 2, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['Session stays easy.', 'Symptoms are checked before and after.', 'The athlete stops if symptoms worsen.'],
  },
  {
    id: 'low_impact_conditioning',
    label: 'Low-Impact Conditioning',
    summary: 'Machine, sled, carry, or rope conditioning without jumps.',
    workoutTypeId: 'low_impact_conditioning',
    goalIds: ['low_impact_conditioning', 'limited_equipment'],
    formatId: 'intervals',
    minDurationMinutes: 20,
    defaultDurationMinutes: 32,
    maxDurationMinutes: 45,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Easy Ramp', 5, 'recovery_easy'), block('main', 'main', 'Low-Impact Intervals', 22, 'conditioning_interval'), block('cooldown', 'cooldown', 'Cooldown', 5, 'breathing_reset')],
    movementSlots: [slot('warmup_locomotion', 'warmup', ['locomotion'], 1), slot('main_conditioning', 'main', ['locomotion', 'carry'], 1), slot('main_support', 'main', ['horizontal_push', 'squat'], 2, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['No jumping or running is required.', 'Work intervals remain repeatable.', 'Rounds and RPE are logged.'],
  },
  {
    id: 'no_equipment_strength',
    label: 'No-Equipment Strength',
    summary: 'Bodyweight strength and trunk work for constrained settings.',
    workoutTypeId: 'bodyweight_strength',
    goalIds: ['no_equipment', 'beginner_strength'],
    formatId: 'circuit',
    minDurationMinutes: 18,
    defaultDurationMinutes: 30,
    maxDurationMinutes: 45,
    experienceLevels: ['beginner', 'intermediate'],
    blocks: [block('warmup', 'warmup', 'Movement Prep', 5, 'mobility_hold'), block('main', 'main', 'Bodyweight Strength Circuit', 20, 'strength_beginner'), block('cooldown', 'cooldown', 'Downshift', 5, 'breathing_reset')],
    movementSlots: [slot('warmup_mobility', 'warmup', ['hip_mobility', 'thoracic_mobility'], 1), slot('main_squat', 'main', ['squat'], 1), slot('main_push', 'main', ['horizontal_push'], 2), slot('main_hinge', 'main', ['hinge'], 3), slot('main_core', 'main', ['anti_extension', 'anti_rotation'], 4), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['All movements require bodyweight only.', 'The circuit remains pain-free.', 'Completion and RPE are logged.'],
  },
  {
    id: 'core_durability',
    label: 'Core Durability',
    summary: 'Anti-extension, anti-rotation, carry, and balance work.',
    workoutTypeId: 'core_durability',
    goalIds: ['core_durability', 'boxing_support'],
    formatId: 'density_block',
    minDurationMinutes: 20,
    defaultDurationMinutes: 30,
    maxDurationMinutes: 45,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Breathing and Control', 5, 'breathing_reset'), block('main', 'main', 'Trunk Durability', 20, 'core_control'), block('cooldown', 'cooldown', 'Reset', 5, 'mobility_hold')],
    movementSlots: [slot('warmup_breathing', 'warmup', ['breathing'], 1), slot('main_anti_extension', 'main', ['anti_extension'], 1), slot('main_anti_rotation', 'main', ['anti_rotation'], 2), slot('main_carry', 'main', ['carry'], 3, true), slot('main_balance', 'main', ['balance'], 4, true), slot('cooldown_mobility', 'cooldown', ['thoracic_mobility'], 1)],
    successCriteria: ['Trunk position stays controlled.', 'No low-back pain is provoked.', 'Duration or reps are logged.'],
  },
  {
    id: 'boxing_support',
    label: 'Boxing Support',
    summary: 'Shoulder, trunk, and low-impact power support for boxers.',
    workoutTypeId: 'boxing_support',
    goalIds: ['boxing_support'],
    formatId: 'skill_practice',
    minDurationMinutes: 25,
    defaultDurationMinutes: 40,
    maxDurationMinutes: 55,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Shoulder Prep', 6, 'shoulder_prehab'), block('main', 'main', 'Boxing Support Work', 29, 'power_quality'), block('cooldown', 'cooldown', 'Breathing Reset', 5, 'breathing_reset')],
    movementSlots: [slot('warmup_shoulder', 'warmup', ['shoulder_prehab'], 1), slot('main_rotation', 'main', ['rotation', 'anti_rotation'], 1), slot('main_push_pull', 'main', ['horizontal_push', 'horizontal_pull'], 2), slot('main_carry', 'main', ['carry'], 3, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['Power reps stay fast and controlled.', 'Shoulders feel better or unchanged.', 'Quality and RPE are logged.'],
  },
  {
    id: 'upper_strength',
    label: 'Upper Strength',
    summary: 'Upper-body push, pull, and shoulder support.',
    workoutTypeId: 'upper_strength',
    goalIds: ['upper_body_strength'],
    formatId: 'straight_sets',
    minDurationMinutes: 30,
    defaultDurationMinutes: 45,
    maxDurationMinutes: 60,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Shoulder Prep', 6, 'shoulder_prehab'), block('main', 'main', 'Upper Strength', 34, 'strength_beginner'), block('cooldown', 'cooldown', 'Shoulder Reset', 5, 'mobility_hold')],
    movementSlots: [slot('warmup_shoulder', 'warmup', ['shoulder_prehab'], 1), slot('main_push', 'main', ['horizontal_push', 'vertical_push'], 1), slot('main_pull', 'main', ['horizontal_pull', 'vertical_pull'], 2), slot('main_core', 'main', ['anti_rotation'], 3, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['Pressing and pulling remain shoulder-safe.', 'Loads and reps are logged.', 'No set is taken to failure.'],
  },
  {
    id: 'lower_strength',
    label: 'Lower Strength',
    summary: 'Lower-body squat, hinge, lunge, and trunk support.',
    workoutTypeId: 'lower_strength',
    goalIds: ['lower_body_strength'],
    formatId: 'straight_sets',
    minDurationMinutes: 35,
    defaultDurationMinutes: 50,
    maxDurationMinutes: 65,
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    blocks: [block('warmup', 'warmup', 'Lower Prep', 7, 'mobility_hold'), block('main', 'main', 'Lower Strength', 38, 'strength_beginner'), block('cooldown', 'cooldown', 'Cooldown', 5, 'breathing_reset')],
    movementSlots: [slot('warmup_hip_ankle', 'warmup', ['hip_mobility', 'ankle_mobility'], 1), slot('main_squat', 'main', ['squat'], 1), slot('main_hinge', 'main', ['hinge'], 2), slot('main_lunge', 'main', ['lunge'], 3), slot('main_core', 'main', ['anti_extension'], 4, true), slot('cooldown_breathing', 'cooldown', ['breathing'], 1)],
    successCriteria: ['Knee and back signals stay quiet.', 'Working sets stay technically clean.', 'Sets, reps, load, and RPE are logged.'],
  },
];

export const workoutProgrammingCatalog: WorkoutProgrammingCatalog = {
  workoutTypes,
  trainingGoals,
  workoutFormats,
  movementPatterns,
  muscleGroups,
  equipmentTypes,
  exercises,
  prescriptionTemplates,
  sessionTemplates,
  trackingMetrics,
  assessmentMetrics,
};
