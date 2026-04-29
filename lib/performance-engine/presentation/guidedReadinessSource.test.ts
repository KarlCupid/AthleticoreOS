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

const screen = read('src/screens/LogScreen.tsx');
const hook = read('src/hooks/useLogScreenData.ts');
const viewModel = read('lib/performance-engine/presentation/guidedReadinessViewModel.ts');
const dailyService = read('lib/api/dailyPerformanceService.ts');

console.log('\n-- guided readiness source --');

assert('check-in flow renders as a quick athlete check-in', screen.includes('Quick Check-In') && screen.includes("Tell Athleticore how you are doing so today's plan can adapt"));
assert('check-in screen leads with readiness guidance', screen.includes('READINESS GUIDANCE') && screen.includes('draftGuidance.title'));
assert('check-in screen includes recovery feeling input', screen.includes("label: 'Recovery feeling'") && screen.includes('How ready does your body feel'));
assert('check-in screen includes soreness and sleep inputs', screen.includes("label: 'Soreness'") && screen.includes("label: 'Sleep'"));
assert('check-in screen includes stress or mood input', screen.includes("label: 'Mood / stress'"));
assert('check-in screen includes pain or injury concern', screen.includes('Pain / injury concern') && screen.includes('Add pain or injury concern'));
assert('check-in copy frames missing or low readiness without punishment', screen.includes('This is not a toughness score') && !/failed|compliance|punish/i.test(screen));
assert('check-in no longer displays a raw score badge as the main guidance', !screen.includes('scoreBadge') && !screen.includes('scoreText'));
assert('check-in uses existing Card component', screen.includes("import { Card } from '../components/Card'"));
assert('check-in keeps existing journey summary component', screen.includes('UnifiedJourneySummaryCard'));
assert('check-in uses existing theme tokens', screen.includes('COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION'));

assert('log hook builds guided readiness from UPE output', hook.includes('buildGuidedReadinessViewModel(engineState.unifiedPerformance)'));
assert('log hook exposes guided readiness view model', hook.includes('guidedReadiness: GuidedReadinessViewModel'));

assert('guided readiness model is UPE-sourced', viewModel.includes("source: 'unified_performance_engine'"));
assert('guided readiness model treats missing data as unknown', viewModel.includes('hard to judge') && viewModel.includes('missing readiness data as unknown'));
assert('guided readiness model includes training adjustment copy', viewModel.includes('buildTrainingAdjustment') && viewModel.includes('Keep the main session sharp'));
assert('guided readiness model includes nutrition or recovery adjustment copy', viewModel.includes('buildFuelingOrRecoveryAdjustment'));
assert('guided readiness model includes pain/injury copy', viewModel.includes('Pain or injury concern is present'));
assert('guided readiness copy avoids black-box score framing', !viewModel.includes('/100') && !viewModel.includes('state yellow'));

assert('daily service passes check-in fields into canonical UPE tracking', dailyService.includes('todayCheckin') && dailyService.includes("source: 'user_reported'"));
assert('daily service maps sleep soreness stress pain and fatigue', ['sleep_quality', 'soreness', 'stress', 'pain', 'fatigue'].every((field) => dailyService.includes(field)));
assert('daily service still preserves fallback legacy readiness projection', dailyService.includes('legacy-readiness-profile') && dailyService.includes("source: 'system_inferred'"));
assert('daily service passes computed ACWR into UPE readiness', /acwr:\s*ACWRResult \| null/.test(dailyService) && dailyService.includes('acuteChronicWorkloadRatio: acwrRatioForUnifiedEngine(input.acwr)'));
assert('daily service only passes finite ACWR ratios into UPE readiness', dailyService.includes('function acwrRatioForUnifiedEngine') && dailyService.includes('Number.isFinite(ratio)'));
assert('daily service no longer nulls ACWR at the UPE handoff', !dailyService.includes('acuteChronicWorkloadRatio: null'));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
