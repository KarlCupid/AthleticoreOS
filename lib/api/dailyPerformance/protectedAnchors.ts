import type { ScheduledActivityRow } from '../../engine/index.ts';
import type { AdaptiveSessionKind, ProtectedAnchorInput } from '../../performance-engine/index.ts';

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
