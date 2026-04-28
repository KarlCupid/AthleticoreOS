import type { ConfidenceLevel, ConfidenceValue } from '../types/shared.ts';
import { HIGH_CONFIDENCE, LOW_CONFIDENCE, MEDIUM_CONFIDENCE, UNKNOWN_CONFIDENCE } from '../types/shared.ts';
import { clampNumber, toFiniteNumberOrNull } from './numbers.ts';

export function confidenceLevelFromScore(score: number | null): ConfidenceLevel {
  if (score === null) {
    return 'unknown';
  }

  if (score >= 0.75) {
    return 'high';
  }

  if (score >= 0.45) {
    return 'medium';
  }

  return 'low';
}

export function normalizeConfidence(value: unknown, reasons: string[] = []): ConfidenceValue {
  const score = toFiniteNumberOrNull(value);

  if (score === null) {
    return {
      ...UNKNOWN_CONFIDENCE,
      reasons: reasons.length > 0 ? reasons : UNKNOWN_CONFIDENCE.reasons,
    };
  }

  const normalizedScore = clampNumber(score, 0, 1);

  return {
    level: confidenceLevelFromScore(normalizedScore),
    score: normalizedScore,
    reasons,
  };
}

export function confidenceFromLevel(level: ConfidenceLevel, reasons: string[] = []): ConfidenceValue {
  switch (level) {
    case 'high':
      return { ...HIGH_CONFIDENCE, reasons: reasons.length > 0 ? reasons : HIGH_CONFIDENCE.reasons };
    case 'medium':
      return { ...MEDIUM_CONFIDENCE, reasons: reasons.length > 0 ? reasons : MEDIUM_CONFIDENCE.reasons };
    case 'low':
      return { ...LOW_CONFIDENCE, reasons: reasons.length > 0 ? reasons : LOW_CONFIDENCE.reasons };
    case 'unknown':
      return { ...UNKNOWN_CONFIDENCE, reasons: reasons.length > 0 ? reasons : UNKNOWN_CONFIDENCE.reasons };
  }
}

export function confidenceFromKnownPoints(knownPoints: number, expectedPoints: number): ConfidenceValue {
  if (expectedPoints <= 0 || knownPoints <= 0) {
    return confidenceFromLevel('unknown', ['No expected data points are available.']);
  }

  return normalizeConfidence(knownPoints / expectedPoints, [
    `${knownPoints} of ${expectedPoints} expected data points are available.`,
  ]);
}
