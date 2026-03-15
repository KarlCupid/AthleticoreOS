import { supabase } from '../supabase';
import { getAthleteContext } from './athleteContextService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getWeeklyPlanConfig } from './weeklyPlanService';

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
  const isComplete = (planningSetupVersion >= 1 && hasAvailabilityWindows && hasActiveModeRecord) || legacyUsage;

  return {
    planningSetupVersion,
    goalMode: athleteContext.goalMode,
    hasAvailabilityWindows,
    hasActiveModeRecord,
    hasLegacyUsage: legacyUsage,
    isComplete,
  };
}
