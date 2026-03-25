import type {
  BlockType,
  FitnessLevel,
  MuscleGroup,
  Phase,
  ReadinessState,
  TimelineStatus,
  WorkoutFocus,
} from './foundational.ts';
import type { FuelState, MacroLedgerRow } from './nutrition.ts';
import type {
  AvailabilityWindow,
  ConstraintTier,
  PerformanceGoalType,
  RecommendationLifecycleStatus,
} from './foundational.ts';
import type { CampConfig } from './camp.ts';
import type {
  ConditioningPrescription,
  ExerciseLibraryRow,
  PrescribedExercise,
  RoadWorkPrescription,
  SessionModulePlan,
  WorkoutDoseBucket,
  WorkoutDoseCredit,
  WorkoutPrescriptionV2,
} from './training.ts';
import type { CutPhase, WeightCutPlanRow } from './weight_cut.ts';
import type { DailyMission } from './mission.ts';

export interface DailyTimelineRow {
  id: string;
  user_id: string;
  date: string;
  block_type: BlockType;
  planned_intensity: number;
  actual_intensity: number | null;
  status: TimelineStatus;
}

export interface HandleTimelineShiftInput {
  skippedBlock: DailyTimelineRow;
  currentLedger: MacroLedgerRow;
  cutPhase?: CutPhase | null;
}

export interface HandleTimelineShiftResult {
  updatedCarbs: number;
  carbReduction: number;
  message: string;
}

export type ActivityType =
  | 'boxing_practice'
  | 'sparring'
  | 'sc'
  | 'running'
  | 'road_work'
  | 'conditioning'
  | 'active_recovery'
  | 'rest'
  | 'other';

export type ComponentType =
  | 'sparring'
  | 'bag_work'
  | 'pad_work'
  | 'running'
  | 'conditioning'
  | 'core'
  | 'technique'
  | 'shadow_boxing'
  | 'speed_bag'
  | 'double_end_bag'
  | 'clinch_work'
  | 'other';

export type ScheduleSource = 'template' | 'manual' | 'engine';
export type ScheduleStatus = 'scheduled' | 'completed' | 'skipped' | 'modified';

export interface SessionComponent {
  type: ComponentType;
  duration: number;
  description?: string;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
}

export interface RecurringActivityRow {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  custom_label: string | null;
  start_time: string | null;
  estimated_duration_min: number;
  expected_intensity: number;
  session_components: SessionComponent[];
  recurrence: RecurrencePattern;
  is_active: boolean;
  session_kind?: string | null;
  rounds?: number | null;
  round_duration_sec?: number | null;
  rest_duration_sec?: number | null;
  athlete_locked?: boolean;
  intended_intensity?: number | null;
  constraint_tier?: ConstraintTier | null;
  notes?: string | null;
}

export interface ScheduledActivityRow {
  id: string;
  recurring_activity_id: string | null;
  weekly_plan_entry_id?: string | null;
  user_id: string;
  date: string;
  activity_type: ActivityType;
  custom_label: string | null;
  start_time: string | null;
  estimated_duration_min: number;
  expected_intensity: number;
  session_components: SessionComponent[];
  source: ScheduleSource;
  status: ScheduleStatus;
  actual_duration_min: number | null;
  actual_rpe: number | null;
  notes: string | null;
  engine_recommendation: string | null;
  session_kind?: string | null;
  rounds?: number | null;
  round_duration_sec?: number | null;
  rest_duration_sec?: number | null;
  athlete_locked?: boolean;
  intended_intensity?: number | null;
  constraint_tier?: ConstraintTier | null;
  recommendation_reason?: string | null;
  recommendation_severity?: 'info' | 'recommended' | 'strongly_recommended' | null;
  recommendation_affected_subsystem?: string | null;
  recommendation_change?: string | null;
  recommendation_education?: string | null;
  recommendation_status?: RecommendationLifecycleStatus | null;
}

export interface ActivityLogEntry {
  id: string;
  scheduled_activity_id: string | null;
  user_id: string;
  date: string;
  component_type: ComponentType;
  duration_min: number;
  distance_miles: number | null;
  pace_per_mile: string | null;
  rounds: number | null;
  intensity: number;
  heart_rate_avg: number | null;
  notes: string | null;
}

export interface WeeklyTargetsRow {
  id: string;
  user_id: string;
  sc_sessions: number;
  running_sessions: number;
  road_work_sessions: number;
  boxing_sessions: number;
  conditioning_sessions: number;
  recovery_sessions: number;
  total_weekly_load_cap: number;
}

export interface DayLoadValidation {
  safe: boolean;
  totalLoad: number;
  totalCNS: number;
  activitiesCount: number;
  message: string;
}

export interface WeeklyComplianceReport {
  sc: { planned: number; actual: number; pct: number };
  boxing: { planned: number; actual: number; pct: number };
  running: { planned: number; actual: number; pct: number };
  conditioning: { planned: number; actual: number; pct: number };
  recovery: { planned: number; actual: number; pct: number };
  totalLoadPlanned: number;
  totalLoadActual: number;
  overallPct: number;
  streak: number;
  message: string;
}

export interface ScheduleGenerationInput {
  readinessState: ReadinessState;
  phase: Phase;
  acwr: number;
  recurringActivities: RecurringActivityRow[];
  existingActivities: ScheduledActivityRow[];
  exerciseLibrary: ExerciseLibraryRow[];
  weeklyTargets: WeeklyTargetsRow;
  sleepTrendAvg: number;
  weekStartDate: string;
  activeCutPlan?: WeightCutPlanRow | null;
  fitnessLevel?: FitnessLevel;
  campConfig?: CampConfig | null;
  age?: number | null;
}

export interface NutritionDayAdjustment {
  carbModifierPct: number;
  calorieModifier: number;
  proteinModifier: number;
  hydrationBoostOz: number;
  fuelState: FuelState;
  sessionDemandScore: number;
  reasons: string[];
  message: string;
}

export type PlanSlot = 'am' | 'pm' | 'single';
export type PlanEntryStatus = 'planned' | 'completed' | 'skipped' | 'rescheduled';
export type TrainingSessionFamily =
  | 'sparring'
  | 'boxing_skill'
  | 'conditioning'
  | 'strength'
  | 'durability_core'
  | 'recovery'
  | 'rest';
export type PlacementSource = 'locked' | 'generated' | 'carry_forward';

export interface WeeklyPlanConfigRow {
  id: string;
  user_id: string;
  available_days: number[];
  availability_windows: AvailabilityWindow[];
  session_duration_min: number;
  allow_two_a_days: boolean;
  two_a_day_days: number[];
  am_session_type: ActivityType;
  pm_session_type: ActivityType;
  preferred_gym_profile_id: string | null;
  auto_deload_interval_weeks: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlanEntryRow {
  id: string;
  user_id: string;
  week_start_date: string;
  day_of_week: number;
  date: string;
  slot: PlanSlot;
  day_order?: number | null;
  session_type: string;
  focus: WorkoutFocus | null;
  session_family?: TrainingSessionFamily | null;
  placement_source?: PlacementSource | null;
  progression_intent?: string | null;
  carry_forward_reason?: string | null;
  estimated_duration_min: number;
  target_intensity: number | null;
  status: PlanEntryStatus;
  rescheduled_to: string | null;
  workout_log_id: string | null;
  scheduled_activity_id?: string | null;
  prescription_snapshot: WorkoutPrescriptionV2 | null;
  daily_mission_snapshot?: DailyMission | null;
  engine_notes: string | null;
  is_deload: boolean;
  created_at: string;
}

export interface WeeklySessionTarget {
  family: TrainingSessionFamily;
  min: number;
  target: number;
  max: number;
  scheduled: number;
  completed: number;
  floor?: number;
  realized?: number;
  debt?: number;
  metBySubstitution?: number;
  missReason?: string | null;
}

export interface DailyTrainingPlacement {
  date: string;
  day_of_week: number;
  slot: PlanSlot;
  dayOrder?: number | null;
  sessionFamily: TrainingSessionFamily;
  sessionType: ActivityType | 'sc';
  focus: WorkoutFocus | null;
  durationMin: number;
  targetIntensity: number | null;
  source: PlacementSource;
  locked: boolean;
  progressionIntent: string | null;
  notes: string | null;
  sessionModules?: SessionModulePlan[] | null;
  doseCredits?: WorkoutDoseCredit[];
  realizedDoseBuckets?: WorkoutDoseBucket[];
  recurringActivityId?: string | null;
}

export interface CarryForwardAdjustment {
  family: TrainingSessionFamily;
  fromDate: string | null;
  suggestedDate: string | null;
  reason: string;
  status: 'moved' | 'deferred' | 'cancelled';
}

export interface WeeklyTrainingMixPlan {
  weekStartDate: string;
  weekIntent: string;
  sessionTargets: WeeklySessionTarget[];
  dailyPlacements: DailyTrainingPlacement[];
  carryForwardAdjustments: CarryForwardAdjustment[];
}

export interface WeekPlanEntry
  extends Pick<
    ScheduledActivityRow,
    | 'date'
    | 'activity_type'
    | 'start_time'
    | 'estimated_duration_min'
    | 'expected_intensity'
    | 'source'
    | 'engine_recommendation'
  > {
  road_work_prescription?: RoadWorkPrescription | null;
  conditioning_prescription?: ConditioningPrescription | null;
  recommendation_reason?: string;
  recommendation_severity?: 'info' | 'recommended' | 'strongly_recommended';
  recommendation_affected_subsystem?: string;
  recommendation_change?: string;
  recommendation_education?: string;
  recommendation_status?: RecommendationLifecycleStatus;
}

export interface SmartWeekPlanInput {
  config: WeeklyPlanConfigRow;
  readinessState: ReadinessState;
  phase: Phase;
  acwr: number;
  fitnessLevel: FitnessLevel;
  performanceGoalType?: PerformanceGoalType;
  exerciseLibrary: ExerciseLibraryRow[];
  exerciseHistory?: Map<string, import('./training.ts').ExerciseHistoryEntry[]>;
  recentExerciseIds?: string[];
  recentMuscleVolume: Record<MuscleGroup, number>;
  campConfig: CampConfig | null;
  activeCutPlan: WeightCutPlanRow | null;
  weeksSinceLastDeload: number;
  gymProfile: import('./training.ts').GymProfileRow | null;
  weekStartDate: string;
  recurringActivities?: RecurringActivityRow[];
}

export interface SmartWeekPlanResult {
  entries: WeeklyPlanEntryRow[];
  isDeloadWeek: boolean;
  deloadReason: string | null;
  weeklyFocusSplit: Partial<Record<WorkoutFocus, number>>;
  weeklyMixPlan: WeeklyTrainingMixPlan;
  message: string;
}

export interface GenerateBlockPlanInput extends Omit<SmartWeekPlanInput, 'weekStartDate'> {
  startDate: string;
  weeks: number;
}

export interface BlockTrainingWeekPlan {
  weekStartDate: string;
  isDeloadWeek: boolean;
  deloadReason: string | null;
  weeklyMixPlan: WeeklyTrainingMixPlan;
}

export interface BlockPlanResult {
  weeks: BlockTrainingWeekPlan[];
}

export interface MissedDayRescheduleInput {
  missedEntry: WeeklyPlanEntryRow;
  remainingEntries: WeeklyPlanEntryRow[];
  readinessState: ReadinessState;
  acwr: number;
}

export interface MissedDayRescheduleResult {
  updatedEntries: WeeklyPlanEntryRow[];
  redistributedExercises: PrescribedExercise[];
  message: string;
}

export interface DailyAdaptationInput {
  today: string;
  todayActivities: ScheduledActivityRow[];
  yesterdayActivities: ScheduledActivityRow[];
  readinessState: ReadinessState;
  acwr: number;
  sleepLastNight: number;
  fitnessLevel: FitnessLevel;
  phase: Phase;
  campConfig: CampConfig | null;
  trainingIntensityCap: number | null;
  exerciseLibrary: ExerciseLibraryRow[];
}

export interface DailyAdaptationSwap {
  originalActivityId: string | null;
  originalType: ActivityType;
  newType: ActivityType;
  newIntensity: number;
  reason: string;
}

export interface DailyAdaptationResult {
  swaps: DailyAdaptationSwap[];
  overarchingMessage: string;
  adjustedActivities: ScheduledActivityRow[];
  acwrStatus: 'safe' | 'caution' | 'redline';
  readinessMessage: string;
}
