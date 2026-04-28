import type { FightStatus, Phase } from './foundational.ts';
import type { EngineSafetyWarning } from './safety.ts';

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

export type CutPlanStatus = 'active' | 'completed' | 'abandoned' | 'paused';
export type CutSport = 'boxing' | 'mma';

export interface CutSafetyFlag {
  severity: 'info' | 'warning' | 'danger';
  code: string;
  title: string;
  message: string;
  recommendation: string;
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
  risk_acknowledged_at?: string | null;
  risk_acknowledgement_version?: string | null;
  risk_warning_snapshot?: EngineSafetyWarning[] | null;
  created_at: string;
  updated_at: string;
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
  weightHistory: WeightDataPoint[];
  safetyChecks: CutSafetyCheckRow[];
  cutHistory: WeightCutHistoryRow[];
  projectedWeightByWeighIn: number | null;
  adherenceLast7Days: number;
}
