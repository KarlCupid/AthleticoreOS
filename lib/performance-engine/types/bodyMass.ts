import type { BodyMassMeasurement, BodyMassUnit } from '../utils/bodyMassUnits.ts';
import type { ConfidenceValue, ISODateString, MeasurementRange, UnknownField } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';
import type { RiskFlag } from './risk.ts';

export type BodyMassTrendDirection = 'unknown' | 'stable' | 'gaining' | 'losing';
export type WeightClassPlanStatus = 'none' | 'exploratory' | 'planned' | 'active' | 'paused' | 'completed' | 'canceled';
export type WeightClassPlanMode = 'monitor' | 'gradual_change' | 'fight_week_support';

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
  sport: 'boxing' | 'mma' | 'other_combat_sport';
  status: WeightClassPlanStatus;
  mode: WeightClassPlanMode;
  targetClassName: string | null;
  targetBodyMassRange: MeasurementRange<BodyMassUnit>;
  weighInDate: ISODateString | null;
  competitionDate: ISODateString | null;
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
