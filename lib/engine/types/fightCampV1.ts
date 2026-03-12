import type { CampConfig } from './camp';

export type AthleteGoalMode = 'fight_camp' | 'build_phase';
export type BuildPhaseGoalType = 'strength' | 'conditioning' | 'boxing_skill' | 'weight_class_prep';
export type PerformanceGoalType = BuildPhaseGoalType;
export type ConstraintTier = 'mandatory' | 'preferred';
export type WeighInTiming = 'same_day' | 'next_day';
export type WeightCutInfluenceState = 'none' | 'monitoring' | 'driving';
export type CampRecommendationSeverity = 'info' | 'recommended' | 'strongly_recommended';
export type RecommendationLifecycleStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BuildPhaseGoalRow {
  id: string;
  user_id: string;
  goal_type: BuildPhaseGoalType;
  goal_label: string | null;
  goal_statement: string;
  target_metric: string;
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  target_horizon_weeks: number | null;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface CampRecommendationPayload {
  reason: string;
  severity: CampRecommendationSeverity;
  affectedSubsystem: 'boxing' | 'sc' | 'road_work' | 'conditioning' | 'nutrition' | 'hydration' | 'recovery' | 'schedule';
  recommendedChange: string;
  educationalExplanation: string;
}

export interface FightCampSetupInput {
  goalMode: AthleteGoalMode;
  performanceGoalType?: PerformanceGoalType;
  fightDate?: string;
  campStartDate?: string;
  weighInTiming?: WeighInTiming;
  targetWeight?: number | null;
  roundCount?: number;
  roundDurationSec?: number;
  restDurationSec?: number;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
}

export interface BuildPhaseSetupInput {
  goalType: BuildPhaseGoalType;
  goalLabel?: string | null;
  goalStatement: string;
  targetMetric: string;
  targetValue?: number | null;
  targetUnit?: string | null;
  targetDate?: string | null;
  targetHorizonWeeks?: number | null;
}

export interface FightCampStatus {
  camp: CampConfig | null;
  campPhase: 'base' | 'build' | 'peak' | 'taper' | null;
  daysOut: number | null;
  weightCutState: WeightCutInfluenceState;
  label: string;
}
