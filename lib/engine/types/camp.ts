import type { FitnessLevel, WorkoutFocus } from './foundational.ts';
import type { ConditioningType, RoadWorkType } from './training.ts';

export type CampPhase = 'base' | 'build' | 'peak' | 'taper';

export interface CampPhaseDates {
  start: string;
  end: string;
}

export interface CampConfig {
  id: string;
  user_id: string;
  fightDate: string;
  campStartDate: string;
  totalWeeks: number;
  hasConcurrentCut: boolean;
  basePhaseDates: CampPhaseDates;
  buildPhaseDates: CampPhaseDates;
  peakPhaseDates: CampPhaseDates;
  taperPhaseDates: CampPhaseDates;
  status: 'active' | 'completed' | 'abandoned';
  weighInTiming?: 'same_day' | 'next_day' | null;
  targetWeight?: number | null;
  roundCount?: number | null;
  roundDurationSec?: number | null;
  restDurationSec?: number | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  weightCutState?: 'none' | 'monitoring' | 'driving' | null;
}

export interface CampWeekProfile {
  weekNumber: number;
  campPhase: CampPhase;
  volumeMultiplier: number;
  intensityCap: number;
  mandatorySparringDays: number;
  mandatoryRestDays: number;
  roadWorkFocus: RoadWorkType;
  conditioningFocus: ConditioningType;
  scFocus: WorkoutFocus;
}

export interface CampPlanInput {
  fightDate: string;
  campStartDate: string;
  fitnessLevel: FitnessLevel;
  hasConcurrentCut: boolean;
  userId: string;
}

export interface CampTrainingModifiers {
  volumeMultiplier: number;
  intensityCap: number;
  mandatoryRestDaysPerWeek: number;
  sparringDaysPerWeek: number;
  roadWorkSessionsPerWeek: number;
  conditioningSessionsPerWeek: number;
  scSessionsPerWeek: number;
}

export interface CampPlanRow {
  id: string;
  user_id: string;
  fight_date: string;
  camp_start_date: string;
  total_weeks: number;
  has_concurrent_cut: boolean;
  base_phase_start: string;
  base_phase_end: string;
  build_phase_start: string;
  build_phase_end: string;
  peak_phase_start: string;
  peak_phase_end: string;
  taper_phase_start: string;
  taper_phase_end: string;
  status: 'active' | 'completed' | 'abandoned';
  weigh_in_timing?: 'same_day' | 'next_day' | null;
  target_weight?: number | null;
  round_count?: number | null;
  round_duration_sec?: number | null;
  rest_duration_sec?: number | null;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  weight_cut_state?: 'none' | 'monitoring' | 'driving' | null;
  created_at: string;
  updated_at: string;
}
