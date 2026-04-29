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
const todayMissionPanel = read('src/components/dashboard/TodayMissionPanel.tsx');
const phaseCard = read('src/components/phases/GuidedPhaseTransitionCard.tsx');
const fightFlow = read('src/screens/weeklyPlanSetup/FightOpportunityFlow.tsx');
const setupShared = read('src/screens/weeklyPlanSetup/shared.tsx');
const weeklySetup = read('src/screens/WeeklyPlanSetupScreen.tsx');
const weeklyController = read('src/hooks/useWeeklyPlanScreenController.ts');
const onboarding = read('src/screens/OnboardingScreen.tsx');
const readinessGate = read('src/components/ReadinessGate.tsx');
const dayDetail = read('src/screens/DayDetailScreen.tsx');
const activityCard = read('src/components/ActivityCard.tsx');
const logScreen = read('src/screens/LogScreen.tsx');
const foodDetail = read('src/screens/FoodDetailScreen.tsx');
const customFood = read('src/screens/CustomFoodScreen.tsx');
const activityLog = read('src/screens/ActivityLogScreen.tsx');
const weightClassSetup = read('src/screens/WeightClassPlanSetupScreen.tsx');
const settings = read('src/screens/SettingsScreen.tsx');

console.log('\n-- UI interaction source wiring --');

assert('Today Mission primary CTA has a stable selector', todayMissionPanel.includes('testID="today-mission-primary-cta"'));
assert('Today Mission primary CTA calls onAction', /onPress=\{\(\) => onAction\(primaryAction\)\}/.test(todayMissionPanel));
assert('Today Mission secondary CTAs have stable selectors', todayMissionPanel.includes('today-mission-secondary-cta-'));
assert('Today Mission secondary CTAs call onAction', /onPress=\{\(\) => onAction\(action\)\}/.test(todayMissionPanel));
assert('Dashboard quick actions expose selectors', ['check-in', 'train', 'fuel', 'plan'].every((id) => dashboard.includes(`dashboard-quick-action-${id}`)));
assert('Dashboard removed the fake notification affordance from render', !dashboard.includes('styles.notificationButton') && dashboard.includes('styles.headerSpacer'));

assert('Phase transition CTA has a stable selector', phaseCard.includes('testID="phase-transition-primary-cta"'));
assert('Phase transition CTA calls onContinue', phaseCard.includes('onPress={onContinue}'));

assert('Fight status options expose selectors', fightFlow.includes('testID={`fight-status-${option.value}`}'));
assert('Fight details toggle is wired', fightFlow.includes('testID="fight-details-toggle"') && fightFlow.includes('setShowOptionalDetails'));
assert('Fight opportunity evaluate is wired', fightFlow.includes('testID="fight-opportunity-evaluate"') && fightFlow.includes('setSummaryVisible(true)'));
assert('OptionPill passes testID to touch targets', setupShared.includes('testID?: string') && setupShared.includes('testID={testID}'));
assert('Weekly setup submit/back controls expose selectors', weeklySetup.includes('testID="weekly-setup-submit"') && weeklySetup.includes('testID="weekly-setup-back"'));

assert('Onboarding submit/continue exposes selectors', onboarding.includes('onboarding-submit') && onboarding.includes('onboarding-continue'));
assert('Onboarding submit remains disabled until intentional criteria pass', onboarding.includes('disabled={!canProceed() || saving}'));
assert('Onboarding submits through canonical coach intake', onboarding.includes('completeCoachIntake'));

assert('Weekly Plan quick log is not a placeholder alert', !weeklyController.includes('Coming Soon') && !weeklyController.includes('will open here'));
assert('Weekly Plan quick log opens the current day detail surface', weeklyController.includes("navigation.navigate('DayDetail'") && weeklyController.includes('todayLocalDate()'));

assert('Readiness gate avoids unsafe proceed copy', !readinessGate.includes('Proceed Anyway'));
assert('Readiness gate adjustment passes the suggested alternative', readinessGate.includes('onSwitch(suggestion.alternative)'));
assert('Readiness gate adjustment is wired to a real schedule update', dayDetail.includes('handleReadinessGateAdjustment') && dayDetail.includes('applySameDayOverride'));
assert('Activity card avoids nested press conflicts when inline actions are shown', activityCard.includes('disabled={!onPress || showActions}'));
assert('Activity card inline actions expose selectors', ['log', 'move', 'skip', 'lighter', 'harder'].every((id) => activityCard.includes(`activity-card-${id}-`)));

assert('Check-in submit has a stable selector', logScreen.includes('testID="check-in-submit"'));
assert('Nutrition submit controls have stable selectors', foodDetail.includes('testID="food-detail-submit"') && customFood.includes('testID="custom-food-submit"'));
assert('Activity log submit has a stable selector', activityLog.includes('testID="activity-log-submit"'));
assert('Weight-class setup submit controls have stable selectors', weightClassSetup.includes('testID="weight-class-setup-next"') && weightClassSetup.includes('testID="weight-class-setup-activate"'));

assert('Settings stale chevron affordance is removed', !settings.includes('IconChevronRight'));
assert('Settings cycle tracking switch has a real persistence handler', settings.includes('onValueChange={(value) => void updateCycleTracking(value)}'));

const checkedSources = [
  dashboard,
  weeklyController,
  readinessGate,
  onboarding,
  weeklySetup,
  fightFlow,
  logScreen,
  foodDetail,
  customFood,
  activityLog,
  weightClassSetup,
  settings,
].join('\n');

assert('No checked source leaves a coming soon placeholder interaction', !/coming soon|will open here/i.test(checkedSources));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);

