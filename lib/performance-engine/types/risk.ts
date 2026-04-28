import type { ConfidenceValue, ISODateString, ISODateTimeString } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';

export type RiskDomain =
  | 'training_load'
  | 'readiness'
  | 'nutrition'
  | 'hydration'
  | 'body_mass'
  | 'weight_cut'
  | 'injury'
  | 'illness'
  | 'data_quality'
  | 'phase_transition'
  | 'fight_opportunity';

export type RiskSeverity = 'info' | 'watch' | 'caution' | 'high' | 'critical';
export type RiskFlagStatus = 'active' | 'monitoring' | 'resolved';

export interface RiskEvidence {
  metric: string;
  value: number | string | boolean | null;
  threshold?: number | string | null;
  note?: string;
}

export interface RiskFlag {
  id: string;
  domain: RiskDomain;
  code: string;
  severity: RiskSeverity;
  status: RiskFlagStatus;
  message: string;
  evidence: RiskEvidence[];
  hardStop: boolean;
  appliesOn: ISODateString | null;
  resolvedAt: ISODateTimeString | null;
  confidence: ConfidenceValue;
  explanation: Explanation | null;
}

export function createRiskFlag(input: {
  id: string;
  domain: RiskDomain;
  code: string;
  severity: RiskSeverity;
  message: string;
  evidence?: RiskEvidence[];
  hardStop?: boolean;
  appliesOn?: ISODateString | null;
  confidence?: ConfidenceValue;
  explanation?: Explanation | null;
}): RiskFlag {
  return {
    id: input.id,
    domain: input.domain,
    code: input.code,
    severity: input.severity,
    status: 'active',
    message: input.message,
    evidence: input.evidence ?? [],
    hardStop: input.hardStop ?? input.severity === 'critical',
    appliesOn: input.appliesOn ?? null,
    resolvedAt: null,
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
    explanation: input.explanation ?? null,
  };
}
