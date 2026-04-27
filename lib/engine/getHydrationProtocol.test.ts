/**
 * Standalone test for lib/engine/getHydrationProtocol.ts
 */

import { getHydrationProtocol, getCutHydrationProtocol } from './getHydrationProtocol.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} ±${tolerance})`); }
}

function assertThrows(label: string, fn: () => void) {
  try { fn(); failed++; console.error(`  FAIL ${label} (expected throw)`); }
  catch { passed++; console.log(`  PASS ${label}`); }
}

console.log('\n-- getHydrationProtocol --');

// === Base formula: weight * 0.67 * phaseMultiplier ===
(() => {
  const r = getHydrationProtocol({
    phase: 'off-season', fightStatus: 'amateur', currentWeightLbs: 150, targetWeightLbs: 140,
  });
  // base = 150 * 0.67 = 100.5, * 1.0 = round(100.5) = 101
  assert('Off-season 150lb → 101 oz', r.dailyWaterOz === 101);
  assert('Off-season waterLoadOz is null', r.waterLoadOz === null);
})();

(() => {
  const r = getHydrationProtocol({
    phase: 'pre-camp', fightStatus: 'amateur', currentWeightLbs: 150, targetWeightLbs: 140,
  });
  // 100.5 * 1.15 = 115.575 → round = 116
  assert('Pre-camp 150lb → 116 oz', r.dailyWaterOz === 116);
  assert('Pre-camp waterLoadOz is null', r.waterLoadOz === null);
})();

(() => {
  const r = getHydrationProtocol({
    phase: 'fight-camp', fightStatus: 'amateur', currentWeightLbs: 150, targetWeightLbs: 140,
  });
  // 100.5 * 1.3 = 130.65 → round = 131
  assert('Fight-camp 150lb → 131 oz', r.dailyWaterOz === 131);
  // waterLoadOz = round(100.5 * 0.5) = round(50.25) = 50
  assert('Fight-camp waterLoadOz = 50', r.waterLoadOz === 50);
})();

// Camp sub-phases also get 1.3 multiplier
(() => {
  const phases = ['camp-base', 'camp-build', 'camp-peak', 'camp-taper'] as const;
  for (const phase of phases) {
    const r = getHydrationProtocol({
      phase, fightStatus: 'pro', currentWeightLbs: 150, targetWeightLbs: 140,
    });
    assert(`${phase} uses 1.3 multiplier → 131 oz`, r.dailyWaterOz === 131);
    assert(`${phase} has waterLoadOz`, r.waterLoadOz !== null);
  }
})();

// === Shed caps ===
(() => {
  const amateur = getHydrationProtocol({
    phase: 'off-season', fightStatus: 'amateur', currentWeightLbs: 150, targetWeightLbs: 140,
  });
  assert('Amateur shed cap is 3%', amateur.shedCapPercent === 3);
  assertClose('Amateur shedCapLbs = 4.5', amateur.shedCapLbs, 4.5, 0.01);

  const pro = getHydrationProtocol({
    phase: 'off-season', fightStatus: 'pro', currentWeightLbs: 150, targetWeightLbs: 140,
  });
  assert('Pro shed cap is 5%', pro.shedCapPercent === 5);
  assertClose('Pro shedCapLbs = 7.5', pro.shedCapLbs, 7.5, 0.01);
})();

// === Velocity boost ===
(() => {
  const noBoost = getHydrationProtocol({
    phase: 'pre-camp', fightStatus: 'pro', currentWeightLbs: 180, targetWeightLbs: 170,
    weeklyVelocityLbs: -1.5,
  });
  const withBoost = getHydrationProtocol({
    phase: 'pre-camp', fightStatus: 'pro', currentWeightLbs: 180, targetWeightLbs: 170,
    weeklyVelocityLbs: -2.5,
  });
  // -2.5: boost = min(16, round((2.5-2.0)*8+8)) = min(16, round(12)) = 12
  assert('No boost when velocity > -2.0', noBoost.dailyWaterOz === Math.round(180 * 0.67 * 1.15));
  assert('Boost added for velocity -2.5', withBoost.dailyWaterOz === Math.round(180 * 0.67 * 1.15) + 12);
  assert('Boost message mentions recovery', withBoost.message.includes('aggressive cut recovery'));
})();

(() => {
  const capped = getHydrationProtocol({
    phase: 'off-season', fightStatus: 'pro', currentWeightLbs: 180, targetWeightLbs: 170,
    weeklyVelocityLbs: -4.0,
  });
  // boost = min(16, round((4.0-2.0)*8+8)) = min(16, 24) = 16
  const base = Math.round(180 * 0.67 * 1.0);
  assert('Velocity boost capped at 16 oz', capped.dailyWaterOz === base + 16);
})();

// === Zero/invalid weight ===
(() => {
  assertThrows('Zero weight throws', () => getHydrationProtocol({
    phase: 'off-season', fightStatus: 'amateur', currentWeightLbs: 0, targetWeightLbs: 0,
  }));
})();

// === getCutHydrationProtocol ===
console.log('\n-- getCutHydrationProtocol --');

(() => {
  const r = getCutHydrationProtocol({
    cutPhase: 'chronic', daysToWeighIn: 30, currentWeightLbs: 170, baseHydrationOz: 100, fightStatus: 'amateur',
  });
  assert('Chronic phase: oz = round(100*1.05) = 105', r.dailyWaterOz === 105);
  assert('Chronic not restricting', r.isRestricting === false);
})();

(() => {
  const r = getCutHydrationProtocol({
    cutPhase: 'intensified', daysToWeighIn: 14, currentWeightLbs: 170, baseHydrationOz: 100, fightStatus: 'amateur',
  });
  assert('Intensified phase: oz = round(100*1.15) = 115', r.dailyWaterOz === 115);
})();

(() => {
  const r6 = getCutHydrationProtocol({
    cutPhase: 'fight_week_load', daysToWeighIn: 6, currentWeightLbs: 170, baseHydrationOz: 100, fightStatus: 'pro',
  });
  assert('Fight week load 6d: oz = round(100*2.0) = 200', r6.dailyWaterOz === 200);
  assert('Fight week load 6d sodium elevated', r6.sodiumInstruction.includes('elevated'));
  assert('Fight week load avoids aggressive drinking copy', !r6.instruction.toLowerCase().includes('drink aggressively'));

  const r5 = getCutHydrationProtocol({
    cutPhase: 'fight_week_load', daysToWeighIn: 5, currentWeightLbs: 170, baseHydrationOz: 100, fightStatus: 'pro',
  });
  assert('Fight week load 5d: oz = round(100*1.5) = 150', r5.dailyWaterOz === 150);
  assert('Fight week load 5d sodium predictable', r5.sodiumInstruction.includes('predictable'));
})();

(() => {
  const r3 = getCutHydrationProtocol({
    cutPhase: 'fight_week_cut', daysToWeighIn: 3, currentWeightLbs: 170, baseHydrationOz: 120, fightStatus: 'amateur',
  });
  assert('Fight week cut day 3: oz = 64', r3.dailyWaterOz === 64);
  assert('Day 3 sodium stays reduced but supervised', r3.sodiumInstruction.includes('Reduced sodium'));
  assert('Day 3 is restricting', r3.isRestricting === true);
  assert('Day 3 avoids water restriction copy', !r3.instruction.toLowerCase().includes('water restriction'));

  const r2 = getCutHydrationProtocol({
    cutPhase: 'fight_week_cut', daysToWeighIn: 2, currentWeightLbs: 170, baseHydrationOz: 120, fightStatus: 'amateur',
  });
  assert('Fight week cut day 2: oz = 32', r2.dailyWaterOz === 32);
  assert('Day 2 avoids zero-sodium recommendation', !r2.sodiumInstruction.toLowerCase().includes('zero added sodium'));

  const r1 = getCutHydrationProtocol({
    cutPhase: 'fight_week_cut', daysToWeighIn: 1, currentWeightLbs: 170, baseHydrationOz: 120, fightStatus: 'amateur',
  });
  assert('Fight week cut day 1: oz = 16', r1.dailyWaterOz === 16);
})();

(() => {
  const r = getCutHydrationProtocol({
    cutPhase: 'weigh_in', daysToWeighIn: 0, currentWeightLbs: 160, baseHydrationOz: 100, fightStatus: 'pro',
  });
  assert('Weigh-in: oz = 8', r.dailyWaterOz === 8);
  assert('Weigh-in is restricting', r.isRestricting === true);
  assert('Weigh-in avoids zero-sodium recommendation', !r.sodiumInstruction.toLowerCase().includes('zero sodium until'));
})();

(() => {
  const r = getCutHydrationProtocol({
    cutPhase: 'rehydration', daysToWeighIn: 0, currentWeightLbs: 160, baseHydrationOz: 100, fightStatus: 'pro',
  });
  // oz = round(160 * 0.7) = 112
  assert('Rehydration: oz = round(160*0.7) = 112', r.dailyWaterOz === 112);
  assert('Rehydration not restricting', r.isRestricting === false);
  assert('Rehydration mentions ORS', r.sodiumInstruction.includes('ORS'));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
