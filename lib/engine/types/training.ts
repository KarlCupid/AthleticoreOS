import type {
  Equipment,
  ExerciseType,
  FitnessLevel,
  MuscleGroup,
  Phase,
  ReadinessState,
  TrainingAge,
  WorkoutFocus,
  WorkoutType,
} from './foundational.ts';
import type {
  AdjustmentType,
  FeedbackSeverity,
  HRZone,
  MovementPattern,
  SessionFatigueState,
} from './misc.ts';
import type { CampConfig, CampPhase } from './camp.ts';
import type {
  MEDStatus,
  ReadinessProfile,
  StimulusConstraintSet,
} from './readiness.ts';
import type {
  DailyTimelineRow,
  RecurringActivityRow,
  ScheduledActivityRow,
} from './schedule.ts';
import type { PerformanceGoalType } from './foundational.ts';
import type { WeightClassPlanRow } from './weightClassPlan.ts';

export interface ExerciseLibraryRow {
  id: string;
  name: string;
  type: ExerciseType;
  cns_load: number;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  description: string;
  cues: string;
  sport_tags: string[];
  movement_pattern?: MovementPattern | null;
  recovery_hours?: number | null;
  eccentric_damage?: 1 | 2 | 3 | 4 | 5 | null;
  interference_risk?: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | null;
  normalized_recovery_cost?: number | null;
  modality?: SCModality | null;
  energy_systems?: EnergySystem[] | null;
  skill_demand?: SkillDemand | null;
  tissue_stress?: TissueStress | null;
  axial_load?: LoadStressLevel | null;
  impact_level?: LoadStressLevel | null;
  eccentric_load?: LoadStressLevel | null;
  youth_suitability?: YouthSuitability | null;
  contraindication_tags?: string[] | null;
  progression_family?: ProgressionFamily | null;
  surface_tags?: SurfaceTag[] | null;
  tracking_schema_id?: string | null;
  resource_metadata?: Record<string, unknown> | null;
}

export interface WorkoutPrescription {
  focus: WorkoutFocus | 'strength';
  workoutType: WorkoutType;
  exercises: PrescribedExercise[];
  totalCNSBudget: number;
  usedCNS: number;
  message: string;
}

export interface PrescribedExercise {
  exercise: ExerciseLibraryRow;
  targetSets: number;
  targetReps: number;
  targetRPE: number;
  supersetGroup: number | null;
  score: number;
  recoveryCost?: number;
}

export interface ExerciseScoringContext {
  readinessState: ReadinessState;
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  phase: Phase;
  acwr: number;
  recentExerciseIds: string[];
  recentMuscleVolume: Record<MuscleGroup, number>;
  cnsBudgetRemaining: number;
  fitnessLevel: FitnessLevel;
  performanceGoalType?: PerformanceGoalType;
  performanceRiskLevel?: PerformanceRiskLevel;
  allowHighImpact?: boolean;
  blockPhase?: TrainingBlockPhase;
  recoveryBudget?: number;
  exerciseUsageSummary?: ExerciseUsageSummary;
}

export interface GenerateWorkoutInput {
  readinessState: ReadinessState;
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  phase: Phase;
  acwr: number;
  exerciseLibrary: ExerciseLibraryRow[];
  recentExerciseIds: string[];
  recentMuscleVolume: Record<MuscleGroup, number>;
  trainingDate?: string;
  focus?: WorkoutFocus;
  trainingIntensityCap?: number | null;
  fitnessLevel: FitnessLevel;
  trainingAge?: TrainingAge;
  complianceHistory28d?: number[];
}

export interface WorkoutLogRow {
  id: string;
  user_id: string;
  date: string;
  created_at?: string | null;
  weekly_plan_entry_id?: string | null;
  scheduled_activity_id?: string | null;
  gym_profile_id?: string | null;
  workout_type: WorkoutType;
  focus: WorkoutFocus | null;
  total_volume: number;
  total_sets: number;
  session_rpe: number | null;
  duration_minutes: number | null;
  notes: string | null;
  compliance_reason?: ComplianceReason | null;
  activation_rpe?: number | null;
  session_family?: SCSessionFamily | null;
  primary_modality?: SCModality | null;
  energy_system?: EnergySystem | null;
  dose_summary?: SessionDoseSummary | null;
  tracking_schema_id?: string | null;
  safety_flags?: SafetyFlag[] | null;
  sprint_meters?: number | null;
  plyo_contacts?: number | null;
  hiit_minutes?: number | null;
  aerobic_minutes?: number | null;
  circuit_rounds?: number | null;
  high_impact_count?: number | null;
  tissue_stress_load?: number | null;
}

export interface WorkoutSetLogRow {
  id: string;
  workout_log_id: string;
  exercise_library_id: string;
  superset_group: number | null;
  set_number: number;
  reps: number;
  weight_lbs: number;
  rpe: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  is_warmup: boolean;
}

export type AgeBand =
  | 'teen_13_17'
  | 'adult_18_49'
  | 'masters_50_64'
  | 'older_adult_65_plus';

export type SCModality =
  | 'strength'
  | 'power'
  | 'plyometric'
  | 'sprint'
  | 'conditioning'
  | 'circuit'
  | 'agility'
  | 'mobility'
  | 'recovery';

export type SCSessionFamily =
  | 'max_strength'
  | 'hypertrophy'
  | 'strength_endurance'
  | 'unilateral_strength'
  | 'durability'
  | 'olympic_lift_power'
  | 'med_ball_power'
  | 'loaded_jump_power'
  | 'contrast_power'
  | 'low_contact_plyometrics'
  | 'bounding'
  | 'hops'
  | 'lateral_plyometrics'
  | 'depth_drop_progression'
  | 'acceleration'
  | 'max_velocity'
  | 'hill_sprints'
  | 'resisted_sprints'
  | 'repeated_sprint_ability'
  | 'aerobic_base'
  | 'tempo'
  | 'threshold'
  | 'hiit'
  | 'sit'
  | 'mixed_intervals'
  | 'sport_round_conditioning'
  | 'strength_endurance_circuit'
  | 'metabolic_circuit'
  | 'bodyweight_circuit'
  | 'kettlebell_circuit'
  | 'sled_rope_circuit'
  | 'combat_specific_circuit'
  | 'planned_cod'
  | 'reactive_agility'
  | 'footwork'
  | 'deceleration'
  | 'mobility_flow'
  | 'tissue_capacity'
  | 'breathwork'
  | 'easy_aerobic_flush';

export type EnergySystem =
  | 'alactic_power'
  | 'alactic_capacity'
  | 'glycolytic_power'
  | 'glycolytic_capacity'
  | 'aerobic_power'
  | 'aerobic_capacity'
  | 'local_muscular_endurance'
  | 'tissue_capacity'
  | 'parasympathetic_recovery';

export type TrackingWizardKind =
  | 'strength'
  | 'plyometric'
  | 'sprint'
  | 'hiit'
  | 'circuit'
  | 'aerobic_tempo'
  | 'agility_cod'
  | 'recovery';

export type DoseUnit =
  | 'hard_sets'
  | 'load_percent_1rm'
  | 'reps'
  | 'rpe'
  | 'rir'
  | 'rest_seconds'
  | 'tempo'
  | 'ground_contacts'
  | 'meters'
  | 'rep_distance_meters'
  | 'rep_seconds'
  | 'work_seconds'
  | 'rounds'
  | 'minutes'
  | 'hr_zone'
  | 'pace'
  | 'direction_changes'
  | 'quality_rating'
  | 'pain_flag';

export type ProgressionFamily =
  | 'load'
  | 'volume'
  | 'contact'
  | 'meter'
  | 'density'
  | 'pace'
  | 'quality'
  | 'range_of_motion';

export type SkillDemand = 'low' | 'moderate' | 'high' | 'elite';
export type TissueStress = 'low' | 'moderate' | 'high' | 'very_high';
export type LoadStressLevel = 'none' | 'low' | 'moderate' | 'high' | 'very_high';
export type YouthSuitability = 'suitable' | 'restricted' | 'coach_required' | 'not_recommended';
export type SurfaceTag = 'gym_floor' | 'track' | 'turf' | 'grass' | 'hill' | 'court' | 'mat' | 'pool' | 'bike' | 'rower' | 'sled_lane';

export interface SafetyFlag {
  code: string;
  level: 'info' | 'caution' | 'restricted';
  message: string;
}

export interface ModalityDose {
  strength?: {
    hardSets: number;
    reps: number | string;
    targetRPE: number;
    rir?: number | null;
    loadPercent1RM?: number | null;
    restSeconds: number;
    tempo?: string | null;
  };
  plyometric?: {
    groundContacts: number;
    jumpType: 'extensive' | 'intensive' | 'horizontal' | 'vertical' | 'lateral' | 'depth_drop';
    amplitude: 'low' | 'moderate' | 'high';
    surface: SurfaceTag;
    landingQualityRequired: boolean;
  };
  sprint?: {
    totalMeters: number;
    repDistanceMeters: number;
    targetRepSeconds?: number | null;
    restSeconds: number;
    surface: SurfaceTag;
    intensityPercent: number;
    sprintType: 'acceleration' | 'max_velocity' | 'hill' | 'resisted' | 'repeated_sprint';
  };
  interval?: {
    workSeconds: number;
    restSeconds: number;
    rounds: number;
    modality: 'run' | 'bike' | 'row' | 'ski' | 'jump_rope' | 'bag' | 'mixed';
    targetIntensity: 'threshold' | 'vo2' | 'all_out' | 'sport_round';
  };
  circuit?: {
    rounds: number;
    movementCount: number;
    workSeconds?: number | null;
    restSeconds?: number | null;
    scoreType: 'rounds' | 'for_time' | 'amrap' | 'completion';
    densityTarget?: string | null;
  };
  aerobic?: {
    durationMin: number;
    distanceMiles?: number | null;
    pace?: string | null;
    hrZone: HRZone;
    targetRPE: number;
  };
  agility?: {
    drillDistanceMeters: number;
    reps: number;
    directionChanges: number;
    reactionComponent: boolean;
  };
  recovery?: {
    durationMin: number;
    checklistItems: string[];
    painScoreRequired: boolean;
    tightnessScoreRequired: boolean;
  };
}

export interface SessionDoseSummary {
  hardSets?: number;
  sprintMeters?: number;
  plyoContacts?: number;
  hiitMinutes?: number;
  aerobicMinutes?: number;
  circuitRounds?: number;
  highImpactCount?: number;
  tissueStressLoad?: number;
}

export interface TrackingFieldDefinition {
  key: string;
  label: string;
  valueType: 'number' | 'text' | 'boolean' | 'rating' | 'duration' | 'select';
  unit?: string | null;
  required: boolean;
}

export interface TrackingSchemaDefinition {
  id: string;
  wizardKind: TrackingWizardKind;
  modality: SCModality;
  requiredFields: TrackingFieldDefinition[];
  summaryFields: DoseUnit[];
  completionMetric: DoseUnit | 'completion';
}

export interface ProgressionModelDefinition {
  id: string;
  family: ProgressionFamily;
  appliesTo: SCSessionFamily[];
  progressionUnit: DoseUnit;
  regressionUnit: DoseUnit;
  readinessGate: ReadinessState[];
  description: string;
}

export interface SafetyRuleDefinition {
  id: string;
  appliesTo: SCSessionFamily[];
  ageBands: AgeBand[];
  blockedWhen: string[];
  substitutionTarget: SCSessionFamily | 'recovery' | 'mobility';
  rationale: string;
}

export interface ScienceNote {
  id: string;
  label: string;
  sourceTitle: string;
  sourceUrl: string;
  summary: string;
}

export interface SessionTemplateSection {
  id: string;
  title: string;
  intent: string;
  loadingStrategy: LoadingStrategy;
  dose: ModalityDose;
}

export interface SessionTemplateResource {
  id: SCSessionFamily;
  title: string;
  modality: SCModality;
  primaryEnergySystem: EnergySystem;
  wizardKind: TrackingWizardKind;
  trackingSchemaId: string;
  progressionModelId: string;
  safetyRuleIds: string[];
  scienceNoteIds: string[];
  compatibleAgeBands: AgeBand[];
  defaultDurationMin: number;
  dose: SessionDoseSummary;
  sections: SessionTemplateSection[];
  rationale: string;
}

export interface SessionPrescription {
  sessionFamily: SCSessionFamily;
  primaryAdaptation: WorkoutPrescriptionV2['primaryAdaptation'];
  energySystem: EnergySystem;
  modality: SCModality;
  sections: SessionTemplateSection[];
  dose: SessionDoseSummary;
  trackingSchema: TrackingSchemaDefinition;
  progressionModel: ProgressionModelDefinition;
  safetyFlags: SafetyFlag[];
  rationale: string;
  wizardKind: TrackingWizardKind;
  scienceNotes: ScienceNote[];
}

export type WorkoutEffortKind =
  | 'strength_set'
  | 'plyo_set'
  | 'sprint_rep'
  | 'interval_round'
  | 'circuit_round'
  | 'aerobic_block'
  | 'agility_rep'
  | 'recovery_block';

export interface WorkoutEffortLogRow {
  id: string;
  workout_log_id: string;
  exercise_library_id: string | null;
  effort_kind: WorkoutEffortKind;
  effort_index: number;
  target_snapshot: Record<string, unknown>;
  actual_snapshot: Record<string, unknown>;
  actual_rpe: number | null;
  quality_rating: number | null;
  pain_flag: boolean;
  notes: string | null;
  completed_at: string;
}

export interface WorkoutEffortLogInput {
  exercise_library_id?: string | null;
  effort_kind: WorkoutEffortKind;
  effort_index: number;
  target_snapshot: Record<string, unknown>;
  actual_snapshot: Record<string, unknown>;
  actual_rpe?: number | null;
  quality_rating?: number | null;
  pain_flag?: boolean;
  notes?: string | null;
}

export interface WorkoutComplianceResult {
  setsCompletedPct: number;
  volumeCompliancePct: number;
  overall: 'Target Met' | 'Close Enough' | 'Missed It';
}

export interface AutoRegulateSCInput {
  boxingBlock: DailyTimelineRow;
  next24hBlocks: DailyTimelineRow[];
  exerciseLibrary: ExerciseLibraryRow[];
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
}

export interface AutoRegulateSCResult {
  swapped: boolean;
  originalBlockId: string | null;
  replacementType: ExerciseType | null;
  message: string;
}

export type EquipmentItem =
  | 'barbell'
  | 'dumbbells'
  | 'kettlebells'
  | 'cables'
  | 'pull_up_bar'
  | 'dip_station'
  | 'resistance_bands'
  | 'heavy_bag'
  | 'speed_bag'
  | 'double_end_bag'
  | 'medicine_balls'
  | 'battle_ropes'
  | 'sled'
  | 'assault_bike'
  | 'rowing_machine'
  | 'jump_rope'
  | 'squat_rack'
  | 'bench'
  | 'plyo_box'
  | 'trx'
  | 'smith_machine'
  | 'leg_press_machine'
  | 'cable_crossover'
  | 'lat_pulldown_machine';

export interface GymProfileRow {
  id: string;
  user_id: string;
  name: string;
  equipment: EquipmentItem[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ProgressionModel = 'linear' | 'wave' | 'block';

export type ComplianceReason =
  | 'FATIGUE'
  | 'TIME'
  | 'PAIN'
  | 'MOTIVATION'
  | 'EQUIPMENT'
  | 'OTHER';

export interface ExerciseRecoveryProfile {
  cnsLoad: 1 | 2 | 3 | 4 | 5;
  eccentricDamage: 1 | 2 | 3 | 4 | 5;
  recoveryHours: number;
  interferenceRisk: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  normalizedCost: number;
}

export interface ExerciseScore {
  fitScore: number;
  recoveryCost: number;
}

export interface ExerciseHistoryEntry {
  date: string;
  bestSetWeight: number;
  bestSetReps: number;
  bestSetRPE: number | null;
  totalVolume: number;
  workingSets: number;
  estimated1RM: number;
}

export interface ExerciseUsageEntry {
  daysSinceLastUse: number | null;
  uses7d: number;
  uses14d: number;
  uses28d: number;
}

export interface ExerciseUsageSummary {
  byExerciseId: Record<string, ExerciseUsageEntry>;
  uniqueExercisesByMuscle7d: Partial<Record<MuscleGroup, string[]>>;
}

export interface OverloadSuggestion {
  exerciseId: string;
  exerciseName: string;
  suggestedWeight: number;
  suggestedReps: number;
  suggestedRPE: number;
  lastSessionWeight: number;
  lastSessionReps: number;
  lastSessionRPE: number | null;
  progressionModel: ProgressionModel;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  isDeloadSet: boolean;
}

export interface OverloadInput {
  exerciseId: string;
  exerciseName: string;
  history: ExerciseHistoryEntry[];
  fitnessLevel: FitnessLevel;
  progressionModel: ProgressionModel;
  isDeloadWeek: boolean;
  readinessState: ReadinessState;
  targetRPE: number;
  targetReps: number;
  muscleGroup: MuscleGroup;
  sessionDate?: string;
  cycleStartDate?: string | null;
}

export interface DeloadDecisionInput {
  weeksSinceLastDeload: number;
  autoDeloadIntervalWeeks: number;
  acwr: number;
  readinessState: ReadinessState;
  recentSessionRPEs: number[];
  consecutiveCautionDays: number;
}

export interface DeloadDecisionResult {
  shouldDeload: boolean;
  reason: string;
  suggestedDurationWeeks: number;
}

export interface WarmupSet {
  setNumber: number;
  weight: number;
  reps: number;
  label: string;
  isCompleted: boolean;
}

export interface WarmupInput {
  workingWeight: number;
  exerciseType: ExerciseType;
  equipment: Equipment;
  isFirstExerciseForMuscle: boolean;
  fitnessLevel: FitnessLevel;
}

export interface WarmupResult {
  sets: WarmupSet[];
  totalWarmupSets: number;
  estimatedTimeMinutes: number;
}

export interface SetCompletionInput {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  actualWeight: number;
  actualReps: number;
  actualRPE: number;
  targetWeight: number;
  targetReps: number;
  targetRPE: number;
  currentFatigueState: SessionFatigueState;
  remainingExercises: PrescribedExerciseV2[];
  exerciseLibrary: ExerciseLibraryRow[];
  availableEquipment?: EquipmentItem[];
  primaryExerciseId?: string | null;
}

export interface ExerciseAdjustment {
  exerciseId: string;
  adjustmentType: AdjustmentType;
  originalValue: number;
  adjustedValue: number;
  swapExerciseId?: string;
  swapExerciseName?: string;
  reason: string;
}

export interface SetAdaptationResult {
  updatedFatigueState: SessionFatigueState;
  adjustments: ExerciseAdjustment[];
  shouldEndWorkoutEarly: boolean;
  endEarlyReason: string | null;
  feedbackMessage: string;
  feedbackSeverity: FeedbackSeverity;
}

export interface RestTimerConfig {
  exerciseType: ExerciseType;
  defaultSeconds: number;
  minSeconds: number;
  maxSeconds: number;
}

export interface SparringDayGuidance {
  preActivation: PrescribedExercise[];
  postRecovery: PrescribedExercise[];
  scRestriction: 'none' | 'activation_only' | 'recovery_only';
  message: string;
}

export interface CampSCModifier {
  sparringDaysThisWeek: number;
  scVolumeMultiplier: number;
  allowHeavyLifts: boolean;
  maxCNSBudget: number;
  recommendedFocus: WorkoutFocus;
}

export type RoadWorkType =
  | 'easy_run'
  | 'tempo'
  | 'intervals'
  | 'hill_sprints'
  | 'long_slow_distance'
  | 'recovery_jog';

export interface RoadWorkInterval {
  effortLabel: string;
  durationSec: number;
  restSec: number;
  zone: HRZone;
  repetitions: number;
}

export interface RoadWorkPrescription {
  type: RoadWorkType;
  totalDurationMin: number;
  targetDistanceMiles: number | null;
  hrZone: HRZone;
  hrZoneRange: [HRZone, HRZone];
  estimatedMaxHR: number | null;
  paceGuidance: string;
  warmupCooldownMin: number;
  intervals: RoadWorkInterval[];
  progressionNote: string;
  message: string;
  cnsBudget: number;
  estimatedLoad: number;
}

export interface WeeklyRoadWorkInput {
  weekStartDate: string;
  prescriptionsNeeded: number;
  recurringActivities: RecurringActivityRow[];
  existingActivities: ScheduledActivityRow[];
  fitnessLevel: FitnessLevel;
  phase: Phase;
  readinessState: ReadinessState;
  acwr: number;
  age: number | null;
  campConfig: CampConfig | null;
  activeWeightClassPlan: WeightClassPlanRow | null;
}

export type ConditioningType =
  | 'heavy_bag_rounds'
  | 'circuit'
  | 'jump_rope'
  | 'sled_work'
  | 'agility_drills'
  | 'sport_specific_drill'
  | 'assault_bike'
  | 'rowing'
  | 'swimming'
  | 'bike_erg'
  | 'ski_erg'
  | 'interval_medley';

export interface TimedWorkPrescription {
  format: 'emom' | 'amrap' | 'tabata' | 'timed_set' | 'for_time';
  totalDurationSec: number;
  workIntervalSec?: number;
  restIntervalSec?: number;
  roundCount?: number;
  targetRounds?: number;
}

export interface CircuitRoundPrescription {
  roundCount: number;
  restBetweenRoundsSec: number;
  movements: {
    exerciseId?: string;
    exerciseName: string;
    reps: number | null;
    durationSec: number | null;
    restSec: number;
  }[];
}

export interface ConditioningExercise {
  exerciseId?: string;
  name: string;
  durationSec: number | null;
  reps: number | null;
  rounds: number;
  restSec: number;
  timedWork?: TimedWorkPrescription;
  format?: 'steady_state' | 'intervals' | 'emom' | 'tabata' | 'amrap' | 'for_time';
}

export interface ConditioningPrescription {
  type: ConditioningType;
  totalDurationMin: number;
  rounds: number;
  workIntervalSec: number;
  restIntervalSec: number;
  exercises: ConditioningExercise[];
  intensityLabel: 'light' | 'moderate' | 'hard';
  message: string;
  cnsBudget: number;
  estimatedLoad: number;
  format?: 'rounds' | 'emom' | 'amrap' | 'tabata' | 'for_time' | 'intervals';
  circuitRound?: CircuitRoundPrescription;
  timedWork?: TimedWorkPrescription;
}

export interface WeeklyConditioningInput {
  weekStartDate: string;
  prescriptionsNeeded: number;
  recurringActivities: RecurringActivityRow[];
  existingActivities: ScheduledActivityRow[];
  fitnessLevel: FitnessLevel;
  phase: Phase;
  readinessState: ReadinessState;
  acwr: number;
  campConfig: CampConfig | null;
  activeWeightClassPlan: WeightClassPlanRow | null;
}

export type WorkoutDoseBucket =
  | 'strength'
  | 'conditioning'
  | 'durability'
  | 'recovery';

export interface SessionModulePlan {
  bucket: WorkoutDoseBucket;
  focus?: WorkoutFocus | null;
  durationMin?: number | null;
  preserveOnYellow?: boolean;
}

export interface WorkoutDoseCredit {
  bucket: WorkoutDoseBucket;
  credit: number;
  preservedBySubstitution: boolean;
  reason: string;
}

export interface WorkoutModuleBlock {
  bucket: WorkoutDoseBucket;
  title: string;
  focus: WorkoutFocus | null;
  durationMin: number;
  countedTowardDose: boolean;
}

export interface GenerateWorkoutInputV2 extends GenerateWorkoutInput {
  availableMinutes?: number;
  gymEquipment?: EquipmentItem[];
  exerciseHistory?: Map<string, ExerciseHistoryEntry[]>;
  scDayCount?: number;
  recentFocuses7d?: WorkoutFocus[];
  isDeloadWeek?: boolean;
  weeklyPlanFocus?: WorkoutFocus;
  sparringDaysThisWeek?: number;
  isSparringDay?: boolean;
  progressionModel?: ProgressionModel;
  performanceGoalType?: PerformanceGoalType;
  performanceRisk?: PerformanceRiskState | null;
  blockContext?: TrainingBlockContext | null;
  medStatus?: MEDStatus | null;
  sessionFamily?: import('./schedule.ts').TrainingSessionFamily | null;
  scSessionFamily?: SCSessionFamily | null;
  sessionModules?: SessionModulePlan[] | null;
}

export interface PrescribedExerciseV2 extends PrescribedExercise {
  suggestedWeight?: number;
  weightSuggestionReasoning?: string;
  warmupSets?: WarmupSet[];
  restSeconds?: number;
  formCues?: string;
  isSubstitute?: boolean;
  originalExerciseId?: string;
  originalExerciseName?: string;
  overloadSuggestion?: OverloadSuggestion;
  role?: ExerciseRole;
  loadingStrategy?: LoadingStrategy;
  progressionAnchor?: ProgressionAnchor | null;
  preferredExercise?: ExerciseLibraryRow;
  substitutions?: ExerciseSubstitution[];
  coachingCues?: string[];
  fatigueCost?: 'low' | 'moderate' | 'high';
  setScheme?: string;
  loadingNotes?: string;
  setPrescription?: ExerciseSetPrescription[];
  sectionId?: string;
  sectionTemplate?: WorkoutSectionTemplate;
  sectionIntent?: string;
  recoveryCost?: number;
  expectedActivationRPE?: number | null;
  modality?: SCModality | null;
  energySystem?: EnergySystem | null;
  modalityDose?: ModalityDose | null;
  trackingSchemaId?: string | null;
  wizardKind?: TrackingWizardKind | null;
  interferenceAdjustment?: {
    penalty: number;
    warning: string | null;
  } | null;
}

export type PerformanceRiskLevel = 'green' | 'yellow' | 'orange' | 'red';

export type TrainingBlockPhase = 'accumulate' | 'intensify' | 'realize' | 'pivot';

export type WorkoutSectionTemplate =
  | 'activation'
  | 'power'
  | 'main_strength'
  | 'secondary_strength'
  | 'accessory'
  | 'durability'
  | 'finisher'
  | 'cooldown';

export type ExerciseRole =
  | 'prep'
  | 'explosive'
  | 'anchor'
  | 'secondary'
  | 'accessory'
  | 'durability'
  | 'finisher'
  | 'recovery';

export type LoadingStrategy =
  | 'top_set_backoff'
  | 'straight_sets'
  | 'density_block'
  | 'intervals'
  | 'recovery_flow'
  | 'emom'
  | 'amrap'
  | 'tabata'
  | 'timed_sets'
  | 'for_time'
  | 'circuit_rounds';

export interface ProgressionAnchor {
  key: string;
  label: string;
  stableAcrossBlock: boolean;
  rotationCadence: 'block' | 'weekly' | 'session';
  rationale: string;
}

export interface ExerciseSubstitution {
  exerciseId: string;
  exerciseName: string;
  rationale: string;
  rank: number;
  preservesPattern: boolean;
  preservesStimulus: boolean;
  fatigueDelta: number;
}

export interface ExerciseSetPrescription {
  label: string;
  sets: number;
  reps: number | string;
  targetRPE: number;
  restSeconds: number;
  intensityNote?: string;
  timedWork?: TimedWorkPrescription;
  circuitRound?: CircuitRoundPrescription;
}

export interface SectionExercisePrescription extends PrescribedExerciseV2 {
  role: ExerciseRole;
  loadingStrategy: LoadingStrategy;
  progressionAnchor: ProgressionAnchor | null;
  preferredExercise: ExerciseLibraryRow;
  substitutions: ExerciseSubstitution[];
  coachingCues: string[];
  fatigueCost: 'low' | 'moderate' | 'high';
  setScheme: string;
  loadingNotes: string;
  setPrescription: ExerciseSetPrescription[];
  sectionId: string;
  sectionTemplate: WorkoutSectionTemplate;
  sectionIntent: string;
}

export interface WorkoutSessionSection {
  id: string;
  template: WorkoutSectionTemplate;
  title: string;
  intent: string;
  timeCap: number;
  restRule: string;
  densityRule: string | null;
  exercises: SectionExercisePrescription[];
  decisionTrace: string[];
  finisherReason?: string | null;
}

export interface PerformanceRiskState {
  level: PerformanceRiskLevel;
  intensityCap: number;
  volumeMultiplier: number;
  cnsMultiplier: number;
  allowHighImpact: boolean;
  reasons: string[];
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  requiresSubstitution?: boolean;
  protectMode?: boolean;
}

export interface TrainingBlockContext {
  weekInBlock: 1 | 2 | 3 | 4;
  phase: TrainingBlockPhase;
  volumeMultiplier: number;
  intensityOffset: number;
  focusBias: WorkoutFocus | null;
  note: string;
}

export interface WorkoutPrescriptionV2 extends WorkoutPrescription {
  exercises: PrescribedExerciseV2[];
  payloadVersion?: 'v2' | 'v3';
  sessionFamily?: import('./schedule.ts').TrainingSessionFamily | null;
  scSessionFamily?: SCSessionFamily | null;
  sessionComposition?: SessionModulePlan[] | null;
  secondaryAdaptations?: WorkoutDoseBucket[];
  plannedBucket?: WorkoutDoseBucket | null;
  realizedBucket?: WorkoutDoseBucket | null;
  moduleBlocks?: WorkoutModuleBlock[];
  doseCredits?: WorkoutDoseCredit[];
  estimatedDurationMin: number;
  isDeloadWorkout: boolean;
  equipmentProfile: string | null;
  campPhaseContext: CampPhase | null;
  weeklyPlanDay: number | null;
  sparringDayGuidance: SparringDayGuidance | null;
  sessionTemplate?: WorkoutSectionTemplate[];
  sessionGoal?: string | null;
  sections?: WorkoutSessionSection[];
  sessionIntent: string | null;
  primaryAdaptation: 'strength' | 'power' | 'conditioning' | 'recovery' | 'mixed';
  sessionPrescription?: SessionPrescription | null;
  modality?: SCModality | null;
  energySystem?: EnergySystem | null;
  trackingSchemaId?: string | null;
  doseSummary?: SessionDoseSummary | null;
  safetyFlags?: SafetyFlag[] | null;
  wizardKind?: TrackingWizardKind | null;
  performanceRisk: PerformanceRiskState | null;
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  medStatus?: MEDStatus | null;
  blockContext: TrainingBlockContext | null;
  decisionTrace: string[];
  expectedActivationRPE?: number | null;
  activationGuidance?: string | null;
  interferenceWarnings?: string[];
}

export interface CNSBudgetProfile {
  trainingAge: TrainingAge;
  fresh: number;
  moderate: number;
  depleted: number;
}

export type {
  FitnessLevel,
  MuscleGroup,
  PerformanceGoalType,
  ReadinessState,
  WorkoutFocus,
} from './foundational.ts';
export type {
  DayLoadValidation,
  ScheduledActivityRow,
} from './schedule.ts';
