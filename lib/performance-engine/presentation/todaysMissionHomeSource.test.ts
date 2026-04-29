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

const dashboard = read('src/screens/DashboardScreen.tsx');
const dashboardData = read('src/hooks/useDashboardData.ts');
const panel = read('src/components/dashboard/TodayMissionPanel.tsx');

console.log('\n-- todays mission home source --');

assert('Dashboard renders TodayMissionPanel', /<TodayMissionPanel\s/.test(dashboard));
assert('Dashboard passes canonical todayMission to panel', dashboard.includes('mission={todayMission}'));
assert('Dashboard puts mission before readiness hero', dashboard.indexOf('styles.todayMissionWrap') < dashboard.indexOf('styles.readinessHeroWrap'));
assert('Dashboard still keeps readiness context available', dashboard.includes('readinessHeroWrap') && dashboard.includes("TODAY'S READINESS"));
assert('Dashboard still keeps unified journey summary available', dashboard.includes('UnifiedJourneySummaryCard'));
assert('Dashboard still keeps body-mass trend access available', dashboard.includes('WeightTrendCard'));
assert('Dashboard no longer uses legacy mission panel as home source', !/MissionDashboardPanel|buildMissionDashboardViewModel|buildCompassViewModel/.test(dashboard));

assert('Dashboard hook builds Today Mission from UPE output', dashboardData.includes('buildTodaysMissionViewModel(engineState.unifiedPerformance'));
assert('Dashboard hook exposes Today Mission in state', dashboardData.includes('todayMission: TodayMissionViewModel'));
assert('Dashboard hook does not reference legacy daily mission snapshot', !/daily_mission_snapshot|dailyPerformanceSnapshot|daily_performance_summary_snapshot/.test(dashboardData));

const requiredMissionFields = [
  'mission.missionTitle',
  'mission.phaseLabel',
  'mission.primaryFocus',
  'mission.whyTodayMatters',
  'mission.trainingSummary',
  'mission.protectedWorkoutSummary',
  'mission.fuelingFocus',
  'mission.readinessSummary',
  'mission.recoveryPriority',
  'mission.bodyMassContext',
  'mission.fightOrCompetitionContext',
  'mission.planAdjustments',
  'mission.riskHighlights',
  'mission.nextActions',
  'mission.confidence.summary',
];

for (const field of requiredMissionFields) {
  assert(`TodayMissionPanel renders ${field}`, panel.includes(field));
}

assert('TodayMissionPanel uses existing Card component', panel.includes("import { Card } from '../Card'"));
assert('TodayMissionPanel uses existing AnimatedPressable component', panel.includes("import { AnimatedPressable } from '../AnimatedPressable'"));
assert('TodayMissionPanel uses existing theme tokens', /COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING, TYPOGRAPHY_V2/.test(panel));
assert('TodayMissionPanel does not introduce a hex palette', !/#[0-9A-Fa-f]{3,8}/.test(panel));
assert('TodayMissionPanel limits secondary actions', panel.includes('mission.nextActions.slice(1, 3)'));
assert('TodayMissionPanel exposes expandable explanations', panel.includes('Show why it changed') && panel.includes('mission.explanations'));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
