export type WorkoutExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutIntensity = 'recovery' | 'low' | 'moderate' | 'hard';
export type WorkoutBlockKind = 'warmup' | 'main' | 'cooldown';
export type ExerciseCategory =
  | 'strength'
  | 'hypertrophy'
  | 'power'
  | 'conditioning'
  | 'cardio'
  | 'mobility'
  | 'flexibility'
  | 'balance'
  | 'recovery'
  | 'skill'
  | 'assessment'
  | 'prehab';
export type MovementPlane = 'sagittal' | 'frontal' | 'transverse' | 'multi_planar' | 'static';
export type ExerciseSetupType = 'floor' | 'standing' | 'seated' | 'bench' | 'machine' | 'rack' | 'supported' | 'locomotion';
export type ExerciseTechnicalComplexity = 'low' | 'moderate' | 'high' | 'coach_required';
export type ExerciseLoadability = 'none' | 'light' | 'low' | 'moderate' | 'high' | 'heavy' | 'maximal' | 'variable';
export type ExerciseDemandLevel = 'none' | 'low' | 'moderate' | 'high';
export type ExerciseSpineLoading = 'none' | 'low' | 'moderate' | 'high' | 'axial' | 'shear';
export type ExerciseSpaceRequired = 'mat' | 'small_space' | 'lane' | 'open_space' | 'machine_station' | 'outdoor';
export type PrescriptionKind =
  | 'resistance'
  | 'cardio'
  | 'interval'
  | 'mobility'
  | 'flexibility'
  | 'balance'
  | 'recovery'
  | 'power'
  | 'conditioning';
export type IntensityModel = 'rpe' | 'rir' | 'percent_1rm' | 'heart_rate_zone' | 'pace' | 'watts' | 'talk_test' | 'quality';
export type VolumeModel = 'sets_reps' | 'duration' | 'distance' | 'rounds' | 'contacts' | 'density' | 'holds';
export type RestModel = 'fixed' | 'range' | 'as_needed' | 'heart_rate_recovery' | 'quality_recovery' | 'none';
export type RuleType = 'progression' | 'regression' | 'deload';
export type DescriptionToneVariant = 'plain' | 'coach' | 'encouraging' | 'clinical' | 'concise';

export interface WorkoutTaxonomyItem {
  id: string;
  label: string;
  summary: string;
}

export interface MuscleGroup extends WorkoutTaxonomyItem {
  region: 'upper' | 'lower' | 'core' | 'full_body';
}

export interface EquipmentType extends WorkoutTaxonomyItem {
  category: 'bodyweight' | 'free_weight' | 'machine' | 'cardio' | 'accessory' | 'space';
}

export interface NumericRange {
  min?: number;
  max?: number;
  target?: number;
  unit?: string;
}

export interface TextRange {
  min?: string;
  max?: string;
  target?: string;
}

export interface ExercisePrescriptionRanges {
  sets?: NumericRange;
  reps?: NumericRange | TextRange;
  durationSeconds?: NumericRange;
  durationMinutes?: NumericRange;
  load?: NumericRange;
  rpe?: NumericRange;
  rir?: NumericRange;
  heartRateZone?: NumericRange | TextRange;
  pace?: NumericRange | TextRange;
  watts?: NumericRange;
  talkTest?: string;
  restSeconds?: NumericRange;
  holdSeconds?: NumericRange;
  rounds?: NumericRange;
  distance?: NumericRange;
  workSeconds?: NumericRange;
  restIntervalSeconds?: NumericRange;
  targetJoints?: string[];
  targetTissues?: string[];
  rangeOfMotionIntent?: string;
}

export interface ExerciseMedia {
  thumbnailUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  animationUrl?: string;
  altText?: string;
  attribution?: string;
}

export interface Exercise {
  id: string;
  name: string;
  shortName?: string;
  category?: ExerciseCategory;
  summary: string;
  coachingSummary: string;
  movementPatternIds: string[];
  subPatternIds?: string[];
  primaryMuscleIds: string[];
  secondaryMuscleIds: string[];
  jointsInvolved?: string[];
  planeOfMotion?: MovementPlane | MovementPlane[];
  equipmentIds: string[];
  equipmentRequiredIds?: string[];
  equipmentOptionalIds?: string[];
  setupType?: ExerciseSetupType;
  workoutTypeIds: string[];
  goalIds: string[];
  minExperience: WorkoutExperienceLevel;
  technicalComplexity?: ExerciseTechnicalComplexity;
  loadability?: ExerciseLoadability;
  fatigueCost?: ExerciseDemandLevel;
  intensity: WorkoutIntensity;
  impact: 'none' | 'low' | 'moderate' | 'high';
  spineLoading?: ExerciseSpineLoading;
  kneeDemand?: ExerciseDemandLevel;
  hipDemand?: ExerciseDemandLevel;
  shoulderDemand?: ExerciseDemandLevel;
  wristDemand?: ExerciseDemandLevel;
  ankleDemand?: ExerciseDemandLevel;
  balanceDemand?: ExerciseDemandLevel;
  cardioDemand?: ExerciseDemandLevel;
  spaceRequired?: ExerciseSpaceRequired[];
  homeFriendly?: boolean;
  gymFriendly?: boolean;
  beginnerFriendly?: boolean;
  regressionExerciseIds?: string[];
  progressionExerciseIds?: string[];
  substitutionExerciseIds?: string[];
  contraindicationFlags: string[];
  setupInstructions?: string[];
  executionInstructions?: string[];
  breathingInstructions?: string[];
  coachingCueIds?: string[];
  commonMistakeIds?: string[];
  safetyNotes?: string[];
  trackingMetricIds: string[];
  defaultPrescriptionRanges?: ExercisePrescriptionRanges;
  media?: ExerciseMedia;
  defaultPrescriptionTemplateId: string;
}

export interface PrescriptionIntensityTarget {
  RPE?: NumericRange;
  RIR?: NumericRange;
  percent1RM?: NumericRange;
  heartRateZone?: NumericRange | TextRange;
  pace?: NumericRange | TextRange;
  watts?: NumericRange;
  talkTest?: 'nasal_breathing' | 'conversational' | 'broken_sentences' | 'hard_to_speak' | string;
  quality?: string;
}

export interface PrescriptionVolumeTarget {
  sets?: NumericRange;
  reps?: NumericRange | TextRange;
  durationSeconds?: NumericRange;
  durationMinutes?: NumericRange;
  distance?: NumericRange;
  rounds?: NumericRange;
  contacts?: NumericRange;
  densityTarget?: string;
  workInterval?: NumericRange;
  restInterval?: NumericRange;
  holdDuration?: NumericRange;
  targetJoints?: string[];
  targetTissues?: string[];
  rangeOfMotionIntent?: string;
}

export interface ResistancePrescriptionPayload {
  kind: 'resistance';
  sets: NumericRange;
  reps?: string;
  repRange: NumericRange | TextRange;
  loadGuidance: string;
  intensityModel: Extract<IntensityModel, 'rpe' | 'rir' | 'percent_1rm'>;
  RPE: NumericRange;
  RIR?: NumericRange;
  percent1RM?: NumericRange;
  restSecondsRange: NumericRange;
  tempo: string;
  effortGuidance: string;
  mainLiftVsAccessory: 'main_lift' | 'accessory' | 'hypertrophy_accessory' | 'core_accessory';
  weeklyVolumeTarget?: NumericRange;
  progressionRuleIds: string[];
}

export interface CardioPrescriptionPayload {
  kind: 'cardio';
  durationMinutes: NumericRange;
  modality: 'bike' | 'rower' | 'walk' | 'run' | 'mixed_low_impact';
  heartRateZone: NumericRange | TextRange;
  RPE: NumericRange;
  talkTest: string;
  pace?: NumericRange | TextRange;
  watts?: NumericRange;
  progression: 'duration' | 'frequency' | 'duration_then_frequency';
  progressionRuleIds: string[];
}

export interface IntervalPrescriptionPayload {
  kind: 'interval';
  workIntervalSeconds: NumericRange;
  restIntervalSeconds: NumericRange;
  rounds: NumericRange;
  targetIntensity: PrescriptionIntensityTarget;
  impactLevel: Exercise['impact'];
  fatigueRisk: ExerciseDemandLevel;
  scalingOptions: {
    down: string;
    up: string;
  };
}

export interface MobilityPrescriptionPayload {
  kind: 'mobility';
  targetJoints: string[];
  rangeOfMotionIntent: string;
  reps: NumericRange | TextRange;
  holdTimeSeconds?: NumericRange;
  breathing: string;
  painFreeRange: boolean;
  endRangeControl: string;
}

export interface FlexibilityPrescriptionPayload {
  kind: 'flexibility';
  targetTissues: string[];
  targetJoints: string[];
  holdTimeSeconds: NumericRange;
  breathing: string;
  painFreeRange: boolean;
  rangeOfMotionIntent: string;
}

export interface BalancePrescriptionPayload {
  kind: 'balance';
  baseOfSupport: 'bilateral' | 'split_stance' | 'single_leg' | 'moving';
  surface: 'floor' | 'soft_surface' | 'line' | 'unstable';
  visualInput: 'eyes_open' | 'eyes_closed' | 'head_turns';
  mode: 'static' | 'dynamic';
  durationSeconds: NumericRange;
  complexityProgression: string[];
  fallRiskRules: string[];
}

export interface RecoveryPrescriptionPayload {
  kind: 'recovery';
  intensityCap: NumericRange;
  durationMinutes: NumericRange;
  breathingStrategy: string;
  circulationGoal: string;
  readinessAdjustment: string;
}

export interface PowerPrescriptionPayload {
  kind: 'power';
  sets: NumericRange;
  reps: NumericRange | TextRange;
  explosiveIntent: string;
  fullRecoverySeconds: NumericRange;
  technicalQuality: string;
  lowFatigue: boolean;
  movementSpeed: string;
  eligibilityRestrictions: string[];
}

export interface ConditioningPrescriptionPayload {
  kind: 'conditioning';
  workIntervalSeconds: NumericRange;
  restIntervalSeconds: NumericRange;
  rounds: NumericRange;
  targetIntensity: PrescriptionIntensityTarget;
  impactLevel: Exercise['impact'];
  fatigueRisk: ExerciseDemandLevel;
  densityTarget?: string;
  scalingOptions: {
    down: string;
    up: string;
  };
}

export type PrescriptionPayload =
  | ResistancePrescriptionPayload
  | CardioPrescriptionPayload
  | IntervalPrescriptionPayload
  | MobilityPrescriptionPayload
  | FlexibilityPrescriptionPayload
  | BalancePrescriptionPayload
  | RecoveryPrescriptionPayload
  | PowerPrescriptionPayload
  | ConditioningPrescriptionPayload;

export interface PrescriptionTemplate {
  id: string;
  label: string;
  kind: PrescriptionKind;
  payload: PrescriptionPayload;
  appliesToWorkoutTypeIds: string[];
  appliesToGoalIds?: string[];
  appliesToExerciseCategory?: ExerciseCategory[];
  defaultSets?: number;
  defaultReps?: string;
  defaultDurationSeconds?: number;
  defaultDurationMinutes?: number;
  defaultRpe: number;
  restSeconds: number;
  tempo?: string;
  intensityCue: string;
  intensityModel?: IntensityModel;
  targetIntensity?: PrescriptionIntensityTarget;
  volumeModel?: VolumeModel;
  targetVolume?: PrescriptionVolumeTarget;
  restModel?: RestModel;
  restGuidance?: string;
  tempoGuidance?: string;
  effortGuidance?: string;
  RPE?: NumericRange;
  RIR?: NumericRange;
  percent1RM?: NumericRange;
  heartRateZone?: NumericRange | TextRange;
  pace?: NumericRange | TextRange;
  watts?: NumericRange;
  talkTest?: PrescriptionIntensityTarget['talkTest'];
  workInterval?: NumericRange;
  restInterval?: NumericRange;
  rounds?: NumericRange;
  densityTarget?: string;
  targetJoints?: string[];
  targetTissues?: string[];
  holdDuration?: NumericRange;
  rangeOfMotionIntent?: string;
  progressionRuleIds?: string[];
  regressionRuleIds?: string[];
  deloadRuleIds?: string[];
  successCriteria?: string[];
  coachNotes?: string[];
  userFacingSummary?: string;
}

export interface SessionTemplateMovementSlot {
  id: string;
  blockId: string;
  movementPatternIds: string[];
  optional: boolean;
  order: number;
  preferredExerciseIds?: string[];
  avoidExerciseIds?: string[];
}

export interface SessionTemplateBlock {
  id: string;
  kind: WorkoutBlockKind;
  title: string;
  durationMinutes: number;
  prescriptionTemplateId: string;
}

export interface SessionTemplate {
  id: string;
  label: string;
  summary: string;
  workoutTypeId: string;
  goalIds: string[];
  formatId: string;
  minDurationMinutes: number;
  defaultDurationMinutes: number;
  maxDurationMinutes: number;
  experienceLevels: WorkoutExperienceLevel[];
  blocks: SessionTemplateBlock[];
  movementSlots: SessionTemplateMovementSlot[];
  successCriteria: string[];
}

export interface WorkoutProgrammingCatalog {
  workoutTypes: WorkoutTaxonomyItem[];
  trainingGoals: WorkoutTaxonomyItem[];
  workoutFormats: WorkoutTaxonomyItem[];
  movementPatterns: WorkoutTaxonomyItem[];
  muscleGroups: MuscleGroup[];
  equipmentTypes: EquipmentType[];
  exercises: Exercise[];
  prescriptionTemplates: PrescriptionTemplate[];
  sessionTemplates: SessionTemplate[];
  trackingMetrics: WorkoutTaxonomyItem[];
  assessmentMetrics: WorkoutTaxonomyItem[];
}

export interface ExerciseQuery {
  movementPatternIds?: string[];
  workoutTypeIds?: string[];
  goalIds?: string[];
  equipmentIds?: string[];
  excludedSafetyFlags?: string[];
  experienceLevel?: WorkoutExperienceLevel;
  limit?: number;
}

export interface GenerateSingleWorkoutInput {
  goalId: string;
  durationMinutes: number;
  equipmentIds: string[];
  experienceLevel: WorkoutExperienceLevel;
  safetyFlags?: string[];
}

export type WorkoutReadinessBand = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
export type SafetyFlagSeverity = 'info' | 'caution' | 'restriction' | 'block';
export type WorkoutScalingDirection = 'down' | 'up';

export interface WorkoutSafetyFlag {
  id: string;
  label: string;
  severity: SafetyFlagSeverity;
  summary: string;
  blocksHardTraining: boolean;
  contraindicationTags: string[];
  appliesToWorkoutTypeIds?: string[];
  appliesToGoalIds?: string[];
  appliesToExerciseIds?: string[];
  affectedJointIds?: string[];
  affectedMovementPatternIds?: string[];
  requiresProfessionalReview?: boolean;
  unknownDataHandling?: 'allow_with_caution' | 'restrict' | 'block';
  userFacingMessage?: string;
  coachNotes?: string[];
}

export interface RuleCondition {
  metricId?: string;
  operator?: '<' | '<=' | '=' | '>=' | '>' | 'includes' | 'excludes' | 'missing' | 'present';
  value?: string | number | boolean | null;
  windowDays?: number;
  explanation?: string;
}

export interface RuleAction {
  kind?: 'add_volume' | 'reduce_volume' | 'increase_load' | 'decrease_load' | 'swap_exercise' | 'change_intensity' | 'deload' | 'repeat';
  amount?: number;
  unit?: string;
  target?: string;
  explanation?: string;
}

export interface WorkoutRule {
  id: string;
  label: string;
  ruleType?: RuleType;
  appliesToWorkoutTypeIds?: string[];
  appliesToGoalIds: string[];
  appliesToExperienceLevels?: WorkoutExperienceLevel[];
  trigger: string;
  triggerConditions?: RuleCondition[];
  advanceWhen?: RuleCondition[];
  regressWhen?: RuleCondition[];
  action: string;
  progressionAction?: RuleAction;
  regressionAction?: RuleAction;
  deloadTrigger?: RuleCondition[];
  maxProgressionRate?: NumericRange;
  safetyOverride?: {
    blockingFlagIds?: string[];
    restrictionFlagIds?: string[];
    missingDataBehavior?: 'repeat' | 'regress' | 'recover' | 'block';
  };
  requiredTrackingMetricIds?: string[];
  userMessage?: string;
  coachNotes?: string[];
  explanation: string;
}

export interface ProgressionRule extends WorkoutRule {
  ruleType?: 'progression';
}

export interface RegressionRule extends WorkoutRule {
  ruleType?: 'regression';
}

export interface DeloadRule extends WorkoutRule {
  ruleType?: 'deload';
}

export interface SubstitutionRule {
  id: string;
  sourceExerciseId: string;
  substituteExerciseIds: string[];
  conditionFlags: string[];
  rationale: string;
}

export interface CoachingCueSet {
  id: string;
  exerciseId: string;
  cues: string[];
}

export interface CommonMistakeSet {
  id: string;
  exerciseId: string;
  mistakes: string[];
}

export interface DescriptionTemplate {
  id: string;
  appliesToGoalIds: string[];
  summaryTemplate: string;
  toneVariant?: DescriptionToneVariant;
  sessionIntent?: string;
  plainLanguageSummary?: string;
  coachExplanation?: string;
  effortExplanation?: string;
  whyThisMatters?: string;
  howItShouldFeel?: string;
  successCriteria?: string[];
  scalingDown?: string;
  scalingUp?: string;
  formFocus?: string[];
  breathingFocus?: string;
  commonMistakes?: string[];
  safetyNotes?: string[];
  recoveryExpectation?: string;
  completionMessage?: string;
  nextSessionNote?: string;
}

export interface ValidationRule {
  id: string;
  label: string;
  appliesToWorkoutTypeIds?: string[];
  appliesToGoalIds?: string[];
  failureCondition?: RuleCondition | RuleCondition[] | string;
  severity: 'warning' | 'error';
  explanation: string;
  correction?: string;
  userFacingMessage?: string;
  testCases?: {
    name: string;
    input: Record<string, unknown>;
    expectedValid: boolean;
    expectedMessages?: string[];
  }[];
}

export interface WorkoutIntelligenceCatalog {
  progressionRules: ProgressionRule[];
  regressionRules: RegressionRule[];
  deloadRules: DeloadRule[];
  substitutionRules: SubstitutionRule[];
  safetyFlags: WorkoutSafetyFlag[];
  coachingCueSets: CoachingCueSet[];
  commonMistakeSets: CommonMistakeSet[];
  descriptionTemplates: DescriptionTemplate[];
  validationRules: ValidationRule[];
}

export interface PersonalizedWorkoutInput extends GenerateSingleWorkoutInput {
  readinessBand?: WorkoutReadinessBand;
  painFlags?: string[];
  dislikedExerciseIds?: string[];
  preferredDurationMinutes?: number;
  recentCompletedWorkoutIds?: string[];
  priorExerciseOutcomes?: ExerciseCompletionResult[];
}

export interface GeneratedExercisePrescription {
  exerciseId: string;
  name: string;
  blockId: string;
  movementPatternIds: string[];
  primaryMuscleIds: string[];
  equipmentIds: string[];
  prescription: {
    sets: number | null;
    reps: string | null;
    durationSeconds: number | null;
    durationMinutes: number | null;
    targetRpe: number;
    restSeconds: number;
    tempo: string | null;
    intensityCue: string;
    kind: PrescriptionKind;
    payload: PrescriptionPayload;
  };
  trackingMetricIds: string[];
  explanation: string;
  substitutions?: {
    exerciseId: string;
    name: string;
    rationale: string;
  }[];
  scalingOptions?: {
    down: string;
    up: string;
  };
  coachingCues?: string[];
  commonMistakes?: string[];
}

export interface GeneratedWorkoutBlock {
  id: string;
  kind: WorkoutBlockKind;
  title: string;
  estimatedDurationMinutes: number;
  exercises: GeneratedExercisePrescription[];
}

export interface GeneratedWorkoutScalingOptions {
  down?: string;
  up?: string;
  substitutions?: string[];
  recoveryAlternative?: string;
}

export interface WorkoutDecisionTraceEntry {
  id: string;
  step: string;
  reason: string;
  selectedId?: string;
  rejectedIds?: string[];
  safetyFlagIds?: string[];
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface GeneratedWorkout {
  schemaVersion: 'generated-workout-v1';
  workoutTypeId: string;
  goalId: string;
  templateId: string;
  formatId: string;
  sessionIntent?: string;
  userFacingSummary?: string;
  requestedDurationMinutes: number;
  estimatedDurationMinutes: number;
  equipmentIds: string[];
  safetyFlags: string[];
  blocks: GeneratedWorkoutBlock[];
  trackingMetricIds: string[];
  successCriteria: string[];
  coachingNotes?: string[];
  scalingOptions?: GeneratedWorkoutScalingOptions;
  safetyNotes?: string[];
  explanations: string[];
  blocked?: boolean;
  validationWarnings?: string[];
  validationErrors?: string[];
  progressionRecommendation?: ProgressionDecision;
  decisionTrace?: WorkoutDecisionTraceEntry[];
}

export interface WorkoutValidationResult {
  valid: boolean;
  errors: string[];
}

export interface WorkoutCompletionLog {
  workoutId: string;
  completedAt: string;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  sessionRpe: number;
  painScoreBefore?: number | null;
  painScoreAfter?: number | null;
  notes?: string | null;
  exerciseResults: ExerciseCompletionResult[];
}

export interface ExerciseCompletionResult {
  exerciseId: string;
  setsCompleted: number;
  repsCompleted?: number | null;
  durationSecondsCompleted?: number | null;
  loadUsed?: number | null;
  actualRpe?: number | null;
  painScore?: number | null;
  completedAsPrescribed: boolean;
}

export interface ProgressionDecision {
  direction: 'progress' | 'repeat' | 'regress' | 'recover';
  reason: string;
  nextAdjustment: string;
  safetyFlags: string[];
}

export interface UserWorkoutProfile {
  userId: string;
  equipmentIds: string[];
  experienceLevel: WorkoutExperienceLevel;
  safetyFlags: string[];
  dislikedExerciseIds: string[];
  preferredDurationMinutes: number;
  readinessBand: WorkoutReadinessBand;
  painFlags: string[];
}

export interface ProtectedWorkoutInput {
  id: string;
  label: string;
  dayIndex: number;
  durationMinutes: number;
  intensity: WorkoutIntensity;
}

export interface GeneratedProgramSession {
  id: string;
  dayIndex: number;
  weekIndex: number;
  protectedAnchor: boolean;
  label: string;
  workout: GeneratedWorkout | null;
}

export interface GeneratedProgram {
  id: string;
  goalId: string;
  weekCount: number;
  sessions: GeneratedProgramSession[];
  explanations: string[];
  validationWarnings: string[];
}

export interface WorkoutAnalyticsSummary {
  workoutsPlanned: number;
  workoutsCompleted: number;
  adherenceRate: number;
  averageSessionRpe: number | null;
  totalCompletedSets: number;
  painTrend: 'none' | 'improving' | 'stable' | 'worsening';
  recommendationQualityScore: number;
  warnings: string[];
  summary: string;
}
