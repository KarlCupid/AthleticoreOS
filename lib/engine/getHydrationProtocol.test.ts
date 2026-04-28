import { getCutHydrationProtocol, getHydrationProtocol } from './getHydrationProtocol.ts';

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

function assertThrows(label: string, fn: () => void) {
  try {
    fn();
    failed++;
    console.error(`  FAIL ${label} (expected throw)`);
  } catch {
    passed++;
    console.log(`  PASS ${label}`);
  }
}

console.log('\n-- getHydrationProtocol safety-first --');

(() => {
  const result = getHydrationProtocol({
    phase: 'off-season',
    fightStatus: 'amateur',
    currentWeightLbs: 150,
    targetWeightLbs: 140,
  });

  assert('baseline target uses body mass', result.dailyWaterOz === 101);
  assert('no water loading is generated', result.waterLoadOz === null);
  assert('no shed cap is generated', result.shedCapPercent === 0 && result.shedCapLbs === 0);
})();

(() => {
  const result = getHydrationProtocol({
    phase: 'fight-camp',
    fightStatus: 'pro',
    currentWeightLbs: 150,
    targetWeightLbs: 140,
  });

  assert('fight camp uses only small baseline support multiplier', result.dailyWaterOz === 111);
  assert('message does not include loading language', !result.message.toLowerCase().includes('load'));
})();

(() => {
  const result = getHydrationProtocol({
    phase: 'pre-camp',
    fightStatus: 'amateur',
    currentWeightLbs: 180,
    targetWeightLbs: 170,
    weeklyVelocityLbs: -2.5,
  });

  assert('rapid body-mass change adds conservative support', result.dailyWaterOz > Math.round(180 * 0.67 * 1.05));
  assert('rapid trend message asks for review', result.message.includes('review the trend'));
})();

(() => {
  assertThrows('zero weight throws', () => getHydrationProtocol({
    phase: 'off-season',
    fightStatus: 'amateur',
    currentWeightLbs: 0,
    targetWeightLbs: 0,
  }));
})();

(() => {
  const result = getCutHydrationProtocol({
    cutPhase: 'fight_week_cut',
    daysToWeighIn: 2,
    currentWeightLbs: 170,
    baseHydrationOz: 120,
    fightStatus: 'amateur',
  });

  assert('cut hydration returns baseline amount', result.dailyWaterOz === 120);
  assert('cut hydration never restricts', result.isRestricting === false);
  assert('cut hydration rejects acute fluid tactics', result.instruction.includes('does not generate acute'));
})();

(() => {
  const result = getCutHydrationProtocol({
    cutPhase: 'weigh_in',
    daysToWeighIn: 0,
    currentWeightLbs: 160,
    baseHydrationOz: 0,
    fightStatus: 'pro',
  });

  assert('weigh-in fallback uses baseline body mass formula', result.dailyWaterOz === 107);
  assert('weigh-in still does not restrict', !result.isRestricting);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
