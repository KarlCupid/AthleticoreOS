export type ISODateString = string;
export type ISODateTimeString = string;

export type UnknownReason =
  | 'not_collected'
  | 'not_applicable'
  | 'not_yet_calculated'
  | 'withheld'
  | 'invalid'
  | 'legacy_unavailable';

export type DataAvailability = 'known' | 'partial' | 'unknown' | 'not_applicable';

export type ConfidenceLevel = 'unknown' | 'low' | 'medium' | 'high';

export interface ConfidenceValue {
  level: ConfidenceLevel;
  score: number | null;
  reasons: string[];
}

export interface UnknownField {
  field: string;
  reason: UnknownReason;
  note?: string;
}

export type KnownValue<T> = {
  status: 'known';
  value: T;
  confidence: ConfidenceValue;
  source?: string | null;
};

export type UnknownValue = {
  status: 'unknown';
  reason: UnknownReason;
  note?: string;
};

export type KnownOrUnknown<T> = KnownValue<T> | UnknownValue;

export type MeasurementUnit =
  | 'kcal'
  | 'g'
  | 'mg'
  | 'oz'
  | 'ml'
  | 'lb'
  | 'kg'
  | 'minute'
  | 'hour'
  | 'rpe'
  | 'percent'
  | 'count';

export interface MeasurementRange<TUnit extends string = MeasurementUnit> {
  min: number | null;
  target: number | null;
  max: number | null;
  unit: TUnit;
  confidence: ConfidenceValue;
  precision: 'known_exact' | 'estimated' | 'range' | 'unknown';
}

export interface SourceReference {
  source: string;
  sourceId?: string | null;
  capturedAt?: ISODateTimeString | null;
}

export interface ModelMetadata {
  createdAt: ISODateTimeString | null;
  updatedAt: ISODateTimeString | null;
  source: SourceReference | null;
}

export const UNKNOWN_CONFIDENCE: ConfidenceValue = {
  level: 'unknown',
  score: null,
  reasons: ['No reliable data has been provided yet.'],
};

export const LOW_CONFIDENCE: ConfidenceValue = {
  level: 'low',
  score: 0.25,
  reasons: ['Data is sparse or partially estimated.'],
};

export const MEDIUM_CONFIDENCE: ConfidenceValue = {
  level: 'medium',
  score: 0.6,
  reasons: ['Data is usable but not fully established.'],
};

export const HIGH_CONFIDENCE: ConfidenceValue = {
  level: 'high',
  score: 0.9,
  reasons: ['Data is recent and consistent.'],
};
