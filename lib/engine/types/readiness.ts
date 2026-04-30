import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  FitnessLevel,
  Phase,
  FightStatus,
  CyclePhase,
  ReadinessState,
} from './foundational.ts';
import type { LoadMetrics } from './misc.ts';

export interface ACWRInput {
  userId: string;
  supabaseClient: SupabaseClient;
  asOfDate?: string;
  fitnessLevel?: FitnessLevel | null;
  phase?: Phase | null;
  hasActiveWeightClassPlan?: boolean;
  cycleDay?: number | null;
}

export interface ACWRThresholds {
  caution: number;
  redline: number;
  detrained: number;
  confidence: 'low' | 'medium' | 'high';
  personalizationFactors: string[];
  source: 'ewma_personalized';
}

export interface ACWRResult {
  ratio: number;
  acute: number;
  chronic: number;
  acuteEWMA: number;
  chronicEWMA: number;
  status: 'safe' | 'caution' | 'redline';
  message: string;
  daysOfData: number;
  thresholds: ACWRThresholds;
  loadMetrics: LoadMetrics;
  migrationDebug?: {
    legacyAcute?: number;
    legacyChronic?: number;
    legacyRatio?: number;
  };
}

export interface HydrationInput {
  phase: Phase;
  fightStatus: FightStatus;
  currentWeightLbs: number;
  targetWeightLbs: number;
  weeklyVelocityLbs?: number | undefined;
}

export interface HydrationResult {
  dailyWaterOz: number;
  waterLoadOz: number | null;
  shedCapPercent: number;
  shedCapLbs: number;
  message: string;
}

export type ReadinessDimension = 'neural' | 'structural' | 'metabolic';
export type FlagLevel = 'none' | 'yellow' | 'red';
export type FatigueTrend = 'dropping' | 'stable' | 'rebounding';
export type PerformanceAnchorStatus = 'below_baseline' | 'normal' | 'above_baseline' | 'unknown';
export type ReadinessDataSufficiency = 'insufficient' | 'limited' | 'established';
export type StimulusType =
  | 'max_velocity'
  | 'plyometric'
  | 'high_impact'
  | 'heavy_strength'
  | 'controlled_strength'
  | 'machine_strength'
  | 'tempo_conditioning'
  | 'aerobic_conditioning'
  | 'glycolytic_conditioning'
  | 'hard_sparring'
  | 'technical_skill'
  | 'recovery';

export interface ReadinessFlag {
  code: string;
  level: FlagLevel;
  dimension: ReadinessDimension | 'global';
  reason: string;
}

export interface PerformanceAnchor {
  key: 'activation_rpe' | 'cognitive_score' | 'warmup_feel';
  label: string;
  dimension: ReadinessDimension;
  status: PerformanceAnchorStatus;
  value: number | null;
  baseline: number | null;
  detail: string;
}

export interface StimulusConstraintSet {
  explosiveBudget: number;
  impactBudget: number;
  strengthBudget: number;
  aerobicBudget: number;
  volumeMultiplier: number;
  hardCaps: {
    intensityCap: number | null;
    allowImpact: boolean;
    allowHardSparring: boolean;
    maxConditioningRounds: number | null;
  };
  allowedStimuli: StimulusType[];
  blockedStimuli: StimulusType[];
}

export interface ReadinessProfile {
  neuralReadiness: number;
  structuralReadiness: number;
  metabolicReadiness: number;
  overallReadiness: number;
  trend: FatigueTrend;
  dataConfidence: 'low' | 'medium' | 'high';
  dataSufficiency: ReadinessDataSufficiency;
  cardioModifier: number;
  proteinModifier: number;
  flags: ReadinessFlag[];
  performanceAnchors: PerformanceAnchor[];
  readinessState: ReadinessState;
}

export interface ReadinessProfileInput {
  sleepQuality: number | null;
  subjectiveReadiness: number | null;
  energyLevel?: number | null;
  fuelHydrationStatus?: number | null;
  painLevel?: number | null;
  confidenceLevel?: number | null;
  stressLevel?: number | null;
  sorenessLevel?: number | null;
  acwrRatio: number;
  loadMetrics?: LoadMetrics | null;
  externalHeartRateLoad?: number | null;
  activationRPE?: number | null;
  expectedActivationRPE?: number | null;
  baselineCognitiveScore?: number | null;
  latestCognitiveScore?: number | null;
  urineColor?: number | null;
  bodyTempF?: number | null;
  bodyMassIntensityCap?: number | null;
  recentSparringCount48h?: number;
  recentSparringDecayLoad5d?: number;
  recentHighImpactCount48h?: number;
  recentHeavyStrengthCount48h?: number;
  goalMode?: 'build_phase' | 'fight_camp';
  phase?: Phase | null;
  daysOut?: number | null;
  hasActiveWeightClassPlan?: boolean;
  hasHardSparringScheduled?: boolean;
  hasTechnicalSessionScheduled?: boolean;
  readinessHistory?: number[];
  priorDayReadinessState?: ReadinessState | null;
  cycleDay?: number | null;
  energyDeficitPercent?: number | null;
}

export interface ConstraintContext {
  phase?: Phase | null | undefined;
  goalMode?: 'build_phase' | 'fight_camp' | undefined;
  daysOut?: number | null | undefined;
  isSparringDay?: boolean | undefined;
  hasTechnicalSession?: boolean | undefined;
  isDeloadWeek?: boolean | undefined;
  trainingIntensityCap?: number | null | undefined;
}

export interface MEDExposureStatus {
  targetTouches: number;
  scheduledTouches: number;
  remainingTouches: number;
  status: 'met' | 'pending' | 'at_risk' | 'missed';
}

export interface MEDStatus {
  power: MEDExposureStatus;
  strength: MEDExposureStatus;
  conditioning: MEDExposureStatus;
  overall: 'on_track' | 'at_risk' | 'missed';
  summary: string;
}

export interface GlobalReadinessInput {
  sleep: number;
  readiness: number;
  acwr: number;
  weightPenalty?: number;
}

export interface BiologyInput {
  cycleDay: number;
  energyDeficitPercent?: number | null;
}

export interface BiologyResult {
  cyclePhase: CyclePhase;
  cardioModifier: number;
  proteinModifier: number;
  message: string;
}

export interface FitnessAssessmentInput {
  trainingYears: number;
  weeklySessionCount: number;
  maxPushUpsIn2Min: number;
  mile5RunTimeSeconds: number | null;
  sportExperienceYears: number;
  hasSignificantInjuries: boolean;
  trainingBackground: 'none' | 'recreational' | 'competitive' | 'professional';
}

export interface FitnessAssessmentCategory {
  name: string;
  score: number;
  label: FitnessLevel;
  detail: string;
}

export interface FitnessAssessmentResult {
  level: FitnessLevel;
  compositeScore: number;
  confidence: 'low' | 'medium' | 'high';
  categories: FitnessAssessmentCategory[];
  summary: string;
  volumeMultiplier: number;
  intensityCap: number;
  recommendedRecoveryDaysPerWeek: number;
}

export interface FitnessProfileRow {
  id: string;
  user_id: string;
  level: FitnessLevel;
  composite_score: number;
  training_years: number;
  weekly_session_count: number;
  sport_experience_years: number;
  training_background: 'none' | 'recreational' | 'competitive' | 'professional';
  derived_from_history: boolean;
  last_updated: string;
  created_at: string;
}

export interface FitnessModifiers {
  volumeMultiplier: number;
  intensityCap: number;
  recoveryDayFrequency: number;
  roadWorkDistanceMultiplier: number;
  conditioningRoundsMultiplier: number;
  conditioning_rounds_multiplier?: number;
}
