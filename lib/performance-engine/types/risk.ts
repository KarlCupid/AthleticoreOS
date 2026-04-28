import type { ConfidenceValue, ISODateString, ISODateTimeString } from './shared.ts';
import type { Explanation } from './explanation.ts';

export type RiskDomain =
  | 'training_load'
  | 'readiness'
  | 'nutrition'
  | 'hydration'
  | 'body_mass'
  | 'weight_cut'
  | 'injury'
  | 'illness'
  | 'data_quality'
  | 'phase_transition'
  | 'fight_opportunity'
  | 'competition'
  | 'plan_integrity'
  | 'professional_review'
  | 'safety';

export type RiskFlagCode =
  | 'under_fueling_risk'
  | 'unsafe_weight_class_target'
  | 'excessive_training_load'
  | 'protected_workout_conflict'
  | 'poor_readiness'
  | 'injury_conflict'
  | 'illness_conflict'
  | 'missing_data'
  | 'low_nutrition_confidence'
  | 'rapid_body_mass_change'
  | 'competition_proximity_conflict'
  | 'duplicate_or_conflicting_plan'
  | 'professional_review_required';

export type RiskSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';
export type RiskFlagStatus = 'active' | 'monitoring' | 'resolved';

export interface RiskEvidence {
  metric: string;
  value: number | string | boolean | null;
  threshold?: number | string | null;
  note?: string;
}

export interface RiskFlag {
  id: string;
  domain: RiskDomain;
  code: RiskFlagCode;
  severity: RiskSeverity;
  status: RiskFlagStatus;
  message: string;
  evidence: RiskEvidence[];
  blocksPlan: boolean;
  hardStop: boolean;
  requiresProfessionalReview: boolean;
  appliesOn: ISODateString | null;
  resolvedAt: ISODateTimeString | null;
  confidence: ConfidenceValue;
  explanation: Explanation | null;
}
