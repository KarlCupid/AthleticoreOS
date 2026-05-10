import type { ScheduledActivityRow, WeeklyPlanEntryRow } from '../../engine/index.ts';
import {
  getBoxingSnapshotFromWeeklyPlanEntry,
  type AdaptiveSessionKind,
  type ProtectedAnchorInput,
  type SessionFamily,
} from '../../performance-engine/index.ts';

function kindForScheduledActivity(activity: ScheduledActivityRow): AdaptiveSessionKind {
  const sessionKind = (activity.session_kind ?? '').toLowerCase();
  if (sessionKind.includes('competition') || sessionKind.includes('tournament') || sessionKind.includes('fight')) return 'competition';
  if (sessionKind.includes('spar')) return 'sparring';
  if (sessionKind.includes('mobility')) return 'mobility';
  if (sessionKind.includes('prehab')) return 'prehab';
  if (sessionKind.includes('breath')) return 'breathwork';
  if (sessionKind.includes('core')) return 'core';
  if (sessionKind.includes('speed')) return 'speed';
  if (sessionKind.includes('power')) return 'power';
  if (sessionKind.includes('threshold')) return 'threshold';
  if (sessionKind.includes('interval')) return 'hard_intervals';
  if (sessionKind.includes('zone2') || sessionKind.includes('zone_2')) return 'zone2';

  switch (activity.activity_type) {
    case 'sparring':
      return 'sparring';
    case 'boxing_practice':
      return 'boxing_skill';
    case 'sc':
      return activity.expected_intensity >= 7 ? 'heavy_lower_strength' : 'strength';
    case 'conditioning':
      return activity.expected_intensity >= 7 ? 'hard_intervals' : 'conditioning';
    case 'running':
    case 'road_work':
      return activity.expected_intensity >= 7 ? 'threshold' : 'zone2';
    case 'active_recovery':
      return 'recovery';
    case 'rest':
      return 'rest';
    default:
      return activity.expected_intensity >= 7 ? 'conditioning' : 'recovery';
  }
}

export function protectedAnchorsFromScheduledActivities(activities: ScheduledActivityRow[]): ProtectedAnchorInput[] {
  return activities
    .filter((activity) => activity.status !== 'skipped')
    .filter((activity) => (
      activity.athlete_locked === true
      || activity.constraint_tier === 'mandatory'
      || activity.activity_type === 'sparring'
      || activity.activity_type === 'boxing_practice'
    ))
    .map((activity) => ({
      id: activity.id,
      label: activity.custom_label ?? String(activity.activity_type).replace(/_/g, ' '),
      kind: kindForScheduledActivity(activity),
      dayOfWeek: new Date(`${activity.date}T00:00:00Z`).getUTCDay(),
      date: activity.date,
      startTime: activity.start_time ?? null,
      durationMinutes: activity.estimated_duration_min,
      intensityRpe: activity.intended_intensity ?? activity.expected_intensity,
      source: activity.athlete_locked ? 'user_locked' : activity.activity_type === 'sparring' || activity.activity_type === 'boxing_practice' ? 'protected_anchor' : 'manual',
      canMerge: false,
      reason: 'Scheduled athlete commitment loaded as a protected anchor for unified performance planning.',
    }));
}

function kindForProtectedPlanEntry(entry: WeeklyPlanEntryRow): AdaptiveSessionKind {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  switch (snapshot?.protectedWorkoutModality) {
    case 'sparring':
      return 'sparring';
    case 'competition':
      return 'competition';
    case 'boxing_skill':
    case 'shadowboxing':
    case 'footwork':
    case 'bag_work':
    case 'pad_work':
      return 'boxing_skill';
    case 'roadwork_zone2':
    case 'zone2':
      return 'zone2';
    case 'roadwork_tempo':
      return 'threshold';
    case 'roadwork_intervals':
    case 'boxing_conditioning':
      return 'hard_intervals';
    case 'strength_power':
      return 'strength';
    case 'mobility_prehab':
      return 'prehab';
    case 'recovery':
      return 'recovery';
    case 'external_non_boxing_load':
      return 'conditioning';
    default:
      if (entry.session_type === 'sparring') return 'sparring';
      if (entry.session_type === 'boxing_practice') return 'boxing_skill';
      if (entry.session_type === 'road_work' || entry.session_type === 'running') return 'zone2';
      if (entry.session_type === 'conditioning') return 'conditioning';
      return 'recovery';
  }
}

function familyForProtectedPlanEntry(entry: WeeklyPlanEntryRow): SessionFamily {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  switch (snapshot?.protectedWorkoutModality) {
    case 'sparring':
      return 'sparring';
    case 'competition':
      return 'assessment';
    case 'boxing_skill':
    case 'shadowboxing':
    case 'footwork':
    case 'bag_work':
    case 'pad_work':
      return 'boxing_skill';
    case 'roadwork_zone2':
    case 'roadwork_tempo':
    case 'roadwork_intervals':
    case 'zone2':
      return 'roadwork';
    case 'boxing_conditioning':
      return 'conditioning';
    case 'strength_power':
      return 'strength';
    case 'external_non_boxing_load':
      return 'other';
    case 'mobility_prehab':
    case 'recovery':
    default:
      return 'recovery';
  }
}

function intensityForProtectedPlanEntry(entry: WeeklyPlanEntryRow): number {
  if (typeof entry.target_intensity === 'number' && Number.isFinite(entry.target_intensity)) return entry.target_intensity;
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  if (snapshot?.plannedIntensity === 'hard') return 8;
  if (snapshot?.plannedIntensity === 'moderate') return 6;
  if (snapshot?.plannedIntensity === 'low') return 3;
  if (snapshot?.plannedIntensity === 'recovery') return 2;
  return 4;
}

export function protectedAnchorsFromWeeklyPlanEntries(entries: WeeklyPlanEntryRow[]): ProtectedAnchorInput[] {
  return entries
    .filter((entry) => entry.status !== 'skipped')
    .map<ProtectedAnchorInput | null>((entry) => {
      const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
      if (!snapshot?.protectedAnchor) return null;
      const isExternal = snapshot.protectedWorkoutModality === 'external_non_boxing_load';
      return {
        id: `weekly_plan_entry:${entry.id}`,
        label: snapshot.supportDomainLabel ?? snapshot.label,
        kind: kindForProtectedPlanEntry(entry),
        family: familyForProtectedPlanEntry(entry),
        dayOfWeek: new Date(`${entry.date}T00:00:00Z`).getUTCDay(),
        date: entry.date,
        startTime: null,
        durationMinutes: snapshot.protectedDurationMinutes ?? snapshot.estimatedDurationMinutes ?? entry.estimated_duration_min,
        intensityRpe: intensityForProtectedPlanEntry(entry),
        source: isExternal ? 'external_calendar' : 'protected_anchor',
        canMerge: false,
        reason: isExternal
          ? 'External non-boxing load was preserved as external load, not boxing practice.'
          : 'Generated weekly-plan snapshot marked this session as a protected anchor.',
      } satisfies ProtectedAnchorInput;
    })
    .filter((anchor): anchor is ProtectedAnchorInput => Boolean(anchor));
}
