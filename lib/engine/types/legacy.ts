import { SupabaseClient } from '@supabase/supabase-js';

// ─── Database Row Types ────────────────────────────────────────

export interface TrainingSessionRow {
  id: string;
  user_id: string;
  date: string;
  duration_minutes: number;
  intensity_srpe: number;
  total_load: number;
}

// ─── ACWR Types ────────────────────────────────────────────────

export interface ACWRInput {
  userId: string;
  supabaseClient: SupabaseClient;
  asOfDate?: string; // optional ISO date for deterministic calculations/tests
  fitnessLevel?: FitnessLevel | null;
  phase?: Phase | null;
  isOnActiveCut?: boolean;
}

export interface ACWRThresholds {
  caution: number;
  redline: number;
  confidence: 'low' | 'medium' | 'high';
  personalizationFactors: string[];
}

export interface LoadMetrics {
  weeklyLoad: number;
  monotony: number;
  strain: number;
  rollingFatigueRatio: number;
  rollingFatigueScore: number; // 0-100
  fatigueBand: 'low' | 'moderate' | 'high' | 'very_high';
}

export interface ACWRResult {
  ratio: number;
  acute: number;
  chronic: number;
  status: 'safe' | 'caution' | 'redline';
  message: string;
  daysOfData: number;
  thresholds: ACWRThresholds;
  loadMetrics: LoadMetrics;
}
// ─── Hydration Protocol Types ──────────────────────────────────

export type Phase = 'off-season' | 'pre-camp' | 'fight-camp' | 'camp-base' | 'camp-build' | 'camp-peak' | 'camp-taper';
export type FightStatus = 'amateur' | 'pro';

export interface HydrationInput {
  phase: Phase;
  fightStatus: FightStatus;
  currentWeightLbs: number;
  targetWeightLbs: number;
  weeklyVelocityLbs?: number;
}

export interface HydrationResult {
  dailyWaterOz: number;
  waterLoadOz: number | null;
  shedCapPercent: number;
  shedCapLbs: number;
  message: string;
}

// ─── Global Readiness Types ─────────────────────────────────────

export type ReadinessState = 'Prime' | 'Caution' | 'Depleted';

export interface GlobalReadinessInput {
  sleep: number;      // today's sleep quality (1-5)
  readiness: number;  // today's readiness (1-5)
  acwr: number;       // yesterday's calculated ACWR ratio
  weightPenalty?: number; // 0-2, from calculateWeightReadinessPenalty
}

// ─── Biology Adjustment Types ──────────────────────────────────

export interface BiologyInput {
  cycleDay: number;
}

export type CyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'ovulatory'
  | 'luteal-early'
  | 'luteal-late';

export interface BiologyResult {
  cyclePhase: CyclePhase;
  cardioModifier: number;
  proteinModifier: number;
  message: string;
}

// ─── S&C Planner Types ─────────────────────────────────────────

export type ExerciseType = 'heavy_lift' | 'power' | 'mobility' | 'active_recovery' | 'conditioning' | 'sport_specific';
export type BlockType = 'Boxing' | 'S&C' | 'Recovery';
export type TimelineStatus = 'Scheduled' | 'Completed' | 'Skipped' | 'Audible';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'quads' | 'hamstrings' |
  'glutes' | 'arms' | 'core' | 'full_body' | 'neck' | 'calves';

export type Equipment = 'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' |
  'cable' | 'machine' | 'band' | 'medicine_ball' | 'sled' | 'heavy_bag' | 'other';

export type WorkoutType = 'strength' | 'practice' | 'sparring' | 'conditioning' | 'recovery';

export type WorkoutFocus = 'upper_push' | 'upper_pull' | 'lower' | 'full_body' |
  'sport_specific' | 'recovery' | 'conditioning';

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
}

export interface DailyTimelineRow {
  id: string;
  user_id: string;
  date: string;
  block_type: BlockType;
  planned_intensity: number;
  actual_intensity: number | null;
  status: TimelineStatus;
}

export interface MacroLedgerRow {
  id: string;
  user_id: string;
  date: string;
  base_tdee: number;
  prescribed_calories?: number | null;
  prescribed_protein: number;
  prescribed_fats: number;
  prescribed_carbs: number;
  weight_correction_deficit: number;
  target_source?: DailyNutritionTargetSource | null;
  actual_calories?: number;
  actual_protein?: number;
  actual_carbs?: number;
  actual_fat?: number;
}

// ─── Workout Generation Types ──────────────────────────────────

export interface WorkoutPrescription {
  focus: WorkoutFocus;
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
}

export interface ExerciseScoringContext {
  readinessState: ReadinessState;
  phase: Phase;
  acwr: number;
  recentExerciseIds: string[];       // exercise IDs used in last 48h
  recentMuscleVolume: Record<MuscleGroup, number>;  // recent volume per muscle
  cnsBudgetRemaining: number;
  fitnessLevel: FitnessLevel;
}

export interface GenerateWorkoutInput {
  readinessState: ReadinessState;
  phase: Phase;
  acwr: number;
  exerciseLibrary: ExerciseLibraryRow[];
  recentExerciseIds: string[];
  recentMuscleVolume: Record<MuscleGroup, number>;
  trainingDate?: string; // optional ISO date to avoid runtime date dependence
  focus?: WorkoutFocus;              // optional override
  trainingIntensityCap?: number | null; // from active weight cut protocol
  fitnessLevel: FitnessLevel;
}

// ─── Workout Log Types ─────────────────────────────────────────

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

// ─── Adaptive Engine Types ─────────────────────────────────────

export interface HandleTimelineShiftInput {
  skippedBlock: DailyTimelineRow;
  currentLedger: MacroLedgerRow;
  cutPhase?: CutPhase | null; // amplifies carb reduction during intensified/fight-week
}

export interface HandleTimelineShiftResult {
  updatedCarbs: number;
  carbReduction: number;
  message: string;
}

export interface AutoRegulateSCInput {
  boxingBlock: DailyTimelineRow;
  next24hBlocks: DailyTimelineRow[];
  exerciseLibrary: ExerciseLibraryRow[];
}

export interface AutoRegulateSCResult {
  swapped: boolean;
  originalBlockId: string | null;
  replacementType: ExerciseType | null;
  message: string;
}

// ─── Nutrition System Types ───────────────────────────────────

export type NutritionGoal = 'maintain' | 'cut' | 'bulk';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface NutritionProfileInput {
  weightLbs: number;
  heightInches: number | null;
  age: number | null;
  biologicalSex: 'male' | 'female';
  activityLevel: ActivityLevel;
  phase: Phase;
  nutritionGoal: NutritionGoal;
  cycleDay?: number | null;
  coachProteinOverride: number | null;
  coachCarbsOverride: number | null;
  coachFatOverride: number | null;
  coachCaloriesOverride: number | null;
  weightCorrectionDeficit?: number;
}

export interface NutritionTargets {
  tdee: number;
  adjustedCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinModifier: number;
  phaseMultiplier: number;
  weightCorrectionDeficit: number;
  message: string;
}

export type DailyNutritionTargetSource =
  | 'base'
  | 'daily_activity_adjusted'
  | 'weight_cut_protocol';

export interface ResolvedNutritionTargets extends NutritionTargets {
  source: DailyNutritionTargetSource;
}

export interface MacroAdherenceResult {
  caloriesPct: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  overall: 'Target Met' | 'Close Enough' | 'Missed It';
}

export interface FoodItemRow {
  id: string;
  user_id: string | null;
  off_barcode: string | null;
  name: string;
  brand: string | null;
  serving_size_g: number;
  serving_label: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  is_supplement: boolean;
  image_url: string | null;
}

export interface FoodLogRow {
  id: string;
  user_id: string;
  food_item_id: string;
  date: string;
  meal_type: MealType;
  servings: number;
  logged_calories: number;
  logged_protein: number;
  logged_carbs: number;
  logged_fat: number;
}

export interface DailyNutritionSummaryRow {
  id: string;
  user_id: string;
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_water_oz: number;
  meal_count: number;
}

// ─── Unified Schedule & Calendar Types ────────────────────────

export type ActivityType =
  | 'boxing_practice' | 'sparring' | 'sc' | 'running' | 'road_work'
  | 'conditioning' | 'active_recovery' | 'rest' | 'other';

export type ComponentType =
  | 'sparring' | 'bag_work' | 'pad_work' | 'running'
  | 'conditioning' | 'core' | 'technique' | 'shadow_boxing'
  | 'speed_bag' | 'double_end_bag' | 'clinch_work' | 'other';

export type ScheduleSource = 'template' | 'manual' | 'engine';
export type ScheduleStatus = 'scheduled' | 'completed' | 'skipped' | 'modified';
export type RecommendationLifecycleStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type ConstraintTier = 'mandatory' | 'preferred';

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SessionComponent {
  type: ComponentType;
  duration: number;       // minutes
  description?: string;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // e.g., 1 = every week, 2 = every other week
  days_of_week?: number[]; // 0=Sun, 6=Sat (used for weekly)
  day_of_month?: number; // 1-31 (used for monthly)
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
  totalLoad: number;            // sum of (duration * intensity) for the day
  totalCNS: number;
  activitiesCount: number;
  message: string;
}

export type OvertrainingSeverity = 'info' | 'caution' | 'danger';

export interface OvertrainingWarning {
  severity: OvertrainingSeverity;
  title: string;
  message: string;
  recommendation: string;       // specific swap or rest suggestion
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
  existingActivities: ScheduledActivityRow[];    // already-scheduled for the week
  exerciseLibrary: ExerciseLibraryRow[];
  weeklyTargets: WeeklyTargetsRow;
  sleepTrendAvg: number;         // avg sleep quality over last 3 days
  weekStartDate: string;         // ISO date of Monday
  activeCutPlan?: WeightCutPlanRow | null; // active weight cut plan (if any)
  fitnessLevel?: FitnessLevel;   // user's current fitness tier
  campConfig?: CampConfig | null; // active fight camp configuration
  age?: number | null;           // for HR zone calculation
}

export interface NutritionDayAdjustment {
  carbModifierPct: number;       // e.g. +15 means 15% more carbs
  calorieModifier: number;       // e.g. +200 means 200 more cal
  proteinModifier: number;       // usually 0 unless recovery day
  hydrationBoostOz: number;     // extra water
  message: string;               // educational explanation
}

// ─── Weight Integration Types ──────────────────────────────────

export type WeightCutStatus = 'on_track' | 'ahead' | 'behind' | 'stalled' | 'gaining' | 'no_target';

export interface WeightDataPoint {
  date: string;
  weight: number;
}

export interface WeightTrendInput {
  weightHistory: WeightDataPoint[];
  targetWeightLbs: number | null;
  baseWeightLbs: number;
  phase: Phase;
  deadlineDate: string | null;
}

export interface WeightTrendResult {
  currentWeight: number;
  movingAverage7d: number;
  weeklyVelocityLbs: number;       // negative = losing
  totalChangeLbs: number;
  remainingLbs: number;             // positive = needs to lose
  projectedDaysToTarget: number | null;
  projectedDate: string | null;
  projectedDateEarliest?: string | null;
  projectedDateLatest?: string | null;
  projectionConfidence?: 'low' | 'medium' | 'high';
  projectedWeeklyVelocityRange?: {
    optimistic: number;
    expected: number;
    conservative: number;
  } | null;
  status: WeightCutStatus;
  isRapidLoss: boolean;             // > 2 lbs/week
  percentComplete: number;          // 0-100
  message: string;
}
export interface WeightCorrectionInput {
  weightTrend: WeightTrendResult;
  phase: Phase;
  currentTDEE: number;
  deadlineDate: string | null;
}

export interface WeightCorrectionResult {
  correctionDeficitCal: number;
  adjustedCalorieTarget: number;
  message: string;
}

export interface WeightReadinessPenalty {
  penaltyPoints: number;            // 0-2
  isStressor: boolean;
  message: string;
}

// ─── Weight Cut System Types ────────────────────────────────────

export type CutPhase =
  | 'chronic'
  | 'intensified'
  | 'fight_week_load'
  | 'fight_week_cut'
  | 'weigh_in'
  | 'rehydration';

export type CutPlanStatus = 'active' | 'completed' | 'abandoned' | 'paused';
export type CutSport = 'boxing' | 'mma';

// ─── Plan generation ───────────────────────────────────────────

export interface CutPlanInput {
  startWeight: number;
  targetWeight: number;
  fightDate: string;          // ISO date of fight
  weighInDate: string;        // ISO date of weigh-in (often fight_date - 1)
  fightStatus: FightStatus;
  biologicalSex: 'male' | 'female';
  sport: CutSport;
}

export interface CutPhaseDates {
  start: string;              // ISO date
  end: string;                // ISO date
}

export interface CutPlanResult {
  valid: boolean;
  validationErrors: string[];
  safetyWarnings: string[];
  extremeCutWarning: boolean;   // true when cut > 10% BW (allowed but heavily warned)
  // Quantities
  totalCutLbs: number;
  totalCutPct: number;
  dietPhaseTargetLbs: number;
  waterCutAllocationLbs: number;
  // Phase durations
  chronicPhaseWeeks: number;
  intensifiedPhaseWeeks: number;
  // Phase boundaries (null = phase not applicable given timeline)
  chronicPhaseDates: CutPhaseDates | null;
  intensifiedPhaseDates: CutPhaseDates;
  fightWeekDates: CutPhaseDates;
  weighInDate: string;
  // Safety envelope
  safeWeeklyLossRateLbs: number;  // max lbs/week allowed
  calorieFloor: number;           // 1200 (F) or 1500 (M)
  maxWaterCutPct: number;         // 3 or 5
  // Estimated calorie deficits
  estimatedDailyDeficitChronic: number;
  estimatedDailyDeficitIntensified: number;
}

// ─── Daily protocol ────────────────────────────────────────────

export interface CutSafetyFlag {
  severity: 'info' | 'warning' | 'danger';
  code: string;
  title: string;
  message: string;
  recommendation: string;
}

export interface DailyCutProtocolInput {
  plan: WeightCutPlanRow;
  date: string;                    // ISO date of today
  currentWeight: number;
  weightHistory: WeightDataPoint[];
  baseNutritionTargets: NutritionTargets;
  dayActivities: Array<{
    activity_type: ActivityType;
    expected_intensity: number;
    estimated_duration_min: number;
  }>;
  readinessState: ReadinessState;
  acwr: number;
  biologicalSex: 'male' | 'female';
  cycleDay: number | null;
  weeklyVelocityLbs: number;
  lastRefeedDate: string | null;
  lastDietBreakDate: string | null;
  baselineCognitiveScore: number | null;
  latestCognitiveScore: number | null;
  urineColor: number | null;        // 1-8, null if not in fight week
  bodyTempF: number | null;
  consecutiveDepletedDays: number;
}

export interface DailyCutProtocolResult {
  cutPhase: CutPhase;
  daysToWeighIn: number;
  // Nutrition
  prescribedCalories: number;
  prescribedProtein: number;
  prescribedCarbs: number;
  prescribedFat: number;
  isRefeedDay: boolean;
  isCarbCycleHigh: boolean;
  // Hydration
  waterTargetOz: number;
  sodiumTargetMg: number | null;    // null = normal, use instruct string
  sodiumInstruction: string;
  fiberInstruction: string;
  // Training
  trainingIntensityCap: number | null;
  trainingRecommendation: string;
  // Protocol
  morningProtocol: string;
  afternoonProtocol: string;
  eveningProtocol: string;
  // Safety
  safetyFlags: CutSafetyFlag[];
}

// ─── Stall detection ───────────────────────────────────────────

export interface StallDetectionInput {
  weightHistory: WeightDataPoint[];
  daysAtDeficit: number;
  lastRefeedDate: string | null;
  lastDietBreakDate: string | null;
}

export interface StallDetectionResult {
  stalled: boolean;
  stallDurationDays: number;
  recommendation: 'none' | 'refeed' | 'diet_break';
  refeedDurationDays: number;
  message: string;
}

// ─── Carb cycling ──────────────────────────────────────────────

export interface CarbCycleInput {
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  isTrainingDay: boolean;
  hasHighIntensitySession: boolean;  // intensity >= 7
  cutPhase: CutPhase;
}

export interface CarbCycleResult {
  adjustedCalories: number;
  adjustedCarbs: number;
  adjustedFat: number;
  adjustedProtein: number;
  cycleType: 'high' | 'moderate' | 'low';
  message: string;
}

// ─── Safety validation ─────────────────────────────────────────

export interface CutSafetyInput {
  cutPhase: CutPhase;
  startWeightLbs: number;
  currentWeightLbs: number;
  weeklyVelocityLbs: number;
  prescribedCalories: number;
  calorieFloor: number;
  readinessState: ReadinessState;
  consecutiveDepletedDays: number;
  acwr: number;
  urineColor: number | null;
  bodyTempF: number | null;
  baselineCognitiveScore: number | null;
  latestCognitiveScore: number | null;
  waterCutAllocationLbs: number;
  remainingLbsToTarget: number;
  daysToWeighIn: number;
  fightStatus: FightStatus;
}

// ─── Rehydration protocol ──────────────────────────────────────

export interface RehydrationPhase {
  timeWindow: string;         // e.g. "0–30 min"
  fluidInstruction: string;
  foodInstruction: string | null;
  sodiumInstruction: string | null;
  targetFluidOz: number;
}

export interface RehydrationInput {
  weighInWeightLbs: number;
  targetWeightLbs: number;
  hoursToFight: number;
  biologicalSex: 'male' | 'female';
}

export interface RehydrationProtocolResult {
  phases: RehydrationPhase[];
  targetWeightByFight: number;      // pounds to regain target
  weightToRegainLbs: number;
  totalFluidOz: number;
  monitorMetrics: string[];
  message: string;
}

// ─── Weight class data ─────────────────────────────────────────

export type WeightClassRiskLevel = 'low' | 'moderate' | 'high' | 'unsafe';

export interface WeightClass {
  name: string;
  maxLbs: number;
  sport: CutSport;
  level: 'amateur' | 'pro';
}

export interface WeightClassSuggestion {
  weightClass: WeightClass;
  cutRequired: number;
  cutPct: number;
  feasible: boolean;
  isCurrent: boolean;
  risk: WeightClassRiskLevel;
  riskReason: string;
}

// ─── Cut hydration protocol ────────────────────────────────────

export interface CutHydrationInput {
  cutPhase: CutPhase;
  daysToWeighIn: number;
  currentWeightLbs: number;
  baseHydrationOz: number;       // from standard getHydrationProtocol
  fightStatus: FightStatus;
}

export interface CutHydrationResult {
  dailyWaterOz: number;
  instruction: string;
  sodiumInstruction: string;
  isRestricting: boolean;        // true during fight_week_cut/weigh_in
}

// ─── Database row types ────────────────────────────────────────

export interface WeightCutPlanRow {
  id: string;
  user_id: string;
  start_weight: number;
  target_weight: number;
  weight_class_name: string | null;
  sport: CutSport;
  fight_date: string;
  weigh_in_date: string;
  plan_created_date: string;
  fight_status: FightStatus;
  max_water_cut_pct: number;
  total_cut_lbs: number;
  diet_phase_target_lbs: number;
  water_cut_allocation_lbs: number;
  chronic_phase_start: string | null;
  chronic_phase_end: string | null;
  intensified_phase_start: string | null;
  intensified_phase_end: string | null;
  fight_week_start: string | null;
  weigh_in_day: string;
  rehydration_start: string | null;
  status: CutPlanStatus;
  completed_at: string | null;
  safe_weekly_loss_rate: number;
  calorie_floor: number;
  baseline_cognitive_score: number | null;
  coach_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyCutProtocolRow {
  id: string;
  user_id: string;
  plan_id: string;
  date: string;
  cut_phase: CutPhase;
  days_to_weigh_in: number;
  prescribed_calories: number;
  prescribed_protein: number;
  prescribed_carbs: number;
  prescribed_fat: number;
  is_refeed_day: boolean;
  is_carb_cycle_high: boolean;
  water_target_oz: number;
  sodium_target_mg: number | null;
  sodium_instruction: string | null;
  fiber_instruction: string | null;
  training_intensity_cap: number | null;
  training_recommendation: string | null;
  safety_flags: CutSafetyFlag[];
  morning_protocol: string | null;
  afternoon_protocol: string | null;
  evening_protocol: string | null;
  actual_weight: number | null;
  water_consumed_oz: number | null;
  sodium_consumed_mg: number | null;
  protocol_adherence: 'followed' | 'partial' | 'missed' | null;
  created_at: string;
}

export interface CutSafetyCheckRow {
  id: string;
  user_id: string;
  plan_id: string;
  date: string;
  urine_color: number | null;
  body_temp_f: number | null;
  cognitive_score: number | null;
  mood_rating: number | null;
  dizziness: boolean;
  headache: boolean;
  muscle_cramps: boolean;
  post_weigh_in_weight: number | null;
  rehydration_weight_regained: number | null;
  notes: string | null;
  created_at: string;
}

export interface WeightCutHistoryRow {
  id: string;
  user_id: string;
  plan_id: string;
  start_weight: number;
  final_weigh_in_weight: number | null;
  target_weight: number;
  made_weight: boolean | null;
  total_duration_days: number | null;
  total_diet_loss_lbs: number | null;
  total_water_cut_lbs: number | null;
  avg_weekly_loss_rate: number | null;
  rehydration_weight_regained: number | null;
  fight_day_weight: number | null;
  protocol_adherence_pct: number | null;
  refeed_days_used: number | null;
  diet_breaks_used: number | null;
  safety_flags_triggered: CutSafetyFlag[];
  fight_date: string | null;
  completed_at: string;
}

// ─── Dashboard aggregate ───────────────────────────────────────

export interface WeightCutDashboardData {
  activePlan: WeightCutPlanRow | null;
  todayProtocol: DailyCutProtocolRow | null;
  weightHistory: WeightDataPoint[];
  safetyChecks: CutSafetyCheckRow[];
  cutHistory: WeightCutHistoryRow[];
  projectedWeightByWeighIn: number | null;
  adherenceLast7Days: number;    // 0-100%
}

// ─── Fitness Level System ──────────────────────────────────────

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface FitnessAssessmentInput {
  trainingYears: number;          // 0-10+
  weeklySessionCount: number;     // 1-14
  maxPushUpsIn2Min: number;       // reps
  mile5RunTimeSeconds: number | null; // 1.5mi run time in seconds, null if unknown
  sportExperienceYears: number;   // combat sport experience
  hasSignificantInjuries: boolean;
  trainingBackground: 'none' | 'recreational' | 'competitive' | 'professional';
}

export interface FitnessAssessmentCategory {
  name: string;
  score: number; // 0-100
  label: FitnessLevel;
  detail: string;
}

export interface FitnessAssessmentResult {
  level: FitnessLevel;
  compositeScore: number;       // 0-100
  confidence: 'low' | 'medium' | 'high';
  categories: FitnessAssessmentCategory[];
  summary: string;
  volumeMultiplier: number;     // 0.7 (beginner) → 1.4 (elite)
  intensityCap: number;         // max RPE for initial programming
  recommendedRecoveryDaysPerWeek: number;
}

export interface FitnessProfileRow {
  id: string;
  user_id: string;
  level: FitnessLevel;
  composite_score: number;
  training_years: number;
  weekly_session_count: number;
  sport_experience_years: number;
  training_background: 'none' | 'recreational' | 'competitive' | 'professional';
  derived_from_history: boolean;  // true = updated from training log
  last_updated: string;
  created_at: string;
}

export interface FitnessModifiers {
  volumeMultiplier: number;           // applied to session count / duration targets
  intensityCap: number;               // max RPE for prescribed sessions
  recoveryDayFrequency: number;       // min recovery days per week
  roadWorkDistanceMultiplier: number; // scales run distances
  conditioningRoundsMultiplier: number; // scales conditioning volume
}

// ─── Road Work Types ──────────────────────────────────────────

export type RoadWorkType =
  | 'easy_run'            // zone 2 HR, conversational pace
  | 'tempo'               // zone 3-4, comfortably hard, 20-40 min
  | 'intervals'           // zone 4-5, on/off work
  | 'hill_sprints'        // zone 5, short explosive uphill efforts
  | 'long_slow_distance'  // zone 2, 60-120+ min
  | 'recovery_jog';       // zone 1, very easy, post-session flush

export type HRZone = 1 | 2 | 3 | 4 | 5;

export interface RoadWorkInterval {
  effortLabel: string;   // e.g. "400m sprint" or "2 min hard"
  durationSec: number;
  restSec: number;
  zone: HRZone;
  repetitions: number;
}

export interface RoadWorkPrescription {
  type: RoadWorkType;
  totalDurationMin: number;
  targetDistanceMiles: number | null; // null for interval-based
  hrZone: HRZone;                     // primary zone
  hrZoneRange: [HRZone, HRZone];      // min to max zone
  estimatedMaxHR: number | null;      // null if age unknown
  paceGuidance: string;               // e.g. "8:30-9:00/mi"
  warmupCooldownMin: number;
  intervals: RoadWorkInterval[];      // empty for continuous runs
  progressionNote: string;            // week-over-week advice
  message: string;                    // educational summary
  cnsBudget: number;                  // CNS cost for ACWR integration
  estimatedLoad: number;              // duration × intensity equivalent
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

// ─── Conditioning Types ───────────────────────────────────────

export type ConditioningType =
  | 'heavy_bag_rounds'
  | 'circuit'
  | 'jump_rope'
  | 'sled_work'
  | 'agility_drills'
  | 'sport_specific_drill';

export interface ConditioningExercise {
  name: string;
  durationSec: number | null;  // null = reps-based
  reps: number | null;         // null = time-based
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

// ─── Fight Camp Types ─────────────────────────────────────────

export type CampPhase = 'base' | 'build' | 'peak' | 'taper';

export interface CampPhaseDates {
  start: string;  // ISO date
  end: string;    // ISO date
}

export interface CampConfig {
  id: string;
  user_id: string;
  fightDate: string;
  campStartDate: string;
  totalWeeks: number;
  hasConcurrentCut: boolean;
  basePhaseDates: CampPhaseDates;
  buildPhaseDates: CampPhaseDates;
  peakPhaseDates: CampPhaseDates;
  taperPhaseDates: CampPhaseDates;
  status: 'active' | 'completed' | 'abandoned';
  weighInTiming?: 'same_day' | 'next_day' | null;
  targetWeight?: number | null;
  roundCount?: number | null;
  roundDurationSec?: number | null;
  restDurationSec?: number | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  weightCutState?: 'none' | 'monitoring' | 'driving' | null;
}

export interface CampWeekProfile {
  weekNumber: number;
  campPhase: CampPhase;
  volumeMultiplier: number;
  intensityCap: number;
  mandatorySparringDays: number;
  mandatoryRestDays: number;
  roadWorkFocus: RoadWorkType;
  conditioningFocus: ConditioningType;
  scFocus: WorkoutFocus;
}

export interface CampPlanInput {
  fightDate: string;
  campStartDate: string;
  fitnessLevel: FitnessLevel;
  hasConcurrentCut: boolean;
  userId: string;
}

export interface CampTrainingModifiers {
  volumeMultiplier: number;
  intensityCap: number;
  mandatoryRestDaysPerWeek: number;
  sparringDaysPerWeek: number;
  roadWorkSessionsPerWeek: number;
  conditioningSessionsPerWeek: number;
  scSessionsPerWeek: number;
}

export interface CampPlanRow {
  id: string;
  user_id: string;
  fight_date: string;
  camp_start_date: string;
  total_weeks: number;
  has_concurrent_cut: boolean;
  base_phase_start: string;
  base_phase_end: string;
  build_phase_start: string;
  build_phase_end: string;
  peak_phase_start: string;
  peak_phase_end: string;
  taper_phase_start: string;
  taper_phase_end: string;
  status: 'active' | 'completed' | 'abandoned';
  weigh_in_timing?: 'same_day' | 'next_day' | null;
  target_weight?: number | null;
  round_count?: number | null;
  round_duration_sec?: number | null;
  rest_duration_sec?: number | null;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  weight_cut_state?: 'none' | 'monitoring' | 'driving' | null;
  created_at: string;
  updated_at: string;
}

// ─── Enhanced Weekly Plan & Daily Adaptation ──────────────────

export interface WeekPlanEntry extends Pick<ScheduledActivityRow,
  'date' | 'activity_type' | 'start_time' | 'estimated_duration_min' |
  'expected_intensity' | 'source' | 'engine_recommendation'
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

export interface DailyAdaptationInput {
  today: string;
  todayActivities: ScheduledActivityRow[];
  yesterdayActivities: ScheduledActivityRow[];
  readinessState: ReadinessState;
  acwr: number;
  sleepLastNight: number;         // 1-5
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

// ─── Equipment & Gym Profile Types ───────────────────────────

export type EquipmentItem =
  | 'barbell' | 'dumbbells' | 'kettlebells' | 'cables' | 'pull_up_bar'
  | 'dip_station' | 'resistance_bands' | 'heavy_bag' | 'speed_bag'
  | 'double_end_bag' | 'medicine_balls' | 'battle_ropes' | 'sled'
  | 'assault_bike' | 'rowing_machine' | 'jump_rope' | 'squat_rack'
  | 'bench' | 'plyo_box' | 'trx' | 'smith_machine' | 'leg_press_machine'
  | 'cable_crossover' | 'lat_pulldown_machine';

export interface GymProfileRow {
  id: string;
  user_id: string;
  name: string;
  equipment: EquipmentItem[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Movement Pattern (for equipment substitution) ───────────

export type MovementPattern =
  | 'horizontal_push' | 'horizontal_pull' | 'vertical_push' | 'vertical_pull'
  | 'hip_hinge' | 'squat' | 'lunge' | 'rotation' | 'carry'
  | 'compound' | 'isolation' | 'sport_specific' | 'conditioning' | 'mobility';

// ─── Smart Weekly Plan Types ─────────────────────────────────

export type PlanSlot = 'am' | 'pm' | 'single';
export type PlanEntryStatus = 'planned' | 'completed' | 'skipped' | 'rescheduled';

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
  session_type: string;
  focus: WorkoutFocus | null;
  estimated_duration_min: number;
  target_intensity: number | null;
  status: PlanEntryStatus;
  rescheduled_to: string | null;
  workout_log_id: string | null;
  scheduled_activity_id?: string | null;
  prescription_snapshot: WorkoutPrescriptionV2 | null;
  engine_notes: string | null;
  is_deload: boolean;
  created_at: string;
}

export interface SmartWeekPlanInput {
  config: WeeklyPlanConfigRow;
  readinessState: ReadinessState;
  phase: Phase;
  acwr: number;
  fitnessLevel: FitnessLevel;
  exerciseLibrary: ExerciseLibraryRow[];
  recentExerciseIds?: string[];
  recentMuscleVolume: Record<MuscleGroup, number>;
  campConfig: CampConfig | null;
  activeCutPlan: WeightCutPlanRow | null;
  weeksSinceLastDeload: number;
  gymProfile: GymProfileRow | null;
  weekStartDate: string;
  recurringActivities?: RecurringActivityRow[];
}

export interface SmartWeekPlanResult {
  entries: WeeklyPlanEntryRow[];
  isDeloadWeek: boolean;
  deloadReason: string | null;
  weeklyFocusSplit: Partial<Record<WorkoutFocus, number>>;
  message: string;
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

// ─── Progressive Overload Types ──────────────────────────────

export type ProgressionModel = 'linear' | 'wave' | 'block';

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

export interface PRRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  prType: 'weight' | 'reps' | 'estimated_1rm' | 'volume';
  value: number;
  repsAtPR: number | null;
  weightAtPR: number | null;
  rpeAtPR: number | null;
  estimated1RM: number | null;
  achievedDate: string;
}

export interface PRDetectionResult {
  isNewPR: boolean;
  prType: 'weight' | 'reps' | 'estimated_1rm' | 'volume' | null;
  previousBest: number | null;
  newValue: number | null;
  exerciseName: string;
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

// ─── Warmup Calculator Types ─────────────────────────────────

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

// ─── Adaptive Mid-Workout Types ──────────────────────────────

export type FatigueLevel = 'fresh' | 'moderate' | 'high' | 'extreme';

export interface SessionFatigueState {
  setsCompleted: number;
  cumulativeRPEDelta: number;
  avgRPEDelta: number;
  consecutiveHighRPESets: number;
  fatigueScore: number;
  fatigueLevel: FatigueLevel;
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

export type AdjustmentType =
  | 'weight_reduction' | 'rep_reduction' | 'exercise_swap'
  | 'set_reduction' | 'weight_increase';

export interface ExerciseAdjustment {
  exerciseId: string;
  adjustmentType: AdjustmentType;
  originalValue: number;
  adjustedValue: number;
  swapExerciseId?: string;
  swapExerciseName?: string;
  reason: string;
}

export type FeedbackSeverity = 'positive' | 'neutral' | 'caution' | 'warning';

export interface SetAdaptationResult {
  updatedFatigueState: SessionFatigueState;
  adjustments: ExerciseAdjustment[];
  shouldEndWorkoutEarly: boolean;
  endEarlyReason: string | null;
  feedbackMessage: string;
  feedbackSeverity: FeedbackSeverity;
}

// ─── Rest Timer Types ────────────────────────────────────────

export interface RestTimerConfig {
  exerciseType: ExerciseType;
  defaultSeconds: number;
  minSeconds: number;
  maxSeconds: number;
}

// ─── Camp S&C Integration Types ──────────────────────────────

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

// ─── Extended S&C Types (V2) ─────────────────────────────────

export interface GenerateWorkoutInputV2 extends GenerateWorkoutInput {
  availableMinutes?: number;
  gymEquipment?: EquipmentItem[];
  exerciseHistory?: Map<string, ExerciseHistoryEntry[]>;
  isDeloadWeek?: boolean;
  weeklyPlanFocus?: WorkoutFocus;
  sparringDaysThisWeek?: number;
  isSparringDay?: boolean;
  progressionModel?: ProgressionModel;
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
}

export interface WorkoutPrescriptionV2 extends WorkoutPrescription {
  exercises: PrescribedExerciseV2[];
  estimatedDurationMin: number;
  isDeloadWorkout: boolean;
  equipmentProfile: string | null;
  campPhaseContext: CampPhase | null;
  weeklyPlanDay: number | null;
  sparringDayGuidance: SparringDayGuidance | null;
}











