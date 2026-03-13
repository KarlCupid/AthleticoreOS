import { supabase } from '../supabase';
import type {
  BuildPhaseGoalRow,
  BuildPhaseSetupInput,
  BuildPhaseGoalType,
  ObjectiveSecondaryConstraint,
} from '../engine/types';

function normalizeGoalType(value: unknown): BuildPhaseGoalType {
  switch (value) {
    case 'strength':
    case 'conditioning':
    case 'boxing_skill':
    case 'weight_class_prep':
      return value;
    default:
      return 'conditioning';
  }
}

function normalizeSecondaryConstraint(value: unknown): ObjectiveSecondaryConstraint | null {
  switch (value) {
    case 'protect_recovery':
    case 'weight_trajectory':
    case 'skill_frequency':
    case 'schedule_reliability':
    case 'injury_risk':
    case 'none':
      return value;
    default:
      return null;
  }
}

export function normalizeBuildPhaseGoal(row: BuildPhaseGoalRow | null): BuildPhaseGoalRow | null {
  if (!row) return null;
  return {
    ...row,
    goal_type: normalizeGoalType(row.goal_type),
    secondary_constraint: normalizeSecondaryConstraint(row.secondary_constraint),
  };
}

export async function getActiveBuildPhaseGoal(userId: string): Promise<BuildPhaseGoalRow | null> {
  const { data, error } = await supabase
    .from('build_phase_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return normalizeBuildPhaseGoal((data as BuildPhaseGoalRow | null) ?? null);
}

export async function setupBuildPhaseGoal(userId: string, input: BuildPhaseSetupInput): Promise<BuildPhaseGoalRow> {
  const { error: campError } = await supabase
    .from('fight_camps')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('id');

  if (campError) {
    throw campError;
  }

  const { data: activeGoal } = await supabase
    .from('build_phase_goals')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const payload = {
    user_id: userId,
    goal_type: input.goalType,
    goal_label: input.goalLabel ?? null,
    goal_statement: input.goalStatement,
    primary_outcome: input.primaryOutcome ?? input.goalStatement,
    secondary_constraint: input.secondaryConstraint ?? 'protect_recovery',
    success_window: input.successWindow ?? null,
    target_metric: input.targetMetric,
    target_value: input.targetValue ?? null,
    target_unit: input.targetUnit ?? null,
    target_date: input.targetDate ?? null,
    target_horizon_weeks: input.targetHorizonWeeks ?? null,
    status: 'active',
    updated_at: new Date().toISOString(),
    ...(activeGoal?.id ? { id: activeGoal.id } : {}),
  };

  const { data, error } = await supabase
    .from('build_phase_goals')
    .upsert(payload)
    .select('*')
    .single();

  if (error) throw error;

  const { error: profileError } = await supabase
    .from('athlete_profiles')
    .update({
      athlete_goal_mode: 'build_phase',
      performance_goal_type: input.goalType,
      fight_date: null,
      planning_setup_version: 1,
      phase: input.goalType === 'weight_class_prep' ? 'pre-camp' : 'off-season',
    })
    .eq('user_id', userId);

  if (profileError) throw profileError;

  return normalizeBuildPhaseGoal(data as BuildPhaseGoalRow)!;
}

export async function completeActiveBuildPhaseGoal(userId: string): Promise<void> {
  const { error } = await supabase
    .from('build_phase_goals')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;
}
