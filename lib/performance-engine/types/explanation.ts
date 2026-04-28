import type { ConfidenceValue, ISODateTimeString, SourceReference } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';

export type ExplanationAudience = 'athlete' | 'coach' | 'internal';
export type ExplanationImpact = 'kept' | 'adjusted' | 'restricted' | 'escalated' | 'unknown';

export interface ExplanationEvidence {
  label: string;
  value: string | number | null;
  source: SourceReference | null;
}

export interface Explanation {
  id?: string;
  audience: ExplanationAudience;
  summary: string;
  reasons: string[];
  evidence: ExplanationEvidence[];
  impact: ExplanationImpact;
  confidence: ConfidenceValue;
  generatedAt: ISODateTimeString | null;
}

export function createExplanation(input: {
  summary: string;
  reasons?: string[];
  evidence?: ExplanationEvidence[];
  audience?: ExplanationAudience;
  impact?: ExplanationImpact;
  confidence?: ConfidenceValue;
  generatedAt?: ISODateTimeString | null;
}): Explanation {
  return {
    audience: input.audience ?? 'athlete',
    summary: input.summary,
    reasons: input.reasons ?? [],
    evidence: input.evidence ?? [],
    impact: input.impact ?? 'unknown',
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
    generatedAt: input.generatedAt ?? null,
  };
}
