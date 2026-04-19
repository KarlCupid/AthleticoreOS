import type {
  ScheduledActivityRow,
  WeeklyPlanEntryRow,
  WorkoutFocus,
  WorkoutPrescriptionV2,
} from './types.ts';

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

export function toScheduledActivityPayload(
  userId: string,
  entry: Pick<
    WeeklyPlanEntryRow,
    | 'id'
    | 'date'
    | 'session_type'
    | 'focus'
    | 'estimated_duration_min'
    | 'target_intensity'
    | 'prescription_snapshot'
    | 'engine_notes'
    | 'status'
  >,
  options?: {
    includeWeeklyPlanEntryId?: boolean;
  },
): Record<string, unknown> {
  const activityType = isGuidedEngineActivityType(entry.session_type)
    ? classifyGuidedSessionType({
        sessionType: entry.session_type,
        focus: entry.focus,
        prescription: entry.prescription_snapshot,
      })
    : entry.session_type;
  const payload: Record<string, unknown> = {
    user_id: userId,
    date: entry.date,
    activity_type: activityType,
    expected_intensity: entry.target_intensity ?? 5,
    estimated_duration_min: entry.estimated_duration_min,
    engine_recommendation: entry.engine_notes,
    custom_label: entry.focus ? entry.focus.replace(/_/g, ' ') : null,
    source: 'engine',
    athlete_locked: false,
    session_kind: activityType,
    intended_intensity: entry.target_intensity ?? null,
    recommendation_reason: entry.engine_notes,
    recommendation_severity: 'recommended',
    recommendation_affected_subsystem: 'schedule',
    recommendation_change: entry.focus ? `Focus on ${entry.focus.replace(/_/g, ' ')}` : 'Follow planned session',
    recommendation_education: 'This session is recommended based on your weekly context, readiness, and camp goals.',
    recommendation_status: 'pending',
    status: entry.status === 'planned' ? 'scheduled' : entry.status === 'rescheduled' ? 'scheduled' : entry.status,
  };

  if (options?.includeWeeklyPlanEntryId ?? true) {
    payload.weekly_plan_entry_id = entry.id ?? null;
  }

  return payload;
}
