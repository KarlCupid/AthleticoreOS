import { PLANNING_SETUP_VERSION } from './planningConstants.ts';
import { isPlanningSetupComplete } from './planningSetupLogic.ts';

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

console.log('\n-- planningSetupLogic --');

assert(
  'legacy usage with version 1 still needs setup',
  !isPlanningSetupComplete({
    planningSetupVersion: PLANNING_SETUP_VERSION - 1,
    hasAvailabilityWindows: true,
    hasActiveModeRecord: true,
  }),
);

assert(
  'version 2 without availability still needs setup',
  !isPlanningSetupComplete({
    planningSetupVersion: PLANNING_SETUP_VERSION,
    hasAvailabilityWindows: false,
    hasActiveModeRecord: true,
  }),
);

assert(
  'version 2 without active objective still needs setup',
  !isPlanningSetupComplete({
    planningSetupVersion: PLANNING_SETUP_VERSION,
    hasAvailabilityWindows: true,
    hasActiveModeRecord: false,
  }),
);

assert(
  'version 2 with availability and active objective is complete',
  isPlanningSetupComplete({
    planningSetupVersion: PLANNING_SETUP_VERSION,
    hasAvailabilityWindows: true,
    hasActiveModeRecord: true,
  }),
);

if (failed > 0) {
  throw new Error(`planningSetupLogic tests failed: ${failed}`);
}

console.log(`planningSetupLogic tests passed: ${passed}`);
