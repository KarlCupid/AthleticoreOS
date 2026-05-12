import {
  resolveJourneyAppEntryStatus,
  type JourneyAppEntryStatus,
  type AthleteJourneyState,
  type PerformanceState,
} from '../performance-engine';
import { getAthleteProfile } from './athleteContextService';

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

  const status = resolveJourneyAppEntryStatus({
    hasProfile: true,
    planningSetupVersion: profile.planning_setup_version ?? 0,
    requiredPlanningSetupVersion: 0,
    hasTrainingAvailability: false,
    hasActiveObjective: false,
  });

  return {
    status,
    hasProfile: true,
    needsTrainingSetup: false,
    journey: null,
    performanceState: null,
  };
}
