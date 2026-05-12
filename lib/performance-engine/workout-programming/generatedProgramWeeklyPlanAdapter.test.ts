import type { WeeklyPlanEntryRow } from '../../engine/types.ts';
import {
  buildGeneratedWorkoutRequestFromPlanEntry,
  generatedProgramToWeeklyPlanEntries,
  getBoxingSnapshotFromWeeklyPlanEntry,
  inferProtectedWorkoutModality,
  isBoxingGeneratedWeeklyPlanEntry,
  isLegacyWeeklyPlanEntry,
  templateIdForBoxingFamily,
  type GeneratedProgram,
  type GeneratedWorkout,
} from './index.ts';

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

function assertThrows(label: string, run: () => unknown): void {
  try {
    run();
    assert(label, false);
  } catch {
    assert(label, true);
  }
}

function workout(overrides: Partial<GeneratedWorkout> = {}): GeneratedWorkout {
  return {
    schemaVersion: 'generated-workout-v1',
    workoutTypeId: 'boxing_support',
    goalId: 'footwork_agility',
    templateId: templateIdForBoxingFamily('footwork_agility'),
    formatId: 'session',
    requestedDurationMinutes: 25,
    estimatedDurationMinutes: 25,
    equipmentIds: ['bodyweight', 'open_space'],
    safetyFlags: [],
    blocks: [],
    trackingMetricIds: ['session_rpe'],
    successCriteria: ['Stay crisp.'],
    explanations: ['Footwork quality fills the week gap.'],
    ...overrides,
  };
}

function program(): GeneratedProgram {
  const generated = workout();
  const sessions = [
    {
      id: 'protected-sparring',
      dayIndex: 1,
      weekIndex: 1,
      scheduledDate: '2026-05-04',
      protectedAnchor: true,
      label: 'Coach sparring',
      workout: null,
      plannedIntensity: 'hard',
      protectedWorkoutModality: 'sparring',
      protectedDurationMinutes: 75,
      rationale: ['Protected sparring is a non-negotiable anchor.'],
    },
    {
      id: 'generated-footwork',
      generatedWorkoutId: 'generated-workout-1',
      dayIndex: 3,
      weekIndex: 1,
      protectedAnchor: false,
      label: 'Footwork agility',
      workout: generated,
      plannedIntensity: 'low',
      boxingSessionFamily: 'footwork_agility',
      boxingSessionRole: 'footwork_agility',
      sessionDoseCategory: 'support_session',
      estimatedLoadScore: 22,
      rationale: ['Footwork quality fills the week gap.'],
    },
  ];
  return {
    id: 'program-1',
    persistenceId: 'user-program-1',
    status: 'active',
    scheduleStartDate: '2026-05-04',
    scheduleEndDate: '2026-05-10',
    goalId: 'boxing_support',
    weekCount: 1,
    phase: 'base',
    sessions,
    weeks: [{
      weekIndex: 1,
      phase: 'base',
      sessions,
      rationale: ['Boxing week balances protected sparring with support work.'],
      movementPatternBalance: {},
      weeklyVolumeSummary: {
        weekIndex: 1,
        phase: 'base',
        generatedSessionCount: 1,
        protectedSessionCount: 1,
        estimatedMinutes: 100,
        hardDayCount: 1,
        hardDayCap: 2,
        generatedSupportSessionCount: 1,
        generatedFullSessionCount: 0,
        generatedMicrodoseCount: 0,
        protectedBoxingSessionCount: 1,
        protectedSparringCount: 1,
        protectedRoadworkCount: 0,
        workoutTypeCounts: {},
      },
      weeklyDose: {
        track: 'aspiring_boxer',
        generatedSessionsPerWeek: 1,
        generatedFullSessionsPerWeek: 0,
        generatedSupportSessionsPerWeek: 1,
        generatedMicrodosesPerWeek: 0,
        maxHardGeneratedSessionsPerWeek: 1,
        hardDayCap: 2,
        targetExposureCount: 2,
        totalExposureTarget: 2,
        protectedAnchorCount: 1,
        protectedBoxingSessionCount: 1,
        protectedSparringCount: 1,
        protectedRoadworkCount: 0,
        qualityPriorities: ['footwork'],
        preferredFamilies: ['footwork_agility'],
        prohibitedGeneratedFamilies: ['sparring' as never],
      },
      hardDayCount: 1,
      validationWarnings: ['Keep support away from sparring intensity.'],
      weeklyBoxingHeadline: 'Sparring anchored, footwork supported',
      weeklyBoxingSummary: 'Athleticore kept the hard day protected and added one support session.',
      primaryBoxingFocus: 'Footwork quality',
      hardDaySummary: '1 of 2 hard days used.',
      protectedLoadSummary: '1 protected sparring anchor.',
      generatedSupportSummary: '1 Athleticore support session.',
      nextBestAction: 'Execute footwork cleanly and keep sparring protected.',
      coachSummaryBullets: ['No generated sparring.', 'Support dose fills footwork.'],
    }],
    rationale: [],
    movementPatternBalance: { weekly: {}, programTotal: {}, warnings: [] },
    weeklyVolumeSummary: [],
    hardDayCount: 1,
    progressionPlan: [],
    explanations: [],
    validationWarnings: [],
  } as unknown as GeneratedProgram;
}

function row(overrides: Partial<WeeklyPlanEntryRow>): WeeklyPlanEntryRow {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    week_start_date: '2026-05-04',
    day_of_week: 1,
    date: '2026-05-04',
    slot: 'single',
    day_order: 1,
    session_type: 'boxing_practice',
    focus: 'sport_specific',
    estimated_duration_min: 25,
    target_intensity: 4,
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

function testGeneratedProgramAdapter(): void {
  const adapted = generatedProgramToWeeklyPlanEntries({
    userId: 'user-1',
    weekStart: '2026-05-04',
    program: program(),
  });
  const protectedEntry = adapted.entries[0];
  const generatedEntry = adapted.entries[1];
  const generatedSnapshot = getBoxingSnapshotFromWeeklyPlanEntry(generatedEntry as WeeklyPlanEntryRow);

  assert('adapter writes protected boxing anchor as locked', protectedEntry.placement_source === 'locked' && protectedEntry.session_type === 'sparring');
  assert('adapter writes generated support as generated', generatedEntry.placement_source === 'generated' && generatedEntry.session_family === 'boxing_skill');
  assert('adapter maps dayIndex to date and legacy day_of_week', generatedEntry.date === '2026-05-06' && generatedEntry.day_of_week === 3);
  assert('adapter persists GeneratedProgram snapshot metadata', generatedSnapshot?.sourceOfTruth === 'GeneratedProgram' && generatedSnapshot.boxingSessionFamily === 'footwork_agility');
  assert('adapter persists dose and coach rationale metadata', Boolean(generatedEntry.dose_summary) && Boolean(generatedSnapshot?.weekSummary.coachSummaryBullets.includes('No generated sparring.')));

  const multiWeek = program();
  const weekTwoSession = {
    id: 'generated-footwork-week-2',
    generatedWorkoutId: 'generated-workout-2',
    dayIndex: 1,
    weekIndex: 2,
    protectedAnchor: false,
    label: 'Footwork agility',
    workout: workout(),
    plannedIntensity: 'low',
    boxingSessionFamily: 'footwork_agility',
    boxingSessionRole: 'footwork_agility',
    sessionDoseCategory: 'support_session',
    estimatedLoadScore: 22,
    rationale: ['Footwork quality repeats next week.'],
  };
  multiWeek.weekCount = 2;
  multiWeek.sessions = [...multiWeek.sessions, weekTwoSession] as GeneratedProgram['sessions'];
  multiWeek.weeks = [
    ...multiWeek.weeks,
    {
      ...multiWeek.weeks[0]!,
      weekIndex: 2,
      sessions: [weekTwoSession],
      weeklyVolumeSummary: {
        ...multiWeek.weeks[0]!.weeklyVolumeSummary,
        weekIndex: 2,
        generatedSessionCount: 1,
        protectedSessionCount: 0,
      },
    },
  ] as GeneratedProgram['weeks'];
  const multiWeekAdapted = generatedProgramToWeeklyPlanEntries({
    userId: 'user-1',
    weekStart: '2026-05-04',
    program: multiWeek,
    includeGeneratedWorkoutForSession: (session) => session.weekIndex === 1,
  });
  const weekTwoEntry = multiWeekAdapted.entries.find((entry) => entry.week_start_date === '2026-05-11');
  const weekTwoSnapshot = getBoxingSnapshotFromWeeklyPlanEntry(weekTwoEntry as WeeklyPlanEntryRow);
  assert('adapter persists future generated weeks for look-ahead plans', weekTwoEntry?.date === '2026-05-11' && weekTwoSnapshot?.weekIndex === 2);
  assert('adapter can keep future look-ahead entries lightweight', weekTwoSnapshot?.generatedWorkout === null);
}

function testRequestBuilder(): void {
  const families = [
    ['footwork_agility', 'footwork_agility'],
    ['roadwork_zone2', 'roadwork_aerobic_base'],
    ['alactic_repeat_power', 'alactic_repeat_power'],
    ['recovery_reset', 'recovery_reset'],
  ] as const;

  for (const [family, role] of families) {
    const request = buildGeneratedWorkoutRequestFromPlanEntry({
      entry: row({
        prescription_snapshot: {
          snapshotKind: 'boxing_generated_program_entry',
          schemaVersion: 1,
          sourceOfTruth: 'GeneratedProgram',
          programId: 'program-1',
          sessionId: `session-${family}`,
          weekIndex: 1,
          dayIndex: 2,
          scheduledDate: '2026-05-05',
          label: family,
          protectedAnchor: false,
          goalId: family === 'roadwork_zone2' ? 'roadwork_aerobic_base' : family,
          preferredSessionTemplateId: templateIdForBoxingFamily(family),
          estimatedDurationMinutes: 25,
          boxingSessionFamily: family,
          boxingSessionRole: role,
          sessionDoseCategory: family === 'recovery_reset' ? 'recovery_reset' : 'support_session',
          rationale: ['request test'],
          generatedWorkout: null,
          weekSummary: { coachSummaryBullets: [], coachRationale: [], userFacingWarnings: [], validationWarnings: [], hardDayCount: 0, qualityGaps: [] },
        } as unknown as WeeklyPlanEntryRow['prescription_snapshot'],
      }),
      readinessBand: 'green',
    });
    assert(`request builder keeps ${family} intended family and template`, request.intendedBoxingSessionFamily === family && request.preferredSessionTemplateId === templateIdForBoxingFamily(family));
  }
}

function testSafetyAndCompatibility(): void {
  const grappling = inferProtectedWorkoutModality({ label: 'Grappling class' });
  const mma = inferProtectedWorkoutModality({ label: 'MMA practice' });
  assert('external non-boxing load does not become boxing skill', grappling === 'external_non_boxing_load' && mma === 'external_non_boxing_load');

  const protectedSparringEntry = row({
    placement_source: 'locked',
    session_type: 'sparring',
    prescription_snapshot: {
      snapshotKind: 'boxing_generated_program_entry',
      schemaVersion: 1,
      sourceOfTruth: 'GeneratedProgram',
      programId: 'program-1',
      sessionId: 'sparring',
      weekIndex: 1,
      dayIndex: 1,
      scheduledDate: '2026-05-04',
      label: 'Protected sparring',
      protectedAnchor: true,
      goalId: 'boxing_support',
      estimatedDurationMinutes: 75,
      protectedWorkoutModality: 'sparring',
      rationale: ['protected'],
      generatedWorkout: null,
      weekSummary: { coachSummaryBullets: [], coachRationale: [], userFacingWarnings: [], validationWarnings: [], hardDayCount: 1, qualityGaps: [] },
    } as unknown as WeeklyPlanEntryRow['prescription_snapshot'],
  });
  assertThrows('request builder refuses generated sparring or protected anchor regeneration', () => buildGeneratedWorkoutRequestFromPlanEntry({ entry: protectedSparringEntry }));

  const legacy = row({ prescription_snapshot: null, session_family: 'strength', focus: 'full_body' });
  assert('legacy compatibility helper detects old row without making it canonical', isLegacyWeeklyPlanEntry(legacy) && !isBoxingGeneratedWeeklyPlanEntry(legacy));
}

testGeneratedProgramAdapter();
testRequestBuilder();
testSafetyAndCompatibility();

if (failed > 0) {
  console.error(`generatedProgramWeeklyPlanAdapter.test.ts failed: ${failed} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`generatedProgramWeeklyPlanAdapter.test.ts passed: ${passed} assertions`);
