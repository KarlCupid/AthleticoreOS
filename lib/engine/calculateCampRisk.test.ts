import { calculateCampRisk } from './calculateCampRisk.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  ? ${label}`);
    passed++;
  } else {
    console.error(`  ? ${label}`);
    failed++;
  }
}

console.log('\n-- calculateCampRisk --');

(() => {
  const result = calculateCampRisk({
    goalMode: 'build_phase',
    weightClassState: 'none',
    daysOut: null,
  });
  assert('performance block returns null', result === null);
})();

(() => {
  const result = calculateCampRisk({
    goalMode: 'fight_camp',
    weightClassState: 'driving',
    daysOut: 6,
    remainingWeightLbs: 6.2,
    weighInTiming: 'same_day',
    readinessAvg: 3.8,
    readinessDelta: -2.1,
    acwrRatio: 1.53,
    recommendationFollowThroughPct: 42,
    isTravelWindow: true,
  });

  assert('high-pressure camp yields risk object', result !== null);
  assert('high-pressure camp reaches critical risk', (result?.level ?? 'low') === 'critical');
  assert('projected status mentions high risk', (result?.projectedMakeWeightStatus ?? '').includes('High risk'));
  assert('same-day constraint is called out', (result?.projectedMakeWeightStatus ?? '').includes('same-day'));
})();

(() => {
  const result = calculateCampRisk({
    goalMode: 'fight_camp',
    weightClassState: 'monitoring',
    daysOut: 40,
    remainingWeightLbs: 1.6,
    weighInTiming: 'next_day',
    readinessAvg: 6.5,
    readinessDelta: -0.2,
    acwrRatio: 1.02,
    recommendationFollowThroughPct: 80,
    isTravelWindow: false,
  });

  assert('monitoring scenario remains below high', (result?.score ?? 100) < 55);
  assert('monitoring scenario stays above low-risk floor', (result?.score ?? 0) >= 25);
})();

(() => {
  const input = {
    goalMode: 'fight_camp' as const,
    weightClassState: 'none' as const,
    daysOut: 60,
    remainingWeightLbs: 0,
    weighInTiming: 'next_day' as const,
    readinessAvg: 7.1,
    readinessDelta: 0.1,
    acwrRatio: 1.0,
    recommendationFollowThroughPct: 100,
    isTravelWindow: false,
  };

  const first = calculateCampRisk(input);
  const second = calculateCampRisk(input);

  assert('low-risk scenario reports on trajectory', first?.projectedMakeWeightStatus === 'On weight trajectory');
  assert('risk scoring is deterministic', JSON.stringify(first) === JSON.stringify(second));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);


