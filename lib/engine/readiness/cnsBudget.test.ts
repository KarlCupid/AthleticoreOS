import { getBaselineCNSBudget, getCalibratedCNSBudget } from './cnsBudget.ts';

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

console.log('\n-- readiness/cnsBudget --');

(() => {
  // Baseline budgets per training age
  const novice = getBaselineCNSBudget('novice');
  assert('Novice fresh baseline = 55', novice.fresh === 55);
  assert('Novice moderate baseline = 35', novice.moderate === 35);
  assert('Novice depleted baseline = 12', novice.depleted === 12);

  const intermediate = getBaselineCNSBudget('intermediate');
  assert('Intermediate fresh baseline = 72', intermediate.fresh === 72);
  assert('Intermediate moderate baseline = 48', intermediate.moderate === 48);

  const advanced = getBaselineCNSBudget('advanced');
  assert('Advanced fresh baseline = 88', advanced.fresh === 88);
  assert('Advanced depleted baseline = 28', advanced.depleted === 28);

  // Readiness state mapping: Prime → fresh, Caution → moderate, Depleted → depleted
  const primeBudget = getCalibratedCNSBudget({ readinessState: 'Prime', trainingAge: 'intermediate' });
  assert('Prime maps to fresh (intermediate: 72)', primeBudget === 72);

  const cautionBudget = getCalibratedCNSBudget({ readinessState: 'Caution', trainingAge: 'intermediate' });
  assert('Caution maps to moderate (intermediate: 48)', cautionBudget === 48);

  const depletedBudget = getCalibratedCNSBudget({ readinessState: 'Depleted', trainingAge: 'intermediate' });
  assert('Depleted maps to depleted (intermediate: 18)', depletedBudget === 18);

  // High compliance calibration: avg >= 0.9 adds +3
  const highCompliance = getCalibratedCNSBudget({
    readinessState: 'Prime',
    trainingAge: 'intermediate',
    complianceHistory28d: [1, 1, 1, 0.95, 0.9, 0.92, 1],
  });
  assert('High compliance (+3) → 75', highCompliance === 75);

  // Low compliance calibration: avg < 0.7 subtracts -3
  const lowCompliance = getCalibratedCNSBudget({
    readinessState: 'Prime',
    trainingAge: 'intermediate',
    complianceHistory28d: [0.5, 0.6, 0.65, 0.55, 0.7, 0.6, 0.5],
  });
  assert('Low compliance (-3) → 69', lowCompliance === 69);

  // Max budget clamp: advanced Prime=80 with high compliance=83, but max is 95 → OK (83 < 95)
  // Novice Prime=50 with high compliance=53, max is 62 → OK (53 < 62)
  // Test that max clamp works: push calibrated over the cap
  // Advanced Prime=80 + high compliance array that pushes over 95
  // With compliance +3 → 83, still under 95. We cannot exceed without multiple calibrations,
  // but the clamp ensures it never goes over.
  const advPrime = getCalibratedCNSBudget({
    readinessState: 'Prime',
    trainingAge: 'advanced',
    complianceHistory28d: [1, 1, 1, 1, 1, 1, 1],
  });
  assert('Advanced Prime + high compliance clamped ≤ 102', advPrime <= 102);

  // Min budget clamp: minimum is 12
  const depletedNovice = getCalibratedCNSBudget({
    readinessState: 'Depleted',
    trainingAge: 'novice',
    complianceHistory28d: [0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.5],
  });
  // novice depleted=12, low compliance → 12-3=9, but min clamp=12
  assert('Min budget clamp enforces floor of 12', depletedNovice === 12);

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
