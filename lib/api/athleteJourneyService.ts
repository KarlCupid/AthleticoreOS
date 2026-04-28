import {
  initializeJourneyFromExistingData,
  resolveJourneyAppEntryStatus,
  type AthleteJourneyState,
  type JourneyAppEntryStatus,
  type PerformanceState,
} from '../performance-engine';
import { todayLocalDate } from '../utils/date';
import { getAthleteProfile } from './athleteContextService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { PLANNING_SETUP_VERSION } from './planningConstants';
import { getRecurringActivities } from './scheduleService';
import { getWeeklyPlanConfig } from './weeklyPlanService';

export interface AthleteJourneyAppEntryState {
  status: JourneyAppEntryStatus;
  hasProfile: boolean;
  needsTrainingSetup: boolean;
  journey: AthleteJourneyState | null;
  performanceState: PerformanceState | null;
}

export async function getAthleteJourneyAppEntryState(userId: string): Promise<AthleteJourneyAppEntryState> {
  const profile = await getAthleteProfile(userId);

  if (!profile) {
    return {
      status: 'needs_onboarding',
      hasProfile: false,
      needsTrainingSetup: false,
      journey: null,
      performanceState: null,
    };
  }

  const [config, activeCamp, activeBuildGoal, recurringActivities] = await Promise.all([
    getWeeklyPlanConfig(userId),
    getActiveFightCamp(userId),
    getActiveBuildPhaseGoal(userId),
    getRecurringActivities(userId),
  ]);

  const hasTrainingAvailability = Boolean(
    config?.availability_windows?.length || config?.available_days?.length,
  );
  const goalMode = profile.athlete_goal_mode === 'fight_camp' ? 'fight_camp' : 'build_phase';
  const hasActiveObjective = goalMode === 'fight_camp' ? Boolean(activeCamp) : Boolean(activeBuildGoal);
  const planningSetupVersion = profile.planning_setup_version ?? 0;
  const status = resolveJourneyAppEntryStatus({
    hasProfile: true,
    planningSetupVersion,
    requiredPlanningSetupVersion: PLANNING_SETUP_VERSION,
    hasTrainingAvailability,
    hasActiveObjective,
  });

  const initialized = initializeJourneyFromExistingData({
    userId,
    asOfDate: todayLocalDate(),
    generatedAt: new Date().toISOString(),
    profile,
    availability: config,
    recurringActivities,
    hasActiveBuildGoal: Boolean(activeBuildGoal),
    hasActiveFightCamp: Boolean(activeCamp),
  });

  return {
    status,
    hasProfile: true,
    needsTrainingSetup: status === 'needs_training_setup',
    journey: initialized.journey,
    performanceState: initialized.performanceState,
  };
}
