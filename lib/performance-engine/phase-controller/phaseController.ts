import {
  createExplanation,
  createPerformanceState,
  createPhaseState,
  createPhaseTransition,
  type AthleticorePhase,
  type AthleteJourneyState,
  type FightOpportunitySnapshot,
  type FightPhaseRecommendation,
  type ISODateString,
  type ISODateTimeString,
  type JourneyEvent,
  type PerformanceState,
  type PhaseTransition,
  type PhaseTransitionReason,
  type RiskFlag,
} from '../types/index.ts';
import { confidenceFromLevel } from '../utils/confidence.ts';
import { daysBetween } from '../utils/dates.ts';

export type LegacyAthletePhase =
  | 'off-season'
  | 'pre-camp'
  | 'fight-camp'
  | 'camp-base'
  | 'camp-build'
  | 'camp-peak'
  | 'camp-taper';

export interface PhaseTransitionResult {
  journey: AthleteJourneyState;
  performanceState: PerformanceState;
  transition: PhaseTransition;
}

export interface PhaseTransitionInput {
  performanceState: PerformanceState;
  to: AthleticorePhase;
  reason: PhaseTransitionReason;
  transitionedAt: ISODateTimeString;
  effectiveDate: ISODateString;
  plannedUntil?: ISODateString | null;
  activeFightOpportunity?: FightOpportunitySnapshot | null;
}

export interface FightOpportunityPhaseInput {
  currentPhase: AthleticorePhase;
  status: FightOpportunitySnapshot['status'];
  competitionDate: ISODateString | null;
  asOfDate: ISODateString;
}

export interface ReadinessRiskPhaseInput {
  currentPhase: AthleticorePhase;
  riskFlags: RiskFlag[];
  hasEnoughReadinessData: boolean;
}

function reasonToJourneyEventType(reason: PhaseTransitionReason): JourneyEvent['type'] {
  switch (reason) {
    case 'build_phase_started':
    case 'baseline_to_build':
    case 'recovery_completed':
      return 'build_phase_started';
    case 'fight_opportunity_created':
      return 'fight_opportunity_created';
    case 'fight_tentative':
      return 'fight_opportunity_created';
    case 'fight_confirmed':
    case 'short_notice_fight':
      return 'fight_opportunity_confirmed';
    case 'fight_rescheduled':
    case 'fight_delayed':
      return 'fight_opportunity_rescheduled';
    case 'fight_canceled':
      return 'fight_opportunity_canceled';
    case 'competition_week_started':
      return 'competition_week_started';
    case 'recovery_started':
      return 'recovery_started';
    default:
      return 'phase_transitioned';
  }
}

function transitionSummary(to: AthleticorePhase): string {
  return to.replace(/_/g, ' ');
}

export function transitionPerformancePhase(input: PhaseTransitionInput): PhaseTransitionResult {
  const from = input.performanceState.phase.current;
  const explanation = createExplanation({
    summary: `Phase transitioned from ${transitionSummary(from)} to ${transitionSummary(input.to)}.`,
    reasons: [
      'The athlete journey is continuous; phase changes update state without replacing baseline context.',
      'Protected workouts, preferences, history, body-mass context, readiness context, and risk flags are carried forward.',
    ],
    impact: 'adjusted',
    confidence: confidenceFromLevel('medium', ['Phase transition was resolved by the Phase Controller.']),
    generatedAt: input.transitionedAt,
  });
  const transition = createPhaseTransition({
    from,
    to: input.to,
    transitionedAt: input.transitionedAt,
    reason: input.reason,
    explanation,
  });
  const phase = createPhaseState({
    current: input.to,
    previous: from,
    activeSince: input.effectiveDate,
    plannedUntil: input.plannedUntil ?? null,
    transitionReason: input.reason,
    transitionHistory: [...input.performanceState.phase.transitionHistory, transition],
    confidence: input.performanceState.phase.confidence,
    explanation,
  });
  const activeFightOpportunity =
    input.activeFightOpportunity === undefined
      ? input.performanceState.journey.activeFightOpportunity
      : input.activeFightOpportunity;
  const journeyEvent: JourneyEvent = {
    id: `${input.performanceState.athlete.athleteId}:${input.transitionedAt}:${input.reason}`,
    athleteId: input.performanceState.athlete.athleteId,
    type: reasonToJourneyEventType(input.reason),
    occurredAt: input.transitionedAt,
    effectiveDate: input.effectiveDate,
    payload: {
      from,
      to: input.to,
      activeFightOpportunityId: activeFightOpportunity?.id ?? null,
    },
    explanation,
  };
  const journey: AthleteJourneyState = {
    ...input.performanceState.journey,
    phase,
    activeFightOpportunity,
    events: [...input.performanceState.journey.events, journeyEvent],
  };

  return {
    journey,
    performanceState: createPerformanceState({
      ...input.performanceState,
      journey,
      phase,
      riskFlags: input.performanceState.riskFlags,
      explanations: [...input.performanceState.explanations, explanation],
    }),
    transition,
  };
}

export function recommendPhaseForFightOpportunity(input: FightOpportunityPhaseInput): FightPhaseRecommendation {
  const daysOut = input.competitionDate ? daysBetween(input.asOfDate, input.competitionDate) : null;
  const confidence = confidenceFromLevel(input.competitionDate ? 'medium' : 'low', [
    input.competitionDate ? 'Competition date is available.' : 'Competition date is unknown.',
  ]);

  if (input.status === 'tentative') {
    const explanation = createExplanation({
      summary: 'Tentative fight logged without overriding the current phase.',
      reasons: ['Tentative opportunities should influence awareness without resetting the athlete journey.'],
      impact: 'kept',
      confidence,
    });
    return {
      recommendedPhase: input.currentPhase,
      reason: 'fight_tentative',
      shouldTransition: false,
      blocksCasualHardPlanGeneration: false,
      explanation,
    };
  }

  if (input.status === 'canceled') {
    const returnPhase: AthleticorePhase = ['camp', 'short_notice_camp', 'competition_week', 'taper'].includes(input.currentPhase)
      ? 'build'
      : input.currentPhase;
    const explanation = createExplanation({
      summary: 'Canceled fight returns the athlete to a non-camp trajectory without losing history.',
      reasons: ['Camp context changes, but onboarding baseline, logs, protected workouts, and preferences remain attached to the journey.'],
      impact: 'adjusted',
      confidence,
    });
    return {
      recommendedPhase: returnPhase,
      reason: 'fight_canceled',
      shouldTransition: returnPhase !== input.currentPhase,
      blocksCasualHardPlanGeneration: false,
      explanation,
    };
  }

  if (daysOut !== null && daysOut <= 7) {
    const explanation = createExplanation({
      summary: 'Fight timing places the athlete in competition week.',
      reasons: ['Competition week should block casual hard-plan generation and defer detailed load decisions to later engines.'],
      impact: 'restricted',
      confidence,
    });
    return {
      recommendedPhase: 'competition_week',
      reason: 'competition_week_started',
      shouldTransition: input.currentPhase !== 'competition_week',
      blocksCasualHardPlanGeneration: true,
      explanation,
    };
  }

  if (input.status === 'short_notice' || (daysOut !== null && daysOut <= 28)) {
    const explanation = createExplanation({
      summary: 'Fight timing requires short-notice camp handling.',
      reasons: ['Short-notice fights modify the existing journey instead of creating a detached camp start.'],
      impact: 'adjusted',
      confidence,
    });
    return {
      recommendedPhase: 'short_notice_camp',
      reason: 'short_notice_fight',
      shouldTransition: input.currentPhase !== 'short_notice_camp',
      blocksCasualHardPlanGeneration: false,
      explanation,
    };
  }

  if (input.status === 'rescheduled' && daysOut !== null && daysOut > 84) {
    const explanation = createExplanation({
      summary: 'Delayed fight returns the athlete to build context without losing camp history.',
      reasons: ['The fight is far enough away that the current camp pressure should ease while the journey remains intact.'],
      impact: 'adjusted',
      confidence,
    });
    return {
      recommendedPhase: 'build',
      reason: 'fight_delayed',
      shouldTransition: input.currentPhase !== 'build',
      blocksCasualHardPlanGeneration: false,
      explanation,
    };
  }

  if (input.status === 'confirmed' || input.status === 'rescheduled') {
    const explanation = createExplanation({
      summary: 'Confirmed fight moves the athlete into camp context.',
      reasons: ['Camp begins as a state transition on the ongoing athlete journey.'],
      impact: 'adjusted',
      confidence,
    });
    return {
      recommendedPhase: 'camp',
      reason: input.status === 'rescheduled' ? 'fight_rescheduled' : 'fight_confirmed',
      shouldTransition: input.currentPhase !== 'camp',
      blocksCasualHardPlanGeneration: false,
      explanation,
    };
  }

  const explanation = createExplanation({
    summary: 'Fight opportunity does not require a phase change.',
    reasons: ['No actionable fight timing is available.'],
    impact: 'kept',
    confidence,
  });
  return {
    recommendedPhase: input.currentPhase,
    reason: 'fight_opportunity_created',
    shouldTransition: false,
    blocksCasualHardPlanGeneration: false,
    explanation,
  };
}

export function recommendDeloadForReadinessRisk(input: ReadinessRiskPhaseInput): FightPhaseRecommendation | null {
  if (!input.hasEnoughReadinessData) {
    return null;
  }

  const severeRisk = input.riskFlags.some((flag) => (
    flag.hardStop || flag.severity === 'high' || flag.severity === 'critical'
  ));

  if (!severeRisk) {
    return null;
  }

  const explanation = createExplanation({
    summary: 'Readiness and risk context call for a deload transition.',
    reasons: ['A deload is only recommended here when enough readiness/risk data exists.'],
    impact: 'restricted',
    confidence: confidenceFromLevel('medium', ['Risk flags are present and readiness data is sufficient.']),
  });

  return {
    recommendedPhase: 'deload',
    reason: 'deload_required',
    shouldTransition: input.currentPhase !== 'deload',
    blocksCasualHardPlanGeneration: true,
    explanation,
  };
}

export function recommendRecoveryAfterCompetition(input: {
  currentPhase: AthleticorePhase;
}): FightPhaseRecommendation {
  const explanation = createExplanation({
    summary: 'Competition is followed by recovery.',
    reasons: ['Recovery preserves the athlete journey while lowering performance pressure after competition.'],
    impact: 'adjusted',
    confidence: confidenceFromLevel('medium'),
  });

  return {
    recommendedPhase: 'recovery',
    reason: 'recovery_started',
    shouldTransition: input.currentPhase !== 'recovery',
    blocksCasualHardPlanGeneration: true,
    explanation,
  };
}

export function resolveBuildPhaseForGoal(goalType: string): AthleticorePhase {
  if (goalType === 'weight_class_prep') {
    return 'weight_class_management';
  }

  return 'build';
}

export function mapPerformancePhaseToLegacyPhase(phase: AthleticorePhase): LegacyAthletePhase {
  switch (phase) {
    case 'camp':
    case 'short_notice_camp':
      return 'fight-camp';
    case 'competition_week':
    case 'taper':
      return 'camp-taper';
    case 'weight_class_management':
    case 'body_recomposition':
      return 'pre-camp';
    case 'deload':
    case 'recovery':
    case 'maintenance':
    case 'build':
    case 'onboarding':
    case 'transition':
    case 'unknown':
    default:
      return 'off-season';
  }
}
