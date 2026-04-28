import type {
  ConfidenceValue,
  Explanation,
  ISODateString,
  ISODateTimeString,
  RiskDomain,
  RiskEvidence,
  RiskFlag,
  RiskFlagCode,
  RiskFlagStatus,
  RiskSeverity,
  UnknownField,
} from '../types/index.ts';
import { UNKNOWN_CONFIDENCE } from '../types/index.ts';
import { createExplanation, explainMissingData, explainRisk } from '../explanation-engine/explanationEngine.ts';
import { confidenceFromLevel } from '../utils/confidence.ts';

export interface RiskFlagDefinition {
  code: RiskFlagCode;
  domain: RiskDomain;
  defaultSeverity: RiskSeverity;
  defaultMessage: string;
  defaultReasons: string[];
  blocksPlanByDefault: boolean;
  blocksAtSeverity?: RiskSeverity;
  requiresProfessionalReviewByDefault: boolean;
}

export const RISK_SEVERITY_ORDER: Record<RiskSeverity, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export const RISK_FLAG_DEFINITIONS: Record<RiskFlagCode, RiskFlagDefinition> = {
  under_fueling_risk: {
    code: 'under_fueling_risk',
    domain: 'nutrition',
    defaultSeverity: 'moderate',
    defaultMessage: 'Under-fueling risk is present and should constrain training, nutrition, and body-mass decisions.',
    defaultReasons: ['Fuel availability may be insufficient for the current athlete context.'],
    blocksPlanByDefault: false,
    blocksAtSeverity: 'high',
    requiresProfessionalReviewByDefault: false,
  },
  unsafe_weight_class_target: {
    code: 'unsafe_weight_class_target',
    domain: 'weight_class',
    defaultSeverity: 'critical',
    defaultMessage: 'The requested body-mass or weight-class target appears unsafe for the available timeframe.',
    defaultReasons: ['Weight-class decisions must remain safety first.'],
    blocksPlanByDefault: true,
    requiresProfessionalReviewByDefault: true,
  },
  excessive_training_load: {
    code: 'excessive_training_load',
    domain: 'training_load',
    defaultSeverity: 'moderate',
    defaultMessage: 'Training load appears elevated for the available readiness context.',
    defaultReasons: ['High load should be balanced against recovery, soreness, sleep, and phase context.'],
    blocksPlanByDefault: false,
    blocksAtSeverity: 'critical',
    requiresProfessionalReviewByDefault: false,
  },
  protected_workout_conflict: {
    code: 'protected_workout_conflict',
    domain: 'plan_integrity',
    defaultSeverity: 'high',
    defaultMessage: 'The plan conflicts with a protected workout anchor.',
    defaultReasons: ['Protected workouts are non-negotiable anchors and should not be silently moved or removed.'],
    blocksPlanByDefault: true,
    requiresProfessionalReviewByDefault: false,
  },
  poor_readiness: {
    code: 'poor_readiness',
    domain: 'readiness',
    defaultSeverity: 'moderate',
    defaultMessage: 'Readiness is poor enough to constrain planning.',
    defaultReasons: ['Readiness should influence training load, recovery, fueling, and safety decisions.'],
    blocksPlanByDefault: false,
    blocksAtSeverity: 'critical',
    requiresProfessionalReviewByDefault: false,
  },
  injury_conflict: {
    code: 'injury_conflict',
    domain: 'injury',
    defaultSeverity: 'high',
    defaultMessage: 'The plan conflicts with an injury or pain limitation.',
    defaultReasons: ['Pain and injury constraints override performance goals.'],
    blocksPlanByDefault: true,
    requiresProfessionalReviewByDefault: true,
  },
  illness_conflict: {
    code: 'illness_conflict',
    domain: 'illness',
    defaultSeverity: 'high',
    defaultMessage: 'The plan conflicts with illness symptoms or illness recovery.',
    defaultReasons: ['Illness constraints override performance goals.'],
    blocksPlanByDefault: true,
    requiresProfessionalReviewByDefault: true,
  },
  missing_data: {
    code: 'missing_data',
    domain: 'data_quality',
    defaultSeverity: 'low',
    defaultMessage: 'Required data is missing, so this decision has lower confidence.',
    defaultReasons: ['Missing data is unknown, not zero or safe.'],
    blocksPlanByDefault: false,
    requiresProfessionalReviewByDefault: false,
  },
  low_nutrition_confidence: {
    code: 'low_nutrition_confidence',
    domain: 'nutrition',
    defaultSeverity: 'low',
    defaultMessage: 'Nutrition confidence is low because available food or fueling data is incomplete.',
    defaultReasons: ['Nutrition decisions should reflect food-log quality and missing data.'],
    blocksPlanByDefault: false,
    requiresProfessionalReviewByDefault: false,
  },
  rapid_body_mass_change: {
    code: 'rapid_body_mass_change',
    domain: 'body_mass',
    defaultSeverity: 'high',
    defaultMessage: 'Body mass is changing too rapidly for an automatic recommendation.',
    defaultReasons: ['Rapid body-mass change can indicate unsafe weight loss, dehydration, or under-fueling.'],
    blocksPlanByDefault: false,
    blocksAtSeverity: 'critical',
    requiresProfessionalReviewByDefault: true,
  },
  competition_proximity_conflict: {
    code: 'competition_proximity_conflict',
    domain: 'competition',
    defaultSeverity: 'high',
    defaultMessage: 'The plan conflicts with competition proximity.',
    defaultReasons: ['Competition week should restrict casual hard-plan generation.'],
    blocksPlanByDefault: true,
    requiresProfessionalReviewByDefault: false,
  },
  duplicate_or_conflicting_plan: {
    code: 'duplicate_or_conflicting_plan',
    domain: 'plan_integrity',
    defaultSeverity: 'moderate',
    defaultMessage: 'Duplicate or conflicting plan state was detected.',
    defaultReasons: ['A single source of truth should own each planning responsibility.'],
    blocksPlanByDefault: false,
    blocksAtSeverity: 'high',
    requiresProfessionalReviewByDefault: false,
  },
  professional_review_required: {
    code: 'professional_review_required',
    domain: 'professional_review',
    defaultSeverity: 'high',
    defaultMessage: 'Professional review is required before this recommendation can proceed.',
    defaultReasons: ['The requested decision exceeds the safe automatic recommendation boundary.'],
    blocksPlanByDefault: true,
    requiresProfessionalReviewByDefault: true,
  },
};

export const RISK_FLAG_CODES = Object.freeze(Object.keys(RISK_FLAG_DEFINITIONS) as RiskFlagCode[]);

export interface CreateRiskFlagInput {
  id?: string;
  code: RiskFlagCode;
  domain?: RiskDomain;
  severity?: RiskSeverity;
  status?: RiskFlagStatus;
  message?: string;
  evidence?: RiskEvidence[];
  blocksPlan?: boolean;
  hardStop?: boolean;
  requiresProfessionalReview?: boolean;
  appliesOn?: ISODateString | null;
  resolvedAt?: ISODateTimeString | null;
  confidence?: ConfidenceValue;
  explanation?: Explanation | null;
  generatedAt?: ISODateTimeString | null;
}

export function getRiskSeverityRank(severity: RiskSeverity): number {
  return RISK_SEVERITY_ORDER[severity];
}

export function compareRiskSeverity(a: RiskSeverity, b: RiskSeverity): number {
  return getRiskSeverityRank(a) - getRiskSeverityRank(b);
}

export function isRiskSeverityAtLeast(severity: RiskSeverity, threshold: RiskSeverity): boolean {
  return compareRiskSeverity(severity, threshold) >= 0;
}

function defaultBlocksPlan(definition: RiskFlagDefinition, severity: RiskSeverity): boolean {
  if (definition.blocksPlanByDefault) {
    return true;
  }

  if (definition.blocksAtSeverity) {
    return isRiskSeverityAtLeast(severity, definition.blocksAtSeverity);
  }

  return severity === 'critical';
}

function riskId(input: CreateRiskFlagInput): string {
  return input.id ?? `${input.code}:${input.appliesOn ?? 'active'}`;
}

export function createRiskFlag(input: CreateRiskFlagInput): RiskFlag {
  const definition = RISK_FLAG_DEFINITIONS[input.code];
  const severity = input.severity ?? definition.defaultSeverity;
  const blocksPlan = input.blocksPlan ?? input.hardStop ?? defaultBlocksPlan(definition, severity);
  const confidence = input.confidence ?? UNKNOWN_CONFIDENCE;
  const draft = {
    code: input.code,
    severity,
    message: input.message ?? definition.defaultMessage,
    blocksPlan,
    evidence: input.evidence ?? [],
    confidence,
  };
  const flag: RiskFlag = {
    id: riskId(input),
    domain: input.domain ?? definition.domain,
    code: input.code,
    severity,
    status: input.status ?? 'active',
    message: draft.message,
    evidence: draft.evidence,
    blocksPlan,
    hardStop: input.hardStop ?? blocksPlan,
    requiresProfessionalReview: input.requiresProfessionalReview
      ?? definition.requiresProfessionalReviewByDefault
      ?? false,
    appliesOn: input.appliesOn ?? null,
    resolvedAt: input.resolvedAt ?? null,
    confidence,
    explanation: input.explanation === undefined
      ? explainRisk({ flag: draft, generatedAt: input.generatedAt })
      : input.explanation,
  };

  return flag;
}

export function createMissingDataRisk(input: {
  id?: string;
  context: string;
  missingFields: Array<UnknownField | string>;
  severity?: RiskSeverity;
  appliesOn?: ISODateString | null;
  confidence?: ConfidenceValue;
  generatedAt?: ISODateTimeString | null;
}): RiskFlag {
  const fields = input.missingFields.map((field) => (typeof field === 'string' ? field : field.field));
  const confidence = input.confidence ?? confidenceFromLevel('low', [
    `${input.context} is missing ${fields.length || 'unknown'} required field(s).`,
  ]);

  return createRiskFlag({
    id: input.id,
    code: 'missing_data',
    severity: input.severity ?? (fields.length > 2 ? 'moderate' : 'low'),
    message: `${input.context} is missing required data: ${fields.length ? fields.join(', ') : 'unknown'}.`,
    evidence: fields.map((field) => ({ metric: field, value: null, note: 'missing' })),
    appliesOn: input.appliesOn,
    confidence,
    explanation: explainMissingData({
      context: input.context,
      missingFields: input.missingFields,
      confidence,
      generatedAt: input.generatedAt,
    }),
    generatedAt: input.generatedAt,
  });
}

export function createProfessionalReviewRisk(input: {
  id?: string;
  message?: string;
  reasons?: string[];
  evidence?: RiskEvidence[];
  appliesOn?: ISODateString | null;
  confidence?: ConfidenceValue;
  generatedAt?: ISODateTimeString | null;
}): RiskFlag {
  const confidence = input.confidence ?? confidenceFromLevel('medium', [
    'Professional review requirement was raised by a safety boundary.',
  ]);

  return createRiskFlag({
    id: input.id,
    code: 'professional_review_required',
    severity: 'high',
    message: input.message,
    evidence: input.evidence,
    appliesOn: input.appliesOn,
    confidence,
    explanation: createExplanation({
      kind: 'risk',
      summary: input.message ?? RISK_FLAG_DEFINITIONS.professional_review_required.defaultMessage,
      reasons: input.reasons ?? RISK_FLAG_DEFINITIONS.professional_review_required.defaultReasons,
      impact: 'escalated',
      confidence,
      generatedAt: input.generatedAt,
    }),
    generatedAt: input.generatedAt,
  });
}

export function getBlockingRiskFlags(flags: RiskFlag[]): RiskFlag[] {
  return flags.filter((flag) => flag.status === 'active' && (flag.blocksPlan || flag.hardStop));
}

export function hasBlockingRisk(flags: RiskFlag[]): boolean {
  return getBlockingRiskFlags(flags).length > 0;
}

export function sortRiskFlagsBySeverity(flags: RiskFlag[]): RiskFlag[] {
  return [...flags].sort((a, b) => compareRiskSeverity(b.severity, a.severity));
}

export function dedupeRiskFlags(flags: RiskFlag[]): RiskFlag[] {
  const seen = new Set<string>();
  const deduped: RiskFlag[] = [];

  for (const flag of sortRiskFlagsBySeverity(flags)) {
    const key = `${flag.code}:${flag.domain}:${flag.appliesOn ?? 'active'}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(flag);
    }
  }

  return deduped;
}
