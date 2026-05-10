import {
  classifyGuidedSessionType,
  hasGuidedEnginePrescription,
  isActiveGuidedEnginePlanEntry,
  isGuidedEngineActivityType,
} from './sessionOwnership.ts';
import {
  classifyPlanEntryRuntimeSurface,
  isActiveAthleticoreSupportPlanEntry,
  isLegacyGuidedWorkoutPlanEntry,
} from '../performance-engine/workout-programming/planEntryRuntime.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

console.log('\n-- sessionOwnership --');

(() => {
  assert('conditioning remains a guided engine activity', isGuidedEngineActivityType('conditioning'));
  assert('boxing practice is not a guided engine activity', !isGuidedEngineActivityType('boxing_practice'));
})();

(() => {
  assert(
    'conditioning focus classifies as conditioning',
    classifyGuidedSessionType({ sessionType: 'sc', focus: 'conditioning' }) === 'conditioning',
  );
  assert(
    'recovery-style sparring support still persists as sc',
    classifyGuidedSessionType({ sessionType: 'sc', focus: 'sport_specific', prescription: { workoutType: 'recovery' } }) === 'sc',
  );
})();

(() => {
  const entry = {
    status: 'planned' as const,
    session_type: 'conditioning',
    focus: 'conditioning' as const,
    prescription_snapshot: {
      workoutType: 'conditioning' as const,
      exercises: [{ exercise: { id: 'ex-1' } }],
    },
  };

  assert('entry with conditioning prescription is recognized as guided', hasGuidedEnginePrescription(entry as any));
  assert('conditioning plan entry is active guided engine work', isActiveGuidedEnginePlanEntry(entry as any));
})();

(() => {
  const snapshot = {
    snapshotKind: 'boxing_generated_program_entry',
    schemaVersion: 1,
    sourceOfTruth: 'GeneratedProgram',
    programId: 'program-1',
    sessionId: 'session-1',
    weekIndex: 1,
    dayIndex: 1,
    scheduledDate: '2026-05-03',
    label: 'Strength support',
    protectedAnchor: false,
    goalId: 'boxing_support',
    estimatedDurationMinutes: 40,
    athleticDevelopmentDomain: 'strength',
    expectedFuelPriority: 'strength_power',
    isBoxingPracticeReplacement: false,
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
  };
  const generatedEntry = {
    id: 'generated',
    status: 'planned',
    session_type: 'sc',
    focus: null,
    placement_source: 'generated',
    prescription_snapshot: snapshot,
  };
  const legacyEntry = {
    id: 'legacy',
    status: 'planned',
    session_type: 'conditioning',
    focus: 'conditioning',
    prescription_snapshot: {
      workoutType: 'conditioning',
      exercises: [{ exercise: { id: 'ex-1' } }],
    },
  };

  assert('generated support snapshot is active Athleticore support', isActiveAthleticoreSupportPlanEntry(generatedEntry as any));
  assert('generated support snapshot opens detail surface', classifyPlanEntryRuntimeSurface(generatedEntry as any) === 'athleticore_support_detail');
  assert('generated support snapshot is not legacy guided compatibility', !isLegacyGuidedWorkoutPlanEntry(generatedEntry as any));
  assert('legacy guided prescription remains GuidedWorkout compatibility', classifyPlanEntryRuntimeSurface(legacyEntry as any) === 'legacy_guided_workout');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
