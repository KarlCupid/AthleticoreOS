import type {
  ConfidenceValue,
  DataAvailability,
  ISODateString,
  ISODateTimeString,
  MeasurementRange,
  SourceReference,
  UnknownField,
} from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';
import type { RiskFlag } from './risk.ts';

export type TrackingEntryKind =
  | 'body_mass'
  | 'sleep'
  | 'readiness'
  | 'pain'
  | 'soreness'
  | 'hydration'
  | 'mood'
  | 'cycle'
  | 'symptom'
  | 'training_outcome'
  | 'nutrition_actual';

export interface TrackingEntry {
  id: string;
  athleteId: string;
  kind: TrackingEntryKind;
  date: ISODateString | null;
  recordedAt: ISODateTimeString | null;
  value: number | string | boolean | null;
  unit: string | null;
  availability: DataAvailability;
  confidence: ConfidenceValue;
  source: SourceReference | null;
  notes: string | null;
}

export type ReadinessBand = 'unknown' | 'prime' | 'build' | 'caution' | 'protect';

export interface ReadinessDimensionState {
  score: MeasurementRange<'percent'>;
  availability: DataAvailability;
  drivers: string[];
}

export interface ReadinessState {
  date: ISODateString | null;
  band: ReadinessBand;
  overall: MeasurementRange<'percent'>;
  neural: ReadinessDimensionState;
  structural: ReadinessDimensionState;
  metabolic: ReadinessDimensionState;
  missingFields: UnknownField[];
  riskFlags: RiskFlag[];
  confidence: ConfidenceValue;
  explanation: Explanation | null;
}

export function createUnknownReadinessState(date: ISODateString | null = null): ReadinessState {
  const unknownScore: MeasurementRange<'percent'> = {
    min: null,
    target: null,
    max: null,
    unit: 'percent',
    confidence: UNKNOWN_CONFIDENCE,
    precision: 'unknown',
  };

  const unknownDimension: ReadinessDimensionState = {
    score: unknownScore,
    availability: 'unknown',
    drivers: [],
  };

  return {
    date,
    band: 'unknown',
    overall: unknownScore,
    neural: unknownDimension,
    structural: unknownDimension,
    metabolic: unknownDimension,
    missingFields: [{ field: 'readiness_check_in', reason: 'not_collected' }],
    riskFlags: [],
    confidence: UNKNOWN_CONFIDENCE,
    explanation: null,
  };
}
