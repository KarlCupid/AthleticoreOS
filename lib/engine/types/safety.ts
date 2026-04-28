import type { Phase, WeighInTiming } from './foundational.ts';

export const ENGINE_SAFETY_POLICY_VERSION = '2026-04-launch-safety-v1';

export type EngineSafetyWarningTier = 'info' | 'caution' | 'severe' | 'medical';

export type EngineSafetyWarningSource =
  | 'weight_class'
  | 'fight_week'
  | 'nutrition'
  | 'hydration'
  | 'load';

export interface EngineSafetyWarning {
  code: string;
  tier: EngineSafetyWarningTier;
  message: string;
  requiresAcknowledgement: boolean;
  persistent: boolean;
  allowProceed: true;
  policyVersion: string;
  source: EngineSafetyWarningSource;
}

export interface AthleteSafetyContext {
  age: number | null;
  sex: 'male' | 'female' | null;
  weighInTiming: WeighInTiming | null;
  competitionPhase: Phase | string | null;
  asOfDate: string;
  urineColor?: number | null;
  bodyTempF?: number | null;
  latestCognitiveScore?: number | null;
  baselineCognitiveScore?: number | null;
}
