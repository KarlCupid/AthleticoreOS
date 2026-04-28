import type { BodyMassMeasurement, BodyMassUnit } from '../utils/bodyMassUnits.ts';
import type { ConfidenceValue, ISODateString, MeasurementRange, UnknownField } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';
import type { AthleticorePhase } from './phase.ts';
import type { RiskFlag } from './risk.ts';

export type BodyMassTrendDirection = 'unknown' | 'stable' | 'gaining' | 'losing';
export type WeightClassPlanStatus = 'none' | 'exploratory' | 'planned' | 'active' | 'paused' | 'completed' | 'canceled';
export type WeightClassPlanMode = 'monitor' | 'gradual_change' | 'fight_week_support';
export type WeightClassFeasibilityStatus = 'feasible' | 'aggressive' | 'high_risk' | 'unsafe' | 'insufficient_data';
export type WeightClassRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type WeightClassManagementPhase =
  | 'unknown'
  | 'long_term_body_composition'
  | 'gradual_weight_class_preparation'
  | 'competition_week_body_mass_monitoring'
  | 'weigh_in_logistics'
  | 'post_weigh_in_recovery_tracking'
  | 'high_risk_review';

export type BodyMassSafetyFlagCode =
  | 'missing_body_mass_data'
  | 'missing_target_class'
  | 'missing_timeframe'
  | 'impossible_timeframe'
  | 'rapid_body_mass_decline'
  | 'unsafe_required_rate'
  | 'high_risk_required_rate'
  | 'minor_athlete_review_required'
  | 'medical_review_required'
  | 'under_fueling_screen_positive'
  | 'repeated_rapid_cycling'
  | 'severe_restriction_pattern'
  | 'fight_target_unsafe';

export interface BodyMassSafetyFlag {
  code: BodyMassSafetyFlagCode;
  severity: WeightClassRiskLevel;
  message: string;
  blocksPlan: boolean;
  riskFlagCode?: RiskFlag['code'];
}

export interface BodyMassChange {
  value: number | null;
  unit: BodyMassUnit;
  direction: 'loss_required' | 'gain_or_maintenance' | 'none' | 'unknown';
}

export interface BodyMassRateOfChange {
  value: number | null;
  unit: `${BodyMassUnit}_per_week`;
  percentOfBodyMassPerWeek: number | null;
}

export interface WeightClassPlanAlternative {
  type:
    | 'choose_safer_class'
    | 'extend_timeline'
    | 'hold_current_class'
    | 'professional_review'
    | 'performance_first_recomposition';
  label: string;
  explanation: string;
  targetClassMass: BodyMassMeasurement | null;
  timeframeDays: number | null;
}

export interface BodyMassTrend {
  direction: BodyMassTrendDirection;
  weeklyChange: MeasurementRange<BodyMassUnit>;
  confidence: ConfidenceValue;
}

export interface BodyMassState {
  current: BodyMassMeasurement | null;
  trend: BodyMassTrend;
  targetRange: MeasurementRange<BodyMassUnit>;
  missingFields: UnknownField[];
  riskFlags: RiskFlag[];
  explanation: Explanation | null;
  confidence: ConfidenceValue;
}

export interface WeightClassPlan {
  id: string;
  athleteId: string;
  sport: 'boxing' | 'mma' | 'other_combat_sport';
  competitionId: string | null;
  competitionDate: ISODateString | null;
  weighInDateTime: string | null;
  competitionDateTime: string | null;
  currentBodyMass: BodyMassMeasurement | null;
  targetClassMass: BodyMassMeasurement | null;
  desiredScaleWeight: BodyMassMeasurement | null;
  recentBodyMassTrend: BodyMassTrend;
  phase: AthleticorePhase | WeightClassManagementPhase;
  timeframeDays: number | null;
  requiredChange: BodyMassChange;
  requiredRateOfChange: BodyMassRateOfChange;
  feasibilityStatus: WeightClassFeasibilityStatus;
  riskLevel: WeightClassRiskLevel;
  safetyFlags: BodyMassSafetyFlag[];
  professionalReviewRequired: boolean;
  nutritionImplications: string[];
  trainingImplications: string[];
  hydrationConcerns: string[];
  alternatives: WeightClassPlanAlternative[];
  status: WeightClassPlanStatus;
  mode: WeightClassPlanMode;
  targetClassName: string | null;
  targetBodyMassRange: MeasurementRange<BodyMassUnit>;
  weighInDate: ISODateString | null;
  safetyStatus: 'unknown' | 'acceptable' | 'watch' | 'unsafe';
  riskFlags: RiskFlag[];
  explanation: Explanation | null;
  confidence: ConfidenceValue;
}

export function createUnknownBodyMassState(unit: BodyMassUnit = 'lb'): BodyMassState {
  return {
    current: null,
    trend: {
      direction: 'unknown',
      weeklyChange: {
        min: null,
        target: null,
        max: null,
        unit,
        confidence: UNKNOWN_CONFIDENCE,
        precision: 'unknown',
      },
      confidence: UNKNOWN_CONFIDENCE,
    },
    targetRange: {
      min: null,
      target: null,
      max: null,
      unit,
      confidence: UNKNOWN_CONFIDENCE,
      precision: 'unknown',
    },
    missingFields: [{ field: 'current_body_mass', reason: 'not_collected' }],
    riskFlags: [],
    explanation: null,
    confidence: UNKNOWN_CONFIDENCE,
  };
}
