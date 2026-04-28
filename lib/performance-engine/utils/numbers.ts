export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function toFiniteNumberOrNull(value: unknown): number | null {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toNonNegativeNumberOrNull(value: unknown): number | null {
  const parsed = toFiniteNumberOrNull(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

export function toPositiveNumberOrNull(value: unknown): number | null {
  const parsed = toFiniteNumberOrNull(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Cannot clamp a non-finite number.');
  }

  if (min > max) {
    throw new Error('Clamp min cannot be greater than max.');
  }

  return Math.min(Math.max(value, min), max);
}

export function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    throw new Error('roundToStep requires finite positive inputs.');
  }

  return Math.round(value / step) * step;
}
