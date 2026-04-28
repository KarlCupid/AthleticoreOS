import type { AthleteProfile } from './athlete.ts';
import type { BodyMassState, WeightClassPlan } from './bodyMass.ts';
import type { AthleteJourneyState } from './journey.ts';
import { createAthleteJourneyState } from './journey.ts';
import type { NutritionTarget, SessionFuelingDirective } from './nutrition.ts';
import type { PhaseState } from './phase.ts';
import { createPhaseState } from './phase.ts';
import type { Explanation } from './explanation.ts';
import type { RiskFlag } from './risk.ts';
import type { ConfidenceValue, ISODateString, ISODateTimeString, UnknownField } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { ReadinessState, TrackingEntry } from './tracking.ts';
import { createUnknownReadinessState } from './tracking.ts';
import type { ComposedSession, TrainingBlock } from './training.ts';

export const PERFORMANCE_STATE_SCHEMA_VERSION = 'performance-state-v1';

export interface PerformanceState {
  schemaVersion: typeof PERFORMANCE_STATE_SCHEMA_VERSION;
  athlete: AthleteProfile;
  journey: AthleteJourneyState;
  asOfDate: ISODateString | null;
  generatedAt: ISODateTimeString | null;
  phase: PhaseState;
  activeTrainingBlock: TrainingBlock | null;
  composedSessions: ComposedSession[];
  nutritionTargets: NutritionTarget[];
  sessionFuelingDirectives: SessionFuelingDirective[];
  bodyMass: BodyMassState | null;
  weightClassPlan: WeightClassPlan | null;
  trackingEntries: TrackingEntry[];
  readiness: ReadinessState;
  riskFlags: RiskFlag[];
  explanations: Explanation[];
  unknowns: UnknownField[];
  confidence: ConfidenceValue;
}

export function createPerformanceState(input: {
  athlete: AthleteProfile;
  journey?: AthleteJourneyState;
  asOfDate?: ISODateString | null;
  generatedAt?: ISODateTimeString | null;
  phase?: PhaseState;
  activeTrainingBlock?: TrainingBlock | null;
  composedSessions?: ComposedSession[];
  nutritionTargets?: NutritionTarget[];
  sessionFuelingDirectives?: SessionFuelingDirective[];
  bodyMass?: BodyMassState | null;
  weightClassPlan?: WeightClassPlan | null;
  trackingEntries?: TrackingEntry[];
  readiness?: ReadinessState;
  riskFlags?: RiskFlag[];
  explanations?: Explanation[];
  unknowns?: UnknownField[];
  confidence?: ConfidenceValue;
}): PerformanceState {
  const phase = input.phase ?? createPhaseState({ current: 'unknown' });
  const journey =
    input.journey ??
    createAthleteJourneyState({
      journeyId: `${input.athlete.athleteId}:journey`,
      athlete: input.athlete,
      phase,
    });

  return {
    schemaVersion: PERFORMANCE_STATE_SCHEMA_VERSION,
    athlete: input.athlete,
    journey,
    asOfDate: input.asOfDate ?? null,
    generatedAt: input.generatedAt ?? null,
    phase,
    activeTrainingBlock: input.activeTrainingBlock ?? journey.activeTrainingBlock,
    composedSessions: input.composedSessions ?? [],
    nutritionTargets: input.nutritionTargets ?? [],
    sessionFuelingDirectives: input.sessionFuelingDirectives ?? [],
    bodyMass: input.bodyMass ?? journey.bodyMassState,
    weightClassPlan: input.weightClassPlan ?? journey.weightClassPlan,
    trackingEntries: input.trackingEntries ?? [],
    readiness: input.readiness ?? createUnknownReadinessState(input.asOfDate ?? null),
    riskFlags: input.riskFlags ?? journey.riskFlags,
    explanations: input.explanations ?? [],
    unknowns: input.unknowns ?? [],
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
  };
}
