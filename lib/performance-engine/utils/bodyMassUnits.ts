import type { ConfidenceValue, ISODateString } from '../types/shared.ts';
import { UNKNOWN_CONFIDENCE } from '../types/shared.ts';
import { toPositiveNumberOrNull } from './numbers.ts';

export type BodyMassUnit = 'lb' | 'kg';

export interface BodyMassMeasurement {
  value: number;
  unit: BodyMassUnit;
  measuredOn: ISODateString | null;
  sourceUnit: BodyMassUnit;
  confidence: ConfidenceValue;
}

const LB_PER_KG = 2.2046226218;

export function convertBodyMass(value: number, fromUnit: BodyMassUnit, toUnit: BodyMassUnit): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Body mass conversion requires a positive finite value.');
  }

  if (fromUnit === toUnit) {
    return value;
  }

  return fromUnit === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}

export function normalizeBodyMass(input: {
  value: unknown;
  fromUnit: BodyMassUnit;
  toUnit?: BodyMassUnit;
  measuredOn?: ISODateString | null;
  confidence?: ConfidenceValue;
}): BodyMassMeasurement | null {
  const value = toPositiveNumberOrNull(input.value);

  if (value === null) {
    return null;
  }

  const targetUnit = input.toUnit ?? input.fromUnit;

  return {
    value: convertBodyMass(value, input.fromUnit, targetUnit),
    unit: targetUnit,
    measuredOn: input.measuredOn ?? null,
    sourceUnit: input.fromUnit,
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
  };
}
