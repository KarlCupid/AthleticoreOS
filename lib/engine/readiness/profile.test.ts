import {
  deriveReadinessProfile,
  deriveStimulusConstraintSet,
} from './profile.ts';

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

function makeProfileInput(overrides: Record<string, any> = {}) {
  return {
    sleepQuality: 4,
    subjectiveReadiness: 4,
    confidenceLevel: 4,
    stressLevel: 2,
    sorenessLevel: 2,
    acwrRatio: 1.05,
    readinessHistory: [4, 4, 4, 4],
    ...overrides,
  };
}

console.log('\n── readiness profile ──');

(() => {
  const profile = deriveReadinessProfile(makeProfileInput({
    activationRPE: 7,
    expectedActivationRPE: 4,
  }));
  const constraints = deriveStimulusConstraintSet(profile, {
    phase: 'camp-build',
    goalMode: 'fight_camp',
    daysOut: 21,
  });

  assert('low neural blocks max velocity', constraints.blockedStimuli.includes('max_velocity'));
  assert('low neural still allows controlled strength', constraints.allowedStimuli.includes('controlled_strength'));
})();

(() => {
  const profile = deriveReadinessProfile(makeProfileInput({
    sorenessLevel: 5,
    recentHighImpactCount48h: 2,
    recentSparringCount48h: 2,
  }));
  const constraints = deriveStimulusConstraintSet(profile, {
    phase: 'camp-build',
    goalMode: 'fight_camp',
    daysOut: 18,
  });

  assert('low structural blocks high impact', constraints.blockedStimuli.includes('high_impact'));
  assert('low structural blocks hard sparring', constraints.blockedStimuli.includes('hard_sparring'));
})();

(() => {
  const profile = deriveReadinessProfile(makeProfileInput({
    sleepQuality: 2,
    energyLevel: 2,
    fuelHydrationStatus: 2,
    externalHeartRateLoad: 70,
    bodyMassIntensityCap: 4,
    hasActiveWeightClassPlan: true,
    urineColor: 6,
  }));
  const constraints = deriveStimulusConstraintSet(profile, {
    phase: 'camp-peak',
    goalMode: 'fight_camp',
    daysOut: 12,
  });

  assert('low metabolic blocks glycolytic conditioning', constraints.blockedStimuli.includes('glycolytic_conditioning'));
  assert('low metabolic retains aerobic conditioning', constraints.allowedStimuli.includes('aerobic_conditioning'));
  assert('low fuel/fluids adds metabolic limiter flag', profile.flags.some((flag) => flag.code === 'fuel_hydration_limiter'));
})();

(() => {
  const profile = deriveReadinessProfile(makeProfileInput({
    sorenessLevel: 4,
    painLevel: 4,
  }));
  const constraints = deriveStimulusConstraintSet(profile, {
    phase: 'camp-build',
    goalMode: 'fight_camp',
    daysOut: 18,
  });

  assert('pain restriction adds structural flag', profile.flags.some((flag) => flag.code === 'pain_restriction'));
  assert('pain restriction blocks high impact', constraints.blockedStimuli.includes('high_impact'));
})();

(() => {
  const dropping = deriveReadinessProfile(makeProfileInput({
    readinessHistory: [5, 4, 4, 3, 3, 2, 2],
  }));
  const rebounding = deriveReadinessProfile(makeProfileInput({
    readinessHistory: [2, 2, 3, 3, 4, 4, 5],
  }));

  assert('trend detects dropping readiness', dropping.trend === 'dropping');
  assert('trend detects rebounding readiness', rebounding.trend === 'rebounding');
})();

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
