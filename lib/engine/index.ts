export { calculateACWR } from './calculateACWR';
export { getHydrationProtocol } from './getHydrationProtocol';
export { adjustForBiology } from './adjustForBiology';
export { getGlobalReadinessState } from './getGlobalReadinessState';
export { handleTimelineShift, autoRegulateSC } from './adaptive';
export { calculateNutritionTargets, computeMacroAdherence } from './calculateNutrition';
export { calculateWeightTrend, calculateWeightCorrection, calculateWeightReadinessPenalty } from './calculateWeight';
export { calculateCampRisk } from './calculateCampRisk';
export {
  determineFocus,
  scoreExerciseForUser,
  generateWorkout,
  calculateVolumeLoad,
  calculateWeeklyVolume,
  getWorkoutCompliance,
} from './calculateSC';
export {
  getRecoveryWindow,
  validateDayLoad,
  suggestAlternative,
  adjustNutritionForDay,
  detectOvertrainingRisk,
  generateWeekPlan,
  calculateWeeklyCompliance,
  getTrainingStreak,
} from './calculateSchedule';

export type {
  ACWRInput,
  ACWRResult,
  GlobalReadinessInput,
  ReadinessState,
  HydrationInput,
  HydrationResult,
  BiologyInput,
  BiologyResult,
  CyclePhase,
  Phase,
  FightStatus,
  TrainingSessionRow,
  ExerciseType,
  BlockType,
  TimelineStatus,
  MuscleGroup,
  Equipment,
  WorkoutType,
  WorkoutFocus,
  ExerciseLibraryRow,
  DailyTimelineRow,
  MacroLedgerRow,
  WorkoutPrescription,
  PrescribedExercise,
  ExerciseScoringContext,
  GenerateWorkoutInput,
  WorkoutLogRow,
  WorkoutSetLogRow,
  WorkoutComplianceResult,
  HandleTimelineShiftInput,
  HandleTimelineShiftResult,
  AutoRegulateSCInput,
  AutoRegulateSCResult,
  NutritionGoal,
  ActivityLevel,
  MealType,
  NutritionProfileInput,
  NutritionTargets,
  MacroAdherenceResult,
  FoodItemRow,
  FoodLogRow,
  DailyNutritionSummaryRow,
  ActivityType,
  ComponentType,
  ScheduleSource,
  ScheduleStatus,
  SessionComponent,
  RecurringActivityRow,
  ScheduledActivityRow,
  ActivityLogEntry,
  WeeklyTargetsRow,
  DayLoadValidation,
  OvertrainingSeverity,
  OvertrainingWarning,
  WeeklyComplianceReport,
  ScheduleGenerationInput,
  NutritionDayAdjustment,
  WeightCutStatus,
  WeightDataPoint,
  WeightTrendInput,
  WeightTrendResult,
  WeightCorrectionInput,
  WeightCorrectionResult,
  WeightReadinessPenalty,
  RecurrencePattern,
} from './types';

export type { CampRiskInput, CampRiskAssessment, CampRiskLevel } from './calculateCampRisk';


