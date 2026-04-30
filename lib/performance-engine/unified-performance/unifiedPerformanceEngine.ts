import type { BodyMassMeasurement } from '../utils/bodyMassUnits.ts';
import { normalizeBodyMass } from '../utils/bodyMassUnits.ts';
import type {
  AthleteJourneyState,
  AthleteProfile,
  AthleticorePhase,
  BodyMassState,
  BodyMassTrend,
  ComposedSession,
  ConfidenceValue,
  Explanation,
  FightOpportunity,
  FightOpportunitySnapshot,
  FoodEntry,
  ISODateString,
  ISODateTimeString,
  PerformanceState,
  PhaseState,
  ReadinessState,
  RiskFlag,
  SessionFamily,
  SessionSource,
  TrackingEntry,
  TrainingAvailability,
  TrainingBlock,
} from '../types/index.ts';
import type {
  AdaptiveSessionCandidate,
  AdaptiveTrainingWeekResult,
  ProtectedAnchorInput,
} from '../adaptive-training/adaptiveTrainingEngine.ts';
import type { NutritionFuelingResult } from '../nutrition-fueling/nutritionFuelingEngine.ts';
import type { WeightClassManagementResult } from '../body-mass-weight-class/bodyMassWeightClassEngine.ts';
import { createAthleteJourneyState } from '../types/journey.ts';
import { createComposedSession } from '../types/training.ts';
import { createPerformanceState } from '../types/performanceState.ts';
import { createPhaseState } from '../types/phase.ts';
import { createUnknownBodyMassState } from '../types/bodyMass.ts';
import { createExplanation, explainDecision, explainPlanAdjustment } from '../explanation-engine/explanationEngine.ts';
import { recommendPhaseForFightOpportunity } from '../phase-controller/phaseController.ts';
import { transitionPerformancePhase } from '../phase-controller/phaseController.ts';
import { snapshotFightOpportunity } from '../fight-opportunity/fightOpportunityEngine.ts';
import { generateAdaptiveTrainingWeek } from '../adaptive-training/adaptiveTrainingEngine.ts';
import { generateNutritionTarget } from '../nutrition-fueling/nutritionFuelingEngine.ts';
import { resolveReadinessFromPerformanceState } from '../tracking-readiness/trackingReadinessEngine.ts';
import { evaluateWeightClassPlanFromPerformanceState } from '../body-mass-weight-class/bodyMassWeightClassEngine.ts';
import { dedupeRiskFlags } from '../risk-safety/riskSafetyEngine.ts';
import { confidenceFromLevel, normalizeConfidence } from '../utils/confidence.ts';
import { createMeasurementRange, createUnknownRange } from '../utils/units.ts';

export const UNIFIED_PERFORMANCE_ENGINE_VERSION = 'unified-performance-engine-v1';

export interface WeightClassEvaluationInput {
  competitionId?: string | null;
  competitionDate?: ISODateString | null;
  weighInDateTime?: ISODateTimeString | null;
  competitionDateTime?: ISODateTimeString | null;
  targetClassMass?: BodyMassMeasurement | null;
  desiredScaleWeight?: BodyMassMeasurement | null;
}

export interface UnifiedPerformanceEngineInput {
  athlete?: AthleteProfile | undefined;
  journey?: AthleteJourneyState | undefined;
  performanceState?: PerformanceState | undefined;
  asOfDate: ISODateString;
  weekStartDate?: ISODateString | null | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
  phase?: PhaseState | null | undefined;
  trainingAvailability?: TrainingAvailability | null | undefined;
  fightOpportunity?: FightOpportunity | FightOpportunitySnapshot | null | undefined;
  protectedAnchors?: ProtectedAnchorInput[] | undefined;
  trackingEntries?: TrackingEntry[] | undefined;
  completedSessions?: ComposedSession[] | undefined;
  plannedSessions?: ComposedSession[] | undefined;
  foodEntries?: FoodEntry[] | undefined;
  bodyMassState?: BodyMassState | null | undefined;
  bodyMassHistory?: Array<{ date: ISODateString; value: unknown; unit?: 'lb' | 'kg'; source?: string | null }> | undefined;
  weightClass?: WeightClassEvaluationInput | null | undefined;
  activeTrainingBlock?: TrainingBlock | null | undefined;
  initialRiskFlags?: RiskFlag[] | undefined;
  candidateSessions?: AdaptiveSessionCandidate[] | undefined;
  existingSessions?: AdaptiveSessionCandidate[] | undefined;
  acuteChronicWorkloadRatio?: number | null | undefined;
}

export interface UnifiedCanonicalOutputs {
  performanceState: PerformanceState;
  trainingBlock: TrainingBlock;
  composedSessions: ComposedSession[];
  nutritionTarget: NutritionFuelingResult['target'];
  sessionFuelingDirectives: NutritionFuelingResult['sessionFuelingDirectives'];
  readiness: ReadinessState;
  weightClassPlan: WeightClassManagementResult['plan'] | null;
  riskFlags: RiskFlag[];
  explanations: Explanation[];
}

export interface UnifiedPersistencePlan {
  canonicalOnly: true;
  outputs: Array<
    | 'performance_state'
    | 'training_block'
    | 'composed_sessions'
    | 'nutrition_target'
    | 'session_fueling_directives'
    | 'readiness_state'
    | 'weight_class_plan'
    | 'risk_flags'
    | 'explanations'
  >;
  supersedes: string[];
}

export interface UnifiedPerformanceEngineResult {
  engineVersion: typeof UNIFIED_PERFORMANCE_ENGINE_VERSION;
  performanceState: PerformanceState;
  readiness: ReturnType<typeof resolveReadinessFromPerformanceState>;
  training: AdaptiveTrainingWeekResult;
  nutrition: NutritionFuelingResult;
  weightClass: WeightClassManagementResult | null;
  fightOpportunity: FightOpportunitySnapshot | null;
  riskFlags: RiskFlag[];
  blockingRiskFlags: RiskFlag[];
  explanations: Explanation[];
  finalPlanStatus: 'ready' | 'caution' | 'blocked';
  canonicalOutputs: UnifiedCanonicalOutputs;
  persistencePlan: UnifiedPersistencePlan;
}

const ENGINE_CONFIDENCE = confidenceFromLevel('medium', [
  'Unified Performance Engine coordinated phase, fight, readiness, training, nutrition, body mass, risk, and explanation systems.',
]);

function isFightOpportunity(value: FightOpportunity | FightOpportunitySnapshot): value is FightOpportunity {
  return 'timing' in value && 'target' in value && 'history' in value;
}

function fightSnapshot(value: FightOpportunity | FightOpportunitySnapshot | null | undefined): FightOpportunitySnapshot | null {
  if (!value) return null;
  return isFightOpportunity(value) ? snapshotFightOpportunity(value) : value;
}

function dateTimeFromFightParts(date: ISODateString | null, time: string | null | undefined): ISODateTimeString | null {
  if (!date) return null;
  return `${date}T${time ?? '00:00:00'}.000Z`;
}

function weekStartForDate(date: ISODateString): ISODateString {
  const current = new Date(`${date}T00:00:00Z`);
  const day = current.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  current.setUTCDate(current.getUTCDate() + mondayOffset);
  return current.toISOString().slice(0, 10);
}

function buildFallbackJourney(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  trainingAvailability?: TrainingAvailability | null;
  bodyMassState?: BodyMassState | null;
  activeTrainingBlock?: TrainingBlock | null;
  activeFightOpportunity?: FightOpportunitySnapshot | null;
}): AthleteJourneyState {
  return createAthleteJourneyState({
    journeyId: `${input.athlete.athleteId}:journey`,
    athlete: input.athlete,
    timelineStartDate: input.phase.activeSince,
    phase: input.phase,
    trainingAvailability: input.trainingAvailability ?? null,
    bodyMassState: input.bodyMassState ?? null,
    activeTrainingBlock: input.activeTrainingBlock ?? null,
    activeFightOpportunity: input.activeFightOpportunity ?? null,
    confidence: input.athlete.confidence,
  });
}

function requireBaseState(input: UnifiedPerformanceEngineInput): PerformanceState {
  if (input.performanceState) {
    return createPerformanceState({
      ...input.performanceState,
      asOfDate: input.asOfDate,
      generatedAt: input.generatedAt ?? input.performanceState.generatedAt,
      trackingEntries: input.trackingEntries ?? input.performanceState.trackingEntries,
      bodyMass: input.bodyMassState ?? input.performanceState.bodyMass,
      trainingAvailability: input.trainingAvailability ?? input.performanceState.trainingAvailability,
      activeTrainingBlock: input.activeTrainingBlock ?? input.performanceState.activeTrainingBlock,
      riskFlags: dedupeRiskFlags([...(input.performanceState.riskFlags ?? []), ...(input.initialRiskFlags ?? [])]),
    });
  }

  if (!input.athlete) {
    throw new Error('Unified Performance Engine requires an athlete or a PerformanceState.');
  }

  const fight = fightSnapshot(input.fightOpportunity);
  const phase = input.phase ?? input.journey?.phase ?? createPhaseState({ current: 'unknown' });
  const journey = input.journey ?? buildFallbackJourney({
    athlete: input.athlete,
    phase,
    trainingAvailability: input.trainingAvailability ?? null,
    bodyMassState: input.bodyMassState ?? null,
    activeTrainingBlock: input.activeTrainingBlock ?? null,
    activeFightOpportunity: fight,
  });

  return createPerformanceState({
    athlete: input.athlete,
    journey,
    asOfDate: input.asOfDate,
    generatedAt: input.generatedAt ?? null,
    phase,
    trainingAvailability: input.trainingAvailability ?? journey.trainingAvailability,
    activeTrainingBlock: input.activeTrainingBlock ?? journey.activeTrainingBlock,
    bodyMass: input.bodyMassState ?? journey.bodyMassState,
    trackingEntries: input.trackingEntries ?? [],
    riskFlags: dedupeRiskFlags([...(journey.riskFlags ?? []), ...(input.initialRiskFlags ?? [])]),
    confidence: journey.confidence,
  });
}

function familyForAnchor(anchor: ProtectedAnchorInput): SessionFamily {
  if (anchor.family) return anchor.family;
  switch (anchor.kind) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
      return 'boxing_skill';
    case 'strength':
    case 'heavy_lower_strength':
    case 'heavy_upper_strength':
    case 'power':
    case 'plyo':
    case 'speed':
      return 'strength';
    case 'conditioning':
    case 'hard_intervals':
    case 'threshold':
      return 'conditioning';
    case 'zone2':
    case 'easy_aerobic':
    case 'long_endurance':
      return 'roadwork';
    case 'competition':
      return 'assessment';
    case 'rest':
      return 'rest';
    default:
      return 'recovery';
  }
}

function sessionSourceForAnchor(anchor: ProtectedAnchorInput): SessionSource {
  return anchor.source ?? (anchor.kind === 'competition' ? 'competition' : 'protected_anchor');
}

function protectedAnchorSessions(input: {
  anchors?: ProtectedAnchorInput[] | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}): ComposedSession[] {
  return (input.anchors ?? []).map((anchor) => createComposedSession({
    id: anchor.id,
    date: anchor.date ?? null,
    family: familyForAnchor(anchor),
    source: sessionSourceForAnchor(anchor),
    protectedAnchor: true,
    anchorId: anchor.id,
    title: anchor.label,
    durationMinutes: createMeasurementRange({
      target: anchor.durationMinutes,
      unit: 'minute',
      confidence: ENGINE_CONFIDENCE,
    }),
    intensityRpe: createMeasurementRange({
      target: anchor.intensityRpe,
      unit: 'rpe',
      confidence: ENGINE_CONFIDENCE,
    }),
    stressScore: Math.round((anchor.durationMinutes * anchor.intensityRpe) / 10),
    tissueLoads: anchor.kind === 'sparring' ? ['combat', 'neural'] : anchor.kind === 'competition' ? ['combat', 'neural', 'full_body'] : [],
    explanation: createExplanation({
      kind: 'decision',
      summary: `${anchor.label} was preserved as a protected anchor.`,
      reasons: ['Protected workouts are non-negotiable anchors in the unified performance state.'],
      impact: 'kept',
      confidence: ENGINE_CONFIDENCE,
      generatedAt: input.generatedAt,
    }),
    confidence: ENGINE_CONFIDENCE,
  }));
}

function bodyMassStateFromReadiness(input: {
  current: BodyMassState | null;
  trend: BodyMassTrend;
  athlete: AthleteProfile;
  bodyMassHistory: ReturnType<typeof resolveReadinessFromPerformanceState>['bodyMassHistory'];
}): BodyMassState {
  const unit = input.athlete.preferredBodyMassUnit;
  const latestHistory = input.bodyMassHistory.at(-1);
  const latest = latestHistory
    ? normalizeBodyMass({
      value: latestHistory.value,
      fromUnit: latestHistory.unit ?? unit,
      toUnit: unit,
      measuredOn: latestHistory.date,
      confidence: input.trend.confidence,
    })
    : null;

  if (input.current && !latest) {
    return {
      ...input.current,
      trend: input.trend.direction === 'unknown' ? input.current.trend : input.trend,
    };
  }

  if (!latest) {
    return createUnknownBodyMassState(unit);
  }

  return {
    current: latest,
    trend: input.trend,
    targetRange: input.current?.targetRange ?? createUnknownRange(unit, input.trend.confidence),
    missingFields: [],
    riskFlags: input.current?.riskFlags ?? [],
    explanation: createExplanation({
      kind: 'decision',
      summary: 'Body-mass state was projected from tracking history.',
      reasons: ['Tracking entries update the shared PerformanceState instead of feeding a separate body-mass path.'],
      impact: 'adjusted',
      confidence: input.trend.confidence,
    }),
    confidence: input.trend.confidence,
  };
}

function targetMassFromFight(snapshot: FightOpportunitySnapshot | null): BodyMassMeasurement | null {
  const targetRange = snapshot?.targetBodyMassRange ?? null;
  if (!targetRange) return null;
  const target = targetRange.target;
  if (target == null) return null;
  return normalizeBodyMass({
    value: target,
    fromUnit: targetRange.unit,
    toUnit: targetRange.unit,
    measuredOn: snapshot?.weighInDate ?? snapshot?.competitionDate ?? null,
    confidence: targetRange.confidence,
  });
}

function resolveWeightClassInput(input: {
  explicit?: WeightClassEvaluationInput | null | undefined;
  fight: FightOpportunitySnapshot | null;
}): WeightClassEvaluationInput | null {
  if (input.explicit) return input.explicit;
  const targetClassMass = targetMassFromFight(input.fight);
  if (!targetClassMass && !input.fight?.competitionDate && !input.fight?.weighInDate) return null;

  return {
    competitionId: input.fight?.id ?? null,
    competitionDate: input.fight?.competitionDate ?? null,
    weighInDateTime: dateTimeFromFightParts(input.fight?.weighInDate ?? null, input.fight?.weighInTime),
    competitionDateTime: dateTimeFromFightParts(input.fight?.competitionDate ?? null, input.fight?.competitionTime),
    targetClassMass,
    desiredScaleWeight: targetClassMass,
  };
}

function phaseAdjustedState(input: {
  state: PerformanceState;
  fight: FightOpportunitySnapshot | null;
  asOfDate: ISODateString;
  generatedAt?: ISODateTimeString | null | undefined;
}): { state: PerformanceState; fightRecommendationExplanation: Explanation | null } {
  if (!input.fight) {
    return { state: input.state, fightRecommendationExplanation: null };
  }

  const recommendation = input.fight.phaseRecommendation ?? recommendPhaseForFightOpportunity({
    currentPhase: input.state.phase.current,
    status: input.fight.status,
    competitionDate: input.fight.competitionDate,
    asOfDate: input.asOfDate,
  });

  if (recommendation.shouldTransition) {
    const transitioned = transitionPerformancePhase({
      performanceState: input.state,
      to: recommendation.recommendedPhase,
      reason: recommendation.reason,
      transitionedAt: input.generatedAt ?? `${input.asOfDate}T00:00:00.000Z`,
      effectiveDate: input.asOfDate,
      plannedUntil: input.fight.competitionDate,
      activeFightOpportunity: input.fight,
    });
    return {
      state: transitioned.performanceState,
      fightRecommendationExplanation: recommendation.explanation,
    };
  }

  const journey = {
    ...input.state.journey,
    activeFightOpportunity: input.fight,
  };

  return {
    state: createPerformanceState({
      ...input.state,
      journey,
      explanations: [...input.state.explanations, recommendation.explanation],
    }),
    fightRecommendationExplanation: recommendation.explanation,
  };
}

function generatedRecoveryCandidates(date: ISODateString): AdaptiveSessionCandidate[] {
  return [
    {
      id: 'unified-fueling-recovery-support',
      title: 'Fueling-protected recovery support',
      kind: 'mobility',
      family: 'recovery',
      priority: 'recovery',
      durationMinutes: 25,
      intensityRpe: 2,
      preferredDayOfWeek: new Date(`${date}T00:00:00Z`).getUTCDay(),
      explanation: explainPlanAdjustment({
        summary: 'Generated hard training was reduced because fueling or readiness risk is active.',
        reasons: ['Nutrition and readiness risk can constrain generated training in the unified flow.'],
        confidence: ENGINE_CONFIDENCE,
      }),
    },
  ];
}

function shouldRestrictGeneratedHardTraining(flags: RiskFlag[], readiness: ReadinessState): boolean {
  return flags.some((flag) => (
    flag.status === 'active'
    && (
      (flag.code === 'under_fueling_risk' && (flag.severity === 'moderate' || flag.severity === 'high' || flag.severity === 'critical'))
      || flag.code === 'injury_conflict'
      || flag.code === 'illness_conflict'
      || (flag.code === 'poor_readiness' && (flag.severity === 'high' || flag.severity === 'critical'))
    )
  )) || readiness.recommendedTrainingAdjustment.replaceWithMobility;
}

function summarizeConfidence(states: Array<ConfidenceValue | null | undefined>): ConfidenceValue {
  const scores = states
    .map((item) => item?.score)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
  if (scores.length === 0) return ENGINE_CONFIDENCE;
  return normalizeConfidence(scores.reduce((sum, score) => sum + score, 0) / scores.length, [
    'Unified confidence combines readiness, training, nutrition, body-mass, and source-data confidence.',
  ]);
}

function blockingFlags(flags: RiskFlag[]): RiskFlag[] {
  return flags.filter((flag) => flag.status === 'active' && (flag.blocksPlan || flag.hardStop));
}

function planStatus(flags: RiskFlag[]): UnifiedPerformanceEngineResult['finalPlanStatus'] {
  if (blockingFlags(flags).length > 0) return 'blocked';
  if (flags.some((flag) => flag.status === 'active' && (flag.severity === 'moderate' || flag.severity === 'high' || flag.severity === 'critical'))) {
    return 'caution';
  }
  return 'ready';
}

function dedupeExplanations(explanations: Array<Explanation | null | undefined>): Explanation[] {
  const seen = new Set<string>();
  const result: Explanation[] = [];
  for (const explanation of explanations) {
    if (!explanation) continue;
    const key = `${explanation.kind}:${explanation.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(explanation);
  }
  return result;
}

function finalDecisionExplanation(input: {
  status: UnifiedPerformanceEngineResult['finalPlanStatus'];
  phase: AthleticorePhase;
  blockedCount: number;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  return explainDecision({
    summary: `Unified Performance Engine produced a ${input.status} plan for ${input.phase.replace(/_/g, ' ')} phase.`,
    reasons: [
      'Training, nutrition, readiness, phase, body mass, risk, and explanations were resolved from one PerformanceState.',
      input.blockedCount > 0
        ? `${input.blockedCount} blocking risk flag(s) prevent automatic plan approval.`
        : 'No blocking risk flags remain in the final unified state.',
      'Canonical outputs supersede disconnected scheduler, nutrition, readiness, phase, and weight-class paths.',
    ],
    confidence: ENGINE_CONFIDENCE,
    generatedAt: input.generatedAt,
  });
}

function persistencePlan(weightClass: WeightClassManagementResult | null): UnifiedPersistencePlan {
  return {
    canonicalOnly: true,
    outputs: [
      'performance_state',
      'training_block',
      'composed_sessions',
      'nutrition_target',
      'session_fueling_directives',
      'readiness_state',
      ...(weightClass ? ['weight_class_plan' as const] : []),
      'risk_flags',
      'explanations',
    ],
    supersedes: [
      'retired standalone scheduler integration',
      'retired macro-only nutrition target integration',
      'retired readiness-only planning integration',
      'retired phase switch integration',
      'retired daily weight-class protocol integration',
    ],
  };
}

export function runUnifiedPerformanceEngine(input: UnifiedPerformanceEngineInput): UnifiedPerformanceEngineResult {
  const generatedAt = input.generatedAt ?? null;
  const weekStartDate = input.weekStartDate ?? weekStartForDate(input.asOfDate);
  const fight = fightSnapshot(input.fightOpportunity ?? input.performanceState?.journey.activeFightOpportunity ?? input.journey?.activeFightOpportunity);
  const base = phaseAdjustedState({
    state: requireBaseState(input),
    fight,
    asOfDate: input.asOfDate,
    generatedAt,
  });
  const anchorSessions = protectedAnchorSessions({
    anchors: input.protectedAnchors,
    generatedAt,
  });
  const readinessSeedState = createPerformanceState({
    ...base.state,
    composedSessions: [
      ...anchorSessions,
      ...(input.completedSessions ?? []),
      ...(input.plannedSessions ?? []),
      ...(base.state.composedSessions ?? []),
    ],
    trackingEntries: input.trackingEntries ?? base.state.trackingEntries,
  });
  const readiness = resolveReadinessFromPerformanceState({
    performanceState: readinessSeedState,
    date: input.asOfDate,
    entries: input.trackingEntries ?? readinessSeedState.trackingEntries,
    completedSessions: input.completedSessions,
    plannedSessions: [...anchorSessions, ...(input.plannedSessions ?? [])],
    acuteChronicWorkloadRatio: input.acuteChronicWorkloadRatio,
    generatedAt,
  });
  const bodyMass = bodyMassStateFromReadiness({
    current: input.bodyMassState ?? base.state.bodyMass,
    trend: readiness.bodyMassTrend,
    athlete: base.state.athlete,
    bodyMassHistory: readiness.bodyMassHistory,
  });
  const stateWithReadiness = createPerformanceState({
    ...base.state,
    journey: {
      ...base.state.journey,
      bodyMassState: bodyMass,
      riskFlags: dedupeRiskFlags([
        ...base.state.journey.riskFlags,
        ...readiness.riskFlags,
        ...(input.initialRiskFlags ?? []),
      ]),
    },
    bodyMass,
    readiness: readiness.readiness,
    trackingEntries: input.trackingEntries ?? base.state.trackingEntries,
    riskFlags: dedupeRiskFlags([
      ...base.state.riskFlags,
      ...readiness.riskFlags,
      ...(input.initialRiskFlags ?? []),
    ]),
    explanations: dedupeExplanations([
      ...base.state.explanations,
      base.fightRecommendationExplanation,
      readiness.readiness.explanation,
      ...readiness.riskFlags.map((flag) => flag.explanation),
    ]),
  });
  const weightClassInput = resolveWeightClassInput({
    explicit: input.weightClass,
    fight,
  });
  const weightClass = weightClassInput
    ? evaluateWeightClassPlanFromPerformanceState({
      performanceState: stateWithReadiness,
      competitionId: weightClassInput.competitionId,
      competitionDate: weightClassInput.competitionDate,
      weighInDateTime: weightClassInput.weighInDateTime,
      competitionDateTime: weightClassInput.competitionDateTime,
      targetClassMass: weightClassInput.targetClassMass,
      desiredScaleWeight: weightClassInput.desiredScaleWeight,
      bodyMassHistory: input.bodyMassHistory ?? readiness.bodyMassHistory,
      underFuelingScreen: readiness.readiness.trendFlags.includes('low_nutrition_support')
        ? { lowIntakeRelativeToLoad: true, repeatedMissedNutritionTargetEstimate: true }
        : undefined,
      generatedAt,
    })
    : null;
  const stateBeforeTraining = createPerformanceState({
    ...stateWithReadiness,
    weightClassPlan: weightClass?.plan ?? stateWithReadiness.weightClassPlan,
    riskFlags: dedupeRiskFlags([
      ...stateWithReadiness.riskFlags,
      ...(weightClass?.riskFlags ?? []),
    ]),
    explanations: dedupeExplanations([
      ...stateWithReadiness.explanations,
      ...(weightClass?.explanations ?? []),
      weightClass?.plan.explanation,
    ]),
  });
  const restrictGeneratedHardTraining = shouldRestrictGeneratedHardTraining(stateBeforeTraining.riskFlags, stateBeforeTraining.readiness);
  const training = generateAdaptiveTrainingWeek({
    performanceState: stateBeforeTraining,
    weekStartDate,
    protectedAnchors: input.protectedAnchors,
    existingSessions: input.existingSessions,
    candidateSessions: restrictGeneratedHardTraining
      ? generatedRecoveryCandidates(input.asOfDate)
      : input.candidateSessions,
    generatedAt,
  });
  const stateBeforeNutrition = createPerformanceState({
    ...stateBeforeTraining,
    activeTrainingBlock: training.trainingBlock,
    composedSessions: training.composedSessions,
    explanations: dedupeExplanations([
      ...stateBeforeTraining.explanations,
      ...training.explanations,
      restrictGeneratedHardTraining
        ? explainPlanAdjustment({
          summary: 'Generated hard training was constrained by readiness or nutrition risk.',
          reasons: ['The unified flow lets nutrition and readiness risk affect training before finalizing the plan.'],
          confidence: ENGINE_CONFIDENCE,
          generatedAt,
        })
        : null,
    ]),
  });
  const nutrition = generateNutritionTarget({
    performanceState: stateBeforeNutrition,
    date: input.asOfDate,
    foodEntries: input.foodEntries,
    generatedAt,
  });
  const finalRiskFlags = dedupeRiskFlags([
    ...stateBeforeNutrition.riskFlags,
    ...training.conflicts.flatMap((conflict) => conflict.blocksPlan ? [{
      id: conflict.id,
      domain: conflict.message.includes('Competition') ? 'competition' as const : 'plan_integrity' as const,
      code: conflict.message.includes('Competition') ? 'competition_proximity_conflict' as const : 'duplicate_or_conflicting_plan' as const,
      severity: conflict.severity,
      status: 'active' as const,
      message: conflict.message,
      evidence: conflict.sessionIds.map((sessionId) => ({ metric: 'session_id', value: sessionId })),
      blocksPlan: conflict.blocksPlan,
      hardStop: conflict.blocksPlan,
      requiresProfessionalReview: false,
      appliesOn: input.asOfDate,
      resolvedAt: null,
      confidence: ENGINE_CONFIDENCE,
      explanation: conflict.explanation,
    }] : []),
    ...nutrition.riskFlags,
    ...(weightClass?.riskFlags ?? []),
  ]);
  const finalStatus = planStatus(finalRiskFlags);
  const finalState = createPerformanceState({
    ...stateBeforeNutrition,
    nutritionTargets: [nutrition.target],
    sessionFuelingDirectives: nutrition.sessionFuelingDirectives,
    riskFlags: finalRiskFlags,
    confidence: summarizeConfidence([
      stateBeforeNutrition.confidence,
      readiness.readiness.confidence,
      training.trainingBlock.confidence,
      nutrition.target.confidence,
      weightClass?.plan.confidence,
    ]),
  });
  const finalExplanation = finalDecisionExplanation({
    status: finalStatus,
    phase: finalState.phase.current,
    blockedCount: blockingFlags(finalRiskFlags).length,
    generatedAt,
  });
  const explanations = dedupeExplanations([
    ...finalState.explanations,
    ...nutrition.explanations,
    ...finalRiskFlags.map((flag) => flag.explanation),
    finalExplanation,
  ]);
  const performanceState = createPerformanceState({
    ...finalState,
    explanations,
  });

  return {
    engineVersion: UNIFIED_PERFORMANCE_ENGINE_VERSION,
    performanceState,
    readiness,
    training,
    nutrition,
    weightClass,
    fightOpportunity: fight,
    riskFlags: finalRiskFlags,
    blockingRiskFlags: blockingFlags(finalRiskFlags),
    explanations,
    finalPlanStatus: finalStatus,
    canonicalOutputs: {
      performanceState,
      trainingBlock: training.trainingBlock,
      composedSessions: training.composedSessions,
      nutritionTarget: nutrition.target,
      sessionFuelingDirectives: nutrition.sessionFuelingDirectives,
      readiness: readiness.readiness,
      weightClassPlan: weightClass?.plan ?? null,
      riskFlags: finalRiskFlags,
      explanations,
    },
    persistencePlan: persistencePlan(weightClass),
  };
}
