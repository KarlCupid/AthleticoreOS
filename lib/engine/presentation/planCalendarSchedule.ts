import { getSessionFamilyLabel } from '../sessionLabels.ts';
import type {
  PlanEntryStatus,
  ScheduleStatus,
  ScheduledActivityRow,
  WeeklyPlanEntryRow,
} from '../types/schedule.ts';

export type PlanCalendarScheduleItemSource = 'linked' | 'weekly_plan_entry' | 'scheduled_activity';
export type PlanCalendarScheduleItemStatus = PlanEntryStatus | ScheduleStatus;

export interface PlanCalendarScheduleItem {
  id: string;
  source: PlanCalendarScheduleItemSource;
  date: string;
  sortKey: string;
  label: string;
  dotType: string;
  status: PlanCalendarScheduleItemStatus;
  statusLabel: string;
  startTime: string | null;
  durationMin: number;
  intensity: number | null;
  weeklyPlanEntryId: string | null;
  scheduledActivityId: string | null;
  recurringActivityId: string | null;
  sessionType: string | null;
  activityType: string | null;
  protectedAnchor: boolean;
  generatedWorkout: boolean;
}

export interface PlanCalendarItemMetrics {
  scheduledDays: number;
  plannedMinutes: number;
  protectedAnchors: number;
  totalItems: number;
}

function titleize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelForEntry(entry: WeeklyPlanEntryRow): string {
  return getSessionFamilyLabel({
    sessionType: entry.session_type,
    focus: entry.focus,
    sessionFamily: entry.session_family ?? null,
    scSessionFamily: entry.sc_session_family ?? null,
    prescription: entry.prescription_snapshot,
  });
}

function labelForActivity(activity: ScheduledActivityRow): string {
  return activity.custom_label ? activity.custom_label : titleize(activity.activity_type);
}

function isProtectedEntry(entry: WeeklyPlanEntryRow): boolean {
  return entry.placement_source === 'locked'
    || entry.session_type === 'boxing_practice'
    || entry.session_type === 'sparring'
    || entry.session_family === 'boxing_skill'
    || entry.session_family === 'sparring';
}

function isProtectedActivity(activity: ScheduledActivityRow): boolean {
  return Boolean(activity.athlete_locked)
    || activity.constraint_tier === 'mandatory'
    || activity.activity_type === 'boxing_practice'
    || activity.activity_type === 'sparring';
}

function resolveStatus(
  entry: WeeklyPlanEntryRow | null,
  activity: ScheduledActivityRow | null,
): PlanCalendarScheduleItemStatus {
  if (activity?.status === 'completed' || entry?.status === 'completed') return 'completed';
  if (activity?.status === 'skipped' || entry?.status === 'skipped') return 'skipped';
  if (entry?.status === 'rescheduled') return 'rescheduled';
  if (activity?.status === 'modified') return 'modified';
  return entry?.status ?? activity?.status ?? 'scheduled';
}

function statusLabel(status: PlanCalendarScheduleItemStatus): string {
  switch (status) {
    case 'completed':
      return 'Done';
    case 'skipped':
      return 'Skipped';
    case 'rescheduled':
      return 'Moved';
    case 'modified':
      return 'Modified';
    case 'planned':
      return 'Planned';
    case 'scheduled':
    default:
      return 'Scheduled';
  }
}

function sortSlot(entry: WeeklyPlanEntryRow | null): string {
  if (!entry) return '1';
  if (entry.slot === 'am') return '0';
  if (entry.slot === 'pm') return '2';
  return '1';
}

function sortKeyFor(entry: WeeklyPlanEntryRow | null, activity: ScheduledActivityRow | null): string {
  return [
    activity?.start_time ?? '',
    sortSlot(entry),
    String(entry?.day_order ?? 99).padStart(2, '0'),
    entry?.id ?? activity?.id ?? '',
  ].join('|');
}

function itemFromRows(
  entry: WeeklyPlanEntryRow | null,
  activity: ScheduledActivityRow | null,
): PlanCalendarScheduleItem {
  const date = entry?.rescheduled_to ?? activity?.date ?? entry?.date;
  if (!date) {
    throw new Error('Plan calendar schedule item requires a weekly entry or scheduled activity date.');
  }

  const status = resolveStatus(entry, activity);
  const hasEntry = entry !== null;

  return {
    id: entry?.id ? `entry:${entry.id}` : `activity:${activity!.id}`,
    source: entry && activity ? 'linked' : entry ? 'weekly_plan_entry' : 'scheduled_activity',
    date,
    sortKey: sortKeyFor(entry, activity),
    label: entry ? labelForEntry(entry) : labelForActivity(activity!),
    dotType: entry?.session_family ?? entry?.session_type ?? activity?.activity_type ?? 'training',
    status,
    statusLabel: statusLabel(status),
    startTime: activity?.start_time ?? null,
    durationMin: entry?.estimated_duration_min ?? activity?.estimated_duration_min ?? 0,
    intensity: entry?.target_intensity ?? activity?.expected_intensity ?? null,
    weeklyPlanEntryId: entry?.id ?? activity?.weekly_plan_entry_id ?? null,
    scheduledActivityId: activity?.id ?? entry?.scheduled_activity_id ?? null,
    recurringActivityId: activity?.recurring_activity_id ?? null,
    sessionType: entry?.session_type ?? null,
    activityType: activity?.activity_type ?? null,
    protectedAnchor: (entry ? isProtectedEntry(entry) : false) || (activity ? isProtectedActivity(activity) : false),
    generatedWorkout: hasEntry,
  };
}

export function buildPlanCalendarScheduleItems(
  entries: readonly WeeklyPlanEntryRow[],
  activities: readonly ScheduledActivityRow[],
): PlanCalendarScheduleItem[] {
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const activitiesByPlanEntryId = new Map<string, ScheduledActivityRow>();
  for (const activity of activities) {
    if (activity.weekly_plan_entry_id) {
      activitiesByPlanEntryId.set(activity.weekly_plan_entry_id, activity);
    }
  }

  const usedActivityIds = new Set<string>();
  const items: PlanCalendarScheduleItem[] = entries.map((entry) => {
    const linkedActivity = entry.scheduled_activity_id
      ? activitiesById.get(entry.scheduled_activity_id) ?? activitiesByPlanEntryId.get(entry.id) ?? null
      : activitiesByPlanEntryId.get(entry.id) ?? null;

    if (linkedActivity) {
      usedActivityIds.add(linkedActivity.id);
    }

    return itemFromRows(entry, linkedActivity);
  });

  for (const activity of activities) {
    if (usedActivityIds.has(activity.id)) continue;
    if (activity.weekly_plan_entry_id && entries.some((entry) => entry.id === activity.weekly_plan_entry_id)) continue;
    items.push(itemFromRows(null, activity));
  }

  return items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.sortKey.localeCompare(b.sortKey);
  });
}

export function getPlanCalendarItemDots(
  items: readonly PlanCalendarScheduleItem[],
): Map<string, Set<string>> {
  const dots = new Map<string, Set<string>>();
  for (const item of items) {
    if (!dots.has(item.date)) dots.set(item.date, new Set<string>());
    dots.get(item.date)!.add(item.dotType);
  }
  return dots;
}

export function getPlanCalendarItemMetrics(
  items: readonly PlanCalendarScheduleItem[],
): PlanCalendarItemMetrics {
  const activeItems = items.filter((item) => item.status !== 'skipped');
  return {
    scheduledDays: new Set(activeItems.map((item) => item.date)).size,
    plannedMinutes: activeItems.reduce((sum, item) => sum + item.durationMin, 0),
    protectedAnchors: activeItems.filter((item) => item.protectedAnchor).length,
    totalItems: activeItems.length,
  };
}
