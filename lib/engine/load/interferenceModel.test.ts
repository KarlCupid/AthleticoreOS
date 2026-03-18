import { getInterferencePenalty } from './interferenceModel.ts';

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

console.log('\n-- load/interferenceModel --');

(() => {
  const penalty = getInterferencePenalty('HEAVY_STRENGTH', 'SPARRING', 3);
  assert('Heavy strength before sparring exceeds 1.3 at 3h', penalty >= 1.3);
})();

(() => {
  const penalty = getInterferencePenalty('HEAVY_STRENGTH', 'SPARRING', 12);
  assert('12h separation clears interference', penalty === 1);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
