import type { ConfidenceValue, ISODateTimeString, SourceReference } from './shared.ts';

export type ExplanationAudience = 'athlete' | 'coach' | 'internal';
export type ExplanationImpact = 'kept' | 'adjusted' | 'restricted' | 'escalated' | 'unknown';
export type ExplanationKind =
  | 'decision'
  | 'risk'
  | 'phase_transition'
  | 'missing_data'
  | 'confidence'
  | 'plan_adjustment';

export interface ExplanationEvidence {
  label: string;
  value: string | number | null;
  source: SourceReference | null;
}

export interface Explanation {
  id?: string;
  kind: ExplanationKind;
  audience: ExplanationAudience;
  summary: string;
  reasons: string[];
  evidence: ExplanationEvidence[];
  impact: ExplanationImpact;
  confidence: ConfidenceValue;
  generatedAt: ISODateTimeString | null;
}
