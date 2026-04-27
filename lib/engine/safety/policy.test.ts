import {
  FIGHT_CAMP_SAFETY_POLICY,
  computeRehydrationFluidTargetLiters,
  getFightCampSodiumRestrictionInterpretation,
  getFightWeekCutHydrationInstruction,
  getFightWeekCutSodiumInstruction,
  getFightWeekCutWaterTargetOz,
  getFightWeekLoadHydrationMultiplier,
  getSafeFightCampSodiumRestrictionDetail,
  hasUnsafeFightCampSodiumLanguage,
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
assert('unsafe sodium language detects water dump', hasUnsafeFightCampSodiumLanguage('Minimal sodium. Water dump starts now.'));
assert('safe sodium detail sanitizes unsafe language', !getSafeFightCampSodiumRestrictionDetail('Zero sodium until weigh-in.').toLowerCase().includes('zero sodium'));
assert('safe sodium detail preserves non-aggressive instruction', getSafeFightCampSodiumRestrictionDetail('Reduced sodium only if prescribed.') === 'Reduced sodium only if prescribed.');
assert('sodium target at restriction threshold produces interpretation', getFightCampSodiumRestrictionInterpretation({ sodiumTargetMg: 500 }) != null);
assert('fight-week load multiplier uses high-load phase at 6 days out', getFightWeekLoadHydrationMultiplier(6) === 2);
assert('fight-week cut target maps 2 days out to 32 oz', getFightWeekCutWaterTargetOz(2) === 32);
assert('fight-week cut instruction avoids water restriction language', !getFightWeekCutHydrationInstruction(32).toLowerCase().includes('water restriction'));
assert('fight-week cut sodium avoids zero-sodium language', !getFightWeekCutSodiumInstruction(2).toLowerCase().includes('zero sodium'));
assert('rehydration helper clamps over-target weight to zero liters', computeRehydrationFluidTargetLiters({ currentWeight: 172, targetWeight: 170 }) === 0);
assert('rehydration helper preserves under-target fluid math', computeRehydrationFluidTargetLiters({ currentWeight: 165, targetWeight: 170 }) === 3.5);

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
