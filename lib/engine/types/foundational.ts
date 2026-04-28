export type Phase =
  | 'off-season'
  | 'pre-camp'
  | 'fight-camp'
  | 'camp-base'
  | 'camp-build'
  | 'camp-peak'
  | 'camp-taper';

export type FightStatus = 'amateur' | 'pro';

export type ReadinessState = 'Prime' | 'Caution' | 'Depleted';

export type InterventionState = 'none' | 'soft' | 'hard';

export type CyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'ovulatory'
  | 'luteal-early'
  | 'luteal-late';

export type ExerciseType =
  | 'heavy_lift'
  | 'power'
  | 'mobility'
  | 'active_recovery'
  | 'conditioning'
  | 'sport_specific';

export type BlockType = 'Boxing' | 'S&C' | 'Recovery';

export type TimelineStatus = 'Scheduled' | 'Completed' | 'Skipped' | 'Audible';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'arms'
  | 'core'
  | 'full_body'
  | 'neck'
  | 'calves';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'bodyweight'
  | 'cable'
  | 'machine'
  | 'band'
  | 'medicine_ball'
  | 'sled'
  | 'heavy_bag'
  | 'other';

export type WorkoutType =
  | 'strength'
  | 'practice'
  | 'sparring'
  | 'conditioning'
  | 'recovery';

export type WorkoutFocus =
  | 'upper_push'
  | 'upper_pull'
  | 'lower'
  | 'full_body'
  | 'sport_specific'
  | 'recovery'
  | 'conditioning';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export type TrainingAge = 'novice' | 'intermediate' | 'advanced';

// Compatibility re-exports for older engine modules that still import these
// symbols from foundational.ts while canonical ownership now lives elsewhere.
export type {
  AthleteGoalMode,
  AvailabilityWindow,
  BuildPhaseGoalRow,
  BuildPhaseGoalType,
  ConstraintTier,
  ObjectiveSecondaryConstraint,
  PerformanceGoalType,
  RecommendationLifecycleStatus,
  WeighInTiming,
  WeightClassInfluenceState,
} from './fightCampV1.ts';
export type {
  CampConfig,
  CampPhase,
  CampPlanInput,
  CampTrainingModifiers,
  CampWeekProfile,
} from './camp.ts';
export type {
  EquipmentItem,
  ExerciseLibraryRow,
  OverloadInput,
  OverloadSuggestion,
  DeloadDecisionInput,
  DeloadDecisionResult,
  ProgressionModel,
  ConditioningExercise,
  ConditioningPrescription,
  ConditioningType,
  WeeklyConditioningInput,
  RoadWorkInterval,
  RoadWorkPrescription,
  RoadWorkType,
  SparringDayGuidance,
  CampSCModifier,
  WeeklyRoadWorkInput,
  WarmupInput,
  WarmupResult,
} from './training.ts';
export type {
  ActivityType,
  DayLoadValidation,
  ScheduledActivityRow,
} from './schedule.ts';
export type { FuelState, NutritionTargetEstimate } from './nutrition.ts';
export type {
  HRZone,
  OvertrainingWarning,
  PRDetectionResult,
  PRRecord,
} from './misc.ts';
export type { WeightClassPlanRow } from './weightClassPlan.ts';
