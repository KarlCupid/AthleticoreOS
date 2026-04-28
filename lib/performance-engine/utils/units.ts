import type { ConfidenceValue, MeasurementRange, MeasurementUnit } from '../types/shared.ts';
import { UNKNOWN_CONFIDENCE } from '../types/shared.ts';
import { toFiniteNumberOrNull } from './numbers.ts';

export function createUnknownRange<TUnit extends MeasurementUnit | string>(
  unit: TUnit,
  confidence: ConfidenceValue = UNKNOWN_CONFIDENCE,
): MeasurementRange<TUnit> {
  return {
    min: null,
    target: null,
    max: null,
    unit,
    confidence,
    precision: 'unknown',
  };
}

export function createMeasurementRange<TUnit extends MeasurementUnit | string>(input: {
  min?: unknown;
  target?: unknown;
  max?: unknown;
  unit: TUnit;
  confidence?: ConfidenceValue;
}): MeasurementRange<TUnit> {
  const min = toFiniteNumberOrNull(input.min);
  const target = toFiniteNumberOrNull(input.target);
  const max = toFiniteNumberOrNull(input.max);
  const hasKnownValue = min !== null || target !== null || max !== null;

  return {
    min,
    target,
    max,
    unit: input.unit,
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
    precision: hasKnownValue ? (min !== null || max !== null ? 'range' : 'estimated') : 'unknown',
  };
}
