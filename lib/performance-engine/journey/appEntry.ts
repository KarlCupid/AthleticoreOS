export type JourneyAppEntryStatus = 'needs_onboarding' | 'needs_training_setup' | 'ready';

export interface JourneyAppEntryInput {
  hasProfile: boolean;
  planningSetupVersion: number;
  requiredPlanningSetupVersion: number;
  hasTrainingAvailability: boolean;
  hasActiveObjective: boolean;
}

export function resolveJourneyAppEntryStatus(input: JourneyAppEntryInput): JourneyAppEntryStatus {
  if (!input.hasProfile) {
    return 'needs_onboarding';
  }

  if (
    input.planningSetupVersion < input.requiredPlanningSetupVersion ||
    !input.hasTrainingAvailability ||
    !input.hasActiveObjective
  ) {
    return 'needs_training_setup';
  }

  return 'ready';
}
