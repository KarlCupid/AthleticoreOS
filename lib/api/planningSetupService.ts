import { supabase } from '../supabase';
import { getAthleteContext } from './athleteContextService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { withEngineInvalidation } from './engineInvalidation';
import { getActiveFightCamp } from './fightCampService';
import { isPlanningSetupComplete } from './planningSetupLogic';
import { getWeeklyPlanConfig } from './weeklyPlanService';

export { isPlanningSetupComplete } from './planningSetupLogic';

export interface PlanningSetupStatus {
  planningSetupVersion: number;
  goalMode: 'fight_camp' | 'build_phase';
  hasAvailabilityWindows: boolean;
  hasActiveModeRecord: boolean;
  hasLegacyUsage: boolean;
  isComplete: boolean;
}

async function hasLegacyUsageData(userId: string): Promise<boolean> {
  const [checkinRes, ledgerRes, trainingRes] = await Promise.all([
    supabase.from('daily_checkins').select('user_id').eq('user_id', userId).limit(1),
    supabase.from('macro_ledger').select('user_id').eq('user_id', userId).limit(1),
    supabase.from('training_sessions').select('user_id').eq('user_id', userId).limit(1),
  ]);

  return [checkinRes.data, ledgerRes.data, trainingRes.data].some((rows) => (rows?.length ?? 0) > 0);
}

export async function getPlanningSetupStatus(userId: string): Promise<PlanningSetupStatus> {
  const [athleteContext, config, activeCamp, activeBuildGoal, legacyUsage] = await Promise.all([
    getAthleteContext(userId),
    getWeeklyPlanConfig(userId),
    getActiveFightCamp(userId),
    getActiveBuildPhaseGoal(userId),
    hasLegacyUsageData(userId),
  ]);

  const hasAvailabilityWindows = (config?.availability_windows?.length ?? 0) > 0;
  const hasActiveModeRecord = athleteContext.goalMode === 'fight_camp'
    ? Boolean(activeCamp)
    : Boolean(activeBuildGoal);

  const planningSetupVersion = athleteContext.planningSetupVersion ?? 0;
  const isComplete = isPlanningSetupComplete({
    planningSetupVersion,
    hasAvailabilityWindows,
    hasActiveModeRecord,
  });

  return {
    planningSetupVersion,
    goalMode: athleteContext.goalMode,
    hasAvailabilityWindows,
    hasActiveModeRecord,
    hasLegacyUsage: legacyUsage,
    isComplete,
  };
}

function throwIfError(error: unknown): void {
  if (error) {
    throw error;
  }
}

/**
 * Dev/tester-only reset for programming state. Historical logs, nutrition,
 * check-ins, PRs, and exercise history are intentionally preserved.
 */
export async function resetTrainingProgrammingForTester(userId: string): Promise<void> {
  return withEngineInvalidation({ userId, reason: 'planning_setup_reset' }, async () => {
    const now = new Date().toISOString();

    const [
      weeklyPlanConfigDelete,
      weeklyPlanEntriesDelete,
      scheduledActivitiesDelete,
      recurringActivitiesDelete,
      buildGoalsUpdate,
      fightCampsUpdate,
      profileUpdate,
    ] = await Promise.all([
      supabase
        .from('weekly_plan_config')
        .delete()
        .eq('user_id', userId),
      supabase
        .from('weekly_plan_entries')
        .delete()
        .eq('user_id', userId)
        .neq('status', 'completed'),
      supabase
        .from('scheduled_activities')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'engine'),
      supabase
        .from('recurring_activities')
        .delete()
        .eq('user_id', userId),
      supabase
        .from('build_phase_goals')
        .update({ status: 'abandoned', updated_at: now })
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase
        .from('fight_camps')
        .update({ status: 'abandoned', updated_at: now })
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase
        .from('athlete_profiles')
        .update({
          athlete_goal_mode: 'build_phase',
          performance_goal_type: 'conditioning',
          planning_setup_version: 0,
          phase: 'off-season',
          active_weight_class_plan_id: null,
          fight_date: null,
        })
        .eq('user_id', userId),
    ]);

    [
      weeklyPlanConfigDelete.error,
      weeklyPlanEntriesDelete.error,
      scheduledActivitiesDelete.error,
      recurringActivitiesDelete.error,
      buildGoalsUpdate.error,
      fightCampsUpdate.error,
      profileUpdate.error,
    ].forEach(throwIfError);
  });
}
