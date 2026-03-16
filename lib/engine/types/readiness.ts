import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  FitnessLevel,
  Phase,
  FightStatus,
  CyclePhase,
} from './foundational.ts';
import type { LoadMetrics } from './misc.ts';

export interface ACWRInput {
  userId: string;
  supabaseClient: SupabaseClient;
  asOfDate?: string;
  fitnessLevel?: FitnessLevel | null;
  phase?: Phase | null;
  isOnActiveCut?: boolean;
}

export interface ACWRThresholds {
  caution: number;
  redline: number;
  confidence: 'low' | 'medium' | 'high';
  personalizationFactors: string[];
}

export interface ACWRResult {
  ratio: number;
  acute: number;
  chronic: number;
  status: 'safe' | 'caution' | 'redline';
  message: string;
  daysOfData: number;
  thresholds: ACWRThresholds;
  loadMetrics: LoadMetrics;
}

export interface HydrationInput {
  phase: Phase;
  fightStatus: FightStatus;
  currentWeightLbs: number;
  targetWeightLbs: number;
  weeklyVelocityLbs?: number;
}

export interface HydrationResult {
  dailyWaterOz: number;
  waterLoadOz: number | null;
  shedCapPercent: number;
  shedCapLbs: number;
  message: string;
}

export interface GlobalReadinessInput {
  sleep: number;
  readiness: number;
  acwr: number;
  weightPenalty?: number;
}

export interface BiologyInput {
  cycleDay: number;
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
  conditioning_rounds_multiplier?: number; // Added to match likely usage if missing
}
