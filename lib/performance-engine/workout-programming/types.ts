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
export type ContentReviewStatus = 'draft' | 'needs_review' | 'approved' | 'rejected';
export type SafetyReviewStatus = 'not_required' | 'needs_review' | 'approved' | 'rejected';
export type ContentRiskLevel = 'low' | 'moderate' | 'high';
export type ContentRolloutEligibility = 'dev_only' | 'preview' | 'production' | 'blocked';
export type ExerciseMediaPriority = 'low' | 'medium' | 'high';
export type DescriptionToneVariant =
  | 'beginner_friendly'
  | 'coach_like'
  | 'clinical'
  | 'motivational'
  | 'minimal'
  | 'detailed'
  | 'athletic'
  | 'rehab_informed'
  | 'data_driven';
export type DescriptionEntityType = 'goal' | 'workout_type' | 'session_template' | 'exercise' | 'program';

export interface ReviewableContentFields {
  reviewStatus?: ContentReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string[];
  safetyReviewStatus?: SafetyReviewStatus;
  contentVersion?: string;
  lastUpdatedAt?: string;
  riskLevel?: ContentRiskLevel;
  rolloutEligibility?: ContentRolloutEligibility;
}

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
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  animationUrl?: string | null;
  altText?: string;
  attribution?: string;
  reviewStatus?: ContentReviewStatus;
  missingReason?: string;
  priority?: ExerciseMediaPriority;
}

export interface Exercise extends ReviewableContentFields {
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

export interface PrescriptionTemplate extends ReviewableContentFields {
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

export type RuntimeValidationRecordType =
  | 'ContentPack'
  | 'WorkoutProgrammingCatalog'
  | 'WorkoutIntelligenceCatalog'
  | 'WorkoutTaxonomyItem'
  | 'MuscleGroup'
  | 'EquipmentType'
  | 'Exercise'
  | 'PrescriptionTemplate'
  | 'SessionTemplate'
  | 'SessionTemplateBlock'
  | 'SessionTemplateMovementSlot'
  | 'DescriptionTemplate'
  | 'ValidationRule'
  | 'SubstitutionRule'
  | 'WorkoutSafetyFlag'
  | 'CoachingCueSet'
  | 'CommonMistakeSet'
  | 'ProgressionRule'
  | 'RegressionRule'
  | 'DeloadRule'
  | 'GeneratedWorkout'
  | 'GeneratedWorkoutBlock'
  | 'GeneratedExercisePrescription';

export interface RuntimeValidationIssue {
  recordType: RuntimeValidationRecordType;
  id?: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
  suggestedCorrection: string;
}

export interface RuntimeValidationResult {
  valid: boolean;
  errors: RuntimeValidationIssue[];
  warnings: RuntimeValidationIssue[];
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
  preferredExerciseIds?: string[];
  dislikedExerciseIds?: string[];
  readinessBand?: WorkoutReadinessBand;
  workoutEnvironment?: 'home' | 'gym' | 'outdoor' | 'travel' | 'unknown';
  preferredToneVariant?: DescriptionToneVariant;
}

export type WorkoutReadinessBand = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
export type SafetyFlagSeverity = 'info' | 'caution' | 'restriction' | 'block';
export type WorkoutScalingDirection = 'down' | 'up';

export interface WorkoutSafetyFlag extends ReviewableContentFields {
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

export interface WorkoutRule extends ReviewableContentFields {
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

export type SubstitutionSkillLevelMatch = 'same_or_lower' | 'same' | 'any';
export type SubstitutionGoalMatch = 'same_goal' | 'same_workout_type' | 'same_pattern' | 'any';

export interface SubstitutionPrescriptionAdjustment {
  setsDelta?: number;
  repsDelta?: number;
  durationMinutesDelta?: number;
  durationSecondsDelta?: number;
  targetRpeDelta?: number;
  restSecondsDelta?: number;
  note: string;
}

export interface SubstitutionRule extends ReviewableContentFields {
  id: string;
  sourceExerciseId: string;
  sourceMovementPatternIds?: string[];
  acceptableReplacementIds?: string[];
  replacementPriority?: string[];
  reason?: string;
  requiredEquipmentIds?: string[];
  excludedEquipmentIds?: string[];
  supportedSafetyFlags?: string[];
  excludedSafetyFlags?: string[];
  skillLevelMatch?: SubstitutionSkillLevelMatch;
  goalMatch?: SubstitutionGoalMatch;
  prescriptionAdjustment?: SubstitutionPrescriptionAdjustment;
  coachingNote?: string;
  substituteExerciseIds?: string[];
  conditionFlags?: string[];
  rationale?: string;
}

export interface ExerciseSubstitutionOption {
  exerciseId: string;
  name: string;
  rationale: string;
  score?: number;
  scoreTrace?: ExerciseSelectionScoreTrace;
  matchedRuleId?: string;
  prescriptionAdjustment?: SubstitutionPrescriptionAdjustment;
  coachingNote?: string;
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

export interface DescriptionTemplate extends ReviewableContentFields {
  id: string;
  descriptionTemplateId?: string;
  appliesToEntityType?: DescriptionEntityType;
  appliesToEntityId?: string;
  appliesToGoalIds?: string[];
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

export interface WorkoutDescription {
  descriptionTemplateId: string;
  toneVariant: DescriptionToneVariant;
  intro: string;
  sessionIntent: string;
  plainLanguageSummary: string;
  coachExplanation: string;
  effortExplanation: string;
  whyThisMatters: string;
  howItShouldFeel: string;
  safetyNotes: string[];
  successCriteria: string[];
  scalingDown: string;
  scalingUp: string;
  formFocus: string[];
  breathingFocus: string;
  commonMistakes: string[];
  recoveryExpectation: string;
  completionMessage: string;
  nextSessionNote: string;
}

export interface GenerateWorkoutDescriptionOptions {
  toneVariant?: DescriptionToneVariant;
  descriptionTemplateId?: string;
  templates?: DescriptionTemplate[];
}

export interface ValidationRule extends ReviewableContentFields {
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
  userId?: string;
  readinessBand?: WorkoutReadinessBand;
  painFlags?: string[];
  dislikedExerciseIds?: string[];
  likedExerciseIds?: string[];
  preferredDurationMinutes?: number;
  availableTimeRange?: {
    minMinutes?: number;
    maxMinutes?: number;
  };
  workoutEnvironment?: 'home' | 'gym' | 'outdoor' | 'travel' | 'unknown';
  sorenessLevel?: number;
  sleepQuality?: number;
  energyLevel?: number;
  recentWorkoutCompletions?: WorkoutCompletionLog[];
  recentProgressionDecisions?: ProgressionDecision[];
  protectedWorkouts?: ProtectedWorkoutInput[];
  preferredToneVariant?: DescriptionToneVariant;
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
  prescriptionTemplateId?: string;
  scoreTrace?: ExerciseSelectionScoreTrace;
  substitutions?: ExerciseSubstitutionOption[];
  scalingOptions?: {
    down: string;
    up: string;
  };
  coachingCues?: string[];
  commonMistakes?: string[];
  media?: ExerciseMedia;
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

export type ExerciseSelectionFinalDecision =
  | 'selected'
  | 'candidate'
  | 'excluded'
  | 'rejected'
  | 'substitution_selected'
  | 'substitution_candidate'
  | 'substitution_excluded';

export interface ExerciseSelectionScoreTrace {
  exerciseId: string;
  slotId: string;
  totalScore: number;
  scoreBreakdown: Record<string, number>;
  includedReasons: string[];
  excludedReasons: string[];
  safetyFlagsApplied: string[];
  equipmentMatch: boolean;
  movementPatternMatch: boolean;
  goalMatch: boolean;
  workoutTypeMatch: boolean;
  experienceMatch: boolean;
  fatigueCostPenalty: number;
  technicalComplexityPenalty: number;
  jointDemandPenalty: number;
  preferenceAdjustment: number;
  substitutionAdjustment: number;
  finalDecision: ExerciseSelectionFinalDecision;
}

export interface GeneratedWorkoutGenerationTrace {
  selectedTemplateTrace?: WorkoutDecisionTraceEntry;
  selectedPrescriptionTrace?: WorkoutDecisionTraceEntry[];
  movementSlotTrace?: WorkoutDecisionTraceEntry[];
  exerciseSelectionTrace?: ExerciseSelectionScoreTrace[];
  substitutionTrace?: ExerciseSelectionScoreTrace[];
  validationTrace?: WorkoutValidationResult['decisionTrace'];
  fallbackTrace?: WorkoutDecisionTraceEntry[];
}

export interface GeneratedWorkout {
  schemaVersion: 'generated-workout-v1';
  workoutTypeId: string;
  goalId: string;
  trainingGoalLabel?: string;
  templateId: string;
  formatId: string;
  experienceLevel?: WorkoutExperienceLevel;
  sessionIntent?: string;
  userFacingSummary?: string;
  description?: WorkoutDescription;
  descriptions?: WorkoutDescription[];
  requestedDurationMinutes: number;
  estimatedDurationMinutes: number;
  equipmentIds: string[];
  safetyFlags: string[];
  blocks: GeneratedWorkoutBlock[];
  prescriptions?: GeneratedExercisePrescription['prescription'][];
  substitutions?: ExerciseSubstitutionOption[];
  trackingMetricIds: string[];
  trackingMetrics?: string[];
  successCriteria: string[];
  coachingNotes?: string[];
  scalingOptions?: GeneratedWorkoutScalingOptions;
  safetyNotes?: string[];
  explanations: string[];
  blocked?: boolean;
  validationWarnings?: string[];
  validationErrors?: string[];
  validation?: WorkoutValidationResult;
  progressionRecommendation?: ProgressionDecision;
  decisionTrace?: WorkoutDecisionTraceEntry[];
  generationTrace?: GeneratedWorkoutGenerationTrace;
  exerciseSelectionTrace?: ExerciseSelectionScoreTrace[];
  substitutionTrace?: ExerciseSelectionScoreTrace[];
}

export interface WorkoutValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedCorrections: string[];
  userFacingMessages: string[];
  failedRuleIds: string[];
  decisionTrace: {
    ruleId: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    metadata?: Record<string, unknown>;
  }[];
}

export type GeneratedWorkoutRecommendationEventKind =
  | 'workout_generated'
  | 'workout_inspected'
  | 'workout_started'
  | 'workout_completed'
  | 'workout_abandoned'
  | 'workout_stopped'
  | 'exercise_substituted'
  | 'exercise_liked'
  | 'exercise_disliked'
  | 'pain_increased'
  | 'session_too_easy'
  | 'session_right'
  | 'session_too_hard'
  | 'progression_decision_created'
  | 'workout_regenerated'
  | 'workout_blocked_by_safety'
  | 'validation_warning_shown'
  | 'persistence_fallback_used';

export type RecommendationEventDecisionTrace = Array<
  WorkoutDecisionTraceEntry
  | WorkoutValidationResult['decisionTrace'][number]
  | Record<string, unknown>
>;

export interface RecommendationEventInput {
  generatedWorkoutId?: string | null;
  eventKind: GeneratedWorkoutRecommendationEventKind;
  timestamp?: string;
  decisionTrace?: RecommendationEventDecisionTrace;
  payload?: Record<string, unknown>;
  appContextVersion?: string | null;
  engineVersion?: string | null;
  contentVersion?: string | null;
}

export interface RecommendationEvent extends Required<Pick<RecommendationEventInput, 'eventKind' | 'decisionTrace' | 'payload'>> {
  id?: string;
  userId: string;
  generatedWorkoutId: string | null;
  timestamp: string;
  appContextVersion: string | null;
  engineVersion: string | null;
  contentVersion: string | null;
}

export interface WorkoutCompletionLog {
  id?: string;
  workoutId: string;
  generatedWorkoutId?: string | null;
  source?: 'workout_programming' | 'generated_workout';
  completedAt: string;
  workoutTypeId?: string;
  goalId?: string;
  prescriptionTemplateId?: string;
  completionStatus?: GeneratedWorkoutSessionCompletionStatus | null;
  substitutionsUsed?: string[];
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  sessionRpe: number;
  readinessBefore?: WorkoutReadinessBand | null;
  readinessAfter?: WorkoutReadinessBand | null;
  heartRateZoneCompliance?: number | null;
  densityScore?: number | null;
  movementQuality?: number | null;
  rangeControlScore?: number | null;
  powerQualityScore?: number | null;
  painScoreBefore?: number | null;
  painScoreAfter?: number | null;
  notes?: string | null;
  exerciseResults: ExerciseCompletionResult[];
}

export interface ExerciseCompletionResult {
  exerciseId: string;
  setsCompleted: number;
  setsPrescribed?: number | null;
  repsCompleted?: number | null;
  repsPrescribed?: number | null;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  durationSecondsCompleted?: number | null;
  durationSecondsPrescribed?: number | null;
  durationMinutesCompleted?: number | null;
  durationMinutesPrescribed?: number | null;
  loadUsed?: number | null;
  prescribedLoad?: number | null;
  actualRpe?: number | null;
  targetRpe?: number | null;
  actualRir?: number | null;
  targetRir?: number | null;
  heartRateZoneCompliance?: number | null;
  movementQuality?: number | null;
  rangeControlScore?: number | null;
  powerQualityScore?: number | null;
  painScore?: number | null;
  completedAsPrescribed: boolean;
}

export type GeneratedWorkoutSessionLifecycleStatus =
  | 'generated'
  | 'inspected'
  | 'started'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'abandoned'
  | 'stopped'
  | 'expired';

export type GeneratedWorkoutSessionCompletionStatus =
  | 'completed'
  | 'partial'
  | 'stopped'
  | 'abandoned'
  | 'expired';

export interface GeneratedWorkoutSessionLifecycle {
  id?: string;
  generatedWorkoutId: string;
  userId: string;
  status: GeneratedWorkoutSessionLifecycleStatus;
  inspectedAt?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
  resumedAt?: string | null;
  completedAt?: string | null;
  abandonedAt?: string | null;
  stoppedAt?: string | null;
  lastActiveAt: string;
  completionStatus?: GeneratedWorkoutSessionCompletionStatus | null;
  activeBlockId?: string | null;
  activeExerciseId?: string | null;
  notes?: string | null;
}

export type ProgressionDecisionKind =
  | 'progress'
  | 'repeat'
  | 'regress'
  | 'deload'
  | 'recover'
  | 'substitute'
  | 'reduceVolume'
  | 'reduceIntensity'
  | 'changeWorkoutType';

export interface ProgressionDecisionInput {
  workoutTypeId?: string;
  goalId?: string;
  prescriptionTemplateId?: string;
  workout?: GeneratedWorkout;
  completionLog: WorkoutCompletionLog;
  recentWorkoutCompletions?: WorkoutCompletionLog[];
  recentProgressionDecisions?: ProgressionDecision[];
  readinessTrend?: WorkoutReadinessBand[];
  readinessBefore?: WorkoutReadinessBand;
  readinessAfter?: WorkoutReadinessBand;
}

export interface ProgressionDecision {
  direction: ProgressionDecisionKind;
  decision?: ProgressionDecisionKind;
  reason: string;
  nextAdjustment: string;
  affectedExerciseIds?: string[];
  affectedMovementPatterns?: string[];
  safetyFlags: string[];
  userMessage?: string;
  coachNotes?: string[];
  suggestedNextInput?: Partial<PersonalizedWorkoutInput>;
}

export interface UserWorkoutProfile {
  userId: string;
  equipmentIds: string[];
  experienceLevel: WorkoutExperienceLevel;
  safetyFlags: string[];
  dislikedExerciseIds: string[];
  likedExerciseIds?: string[];
  preferredDurationMinutes: number;
  readinessBand: WorkoutReadinessBand;
  painFlags: string[];
  workoutEnvironment?: 'home' | 'gym' | 'outdoor' | 'travel' | 'unknown';
  preferredToneVariant?: DescriptionToneVariant;
}

export interface ProtectedWorkoutInput {
  id: string;
  label: string;
  dayIndex: number;
  durationMinutes: number;
  intensity: WorkoutIntensity;
}

export type ProgramPhase = 'accumulation' | 'intensification' | 'deload' | 'return_to_training' | 'maintenance';
export type ProgramDeloadStrategy = 'none' | 'week_four' | 'readiness_based' | 'every_fourth_week';
export type ProgramSessionStatus = 'planned' | 'scheduled' | 'started' | 'completed' | 'missed' | 'rescheduled' | 'archived';

export interface ProgramCalendarEvent {
  id: string;
  date: string;
  label: string;
  durationMinutes?: number;
  intensity?: WorkoutIntensity | number;
  protectedAnchor?: boolean;
  source?: string;
}

export interface GeneratedProgramSession {
  id: string;
  persistenceId?: string;
  userProgramId?: string;
  generatedWorkoutId?: string | null;
  workoutCompletionId?: string | null;
  calendarEventId?: string | null;
  dayIndex: number;
  weekIndex: number;
  scheduledDate?: string;
  originalScheduledDate?: string;
  rescheduledFromSessionId?: string;
  rescheduledToSessionId?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status?: ProgramSessionStatus;
  phase?: ProgramPhase;
  protectedAnchor: boolean;
  label: string;
  workout: GeneratedWorkout | null;
  plannedIntensity?: WorkoutIntensity;
  rationale?: string[];
}

export interface ProgramMovementPatternBalance {
  weekly: Record<number, Record<string, number>>;
  programTotal: Record<string, number>;
  warnings: string[];
}

export interface ProgramWeeklyVolumeSummary {
  weekIndex: number;
  phase: ProgramPhase;
  generatedSessionCount: number;
  protectedSessionCount: number;
  estimatedMinutes: number;
  hardDayCount: number;
  workoutTypeCounts: Record<string, number>;
}

export interface GeneratedProgramWeek {
  weekIndex: number;
  phase: ProgramPhase;
  sessions: GeneratedProgramSession[];
  rationale: string[];
  movementPatternBalance: Record<string, number>;
  weeklyVolumeSummary: ProgramWeeklyVolumeSummary;
  hardDayCount: number;
  validationWarnings: string[];
}

export type GeneratedProgramStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface GeneratedProgram {
  id: string;
  persistenceId?: string;
  status?: GeneratedProgramStatus;
  startedAt?: string;
  archivedAt?: string | null;
  scheduleStartDate?: string;
  scheduleEndDate?: string;
  goalId: string;
  weekCount: number;
  phase: ProgramPhase;
  weeks: GeneratedProgramWeek[];
  sessions: GeneratedProgramSession[];
  rationale: string[];
  movementPatternBalance: ProgramMovementPatternBalance;
  weeklyVolumeSummary: ProgramWeeklyVolumeSummary[];
  hardDayCount: number;
  progressionPlan: string[];
  explanations: string[];
  validationWarnings: string[];
  calendarWarnings?: string[];
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

export interface GeneratedWorkoutRecommendationQualitySummary {
  generationCount: number;
  startCount: number;
  completionCount: number;
  abandonCount: number;
  painIncreaseCount: number;
  substitutionCount: number;
  validationWarningCount: number;
  startRate: number;
  completionRate: number;
  abandonRate: number;
  painIncreaseRate: number;
  substitutionRate: number;
  userRatingAverage: number | null;
  progressionDistribution: Record<string, number>;
  validationWarningRate: number;
}
