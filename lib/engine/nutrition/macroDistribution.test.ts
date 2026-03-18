import { getProteinTarget, distributeMacros } from './macroDistribution.ts';

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

console.log('\n-- nutrition/macroDistribution --');

(() => {
  // getProteinTarget: base protein at 0% deficit
  // baseProtein=1.0, deficitScaler=min(max(0,0)*2.0, 0.4)=0, so 180 * (1.0+0) * 1 = 180
  const p0 = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0 });
  assert('0% deficit → 1.0 g/lb baseline (180 lbs → 180g)', p0 === 180);

  // getProteinTarget: 10% deficit
  // deficitScaler = min(max(0, 0.10)*2.0, 0.4) = min(0.20, 0.4) = 0.20
  // 180 * (1.0 + 0.20) * 1 = 216
  const p10 = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0.10 });
  assert('10% deficit scales protein up (180 lbs → 216g)', p10 === 216);

  // getProteinTarget: 25% deficit
  // deficitScaler = min(max(0, 0.25)*2.0, 0.4) = min(0.50, 0.4) = 0.40
  // 180 * (1.0 + 0.40) * 1 = 252
  const p25 = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0.25 });
  assert('25% deficit caps scaler at 0.4 (180 lbs → 252g)', p25 === 252);

  // getProteinTarget: biology modifier
  // 0% deficit with modifier 1.15: 180 * 1.0 * 1.15 = 207
  const pBio = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0, proteinModifier: 1.15 });
  assert('Biology modifier 1.15 raises protein (180 lbs → 207g)', pBio === 207);

  // getProteinTarget: combined deficit + modifier
  // 10% deficit + 1.15: 180 * 1.20 * 1.15 = 248.4 → round → 248
  const pCombo = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0.10, proteinModifier: 1.15 });
  assert('Deficit + modifier combine correctly (→ 248g)', pCombo === 248);

  // distributeMacros: basic distribution
  const d1 = distributeMacros({ adjustedCalories: 2500, proteinTarget: 200 });
  // fat = max(40, round(2500*0.30/9)) = max(40, round(83.33)) = 83
  // proteinCal = 200*4 = 800, fatCal = 83*9 = 747
  // remaining = 2500 - 800 - 747 = 953, carbs = round(953/4) = 238
  assert('distributeMacros protein matches target', d1.protein === 200);
  assert('distributeMacros fat at 30% default (83g)', d1.fat === 83);
  assert('distributeMacros carbs fill remainder (238g)', d1.carbs === 238);

  // distributeMacros: calorie reconciliation (calculated cals = p*4 + c*4 + f*9)
  const expectedCals = d1.protein * 4 + d1.carbs * 4 + d1.fat * 9;
  assert('distributeMacros calories reconcile with macros', d1.calories === expectedCals);

  // distributeMacros: minimum fat floor
  // Very low calorie scenario where 30% fat < 40g: 800 cal, 30%=240/9=26.7→27 < 40
  const dLow = distributeMacros({ adjustedCalories: 800, proteinTarget: 100 });
  assert('distributeMacros enforces 40g minimum fat', dLow.fat >= 40);

  // distributeMacros: custom fat percentage
  const dCustom = distributeMacros({ adjustedCalories: 2500, proteinTarget: 180, preferredFatPct: 0.20 });
  // fat = max(40, round(2500*0.20/9)) = max(40, round(55.56)) = 56
  assert('Custom fat% at 20% yields lower fat (56g)', dCustom.fat === 56);

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
