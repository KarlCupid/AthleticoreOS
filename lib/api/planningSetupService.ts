import { getAthleteContext } from './athleteContextService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getWeeklyPlanConfig } from './weeklyPlanService';

export interface PlanningSetupStatus {
  planningSetupVersion: number;
  goalMode: 'fight_camp' | 'build_phase';
  hasAvailabilityWindows: boolean;
  hasActiveModeRecord: boolean;
  isComplete: boolean;
}

export async function getPlanningSetupStatus(userId: string): Promise<PlanningSetupStatus> {
  const [athleteContext, config, activeCamp, activeBuildGoal] = await Promise.all([
    getAthleteContext(userId),
    getWeeklyPlanConfig(userId),
    getActiveFightCamp(userId),
    getActiveBuildPhaseGoal(userId),
  ]);

  const hasAvailabilityWindows = (config?.availability_windows?.length ?? 0) > 0;
  const hasActiveModeRecord = athleteContext.goalMode === 'fight_camp'
    ? Boolean(activeCamp)
    : Boolean(activeBuildGoal);

  const planningSetupVersion = athleteContext.planningSetupVersion ?? 0;
  const isComplete = planningSetupVersion >= 1 && hasAvailabilityWindows && hasActiveModeRecord;

  return {
    planningSetupVersion,
    goalMode: athleteContext.goalMode,
    hasAvailabilityWindows,
    hasActiveModeRecord,
    isComplete,
  };
}
