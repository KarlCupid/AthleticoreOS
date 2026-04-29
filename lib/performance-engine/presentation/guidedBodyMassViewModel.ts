import type {
  AthleticorePhase,
  BodyMassState,
  ConfidenceValue,
  FightOpportunitySnapshot,
  MeasurementRange,
  RiskFlag,
  WeightClassFeasibilityStatus,
  WeightClassPlan,
  WeightClassRiskLevel,
} from '../types/index.ts';
import type { UnifiedPerformanceEngineResult } from '../unified-performance/index.ts';

export type GuidedBodyMassStatus = WeightClassFeasibilityStatus | 'not_set';
export type GuidedBodyMassTone = 'ready' | 'caution' | 'blocked' | 'unknown';

export interface GuidedBodyMassDetail {
  label: string;
  value: string;
}

export interface GuidedBodyMassViewModel {
  source: 'unified_performance_engine';
  available: boolean;
  date: string | null;
  athleteId: string | null;
  currentPhase: AthleticorePhase | 'unknown';
  currentPhaseLabel: string;
  title: 'Weight-class feasibility';
  primaryQuestion: 'Can this target be reached safely while maintaining performance?';
  status: GuidedBodyMassStatus;
  statusLabel: string;
  statusTone: GuidedBodyMassTone;
  primaryMessage: string;
  currentBodyMassLabel: string;
  currentBodyMassTrend: string;
  targetClassLabel: string | null;
  weighInLabel: string | null;
  competitionLabel: string | null;
  timeAvailableLabel: string;
  requiredChangeLabel: string;
  requiredRateLabel: string;
  riskLevel: WeightClassRiskLevel | 'unknown';
  riskLevelLabel: string;
  planBlocked: boolean;
  professionalReviewRecommendation: string | null;
  saferAlternatives: string[];
  nutritionImplications: string[];
  trainingImplications: string[];
  confidenceSummary: string;
  missingData: string[];
  clearExplanation: string;
  riskHighlights: string[];
  detailRows: GuidedBodyMassDetail[];
  nextActions: string[];
  fightContext: string | null;
  sourcePerformanceStateId: string | null;
}

interface GuidedBodyMassPlanCopy {
  statusLabel: string;
  statusTone: GuidedBodyMassTone;
  primaryMessage: string;
  planBlocked: boolean;
  professionalReviewRecommendation: string | null;
  saferAlternatives: string[];
  nutritionImplications: string[];
  trainingImplications: string[];
  clearExplanation: string;
}

const UNAVAILABLE_GUIDED_BODY_MASS: GuidedBodyMassViewModel = {
  source: 'unified_performance_engine',
  available: false,
  date: null,
  athleteId: null,
  currentPhase: 'unknown',
  currentPhaseLabel: 'Unknown',
  title: 'Weight-class feasibility',
  primaryQuestion: 'Can this target be reached safely while maintaining performance?',
  status: 'not_set',
  statusLabel: 'Not set',
  statusTone: 'unknown',
  primaryMessage: 'Body-mass and weight-class context is pending.',
  currentBodyMassLabel: 'Unknown',
  currentBodyMassTrend: 'Body-mass trend unknown',
  targetClassLabel: null,
  weighInLabel: null,
  competitionLabel: null,
  timeAvailableLabel: 'Timeline unknown',
  requiredChangeLabel: 'Required change unknown',
  requiredRateLabel: 'Rate unknown',
  riskLevel: 'unknown',
  riskLevelLabel: 'Unknown risk',
  planBlocked: false,
  professionalReviewRecommendation: null,
  saferAlternatives: [],
  nutritionImplications: [],
  trainingImplications: [],
  confidenceSummary: "Confidence is unknown because today's connected body-mass context is unavailable.",
  missingData: ['Body-mass, fueling, readiness, and timing context'],
  clearExplanation: "Athleticore needs today's body-mass, fueling, readiness, training, and fight timing context before it can make a safer call.",
  riskHighlights: [],
  detailRows: [],
  nextActions: ['Load performance state'],
  fightContext: null,
  sourcePerformanceStateId: null,
};

export function buildGuidedBodyMassViewModel(
  result: UnifiedPerformanceEngineResult | null | undefined,
): GuidedBodyMassViewModel {
  if (!result) return UNAVAILABLE_GUIDED_BODY_MASS;

  const performanceState = result.canonicalOutputs.performanceState;
  const plan = result.canonicalOutputs.weightClassPlan
    ?? performanceState.weightClassPlan
    ?? result.weightClass?.plan
    ?? null;
  const bodyMass = performanceState.bodyMass;
  const fight = result.fightOpportunity ?? performanceState.journey.activeFightOpportunity;

  if (!plan) {
    const currentBodyMassLabel = formatMass(bodyMass?.current?.value ?? null, bodyMass?.current?.unit ?? 'lb');
    const currentBodyMassTrend = trendLabel(bodyMass);
    return {
      ...UNAVAILABLE_GUIDED_BODY_MASS,
      available: true,
      date: performanceState.asOfDate,
      athleteId: performanceState.athlete.athleteId,
      currentPhase: performanceState.phase.current,
      currentPhaseLabel: humanize(performanceState.phase.current),
      primaryMessage: 'No target class is active. Athleticore can evaluate a target when a fight or class becomes relevant.',
      currentBodyMassLabel,
      currentBodyMassTrend,
      confidenceSummary: confidenceSummary(bodyMass?.confidence ?? performanceState.confidence),
      missingData: bodyMassMissingData(bodyMass),
      clearExplanation: 'Body mass is tracked as performance context until a target class, weigh-in, or fight timeline needs a feasibility check.',
      detailRows: [
        { label: 'Current', value: currentBodyMassLabel },
        { label: 'Trend', value: currentBodyMassTrend },
        { label: 'Phase', value: humanize(performanceState.phase.current) },
      ],
      nextActions: ['Evaluate class', 'Log body mass'],
      fightContext: fightContextLabel(fight),
    };
  }

  const copy = buildGuidedBodyMassPlanCopy({
    plan,
    risks: result.riskFlags,
    shouldGenerateProtocol: result.weightClass?.shouldGenerateProtocol,
  });
  const targetClassLabel = targetLabel(plan, fight);
  const currentBodyMassLabel = formatMass(plan.currentBodyMass?.value ?? bodyMass?.current?.value ?? null, plan.currentBodyMass?.unit ?? bodyMass?.current?.unit ?? 'lb');
  const currentBodyMassTrend = trendLabel(bodyMass, plan);
  const weighInLabel = dateTimeLabel('Weigh-in', plan.weighInDateTime ?? dateWithOptionalTime(fight?.weighInDate ?? null, fight?.weighInTime ?? null));
  const competitionLabel = dateTimeLabel('Competition', plan.competitionDateTime ?? dateWithOptionalTime(plan.competitionDate ?? fight?.competitionDate ?? null, fight?.competitionTime ?? null));
  const missingData = unique([
    ...bodyMassMissingData(bodyMass),
    ...plan.safetyFlags
      .filter((flag) => flag.riskFlagCode === 'missing_data')
      .map((flag) => safetyFlagLabel(flag.code)),
  ]);
  const riskHighlights = buildRiskHighlights(plan, result.riskFlags);

  return {
    source: 'unified_performance_engine',
    available: true,
    date: performanceState.asOfDate,
    athleteId: performanceState.athlete.athleteId,
    currentPhase: performanceState.phase.current,
    currentPhaseLabel: humanize(performanceState.phase.current),
    title: 'Weight-class feasibility',
    primaryQuestion: 'Can this target be reached safely while maintaining performance?',
    status: plan.feasibilityStatus,
    statusLabel: copy.statusLabel,
    statusTone: copy.statusTone,
    primaryMessage: copy.primaryMessage,
    currentBodyMassLabel,
    currentBodyMassTrend,
    targetClassLabel,
    weighInLabel,
    competitionLabel,
    timeAvailableLabel: timeAvailableLabel(plan.timeframeDays),
    requiredChangeLabel: requiredChangeLabel(plan),
    requiredRateLabel: requiredRateLabel(plan),
    riskLevel: plan.riskLevel,
    riskLevelLabel: `${humanize(plan.riskLevel)} risk`,
    planBlocked: copy.planBlocked,
    professionalReviewRecommendation: copy.professionalReviewRecommendation,
    saferAlternatives: copy.saferAlternatives,
    nutritionImplications: copy.nutritionImplications,
    trainingImplications: copy.trainingImplications,
    confidenceSummary: confidenceSummary(plan.confidence),
    missingData,
    clearExplanation: copy.clearExplanation,
    riskHighlights,
    detailRows: [
      { label: 'Current', value: currentBodyMassLabel },
      { label: 'Trend', value: currentBodyMassTrend },
      { label: 'Target', value: targetClassLabel ?? 'Target unknown' },
      { label: 'Timeline', value: timeAvailableLabel(plan.timeframeDays) },
      { label: 'Feasibility', value: copy.statusLabel },
      { label: 'Risk', value: `${humanize(plan.riskLevel)} risk` },
    ],
    nextActions: nextActions(plan, copy.planBlocked, missingData.length > 0),
    fightContext: fightContextLabel(fight),
    sourcePerformanceStateId: null,
  };
}

export function buildGuidedBodyMassPlanCopy(input: {
  plan: WeightClassPlan;
  risks?: RiskFlag[];
  shouldGenerateProtocol?: boolean | null;
}): GuidedBodyMassPlanCopy {
  const status = input.plan.feasibilityStatus;
  const planBlocked = isPlanBlocked(input.plan, input.shouldGenerateProtocol);
  const professionalReviewRecommendation = professionalReviewCopy(input.plan, input.risks ?? []);

  return {
    statusLabel: statusLabel(status),
    statusTone: statusTone(status, planBlocked),
    primaryMessage: primaryMessage(input.plan),
    planBlocked,
    professionalReviewRecommendation,
    saferAlternatives: saferAlternatives(input.plan),
    nutritionImplications: nutritionImplications(input.plan),
    trainingImplications: trainingImplications(input.plan),
    clearExplanation: clearExplanation(input.plan),
  };
}

export function sanitizeBodyMassCopy(value: string): string {
  return value
    .replace(/Automatic weight-loss pressure is blocked until a safer class, longer timeline, or qualified review is available\./gi, 'Athleticore is holding automatic body-mass support until a safer class, longer timeline, or qualified review is available.')
    .replace(/Under-fueling risk signals are present, so weight-loss pressure should pause while recovery data is reviewed\./gi, 'Under-fueling risk signals are present, so scale pressure should pause while recovery data is reviewed.')
    .replace(/Qualified review is required before weight-class loss planning can proceed\./gi, 'Qualified review is required before automatic body-mass support can proceed.')
    .replace(/Qualified review is required before automatic weight-class loss planning can proceed\./gi, 'Qualified review is required before automatic body-mass support can proceed.')
    .replace(/weight-class loss planning/gi, 'body-mass support')
    .replace(/weight-loss pressure/gi, 'scale pressure')
    .replace(/weight-loss planning/gi, 'body-mass support')
    .replace(/automatic plan generation/gi, 'automatic body-mass support')
    .replace(/rapid fight-week scale protocols/gi, 'risky rapid body-mass methods')
    .replace(/rapid scale-loss protocols/gi, 'risky rapid body-mass methods')
    .replace(/severe restriction/gi, 'unsafe restriction')
    .replace(/No loss is required/gi, 'No lower scale target is required')
    .replace(/Avoid adding extra conditioning to chase body mass; preserve performance and recovery\./gi, 'Do not add extra conditioning just to force the scale; preserve performance and recovery.')
    .replace(/\s+/g, ' ')
    .trim();
}

function primaryMessage(plan: WeightClassPlan): string {
  if (plan.feasibilityStatus === 'feasible') {
    return 'This target looks manageable with the time available, but Athleticore will keep watching recovery and fueling.';
  }
  if (plan.feasibilityStatus === 'aggressive') {
    return 'This target looks aggressive. Athleticore will avoid risky shortcuts and focus on what can be done safely.';
  }
  if (plan.feasibilityStatus === 'high_risk') {
    return 'This target carries high risk for the time available. Athleticore will hold automatic body-mass support while safer options are reviewed.';
  }
  if (plan.feasibilityStatus === 'unsafe') {
    return "This target looks too aggressive for the time available. Athleticore won't build a risky plan around it. Consider a longer timeline, a different class, or support from a qualified professional.";
  }
  return 'We need more body-mass data before making a confident call.';
}

function clearExplanation(plan: WeightClassPlan): string {
  if (plan.feasibilityStatus === 'insufficient_data') {
    return 'Athleticore is missing enough current body-mass, target, or timing context to make a confident call.';
  }

  const required = requiredChangeLabel(plan).toLowerCase();
  const timeline = timeAvailableLabel(plan.timeframeDays).toLowerCase();
  const rate = requiredRateLabel(plan).toLowerCase();
  return `Athleticore compared the ${required}, ${timeline}, ${rate}, readiness, fueling, and safety flags before making this call.`;
}

function saferAlternatives(plan: WeightClassPlan): string[] {
  const fromPlan = plan.alternatives.map((alternative) =>
    sanitizeBodyMassCopy(`${alternative.label}: ${alternative.explanation}`),
  );
  if (fromPlan.length > 0) return unique(fromPlan).slice(0, 3);
  if (plan.feasibilityStatus === 'feasible') return [];
  return [
    'Review a class closer to the current trend.',
    'Use a longer runway before revisiting the target.',
    'Bring the target to a qualified professional before acting on it.',
  ];
}

function nutritionImplications(plan: WeightClassPlan): string[] {
  const lines = plan.nutritionImplications.length > 0
    ? plan.nutritionImplications
    : ['Fueling stays tied to training demand, readiness, and recovery.'];
  return unique(lines.map(sanitizeBodyMassCopy)).slice(0, 3);
}

function trainingImplications(plan: WeightClassPlan): string[] {
  const lines = plan.trainingImplications.length > 0
    ? plan.trainingImplications
    : ['Training changes should come from the adaptive plan and readiness, not from scale pressure.'];
  return unique(lines.map(sanitizeBodyMassCopy)).slice(0, 3);
}

function buildRiskHighlights(plan: WeightClassPlan, risks: RiskFlag[]): string[] {
  const planRisks = [
    ...plan.safetyFlags.map((flag) => flag.message),
    ...risks
      .filter((risk) => risk.status === 'active' && (
        risk.code === 'unsafe_weight_class_target'
        || risk.code === 'under_fueling_risk'
        || risk.code === 'missing_data'
        || risk.requiresProfessionalReview
      ))
      .map((risk) => riskCopy(risk)),
  ];
  return unique(planRisks.map(sanitizeBodyMassCopy)).slice(0, 3);
}

function riskCopy(risk: RiskFlag): string {
  if (risk.code === 'unsafe_weight_class_target') {
    return "This target looks too aggressive for the time available. Athleticore won't build a risky plan around it.";
  }
  if (risk.code === 'under_fueling_risk') {
    return 'Fueling or recovery risk is active, so Athleticore is keeping body-mass support cautious.';
  }
  if (risk.code === 'missing_data') {
    return 'Some body-mass, timing, or recovery data is missing, so Athleticore treats it as unknown.';
  }
  if (risk.requiresProfessionalReview) {
    return 'Qualified review is recommended before automatic body-mass support continues.';
  }
  return risk.message;
}

function professionalReviewCopy(plan: WeightClassPlan, risks: RiskFlag[]): string | null {
  if (!plan.professionalReviewRequired && !risks.some((risk) => risk.requiresProfessionalReview)) return null;
  return 'Qualified review is recommended before automatic body-mass support continues.';
}

function isPlanBlocked(plan: WeightClassPlan, shouldGenerateProtocol?: boolean | null): boolean {
  return plan.feasibilityStatus === 'unsafe'
    || plan.feasibilityStatus === 'high_risk'
    || plan.professionalReviewRequired
    || plan.safetyStatus === 'unsafe'
    || shouldGenerateProtocol === false;
}

function statusLabel(status: GuidedBodyMassStatus): string {
  if (status === 'high_risk') return 'High risk';
  if (status === 'insufficient_data') return 'Insufficient data';
  return humanize(status);
}

function statusTone(status: GuidedBodyMassStatus, blocked: boolean): GuidedBodyMassTone {
  if (blocked || status === 'unsafe' || status === 'high_risk') return 'blocked';
  if (status === 'feasible') return 'ready';
  if (status === 'aggressive') return 'caution';
  return 'unknown';
}

function nextActions(plan: WeightClassPlan, blocked: boolean, hasMissingData: boolean): string[] {
  if (plan.feasibilityStatus === 'insufficient_data' || hasMissingData) {
    return ['Log body mass', 'Add weigh-in timing', 'Review target class'];
  }
  if (blocked) {
    return ['Review safer options', 'Talk with a qualified professional', 'Keep fueling connected to training'];
  }
  if (plan.feasibilityStatus === 'aggressive') {
    return ['Review safer options', 'Log body mass', 'Watch readiness'];
  }
  return ['Continue body-mass support', 'Log body mass', 'Review fueling focus'];
}

function targetLabel(plan: WeightClassPlan, fight: FightOpportunitySnapshot | null): string | null {
  const mass = formatMass(plan.desiredScaleWeight?.value ?? plan.targetClassMass?.value ?? null, plan.desiredScaleWeight?.unit ?? plan.targetClassMass?.unit ?? 'lb');
  const className = plan.targetClassName ?? fight?.targetWeightClassName ?? null;
  if (className && mass !== 'Unknown') return `${className} / ${mass}`;
  if (className) return className;
  return mass === 'Unknown' ? null : mass;
}

function requiredChangeLabel(plan: WeightClassPlan): string {
  if (plan.requiredChange.value == null) return 'Required change unknown';
  if (plan.requiredChange.value <= 0) return 'No lower scale target required';
  return `${roundOne(plan.requiredChange.value)} ${plan.requiredChange.unit} needed`;
}

function requiredRateLabel(plan: WeightClassPlan): string {
  if (plan.requiredRateOfChange.value == null) return 'Rate unknown';
  return `${roundOne(plan.requiredRateOfChange.value)} ${plan.requiredRateOfChange.unit.replace('_per_', '/')}`;
}

function trendLabel(bodyMass: BodyMassState | null | undefined, plan?: WeightClassPlan | null): string {
  const trend = bodyMass?.trend ?? plan?.recentBodyMassTrend ?? null;
  if (!trend || trend.direction === 'unknown') return 'Body-mass trend unknown';
  const weekly = rangeTarget(trend.weeklyChange);
  if (weekly == null) return `${humanize(trend.direction)} trend`;
  return `${humanize(trend.direction)} ${formatSigned(weekly)} ${trend.weeklyChange.unit}/week`;
}

function timeAvailableLabel(days: number | null | undefined): string {
  if (days == null) return 'Timeline unknown';
  if (days === 0) return 'Weigh-in today';
  if (days === 1) return '1 day available';
  return `${days} days available`;
}

function dateTimeLabel(prefix: string, value: string | null): string | null {
  if (!value) return null;
  return `${prefix}: ${value}`;
}

function dateWithOptionalTime(date: string | null, time: string | null | undefined): string | null {
  if (!date) return null;
  return time ? `${date} ${time}` : date;
}

function fightContextLabel(fight: FightOpportunitySnapshot | null): string | null {
  if (!fight) return null;
  const status = humanize(fight.status);
  const target = fight.targetWeightClassName ? ` target ${fight.targetWeightClassName}` : '';
  const date = fight.competitionDate ? ` on ${fight.competitionDate}` : '';
  return `${status} fight${target}${date}.`;
}

function bodyMassMissingData(bodyMass: BodyMassState | null | undefined): string[] {
  if (!bodyMass) return ['Body mass'];
  return bodyMass.missingFields.map((field) => humanize(field.field));
}

function safetyFlagLabel(code: string): string {
  if (code === 'missing_body_mass_data') return 'Current body mass';
  if (code === 'missing_target_class') return 'Target class';
  if (code === 'missing_timeframe') return 'Weigh-in or competition timing';
  return humanize(code);
}

function confidenceSummary(confidence: ConfidenceValue | null | undefined): string {
  if (!confidence || confidence.level === 'unknown') {
    return 'Confidence is unknown because key body-mass or timing data is missing.';
  }
  if (confidence.level === 'low') {
    return 'Confidence is low, so Athleticore will be cautious with body-mass guidance.';
  }
  return `${humanize(confidence.level)} confidence.`;
}

function formatMass(value: number | null | undefined, unit = 'lb'): string {
  return value == null ? 'Unknown' : `${roundOne(value)} ${unit}`;
}

function rangeTarget(range: MeasurementRange<string> | null | undefined): number | null {
  return typeof range?.target === 'number' && Number.isFinite(range.target) ? range.target : null;
}

function formatSigned(value: number): string {
  if (value > 0) return `+${roundOne(value)}`;
  return String(roundOne(value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
