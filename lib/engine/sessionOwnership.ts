import type { ScheduledActivityRow, WeeklyPlanEntryRow } from './types';

const GUIDED_ENGINE_ACTIVITY_TYPES = ['sc', 'conditioning'] as const;

type GuidedEngineActivityType = (typeof GUIDED_ENGINE_ACTIVITY_TYPES)[number];

export function isGuidedEngineActivityType(
  activityType: string | null | undefined,
): activityType is GuidedEngineActivityType {
  return GUIDED_ENGINE_ACTIVITY_TYPES.includes(activityType as GuidedEngineActivityType);
}

export function hasGuidedEnginePrescription(
  entry: Pick<WeeklyPlanEntryRow, 'prescription_snapshot' | 'daily_mission_snapshot'> | null | undefined,
): boolean {
  if (!entry) return false;

  const missionPrescription = entry.daily_mission_snapshot?.trainingDirective?.prescription ?? null;
  const planPrescription = entry.prescription_snapshot ?? null;
  const prescription = missionPrescription ?? planPrescription;

  return Boolean(prescription?.exercises?.length);
}

export function isActiveGuidedEnginePlanEntry(entry: WeeklyPlanEntryRow): boolean {
  return (
    entry.status === 'planned'
    && isGuidedEngineActivityType(entry.session_type)
    && hasGuidedEnginePrescription(entry)
  );
}

export function isGuidedEngineScheduledActivity(activity: ScheduledActivityRow): boolean {
  return isGuidedEngineActivityType(activity.activity_type);
}
