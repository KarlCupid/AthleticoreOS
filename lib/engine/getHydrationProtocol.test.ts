/**
 * Standalone test script for lib/engine/getHydrationProtocol.ts
 */

import { getHydrationProtocol, getCutHydrationProtocol } from '.ts';

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

console.log('\n-- getHydrationProtocol --');

(() => {
  const off = getHydrationProtocol({
    phase: 'off-season',
    fightStatus: 'amateur',
    currentWeightLbs: 170,
    targetWeightLbs: 160,
  });

  const camp = getHydrationProtocol({
    phase: 'fight-camp',
    fightStatus: 'amateur',
    currentWeightLbs: 170,
    targetWeightLbs: 160,
  });

  assert('Fight-camp hydration exceeds off-season', camp.dailyWaterOz > off.dailyWaterOz);
  assert('Fight-camp includes water loading target', camp.waterLoadOz !== null);
})();

(() => {
  const normal = getHydrationProtocol({
    phase: 'pre-camp',
    fightStatus: 'pro',
    currentWeightLbs: 180,
    targetWeightLbs: 170,
    weeklyVelocityLbs: -1.5,
  });

  const aggressive = getHydrationProtocol({
    phase: 'pre-camp',
    fightStatus: 'pro',
    currentWeightLbs: 180,
    targetWeightLbs: 170,
    weeklyVelocityLbs: -3.2,
  });

  assert('Aggressive loss adds hydration boost', aggressive.dailyWaterOz > normal.dailyWaterOz);
})();

(() => {
  const cut = getCutHydrationProtocol({
    cutPhase: 'fight_week_cut',
    daysToWeighIn: 2,
    currentWeightLbs: 170,
    baseHydrationOz: 120,
    fightStatus: 'amateur',
  });

  assert('Fight-week cut day-2 target is 32 oz', cut.dailyWaterOz === 32);
  assert('Fight-week cut marks restricting state', cut.isRestricting === true);
})();

(() => {
  const rehyd = getCutHydrationProtocol({
    cutPhase: 'rehydration',
    daysToWeighIn: 0,
    currentWeightLbs: 160,
    baseHydrationOz: 100,
    fightStatus: 'pro',
  });

  assert('Rehydration target is positive', rehyd.dailyWaterOz > 0);
  assert('Rehydration is not restricting', rehyd.isRestricting === false);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
