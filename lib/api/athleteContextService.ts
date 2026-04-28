import { supabase } from '../supabase';
import type { ActivityLevel, FitnessLevel, NutritionGoal, Phase, AthleteGoalMode, PerformanceGoalType, TrainingAge } from '../engine/types';

export interface AthleteProfileRow {
  user_id: string;
  phase: string | null;
  fitness_level: string | null;
  active_weight_class_plan_id: string | null;
  base_weight: number | null;
  target_weight: number | null;
  fight_date: string | null;
  height_inches: number | null;
  age: number | null;
  biological_sex: 'male' | 'female' | null;
  activity_level:
    | 'sedentary'
    | 'light'
    | 'moderate'
    | 'high'
    | 'very_high'
    | 'very_active'
    | 'extra_active'
    | null;
  nutrition_goal: 'lose' | 'maintain' | 'gain' | 'cut' | 'bulk' | null;
  cycle_day: number | null;
  cycle_tracking: boolean | null;
  fight_status: 'amateur' | 'pro' | null;
  coach_protein_override: number | null;
  coach_carbs_override: number | null;
  coach_fat_override: number | null;
  coach_calories_override: number | null;
  athlete_goal_mode: string | null;
  performance_goal_type: PerformanceGoalType | null;
  planning_setup_version: number | null;
  first_run_guidance_status: 'pending' | 'completed' | null;
  first_run_guidance_intro_seen_at: string | null;
  training_age: TrainingAge | null;
}

const VALID_PHASES: readonly Phase[] = [
  'off-season',
  'pre-camp',
  'fight-camp',
  'camp-base',
  'camp-build',
  'camp-peak',
  'camp-taper',
];

const VALID_FITNESS_LEVELS: readonly FitnessLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'elite',
];

export const DEFAULT_PHASE: Phase = 'off-season';
export const DEFAULT_FITNESS_LEVEL: FitnessLevel = 'intermediate';

export function normalizePhase(value: unknown): Phase {
  return typeof value === 'string' && (VALID_PHASES as readonly string[]).includes(value)
    ? (value as Phase)
    : DEFAULT_PHASE;
}

export function normalizeFitnessLevel(value: unknown): FitnessLevel {
  return typeof value === 'string' && (VALID_FITNESS_LEVELS as readonly string[]).includes(value)
    ? (value as FitnessLevel)
    : DEFAULT_FITNESS_LEVEL;
}

export function normalizeTrainingAge(value: unknown, fitnessLevel?: FitnessLevel): TrainingAge {
  if (value === 'novice' || value === 'intermediate' || value === 'advanced') {
    return value;
  }
  if (fitnessLevel === 'beginner') return 'novice';
  if (fitnessLevel === 'elite' || fitnessLevel === 'advanced') return 'advanced';
  return 'intermediate';
}

export function normalizeGoalMode(value: unknown): AthleteGoalMode {
  return value === 'fight_camp' ? 'fight_camp' : 'build_phase';
}

export function normalizeActivityLevel(value: unknown): ActivityLevel {
  switch (value) {
    case 'sedentary':
    case 'light':
    case 'moderate':
    case 'very_active':
    case 'extra_active':
      return value;
    case 'high':
      return 'very_active';
    case 'very_high':
      return 'extra_active';
    default:
      return 'moderate';
  }
}

export function normalizeNutritionGoal(value: unknown): NutritionGoal {
  switch (value) {
    case 'maintain':
      return 'maintain';
    case 'cut':
    case 'lose':
      return 'cut';
    case 'bulk':
    case 'gain':
      return 'bulk';
    default:
      return 'maintain';
  }
}

export function normalizeCycleDay(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 28
    ? Number(value)
    : null;
}

export async function getActiveUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function getAthleteProfile(userId: string): Promise<AthleteProfileRow | null> {
  const { data, error } = await supabase
    .from('athlete_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  const row = data as AthleteProfileRow & { active_cut_plan_id?: string | null };
  return {
    ...row,
    active_weight_class_plan_id: row.active_weight_class_plan_id ?? row.active_cut_plan_id ?? null,
  };
}

export async function getAthleteContext(userId: string): Promise<{
  profile: AthleteProfileRow | null;
  phase: Phase;
  fitnessLevel: FitnessLevel;
  trainingAge: TrainingAge;
  hasActiveWeightClassPlan: boolean;
  goalMode: AthleteGoalMode;
  performanceGoalType: PerformanceGoalType;
  planningSetupVersion: number;
}> {
  const profile = await getAthleteProfile(userId);
  const fitnessLevel = normalizeFitnessLevel(profile?.fitness_level);

  return {
    profile,
    phase: normalizePhase(profile?.phase),
    fitnessLevel,
    trainingAge: normalizeTrainingAge(profile?.training_age, fitnessLevel),
    hasActiveWeightClassPlan: Boolean(profile?.active_weight_class_plan_id),
    goalMode: normalizeGoalMode(profile?.athlete_goal_mode),
    performanceGoalType: (profile?.performance_goal_type ?? 'conditioning') as PerformanceGoalType,
    planningSetupVersion: profile?.planning_setup_version ?? 0,
  };
}
