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

console.log('\n-- nutrition/macroDistribution --');

(() => {
  const p0 = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0 });
  assert('0% deficit uses 1.8 g/kg baseline for general training', p0 === 147);

  const p10 = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0.10 });
  assert('10% deficit scales protein up inside evidence-based range', p10 === 180);

  const p25 = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0.25 });
  assert('25% deficit caps general protein at 2.4 g/kg', p25 === 196);

  const campCut = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0.30, phase: 'fight-camp' });
  assert('Fight-camp cut caps protein at 3.1 g/kg', campCut === 253);

  const pBio = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0, proteinModifier: 1.15 });
  assert('Biology modifier 1.15 raises protein without exceeding cap', pBio === 169);

  const pCombo = getProteinTarget({ bodyweightLbs: 180, deficitPercent: 0.10, proteinModifier: 1.15 });
  assert('Deficit + modifier are capped at the general 2.4 g/kg ceiling', pCombo === 196);

  const d1 = distributeMacros({ adjustedCalories: 2500, proteinTarget: 200 });
  assert('distributeMacros protein matches target', d1.protein === 200);
  assert('distributeMacros fat at 30% default (83g)', d1.fat === 83);
  assert('distributeMacros carbs fill remainder (238g)', d1.carbs === 238);

  const expectedCals = d1.protein * 4 + d1.carbs * 4 + d1.fat * 9;
  assert('distributeMacros calories reconcile with macros', d1.calories === expectedCals);

  const dLow = distributeMacros({ adjustedCalories: 800, proteinTarget: 100 });
  assert('distributeMacros enforces 40g minimum fat', dLow.fat >= 40);

  const dCustom = distributeMacros({ adjustedCalories: 2500, proteinTarget: 180, preferredFatPct: 0.20 });
  assert('Custom fat% at 20% yields lower fat (56g)', dCustom.fat === 56);

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
