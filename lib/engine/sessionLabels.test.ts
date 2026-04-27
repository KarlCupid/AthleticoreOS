import { getSessionFamilyLabel } from './sessionLabels.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
}

console.log('\n-- sessionLabels --');

const broadStrengthSprint = getSessionFamilyLabel({
  sessionType: 'sc',
  focus: 'upper_pull',
  prescription: {
    workoutType: 'strength',
    focus: 'upper_pull',
    sessionFamily: 'strength',
    scSessionFamily: 'acceleration',
    modality: 'sprint',
    wizardKind: 'sprint',
    primaryAdaptation: 'power',
    sessionPrescription: {
      sessionFamily: 'acceleration',
      modality: 'sprint',
      wizardKind: 'sprint',
    },
  } as any,
});
assert('sprint S&C family overrides broad strength focus', broadStrengthSprint === 'Acceleration Sprints');

const snapshotOnlySprint = getSessionFamilyLabel({
  sessionType: 'sc',
  focus: 'upper_pull',
  prescription: {
    workoutType: 'strength',
    focus: 'upper_pull',
    sessionFamily: 'strength',
    primaryAdaptation: 'power',
    sessionPrescription: {
      sessionFamily: 'hill_sprints',
      modality: 'sprint',
      wizardKind: 'sprint',
    },
  } as any,
});
assert('session prescription family labels hill sprint days', snapshotOnlySprint === 'Hill Sprints');

const rowMetadataSprint = getSessionFamilyLabel({
  sessionType: 'sc',
  focus: 'upper_pull',
  workoutType: 'strength',
  scSessionFamily: 'max_velocity',
});
assert('row sc_session_family can label speed days without a snapshot', rowMetadataSprint === 'Max Velocity Sprints');

const strengthSplit = getSessionFamilyLabel({
  sessionType: 'sc',
  focus: 'upper_pull',
  prescription: {
    workoutType: 'strength',
    focus: 'upper_pull',
    sessionFamily: 'strength',
    scSessionFamily: 'max_strength',
    modality: 'strength',
    primaryAdaptation: 'strength',
  } as any,
});
assert('strength templates keep the familiar split label', strengthSplit === 'Upper Pull Strength');

const hiit = getSessionFamilyLabel({
  sessionType: 'conditioning',
  focus: 'conditioning',
  prescription: {
    workoutType: 'conditioning',
    focus: 'conditioning',
    sessionFamily: 'conditioning',
    scSessionFamily: 'hiit',
    modality: 'conditioning',
    primaryAdaptation: 'conditioning',
  } as any,
});
assert('conditioning templates expose their specific session type', hiit === 'HIIT');

console.log(`\nsessionLabels tests passed: ${passed}, failed: ${failed}`);
if (failed > 0) process.exit(1);
