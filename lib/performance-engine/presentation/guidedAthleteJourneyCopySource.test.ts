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

const files = [
  'lib/performance-engine/presentation/todaysMissionViewModel.ts',
  'lib/performance-engine/presentation/guidedPhaseTransitionViewModel.ts',
  'lib/performance-engine/presentation/guidedFightOpportunityViewModel.ts',
  'lib/performance-engine/presentation/guidedFuelingViewModel.ts',
  'lib/performance-engine/presentation/guidedReadinessViewModel.ts',
  'lib/performance-engine/presentation/guidedBodyMassViewModel.ts',
  'lib/performance-engine/presentation/unifiedPerformanceViewModel.ts',
  'src/components/dashboard/TodayMissionPanel.tsx',
  'src/components/phases/GuidedPhaseTransitionCard.tsx',
  'src/components/BodyMassSupportTimeline.tsx',
  'src/constants/weightClassPlanSetup.ts',
  'src/screens/weeklyPlanSetup/FightOpportunityFlow.tsx',
  'src/screens/weeklyPlanSetup/constants.ts',
  'src/screens/NutritionScreen.tsx',
  'src/screens/LogScreen.tsx',
  'src/screens/WeightClassHomeScreen.tsx',
  'src/screens/CompetitionBodyMassScreen.tsx',
  'src/screens/ProfileSettingsScreen.tsx',
];

const sourceByFile = new Map(files.map((file) => [file, read(file)]));
const guidedSource = [...sourceByFile.values()].join('\n');
const lower = guidedSource.toLowerCase();

const oldPhrases = [
  'training load adjustment computed',
  'phase transition executed',
  'caloric target deviation',
  'workout conflict detected',
  'unsafe cut protocol',
  'readiness state insufficient',
  'nutritional compliance failure',
  'classified as unsafe',
  'target violation',
  'compliance failure',
  'noncompliant',
  'unified engine output',
];

console.log('\n-- guided athlete journey copy source --');

for (const phrase of oldPhrases) {
  assert(`old robotic phrase absent: ${phrase}`, !lower.includes(phrase));
}

assert('user-facing weight-cut language is absent', !/weight[- ]cut|unsafe cut|cut protocol/.test(lower));
assert('dangerous body-mass methods are absent', !/sauna|sweat suit|diuretic|laxative|vomit|severe fasting|extreme fluid restriction/.test(lower));
assert('phase journey copy avoids start-over language', !/start over|restarted|setup guide restarted|transition executed/.test(lower));

assert('Today Mission copy leads with warm practical guidance', sourceByFile.get('lib/performance-engine/presentation/todaysMissionViewModel.ts')?.includes('Keep the main work sharp') === true);
assert('Today Mission missing-data copy stays calm', sourceByFile.get('lib/performance-engine/presentation/todaysMissionViewModel.ts')?.includes('Some key context is missing') === true);
assert('fueling copy explains why fuel matters', sourceByFile.get('lib/performance-engine/presentation/guidedFuelingViewModel.ts')?.includes('Today needs more fuel') === true);
assert('readiness copy frames check-in as useful, not homework', sourceByFile.get('lib/performance-engine/presentation/guidedReadinessViewModel.ts')?.includes('A quick check-in will help Athleticore guide the plan') === true);
assert('body-mass copy asks the safety-first question', sourceByFile.get('lib/performance-engine/presentation/guidedBodyMassViewModel.ts')?.includes('Can this target be reached safely while maintaining performance?') === true);
assert('fight opportunity copy preserves journey context', sourceByFile.get('lib/performance-engine/presentation/guidedFightOpportunityViewModel.ts')?.includes('without wiping out your current progress') === true);
assert('phase transition copy says what carries forward', sourceByFile.get('lib/performance-engine/presentation/guidedPhaseTransitionViewModel.ts')?.includes("keeping what you've built") === true);

const todayPanel = sourceByFile.get('src/components/dashboard/TodayMissionPanel.tsx') ?? '';
const phaseCard = sourceByFile.get('src/components/phases/GuidedPhaseTransitionCard.tsx') ?? '';
const timeline = sourceByFile.get('src/components/BodyMassSupportTimeline.tsx') ?? '';
const setupConstants = sourceByFile.get('src/constants/weightClassPlanSetup.ts') ?? '';

assert('Today Mission panel uses existing Card and theme tokens', todayPanel.includes("import { Card }") && todayPanel.includes('COLORS') && todayPanel.includes('SPACING'));
assert('phase transition card uses existing Card and theme tokens', phaseCard.includes("import { Card }") && phaseCard.includes('COLORS') && phaseCard.includes('SPACING'));
assert('body-mass timeline uses theme tokens instead of one-off phase hexes', timeline.includes('COLORS.accent') && !/#[0-9A-Fa-f]{3,8}/.test(timeline));
assert('weight-class setup constants use theme colors', setupConstants.includes("import { COLORS }") && setupConstants.includes('COLORS.chart.protein'));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
