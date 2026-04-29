import fs from 'node:fs';
import path from 'node:path';

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

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

const screen = read('src/screens/NutritionScreen.tsx');
const hook = read('src/hooks/useFuelData.ts');
const hookTypes = read('src/hooks/fuel/types.ts');
const hookUtils = read('src/hooks/fuel/utils.ts');
const viewModel = read('lib/performance-engine/presentation/guidedFuelingViewModel.ts');

console.log('\n-- guided fueling source --');

assert('Fuel screen renders guided fueling focus', screen.includes('renderGuidedFuelingCard') && screen.includes('guided.primaryFocus'));
assert('Fuel screen renders why fueling matters', screen.includes('guided.whyItMatters'));
assert('Fuel screen renders session fueling guidance', screen.includes('renderSessionFuelingCard') && screen.includes('guidedFueling.sessionGuidance'));
assert('Fuel screen renders recovery nutrition focus', screen.includes('Recovery nutrition') && screen.includes('guidedFueling.recoveryNutritionFocus'));
assert('Fuel screen renders macro ranges after meaning', screen.includes('Macro ranges') && screen.indexOf('renderGuidedFuelingCard') < screen.indexOf('renderMacroTargetsCard'));
assert('Fuel screen surfaces food log confidence', screen.includes('Food log confidence') && screen.includes('foodLogConfidence'));
assert('Fuel screen explains missing data as unknown, not zero', screen.includes('Athleticore treats that as unknown, not zero'));
assert('Fuel screen no longer uses the large calorie hero in detailed mode', !screen.includes('styles.calorieHero') && !screen.includes('AnimatedNumber'));
assert('Fuel screen uses existing Card component', screen.includes("import { Card } from '../components/Card'"));
assert('Fuel screen uses existing MacroProgressBar component', screen.includes("import { MacroProgressBar } from '../components/MacroProgressBar'"));
assert('Fuel screen uses existing theme tokens', screen.includes('COLORS, FONT_FAMILY, GRADIENTS, RADIUS, SPACING, ANIMATION'));
assert('Fuel screen does not introduce a hex palette', !/#[0-9A-Fa-f]{3,8}/.test(screen));

assert('Fuel hook builds guided fueling from UPE output', hook.includes('buildGuidedFuelingViewModel(engineState.unifiedPerformance'));
assert('Fuel hook passes actuals as display context', hook.includes('actuals:') && hook.includes('totals.calories'));
assert('Fuel hook passes food log confidence context', hook.includes('summarizeFoodLogConfidence') && hook.includes('foodLogConfidence.confidence'));
assert('Fuel home view model exposes guided fueling', hookTypes.includes('guidedFueling: GuidedFuelingViewModel'));
assert('Food log confidence utility checks estimates', hookUtils.includes('estimatedCount') && hookUtils.includes('userEstimate'));

assert('Guided fueling model is UPE-sourced', viewModel.includes("source: 'unified_performance_engine'"));
assert('Guided fueling model leads with focus', viewModel.includes('primaryFocus'));
assert('Guided fueling model includes phase context', viewModel.includes('phaseContext'));
assert('Guided fueling model includes body-mass context', viewModel.includes('buildBodyMassContext'));
assert('Guided fueling model includes under-fueling risk copy', viewModel.includes('Fuel has been light relative to the work'));
assert('Guided fueling model avoids dieting app framing', !/diet app|calorie restriction|restricting calories|weight-cut|sauna|sweat suit/.test(viewModel.toLowerCase()));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
