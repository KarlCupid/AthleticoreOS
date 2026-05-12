export function isPlanningSetupComplete(input: {
  planningSetupVersion: number | null | undefined;
  hasAvailabilityWindows: boolean;
  hasActiveModeRecord: boolean;
}): boolean {
  return input.hasAvailabilityWindows && input.hasActiveModeRecord;
}
