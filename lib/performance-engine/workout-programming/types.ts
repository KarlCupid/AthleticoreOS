export type WorkoutExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutIntensity = 'recovery' | 'low' | 'moderate' | 'hard';
export type WorkoutBlockKind = 'warmup' | 'main' | 'cooldown';

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

export interface Exercise {
  id: string;
  name: string;
  summary: string;
  coachingSummary: string;
  movementPatternIds: string[];
  primaryMuscleIds: string[];
  secondaryMuscleIds: string[];
  equipmentIds: string[];
  workoutTypeIds: string[];
  goalIds: string[];
  minExperience: WorkoutExperienceLevel;
  intensity: WorkoutIntensity;
  impact: 'none' | 'low' | 'moderate' | 'high';
  contraindicationFlags: string[];
  trackingMetricIds: string[];
  defaultPrescriptionTemplateId: string;
}

export interface PrescriptionTemplate {
  id: string;
  label: string;
  appliesToWorkoutTypeIds: string[];
  defaultSets?: number;
  defaultReps?: string;
  defaultDurationSeconds?: number;
  defaultDurationMinutes?: number;
  defaultRpe: number;
  restSeconds: number;
  tempo?: string;
  intensityCue: string;
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
}

export interface WorkoutRule {
  id: string;
  label: string;
  appliesToGoalIds: string[];
  trigger: string;
  action: string;
  explanation: string;
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
}

export interface ValidationRule {
  id: string;
  label: string;
  severity: 'warning' | 'error';
  explanation: string;
}

export interface WorkoutIntelligenceCatalog {
  progressionRules: WorkoutRule[];
  regressionRules: WorkoutRule[];
  deloadRules: WorkoutRule[];
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

export interface GeneratedWorkout {
  schemaVersion: 'generated-workout-v1';
  workoutTypeId: string;
  goalId: string;
  templateId: string;
  formatId: string;
  requestedDurationMinutes: number;
  estimatedDurationMinutes: number;
  equipmentIds: string[];
  safetyFlags: string[];
  blocks: GeneratedWorkoutBlock[];
  trackingMetricIds: string[];
  successCriteria: string[];
  explanations: string[];
  blocked?: boolean;
  validationWarnings?: string[];
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
