import type { WeeklyPlanEntryRow } from '../../engine/types';
import { boxingSnapshotToDailyPerformanceSession } from './boxingSnapshotSessions';
import { protectedAnchorsFromWeeklyPlanEntries } from './protectedAnchors';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function makeEntry(overrides: Partial<WeeklyPlanEntryRow> = {}): WeeklyPlanEntryRow {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    week_start_date: '2026-05-04',
    day_of_week: 1,
    date: '2026-05-04',
    slot: 'single',
    day_order: 1,
    session_type: 'sc',
    focus: null,
    placement_source: 'generated',
    estimated_duration_min: 35,
    target_intensity: 5,
    status: 'planned',
    rescheduled_to: null,
    workout_log_id: null,
    prescription_snapshot: null,
    engine_notes: null,
    is_deload: false,
    created_at: '2026-05-04T00:00:00.000Z',
    ...overrides,
  };
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    snapshotKind: 'boxing_generated_program_entry',
    schemaVersion: 1,
    sourceOfTruth: 'GeneratedProgram',
    programId: 'program-1',
    sessionId: 'session-1',
    weekIndex: 1,
    dayIndex: 1,
    scheduledDate: '2026-05-04',
    label: 'Athleticore support',
    protectedAnchor: false,
    goalId: 'boxing_support',
    plannedIntensity: 'moderate',
    estimatedDurationMinutes: 35,
    athleticDevelopmentDomain: 'strength',
    supportDomainLabel: 'Strength support',
    expectedFuelPriority: 'strength_power',
    expectedCarbDemandClass: 'moderate',
    expectedRecoveryDemandClass: 'high',
    expectedHydrationDemandClass: 'moderate',
    sessionEnergyDemandScore: 52,
    sessionRecoveryDemandScore: 64,
    isBoxingPracticeReplacement: false,
    sAndCRationale: 'Build boxing-relevant physical qualities.',
    boxingRelevance: 'Supports boxing without replacing boxing practice.',
    rationale: [],
    generatedWorkout: null,
    weekSummary: {
      coachSummaryBullets: [],
      coachRationale: [],
      userFacingWarnings: [],
      validationWarnings: [],
      hardDayCount: 1,
      qualityGaps: [],
    },
    ...overrides,
  } as any;
}

console.log('\n-- boxing snapshot daily performance mapping --');

(() => {
  const session = boxingSnapshotToDailyPerformanceSession(makeEntry({
    id: 'strength-entry',
    prescription_snapshot: makeSnapshot({
      athleticDevelopmentDomain: 'strength',
      boxingSessionFamily: 'strength_power',
      expectedFuelPriority: 'strength_power',
    }),
  }));
  assert('strength domain maps to strength composed session', session?.family === 'strength');
  assert('strength domain carries direct fuel priority', session?.supportMetadata?.expectedFuelPriority === 'strength_power');
  assert('strength domain carries direct recovery demand score', session?.supportMetadata?.sessionRecoveryDemandScore === 64);
})();

(() => {
  const session = boxingSnapshotToDailyPerformanceSession(makeEntry({
    id: 'snapshot-source-entry',
    placement_source: null,
    prescription_snapshot: makeSnapshot({
      athleticDevelopmentDomain: 'strength',
      expectedFuelPriority: 'strength_power',
    }),
  }));
  assert('valid GeneratedProgram snapshot is daily-performance source of truth without placement_source', session?.id === 'weekly_plan_entry:snapshot-source-entry');
})();

(() => {
  const session = boxingSnapshotToDailyPerformanceSession(makeEntry({
    id: 'roadwork-entry',
    session_type: 'road_work',
    prescription_snapshot: makeSnapshot({
      athleticDevelopmentDomain: 'roadwork',
      boxingSessionFamily: 'roadwork_zone2',
      supportDomainLabel: 'Roadwork base',
      expectedFuelPriority: 'roadwork_aerobic',
      expectedHydrationDemandClass: 'moderate',
    }),
  }));
  assert('roadwork domain maps to roadwork composed session', session?.family === 'roadwork');
  assert('roadwork domain carries aerobic fuel priority', session?.supportMetadata?.expectedFuelPriority === 'roadwork_aerobic');
})();

(() => {
  const session = boxingSnapshotToDailyPerformanceSession(makeEntry({
    id: 'conditioning-entry',
    session_type: 'conditioning',
    target_intensity: 8,
    prescription_snapshot: makeSnapshot({
      athleticDevelopmentDomain: 'conditioning',
      boxingSessionFamily: 'alactic_repeat_power',
      expectedFuelPriority: 'conditioning_intervals',
      expectedCarbDemandClass: 'high',
    }),
  }));
  assert('conditioning domain maps to conditioning composed session', session?.family === 'conditioning');
  assert('conditioning domain carries interval fueling priority', session?.supportMetadata?.expectedFuelPriority === 'conditioning_intervals');
})();

(() => {
  const session = boxingSnapshotToDailyPerformanceSession(makeEntry({
    id: 'durability-entry',
    session_type: 'active_recovery',
    target_intensity: 3,
    prescription_snapshot: makeSnapshot({
      athleticDevelopmentDomain: 'durability',
      boxingSessionFamily: 'shoulder_scap_durability',
      expectedFuelPriority: 'durability',
    }),
  }));
  assert('durability domain maps to recovery support, not boxing practice', session?.family === 'recovery');
})();

(() => {
  const session = boxingSnapshotToDailyPerformanceSession(makeEntry({
    id: 'skill-support-entry',
    session_type: 'boxing_practice',
    target_intensity: 3,
    prescription_snapshot: makeSnapshot({
      athleticDevelopmentDomain: 'boxing_skill_support',
      boxingSessionFamily: 'footwork_agility',
      expectedFuelPriority: 'boxing_practice',
      expectedCarbDemandClass: 'low',
      sessionEnergyDemandScore: 20,
    }),
  }));
  assert('skill support maps to boxing skill, not sparring', session?.family === 'boxing_skill');
  assert('skill support tissue load is low-load boxing skill support', session?.tissueLoads?.includes('boxing_skill_low_load') === true);
})();

(() => {
  const anchors = protectedAnchorsFromWeeklyPlanEntries([
    makeEntry({
      id: 'external-entry',
      placement_source: 'locked',
      prescription_snapshot: makeSnapshot({
        protectedAnchor: true,
        protectedWorkoutModality: 'external_non_boxing_load',
        supportDomainLabel: 'External load',
      }),
    }),
  ]);
  assert('external protected load stays external/other, not boxing skill', anchors[0]?.family === 'other' && anchors[0]?.source === 'external_calendar');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
