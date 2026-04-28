import type { Explanation } from './explanation.ts';
import type { AthleticorePhase, PhaseTransitionReason } from './phase.ts';
import type { ConfidenceValue, ISODateString, ISODateTimeString, MeasurementRange } from './shared.ts';
import type { WeightClassPlan } from './bodyMass.ts';

export type FightOpportunityStatus =
  | 'tentative'
  | 'confirmed'
  | 'short_notice'
  | 'canceled'
  | 'rescheduled'
  | 'completed';

export interface FightEventMetadata {
  eventName: string | null;
  promotion: string | null;
  location: string | null;
}

export interface FightOpponentMetadata {
  name: string | null;
  stance: 'orthodox' | 'southpaw' | 'switch' | 'unknown' | null;
  notes: string[];
}

export interface FightOpportunityTiming {
  competitionDate: ISODateString | null;
  competitionTime: string | null;
  weighInDate: ISODateString | null;
  weighInTime: string | null;
  timeZone: string | null;
}

export interface FightOpportunityWeightTarget {
  weightClassName: string | null;
  targetWeightLbs: number | null;
  targetBodyMassRange: MeasurementRange<'lb'> | null;
}

export interface FightOpportunityFeasibilityHandoff {
  status: 'not_evaluated' | 'needs_body_mass_engine' | 'apparently_feasible' | 'unsafe_until_reviewed';
  reasons: string[];
}

export interface FightPhaseRecommendation {
  recommendedPhase: AthleticorePhase;
  reason: PhaseTransitionReason;
  shouldTransition: boolean;
  blocksCasualHardPlanGeneration: boolean;
  explanation: Explanation;
}

export interface FightOpportunityHistoryEvent {
  type:
    | 'created'
    | 'confirmed'
    | 'canceled'
    | 'rescheduled'
    | 'weight_class_changed'
    | 'metadata_updated';
  occurredAt: ISODateTimeString;
  summary: string;
}

export interface FightOpportunity {
  id: string;
  athleteId: string;
  status: FightOpportunityStatus;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  timing: FightOpportunityTiming;
  target: FightOpportunityWeightTarget;
  event: FightEventMetadata;
  opponent: FightOpponentMetadata;
  feasibility: FightOpportunityFeasibilityHandoff;
  phaseRecommendation: FightPhaseRecommendation;
  history: FightOpportunityHistoryEvent[];
  explanation: Explanation;
  confidence: ConfidenceValue;
}

export interface FightOpportunitySnapshot {
  id: string;
  status: FightOpportunityStatus;
  competitionDate: ISODateString | null;
  competitionTime: string | null;
  weighInDate: ISODateString | null;
  weighInTime: string | null;
  targetWeightClassName: string | null;
  targetBodyMassRange: WeightClassPlan['targetBodyMassRange'] | null;
  phaseRecommendation: FightPhaseRecommendation;
  event: FightEventMetadata;
  opponent: FightOpponentMetadata;
  explanation: Explanation | null;
}
