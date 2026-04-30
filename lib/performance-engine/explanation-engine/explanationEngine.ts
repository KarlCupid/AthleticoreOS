import type {
  AthleticorePhase,
  ConfidenceValue,
  Explanation,
  ExplanationAudience,
  ExplanationEvidence,
  ExplanationImpact,
  ExplanationKind,
  ISODateTimeString,
  RiskFlag,
  UnknownField,
} from '../types/index.ts';
import { UNKNOWN_CONFIDENCE } from '../types/index.ts';
import { omitUndefinedProperties } from '../../utils/optionalProperties.ts';

export interface CreateExplanationInput {
  id?: string | undefined;
  kind?: ExplanationKind | undefined;
  summary: string;
  reasons?: string[] | undefined;
  evidence?: ExplanationEvidence[] | undefined;
  audience?: ExplanationAudience | undefined;
  impact?: ExplanationImpact | undefined;
  confidence?: ConfidenceValue | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function compactReasons(reasons: Array<string | null | undefined>): string[] {
  return reasons
    .map((reason) => reason?.trim())
    .filter((reason): reason is string => Boolean(reason));
}

export function createExplanation(input: CreateExplanationInput): Explanation {
  return omitUndefinedProperties<Explanation>({
    id: input.id,
    kind: input.kind ?? 'decision',
    audience: input.audience ?? 'athlete',
    summary: input.summary,
    reasons: input.reasons ?? [],
    evidence: input.evidence ?? [],
    impact: input.impact ?? 'unknown',
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
    generatedAt: input.generatedAt ?? null,
  });
}

export function explainDecision(input: {
  summary: string;
  reasons: string[];
  evidence?: ExplanationEvidence[] | undefined;
  confidence?: ConfidenceValue | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  return createExplanation(omitUndefinedProperties<CreateExplanationInput>({
    kind: 'decision',
    summary: input.summary,
    reasons: compactReasons(input.reasons),
    evidence: input.evidence,
    impact: 'adjusted',
    confidence: input.confidence,
    generatedAt: input.generatedAt,
  }));
}

export function explainRisk(input: {
  flag: Pick<RiskFlag, 'code' | 'severity' | 'message' | 'blocksPlan' | 'evidence' | 'confidence'>;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  return createExplanation(omitUndefinedProperties<CreateExplanationInput>({
    kind: 'risk',
    summary: input.flag.blocksPlan
      ? `This recommendation is blocked because ${input.flag.message.charAt(0).toLowerCase()}${input.flag.message.slice(1)}`
      : input.flag.message,
    reasons: compactReasons([
      `${humanize(input.flag.code)} is currently ${input.flag.severity} severity.`,
      input.flag.blocksPlan ? 'Safety constraints must be resolved before this plan can proceed.' : 'This flag should be monitored while planning continues.',
    ]),
    evidence: input.flag.evidence.map((item) => ({
      label: item.metric,
      value: item.value == null ? null : String(item.value),
      source: null,
    })),
    impact: input.flag.blocksPlan ? 'restricted' : 'adjusted',
    confidence: input.flag.confidence,
    generatedAt: input.generatedAt,
  }));
}

export function explainPhaseTransition(input: {
  from: AthleticorePhase;
  to: AthleticorePhase;
  reason: string;
  preserved?: string[] | undefined;
  confidence?: ConfidenceValue | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  const preserved = input.preserved?.length
    ? input.preserved.join(', ')
    : 'training, nutrition, readiness, body-mass, protected workouts, preferences, risk, and history';

  return createExplanation(omitUndefinedProperties<CreateExplanationInput>({
    kind: 'phase_transition',
    summary: `Phase transitioned from ${humanize(input.from)} to ${humanize(input.to)}.`,
    reasons: [
      `The transition reason was ${humanize(input.reason)}.`,
      `The athlete journey stays continuous; preserved context includes ${preserved}.`,
    ],
    impact: input.from === input.to ? 'kept' : 'adjusted',
    confidence: input.confidence,
    generatedAt: input.generatedAt,
  }));
}

export function explainMissingData(input: {
  context: string;
  missingFields: Array<UnknownField | string>;
  confidence?: ConfidenceValue | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  const fields = input.missingFields.map((field) => (typeof field === 'string' ? field : field.field));

  return createExplanation(omitUndefinedProperties<CreateExplanationInput>({
    kind: 'missing_data',
    summary: `${input.context} confidence is lower because required data is missing.`,
    reasons: [
      `Missing fields: ${fields.length ? fields.join(', ') : 'unknown'}.`,
      'Missing data is treated as unknown, not as zero or safe.',
    ],
    impact: 'restricted',
    confidence: input.confidence,
    generatedAt: input.generatedAt,
  }));
}

export function explainConfidence(input: {
  context: string;
  confidence: ConfidenceValue;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  return createExplanation(omitUndefinedProperties<CreateExplanationInput>({
    kind: 'confidence',
    summary: `${input.context} confidence is ${input.confidence.level}.`,
    reasons: input.confidence.reasons.length
      ? input.confidence.reasons
      : ['Confidence is unknown because no reliable data has been provided yet.'],
    impact: input.confidence.level === 'high' ? 'kept' : 'restricted',
    confidence: input.confidence,
    generatedAt: input.generatedAt,
  }));
}

export function explainPlanAdjustment(input: {
  summary: string;
  reasons: string[];
  blocked?: boolean | undefined;
  confidence?: ConfidenceValue | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  return createExplanation(omitUndefinedProperties<CreateExplanationInput>({
    kind: 'plan_adjustment',
    summary: input.summary,
    reasons: compactReasons(input.reasons),
    impact: input.blocked ? 'restricted' : 'adjusted',
    confidence: input.confidence,
    generatedAt: input.generatedAt,
  }));
}
