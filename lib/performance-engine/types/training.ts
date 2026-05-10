import type { ConfidenceValue, ISODateString, ISODateTimeString, MeasurementRange } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';
import type { AthleticorePhase } from './phase.ts';

export type TrainingBlockStatus = 'planned' | 'active' | 'completed' | 'canceled';
export type TrainingBlockGoal =
  | 'general_build'
  | 'strength'
  | 'conditioning'
  | 'boxing_skill'
  | 'weight_class_prep'
  | 'fight_camp'
  | 'recovery';

export type SessionFamily =
  | 'boxing_skill'
  | 'sparring'
  | 'strength'
  | 'conditioning'
  | 'roadwork'
  | 'recovery'
  | 'rest'
  | 'assessment'
  | 'other';

export type SessionSource =
  | 'protected_anchor'
  | 'engine_generated'
  | 'manual'
  | 'coach'
  | 'imported'
  | 'user_locked'
  | 'external_calendar'
  | 'competition';

export type DirectSupportDemandClass = 'baseline' | 'low' | 'moderate' | 'high';

export type DirectSupportFuelPriority =
  | 'sparring'
  | 'boxing_practice'
  | 'strength_power'
  | 'power'
  | 'roadwork_aerobic'
  | 'roadwork_tempo'
  | 'conditioning_intervals'
  | 'durability'
  | 'mobility'
  | 'recovery'
  | 'double_session'
  | 'body_mass_protect';

export type DirectSupportDevelopmentDomain =
  | 'boxing_skill_support'
  | 'strength'
  | 'power'
  | 'speed_agility'
  | 'roadwork'
  | 'conditioning'
  | 'durability'
  | 'mobility'
  | 'recovery'
  | 'nutrition_fueling'
  | 'hydration'
  | 'weight_class_support';

export interface DirectSupportSessionMetadata {
  athleticDevelopmentDomain?: DirectSupportDevelopmentDomain | string | null;
  boxingSessionFamily?: string | null;
  boxingSessionRole?: string | null;
  supportDomainLabel?: string | null;
  expectedFuelPriority?: DirectSupportFuelPriority | string | null;
  expectedCarbDemandClass?: DirectSupportDemandClass | string | null;
  expectedRecoveryDemandClass?: DirectSupportDemandClass | string | null;
  expectedHydrationDemandClass?: DirectSupportDemandClass | string | null;
  sessionEnergyDemandScore?: number | null;
  sessionRecoveryDemandScore?: number | null;
  plannedIntensity?: string | null;
  protectedWorkoutModality?: string | null;
  sAndCRationale?: string | null;
  boxingRelevance?: string | null;
  athleticDevelopmentRationale?: string | null;
}

export interface ProtectedWorkoutAnchor {
  id: string;
  label: string;
  sessionFamily: SessionFamily;
  dayOfWeek: number | null;
  startTime: string | null;
  expectedDurationMinutes: MeasurementRange<'minute'>;
  nonNegotiable: true;
  reason: string;
  date?: ISODateString | null;
  source?: SessionSource;
  expectedIntensityRpe?: MeasurementRange<'rpe'> | null;
  canMerge?: boolean;
}

export interface TrainingAvailabilityWindow {
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
}

export interface TrainingAvailability {
  availableDays: number[];
  windows: TrainingAvailabilityWindow[];
  preferredSessionDurationMinutes: MeasurementRange<'minute'>;
  allowTwoADays: boolean;
  confidence: ConfidenceValue;
}

export interface ComposedSession {
  id: string;
  date: ISODateString | null;
  family: SessionFamily;
  source: SessionSource;
  protectedAnchor: boolean;
  anchorId: string | null;
  title: string;
  durationMinutes: MeasurementRange<'minute'>;
  intensityRpe: MeasurementRange<'rpe'>;
  startsAt: ISODateTimeString | null;
  mergeDecisionId?: string | null;
  stressScore?: number | null;
  tissueLoads?: string[];
  supportMetadata?: DirectSupportSessionMetadata | null;
  explanation: Explanation | null;
  confidence: ConfidenceValue;
}

export interface TrainingBlock {
  id: string;
  phase: AthleticorePhase;
  goal: TrainingBlockGoal;
  status: TrainingBlockStatus;
  startDate: ISODateString | null;
  endDate: ISODateString | null;
  protectedAnchors: ProtectedWorkoutAnchor[];
  sessions: ComposedSession[];
  explanation: Explanation | null;
  confidence: ConfidenceValue;
}

export function createComposedSession(input: {
  id: string;
  family: SessionFamily;
  title: string;
  date?: ISODateString | null | undefined;
  source?: SessionSource | undefined;
  protectedAnchor?: boolean | undefined;
  anchorId?: string | null | undefined;
  durationMinutes: MeasurementRange<'minute'>;
  intensityRpe: MeasurementRange<'rpe'>;
  startsAt?: ISODateTimeString | null | undefined;
  mergeDecisionId?: string | null | undefined;
  stressScore?: number | null | undefined;
  tissueLoads?: string[] | undefined;
  supportMetadata?: DirectSupportSessionMetadata | null | undefined;
  explanation?: Explanation | null | undefined;
  confidence?: ConfidenceValue | undefined;
}): ComposedSession {
  const protectedAnchor = input.protectedAnchor ?? input.source === 'protected_anchor';

  return {
    id: input.id,
    date: input.date ?? null,
    family: input.family,
    source: input.source ?? (protectedAnchor ? 'protected_anchor' : 'engine_generated'),
    protectedAnchor,
    anchorId: input.anchorId ?? null,
    title: input.title,
    durationMinutes: input.durationMinutes,
    intensityRpe: input.intensityRpe,
    startsAt: input.startsAt ?? null,
    mergeDecisionId: input.mergeDecisionId ?? null,
    stressScore: input.stressScore ?? null,
    tissueLoads: input.tissueLoads ?? [],
    supportMetadata: input.supportMetadata ?? null,
    explanation: input.explanation ?? null,
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
  };
}

export function isProtectedWorkout(session: Pick<ComposedSession, 'protectedAnchor' | 'source'>): boolean {
  return session.protectedAnchor || session.source === 'protected_anchor';
}
