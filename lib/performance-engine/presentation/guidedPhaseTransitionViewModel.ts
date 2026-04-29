import type {
  AthleticorePhase,
  ConfidenceLevel,
  Explanation,
  PerformanceState,
  PhaseTransition,
  ReadinessState,
  WeightClassPlan,
} from '../types/index.ts';
import type { UnifiedPerformanceEngineResult } from '../unified-performance/index.ts';

export interface GuidedPhaseTransitionExplanation {
  id: string;
  summary: string;
  reasons: string[];
  impact: Explanation['impact'];
}

export interface GuidedPhaseTransitionViewModel {
  source: 'unified_performance_engine';
  available: boolean;
  athleteId: string | null;
  currentPhase: AthleticorePhase | 'unknown';
  currentPhaseLabel: string;
  previousPhase: AthleticorePhase | null;
  previousPhaseLabel: string | null;
  title: string;
  whereYouAreNow: string;
  whyChanging: string;
  transitionSummary: string;
  preservedContext: string[];
  changedFocus: string[];
  trainingChanges: string;
  fuelingChanges: string;
  recoveryExpectations: string;
  protectedWorkoutHandling: string;
  fightOrCompetitionContext: string | null;
  nextFocus: string;
  ctaLabel: string;
  confidence: {
    level: ConfidenceLevel;
    label: string;
    summary: string;
  };
  explanations: GuidedPhaseTransitionExplanation[];
  sourcePerformanceStateId: string | null;
}

const UNAVAILABLE_PHASE_TRANSITION: GuidedPhaseTransitionViewModel = {
  source: 'unified_performance_engine',
  available: false,
  athleteId: null,
  currentPhase: 'unknown',
  currentPhaseLabel: 'Unknown',
  previousPhase: null,
  previousPhaseLabel: null,
  title: 'Phase update',
  whereYouAreNow: 'Phase context is not ready yet.',
  whyChanging: 'Athleticore needs the current journey context before it explains a phase change.',
  transitionSummary: 'The athlete journey stays continuous while Athleticore resolves the current phase.',
  preservedContext: [],
  changedFocus: [],
  trainingChanges: 'Training changes are pending.',
  fuelingChanges: 'Fueling changes are pending.',
  recoveryExpectations: 'Recovery expectations are pending.',
  protectedWorkoutHandling: 'Protected workout context is pending.',
  fightOrCompetitionContext: null,
  nextFocus: 'Wait for the current journey context to resolve.',
  ctaLabel: 'Review plan',
  confidence: {
    level: 'unknown',
    label: 'Unknown confidence',
    summary: "Confidence is unknown because today's journey context is unavailable.",
  },
  explanations: [],
  sourcePerformanceStateId: null,
};

export function buildGuidedPhaseTransitionViewModel(
  result: UnifiedPerformanceEngineResult | null | undefined,
): GuidedPhaseTransitionViewModel {
  if (!result) return UNAVAILABLE_PHASE_TRANSITION;

  const performanceState = result.canonicalOutputs.performanceState;
  const latest = latestPhaseTransition(performanceState);
  const previousPhase = latest?.from ?? performanceState.phase.previous;
  const currentPhase = latest?.to ?? performanceState.phase.current;

  if (!previousPhase || previousPhase === currentPhase || currentPhase === 'unknown') {
    return {
      ...UNAVAILABLE_PHASE_TRANSITION,
      athleteId: performanceState.athlete.athleteId,
      currentPhase: performanceState.phase.current,
      currentPhaseLabel: humanize(performanceState.phase.current),
      confidence: buildConfidence(performanceState),
      sourcePerformanceStateId: sourcePerformanceStateId(performanceState),
    };
  }

  const fight = result.fightOpportunity ?? performanceState.journey.activeFightOpportunity;
  const protectedAnchors = result.canonicalOutputs.composedSessions.filter((session) => session.protectedAnchor);
  const weightClassPlan = result.canonicalOutputs.weightClassPlan ?? performanceState.weightClassPlan;
  const phaseReason = latest?.reason ?? performanceState.phase.transitionReason;

  const preservedContext = buildPreservedContext({ performanceState, protectedAnchorLabels: protectedAnchors.map((item) => item.title) });
  const changedFocus = buildChangedFocus(currentPhase, phaseReason, Boolean(fight), weightClassPlan);
  const whyChanging = buildWhyChanging(currentPhase, phaseReason, Boolean(fight));
  const fightOrCompetitionContext = buildFightOrCompetitionContext(currentPhase, fight, weightClassPlan);

  return {
    source: 'unified_performance_engine',
    available: true,
    athleteId: performanceState.athlete.athleteId,
    currentPhase,
    currentPhaseLabel: humanize(currentPhase),
    previousPhase,
    previousPhaseLabel: humanize(previousPhase),
    title: buildTitle(previousPhase, currentPhase),
    whereYouAreNow: `You're now in ${humanize(currentPhase)}.`,
    whyChanging,
    transitionSummary: buildTransitionSummary(previousPhase, currentPhase, phaseReason),
    preservedContext,
    changedFocus,
    trainingChanges: buildTrainingChanges(currentPhase, protectedAnchors.length),
    fuelingChanges: buildFuelingChanges(currentPhase, result.canonicalOutputs.readiness, weightClassPlan),
    recoveryExpectations: buildRecoveryExpectations(currentPhase, result.canonicalOutputs.readiness),
    protectedWorkoutHandling: buildProtectedWorkoutHandling(protectedAnchors.map((item) => item.title)),
    fightOrCompetitionContext,
    nextFocus: buildNextFocus(currentPhase),
    ctaLabel: buildCtaLabel(currentPhase),
    confidence: buildConfidence(performanceState),
    explanations: buildExplanations({ latest, whyChanging, preservedContext, changedFocus }),
    sourcePerformanceStateId: sourcePerformanceStateId(performanceState),
  };
}

function latestPhaseTransition(performanceState: PerformanceState): PhaseTransition | null {
  return performanceState.phase.transitionHistory[performanceState.phase.transitionHistory.length - 1] ?? null;
}

function buildTitle(from: AthleticorePhase, to: AthleticorePhase): string {
  if (to === 'short_notice_camp') return 'Short-notice camp';
  if (to === 'competition_week') return 'Competition week';
  if (to === 'recovery') return 'Recovery phase';
  return `${humanize(from)} to ${humanize(to)}`;
}

function buildTransitionSummary(
  from: AthleticorePhase,
  to: AthleticorePhase,
  reason: PhaseTransition['reason'],
): string {
  if (to === 'camp') {
    return `You're moving from ${humanize(from)} into Camp. Athleticore is keeping what you've built, protecting sparring, and shifting the plan toward fight-specific work.`;
  }
  if (to === 'short_notice_camp') {
    return 'A fight opportunity came up quickly. Athleticore is tightening the plan around the time available, protecting key sport sessions, and trimming lower-value noise.';
  }
  if (to === 'competition_week' || reason === 'competition_week_started') {
    return 'This week is about showing up sharp. Athleticore is protecting freshness, keeping training specific, and avoiding unnecessary hard work.';
  }
  if (to === 'recovery') {
    return 'Recovery is part of the journey. Athleticore is reducing load so you can absorb the work and come back ready for the next block.';
  }
  if (reason === 'fight_canceled') {
    return `The fight context changed, so Athleticore is moving you back into ${humanize(to)} while keeping your camp work, logs, and anchors attached.`;
  }
  return `You're moving from ${humanize(from)} into ${humanize(to)}. Athleticore is preserving the context you've built and reshaping the plan around what matters next.`;
}

function buildWhyChanging(
  to: AthleticorePhase,
  reason: PhaseTransition['reason'],
  hasFight: boolean,
): string {
  if (reason === 'fight_confirmed') {
    return 'The fight is confirmed, so the plan is shifting from general build work into camp.';
  }
  if (reason === 'short_notice_fight' || to === 'short_notice_camp') {
    return 'The timeline tightened, so Athleticore is choosing the work that matters most for fight readiness.';
  }
  if (reason === 'competition_week_started' || to === 'competition_week') {
    return 'The fight is close, so freshness, specific work, and fueling need to lead.';
  }
  if (reason === 'recovery_started' || to === 'recovery') {
    return 'The last block created enough stress that the next step is absorbing the work.';
  }
  if (reason === 'fight_canceled') {
    return 'The fight context changed, so the plan can return toward build work while keeping the work already done.';
  }
  if (hasFight) {
    return 'Fight context changed, so training, fueling, recovery, and body-mass decisions need to move together.';
  }
  return `The phase changed because ${humanize(reason).toLowerCase()} is now shaping the plan.`;
}

function buildPreservedContext(input: {
  performanceState: PerformanceState;
  protectedAnchorLabels: string[];
}): string[] {
  const items = [
    'Your training history, readiness context, body-mass trend, preferences, and risk flags stay attached to this journey.',
  ];

  if (input.protectedAnchorLabels.length > 0) {
    items.push(`Protected workouts stay as anchors: ${formatList(input.protectedAnchorLabels.slice(0, 2))}.`);
  }

  if (input.performanceState.trackingEntries.length > 0 || input.performanceState.composedSessions.length > 0) {
    items.push('Recent check-ins and training logs keep informing the plan.');
  }

  if (input.performanceState.bodyMass?.current || input.performanceState.weightClassPlan) {
    items.push('Body-mass context carries forward and stays connected to fueling and safety.');
  }

  if (input.performanceState.riskFlags.some((flag) => flag.status === 'active')) {
    items.push('Active risk flags carry forward so the next phase does not ignore fatigue, fuel, or body-mass concerns.');
  }

  return unique(items).slice(0, 4);
}

function buildChangedFocus(
  to: AthleticorePhase,
  reason: PhaseTransition['reason'],
  hasFight: boolean,
  weightClassPlan: WeightClassPlan | null,
): string[] {
  if (to === 'short_notice_camp' || reason === 'short_notice_fight') {
    return [
      'The plan tightens around the time available.',
      'Key sport work stays protected while lower-value extras come out.',
      'Fueling and recovery get pulled closer to fight readiness.',
    ];
  }

  if (to === 'camp' || hasFight) {
    return [
      'Fight-specific work moves up.',
      'Support work has to serve sparring, skill, and conditioning instead of competing with them.',
      'Fueling follows higher-output training days more closely.',
    ];
  }

  if (to === 'competition_week') {
    return [
      'Hard work gives way to freshness and sharp execution.',
      'Training stays specific while unnecessary fatigue comes out.',
      weightClassPlan ? 'Body-mass and weigh-in context stay safety-gated.' : 'Fueling, hydration, and recovery get simpler and more deliberate.',
    ];
  }

  if (to === 'recovery') {
    return [
      'Training load comes down so the work from the last block can settle.',
      'Recovery, food, hydration, and sleep become the main job.',
      'The next block should build from this history, not ignore it.',
    ];
  }

  return [
    `The main focus shifts toward ${humanize(to).toLowerCase()}.`,
    'Training, fueling, readiness, and body-mass context stay connected through the same day context.',
  ];
}

function buildTrainingChanges(to: AthleticorePhase, protectedAnchorCount: number): string {
  if (to === 'short_notice_camp') {
    return 'Training tightens around the time available. Key sport work stays protected and lower-value extras are trimmed.';
  }
  if (to === 'camp') {
    return 'Training shifts toward fight-specific work while keeping protected boxing sessions in place.';
  }
  if (to === 'competition_week') {
    return 'Training stays specific and sharp. Athleticore avoids unnecessary hard work this week.';
  }
  if (to === 'recovery') {
    return 'Training load comes down. Recovery work is treated as productive, not as a pause.';
  }
  if (protectedAnchorCount > 0) {
    return 'Training changes around the protected anchors instead of treating them as movable extras.';
  }
  return 'Training changes around the new phase while preserving the athlete history behind the plan.';
}

function buildFuelingChanges(
  to: AthleticorePhase,
  readiness: ReadinessState,
  weightClassPlan: WeightClassPlan | null,
): string {
  if (weightClassPlan?.safetyStatus === 'unsafe' || weightClassPlan?.professionalReviewRequired) {
    return "Body-mass pressure does not override safety. Athleticore will not build a risky plan around an aggressive target.";
  }
  if (to === 'competition_week') {
    return 'Fueling supports freshness, weigh-in logistics, and recovery without risky scale-pressure language.';
  }
  if (to === 'recovery') {
    return 'Fueling stays steady so recovery has enough food, protein, hydration, and consistency.';
  }
  if (to === 'camp' || to === 'short_notice_camp') {
    return 'Fueling follows session demand. High-output boxing and conditioning need carbs before and after work.';
  }
  if (readiness.readinessBand === 'orange' || readiness.readinessBand === 'red') {
    return 'Fueling stays supportive because lower readiness is not a reason to under-fuel.';
  }
  return 'Fueling changes with the new training demand and stays connected to readiness and body-mass context.';
}

function buildRecoveryExpectations(to: AthleticorePhase, readiness: ReadinessState): string {
  if (to === 'competition_week') {
    return 'Freshness takes priority. Recovery should protect sharpness instead of chasing extra work.';
  }
  if (to === 'recovery') {
    return 'Recovery is the work now: easy movement, food, hydration, sleep, and a calmer load.';
  }
  if (readiness.readinessBand === 'orange' || readiness.readinessBand === 'red') {
    return "Recovery expectations rise because readiness is lower. Athleticore should keep the main work and trim what does not help.";
  }
  if (to === 'camp' || to === 'short_notice_camp') {
    return 'Recovery has to protect the key sport days. Extra work should not stack on top of sparring or hard boxing.';
  }
  return 'Recovery expectations follow the new phase while keeping fatigue and readiness in the same decision loop.';
}

function buildProtectedWorkoutHandling(labels: string[]): string {
  if (labels.length === 0) {
    return 'No protected workouts are listed right now. If a coach-led session appears, Athleticore should treat it as an anchor.';
  }
  const formatted = formatList(labels.slice(0, 2));
  const suffix = labels.length > 2 ? ` and ${labels.length - 2} more` : '';
  return `${formatted}${suffix} ${labels.length === 1 ? 'stays' : 'stay'} protected. Athleticore adapts the support work around ${labels.length === 1 ? 'it' : 'them'}.`;
}

function buildFightOrCompetitionContext(
  to: AthleticorePhase,
  fight: UnifiedPerformanceEngineResult['fightOpportunity'],
  weightClassPlan: WeightClassPlan | null,
): string | null {
  if (fight) {
    const dateText = fight.competitionDate ? ` on ${fight.competitionDate}` : '';
    if (fight.status === 'short_notice') {
      return `Short-notice fight context is active${dateText}. Athleticore is protecting freshness and choosing the work that carries over to fight night.`;
    }
    if (fight.status === 'confirmed') {
      return `Confirmed fight context is active${dateText}. Training, fueling, recovery, and body-mass decisions now need to support that timeline.`;
    }
    if (fight.status === 'rescheduled') {
      return `Fight timing changed${dateText}. Athleticore keeps your history attached while reshaping the plan.`;
    }
    if (fight.status === 'canceled') {
      return 'The fight is canceled, so Athleticore should guide the journey back toward the next useful phase.';
    }
  }

  if (to === 'competition_week') {
    return weightClassPlan
      ? 'Competition week is active. Freshness, fueling, weigh-in context, and safety need to stay connected.'
      : 'Competition week is active. Freshness, fueling, and recovery matter most.';
  }

  return null;
}

function buildNextFocus(to: AthleticorePhase): string {
  if (to === 'short_notice_camp') return 'Protect freshness first, then do the highest-value fight work.';
  if (to === 'camp') return 'Show up fresh for the key sport sessions and let the support work serve the fight.';
  if (to === 'competition_week') return 'Stay sharp, fuel well, and avoid adding fatigue.';
  if (to === 'recovery') return 'Absorb the work, restore rhythm, and prepare for the next block.';
  return 'Follow the new phase focus while keeping the journey context connected.';
}

function buildCtaLabel(to: AthleticorePhase): string {
  if (to === 'competition_week') return 'Review competition week';
  if (to === 'recovery') return 'Continue recovery plan';
  return 'Review updated plan';
}

function buildConfidence(performanceState: PerformanceState): GuidedPhaseTransitionViewModel['confidence'] {
  const confidence = performanceState.phase.confidence ?? performanceState.confidence;
  const level = confidence.level;
  return {
    level,
    label: level === 'unknown' ? 'Unknown confidence' : `${humanize(level)} confidence`,
    summary: level === 'unknown' || level === 'low'
      ? 'Athleticore has limited context for this phase change, so the plan should stay conservative until more data comes in.'
      : 'Confidence is strong enough to explain this phase change from the current journey context.',
  };
}

function buildExplanations(input: {
  latest: PhaseTransition | null;
  whyChanging: string;
  preservedContext: string[];
  changedFocus: string[];
}): GuidedPhaseTransitionExplanation[] {
  const impact = input.latest?.explanation?.impact ?? 'adjusted';
  return [{
    id: input.latest?.explanation?.id ?? `guided-phase:${input.latest?.from ?? 'unknown'}:${input.latest?.to ?? 'unknown'}`,
    summary: 'Athleticore changed the phase while keeping training, fuel, readiness, body mass, risk, and anchors together.',
    reasons: unique([
      input.whyChanging,
      input.preservedContext[0],
      input.changedFocus[0],
      ...(input.latest?.explanation?.reasons ?? []),
    ]).slice(0, 4),
    impact,
  }];
}

function sourcePerformanceStateId(performanceState: PerformanceState): string | null {
  const maybe = performanceState as PerformanceState & { id?: unknown; performanceStateId?: unknown };
  if (typeof maybe.id === 'string') return maybe.id;
  if (typeof maybe.performanceStateId === 'string') return maybe.performanceStateId;
  return null;
}

function formatList(values: string[]): string {
  const clean = values.map((value) => value.trim()).filter(Boolean);
  if (clean.length === 0) return 'context';
  if (clean.length === 1) return clean[0] ?? 'context';
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
