import { toFiniteNumberOrNull } from './numbers.ts';

export type DurationUnit = 'seconds' | 'minutes' | 'hours';

export interface Duration {
  minutes: number;
  sourceUnit: DurationUnit;
}

export function normalizeDurationMinutes(value: unknown, unit: DurationUnit = 'minutes'): number | null {
  const numeric = toFiniteNumberOrNull(value);

  if (numeric === null || numeric < 0) {
    return null;
  }

  switch (unit) {
    case 'seconds':
      return numeric / 60;
    case 'minutes':
      return numeric;
    case 'hours':
      return numeric * 60;
  }
}

export function createDuration(value: unknown, unit: DurationUnit = 'minutes'): Duration | null {
  const minutes = normalizeDurationMinutes(value, unit);
  return minutes === null ? null : { minutes, sourceUnit: unit };
}
