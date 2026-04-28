import type { FightStatus, Phase } from './foundational.ts';
import type { EngineSafetyWarning } from './safety.ts';

export type BodyMassTrendStatus =
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
  status: BodyMassTrendStatus;
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

export type WeightClassPlanStatus = 'active' | 'completed' | 'abandoned' | 'paused';
export type WeightClassSport = 'boxing' | 'mma';

export interface BodyMassSafetyFlag {
  severity: 'info' | 'warning' | 'danger';
  code: string;
  title: string;
  message: string;
  recommendation: string;
}

export interface WeightClassPlanRow {
  id: string;
  user_id: string;
  start_weight: number;
  target_weight: number;
  weight_class_name: string | null;
  sport: WeightClassSport;
  fight_date: string;
  weigh_in_date: string;
  plan_created_date: string;
  fight_status: FightStatus;
  max_fight_week_body_mass_change_pct: number;
  required_body_mass_change_lbs: number;
  gradual_body_mass_target_lbs: number;
  competition_week_body_mass_change_lbs: number;
  chronic_phase_start: string | null;
  chronic_phase_end: string | null;
  intensified_phase_start: string | null;
  intensified_phase_end: string | null;
  fight_week_start: string | null;
  weigh_in_day: string;
  rehydration_start: string | null;
  status: WeightClassPlanStatus;
  completed_at: string | null;
  safe_weekly_loss_rate: number;
  calorie_floor: number;
  baseline_cognitive_score: number | null;
  coach_notes: string | null;
  biological_sex?: 'male' | 'female' | null;
  risk_acknowledged_at?: string | null;
  risk_acknowledgement_version?: string | null;
  risk_warning_snapshot?: EngineSafetyWarning[] | null;
  created_at: string;
  updated_at: string;
}

export interface BodyMassSafetyCheckRow {
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

export interface WeightClassHistoryRow {
  id: string;
  user_id: string;
  plan_id: string;
  start_weight: number;
  final_weigh_in_weight: number | null;
  target_weight: number;
  made_weight: boolean | null;
  total_duration_days: number | null;
  gradual_body_mass_change_lbs: number | null;
  competition_week_body_mass_change_lbs: number | null;
  avg_weekly_loss_rate: number | null;
  rehydration_weight_regained: number | null;
  fight_day_weight: number | null;
  adherence_pct: number | null;
  refeed_days_used: number | null;
  diet_breaks_used: number | null;
  safety_flags_triggered: BodyMassSafetyFlag[];
  fight_date: string | null;
  completed_at: string;
}

export interface BodyMassDashboardData {
  activePlan: WeightClassPlanRow | null;
  weightHistory: WeightDataPoint[];
  safetyChecks: BodyMassSafetyCheckRow[];
  weightClassHistory: WeightClassHistoryRow[];
  projectedWeightByWeighIn: number | null;
  adherenceLast7Days: number;
}
