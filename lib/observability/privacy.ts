export const REDACTED = '[redacted]';
export const REDACTED_ID = '[redacted-id]';

export type SanitizedPrimitive = string | number | boolean | null;
export type SanitizedValue = SanitizedPrimitive | SanitizedValue[] | { [key: string]: SanitizedValue };

const MAX_STRING_LENGTH = 240;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

const SENSITIVE_KEY_PATTERN = /email|password|token|secret|authorization|anon.?key|service.?role|nutrition|food|meal|ingredient|macro|calorie|protein|carb|fat|water|hydration|urine|weight|body.?mass|lbs|kg|readiness|sleep|symptom|soreness|pain|menstrual|period|cycle|note|text|barcode|intake|rpe|actual.?snapshot|target.?snapshot/i;
const PII_ID_KEY_PATTERN = /^(userId|user_id|profileId|profile_id|accountId|account_id|athleteId|athlete_id|ownerId|owner_id)$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSensitiveMonitoringKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function isPiiIdentifierKey(key: string): boolean {
  return PII_ID_KEY_PATTERN.test(key);
}

export function redactSensitiveString(value: string): string {
  const redacted = value
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted-token]')
    .replace(JWT_PATTERN, '[redacted-token]');

  if (redacted.length <= MAX_STRING_LENGTH) {
    return redacted;
  }

  return `${redacted.slice(0, MAX_STRING_LENGTH)}...`;
}

function sanitizeValue(value: unknown, key: string, depth: number): SanitizedValue {
  if (key.toLowerCase() === 'url') {
    return sanitizeUrl(value);
  }

  if (isPiiIdentifierKey(key)) {
    return REDACTED_ID;
  }

  if (isSensitiveMonitoringKey(key)) {
    if (typeof value === 'boolean' || value === null || value === undefined) {
      return Boolean(value);
    }

    return REDACTED;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return redactSensitiveString(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: redactSensitiveString(value.name),
      message: redactSensitiveString(value.message),
    };
  }

  if (Array.isArray(value)) {
    if (depth <= 0) {
      return `[array:${value.length}]`;
    }

    return value.slice(0, 20).map((entry) => sanitizeValue(entry, key, depth - 1));
  }

  if (isPlainObject(value)) {
    if (depth <= 0) {
      return '[object]';
    }

    return sanitizeMonitoringContext(value, depth - 1);
  }

  return redactSensitiveString(String(value));
}

export function sanitizeMonitoringContext(
  context: Record<string, unknown>,
  depth: number = 4,
): Record<string, SanitizedValue> {
  const sanitized: Record<string, SanitizedValue> = {};

  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = sanitizeValue(value, key, depth);
  }

  return sanitized;
}

export function sanitizeUnknown(value: unknown, depth: number = 4): SanitizedValue {
  return sanitizeValue(value, '', depth);
}

export function sanitizeUrl(input: unknown): string {
  const rawUrl = typeof input === 'string'
    ? input
    : isPlainObject(input) && typeof input.url === 'string'
      ? input.url
      : String(input ?? '');

  try {
    const parsed = new URL(rawUrl);
    return redactSensitiveString(`${parsed.origin}${parsed.pathname}`);
  } catch {
    return redactSensitiveString(rawUrl.split('?')[0]?.split('#')[0] ?? rawUrl);
  }
}

export function isNetworkLikeError(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : isPlainObject(error) && typeof error.message === 'string'
      ? error.message
      : String(error ?? '');

  return /network|fetch|timeout|timed out|offline|connection|abort|internet|dns|econn/i.test(message);
}
