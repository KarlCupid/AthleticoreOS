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

export type SessionSource = 'protected_anchor' | 'engine_generated' | 'manual' | 'coach' | 'imported';

export interface ProtectedWorkoutAnchor {
  id: string;
  label: string;
  sessionFamily: SessionFamily;
  dayOfWeek: number | null;
  startTime: string | null;
  expectedDurationMinutes: MeasurementRange<'minute'>;
  nonNegotiable: true;
  reason: string;
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
  date?: ISODateString | null;
  source?: SessionSource;
  protectedAnchor?: boolean;
  anchorId?: string | null;
  durationMinutes: MeasurementRange<'minute'>;
  intensityRpe: MeasurementRange<'rpe'>;
  startsAt?: ISODateTimeString | null;
  explanation?: Explanation | null;
  confidence?: ConfidenceValue;
}): ComposedSession {
  const protectedAnchor = input.protectedAnchor ?? input.source === 'protected_anchor';

  return {
    id: input.id,
    date: input.date ?? null,
    family: input.family,
    source: protectedAnchor ? 'protected_anchor' : input.source ?? 'engine_generated',
    protectedAnchor,
    anchorId: input.anchorId ?? null,
    title: input.title,
    durationMinutes: input.durationMinutes,
    intensityRpe: input.intensityRpe,
    startsAt: input.startsAt ?? null,
    explanation: input.explanation ?? null,
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
  };
}

export function isProtectedWorkout(session: Pick<ComposedSession, 'protectedAnchor' | 'source'>): boolean {
  return session.protectedAnchor || session.source === 'protected_anchor';
}
