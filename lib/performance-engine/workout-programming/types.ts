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
}

export interface WorkoutValidationResult {
  valid: boolean;
  errors: string[];
}
