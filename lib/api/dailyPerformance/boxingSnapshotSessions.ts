import type { WeeklyPlanEntryRow } from '../../engine/types';
import {
  confidenceFromLevel,
  createComposedSession,
  createExplanation,
  createMeasurementRange,
  getBoxingSnapshotFromWeeklyPlanEntry,
  type BoxingAthleteSupportDomain,
  type ComposedSession,
  type DirectSupportSessionMetadata,
  type SessionFamily,
} from '../../performance-engine';

function familyForDomain(domain: BoxingAthleteSupportDomain | undefined, fallback: SessionFamily): SessionFamily {
  switch (domain) {
    case 'boxing_skill_support':
      return 'boxing_skill';
    case 'strength':
    case 'power':
      return 'strength';
    case 'speed_agility':
      return 'conditioning';
    case 'roadwork':
      return 'roadwork';
    case 'conditioning':
      return 'conditioning';
    case 'durability':
    case 'mobility':
    case 'recovery':
      return 'recovery';
    default:
      return fallback;
  }
}

function fallbackFamily(entry: WeeklyPlanEntryRow): SessionFamily {
  switch (entry.session_type) {
    case 'boxing_practice':
      return 'boxing_skill';
    case 'sparring':
      return 'sparring';
    case 'road_work':
    case 'running':
      return 'roadwork';
    case 'conditioning':
      return 'conditioning';
    case 'active_recovery':
      return 'recovery';
    case 'sc':
      return 'strength';
    default:
      return entry.session_family === 'durability_core' ? 'recovery' : (entry.session_family as SessionFamily) ?? 'other';
  }
}

function intensityTarget(entry: WeeklyPlanEntryRow): number {
  if (typeof entry.target_intensity === 'number' && Number.isFinite(entry.target_intensity)) return entry.target_intensity;
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  if (snapshot?.plannedIntensity === 'hard') return 8;
  if (snapshot?.plannedIntensity === 'moderate') return 6;
  if (snapshot?.plannedIntensity === 'low') return 3;
  if (snapshot?.plannedIntensity === 'recovery') return 2;
  return 4;
}

function tissueLoadsForDomain(domain: BoxingAthleteSupportDomain | undefined): string[] {
  switch (domain) {
    case 'strength':
    case 'power':
      return ['lower_body_force', 'trunk_transfer'];
    case 'conditioning':
      return ['high_intensity_energy_system'];
    case 'speed_agility':
      return ['footwork_speed', 'ankle_calf', 'neural'];
    case 'roadwork':
      return ['aerobic_base'];
    case 'durability':
      return ['trunk', 'shoulder_scap', 'neck_trap'];
    case 'mobility':
      return ['hip_ankle', 'shoulder_tspine'];
    case 'recovery':
      return ['recovery'];
    case 'boxing_skill_support':
      return ['boxing_skill_low_load'];
    default:
      return [];
  }
}

function supportMetadataFromSnapshot(snapshot: NonNullable<ReturnType<typeof getBoxingSnapshotFromWeeklyPlanEntry>>): DirectSupportSessionMetadata {
  return {
    athleticDevelopmentDomain: snapshot.athleticDevelopmentDomain ?? null,
    boxingSessionFamily: snapshot.boxingSessionFamily ?? null,
    boxingSessionRole: snapshot.boxingSessionRole ?? null,
    supportDomainLabel: snapshot.supportDomainLabel ?? null,
    expectedFuelPriority: snapshot.expectedFuelPriority ?? null,
    expectedCarbDemandClass: snapshot.expectedCarbDemandClass ?? null,
    expectedRecoveryDemandClass: snapshot.expectedRecoveryDemandClass ?? null,
    expectedHydrationDemandClass: snapshot.expectedHydrationDemandClass ?? null,
    sessionEnergyDemandScore: snapshot.sessionEnergyDemandScore ?? null,
    sessionRecoveryDemandScore: snapshot.sessionRecoveryDemandScore ?? null,
    plannedIntensity: snapshot.plannedIntensity ?? null,
    protectedWorkoutModality: snapshot.protectedWorkoutModality ?? null,
    sAndCRationale: snapshot.sAndCRationale ?? null,
    boxingRelevance: snapshot.boxingRelevance ?? null,
    athleticDevelopmentRationale: snapshot.athleticDevelopmentRationale ?? null,
  };
}

function stressScoreFromSnapshot(snapshot: NonNullable<ReturnType<typeof getBoxingSnapshotFromWeeklyPlanEntry>>): number | null {
  const scores = [snapshot.sessionEnergyDemandScore, snapshot.sessionRecoveryDemandScore]
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
  return scores.length > 0 ? Math.max(...scores) : null;
}

export function boxingSnapshotToDailyPerformanceSession(entry: WeeklyPlanEntryRow): ComposedSession | null {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  if (!snapshot || snapshot.protectedAnchor || entry.placement_source !== 'generated') return null;
  const domain = snapshot.athleticDevelopmentDomain;
  const family = familyForDomain(domain, fallbackFamily(entry));
  const confidence = confidenceFromLevel('medium', [
    'Generated weekly-plan snapshot carried support-domain metadata into daily performance.',
  ]);
  const minutes = snapshot.estimatedDurationMinutes ?? entry.estimated_duration_min ?? 0;
  const title = snapshot.supportDomainLabel
    ? `${snapshot.supportDomainLabel}: ${snapshot.label}`
    : snapshot.label;

  return createComposedSession({
    id: `weekly_plan_entry:${entry.id}`,
    date: entry.date,
    family,
    source: 'engine_generated',
    protectedAnchor: false,
    anchorId: null,
    title,
    durationMinutes: createMeasurementRange({ target: minutes, unit: 'minute', confidence }),
    intensityRpe: createMeasurementRange({ target: intensityTarget(entry), unit: 'rpe', confidence }),
    startsAt: null,
    stressScore: stressScoreFromSnapshot(snapshot),
    tissueLoads: tissueLoadsForDomain(domain),
    supportMetadata: supportMetadataFromSnapshot(snapshot),
    explanation: createExplanation({
      summary: snapshot.sAndCRationale ?? snapshot.athleticDevelopmentRationale ?? 'Athleticore support session for boxing.',
      reasons: [
        snapshot.boxingRelevance,
        snapshot.weekSummary.weeklyAthleticDevelopmentSummary,
        snapshot.weekSummary.protectedBoxingPracticeSummary,
      ].filter((reason): reason is string => Boolean(reason)),
      confidence,
    }),
    confidence,
  });
}

export function boxingSnapshotsToDailyPerformanceSessions(entries: readonly WeeklyPlanEntryRow[]): ComposedSession[] {
  return entries
    .map((entry) => boxingSnapshotToDailyPerformanceSession(entry))
    .filter((session): session is ComposedSession => Boolean(session));
}
