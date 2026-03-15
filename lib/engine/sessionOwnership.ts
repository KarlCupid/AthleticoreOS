import type {
  ScheduledActivityRow,
  WeeklyPlanEntryRow,
  WorkoutFocus,
  WorkoutPrescriptionV2,
} from './types';

const GUIDED_ENGINE_ACTIVITY_TYPES = ['sc', 'conditioning'] as const;

type GuidedEngineActivityType = (typeof GUIDED_ENGINE_ACTIVITY_TYPES)[number];

export function isGuidedEngineActivityType(
  activityType: string | null | undefined,
): activityType is GuidedEngineActivityType {
  return GUIDED_ENGINE_ACTIVITY_TYPES.includes(activityType as GuidedEngineActivityType);
}

export function classifyGuidedSessionType(input: {
  sessionType?: string | null;
  focus?: WorkoutFocus | null;
  prescription?: Pick<WorkoutPrescriptionV2, 'workoutType'> | null;
}): GuidedEngineActivityType {
  if (input.sessionType === 'conditioning') return 'conditioning';
  if (input.prescription?.workoutType === 'conditioning') return 'conditioning';
  if (input.focus === 'conditioning') return 'conditioning';
  return 'sc';
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
    && isGuidedEngineActivityType(classifyGuidedSessionType({
      sessionType: entry.session_type,
      focus: entry.focus,
      prescription: entry.prescription_snapshot,
    }))
    && hasGuidedEnginePrescription(entry)
  );
}

export function isGuidedEngineScheduledActivity(activity: ScheduledActivityRow): boolean {
  return isGuidedEngineActivityType(activity.activity_type);
}
