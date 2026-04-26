import type {
  AgeBand,
  ConditioningType,
  EnergySystem,
  ExerciseLibraryRow,
  ModalityDose,
  ProgressionFamily,
  ProgressionModelDefinition,
  SafetyFlag,
  SafetyRuleDefinition,
  SCModality,
  SCSessionFamily,
  ScienceNote,
  SessionDoseSummary,
  SessionPrescription,
  SessionTemplateResource,
  SessionTemplateSection,
  TrackingSchemaDefinition,
  TrackingWizardKind,
  WorkoutFocus,
  WorkoutPrescriptionV2,
} from '../types/training.ts';

const ALL_AGE_BANDS: AgeBand[] = ['teen_13_17', 'adult_18_49', 'masters_50_64', 'older_adult_65_plus'];
const ADULT_AGE_BANDS: AgeBand[] = ['adult_18_49', 'masters_50_64', 'older_adult_65_plus'];
const ATHLETE_AGE_BANDS: AgeBand[] = ['teen_13_17', 'adult_18_49', 'masters_50_64'];

export const REQUIRED_SC_SESSION_FAMILIES: SCSessionFamily[] = [
  'max_strength',
  'hypertrophy',
  'strength_endurance',
  'unilateral_strength',
  'durability',
  'olympic_lift_power',
  'med_ball_power',
  'loaded_jump_power',
  'contrast_power',
  'low_contact_plyometrics',
  'bounding',
  'hops',
  'lateral_plyometrics',
  'depth_drop_progression',
  'acceleration',
  'max_velocity',
  'hill_sprints',
  'resisted_sprints',
  'repeated_sprint_ability',
  'aerobic_base',
  'tempo',
  'threshold',
  'hiit',
  'sit',
  'mixed_intervals',
  'sport_round_conditioning',
  'strength_endurance_circuit',
  'metabolic_circuit',
  'bodyweight_circuit',
  'kettlebell_circuit',
  'sled_rope_circuit',
  'combat_specific_circuit',
  'planned_cod',
  'reactive_agility',
  'footwork',
  'deceleration',
  'mobility_flow',
  'tissue_capacity',
  'breathwork',
  'easy_aerobic_flush',
];

export const SCIENCE_NOTES: ScienceNote[] = [
  {
    id: 'acsm-rt-2026',
    label: 'Adult resistance training',
    sourceTitle: 'ACSM 2026 Resistance Training Guidelines',
    sourceUrl: 'https://acsm.org/resistance-training-guidelines-update-2026/',
    summary: 'Use consistent major-muscle exposure, goal-specific loading, and individualized volume before chasing complexity.',
  },
  {
    id: 'youth-resistance-consensus',
    label: 'Youth resistance training',
    sourceTitle: 'Position statement on youth resistance training: the 2014 International Consensus',
    sourceUrl: 'https://bjsm.bmj.com/content/48/7/498',
    summary: 'Youth training should be age-appropriate, technically supervised, progressive, and never forced into adult max-effort rules.',
  },
  {
    id: 'adolescent-plyo-dose',
    label: 'Plyometric dose',
    sourceTitle: 'Maximizing plyometric training for adolescents',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/38040837/',
    summary: 'Plyometric dose must track ground contacts and intervention time, not just exercise count.',
  },
  {
    id: 'young-athlete-hiit',
    label: 'HIIT and sprint intervals',
    sourceTitle: 'High-Intensity Interval Training Performed by Young Athletes',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6072873/',
    summary: 'Repeated sprint, sprint interval, and HIIT sessions are distinct stimuli and need distinct work-rest structures.',
  },
  {
    id: 'interval-programming',
    label: 'Interval programming variables',
    sourceTitle: 'Programming Interval Training to Optimize Time-Trial Performance',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/33826121/',
    summary: 'Interval outcomes depend on work duration, recovery, intensity, modality, and athlete characteristics.',
  },
  {
    id: 'acwr-warning-only',
    label: 'Load spike warning',
    sourceTitle: 'Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/32502973/',
    summary: 'Load-spike metrics are warning signals, not standalone causal injury predictions.',
  },
];

type ExerciseResourceSeed = Pick<ExerciseLibraryRow,
  'id' | 'name' | 'type' | 'cns_load' | 'muscle_group' | 'equipment' |
  'modality' | 'energy_systems' | 'skill_demand' | 'tissue_stress' |
  'axial_load' | 'impact_level' | 'eccentric_load' | 'youth_suitability' |
  'contraindication_tags' | 'progression_family' | 'surface_tags' | 'tracking_schema_id'
> & {
  description?: string;
  cues?: string;
  sport_tags?: string[];
};

function exerciseResource(seed: ExerciseResourceSeed): ExerciseLibraryRow {
  return {
    description: seed.description ?? `${seed.name} resource for ${seed.modality} programming.`,
    cues: seed.cues ?? 'Prioritize technical quality and stop on pain or major form breakdown.',
    sport_tags: seed.sport_tags ?? [],
    movement_pattern: null,
    recovery_hours: null,
    eccentric_damage: null,
    interference_risk: null,
    normalized_recovery_cost: null,
    resource_metadata: {},
    ...seed,
  };
}

export const EXERCISE_LIBRARY_RESOURCES: ExerciseLibraryRow[] = [
  exerciseResource({
    id: 'resource-back-squat',
    name: 'Back Squat',
    type: 'heavy_lift',
    cns_load: 8,
    muscle_group: 'quads',
    equipment: 'barbell',
    modality: 'strength',
    energy_systems: ['alactic_power'],
    skill_demand: 'moderate',
    tissue_stress: 'high',
    axial_load: 'high',
    impact_level: 'none',
    eccentric_load: 'high',
    youth_suitability: 'coach_required',
    contraindication_tags: ['acute_knee_pain', 'acute_back_pain'],
    progression_family: 'load',
    surface_tags: ['gym_floor'],
    tracking_schema_id: 'schema-strength-v1',
  }),
  exerciseResource({
    id: 'resource-trap-bar-deadlift',
    name: 'Trap Bar Deadlift',
    type: 'heavy_lift',
    cns_load: 7,
    muscle_group: 'full_body',
    equipment: 'barbell',
    modality: 'strength',
    energy_systems: ['alactic_power'],
    skill_demand: 'moderate',
    tissue_stress: 'high',
    axial_load: 'high',
    impact_level: 'none',
    eccentric_load: 'moderate',
    youth_suitability: 'coach_required',
    contraindication_tags: ['acute_back_pain'],
    progression_family: 'load',
    surface_tags: ['gym_floor'],
    tracking_schema_id: 'schema-strength-v1',
  }),
  exerciseResource({
    id: 'resource-med-ball-rotational-throw',
    name: 'Med Ball Rotational Throw',
    type: 'power',
    cns_load: 4,
    muscle_group: 'full_body',
    equipment: 'medicine_ball',
    modality: 'power',
    energy_systems: ['alactic_power'],
    skill_demand: 'moderate',
    tissue_stress: 'low',
    axial_load: 'none',
    impact_level: 'none',
    eccentric_load: 'low',
    youth_suitability: 'suitable',
    contraindication_tags: ['acute_shoulder_pain'],
    progression_family: 'quality',
    surface_tags: ['gym_floor', 'turf'],
    tracking_schema_id: 'schema-strength-v1',
  }),
  exerciseResource({
    id: 'resource-pogo-jump',
    name: 'Pogo Jump',
    type: 'power',
    cns_load: 4,
    muscle_group: 'calves',
    equipment: 'bodyweight',
    modality: 'plyometric',
    energy_systems: ['tissue_capacity'],
    skill_demand: 'low',
    tissue_stress: 'moderate',
    axial_load: 'low',
    impact_level: 'moderate',
    eccentric_load: 'moderate',
    youth_suitability: 'suitable',
    contraindication_tags: ['achilles_pain', 'acute_ankle_pain'],
    progression_family: 'contact',
    surface_tags: ['turf', 'gym_floor'],
    tracking_schema_id: 'schema-plyometric-v1',
  }),
  exerciseResource({
    id: 'resource-lateral-bound',
    name: 'Lateral Bound',
    type: 'power',
    cns_load: 6,
    muscle_group: 'glutes',
    equipment: 'bodyweight',
    modality: 'plyometric',
    energy_systems: ['alactic_capacity'],
    skill_demand: 'moderate',
    tissue_stress: 'high',
    axial_load: 'low',
    impact_level: 'high',
    eccentric_load: 'high',
    youth_suitability: 'coach_required',
    contraindication_tags: ['knee_valgus_uncontrolled', 'acute_knee_pain'],
    progression_family: 'contact',
    surface_tags: ['grass', 'turf'],
    tracking_schema_id: 'schema-plyometric-v1',
  }),
  exerciseResource({
    id: 'resource-acceleration-sprint-20m',
    name: '20 m Acceleration Sprint',
    type: 'conditioning',
    cns_load: 8,
    muscle_group: 'full_body',
    equipment: 'bodyweight',
    modality: 'sprint',
    energy_systems: ['alactic_power'],
    skill_demand: 'high',
    tissue_stress: 'high',
    axial_load: 'low',
    impact_level: 'high',
    eccentric_load: 'high',
    youth_suitability: 'coach_required',
    contraindication_tags: ['hamstring_pain', 'low_neural_readiness'],
    progression_family: 'meter',
    surface_tags: ['track', 'turf', 'grass'],
    tracking_schema_id: 'schema-sprint-v1',
  }),
  exerciseResource({
    id: 'resource-hill-sprint',
    name: 'Hill Sprint',
    type: 'conditioning',
    cns_load: 7,
    muscle_group: 'full_body',
    equipment: 'bodyweight',
    modality: 'sprint',
    energy_systems: ['alactic_capacity'],
    skill_demand: 'moderate',
    tissue_stress: 'moderate',
    axial_load: 'low',
    impact_level: 'moderate',
    eccentric_load: 'moderate',
    youth_suitability: 'coach_required',
    contraindication_tags: ['hamstring_pain'],
    progression_family: 'meter',
    surface_tags: ['hill', 'grass'],
    tracking_schema_id: 'schema-sprint-v1',
  }),
  exerciseResource({
    id: 'resource-assault-bike-interval',
    name: 'Assault Bike Interval',
    type: 'conditioning',
    cns_load: 5,
    muscle_group: 'full_body',
    equipment: 'machine',
    modality: 'conditioning',
    energy_systems: ['glycolytic_power', 'aerobic_power'],
    skill_demand: 'low',
    tissue_stress: 'moderate',
    axial_load: 'none',
    impact_level: 'none',
    eccentric_load: 'low',
    youth_suitability: 'suitable',
    contraindication_tags: ['low_energy_availability'],
    progression_family: 'density',
    surface_tags: ['bike'],
    tracking_schema_id: 'schema-hiit-v1',
  }),
  exerciseResource({
    id: 'resource-tempo-run',
    name: 'Tempo Run',
    type: 'conditioning',
    cns_load: 4,
    muscle_group: 'full_body',
    equipment: 'bodyweight',
    modality: 'conditioning',
    energy_systems: ['aerobic_power'],
    skill_demand: 'low',
    tissue_stress: 'moderate',
    axial_load: 'low',
    impact_level: 'moderate',
    eccentric_load: 'moderate',
    youth_suitability: 'suitable',
    contraindication_tags: ['acute_lower_limb_pain'],
    progression_family: 'pace',
    surface_tags: ['track', 'grass'],
    tracking_schema_id: 'schema-aerobic-tempo-v1',
  }),
  exerciseResource({
    id: 'resource-kettlebell-complex',
    name: 'Kettlebell Complex',
    type: 'conditioning',
    cns_load: 5,
    muscle_group: 'full_body',
    equipment: 'kettlebell',
    modality: 'circuit',
    energy_systems: ['local_muscular_endurance', 'glycolytic_capacity'],
    skill_demand: 'moderate',
    tissue_stress: 'moderate',
    axial_load: 'moderate',
    impact_level: 'low',
    eccentric_load: 'moderate',
    youth_suitability: 'coach_required',
    contraindication_tags: ['acute_back_pain'],
    progression_family: 'density',
    surface_tags: ['gym_floor'],
    tracking_schema_id: 'schema-circuit-v1',
  }),
  exerciseResource({
    id: 'resource-sled-push-circuit',
    name: 'Sled Push Circuit',
    type: 'conditioning',
    cns_load: 6,
    muscle_group: 'full_body',
    equipment: 'sled',
    modality: 'circuit',
    energy_systems: ['glycolytic_capacity'],
    skill_demand: 'low',
    tissue_stress: 'high',
    axial_load: 'low',
    impact_level: 'low',
    eccentric_load: 'low',
    youth_suitability: 'suitable',
    contraindication_tags: ['acute_knee_pain'],
    progression_family: 'density',
    surface_tags: ['sled_lane', 'turf'],
    tracking_schema_id: 'schema-circuit-v1',
  }),
  exerciseResource({
    id: 'resource-pro-agility-shuttle',
    name: 'Pro Agility Shuttle',
    type: 'sport_specific',
    cns_load: 6,
    muscle_group: 'full_body',
    equipment: 'bodyweight',
    modality: 'agility',
    energy_systems: ['alactic_capacity'],
    skill_demand: 'moderate',
    tissue_stress: 'high',
    axial_load: 'low',
    impact_level: 'high',
    eccentric_load: 'high',
    youth_suitability: 'coach_required',
    contraindication_tags: ['acute_ankle_pain', 'acute_knee_pain'],
    progression_family: 'quality',
    surface_tags: ['turf', 'court'],
    tracking_schema_id: 'schema-agility-cod-v1',
  }),
  exerciseResource({
    id: 'resource-reactive-mirror-drill',
    name: 'Reactive Mirror Drill',
    type: 'sport_specific',
    cns_load: 5,
    muscle_group: 'full_body',
    equipment: 'bodyweight',
    modality: 'agility',
    energy_systems: ['alactic_capacity'],
    skill_demand: 'high',
    tissue_stress: 'moderate',
    axial_load: 'low',
    impact_level: 'moderate',
    eccentric_load: 'moderate',
    youth_suitability: 'coach_required',
    contraindication_tags: ['balance_concern'],
    progression_family: 'quality',
    surface_tags: ['turf', 'court', 'mat'],
    tracking_schema_id: 'schema-agility-cod-v1',
  }),
  exerciseResource({
    id: 'resource-mobility-flow',
    name: 'Mobility Flow',
    type: 'mobility',
    cns_load: 1,
    muscle_group: 'full_body',
    equipment: 'bodyweight',
    modality: 'mobility',
    energy_systems: ['parasympathetic_recovery'],
    skill_demand: 'low',
    tissue_stress: 'low',
    axial_load: 'none',
    impact_level: 'none',
    eccentric_load: 'low',
    youth_suitability: 'suitable',
    contraindication_tags: ['pain_flag'],
    progression_family: 'range_of_motion',
    surface_tags: ['mat'],
    tracking_schema_id: 'schema-recovery-v1',
  }),
  exerciseResource({
    id: 'resource-easy-bike-flush',
    name: 'Easy Bike Flush',
    type: 'active_recovery',
    cns_load: 1,
    muscle_group: 'full_body',
    equipment: 'machine',
    modality: 'recovery',
    energy_systems: ['aerobic_capacity', 'parasympathetic_recovery'],
    skill_demand: 'low',
    tissue_stress: 'low',
    axial_load: 'none',
    impact_level: 'none',
    eccentric_load: 'none',
    youth_suitability: 'suitable',
    contraindication_tags: [],
    progression_family: 'pace',
    surface_tags: ['bike'],
    tracking_schema_id: 'schema-aerobic-tempo-v1',
  }),
];

export const TRACKING_SCHEMAS: TrackingSchemaDefinition[] = [
  {
    id: 'schema-strength-v1',
    wizardKind: 'strength',
    modality: 'strength',
    completionMetric: 'hard_sets',
    summaryFields: ['hard_sets', 'reps', 'load_percent_1rm', 'rpe', 'rest_seconds', 'tempo'],
    requiredFields: [
      { key: 'weight', label: 'Weight', valueType: 'number', unit: 'lb', required: true },
      { key: 'reps', label: 'Reps', valueType: 'number', unit: null, required: true },
      { key: 'rpe', label: 'RPE', valueType: 'rating', unit: '1-10', required: true },
    ],
  },
  {
    id: 'schema-plyometric-v1',
    wizardKind: 'plyometric',
    modality: 'plyometric',
    completionMetric: 'ground_contacts',
    summaryFields: ['ground_contacts', 'quality_rating', 'pain_flag'],
    requiredFields: [
      { key: 'contacts', label: 'Ground contacts', valueType: 'number', unit: 'contacts', required: true },
      { key: 'landing_quality', label: 'Landing quality', valueType: 'rating', unit: '1-5', required: true },
      { key: 'pain_flag', label: 'Pain flag', valueType: 'boolean', unit: null, required: true },
    ],
  },
  {
    id: 'schema-sprint-v1',
    wizardKind: 'sprint',
    modality: 'sprint',
    completionMetric: 'meters',
    summaryFields: ['meters', 'rep_distance_meters', 'rep_seconds', 'quality_rating'],
    requiredFields: [
      { key: 'distance_m', label: 'Distance', valueType: 'number', unit: 'm', required: true },
      { key: 'time_sec', label: 'Time', valueType: 'duration', unit: 'sec', required: false },
      { key: 'quality', label: 'Rep quality', valueType: 'rating', unit: '1-5', required: true },
    ],
  },
  {
    id: 'schema-hiit-v1',
    wizardKind: 'hiit',
    modality: 'conditioning',
    completionMetric: 'rounds',
    summaryFields: ['work_seconds', 'rest_seconds', 'rounds', 'rpe'],
    requiredFields: [
      { key: 'rounds_completed', label: 'Rounds completed', valueType: 'number', unit: 'rounds', required: true },
      { key: 'session_rpe', label: 'Session RPE', valueType: 'rating', unit: '1-10', required: true },
    ],
  },
  {
    id: 'schema-circuit-v1',
    wizardKind: 'circuit',
    modality: 'circuit',
    completionMetric: 'rounds',
    summaryFields: ['rounds', 'work_seconds', 'rest_seconds', 'rpe'],
    requiredFields: [
      { key: 'rounds_completed', label: 'Rounds completed', valueType: 'number', unit: 'rounds', required: true },
      { key: 'partial_round', label: 'Partial round', valueType: 'text', unit: null, required: false },
      { key: 'session_rpe', label: 'Session RPE', valueType: 'rating', unit: '1-10', required: true },
    ],
  },
  {
    id: 'schema-aerobic-tempo-v1',
    wizardKind: 'aerobic_tempo',
    modality: 'conditioning',
    completionMetric: 'minutes',
    summaryFields: ['minutes', 'hr_zone', 'pace', 'rpe'],
    requiredFields: [
      { key: 'duration_min', label: 'Duration', valueType: 'duration', unit: 'min', required: true },
      { key: 'distance', label: 'Distance', valueType: 'number', unit: 'mi', required: false },
      { key: 'rpe', label: 'RPE', valueType: 'rating', unit: '1-10', required: true },
    ],
  },
  {
    id: 'schema-agility-cod-v1',
    wizardKind: 'agility_cod',
    modality: 'agility',
    completionMetric: 'direction_changes',
    summaryFields: ['direction_changes', 'rep_seconds', 'quality_rating', 'pain_flag'],
    requiredFields: [
      { key: 'reps_completed', label: 'Reps completed', valueType: 'number', unit: 'reps', required: true },
      { key: 'errors', label: 'Errors or slips', valueType: 'number', unit: null, required: false },
      { key: 'quality', label: 'Movement quality', valueType: 'rating', unit: '1-5', required: true },
    ],
  },
  {
    id: 'schema-recovery-v1',
    wizardKind: 'recovery',
    modality: 'recovery',
    completionMetric: 'completion',
    summaryFields: ['minutes', 'pain_flag', 'quality_rating'],
    requiredFields: [
      { key: 'duration_min', label: 'Duration', valueType: 'duration', unit: 'min', required: true },
      { key: 'pain_before', label: 'Pain before', valueType: 'rating', unit: '0-10', required: false },
      { key: 'pain_after', label: 'Pain after', valueType: 'rating', unit: '0-10', required: false },
    ],
  },
];

function progression(
  id: string,
  family: ProgressionFamily,
  appliesTo: SCSessionFamily[],
  progressionUnit: ProgressionModelDefinition['progressionUnit'],
  regressionUnit: ProgressionModelDefinition['regressionUnit'],
  description: string,
): ProgressionModelDefinition {
  return {
    id,
    family,
    appliesTo,
    progressionUnit,
    regressionUnit,
    readinessGate: ['Prime', 'Caution'],
    description,
  };
}

export const PROGRESSION_MODELS: ProgressionModelDefinition[] = [
  progression('progression-load-v1', 'load', ['max_strength', 'hypertrophy', 'unilateral_strength'], 'load_percent_1rm', 'rpe', 'Progress load only when reps and RPE land inside the target window.'),
  progression('progression-volume-v1', 'volume', ['strength_endurance', 'durability'], 'hard_sets', 'rpe', 'Progress by adding controlled sets before load.'),
  progression('progression-contact-v1', 'contact', ['low_contact_plyometrics', 'bounding', 'hops', 'lateral_plyometrics', 'depth_drop_progression', 'loaded_jump_power', 'contrast_power'], 'ground_contacts', 'pain_flag', 'Progress contacts and amplitude only when landing quality stays high.'),
  progression('progression-meter-v1', 'meter', ['acceleration', 'max_velocity', 'hill_sprints', 'resisted_sprints', 'repeated_sprint_ability'], 'meters', 'quality_rating', 'Progress meters or reps only while speed quality is preserved.'),
  progression('progression-density-v1', 'density', ['hiit', 'sit', 'mixed_intervals', 'sport_round_conditioning', 'strength_endurance_circuit', 'metabolic_circuit', 'bodyweight_circuit', 'kettlebell_circuit', 'sled_rope_circuit', 'combat_specific_circuit'], 'rounds', 'rpe', 'Progress density by adding rounds or trimming rest, not both at once.'),
  progression('progression-pace-v1', 'pace', ['aerobic_base', 'tempo', 'threshold', 'easy_aerobic_flush'], 'minutes', 'rpe', 'Progress duration before pace, then pace only inside the intended effort zone.'),
  progression('progression-quality-v1', 'quality', ['olympic_lift_power', 'med_ball_power', 'planned_cod', 'reactive_agility', 'footwork', 'deceleration'], 'quality_rating', 'pain_flag', 'Progress complexity only when quality stays high.'),
  progression('progression-rom-v1', 'range_of_motion', ['mobility_flow', 'tissue_capacity', 'breathwork'], 'minutes', 'pain_flag', 'Progress range, duration, or breath control without provoking symptoms.'),
];

export const SAFETY_RULES: SafetyRuleDefinition[] = [
  {
    id: 'safety-youth-no-max-v1',
    appliesTo: ['max_strength', 'olympic_lift_power', 'depth_drop_progression', 'sit'],
    ageBands: ['teen_13_17'],
    blockedWhen: ['no_coach_present', 'low_technical_confidence', 'pain_flag'],
    substitutionTarget: 'low_contact_plyometrics',
    rationale: 'Teen athletes need technical supervision and lower consequence exposures before max or high impact work.',
  },
  {
    id: 'safety-low-structural-impact-v1',
    appliesTo: ['bounding', 'hops', 'lateral_plyometrics', 'depth_drop_progression', 'max_velocity', 'repeated_sprint_ability'],
    ageBands: ALL_AGE_BANDS,
    blockedWhen: ['low_structural_readiness', 'soreness_high', 'new_pain'],
    substitutionTarget: 'easy_aerobic_flush',
    rationale: 'High impact work should downshift when tissue readiness is low.',
  },
  {
    id: 'safety-low-neural-speed-v1',
    appliesTo: ['olympic_lift_power', 'max_velocity', 'acceleration', 'reactive_agility'],
    ageBands: ALL_AGE_BANDS,
    blockedWhen: ['low_neural_readiness', 'activation_rpe_high', 'sleep_low'],
    substitutionTarget: 'mobility',
    rationale: 'Speed-sensitive work loses value and raises risk when the nervous system is not ready.',
  },
  {
    id: 'safety-low-metabolic-hiit-v1',
    appliesTo: ['hiit', 'sit', 'mixed_intervals', 'sport_round_conditioning', 'metabolic_circuit'],
    ageBands: ALL_AGE_BANDS,
    blockedWhen: ['low_metabolic_readiness', 'acwr_redline', 'low_energy_availability'],
    substitutionTarget: 'aerobic_base',
    rationale: 'Hard conditioning should become aerobic or recovery work when recovery capacity is constrained.',
  },
  {
    id: 'safety-masters-impact-v1',
    appliesTo: ['depth_drop_progression', 'max_velocity', 'sit'],
    ageBands: ['masters_50_64', 'older_adult_65_plus'],
    blockedWhen: ['no_recent_exposure', 'balance_concern', 'joint_pain'],
    substitutionTarget: 'tissue_capacity',
    rationale: 'Masters athletes can train power, but should earn high impact and all-out work through tissue capacity.',
  },
];

function schemaFor(kind: TrackingWizardKind): string {
  const found = TRACKING_SCHEMAS.find((schema) => schema.wizardKind === kind);
  if (!found) throw new Error(`Missing tracking schema for ${kind}`);
  return found.id;
}

function progressionFor(family: SCSessionFamily): string {
  const found = PROGRESSION_MODELS.find((model) => model.appliesTo.includes(family));
  if (!found) throw new Error(`Missing progression model for ${family}`);
  return found.id;
}

function section(id: string, title: string, loadingStrategy: SessionTemplateSection['loadingStrategy'], dose: ModalityDose): SessionTemplateSection {
  return {
    id,
    title,
    intent: `${title} dose delivered with modality-specific tracking.`,
    loadingStrategy,
    dose,
  };
}

function primaryAdaptationFor(modality: SCModality): WorkoutPrescriptionV2['primaryAdaptation'] {
  if (modality === 'strength') return 'strength';
  if (modality === 'power' || modality === 'plyometric' || modality === 'sprint' || modality === 'agility') return 'power';
  if (modality === 'recovery' || modality === 'mobility') return 'recovery';
  if (modality === 'conditioning' || modality === 'circuit') return 'conditioning';
  return 'mixed';
}

type TemplateSeed = {
  id: SCSessionFamily;
  title: string;
  modality: SCModality;
  primaryEnergySystem: EnergySystem;
  wizardKind: TrackingWizardKind;
  defaultDurationMin: number;
  dose: SessionDoseSummary;
  sectionDose: ModalityDose;
  loadingStrategy: SessionTemplateSection['loadingStrategy'];
  ageBands?: AgeBand[];
  safetyRuleIds?: string[];
  scienceNoteIds?: string[];
  rationale: string;
};

function template(seed: TemplateSeed): SessionTemplateResource {
  return {
    id: seed.id,
    title: seed.title,
    modality: seed.modality,
    primaryEnergySystem: seed.primaryEnergySystem,
    wizardKind: seed.wizardKind,
    trackingSchemaId: schemaFor(seed.wizardKind),
    progressionModelId: progressionFor(seed.id),
    safetyRuleIds: seed.safetyRuleIds ?? [],
    scienceNoteIds: seed.scienceNoteIds ?? [],
    compatibleAgeBands: seed.ageBands ?? ALL_AGE_BANDS,
    defaultDurationMin: seed.defaultDurationMin,
    dose: seed.dose,
    sections: [section(`${seed.id}-main`, seed.title, seed.loadingStrategy, seed.sectionDose)],
    rationale: seed.rationale,
  };
}

const strengthScience = ['acsm-rt-2026'];
const youthScience = ['acsm-rt-2026', 'youth-resistance-consensus'];
const plyoScience = ['adolescent-plyo-dose', 'youth-resistance-consensus'];
const intervalScience = ['young-athlete-hiit', 'interval-programming', 'acwr-warning-only'];

export const SESSION_TEMPLATES: SessionTemplateResource[] = [
  template({
    id: 'max_strength',
    title: 'Max Strength',
    modality: 'strength',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'strength',
    defaultDurationMin: 55,
    dose: { hardSets: 10, tissueStressLoad: 7 },
    sectionDose: { strength: { hardSets: 4, reps: '3-5', targetRPE: 8, rir: 2, loadPercent1RM: 82, restSeconds: 180, tempo: 'controlled' } },
    loadingStrategy: 'top_set_backoff',
    ageBands: ADULT_AGE_BANDS,
    safetyRuleIds: ['safety-youth-no-max-v1'],
    scienceNoteIds: strengthScience,
    rationale: 'Heavy compound work for force production with full rest and low exercise count.',
  }),
  template({
    id: 'hypertrophy',
    title: 'Hypertrophy',
    modality: 'strength',
    primaryEnergySystem: 'local_muscular_endurance',
    wizardKind: 'strength',
    defaultDurationMin: 50,
    dose: { hardSets: 12, tissueStressLoad: 6 },
    sectionDose: { strength: { hardSets: 4, reps: '8-12', targetRPE: 7, rir: 2, restSeconds: 90, tempo: '2-0-2' } },
    loadingStrategy: 'straight_sets',
    scienceNoteIds: strengthScience,
    rationale: 'Moderate-load hard sets to accumulate muscle-specific volume.',
  }),
  template({
    id: 'strength_endurance',
    title: 'Strength Endurance',
    modality: 'strength',
    primaryEnergySystem: 'local_muscular_endurance',
    wizardKind: 'strength',
    defaultDurationMin: 45,
    dose: { hardSets: 14, tissueStressLoad: 6 },
    sectionDose: { strength: { hardSets: 3, reps: '12-20', targetRPE: 7, rir: 2, restSeconds: 60, tempo: 'controlled' } },
    loadingStrategy: 'density_block',
    scienceNoteIds: strengthScience,
    rationale: 'Higher-rep work for local fatigue resistance without turning every set into conditioning.',
  }),
  template({
    id: 'unilateral_strength',
    title: 'Unilateral Strength',
    modality: 'strength',
    primaryEnergySystem: 'alactic_capacity',
    wizardKind: 'strength',
    defaultDurationMin: 45,
    dose: { hardSets: 10, tissueStressLoad: 5 },
    sectionDose: { strength: { hardSets: 4, reps: '6-8/side', targetRPE: 7, rir: 2, restSeconds: 90, tempo: 'controlled' } },
    loadingStrategy: 'straight_sets',
    scienceNoteIds: youthScience,
    rationale: 'Single-limb strength and control for transfer, asymmetry management, and safer loading.',
  }),
  template({
    id: 'durability',
    title: 'Durability',
    modality: 'strength',
    primaryEnergySystem: 'tissue_capacity',
    wizardKind: 'strength',
    defaultDurationMin: 35,
    dose: { hardSets: 8, tissueStressLoad: 4 },
    sectionDose: { strength: { hardSets: 3, reps: '8-12', targetRPE: 6, rir: 3, restSeconds: 60, tempo: 'controlled' } },
    loadingStrategy: 'straight_sets',
    scienceNoteIds: youthScience,
    rationale: 'Tendon, trunk, neck, hip, shoulder, and deceleration capacity with lower systemic cost.',
  }),
  template({
    id: 'olympic_lift_power',
    title: 'Olympic Lift Power',
    modality: 'power',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'strength',
    defaultDurationMin: 40,
    dose: { hardSets: 6, tissueStressLoad: 6 },
    sectionDose: { strength: { hardSets: 5, reps: '2-3', targetRPE: 6, rir: 4, loadPercent1RM: 65, restSeconds: 150, tempo: 'fast concentric' } },
    loadingStrategy: 'straight_sets',
    ageBands: ADULT_AGE_BANDS,
    safetyRuleIds: ['safety-youth-no-max-v1', 'safety-low-neural-speed-v1'],
    scienceNoteIds: strengthScience,
    rationale: 'High-skill explosive lifting for rate of force development when technical readiness is high.',
  }),
  template({
    id: 'med_ball_power',
    title: 'Med Ball Power',
    modality: 'power',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'strength',
    defaultDurationMin: 25,
    dose: { hardSets: 6, tissueStressLoad: 3 },
    sectionDose: { strength: { hardSets: 5, reps: '3-5', targetRPE: 5, rir: 5, restSeconds: 60, tempo: 'max velocity' } },
    loadingStrategy: 'straight_sets',
    scienceNoteIds: youthScience,
    rationale: 'Low-load throws that expose rotational and total-body power with low soreness cost.',
  }),
  template({
    id: 'loaded_jump_power',
    title: 'Loaded Jump Power',
    modality: 'plyometric',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'plyometric',
    defaultDurationMin: 25,
    dose: { plyoContacts: 24, highImpactCount: 12, tissueStressLoad: 6 },
    sectionDose: { plyometric: { groundContacts: 24, jumpType: 'vertical', amplitude: 'moderate', surface: 'gym_floor', landingQualityRequired: true } },
    loadingStrategy: 'straight_sets',
    safetyRuleIds: ['safety-low-structural-impact-v1'],
    scienceNoteIds: plyoScience,
    rationale: 'Low-volume jump work that tracks contacts and landing quality rather than tonnage.',
  }),
  template({
    id: 'contrast_power',
    title: 'Contrast Power',
    modality: 'plyometric',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'plyometric',
    defaultDurationMin: 35,
    dose: { hardSets: 4, plyoContacts: 18, highImpactCount: 10, tissueStressLoad: 7 },
    sectionDose: { plyometric: { groundContacts: 18, jumpType: 'vertical', amplitude: 'moderate', surface: 'gym_floor', landingQualityRequired: true } },
    loadingStrategy: 'circuit_rounds',
    ageBands: ADULT_AGE_BANDS,
    safetyRuleIds: ['safety-low-structural-impact-v1'],
    scienceNoteIds: plyoScience,
    rationale: 'Paired strength and explosive work for advanced athletes with adequate recovery.',
  }),
  template({
    id: 'low_contact_plyometrics',
    title: 'Low-Contact Plyometrics',
    modality: 'plyometric',
    primaryEnergySystem: 'tissue_capacity',
    wizardKind: 'plyometric',
    defaultDurationMin: 20,
    dose: { plyoContacts: 60, highImpactCount: 0, tissueStressLoad: 3 },
    sectionDose: { plyometric: { groundContacts: 60, jumpType: 'extensive', amplitude: 'low', surface: 'turf', landingQualityRequired: true } },
    loadingStrategy: 'straight_sets',
    scienceNoteIds: plyoScience,
    rationale: 'Extensive low-amplitude contacts to build elastic capacity before intensive plyos.',
  }),
  template({
    id: 'bounding',
    title: 'Bounds',
    modality: 'plyometric',
    primaryEnergySystem: 'alactic_capacity',
    wizardKind: 'plyometric',
    defaultDurationMin: 25,
    dose: { plyoContacts: 40, highImpactCount: 24, tissueStressLoad: 6 },
    sectionDose: { plyometric: { groundContacts: 40, jumpType: 'horizontal', amplitude: 'moderate', surface: 'grass', landingQualityRequired: true } },
    loadingStrategy: 'straight_sets',
    safetyRuleIds: ['safety-low-structural-impact-v1'],
    scienceNoteIds: plyoScience,
    rationale: 'Horizontal power and stiffness work tracked by contact count and quality.',
  }),
  template({
    id: 'hops',
    title: 'Hops',
    modality: 'plyometric',
    primaryEnergySystem: 'tissue_capacity',
    wizardKind: 'plyometric',
    defaultDurationMin: 20,
    dose: { plyoContacts: 40, highImpactCount: 16, tissueStressLoad: 5 },
    sectionDose: { plyometric: { groundContacts: 40, jumpType: 'extensive', amplitude: 'moderate', surface: 'turf', landingQualityRequired: true } },
    loadingStrategy: 'straight_sets',
    safetyRuleIds: ['safety-low-structural-impact-v1'],
    scienceNoteIds: plyoScience,
    rationale: 'Ankle and foot stiffness exposure with conservative dose tracking.',
  }),
  template({
    id: 'lateral_plyometrics',
    title: 'Lateral Plyometrics',
    modality: 'plyometric',
    primaryEnergySystem: 'alactic_capacity',
    wizardKind: 'plyometric',
    defaultDurationMin: 24,
    dose: { plyoContacts: 36, highImpactCount: 18, tissueStressLoad: 5 },
    sectionDose: { plyometric: { groundContacts: 36, jumpType: 'lateral', amplitude: 'moderate', surface: 'turf', landingQualityRequired: true } },
    loadingStrategy: 'straight_sets',
    safetyRuleIds: ['safety-low-structural-impact-v1'],
    scienceNoteIds: plyoScience,
    rationale: 'Frontal-plane power and landing control for field and combat athletes.',
  }),
  template({
    id: 'depth_drop_progression',
    title: 'Depth/Drop Progression',
    modality: 'plyometric',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'plyometric',
    defaultDurationMin: 20,
    dose: { plyoContacts: 20, highImpactCount: 20, tissueStressLoad: 8 },
    sectionDose: { plyometric: { groundContacts: 20, jumpType: 'depth_drop', amplitude: 'high', surface: 'gym_floor', landingQualityRequired: true } },
    loadingStrategy: 'straight_sets',
    ageBands: ADULT_AGE_BANDS,
    safetyRuleIds: ['safety-youth-no-max-v1', 'safety-low-structural-impact-v1', 'safety-masters-impact-v1'],
    scienceNoteIds: plyoScience,
    rationale: 'Advanced impact exposure that must be earned and tightly capped.',
  }),
  template({
    id: 'acceleration',
    title: 'Acceleration',
    modality: 'sprint',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'sprint',
    defaultDurationMin: 30,
    dose: { sprintMeters: 180, highImpactCount: 6, tissueStressLoad: 6 },
    sectionDose: { sprint: { totalMeters: 180, repDistanceMeters: 20, restSeconds: 90, surface: 'track', intensityPercent: 95, sprintType: 'acceleration' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-neural-speed-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Short high-quality starts with full rest and speed-drop awareness.',
  }),
  template({
    id: 'max_velocity',
    title: 'Max Velocity',
    modality: 'sprint',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'sprint',
    defaultDurationMin: 35,
    dose: { sprintMeters: 240, highImpactCount: 6, tissueStressLoad: 8 },
    sectionDose: { sprint: { totalMeters: 240, repDistanceMeters: 40, restSeconds: 150, surface: 'track', intensityPercent: 95, sprintType: 'max_velocity' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-neural-speed-v1', 'safety-low-structural-impact-v1', 'safety-masters-impact-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'High-speed exposure with full recovery and strict quality gating.',
  }),
  template({
    id: 'hill_sprints',
    title: 'Hill Sprints',
    modality: 'sprint',
    primaryEnergySystem: 'alactic_capacity',
    wizardKind: 'sprint',
    defaultDurationMin: 28,
    dose: { sprintMeters: 180, highImpactCount: 6, tissueStressLoad: 5 },
    sectionDose: { sprint: { totalMeters: 180, repDistanceMeters: 30, restSeconds: 120, surface: 'hill', intensityPercent: 90, sprintType: 'hill' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-structural-impact-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Lower top-speed sprint option for acceleration mechanics and posterior chain capacity.',
  }),
  template({
    id: 'resisted_sprints',
    title: 'Resisted Sprints',
    modality: 'sprint',
    primaryEnergySystem: 'alactic_power',
    wizardKind: 'sprint',
    defaultDurationMin: 30,
    dose: { sprintMeters: 160, highImpactCount: 6, tissueStressLoad: 6 },
    sectionDose: { sprint: { totalMeters: 160, repDistanceMeters: 20, restSeconds: 120, surface: 'turf', intensityPercent: 90, sprintType: 'resisted' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-neural-speed-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Acceleration-specific force application using controlled external resistance.',
  }),
  template({
    id: 'repeated_sprint_ability',
    title: 'Repeated Sprint Ability',
    modality: 'sprint',
    primaryEnergySystem: 'glycolytic_capacity',
    wizardKind: 'sprint',
    defaultDurationMin: 32,
    dose: { sprintMeters: 300, hiitMinutes: 8, highImpactCount: 10, tissueStressLoad: 8 },
    sectionDose: { sprint: { totalMeters: 300, repDistanceMeters: 30, restSeconds: 30, surface: 'turf', intensityPercent: 90, sprintType: 'repeated_sprint' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-structural-impact-v1', 'safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Sport repeatability stimulus where fatigue is intended but still quality-capped.',
  }),
  template({
    id: 'aerobic_base',
    title: 'Aerobic Base',
    modality: 'conditioning',
    primaryEnergySystem: 'aerobic_capacity',
    wizardKind: 'aerobic_tempo',
    defaultDurationMin: 35,
    dose: { aerobicMinutes: 35, tissueStressLoad: 3 },
    sectionDose: { aerobic: { durationMin: 35, hrZone: 2, targetRPE: 4 } },
    loadingStrategy: 'timed_sets',
    scienceNoteIds: intervalScience,
    rationale: 'Low-to-moderate aerobic work to support recovery and repeatability.',
  }),
  template({
    id: 'tempo',
    title: 'Tempo',
    modality: 'conditioning',
    primaryEnergySystem: 'aerobic_power',
    wizardKind: 'aerobic_tempo',
    defaultDurationMin: 32,
    dose: { aerobicMinutes: 28, tissueStressLoad: 4 },
    sectionDose: { aerobic: { durationMin: 28, hrZone: 3, targetRPE: 6 } },
    loadingStrategy: 'intervals',
    scienceNoteIds: intervalScience,
    rationale: 'Controlled sub-threshold conditioning that should feel repeatable, not maximal.',
  }),
  template({
    id: 'threshold',
    title: 'Threshold',
    modality: 'conditioning',
    primaryEnergySystem: 'aerobic_power',
    wizardKind: 'aerobic_tempo',
    defaultDurationMin: 35,
    dose: { aerobicMinutes: 24, tissueStressLoad: 5 },
    sectionDose: { aerobic: { durationMin: 24, hrZone: 4, targetRPE: 7 } },
    loadingStrategy: 'intervals',
    scienceNoteIds: intervalScience,
    rationale: 'Sustainable hard aerobic work to raise repeat output.',
  }),
  template({
    id: 'hiit',
    title: 'HIIT',
    modality: 'conditioning',
    primaryEnergySystem: 'glycolytic_power',
    wizardKind: 'hiit',
    defaultDurationMin: 30,
    dose: { hiitMinutes: 12, tissueStressLoad: 6 },
    sectionDose: { interval: { workSeconds: 60, restSeconds: 60, rounds: 10, modality: 'mixed', targetIntensity: 'vo2' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Hard intervals with explicit work, rest, rounds, and modality.',
  }),
  template({
    id: 'sit',
    title: 'Sprint Interval Training',
    modality: 'conditioning',
    primaryEnergySystem: 'glycolytic_power',
    wizardKind: 'hiit',
    defaultDurationMin: 28,
    dose: { hiitMinutes: 4, tissueStressLoad: 8 },
    sectionDose: { interval: { workSeconds: 30, restSeconds: 180, rounds: 6, modality: 'bike', targetIntensity: 'all_out' } },
    loadingStrategy: 'intervals',
    ageBands: ADULT_AGE_BANDS,
    safetyRuleIds: ['safety-youth-no-max-v1', 'safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'All-out interval exposure with long recovery and strict readiness gates.',
  }),
  template({
    id: 'mixed_intervals',
    title: 'Mixed Intervals',
    modality: 'conditioning',
    primaryEnergySystem: 'glycolytic_capacity',
    wizardKind: 'hiit',
    defaultDurationMin: 30,
    dose: { hiitMinutes: 14, tissueStressLoad: 6 },
    sectionDose: { interval: { workSeconds: 45, restSeconds: 75, rounds: 10, modality: 'mixed', targetIntensity: 'vo2' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Mixed modality intervals that preserve energy-system intent without random fatigue.',
  }),
  template({
    id: 'sport_round_conditioning',
    title: 'Sport-Round Conditioning',
    modality: 'conditioning',
    primaryEnergySystem: 'glycolytic_capacity',
    wizardKind: 'hiit',
    defaultDurationMin: 36,
    dose: { hiitMinutes: 18, circuitRounds: 6, tissueStressLoad: 7 },
    sectionDose: { interval: { workSeconds: 180, restSeconds: 60, rounds: 6, modality: 'bag', targetIntensity: 'sport_round' } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Round-based output that mirrors sport density while tracking actual rounds completed.',
  }),
  template({
    id: 'strength_endurance_circuit',
    title: 'Strength-Endurance Circuit',
    modality: 'circuit',
    primaryEnergySystem: 'local_muscular_endurance',
    wizardKind: 'circuit',
    defaultDurationMin: 30,
    dose: { circuitRounds: 4, hardSets: 12, tissueStressLoad: 6 },
    sectionDose: { circuit: { rounds: 4, movementCount: 5, workSeconds: 40, restSeconds: 20, scoreType: 'rounds', densityTarget: 'controlled repeatable rounds' } },
    loadingStrategy: 'circuit_rounds',
    scienceNoteIds: strengthScience,
    rationale: 'Circuit density for local fatigue resistance with clear rounds and movement count.',
  }),
  template({
    id: 'metabolic_circuit',
    title: 'Metabolic Circuit',
    modality: 'circuit',
    primaryEnergySystem: 'glycolytic_capacity',
    wizardKind: 'circuit',
    defaultDurationMin: 24,
    dose: { circuitRounds: 5, hiitMinutes: 15, tissueStressLoad: 7 },
    sectionDose: { circuit: { rounds: 5, movementCount: 6, workSeconds: 30, restSeconds: 15, scoreType: 'rounds', densityTarget: 'high output, stable mechanics' } },
    loadingStrategy: 'circuit_rounds',
    safetyRuleIds: ['safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Metabolic work with explicit density and stop rules.',
  }),
  template({
    id: 'bodyweight_circuit',
    title: 'Bodyweight Circuit',
    modality: 'circuit',
    primaryEnergySystem: 'local_muscular_endurance',
    wizardKind: 'circuit',
    defaultDurationMin: 22,
    dose: { circuitRounds: 4, tissueStressLoad: 4 },
    sectionDose: { circuit: { rounds: 4, movementCount: 5, workSeconds: 35, restSeconds: 25, scoreType: 'rounds', densityTarget: 'clean reps' } },
    loadingStrategy: 'circuit_rounds',
    scienceNoteIds: youthScience,
    rationale: 'Low-equipment work that can be scaled safely across experience levels.',
  }),
  template({
    id: 'kettlebell_circuit',
    title: 'Kettlebell Circuit',
    modality: 'circuit',
    primaryEnergySystem: 'glycolytic_capacity',
    wizardKind: 'circuit',
    defaultDurationMin: 26,
    dose: { circuitRounds: 4, tissueStressLoad: 6 },
    sectionDose: { circuit: { rounds: 4, movementCount: 5, workSeconds: 40, restSeconds: 20, scoreType: 'rounds', densityTarget: 'repeatable hinge and trunk quality' } },
    loadingStrategy: 'circuit_rounds',
    scienceNoteIds: strengthScience,
    rationale: 'Loaded density with hinge and trunk demand tracked as rounds, not tonnage alone.',
  }),
  template({
    id: 'sled_rope_circuit',
    title: 'Sled/Rope Circuit',
    modality: 'circuit',
    primaryEnergySystem: 'glycolytic_capacity',
    wizardKind: 'circuit',
    defaultDurationMin: 24,
    dose: { circuitRounds: 5, hiitMinutes: 12, tissueStressLoad: 6 },
    sectionDose: { circuit: { rounds: 5, movementCount: 4, workSeconds: 30, restSeconds: 30, scoreType: 'rounds', densityTarget: 'power endurance' } },
    loadingStrategy: 'circuit_rounds',
    safetyRuleIds: ['safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Low-skill high-output conditioning with clear density and fatigue management.',
  }),
  template({
    id: 'combat_specific_circuit',
    title: 'Combat-Specific Circuit',
    modality: 'circuit',
    primaryEnergySystem: 'glycolytic_capacity',
    wizardKind: 'circuit',
    defaultDurationMin: 30,
    dose: { circuitRounds: 5, hiitMinutes: 15, tissueStressLoad: 6 },
    sectionDose: { circuit: { rounds: 5, movementCount: 6, workSeconds: 45, restSeconds: 30, scoreType: 'rounds', densityTarget: 'sport rhythm under fatigue' } },
    loadingStrategy: 'circuit_rounds',
    safetyRuleIds: ['safety-low-metabolic-hiit-v1'],
    scienceNoteIds: intervalScience,
    rationale: 'Sport-pattern fatigue with tracking for rounds, quality, and session RPE.',
  }),
  template({
    id: 'planned_cod',
    title: 'Planned COD',
    modality: 'agility',
    primaryEnergySystem: 'alactic_capacity',
    wizardKind: 'agility_cod',
    defaultDurationMin: 24,
    dose: { highImpactCount: 16, tissueStressLoad: 5 },
    sectionDose: { agility: { drillDistanceMeters: 10, reps: 8, directionChanges: 16, reactionComponent: false } },
    loadingStrategy: 'intervals',
    scienceNoteIds: youthScience,
    rationale: 'Change-of-direction mechanics with planned patterns and quality tracking.',
  }),
  template({
    id: 'reactive_agility',
    title: 'Reactive Agility',
    modality: 'agility',
    primaryEnergySystem: 'alactic_capacity',
    wizardKind: 'agility_cod',
    defaultDurationMin: 24,
    dose: { highImpactCount: 16, tissueStressLoad: 5 },
    sectionDose: { agility: { drillDistanceMeters: 8, reps: 8, directionChanges: 16, reactionComponent: true } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-neural-speed-v1'],
    scienceNoteIds: youthScience,
    rationale: 'Perception-action agility once planned COD quality is reliable.',
  }),
  template({
    id: 'footwork',
    title: 'Footwork',
    modality: 'agility',
    primaryEnergySystem: 'alactic_capacity',
    wizardKind: 'agility_cod',
    defaultDurationMin: 20,
    dose: { highImpactCount: 8, tissueStressLoad: 3 },
    sectionDose: { agility: { drillDistanceMeters: 6, reps: 10, directionChanges: 20, reactionComponent: false } },
    loadingStrategy: 'intervals',
    scienceNoteIds: youthScience,
    rationale: 'Low-cost movement rhythm and coordination work for sport transfer.',
  }),
  template({
    id: 'deceleration',
    title: 'Deceleration',
    modality: 'agility',
    primaryEnergySystem: 'tissue_capacity',
    wizardKind: 'agility_cod',
    defaultDurationMin: 22,
    dose: { highImpactCount: 12, tissueStressLoad: 5 },
    sectionDose: { agility: { drillDistanceMeters: 10, reps: 6, directionChanges: 12, reactionComponent: false } },
    loadingStrategy: 'intervals',
    safetyRuleIds: ['safety-low-structural-impact-v1'],
    scienceNoteIds: youthScience,
    rationale: 'Braking mechanics and tissue tolerance before harder cutting volumes.',
  }),
  template({
    id: 'mobility_flow',
    title: 'Mobility Flow',
    modality: 'mobility',
    primaryEnergySystem: 'parasympathetic_recovery',
    wizardKind: 'recovery',
    defaultDurationMin: 18,
    dose: { aerobicMinutes: 0, tissueStressLoad: 1 },
    sectionDose: { recovery: { durationMin: 18, checklistItems: ['hips', 't-spine', 'ankles', 'shoulders'], painScoreRequired: false, tightnessScoreRequired: true } },
    loadingStrategy: 'recovery_flow',
    scienceNoteIds: ['acwr-warning-only'],
    rationale: 'Low-cost movement restoration with simple completion and symptom tracking.',
  }),
  template({
    id: 'tissue_capacity',
    title: 'Tissue Capacity',
    modality: 'recovery',
    primaryEnergySystem: 'tissue_capacity',
    wizardKind: 'recovery',
    defaultDurationMin: 25,
    dose: { tissueStressLoad: 2 },
    sectionDose: { recovery: { durationMin: 25, checklistItems: ['isometrics', 'slow eccentrics', 'balance', 'range'], painScoreRequired: true, tightnessScoreRequired: true } },
    loadingStrategy: 'recovery_flow',
    scienceNoteIds: youthScience,
    rationale: 'Low-intensity tissue work to rebuild tolerance without another hard session.',
  }),
  template({
    id: 'breathwork',
    title: 'Breathwork',
    modality: 'recovery',
    primaryEnergySystem: 'parasympathetic_recovery',
    wizardKind: 'recovery',
    defaultDurationMin: 10,
    dose: { tissueStressLoad: 0 },
    sectionDose: { recovery: { durationMin: 10, checklistItems: ['nasal breathing', 'long exhale', 'downshift'], painScoreRequired: false, tightnessScoreRequired: false } },
    loadingStrategy: 'recovery_flow',
    scienceNoteIds: ['acwr-warning-only'],
    rationale: 'Short down-regulation session when recovery is the goal.',
  }),
  template({
    id: 'easy_aerobic_flush',
    title: 'Easy Aerobic Flush',
    modality: 'recovery',
    primaryEnergySystem: 'aerobic_capacity',
    wizardKind: 'aerobic_tempo',
    defaultDurationMin: 20,
    dose: { aerobicMinutes: 20, tissueStressLoad: 1 },
    sectionDose: { aerobic: { durationMin: 20, hrZone: 1, targetRPE: 3 } },
    loadingStrategy: 'timed_sets',
    scienceNoteIds: ['acwr-warning-only'],
    rationale: 'Easy cyclic work to maintain rhythm and support recovery.',
  }),
];

export function getTrackingSchema(schemaId: string): TrackingSchemaDefinition | null {
  return TRACKING_SCHEMAS.find((schema) => schema.id === schemaId) ?? null;
}

export function getSessionTemplate(sessionFamily: SCSessionFamily): SessionTemplateResource | null {
  return SESSION_TEMPLATES.find((templateResource) => templateResource.id === sessionFamily) ?? null;
}

export function resolveWizardKindForSessionFamily(sessionFamily: SCSessionFamily): TrackingWizardKind {
  return getSessionTemplate(sessionFamily)?.wizardKind ?? 'strength';
}

export function mapConditioningTypeToSessionFamily(type: ConditioningType): SCSessionFamily {
  switch (type) {
    case 'circuit':
      return 'strength_endurance_circuit';
    case 'agility_drills':
      return 'planned_cod';
    case 'assault_bike':
    case 'rowing':
    case 'bike_erg':
    case 'ski_erg':
    case 'interval_medley':
      return 'hiit';
    case 'swimming':
    case 'jump_rope':
      return 'aerobic_base';
    case 'sled_work':
      return 'sled_rope_circuit';
    case 'heavy_bag_rounds':
    case 'sport_specific_drill':
      return 'sport_round_conditioning';
    default:
      return 'mixed_intervals';
  }
}

export function resolveLegacySCSessionFamily(input: {
  focus: WorkoutFocus | 'strength';
  primaryAdaptation: WorkoutPrescriptionV2['primaryAdaptation'];
  legacySessionFamily?: string | null;
  conditioningType?: ConditioningType | null;
}): SCSessionFamily {
  if (input.conditioningType) return mapConditioningTypeToSessionFamily(input.conditioningType);
  if (input.legacySessionFamily === 'durability_core') return 'durability';
  if (input.legacySessionFamily === 'conditioning') return 'hiit';
  if (input.legacySessionFamily === 'recovery' || input.focus === 'recovery') return 'mobility_flow';
  if (input.focus === 'conditioning') return 'hiit';
  if (input.focus === 'sport_specific') return 'combat_specific_circuit';
  if (input.primaryAdaptation === 'power') return 'med_ball_power';
  if (input.primaryAdaptation === 'conditioning') return 'hiit';
  if (input.primaryAdaptation === 'recovery') return 'mobility_flow';
  if (input.focus === 'upper_push' || input.focus === 'upper_pull' || input.focus === 'lower') return 'max_strength';
  return 'strength_endurance';
}

export function buildSessionPrescriptionFromTemplate(sessionFamily: SCSessionFamily): SessionPrescription {
  const templateResource = getSessionTemplate(sessionFamily);
  if (!templateResource) {
    throw new Error(`Unknown S&C session family: ${sessionFamily}`);
  }

  const trackingSchema = getTrackingSchema(templateResource.trackingSchemaId);
  if (!trackingSchema) {
    throw new Error(`Missing tracking schema: ${templateResource.trackingSchemaId}`);
  }

  const progressionModel = PROGRESSION_MODELS.find((model) => model.id === templateResource.progressionModelId);
  if (!progressionModel) {
    throw new Error(`Missing progression model: ${templateResource.progressionModelId}`);
  }

  const scienceNotes = templateResource.scienceNoteIds
    .map((id) => SCIENCE_NOTES.find((note) => note.id === id))
    .filter((note): note is ScienceNote => Boolean(note));

  const safetyFlags: SafetyFlag[] = templateResource.safetyRuleIds.map((id) => {
    const rule = SAFETY_RULES.find((candidate) => candidate.id === id);
    return {
      code: id,
      level: rule?.id.includes('youth') || rule?.id.includes('impact') ? 'restricted' : 'caution',
      message: rule?.rationale ?? 'Safety rule applies to this session.',
    };
  });

  return {
    sessionFamily: templateResource.id,
    primaryAdaptation: primaryAdaptationFor(templateResource.modality),
    energySystem: templateResource.primaryEnergySystem,
    modality: templateResource.modality,
    sections: templateResource.sections,
    dose: templateResource.dose,
    trackingSchema,
    progressionModel,
    safetyFlags,
    rationale: templateResource.rationale,
    wizardKind: templateResource.wizardKind,
    scienceNotes,
  };
}

export function buildLegacySessionPrescription(input: {
  focus: WorkoutFocus | 'strength';
  primaryAdaptation: WorkoutPrescriptionV2['primaryAdaptation'];
  legacySessionFamily?: string | null;
  conditioningType?: ConditioningType | null;
}): SessionPrescription {
  return buildSessionPrescriptionFromTemplate(resolveLegacySCSessionFamily(input));
}

export function validateSCProgrammingResources(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const templateIds = new Set(SESSION_TEMPLATES.map((templateResource) => templateResource.id));
  const requiredModalities: SCModality[] = ['strength', 'power', 'plyometric', 'sprint', 'conditioning', 'circuit', 'agility', 'mobility', 'recovery'];
  const exerciseModalities = new Set(EXERCISE_LIBRARY_RESOURCES.map((exercise) => exercise.modality).filter(Boolean));

  for (const modality of requiredModalities) {
    if (!exerciseModalities.has(modality)) {
      errors.push(`Missing exercise resources for modality: ${modality}`);
    }
  }

  for (const exercise of EXERCISE_LIBRARY_RESOURCES) {
    if (!exercise.modality) errors.push(`${exercise.id} is missing modality`);
    if (!exercise.tracking_schema_id || !getTrackingSchema(exercise.tracking_schema_id)) {
      errors.push(`${exercise.id} references missing tracking schema ${exercise.tracking_schema_id ?? 'none'}`);
    }
    if (!exercise.progression_family) errors.push(`${exercise.id} is missing progression family`);
    if (!exercise.energy_systems || exercise.energy_systems.length === 0) {
      errors.push(`${exercise.id} is missing energy systems`);
    }
    if (!exercise.youth_suitability) errors.push(`${exercise.id} is missing youth suitability`);
  }

  for (const family of REQUIRED_SC_SESSION_FAMILIES) {
    if (!templateIds.has(family)) errors.push(`Missing session template: ${family}`);
  }

  for (const templateResource of SESSION_TEMPLATES) {
    if (!getTrackingSchema(templateResource.trackingSchemaId)) {
      errors.push(`${templateResource.id} references missing tracking schema ${templateResource.trackingSchemaId}`);
    }
    if (!PROGRESSION_MODELS.some((model) => model.id === templateResource.progressionModelId && model.appliesTo.includes(templateResource.id))) {
      errors.push(`${templateResource.id} references invalid progression model ${templateResource.progressionModelId}`);
    }
    if (templateResource.sections.length === 0) {
      errors.push(`${templateResource.id} has no sections`);
    }
    if (templateResource.compatibleAgeBands.length === 0) {
      errors.push(`${templateResource.id} has no age-band policy`);
    }
    if (templateResource.scienceNoteIds.some((id) => !SCIENCE_NOTES.some((note) => note.id === id))) {
      errors.push(`${templateResource.id} references a missing science note`);
    }
    if (templateResource.safetyRuleIds.some((id) => !SAFETY_RULES.some((rule) => rule.id === id))) {
      errors.push(`${templateResource.id} references a missing safety rule`);
    }
  }

  for (const schema of TRACKING_SCHEMAS) {
    if (schema.requiredFields.length === 0) {
      errors.push(`${schema.id} has no required fields`);
    }
    if (schema.summaryFields.length === 0) {
      errors.push(`${schema.id} has no summary fields`);
    }
  }

  return { valid: errors.length === 0, errors };
}
