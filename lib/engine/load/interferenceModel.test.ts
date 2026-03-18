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

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} ±${tolerance})`);
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

// --- New tests: penalty at 0h gap (full penalty) ---
(() => {
  // HEAVY_STRENGTH → SPARRING base=1.5, at 0h: decayFactor=0/12=0, penalty=1+(1.5-1)*(1-0)=1.5
  const p0h = getInterferencePenalty('HEAVY_STRENGTH', 'SPARRING', 0);
  assertClose('HEAVY_STRENGTH→SPARRING at 0h = full penalty 1.5', p0h, 1.5, 0.001);
})();

// --- New tests: penalty at 6h gap (half decay) ---
(() => {
  // HEAVY_STRENGTH → SPARRING base=1.5, at 6h: decayFactor=6/12=0.5, penalty=1+(0.5)*(0.5)=1.25
  const p6h = getInterferencePenalty('HEAVY_STRENGTH', 'SPARRING', 6);
  assertClose('HEAVY_STRENGTH→SPARRING at 6h = 1.25', p6h, 1.25, 0.001);
})();

// --- New tests: penalty at 12h gap (fully decayed) ---
(() => {
  const p12h = getInterferencePenalty('CONDITIONING', 'SPARRING', 12);
  assert('CONDITIONING→SPARRING at 12h = 1 (no penalty)', p12h === 1);
})();

// --- New tests: RECOVERY → anything = 1 (no penalty at any gap) ---
(() => {
  const pRecSpar = getInterferencePenalty('RECOVERY', 'SPARRING', 0);
  assert('RECOVERY→SPARRING at 0h = 1 (no penalty)', pRecSpar === 1);

  const pRecStr = getInterferencePenalty('RECOVERY', 'HEAVY_STRENGTH', 0);
  assert('RECOVERY→HEAVY_STRENGTH at 0h = 1', pRecStr === 1);

  const pRecCond = getInterferencePenalty('RECOVERY', 'CONDITIONING', 3);
  assert('RECOVERY→CONDITIONING at 3h = 1', pRecCond === 1);
})();

// --- New tests: different session type combinations ---
(() => {
  // CONDITIONING → SPARRING base=1.3, at 0h: penalty=1.3
  const pCondSpar = getInterferencePenalty('CONDITIONING', 'SPARRING', 0);
  assertClose('CONDITIONING→SPARRING at 0h = 1.3', pCondSpar, 1.3, 0.001);

  // POWER → SPARRING base=1.2, at 0h: penalty=1.2
  const pPowSpar = getInterferencePenalty('POWER', 'SPARRING', 0);
  assertClose('POWER→SPARRING at 0h = 1.2', pPowSpar, 1.2, 0.001);

  // SKILL → HEAVY_STRENGTH base=1.1, at 0h: penalty=1.1
  const pSkillStr = getInterferencePenalty('SKILL', 'HEAVY_STRENGTH', 0);
  assertClose('SKILL→HEAVY_STRENGTH at 0h = 1.1', pSkillStr, 1.1, 0.001);

  // HEAVY_STRENGTH → HEAVY_STRENGTH base=1 (no self-interference), penalty=1
  const pSelfStr = getInterferencePenalty('HEAVY_STRENGTH', 'HEAVY_STRENGTH', 0);
  assert('HEAVY_STRENGTH→HEAVY_STRENGTH = 1 (no self-interference)', pSelfStr === 1);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
