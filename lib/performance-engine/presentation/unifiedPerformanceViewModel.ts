import type {
  BodyMassState,
  ComposedSession,
  ConfidenceValue,
  Explanation,
  MeasurementRange,
  NutritionTarget,
  PerformanceState,
  ProtectedWorkoutAnchor,
  ReadinessState,
  RiskFlag,
  TrainingBlock,
  WeightClassPlan,
} from '../types/index.ts';
import type { UnifiedPerformanceEngineResult } from '../unified-performance/index.ts';

export type UnifiedPerformanceTone = 'ready' | 'caution' | 'blocked' | 'unknown';

export interface UnifiedPerformanceRiskViewModel {
  id: string;
  label: string;
  severity: RiskFlag['severity'];
  blocksPlan: boolean;
  message: string;
  explanation: string | null;
}

export interface UnifiedProtectedAnchorViewModel {
  id: string;
  label: string;
  dateLabel: string | null;
  intensityLabel: string;
  sourceLabel: string;
}

export interface UnifiedExplanationViewModel {
  id: string;
  kind: Explanation['kind'];
  summary: string;
  reasons: string[];
  impact: Explanation['impact'];
}

export interface UnifiedNutritionNumbers {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  hydrationOz: number | null;
}

export interface UnifiedPerformanceViewModel {
  available: boolean;
  engineVersion: string | null;
  planStatus: UnifiedPerformanceEngineResult['finalPlanStatus'] | 'unknown';
  planStatusLabel: string;
  planStatusTone: UnifiedPerformanceTone;
  phase: {
    current: PerformanceState['phase']['current'] | 'unknown';
    label: string;
    reason: string;
    activeSinceLabel: string | null;
    plannedUntilLabel: string | null;
    changeSummary: string | null;
  };
  journey: {
    segmentLabel: string;
    continuityLabel: string;
    nextEventLabel: string | null;
    nextEventDateLabel: string | null;
    whatChangedLabel: string | null;
  };
  focus: {
    training: string;
    nutrition: string;
    readiness: string;
    bodyMass: string | null;
  };
  readiness: {
    band: ReadinessState['readinessBand'] | 'unknown';
    bandLabel: string;
    scoreLabel: string;
    confidenceLabel: string;
    explanation: string;
    missingDataLabels: string[];
    recommendedTrainingAdjustmentLabel: string | null;
    recommendedNutritionAdjustmentLabel: string | null;
  };
  nutrition: {
    numbers: UnifiedNutritionNumbers;
    targetLabel: string;
    confidenceLabel: string;
    explanation: string;
    sessionFuelingSummary: string | null;
  };
  bodyMass: {
    trajectoryLabel: string;
    feasibilityLabel: string | null;
    riskLabel: string | null;
    explanation: string;
    safetyLabel: string | null;
  } | null;
  protectedAnchors: UnifiedProtectedAnchorViewModel[];
  riskFlags: UnifiedPerformanceRiskViewModel[];
  blockingRiskSummary: string | null;
  explanations: UnifiedExplanationViewModel[];
  lowConfidence: boolean;
  confidenceSummary: string;
}

const UNAVAILABLE_MODEL: UnifiedPerformanceViewModel = {
  available: false,
  engineVersion: null,
  planStatus: 'unknown',
  planStatusLabel: 'Performance state pending',
  planStatusTone: 'unknown',
  phase: {
    current: 'unknown',
    label: 'Phase unknown',
    reason: 'The unified performance state has not been resolved yet.',
    activeSinceLabel: null,
    plannedUntilLabel: null,
    changeSummary: null,
  },
  journey: {
    segmentLabel: 'Journey pending',
    continuityLabel: 'Onboarding, phase, training, nutrition, readiness, and body-mass context will appear after the engine resolves.',
    nextEventLabel: null,
    nextEventDateLabel: null,
    whatChangedLabel: null,
  },
  focus: {
    training: 'Training context pending',
    nutrition: 'Fuel context pending',
    readiness: 'Readiness context pending',
    bodyMass: null,
  },
  readiness: {
    band: 'unknown',
    bandLabel: 'Unknown',
    scoreLabel: 'Unknown',
    confidenceLabel: 'Unknown confidence',
    explanation: 'Readiness is unknown until check-in and recent context are available.',
    missingDataLabels: ['Unified performance state'],
    recommendedTrainingAdjustmentLabel: null,
    recommendedNutritionAdjustmentLabel: null,
  },
  nutrition: {
    numbers: {
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      hydrationOz: null,
    },
    targetLabel: 'Targets pending',
    confidenceLabel: 'Unknown confidence',
    explanation: 'Fuel targets will resolve from training, phase, readiness, and body-mass context.',
    sessionFuelingSummary: null,
  },
  bodyMass: null,
  protectedAnchors: [],
  riskFlags: [],
  blockingRiskSummary: null,
  explanations: [],
  lowConfidence: true,
  confidenceSummary: 'Confidence is unknown because the unified engine output is unavailable.',
};

export function buildUnifiedPerformanceViewModel(
  result: UnifiedPerformanceEngineResult | null | undefined,
): UnifiedPerformanceViewModel {
  if (!result) {
    return UNAVAILABLE_MODEL;
  }

  const performanceState = result.canonicalOutputs.performanceState;
  const readiness = result.canonicalOutputs.readiness;
  const nutritionTarget = result.canonicalOutputs.nutritionTarget;
  const weightClassPlan = result.canonicalOutputs.weightClassPlan;
  const confidenceSummary = confidenceLabel(performanceState.confidence);
  const lowConfidence = hasLowConfidence([
    performanceState.confidence,
    readiness.confidence,
    nutritionTarget.confidence,
    performanceState.bodyMass?.confidence,
    weightClassPlan?.confidence,
  ]);

  return {
    available: true,
    engineVersion: result.engineVersion,
    planStatus: result.finalPlanStatus,
    planStatusLabel: planStatusLabel(result.finalPlanStatus),
    planStatusTone: result.finalPlanStatus,
    phase: buildPhaseViewModel(performanceState),
    journey: buildJourneyViewModel(result),
    focus: buildFocusViewModel({
      performanceState,
      trainingBlock: result.canonicalOutputs.trainingBlock,
      nutritionTarget,
      readiness,
      bodyMass: performanceState.bodyMass,
      weightClassPlan,
    }),
    readiness: buildReadinessViewModel(readiness),
    nutrition: buildNutritionViewModel(nutritionTarget),
    bodyMass: buildBodyMassViewModel(performanceState.bodyMass, weightClassPlan),
    protectedAnchors: buildProtectedAnchors(performanceState),
    riskFlags: result.riskFlags.map(toRiskViewModel),
    blockingRiskSummary: result.blockingRiskFlags.length > 0
      ? `${result.blockingRiskFlags.length} blocking risk ${result.blockingRiskFlags.length === 1 ? 'flag' : 'flags'} active`
      : null,
    explanations: result.explanations.map(toExplanationViewModel).slice(0, 8),
    lowConfidence,
    confidenceSummary: lowConfidence
      ? lowConfidenceSummary([readiness, nutritionTarget, performanceState.bodyMass, weightClassPlan])
      : confidenceSummary,
  };
}

export function nutritionNumbersFromUnifiedTarget(
  target: NutritionTarget | null | undefined,
): UnifiedNutritionNumbers {
  return {
    calories: rangeTarget(target?.energyTargetRange ?? target?.energyTarget),
    proteinG: rangeTarget(target?.proteinTargetRange ?? target?.proteinTarget),
    carbsG: rangeTarget(target?.carbohydrateTargetRange ?? target?.carbohydrateTarget),
    fatG: rangeTarget(target?.fatTargetRange ?? target?.fatTarget),
    hydrationOz: rangeTarget(target?.hydrationTarget),
  };
}

function buildPhaseViewModel(performanceState: PerformanceState): UnifiedPerformanceViewModel['phase'] {
  const phase = performanceState.phase;
  const latestTransition = phase.transitionHistory[phase.transitionHistory.length - 1] ?? null;
  const reason = phase.explanation?.summary
    ?? latestTransition?.explanation?.summary
    ?? humanize(phase.transitionReason);
  const changeSummary = latestTransition
    ? `${humanize(latestTransition.from)} to ${humanize(latestTransition.to)}: ${latestTransition.explanation?.summary ?? humanize(latestTransition.reason)}`
    : phase.previous
      ? `${humanize(phase.previous)} to ${humanize(phase.current)}`
      : null;

  return {
    current: phase.current,
    label: humanize(phase.current),
    reason,
    activeSinceLabel: phase.activeSince,
    plannedUntilLabel: phase.plannedUntil,
    changeSummary,
  };
}

function buildJourneyViewModel(result: UnifiedPerformanceEngineResult): UnifiedPerformanceViewModel['journey'] {
  const performanceState = result.canonicalOutputs.performanceState;
  const trainingBlock = result.canonicalOutputs.trainingBlock;
  const fight = result.fightOpportunity ?? performanceState.journey.activeFightOpportunity;
  const currentGoal = performanceState.journey.goals[0] ?? null;
  const segmentLabel = trainingBlockLabel(trainingBlock, currentGoal?.label);
  const nextEventDateLabel = fight?.competitionDate ?? performanceState.weightClassPlan?.competitionDate ?? null;
  const nextEventLabel = fight
    ? `${humanize(fight.status)} fight${fight.event.eventName ? ` - ${fight.event.eventName}` : ''}`
    : performanceState.weightClassPlan?.competitionDate
      ? 'Competition date'
      : null;

  return {
    segmentLabel,
    continuityLabel: 'Journey context is preserved across onboarding, phase transitions, fights, training, nutrition, readiness, and body-mass updates.',
    nextEventLabel,
    nextEventDateLabel,
    whatChangedLabel: performanceState.phase.transitionHistory[performanceState.phase.transitionHistory.length - 1]?.explanation?.summary
      ?? performanceState.phase.explanation?.summary
      ?? null,
  };
}

function buildFocusViewModel(input: {
  performanceState: PerformanceState;
  trainingBlock: TrainingBlock;
  nutritionTarget: NutritionTarget;
  readiness: ReadinessState;
  bodyMass: BodyMassState | null;
  weightClassPlan: WeightClassPlan | null;
}): UnifiedPerformanceViewModel['focus'] {
  const hardAnchors = input.performanceState.composedSessions.filter((session) =>
    session.protectedAnchor && rangeTarget(session.intensityRpe) != null && (rangeTarget(session.intensityRpe) ?? 0) >= 7,
  ).length;
  const training = input.trainingBlock.explanation?.summary
    ?? `${humanize(input.trainingBlock.goal)} focus with ${input.trainingBlock.sessions.length} composed sessions${hardAnchors > 0 ? ` and ${hardAnchors} hard protected anchor${hardAnchors === 1 ? '' : 's'}` : ''}.`;
  const nutrition = input.nutritionTarget.explanation?.summary
    ?? `${humanize(input.nutritionTarget.purpose)} fueling for ${humanize(input.nutritionTarget.phase)} phase.`;
  const readiness = input.readiness.explanation?.summary
    ?? `${readinessBandLabel(input.readiness.readinessBand)} readiness with ${confidenceLabel(input.readiness.confidence)}.`;
  const bodyMass = input.weightClassPlan
    ? `${humanize(input.weightClassPlan.feasibilityStatus)} weight-class feasibility, ${humanize(input.weightClassPlan.riskLevel)} risk.`
    : input.bodyMass?.trend.direction && input.bodyMass.trend.direction !== 'unknown'
      ? `${humanize(input.bodyMass.trend.direction)} body-mass trend.`
      : null;

  return { training, nutrition, readiness, bodyMass };
}

function buildReadinessViewModel(readiness: ReadinessState): UnifiedPerformanceViewModel['readiness'] {
  return {
    band: readiness.readinessBand,
    bandLabel: readinessBandLabel(readiness.readinessBand),
    scoreLabel: readiness.overallReadiness == null ? 'Unknown' : `${Math.round(readiness.overallReadiness)}/100`,
    confidenceLabel: confidenceLabel(readiness.confidence),
    explanation: readiness.explanation?.summary
      ?? readiness.recommendedTrainingAdjustment.reasons[0]
      ?? 'Readiness needs more check-in context.',
    missingDataLabels: readiness.missingData.map((field) => humanize(field.field)),
    recommendedTrainingAdjustmentLabel: readiness.recommendedTrainingAdjustment.type === 'none'
      ? null
      : humanize(readiness.recommendedTrainingAdjustment.type),
    recommendedNutritionAdjustmentLabel: readiness.recommendedNutritionAdjustment.type === 'none'
      ? null
      : humanize(readiness.recommendedNutritionAdjustment.type),
  };
}

function buildNutritionViewModel(target: NutritionTarget): UnifiedPerformanceViewModel['nutrition'] {
  const numbers = nutritionNumbersFromUnifiedTarget(target);
  const sessionFuelingSummary = target.sessionFuelingDirectives.length > 0
    ? `${target.sessionFuelingDirectives.length} session fueling directive${target.sessionFuelingDirectives.length === 1 ? '' : 's'}`
    : null;

  return {
    numbers,
    targetLabel: [
      numbers.calories == null ? null : `${Math.round(numbers.calories)} kcal`,
      numbers.carbsG == null ? null : `${Math.round(numbers.carbsG)}g carbs`,
      numbers.proteinG == null ? null : `${Math.round(numbers.proteinG)}g protein`,
    ].filter(Boolean).join(' / ') || 'Targets unknown',
    confidenceLabel: confidenceLabel(target.confidence),
    explanation: target.explanation?.summary ?? `${humanize(target.purpose)} nutrition target for ${humanize(target.phase)} phase.`,
    sessionFuelingSummary,
  };
}

function buildBodyMassViewModel(
  bodyMass: BodyMassState | null,
  weightClassPlan: WeightClassPlan | null,
): UnifiedPerformanceViewModel['bodyMass'] {
  if (!bodyMass && !weightClassPlan) return null;
  const trendLabel = bodyMass
    ? `${humanize(bodyMass.trend.direction)}${rangeTarget(bodyMass.trend.weeklyChange) == null ? '' : ` ${formatSigned(rangeTarget(bodyMass.trend.weeklyChange) ?? 0)} ${bodyMass.trend.weeklyChange.unit}/week`}`
    : 'Body mass trend unknown';

  if (!weightClassPlan) {
    return {
      trajectoryLabel: trendLabel,
      feasibilityLabel: null,
      riskLabel: null,
      explanation: bodyMass?.explanation?.summary ?? 'Body-mass trend is tracked as context, not as a standalone cut protocol.',
      safetyLabel: null,
    };
  }

  return {
    trajectoryLabel: trendLabel,
    feasibilityLabel: humanize(weightClassPlan.feasibilityStatus),
    riskLabel: humanize(weightClassPlan.riskLevel),
    explanation: weightClassPlan.explanation?.summary
      ?? 'Weight-class planning is safety gated by body-mass trend, timeframe, fueling, readiness, and risk flags.',
    safetyLabel: weightClassPlan.professionalReviewRequired
      ? 'Professional review required'
      : weightClassPlan.safetyStatus === 'unsafe'
        ? 'Blocked for safety'
        : humanize(weightClassPlan.safetyStatus),
  };
}

function buildProtectedAnchors(performanceState: PerformanceState): UnifiedProtectedAnchorViewModel[] {
  const anchors = new Map<string, UnifiedProtectedAnchorViewModel>();
  for (const anchor of performanceState.journey.protectedWorkoutAnchors) {
    anchors.set(anchor.id, protectedAnchorFromJourneyAnchor(anchor));
  }
  for (const session of performanceState.composedSessions.filter((item) => item.protectedAnchor)) {
    anchors.set(session.anchorId ?? session.id, protectedAnchorFromComposedSession(session));
  }
  return Array.from(anchors.values()).slice(0, 6);
}

function protectedAnchorFromJourneyAnchor(anchor: ProtectedWorkoutAnchor): UnifiedProtectedAnchorViewModel {
  return {
    id: anchor.id,
    label: anchor.label,
    dateLabel: anchor.date ?? null,
    intensityLabel: rangeTarget(anchor.expectedIntensityRpe) == null
      ? 'Fixed anchor'
      : `RPE ${rangeTarget(anchor.expectedIntensityRpe)}`,
    sourceLabel: anchor.source ? humanize(anchor.source) : humanize(anchor.sessionFamily),
  };
}

function protectedAnchorFromComposedSession(session: ComposedSession): UnifiedProtectedAnchorViewModel {
  return {
    id: session.anchorId ?? session.id,
    label: session.title,
    dateLabel: session.date,
    intensityLabel: rangeTarget(session.intensityRpe) == null
      ? 'Fixed anchor'
      : `RPE ${rangeTarget(session.intensityRpe)}`,
    sourceLabel: humanize(session.source),
  };
}

function toRiskViewModel(flag: RiskFlag): UnifiedPerformanceRiskViewModel {
  return {
    id: flag.id,
    label: humanize(flag.code),
    severity: flag.severity,
    blocksPlan: flag.blocksPlan || flag.hardStop,
    message: flag.message,
    explanation: flag.explanation?.summary ?? null,
  };
}

function toExplanationViewModel(explanation: Explanation): UnifiedExplanationViewModel {
  return {
    id: explanation.id ?? `${explanation.kind}:${explanation.summary}`,
    kind: explanation.kind,
    summary: explanation.summary,
    reasons: explanation.reasons,
    impact: explanation.impact,
  };
}

function trainingBlockLabel(block: TrainingBlock, fallbackGoal: string | null | undefined): string {
  const goal = fallbackGoal?.trim() || humanize(block.goal);
  const range = block.startDate && block.endDate ? ` (${block.startDate} to ${block.endDate})` : '';
  return `${goal}${range}`;
}

function planStatusLabel(status: UnifiedPerformanceEngineResult['finalPlanStatus']): string {
  if (status === 'blocked') return 'Blocked';
  if (status === 'caution') return 'Caution';
  return 'Ready';
}

function readinessBandLabel(band: ReadinessState['readinessBand']): string {
  if (band === 'green') return 'Green';
  if (band === 'yellow') return 'Yellow';
  if (band === 'orange') return 'Orange';
  if (band === 'red') return 'Red';
  return 'Unknown';
}

function confidenceLabel(confidence: ConfidenceValue | null | undefined): string {
  const level = confidence?.level ?? 'unknown';
  const score = confidence?.score;
  return score == null ? `${humanize(level)} confidence` : `${humanize(level)} confidence (${Math.round(score * 100)}%)`;
}

function hasLowConfidence(confidences: Array<ConfidenceValue | null | undefined>): boolean {
  return confidences.some((confidence) =>
    !confidence || confidence.level === 'unknown' || confidence.level === 'low' || confidence.score == null || confidence.score < 0.45,
  );
}

function lowConfidenceSummary(items: Array<{ confidence?: ConfidenceValue; missingData?: unknown[]; missingFields?: unknown[] } | null | undefined>): string {
  const reasons = items
    .flatMap((item) => item?.confidence?.reasons ?? [])
    .filter(Boolean);
  return reasons[0] ?? 'Confidence is limited because some readiness, nutrition, or body-mass data is missing.';
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

function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
