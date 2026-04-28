import type { AthleteProfile } from './athlete.ts';
import type { BodyMassState, WeightClassPlan } from './bodyMass.ts';
import type { Explanation } from './explanation.ts';
import type { PhaseState } from './phase.ts';
import { createPhaseState } from './phase.ts';
import type { RiskFlag } from './risk.ts';
import type { ConfidenceValue, ISODateString, ISODateTimeString, UnknownField } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { ProtectedWorkoutAnchor, TrainingAvailability, TrainingBlock } from './training.ts';

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

export interface SportProfile {
  primarySport: AthleteProfile['sport'];
  combatDiscipline: 'boxing' | 'mma' | 'general_combat' | 'unknown';
  competitionLevel: AthleteProfile['competitionLevel'];
  fightStatus: 'amateur' | 'professional' | 'unknown';
  rounds: number | null;
  roundDurationSec: number | null;
  restDurationSec: number | null;
}

export interface AthleteGoalSnapshot {
  id: string;
  mode: 'build_phase' | 'fight_camp' | 'unknown';
  type: string;
  label: string;
  targetMetric: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  deadline: ISODateString | null;
  explanation: Explanation | null;
}

export interface NutritionPreferences {
  goal: 'maintain' | 'cut' | 'bulk' | 'unknown';
  dietaryNotes: string[];
  supplementNotes: string[];
}

export interface TrackingPreferences {
  bodyMass: boolean;
  readiness: boolean;
  nutrition: boolean;
  cycle: boolean;
}

export interface AthleteJourneyState {
  journeyId: string;
  athlete: AthleteProfile;
  initializedAt: ISODateTimeString | null;
  timelineStartDate: ISODateString | null;
  sportProfile: SportProfile;
  goals: AthleteGoalSnapshot[];
  phase: PhaseState;
  activeTrainingBlock: TrainingBlock | null;
  activeFightOpportunity: FightOpportunitySnapshot | null;
  trainingAvailability: TrainingAvailability | null;
  protectedWorkoutAnchors: ProtectedWorkoutAnchor[];
  bodyMassState: BodyMassState | null;
  weightClassPlan: WeightClassPlan | null;
  nutritionPreferences: NutritionPreferences;
  trackingPreferences: TrackingPreferences;
  limitationNotes: string[];
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
  sportProfile?: SportProfile;
  goals?: AthleteGoalSnapshot[];
  phase?: PhaseState;
  activeTrainingBlock?: TrainingBlock | null;
  activeFightOpportunity?: FightOpportunitySnapshot | null;
  trainingAvailability?: TrainingAvailability | null;
  protectedWorkoutAnchors?: ProtectedWorkoutAnchor[];
  bodyMassState?: BodyMassState | null;
  weightClassPlan?: WeightClassPlan | null;
  nutritionPreferences?: NutritionPreferences;
  trackingPreferences?: TrackingPreferences;
  limitationNotes?: string[];
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
    sportProfile: input.sportProfile ?? {
      primarySport: input.athlete.sport,
      combatDiscipline: input.athlete.sport === 'boxing' ? 'boxing' : 'unknown',
      competitionLevel: input.athlete.competitionLevel,
      fightStatus: input.athlete.competitionLevel === 'professional' ? 'professional' : 'unknown',
      rounds: null,
      roundDurationSec: null,
      restDurationSec: null,
    },
    goals: input.goals ?? [],
    phase: input.phase ?? createPhaseState({ current: 'unknown' }),
    activeTrainingBlock: input.activeTrainingBlock ?? null,
    activeFightOpportunity: input.activeFightOpportunity ?? null,
    trainingAvailability: input.trainingAvailability ?? null,
    protectedWorkoutAnchors: input.protectedWorkoutAnchors ?? [],
    bodyMassState: input.bodyMassState ?? null,
    weightClassPlan: input.weightClassPlan ?? null,
    nutritionPreferences: input.nutritionPreferences ?? {
      goal: 'unknown',
      dietaryNotes: [],
      supplementNotes: [],
    },
    trackingPreferences: input.trackingPreferences ?? {
      bodyMass: false,
      readiness: false,
      nutrition: false,
      cycle: false,
    },
    limitationNotes: input.limitationNotes ?? [],
    riskFlags: input.riskFlags ?? [],
    events: input.events ?? [],
    missingFields: input.missingFields ?? [],
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
  };
}
