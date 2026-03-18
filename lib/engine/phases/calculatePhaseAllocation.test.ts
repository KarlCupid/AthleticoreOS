import { calculatePhaseAllocation } from './calculatePhaseAllocation.ts';

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

console.log('\n-- phases/calculatePhaseAllocation --');

(() => {
  const shortCamp = calculatePhaseAllocation(14);
  assert('14-day camp has 0 GPP', shortCamp.gpp === 0);
  assert('14-day camp taper is capped to 5-10 days', shortCamp.taper >= 5 && shortCamp.taper <= 10);
})();

(() => {
  const standardCamp = calculatePhaseAllocation(56);
  assert('56-day camp taper never exceeds 10 days', standardCamp.taper <= 10);
  assert('56-day camp keeps a non-zero GPP block', standardCamp.gpp > 0);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
