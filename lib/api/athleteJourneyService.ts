import {
  resolveJourneyAppEntryStatus,
  type JourneyAppEntryStatus,
  type AthleteJourneyState,
  type PerformanceState,
} from '../performance-engine';
import { supabase } from '../supabase';

export interface AthleteJourneyAppEntryState {
  status: JourneyAppEntryStatus;
  hasProfile: boolean;
  needsTrainingSetup: boolean;
  journey: AthleteJourneyState | null;
  performanceState: PerformanceState | null;
}

export function createReadyAthleteJourneyAppEntryState(input: {
  journey?: AthleteJourneyState | null;
  performanceState?: PerformanceState | null;
} = {}): AthleteJourneyAppEntryState {
  return {
    status: 'ready',
    hasProfile: true,
    needsTrainingSetup: false,
    journey: input.journey ?? null,
    performanceState: input.performanceState ?? null,
  };
}

export async function getAthleteJourneyAppEntryState(
  userId: string,
  options: { signal?: AbortSignal } = {},
): Promise<AthleteJourneyAppEntryState> {
  let profileQuery = supabase
    .from('athlete_profiles')
    .select('user_id, planning_setup_version')
    .eq('user_id', userId);

  if (options.signal) {
    profileQuery = profileQuery.abortSignal(options.signal);
  }

  const { data: profile, error } = await profileQuery.maybeSingle();

  if (error) {
    throw error;
  }

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

  if (status === 'ready') {
    return createReadyAthleteJourneyAppEntryState();
  }

  return {
    status,
    hasProfile: true,
    needsTrainingSetup: status === 'needs_training_setup',
    journey: null,
    performanceState: null,
  };
}
