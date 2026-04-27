import { PLANNING_SETUP_VERSION } from './planningConstants';

export function isPlanningSetupComplete(input: {
  planningSetupVersion: number | null | undefined;
  hasAvailabilityWindows: boolean;
  hasActiveModeRecord: boolean;
}): boolean {
  return (input.planningSetupVersion ?? 0) >= PLANNING_SETUP_VERSION
    && input.hasAvailabilityWindows
    && input.hasActiveModeRecord;
}
