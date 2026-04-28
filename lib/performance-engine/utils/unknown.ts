import type { KnownOrUnknown, KnownValue, UnknownReason, UnknownValue } from '../types/shared.ts';
import { UNKNOWN_CONFIDENCE } from '../types/shared.ts';

export function unknownValue(reason: UnknownReason = 'not_collected', note?: string): UnknownValue {
  return note ? { status: 'unknown', reason, note } : { status: 'unknown', reason };
}

export function knownValue<T>(value: T, source?: string | null): KnownValue<T> {
  return {
    status: 'known',
    value,
    confidence: UNKNOWN_CONFIDENCE,
    source: source ?? null,
  };
}

export function fromNullable<T>(
  value: T | null | undefined,
  reason: UnknownReason = 'not_collected',
): KnownOrUnknown<T> {
  return value === null || value === undefined ? unknownValue(reason) : knownValue(value);
}

export function isKnown<T>(value: KnownOrUnknown<T>): value is KnownValue<T> {
  return value.status === 'known';
}

export function valueOrNull<T>(value: KnownOrUnknown<T>): T | null {
  return isKnown(value) ? value.value : null;
}
