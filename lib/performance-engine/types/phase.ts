import type { ConfidenceValue, ISODateString, ISODateTimeString } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';

export type AthleticorePhase =
  | 'unknown'
  | 'onboarding'
  | 'build'
  | 'camp'
  | 'short_notice_camp'
  | 'competition_week'
  | 'taper'
  | 'deload'
  | 'recovery'
  | 'maintenance'
  | 'body_recomposition'
  | 'weight_class_management'
  | 'transition';

export type PhaseTransitionReason =
  | 'journey_initialized'
  | 'baseline_to_build'
  | 'build_phase_started'
  | 'fight_opportunity_created'
  | 'fight_tentative'
  | 'fight_confirmed'
  | 'fight_rescheduled'
  | 'fight_canceled'
  | 'fight_delayed'
  | 'short_notice_fight'
  | 'competition_week_started'
  | 'taper_started'
  | 'deload_required'
  | 'recovery_started'
  | 'recovery_completed'
  | 'maintenance_started'
  | 'body_recomposition_started'
  | 'weight_class_management_started'
  | 'manual_correction'
  | 'unknown';

export interface PhaseTransition {
  from: AthleticorePhase;
  to: AthleticorePhase;
  transitionedAt: ISODateTimeString | null;
  reason: PhaseTransitionReason;
  explanation: Explanation | null;
}

export interface PhaseState {
  current: AthleticorePhase;
  previous: AthleticorePhase | null;
  activeSince: ISODateString | null;
  plannedUntil: ISODateString | null;
  transitionReason: PhaseTransitionReason;
  transitionHistory: PhaseTransition[];
  isRestart: false;
  confidence: ConfidenceValue;
  explanation: Explanation | null;
}

export function createPhaseState(input: {
  current: AthleticorePhase;
  previous?: AthleticorePhase | null;
  activeSince?: ISODateString | null;
  plannedUntil?: ISODateString | null;
  transitionReason?: PhaseTransitionReason;
  transitionHistory?: PhaseTransition[];
  confidence?: ConfidenceValue;
  explanation?: Explanation | null;
}): PhaseState {
  return {
    current: input.current,
    previous: input.previous ?? null,
    activeSince: input.activeSince ?? null,
    plannedUntil: input.plannedUntil ?? null,
    transitionReason: input.transitionReason ?? 'unknown',
    transitionHistory: input.transitionHistory ?? [],
    isRestart: false,
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
    explanation: input.explanation ?? null,
  };
}

export function createPhaseTransition(input: {
  from: AthleticorePhase;
  to: AthleticorePhase;
  transitionedAt?: ISODateTimeString | null;
  reason: PhaseTransitionReason;
  explanation?: Explanation | null;
}): PhaseTransition {
  return {
    from: input.from,
    to: input.to,
    transitionedAt: input.transitionedAt ?? null,
    reason: input.reason,
    explanation: input.explanation ?? null,
  };
}
