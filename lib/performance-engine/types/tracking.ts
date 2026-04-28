import type {
  ConfidenceValue,
  ISODateString,
  ISODateTimeString,
  UnknownField,
} from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';
import type { RiskFlag } from './risk.ts';

export type TrackingEntryType =
  | 'body_mass'
  | 'sleep_duration'
  | 'sleep_quality'
  | 'soreness'
  | 'fatigue'
  | 'mood'
  | 'stress'
  | 'readiness'
  | 'session_rpe'
  | 'pain'
  | 'injury'
  | 'illness'
  | 'nutrition_adherence'
  | 'hydration'
  | 'resting_hr'
  | 'hrv'
  | 'performance_marker'
  | 'menstrual_cycle'
  | 'coach_note';

export type TrackingEntrySource =
  | 'user_reported'
  | 'device'
  | 'coach'
  | 'system_inferred'
  | 'imported'
  | 'manual_admin';

export type TrackingEntryValue = number | string | boolean | null;

export interface TrackingEntry {
  id: string;
  athleteId: string;
  timestamp: ISODateTimeString | null;
  timezone: string;
  type: TrackingEntryType;
  source: TrackingEntrySource;
  value: TrackingEntryValue;
  unit: string | null;
  confidence: ConfidenceValue;
  context: Record<string, unknown>;
  notes: string | null;
}

export type ReadinessBand = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';

export type ReadinessTrendFlag =
  | 'missing_sleep_data'
  | 'missing_soreness_data'
  | 'subjective_concern'
  | 'wearable_conflict_subjective_concern'
  | 'post_sparring_soreness'
  | 'low_nutrition_support'
  | 'rapid_body_mass_decline'
  | 'injury_reported'
  | 'illness_reported'
  | 'high_training_load'
  | 'hydration_concern'
  | 'menstrual_cycle_context'
  | 'coach_concern';

export type TrainingAdjustmentType =
  | 'none'
  | 'reduce_volume'
  | 'reduce_intensity'
  | 'avoid_harmful_merge'
  | 'preserve_recovery_day'
  | 'move_heavy_session'
  | 'replace_with_mobility'
  | 'recommend_professional_review';

export interface ReadinessTrainingAdjustment {
  type: TrainingAdjustmentType;
  intensityCap: number | null;
  volumeMultiplier: number | null;
  avoidHarmfulMerge: boolean;
  preserveRecoveryDay: boolean;
  moveHeavySession: boolean;
  replaceWithMobility: boolean;
  professionalReviewRecommended: boolean;
  reasons: string[];
}

export type NutritionAdjustmentType =
  | 'none'
  | 'increase_fueling'
  | 'increase_recovery_nutrition'
  | 'hold_weight_loss_pressure'
  | 'improve_tracking_confidence'
  | 'recommend_professional_review';

export interface ReadinessNutritionAdjustment {
  type: NutritionAdjustmentType;
  carbohydrateSupport: 'normal' | 'increase' | 'unknown';
  proteinSupport: 'normal' | 'increase' | 'unknown';
  hydrationSupport: 'normal' | 'increase' | 'unknown';
  holdWeightLossPressure: boolean;
  professionalReviewRecommended: boolean;
  reasons: string[];
}

export interface TrackingAnomaly {
  id: string;
  type: TrackingEntryType;
  severity: 'info' | 'low' | 'moderate' | 'high';
  message: string;
  entryIds: string[];
  explanation: Explanation | null;
}

export interface ReadinessState {
  date: ISODateString | null;
  overallReadiness: number | null;
  readinessBand: ReadinessBand;
  confidence: ConfidenceValue;
  subjectiveScore: number | null;
  sleepScore: number | null;
  sorenessScore: number | null;
  stressScore: number | null;
  nutritionSupportScore: number | null;
  recoveryScore: number | null;
  injuryPenalty: number;
  illnessPenalty: number;
  trendFlags: ReadinessTrendFlag[];
  missingData: UnknownField[];
  explanation: Explanation | null;
  recommendedTrainingAdjustment: ReadinessTrainingAdjustment;
  recommendedNutritionAdjustment: ReadinessNutritionAdjustment;
  riskFlags: RiskFlag[];
  anomalies: TrackingAnomaly[];
}

export function createNoTrainingAdjustment(reasons: string[] = []): ReadinessTrainingAdjustment {
  return {
    type: 'none',
    intensityCap: null,
    volumeMultiplier: null,
    avoidHarmfulMerge: false,
    preserveRecoveryDay: false,
    moveHeavySession: false,
    replaceWithMobility: false,
    professionalReviewRecommended: false,
    reasons,
  };
}

export function createNoNutritionAdjustment(reasons: string[] = []): ReadinessNutritionAdjustment {
  return {
    type: 'none',
    carbohydrateSupport: 'normal',
    proteinSupport: 'normal',
    hydrationSupport: 'normal',
    holdWeightLossPressure: false,
    professionalReviewRecommended: false,
    reasons,
  };
}

export function createUnknownReadinessState(date: ISODateString | null = null): ReadinessState {
  return {
    date,
    overallReadiness: null,
    readinessBand: 'unknown',
    confidence: UNKNOWN_CONFIDENCE,
    subjectiveScore: null,
    sleepScore: null,
    sorenessScore: null,
    stressScore: null,
    nutritionSupportScore: null,
    recoveryScore: null,
    injuryPenalty: 0,
    illnessPenalty: 0,
    trendFlags: ['missing_sleep_data', 'missing_soreness_data'],
    missingData: [{ field: 'readiness_check_in', reason: 'not_collected' }],
    explanation: null,
    recommendedTrainingAdjustment: createNoTrainingAdjustment([
      'Readiness is unknown because the athlete has not logged enough data.',
    ]),
    recommendedNutritionAdjustment: createNoNutritionAdjustment([
      'Nutrition readiness impact is unknown until check-in and food-adherence data are available.',
    ]),
    riskFlags: [],
    anomalies: [],
  };
}
