import type { ISODateString } from '../types/shared.ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseISODateParts(value: string): { year: number; month: number; day: number } | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isISODateString(value: unknown): value is ISODateString {
  return typeof value === 'string' && parseISODateParts(value) !== null;
}

export function normalizeISODate(value: unknown): ISODateString | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (isISODateString(trimmed)) {
      return trimmed;
    }

    if (ISO_DATE_PATTERN.test(trimmed)) {
      return null;
    }

    const parsed = new Date(trimmed);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
  }

  return null;
}

export function addDays(date: ISODateString, days: number): ISODateString {
  const parts = parseISODateParts(date);

  if (!parts || !Number.isFinite(days)) {
    throw new Error('addDays requires a valid ISO date and finite day count.');
  }

  const utc = Date.UTC(parts.year, parts.month - 1, parts.day);
  return new Date(utc + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function daysBetween(start: ISODateString, end: ISODateString): number {
  const startParts = parseISODateParts(start);
  const endParts = parseISODateParts(end);

  if (!startParts || !endParts) {
    throw new Error('daysBetween requires valid ISO date strings.');
  }

  const startUtc = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const endUtc = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
  return Math.round((endUtc - startUtc) / MS_PER_DAY);
}
