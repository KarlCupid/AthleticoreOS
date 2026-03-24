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
import type { WeightCutPlanRow } from './weight_cut.ts';

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
  activeCutPlan: WeightCutPlanRow | null;
}

export type ConditioningType =
  | 'heavy_bag_rounds'
  | 'circuit'
  | 'jump_rope'
  | 'sled_work'
  | 'agility_drills'
  | 'sport_specific_drill';

export interface ConditioningExercise {
  name: string;
  durationSec: number | null;
  reps: number | null;
  rounds: number;
  restSec: number;
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
  activeCutPlan: WeightCutPlanRow | null;
}

export interface GenerateWorkoutInputV2 extends GenerateWorkoutInput {
  availableMinutes?: number;
  gymEquipment?: EquipmentItem[];
  exerciseHistory?: Map<string, ExerciseHistoryEntry[]>;
  isDeloadWeek?: boolean;
  weeklyPlanFocus?: WorkoutFocus;
  sparringDaysThisWeek?: number;
  isSparringDay?: boolean;
  progressionModel?: ProgressionModel;
  performanceGoalType?: PerformanceGoalType;
  performanceRisk?: PerformanceRiskState | null;
  blockContext?: TrainingBlockContext | null;
  medStatus?: MEDStatus | null;
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
  | 'recovery_flow';

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
  WeekPlanEntry,
} from './schedule.ts';
