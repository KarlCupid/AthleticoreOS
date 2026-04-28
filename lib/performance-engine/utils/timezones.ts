import type { ISODateString } from '../types/shared.ts';

export const DEFAULT_TIMEZONE = 'UTC';

export type TimeZoneId = string;

export function isValidTimeZone(value: unknown): value is TimeZoneId {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: unknown, fallback: TimeZoneId = DEFAULT_TIMEZONE): TimeZoneId {
  return isValidTimeZone(value) ? value : fallback;
}

export function dateInTimeZone(value: Date, timeZone: TimeZoneId): ISODateString {
  if (!Number.isFinite(value.getTime())) {
    throw new Error('dateInTimeZone requires a valid Date.');
  }

  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const partMap = parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}
