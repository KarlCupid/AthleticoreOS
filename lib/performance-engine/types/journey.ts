import type { AthleteProfile } from './athlete.ts';
import type { BodyMassState, WeightClassPlan } from './bodyMass.ts';
import type { Explanation } from './explanation.ts';
import type { PhaseState } from './phase.ts';
import { createPhaseState } from './phase.ts';
import type { RiskFlag } from './risk.ts';
import type { ConfidenceValue, ISODateString, ISODateTimeString, UnknownField } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { ProtectedWorkoutAnchor, TrainingBlock } from './training.ts';

function dateFromDateTime(value: ISODateTimeString | null): ISODateString | null {
  return value ? value.slice(0, 10) : null;
}

export type JourneyEventType =
  | 'onboarding_completed'
  | 'build_phase_started'
  | 'fight_opportunity_created'
  | 'fight_opportunity_confirmed'
  | 'fight_opportunity_rescheduled'
  | 'fight_opportunity_canceled'
  | 'fight_weight_class_changed'
  | 'camp_started'
  | 'competition_week_started'
  | 'recovery_started'
  | 'workout_completed'
  | 'food_logged'
  | 'body_mass_logged'
  | 'readiness_logged'
  | 'safety_flag_raised';

export interface JourneyEvent {
  id: string;
  athleteId: string;
  type: JourneyEventType;
  occurredAt: ISODateTimeString;
  effectiveDate: ISODateString | null;
  payload: Record<string, unknown>;
  explanation: Explanation | null;
}

export interface FightOpportunitySnapshot {
  id: string;
  status: 'tentative' | 'confirmed' | 'short_notice' | 'canceled' | 'rescheduled' | 'completed';
  competitionDate: ISODateString | null;
  targetWeightClassName: string | null;
  targetBodyMassRange: WeightClassPlan['targetBodyMassRange'] | null;
  explanation: Explanation | null;
}

export interface AthleteJourneyState {
  journeyId: string;
  athlete: AthleteProfile;
  initializedAt: ISODateTimeString | null;
  timelineStartDate: ISODateString | null;
  phase: PhaseState;
  activeTrainingBlock: TrainingBlock | null;
  activeFightOpportunity: FightOpportunitySnapshot | null;
  protectedWorkoutAnchors: ProtectedWorkoutAnchor[];
  bodyMassState: BodyMassState | null;
  weightClassPlan: WeightClassPlan | null;
  riskFlags: RiskFlag[];
  events: JourneyEvent[];
  missingFields: UnknownField[];
  confidence: ConfidenceValue;
}

export function createAthleteJourneyState(input: {
  journeyId: string;
  athlete: AthleteProfile;
  initializedAt?: ISODateTimeString | null;
  timelineStartDate?: ISODateString | null;
  phase?: PhaseState;
  activeTrainingBlock?: TrainingBlock | null;
  activeFightOpportunity?: FightOpportunitySnapshot | null;
  protectedWorkoutAnchors?: ProtectedWorkoutAnchor[];
  bodyMassState?: BodyMassState | null;
  weightClassPlan?: WeightClassPlan | null;
  riskFlags?: RiskFlag[];
  events?: JourneyEvent[];
  missingFields?: UnknownField[];
  confidence?: ConfidenceValue;
}): AthleteJourneyState {
  const initializedAt = input.initializedAt ?? input.athlete.onboardingCompletedAt;

  return {
    journeyId: input.journeyId,
    athlete: input.athlete,
    initializedAt,
    timelineStartDate: input.timelineStartDate ?? dateFromDateTime(initializedAt),
    phase: input.phase ?? createPhaseState({ current: 'unknown' }),
    activeTrainingBlock: input.activeTrainingBlock ?? null,
    activeFightOpportunity: input.activeFightOpportunity ?? null,
    protectedWorkoutAnchors: input.protectedWorkoutAnchors ?? [],
    bodyMassState: input.bodyMassState ?? null,
    weightClassPlan: input.weightClassPlan ?? null,
    riskFlags: input.riskFlags ?? [],
    events: input.events ?? [],
    missingFields: input.missingFields ?? [],
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
  };
}
