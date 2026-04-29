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
const dashboardStyles = read('src/screens/DashboardScreen.styles.ts');
const dashboardData = read('src/hooks/useDashboardData.ts');
const card = read('src/components/phases/GuidedPhaseTransitionCard.tsx');
const phaseTransition = read('src/components/phases/PhaseTransition.tsx');
const viewModel = read('lib/performance-engine/presentation/guidedPhaseTransitionViewModel.ts');

console.log('\n-- guided phase transition home source --');

assert('Dashboard renders guided phase transition card', /<GuidedPhaseTransitionCard\s/.test(dashboard));
assert('Dashboard passes canonical phaseTransition to card', dashboard.includes('transition={phaseTransition}'));
assert('Dashboard gives the card one continue action', dashboard.includes('onContinue={openPlanningSurface}'));
assert('Dashboard places phase transition between mission and readiness', dashboard.indexOf('styles.todayMissionWrap') < dashboard.indexOf('styles.phaseTransitionWrap') && dashboard.indexOf('styles.phaseTransitionWrap') < dashboard.indexOf('styles.readinessHeroWrap'));
assert('Dashboard keeps Today Mission as primary home surface', dashboard.includes('<TodayMissionPanel') && dashboard.indexOf('<TodayMissionPanel') < dashboard.indexOf('<GuidedPhaseTransitionCard'));
assert('Dashboard style uses existing spacing for transition wrapper', dashboardStyles.includes('phaseTransitionWrap') && dashboardStyles.includes('marginTop: SPACING.lg'));

assert('Dashboard hook builds guided phase transition from UPE output', dashboardData.includes('buildGuidedPhaseTransitionViewModel(engineState.unifiedPerformance'));
assert('Dashboard hook exposes guided phase transition state', dashboardData.includes('phaseTransition: GuidedPhaseTransitionViewModel'));
assert('Dashboard hook initializes unknown phase transition safely', dashboardData.includes('buildGuidedPhaseTransitionViewModel(null)'));
assert('Dashboard hook does not reference legacy daily mission snapshots', !/daily_mission_snapshot|dailyPerformanceSnapshot|daily_performance_summary_snapshot/.test(dashboardData));

assert('Guided phase card uses existing Card component', card.includes("import { Card } from '../Card'"));
assert('Guided phase card uses existing AnimatedPressable component', card.includes("import { AnimatedPressable } from '../AnimatedPressable'"));
assert('Guided phase card uses existing theme tokens', /COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING, TYPOGRAPHY_V2/.test(card));
assert('Guided phase card does not introduce a hex palette', !/#[0-9A-Fa-f]{3,8}/.test(card));
assert('Guided phase card shows preserved context', card.includes('What carries forward') && card.includes('transition.preservedContext'));
assert('Guided phase card shows changed focus', card.includes('What changes now') && card.includes('transition.changedFocus'));
assert('Guided phase card shows phase explanation', card.includes('WHY IT CHANGED') && card.includes('transition.whyChanging'));
assert('Guided phase card exposes exactly one primary CTA surface', card.includes('transition.ctaLabel') && !card.includes('secondaryButton'));
assert('Guided phase card keeps protected work visible', card.includes('Protected work') && card.includes('transition.protectedWorkoutHandling'));

assert('Old phase transition shell now delegates to guided card', phaseTransition.includes('GuidedPhaseTransitionCard as PhaseTransition'));
assert('Old auto-advance phase shell is removed', !/displayMs|withDelay|runOnJS|tagline/.test(phaseTransition));

const athleteFacingSource = `${card}\n${viewModel}`.toLowerCase();
assert('Guided phase UX avoids old reset language', !/start over|restart|reset|transition executed/.test(athleteFacingSource));
assert('Guided phase view model uses UPE as source', viewModel.includes("source: 'unified_performance_engine'"));
assert('Guided phase view model names what is preserved', viewModel.includes('buildPreservedContext'));
assert('Guided phase view model names what changes', viewModel.includes('buildChangedFocus'));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
