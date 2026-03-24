import type { FightStatus, Phase, ReadinessState } from './foundational.ts';
import type { NutritionTargets } from './nutrition.ts';
import type { ActivityType } from './schedule.ts';

export type WeightCutStatus =
  | 'on_track'
  | 'ahead'
  | 'behind'
  | 'stalled'
  | 'gaining'
  | 'no_target';

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
  weeklyVelocityLbs: number;
  totalChangeLbs: number;
  remainingLbs: number;
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
  isRapidLoss: boolean;
  percentComplete: number;
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
  penaltyPoints: number;
  isStressor: boolean;
  message: string;
}

export type CutPhase =
  | 'chronic'
  | 'intensified'
  | 'fight_week_load'
  | 'fight_week_cut'
  | 'weigh_in'
  | 'rehydration';

export type CutPlanStatus = 'active' | 'completed' | 'abandoned' | 'paused';
export type CutSport = 'boxing' | 'mma';

export interface CutPlanInput {
  startWeight: number;
  targetWeight: number;
  fightDate: string;
  weighInDate: string;
  fightStatus: FightStatus;
  biologicalSex: 'male' | 'female';
  sport: CutSport;
}

export interface CutPhaseDates {
  start: string;
  end: string;
}

export interface CutPlanResult {
  valid: boolean;
  validationErrors: string[];
  safetyWarnings: string[];
  extremeCutWarning: boolean;
  totalCutLbs: number;
  totalCutPct: number;
  dietPhaseTargetLbs: number;
  waterCutAllocationLbs: number;
  chronicPhaseWeeks: number;
  intensifiedPhaseWeeks: number;
  chronicPhaseDates: CutPhaseDates | null;
  intensifiedPhaseDates: CutPhaseDates;
  fightWeekDates: CutPhaseDates;
  weighInDate: string;
  safeWeeklyLossRateLbs: number;
  calorieFloor: number;
  maxWaterCutPct: number;
  estimatedDailyDeficitChronic: number;
  estimatedDailyDeficitIntensified: number;
}

export interface CutSafetyFlag {
  severity: 'info' | 'warning' | 'danger';
  code: string;
  title: string;
  message: string;
  recommendation: string;
}

export interface DailyCutProtocolInput {
  plan: WeightCutPlanRow;
  date: string;
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
  urineColor: number | null;
  bodyTempF: number | null;
  consecutiveDepletedDays: number;
}

export interface DailyCutProtocolResult {
  date: string;
  cutPhase: CutPhase;
  daysToWeighIn: number;
  weightDriftLbs: number | null;
  prescribedCalories: number;
  prescribedProtein: number;
  prescribedCarbs: number;
  prescribedFat: number;
  isRefeedDay: boolean;
  isCarbCycleHigh: boolean;
  waterTargetOz: number;
  sodiumTargetMg: number | null;
  sodiumInstruction: string;
  fiberInstruction: string;
  trainingIntensityCap: number | null;
  trainingRecommendation: string;
  interventionReason: string | null;
  morningProtocol: string;
  afternoonProtocol: string;
  eveningProtocol: string;
  safetyFlags: CutSafetyFlag[];
  rehydrationProtocol?: RehydrationProtocolResult | null;
}

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

export interface CarbCycleInput {
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  isTrainingDay: boolean;
  hasHighIntensitySession: boolean;
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

export interface RehydrationPhase {
  name?: string;
  startTime?: string;
  fluidTargetLiters?: number;
  sodiumTargetMg?: number;
  protocol?: string;
  timeWindow?: string;
  fluidInstruction?: string;
  foodInstruction?: string | null;
  sodiumInstruction?: string | null;
  targetFluidOz?: number;
}

export interface RehydrationInput {
  weighInWeightLbs?: number;
  targetWeightLbs?: number;
  hoursToFight?: number;
  currentWeight?: number;
  targetWeight?: number;
  weighInTime?: string;
  fightTime?: string;
  biologicalSex: 'male' | 'female';
}

export interface RehydrationProtocolResult {
  phases: RehydrationPhase[];
  targetRegainLbs: number;
  totalFluidTargetLiters: number;
  totalSodiumTargetMg: number;
  hoursAvailable: number;
  targetWeightByFight: number;
  weightToRegainLbs: number;
  totalFluidOz: number;
  monitorMetrics: string[];
  message: string;
}

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

export interface CutHydrationInput {
  cutPhase: CutPhase;
  daysToWeighIn: number;
  currentWeightLbs: number;
  baseHydrationOz: number;
  fightStatus: FightStatus;
}

export interface CutHydrationResult {
  dailyWaterOz: number;
  instruction: string;
  sodiumInstruction: string;
  isRestricting: boolean;
}

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
  biological_sex?: 'male' | 'female' | null;
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
  weight_drift_lbs: number | null;
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
  intervention_reason: string | null;
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

export interface WeightCutDashboardData {
  activePlan: WeightCutPlanRow | null;
  todayProtocol: DailyCutProtocolRow | null;
  weightHistory: WeightDataPoint[];
  safetyChecks: CutSafetyCheckRow[];
  cutHistory: WeightCutHistoryRow[];
  projectedWeightByWeighIn: number | null;
  adherenceLast7Days: number;
}
