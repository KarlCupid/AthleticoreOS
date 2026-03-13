import type { Phase } from './foundational';

export type MacroAdherenceStatus = 'Target Met' | 'Close Enough' | 'Missed It';

export type PrimaryLimiter =
  | 'sleep'
  | 'stress'
  | 'soreness'
  | 'nutrition'
  | 'hydration'
  | 'time'
  | 'none';

export type NutritionBarrier =
  | 'appetite'
  | 'timing'
  | 'cravings'
  | 'prep'
  | 'social'
  | 'none';

export type CoachingFocus = 'recovery' | 'execution' | 'consistency' | 'nutrition';

export type DailyReadinessBand = 'push' | 'build' | 'recover';

export type CoachPillar = 'training' | 'recovery' | 'nutrition';

export interface DailyCoachActionStep {
  pillar: CoachPillar;
  priority: 1 | 2 | 3;
  action: string;
  why: string;
}

export interface DailyCoachDebrief {
  readiness_band: DailyReadinessBand;
  headline: string;
  reasoning: string;
  action_steps: DailyCoachActionStep[];
  education_title: string;
  education_topic: string;
  teaching_snippet: string;
  today_application: string;
  risk_flags: string[];
  acwr_status: 'safe' | 'caution' | 'redline';
  generated_at: string;
  primary_limiter: PrimaryLimiter;
}

export interface DailyCoachDebriefHistory {
  education_topic?: string | null;
  risk_flags?: string[] | null;
  primary_limiter?: PrimaryLimiter | null;
}

export interface DailyCoachDebriefInput {
  sleepQuality: number;
  readiness: number;
  stressLevel?: number | null;
  sorenessLevel?: number | null;
  confidenceLevel?: number | null;
  primaryLimiter?: PrimaryLimiter | null;
  nutritionAdherence?: MacroAdherenceStatus | null;
  nutritionBarrier?: NutritionBarrier | null;
  coachingFocus?: CoachingFocus | null;
  trainingLoadSummary: {
    plannedMinutes: number;
    plannedIntensity: number;
    totalLoad: number;
    acuteLoad: number;
    chronicLoad: number;
    acwrRatio: number;
    acwrStatus: 'safe' | 'caution' | 'redline';
  };
  context: {
    phase: Phase;
    campLabel?: string | null;
    isOnActiveCut?: boolean;
  };
  previousDebrief?: DailyCoachDebriefHistory | null;
}
