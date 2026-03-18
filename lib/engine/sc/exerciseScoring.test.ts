import { getExerciseRecoveryCost, scoreExerciseCandidate } from './exerciseScoring.ts';

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

console.log('\n-- sc/exerciseScoring --');

(() => {
  // Recovery cost with explicit normalized_recovery_cost
  const exNormalized = {
    id: '1', name: 'Bench Press', type: 'heavy_lift' as any, cns_load: 8,
    muscle_group: 'chest' as any, equipment: 'barbell' as any,
    description: '', cues: '', sport_tags: [],
    normalized_recovery_cost: 22,
  };
  assert('Uses normalized_recovery_cost when present', getExerciseRecoveryCost(exNormalized) === 22);

  // Recovery cost calculation when normalized_recovery_cost is absent
  // cns_load=8, eccentric_damage=undefined → fallback = max(1, min(5, round(8/2))) = 4
  // recovery_hours=undefined → cns>=8 → 48
  // cost = (8*2) + (4*2) + (48/12) = 16 + 8 + 4 = 28
  const exHeavy = {
    id: '2', name: 'Deadlift', type: 'heavy_lift' as any, cns_load: 8,
    muscle_group: 'posterior_chain' as any, equipment: 'barbell' as any,
    description: '', cues: '', sport_tags: [],
  };
  assert('Heavy exercise recovery cost (cns=8) → 28', getExerciseRecoveryCost(exHeavy) === 28);

  // cns_load=4, eccentric_damage=undefined → round(4/2)=2
  // recovery_hours=undefined → cns<5 → 24
  // cost = (4*2) + (2*2) + (24/12) = 8 + 4 + 2 = 14
  const exLight = {
    id: '3', name: 'Band Pull Apart', type: 'accessory' as any, cns_load: 4,
    muscle_group: 'shoulders' as any, equipment: 'band' as any,
    description: '', cues: '', sport_tags: [],
  };
  assert('Light exercise recovery cost (cns=4) → 14', getExerciseRecoveryCost(exLight) === 14);

  // cns_load=6, explicit eccentric_damage=3, explicit recovery_hours=36
  // cost = (6*2) + (3*2) + (36/12) = 12 + 6 + 3 = 21
  const exMid = {
    id: '4', name: 'Romanian Deadlift', type: 'compound' as any, cns_load: 6,
    muscle_group: 'posterior_chain' as any, equipment: 'barbell' as any,
    description: '', cues: '', sport_tags: [],
    eccentric_damage: 3 as 3, recovery_hours: 36,
  };
  assert('Mid exercise with explicit fields → 21', getExerciseRecoveryCost(exMid) === 21);

  // scoreExerciseCandidate: Prime readiness (no penalty)
  const ctx = (state: string, acwr: number) => ({
    readinessState: state as any,
    phase: 'off-season' as any,
    acwr,
    recentExerciseIds: [],
    recentMuscleVolume: {} as any,
    cnsBudgetRemaining: 50,
    fitnessLevel: 'intermediate' as any,
  });

  const scorePrime = scoreExerciseCandidate(exHeavy, 80, ctx('Prime', 1.0));
  assert('Prime readiness: no recovery cost penalty', scorePrime.recoveryCost === 28);
  assert('Prime readiness: fitScore passes through', scorePrime.fitScore === 80);

  // Caution adds +4 to recovery cost
  const scoreCaution = scoreExerciseCandidate(exHeavy, 80, ctx('Caution', 1.0));
  assert('Caution readiness adds +4 to recovery cost (→ 32)', scoreCaution.recoveryCost === 32);

  // Depleted adds +12 to recovery cost
  const scoreDepleted = scoreExerciseCandidate(exHeavy, 80, ctx('Depleted', 1.0));
  assert('Depleted readiness adds +12 to recovery cost (→ 40)', scoreDepleted.recoveryCost === 40);

  // High ACWR (>1.4) with high cns_load (>=7) adds +10
  const scoreHighACWR = scoreExerciseCandidate(exHeavy, 80, ctx('Prime', 1.5));
  assert('High ACWR + high CNS adds +10 (→ 38)', scoreHighACWR.recoveryCost === 38);

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
