import {
  classifyGuidedSessionType,
  hasGuidedEnginePrescription,
  isActiveGuidedEnginePlanEntry,
  isGuidedEngineActivityType,
} from '.ts';

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
    daily_mission_snapshot: null,
  };

  assert('entry with conditioning prescription is recognized as guided', hasGuidedEnginePrescription(entry as any));
  assert('conditioning plan entry is active guided engine work', isActiveGuidedEnginePlanEntry(entry as any));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
