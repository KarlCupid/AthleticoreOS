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

const home = read('src/screens/WeightClassHomeScreen.tsx');
const setup = read('src/screens/WeightClassPlanSetupScreen.tsx');
const preview = read('src/components/WeightClassEvaluationPreviewStep.tsx');
const fightWeek = read('src/screens/CompetitionBodyMassScreen.tsx');
const timeline = read('src/components/BodyMassSupportTimeline.tsx');
const setupConstants = read('src/constants/weightClassPlanSetup.ts');
const hook = read('src/hooks/useBodyMassPlanData.ts');
const viewModel = read('lib/performance-engine/presentation/guidedBodyMassViewModel.ts');

const userFacing = [
  home,
  setup,
  preview,
  fightWeek,
  viewModel,
].join('\n').toLowerCase();

console.log('\n-- guided body-mass source --');

assert('home renders canonical body-mass and weight-class language', home.includes('Can this target be reached safely while maintaining performance?') || home.includes('guidedBodyMass.primaryQuestion'));
assert('guided body-mass uses UPE output', hook.includes('getDailyEngineState') && hook.includes('buildGuidedBodyMassViewModel(engineState.unifiedPerformance)'));
assert('home uses guided body-mass view model', home.includes('guidedBodyMass') && home.includes('saferAlternatives') && home.includes('professionalReviewRecommendation'));
assert('setup preview uses guided copy patterns', preview.includes('buildGuidedBodyMassPlanCopy') && preview.includes('Can this target be reached safely while maintaining performance?'));
assert('unsafe status blocks automatic support copy', viewModel.includes("status === 'unsafe'") && viewModel.includes("won't build a risky plan"));
assert('insufficient data status has calm missing-data copy', viewModel.includes("status === 'insufficient_data'") && viewModel.includes('We need more body-mass data'));
assert('safer alternatives are surfaced', viewModel.includes('saferAlternatives') && home.includes('Safer options'));
assert('professional review recommendation is surfaced', viewModel.includes('Qualified review is recommended') && home.includes('professionalReviewRecommendation'));
assert('fight week body-mass screen uses guided feasibility', fightWeek.includes('guidedBodyMass.primaryMessage') && fightWeek.includes('guidedBodyMass.statusLabel'));
assert('existing theme and components are preserved', home.includes("import { Card }") && home.includes('COLORS') && preview.includes("import { Card }") && fightWeek.includes("import { Card }"));
assert('current palette is preserved instead of new phase hexes', !/const PHASE_COLORS[\s\S]*#[0-9A-Fa-f]{3,8}/.test(home) && !/const PHASE_COLORS[\s\S]*#[0-9A-Fa-f]{3,8}/.test(fightWeek));
assert('body-mass timeline uses existing theme tokens', timeline.includes('COLORS.accent') && timeline.includes('COLORS.success') && !/#[0-9A-Fa-f]{3,8}/.test(timeline));
assert('weight-class setup constants use theme tokens', setupConstants.includes("import { COLORS }") && setupConstants.includes('COLORS.chart.protein') && !/color: '#[0-9A-Fa-f]{3,8}'/.test(setupConstants));
assert('weight-class setup copy avoids restart language', !/start over|restart|restarted|reset/.test(setupConstants.toLowerCase()));
assert('weight cut language is not user-facing', !/weight[- ]cut/.test(userFacing));
assert('dangerous method names are not user-facing', !/sauna|sweat suit|diuretic|laxative|vomit|severe fasting|extreme fluid restriction|dehydration/.test(userFacing));
assert('unsafe targets are not normalized as ordinary plans', !userFacing.includes('automatic plan is blocked') && userFacing.includes('automatic support blocked'));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
