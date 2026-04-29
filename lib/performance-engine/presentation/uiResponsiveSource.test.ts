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
const todayMissionPanel = read('src/components/dashboard/TodayMissionPanel.tsx');
const phaseCard = read('src/components/phases/GuidedPhaseTransitionCard.tsx');
const readinessGate = read('src/components/ReadinessGate.tsx');
const activityCard = read('src/components/ActivityCard.tsx');
const profileSettings = read('src/screens/ProfileSettingsScreen.tsx');
const weeklySetupStyles = read('src/screens/weeklyPlanSetup/styles.ts');
const manualSmoke = read('docs/manual-ui-smoke-test.md');

console.log('\n-- UI responsive source guards --');

assert('Readiness gate overlay can scroll on short viewports', readinessGate.includes('ScrollView') && readinessGate.includes("maxHeight: '82%'"));
assert('Readiness gate action targets meet mobile touch size', readinessGate.includes('minHeight: 48') && readinessGate.includes('minHeight: 44'));
assert('Dashboard first-run modal scrolls when taller than viewport', dashboard.includes('styles.firstRunModalContent') && dashboardStyles.includes("maxHeight: '86%'"));
assert('Today Mission header wraps instead of forcing horizontal overflow', todayMissionPanel.includes("flexWrap: 'wrap'") && todayMissionPanel.includes("alignSelf: 'flex-start'"));
assert('Phase transition header wraps around long phase names', phaseCard.includes("flexWrap: 'wrap'") && phaseCard.includes("alignSelf: 'flex-start'"));
assert('Activity card inline action buttons meet mobile touch size', activityCard.includes('minHeight: 44') && activityCard.includes("flexWrap: 'wrap'"));
assert('Profile settings uses keyboard-aware scrolling for inline edits', profileSettings.includes('KeyboardAvoidingView') && profileSettings.includes('keyboardShouldPersistTaps="handled"'));
assert('Profile settings scroll content clears the safe area', profileSettings.includes('paddingBottom: insets.bottom + SPACING.xxxl'));
assert('Profile editable rows can wrap save/cancel controls', profileSettings.includes("flexWrap: 'wrap'") && profileSettings.includes('styles.cancelButton'));
assert('Weekly setup advanced toggle resists small-screen clipping', weeklySetupStyles.includes('advancedToggleTextWrap') && weeklySetupStyles.includes('minWidth: 0'));
assert('Weekly setup picker sheet is capped for short viewports', weeklySetupStyles.includes("maxHeight: '86%'"));
assert('Manual smoke checklist covers small phone and keyboard states', manualSmoke.includes('320 x 568') && /keyboard/i.test(manualSmoke));
assert('Manual smoke checklist covers bottom nav and safe-area overlap', /bottom navigation/i.test(manualSmoke) && /safe area/i.test(manualSmoke));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
