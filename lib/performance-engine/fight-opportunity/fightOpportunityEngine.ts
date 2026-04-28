import {
  type AthleticorePhase,
  type FightEventMetadata,
  type FightOpponentMetadata,
  type FightOpportunity,
  type FightOpportunityHistoryEvent,
  type FightOpportunitySnapshot,
  type FightOpportunityStatus,
  type FightOpportunityTiming,
  type FightOpportunityWeightTarget,
  type ISODateString,
  type ISODateTimeString,
} from '../types/index.ts';
import { createExplanation } from '../explanation-engine/explanationEngine.ts';
import { confidenceFromLevel } from '../utils/confidence.ts';
import { createMeasurementRange } from '../utils/units.ts';
import { recommendPhaseForFightOpportunity } from '../phase-controller/phaseController.ts';

export interface CreateFightOpportunityInput {
  id: string;
  athleteId: string;
  status: FightOpportunityStatus;
  asOfDate: ISODateString;
  createdAt: ISODateTimeString;
  currentPhase: AthleticorePhase;
  competitionDate: ISODateString | null;
  competitionTime?: string | null;
  weighInDate?: ISODateString | null;
  weighInTime?: string | null;
  timeZone?: string | null;
  targetWeightClassName?: string | null;
  targetWeightLbs?: number | null;
  opponent?: Partial<FightOpponentMetadata>;
  event?: Partial<FightEventMetadata>;
}

function buildTiming(input: CreateFightOpportunityInput): FightOpportunityTiming {
  return {
    competitionDate: input.competitionDate,
    competitionTime: input.competitionTime ?? null,
    weighInDate: input.weighInDate ?? null,
    weighInTime: input.weighInTime ?? null,
    timeZone: input.timeZone ?? null,
  };
}

function buildTarget(input: {
  targetWeightClassName?: string | null;
  targetWeightLbs?: number | null;
}): FightOpportunityWeightTarget {
  const targetWeightLbs = input.targetWeightLbs ?? null;

  return {
    weightClassName: input.targetWeightClassName ?? null,
    targetWeightLbs,
    targetBodyMassRange: targetWeightLbs == null
      ? null
      : createMeasurementRange({
        min: Math.max(0, targetWeightLbs - 1),
        target: targetWeightLbs,
        max: targetWeightLbs + 1,
        unit: 'lb',
        confidence: confidenceFromLevel('low', ['Weight-class feasibility belongs to the future body-mass engine.']),
      }),
  };
}

function buildFeasibility(target: FightOpportunityWeightTarget) {
  if (target.targetWeightLbs == null && !target.weightClassName) {
    return {
      status: 'not_evaluated' as const,
      reasons: ['No target weight class has been supplied.'],
    };
  }

  return {
    status: 'needs_body_mass_engine' as const,
    reasons: ['Fight opportunity has weight-class context that must be evaluated by the future body-mass engine.'],
  };
}

function buildOpponent(input?: Partial<FightOpponentMetadata>): FightOpponentMetadata {
  return {
    name: input?.name ?? null,
    stance: input?.stance ?? null,
    notes: input?.notes ?? [],
  };
}

function buildEvent(input?: Partial<FightEventMetadata>): FightEventMetadata {
  return {
    eventName: input?.eventName ?? null,
    promotion: input?.promotion ?? null,
    location: input?.location ?? null,
  };
}

function historyEvent(type: FightOpportunityHistoryEvent['type'], occurredAt: ISODateTimeString, summary: string) {
  return { type, occurredAt, summary };
}

export function snapshotFightOpportunity(opportunity: FightOpportunity): FightOpportunitySnapshot {
  return {
    id: opportunity.id,
    status: opportunity.status,
    competitionDate: opportunity.timing.competitionDate,
    competitionTime: opportunity.timing.competitionTime,
    weighInDate: opportunity.timing.weighInDate,
    weighInTime: opportunity.timing.weighInTime,
    targetWeightClassName: opportunity.target.weightClassName,
    targetBodyMassRange: opportunity.target.targetBodyMassRange,
    phaseRecommendation: opportunity.phaseRecommendation,
    event: opportunity.event,
    opponent: opportunity.opponent,
    explanation: opportunity.explanation,
  };
}

export function createFightOpportunity(input: CreateFightOpportunityInput): FightOpportunity {
  const timing = buildTiming(input);
  const target = buildTarget(input);
  const phaseRecommendation = recommendPhaseForFightOpportunity({
    currentPhase: input.currentPhase,
    status: input.status,
    competitionDate: input.competitionDate,
    asOfDate: input.asOfDate,
  });
  const explanation = createExplanation({
    summary: `${input.status.replace(/_/g, ' ')} fight opportunity captured.`,
    reasons: [
      'Fight opportunities update the current athlete journey instead of creating a detached camp.',
      phaseRecommendation.explanation.summary,
    ],
    impact: phaseRecommendation.shouldTransition ? 'adjusted' : 'kept',
    confidence: confidenceFromLevel(input.competitionDate ? 'medium' : 'low'),
    generatedAt: input.createdAt,
  });

  return {
    id: input.id,
    athleteId: input.athleteId,
    status: input.status,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    timing,
    target,
    event: buildEvent(input.event),
    opponent: buildOpponent(input.opponent),
    feasibility: buildFeasibility(target),
    phaseRecommendation,
    history: [historyEvent('created', input.createdAt, explanation.summary)],
    explanation,
    confidence: confidenceFromLevel(input.competitionDate ? 'medium' : 'low'),
  };
}

function updateOpportunity(
  opportunity: FightOpportunity,
  input: {
    status: FightOpportunityStatus;
    asOfDate: ISODateString;
    updatedAt: ISODateTimeString;
    currentPhase: AthleticorePhase;
    timing?: Partial<FightOpportunityTiming>;
    target?: Partial<Pick<FightOpportunityWeightTarget, 'weightClassName' | 'targetWeightLbs'>>;
    historyType: FightOpportunityHistoryEvent['type'];
    historySummary: string;
  },
): FightOpportunity {
  const timing = { ...opportunity.timing, ...input.timing };
  const target = buildTarget({
    targetWeightClassName: input.target && 'weightClassName' in input.target
      ? input.target.weightClassName
      : opportunity.target.weightClassName,
    targetWeightLbs: input.target && 'targetWeightLbs' in input.target
      ? input.target.targetWeightLbs
      : opportunity.target.targetWeightLbs,
  });
  const phaseRecommendation = recommendPhaseForFightOpportunity({
    currentPhase: input.currentPhase,
    status: input.status,
    competitionDate: timing.competitionDate,
    asOfDate: input.asOfDate,
  });
  const explanation = createExplanation({
    summary: input.historySummary,
    reasons: [
      'The fight opportunity was updated in place so the athlete journey keeps prior context.',
      phaseRecommendation.explanation.summary,
    ],
    impact: phaseRecommendation.shouldTransition ? 'adjusted' : 'kept',
    confidence: confidenceFromLevel(timing.competitionDate ? 'medium' : 'low'),
    generatedAt: input.updatedAt,
  });

  return {
    ...opportunity,
    status: input.status,
    updatedAt: input.updatedAt,
    timing,
    target,
    feasibility: buildFeasibility(target),
    phaseRecommendation,
    history: [...opportunity.history, historyEvent(input.historyType, input.updatedAt, input.historySummary)],
    explanation,
    confidence: confidenceFromLevel(timing.competitionDate ? 'medium' : 'low'),
  };
}

export function confirmFightOpportunity(
  opportunity: FightOpportunity,
  input: {
    asOfDate: ISODateString;
    updatedAt: ISODateTimeString;
    currentPhase: AthleticorePhase;
    competitionDate?: ISODateString | null;
  },
): FightOpportunity {
  return updateOpportunity(opportunity, {
    status: 'confirmed',
    asOfDate: input.asOfDate,
    updatedAt: input.updatedAt,
    currentPhase: input.currentPhase,
    timing: input.competitionDate === undefined ? undefined : { competitionDate: input.competitionDate },
    historyType: 'confirmed',
    historySummary: 'Fight opportunity confirmed.',
  });
}

export function cancelFightOpportunity(
  opportunity: FightOpportunity,
  input: {
    asOfDate: ISODateString;
    updatedAt: ISODateTimeString;
    currentPhase: AthleticorePhase;
    reason?: string;
  },
): FightOpportunity {
  return updateOpportunity(opportunity, {
    status: 'canceled',
    asOfDate: input.asOfDate,
    updatedAt: input.updatedAt,
    currentPhase: input.currentPhase,
    historyType: 'canceled',
    historySummary: input.reason ? `Fight canceled: ${input.reason}` : 'Fight opportunity canceled.',
  });
}

export function rescheduleFightOpportunity(
  opportunity: FightOpportunity,
  input: {
    asOfDate: ISODateString;
    updatedAt: ISODateTimeString;
    currentPhase: AthleticorePhase;
    competitionDate: ISODateString;
    competitionTime?: string | null;
    weighInDate?: ISODateString | null;
    weighInTime?: string | null;
  },
): FightOpportunity {
  return updateOpportunity(opportunity, {
    status: 'rescheduled',
    asOfDate: input.asOfDate,
    updatedAt: input.updatedAt,
    currentPhase: input.currentPhase,
    timing: {
      competitionDate: input.competitionDate,
      competitionTime: 'competitionTime' in input ? input.competitionTime ?? null : opportunity.timing.competitionTime,
      weighInDate: 'weighInDate' in input ? input.weighInDate ?? null : opportunity.timing.weighInDate,
      weighInTime: 'weighInTime' in input ? input.weighInTime ?? null : opportunity.timing.weighInTime,
    },
    historyType: 'rescheduled',
    historySummary: 'Fight opportunity rescheduled.',
  });
}

export function changeFightOpportunityWeightClass(
  opportunity: FightOpportunity,
  input: {
    asOfDate: ISODateString;
    updatedAt: ISODateTimeString;
    currentPhase: AthleticorePhase;
    targetWeightClassName: string | null;
    targetWeightLbs: number | null;
  },
): FightOpportunity {
  return updateOpportunity(opportunity, {
    status: opportunity.status,
    asOfDate: input.asOfDate,
    updatedAt: input.updatedAt,
    currentPhase: input.currentPhase,
    target: {
      weightClassName: input.targetWeightClassName,
      targetWeightLbs: input.targetWeightLbs,
    },
    historyType: 'weight_class_changed',
    historySummary: 'Fight opportunity weight class changed.',
  });
}
