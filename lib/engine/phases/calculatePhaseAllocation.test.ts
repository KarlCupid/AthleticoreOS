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

// --- New tests: short camp (<=21 days) always has gpp=0 ---
(() => {
  const camp7 = calculatePhaseAllocation(7);
  assert('7-day camp has 0 GPP', camp7.gpp === 0);
  assert('7-day camp is shortCamp=true', camp7.shortCamp === true);

  const camp21 = calculatePhaseAllocation(21);
  assert('21-day camp has 0 GPP', camp21.gpp === 0);
  assert('21-day camp is shortCamp=true', camp21.shortCamp === true);
  assert('21-day camp: all phases sum to total days', camp21.gpp + camp21.spp + camp21.peak + camp21.taper === 21);
})();

// --- New tests: medium camp (22-42 days) distribution ---
(() => {
  const camp30 = calculatePhaseAllocation(30);
  assert('30-day camp is NOT shortCamp', camp30.shortCamp === false);
  assert('30-day camp has non-zero GPP', camp30.gpp > 0);
  // remaining = 30 - taper - peak, gpp = floor(remaining * 0.25)
  // taper = round(clamp(30*0.10, 5, 10)) = round(3) clamped to 5
  // peak = round(clamp(30*0.15, 5, 14)) = round(4.5) clamped to 5
  // remaining = 30 - 5 - 5 = 20, gpp = floor(20*0.25) = 5
  assert('30-day camp gpp = 5', camp30.gpp === 5);
  assert('30-day camp phases sum to 30', camp30.gpp + camp30.spp + camp30.peak + camp30.taper === 30);

  const camp42 = calculatePhaseAllocation(42);
  assert('42-day camp is NOT shortCamp', camp42.shortCamp === false);
  assert('42-day camp phases sum to 42', camp42.gpp + camp42.spp + camp42.peak + camp42.taper === 42);
})();

// --- New tests: long camp (>42 days) distribution ---
(() => {
  const camp60 = calculatePhaseAllocation(60);
  assert('60-day camp is NOT shortCamp', camp60.shortCamp === false);
  // taper = round(clamp(60*0.10, 5, 10)) = round(6) = 6
  // peak = round(clamp(60*0.15, 5, 14)) = round(9) = 9
  // remaining = 60 - 6 - 9 = 45, gpp = floor(45*0.55) = 24
  assert('60-day camp gpp = 24 (55% of remaining)', camp60.gpp === 24);
  assert('60-day camp phases sum to 60', camp60.gpp + camp60.spp + camp60.peak + camp60.taper === 60);
  assert('60-day camp gpp > spp (long camp)', camp60.gpp > camp60.spp);
})();

// --- New tests: taper and peak clamps ---
(() => {
  // Very short camp: taper should clamp to minimum 5
  const camp10 = calculatePhaseAllocation(10);
  assert('10-day camp taper clamped to minimum 5', camp10.taper >= 5);
  assert('10-day camp peak clamped to minimum 5', camp10.peak >= 5);

  // Very long camp: taper should clamp to maximum 10, peak to maximum 14
  const camp120 = calculatePhaseAllocation(120);
  assert('120-day camp taper clamped to maximum 10', camp120.taper <= 10);
  assert('120-day camp peak clamped to maximum 14', camp120.peak <= 14);
  assert('120-day camp phases sum to 120', camp120.gpp + camp120.spp + camp120.peak + camp120.taper === 120);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
