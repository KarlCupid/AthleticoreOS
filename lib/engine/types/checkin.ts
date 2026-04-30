import type { Phase } from './foundational.ts';
import type { ComplianceReason } from './training.ts';

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
  compliance_reasons_14d?: ComplianceReason[] | null;
}

export interface DailyCoachDebriefInput {
  sleepQuality: number;
  readiness: number;
  energyLevel?: number | null | undefined;
  fuelHydrationStatus?: number | null | undefined;
  painLevel?: number | null | undefined;
  stressLevel?: number | null | undefined;
  sorenessLevel?: number | null | undefined;
  confidenceLevel?: number | null | undefined;
  primaryLimiter?: PrimaryLimiter | null | undefined;
  nutritionAdherence?: MacroAdherenceStatus | null | undefined;
  nutritionBarrier?: NutritionBarrier | null | undefined;
  coachingFocus?: CoachingFocus | null | undefined;
  complianceReason?: ComplianceReason | null | undefined;
  complianceReasonHistory14d?: ComplianceReason[] | null | undefined;
  skippedMovementPatterns48h?: string[] | null | undefined;
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
    campLabel?: string | null | undefined;
    hasActiveWeightClassPlan?: boolean | undefined;
  };
  previousDebrief?: DailyCoachDebriefHistory | null | undefined;
}
