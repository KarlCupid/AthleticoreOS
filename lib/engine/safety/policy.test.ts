import {
  FIGHT_CAMP_SAFETY_POLICY,
  computeRehydrationFluidTargetLiters,
  evaluateWeightClassPlanSafety,
  getFightCampSodiumRestrictionInterpretation,
  getFightWeekCutHydrationInstruction,
  getFightWeekCutSodiumInstruction,
  getFightWeekCutWaterTargetOz,
  getFightWeekLoadHydrationMultiplier,
  getSafeFightCampSodiumRestrictionDetail,
  hasUnsafeFightCampSodiumLanguage,
  getPolicyFightWeekBodyMassChangePct,
} from './policy.ts';

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

console.log('\n-- safety/policy --');

assert('shared guided minimum is 20 minutes', FIGHT_CAMP_SAFETY_POLICY.scheduling.minimumGuidedSessionMin === 20);
assert('unsafe sodium language is still detected', hasUnsafeFightCampSodiumLanguage('Minimal sodium. Water dump starts now.'));
assert('unsafe sodium detail is sanitized', !getSafeFightCampSodiumRestrictionDetail('Zero sodium until weigh-in.').toLowerCase().includes('zero sodium'));
assert('safe sodium detail preserves normal instruction', getSafeFightCampSodiumRestrictionDetail('Normal and predictable.') === 'Normal and predictable.');
assert('low sodium target produces support interpretation', getFightCampSodiumRestrictionInterpretation({ sodiumTargetMg: 500 }) != null);
assert('fight-week support multiplier no longer loads fluids', getFightWeekLoadHydrationMultiplier(6) === 1);
assert('fight-week support target is baseline support', getFightWeekCutWaterTargetOz(2) === 96);
assert('fight-week support instruction avoids restriction language', !getFightWeekCutHydrationInstruction(96).toLowerCase().includes('restriction'));
assert('fight-week sodium stays normal', getFightWeekCutSodiumInstruction(2).includes('Normal'));
assert('post weigh-in fluid helper no longer forces catch-up math', computeRehydrationFluidTargetLiters({ currentWeight: 165, targetWeight: 170 }) === 0);
assert('policy fight-week body-mass change allocation is zero', getPolicyFightWeekBodyMassChangePct({ fightStatus: 'pro', athleteAge: 25, weighInTiming: 'next_day' }) === 0);

(() => {
  const warnings = evaluateWeightClassPlanSafety({
    startWeight: 180,
    targetWeight: 160,
    totalCutLbs: 20,
    totalCutPct: 11.1,
    daysToWeighIn: 5,
    fightStatus: 'amateur',
    athleteAge: 25,
    weighInTiming: 'next_day',
    fightWeekBodyMassChangeLbs: 0,
    dietPhaseTargetLbs: 20,
    dietPhaseDays: 5,
  });

  assert('unsafe target creates medical warning', warnings[0]?.tier === 'medical');
  assert('warning blocks rapid scale protocol language', warnings[0]?.message.includes('blocked') === true);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
