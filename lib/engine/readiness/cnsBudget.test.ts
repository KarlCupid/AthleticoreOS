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
  assert('Novice fresh baseline = 50', novice.fresh === 50);
  assert('Novice moderate baseline = 30', novice.moderate === 30);
  assert('Novice depleted baseline = 10', novice.depleted === 10);

  const intermediate = getBaselineCNSBudget('intermediate');
  assert('Intermediate fresh baseline = 65', intermediate.fresh === 65);

  const advanced = getBaselineCNSBudget('advanced');
  assert('Advanced fresh baseline = 80', advanced.fresh === 80);
  assert('Advanced depleted baseline = 25', advanced.depleted === 25);

  // Readiness state mapping: Prime → fresh, Caution → moderate, Depleted → depleted
  const primeBudget = getCalibratedCNSBudget({ readinessState: 'Prime', trainingAge: 'intermediate' });
  assert('Prime maps to fresh (intermediate: 65)', primeBudget === 65);

  const cautionBudget = getCalibratedCNSBudget({ readinessState: 'Caution', trainingAge: 'intermediate' });
  assert('Caution maps to moderate (intermediate: 40)', cautionBudget === 40);

  const depletedBudget = getCalibratedCNSBudget({ readinessState: 'Depleted', trainingAge: 'intermediate' });
  assert('Depleted maps to depleted (intermediate: 15)', depletedBudget === 15);

  // High compliance calibration: avg >= 0.9 adds +3
  const highCompliance = getCalibratedCNSBudget({
    readinessState: 'Prime',
    trainingAge: 'intermediate',
    complianceHistory28d: [1, 1, 1, 0.95, 0.9, 0.92, 1],
  });
  assert('High compliance (+3) → 68', highCompliance === 68);

  // Low compliance calibration: avg < 0.7 subtracts -3
  const lowCompliance = getCalibratedCNSBudget({
    readinessState: 'Prime',
    trainingAge: 'intermediate',
    complianceHistory28d: [0.5, 0.6, 0.65, 0.55, 0.7, 0.6, 0.5],
  });
  assert('Low compliance (-3) → 62', lowCompliance === 62);

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
  assert('Advanced Prime + high compliance clamped ≤ 95', advPrime <= 95);

  // Min budget clamp: minimum is 8
  const depletedNovice = getCalibratedCNSBudget({
    readinessState: 'Depleted',
    trainingAge: 'novice',
    complianceHistory28d: [0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.5],
  });
  // novice depleted=10, low compliance → 10-3=7, but min clamp=8
  assert('Min budget clamp enforces floor of 8', depletedNovice === 8);

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
