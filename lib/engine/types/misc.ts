export interface TrainingSessionRow {
  id: string;
  user_id: string;
  date: string;
  duration_minutes: number;
  intensity_srpe: number;
  total_load: number;
}

export interface LoadMetrics {
  weeklyLoad: number;
  monotony: number;
  strain: number;
  acuteEWMA: number;
  chronicEWMA: number;
  rollingFatigueRatio: number;
  rollingFatigueScore: number;
  fatigueBand: 'low' | 'moderate' | 'high' | 'very_high';
  safetyThreshold: number;
  thresholdSource: 'low_chronic' | 'standard_chronic' | 'high_chronic';
  dailyLoads?: number[];
}

export type OvertrainingSeverity = 'info' | 'caution' | 'danger';

export interface OvertrainingWarning {
  severity: OvertrainingSeverity;
  title: string;
  message: string;
  recommendation: string;
}

export type MovementPattern =
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'hip_hinge'
  | 'squat'
  | 'lunge'
  | 'rotation'
  | 'carry'
  | 'compound'
  | 'isolation'
  | 'sport_specific'
  | 'conditioning'
  | 'mobility';

export type HRZone = 1 | 2 | 3 | 4 | 5;

export interface PRRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  prType: 'weight' | 'reps' | 'estimated_1rm' | 'volume';
  value: number;
  repsAtPR: number | null;
  weightAtPR: number | null;
  rpeAtPR: number | null;
  estimated1RM?: number | null;
  achievedDate?: string;
  date?: string;
}

export interface PRDetectionResult {
  isNewPR: boolean;
  prType: 'weight' | 'reps' | 'estimated_1rm' | 'volume' | null;
  previousBest: number | null;
  newValue: number | null;
  exerciseName: string;
}

export type FatigueLevel = 'fresh' | 'moderate' | 'high' | 'extreme';

export interface SessionFatigueState {
  setsCompleted: number;
  cumulativeRPEDelta: number;
  avgRPEDelta: number;
  consecutiveHighRPESets: number;
  fatigueScore: number;
  fatigueLevel: FatigueLevel;
}

export type AdjustmentType =
  | 'weight_reduction'
  | 'rep_reduction'
  | 'exercise_swap'
  | 'set_reduction'
  | 'weight_increase';

export type FeedbackSeverity = 'positive' | 'neutral' | 'caution' | 'warning';
