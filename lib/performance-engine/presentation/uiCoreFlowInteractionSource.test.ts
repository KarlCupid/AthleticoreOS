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

function hasAll(source: string, needles: string[]): boolean {
  return needles.every((needle) => source.includes(needle));
}

function assertActiveTouchablesHaveHandlers(label: string, source: string): void {
  const tags = [...source.matchAll(/<(AnimatedPressable|TouchableOpacity)\b([\s\S]*?)>/g)];
  const missing = tags.filter((match) => {
    const attrs = match[2] ?? '';
    return !attrs.includes('onPress=') && !attrs.includes('onLongPress=');
  });

  assert(label, missing.length === 0);
}

const packageJson = read('package.json');
const dashboard = read('src/screens/DashboardScreen.tsx');
const todayMissionPanel = read('src/components/dashboard/TodayMissionPanel.tsx');
const onboarding = read('src/screens/OnboardingScreen.tsx');
const phaseCard = read('src/components/phases/GuidedPhaseTransitionCard.tsx');
const phaseViewModel = read('lib/performance-engine/presentation/guidedPhaseTransitionViewModel.ts');
const weeklySetup = read('src/screens/WeeklyPlanSetupScreen.tsx');
const fightFlow = read('src/screens/weeklyPlanSetup/FightOpportunityFlow.tsx');
const fightViewModel = read('lib/performance-engine/presentation/guidedFightOpportunityViewModel.ts');
const trainingPrescription = read('src/components/WorkoutPrescriptionSection.tsx');
const guidedWorkout = read('src/screens/GuidedWorkoutScreen.tsx');
const workoutSummary = read('src/screens/WorkoutSummaryScreen.tsx');
const nutrition = read('src/screens/NutritionScreen.tsx');
const mealSection = read('src/components/MealSection.tsx');
const foodSearch = read('src/screens/FoodSearchScreen.tsx');
const foodSearchItem = read('src/components/FoodSearchItem.tsx');
const foodDetail = read('src/screens/FoodDetailScreen.tsx');
const customFood = read('src/screens/CustomFoodScreen.tsx');
const checkIn = read('src/screens/LogScreen.tsx');
const weightClassHome = read('src/screens/WeightClassHomeScreen.tsx');
const weightClassSetup = read('src/screens/WeightClassPlanSetupScreen.tsx');
const bodyMassViewModel = read('lib/performance-engine/presentation/guidedBodyMassViewModel.ts');
const tabs = read('src/navigation/TabNavigator.tsx');
const datePicker = read('src/components/DatePickerField.tsx');
const timePicker = read('src/components/TimePickerField.tsx');
const readinessGate = read('src/components/ReadinessGate.tsx');
const prCelebration = read('src/components/PRCelebration.tsx');
const dayDetail = read('src/screens/DayDetailScreen.tsx');

const workoutRenderTest = read('lib/performance-engine/workout-programming/workoutProgrammingGeneratedWorkoutRender.test.ts');

console.log('\n-- core UI flow interaction source guards --');

assert('core UI flow source/app-flow guards remain while workout programming owns the RN render harness', Boolean(
  /@testing-library\/react-native/i.test(packageJson)
    && workoutRenderTest.includes("@testing-library/react-native/pure")
    && workoutRenderTest.includes('GeneratedWorkoutPreviewCard')
    && workoutRenderTest.includes('GeneratedWorkoutBetaSessionCard'),
));

assert('Today screen renders Today Mission and exposes primary and secondary action selectors', hasAll(todayMissionPanel, [
  'testID="today-mission-primary-cta"',
  'today-mission-secondary-cta-',
  'onAction(primaryAction)',
  'onAction(action)',
]));
assert('Today Mission details/risk expansion cannot be a dead control', hasAll(todayMissionPanel, [
  'testID="today-mission-details-toggle"',
  'setShowDetails((current) => !current)',
  'mission.riskHighlights',
  'mission.confidence.summary',
]));
assert('Today Mission action dispatcher routes all canonical intents', hasAll(dashboard, [
  'case "log_checkin":',
  'navigation.navigate("Log")',
  'case "start_training":',
  'void openTodayTraining()',
  'case "review_fueling":',
  'openFuelScreen("NutritionHome")',
  'case "log_body_mass":',
  'case "review_body_mass":',
  'openFuelScreen("WeightClassHome")',
  'case "confirm_fight":',
  'initialGoalMode: "fight_camp"',
]));
assert('first-run modal primary and dismiss actions are selectable and wired', hasAll(dashboard, [
  'testID="first-run-check-in"',
  'openFirstRunStep("checkin")',
  'testID="first-run-not-now"',
  'void dismissFirstRunModal()',
]));

assert('onboarding continue and submit controls initialize the athlete journey', hasAll(onboarding, [
  "testID={step === TOTAL_STEPS - 1 ? 'onboarding-submit' : 'onboarding-continue'}",
  'onPress={handleNext}',
  'disabled={!canProceed() || saving}',
  'completeCoachIntake',
  'onboarding-back',
]));

assert('phase transition continue CTA is stable and preserves journey language', hasAll(phaseCard, [
  'testID="phase-transition-primary-cta"',
  'onPress={onContinue}',
  'transition.preservedContext',
  'transition.changedFocus',
]) && !/start over|restart|reset/.test(phaseViewModel.toLowerCase()));

assert('fight opportunity status, optional details, and evaluate controls are selectable', hasAll(fightFlow, [
  'testID={`fight-status-${option.value}`}',
  'fight-weigh-in-same-day',
  'fight-weigh-in-next-day',
  'fight-details-toggle',
  'fight-weight-class-changed',
  'fight-weight-class-unchanged',
  'fight-opportunity-evaluate',
  'setSummaryVisible(true)',
]));
assert('fight opportunity detailed selectors cover opponent, rounds, travel, and picker modals', hasAll(fightFlow, [
  'fight-opponent-stance-',
  'fight-round-count-',
  'fight-round-duration-',
  'fight-rest-duration-',
  'fight-date-picker',
  'fight-weigh-in-date-picker',
  'fight-travel-start-picker',
  'fight-travel-end-picker',
]));
assert('fight opportunity submit/back are handled by setup shell', hasAll(weeklySetup, [
  'testID="weekly-setup-submit"',
  'onPress={isLastPhase ? handleSave : handleNextPhase}',
  'testID="weekly-setup-back"',
  'onPress={handleBackPhase}',
]));
assert('fight opportunity copy and model preserve continuous journey context', !/start over|restart|reset/.test(fightViewModel.toLowerCase()) && fightViewModel.includes('body-mass and weight-class feasibility'));

assert('training entry, live workout, and summary CTAs are selectable and wired', hasAll(trainingPrescription, [
  'testID="workout-prescription-start"',
  'onPress={onStart}',
]) && hasAll(guidedWorkout, [
  'testID="guided-workout-activation-done"',
  'testID="guided-workout-skip-activation"',
  'testID="guided-workout-leave"',
  'testID="guided-workout-retry"',
  'finalizeWorkoutAndNavigate',
]) && hasAll(workoutSummary, [
  'testID="workout-summary-back-to-plan"',
  'navigation.getParent()?.navigate',
  'testID="workout-summary-training-home"',
  "navigation.navigate('WorkoutHome')",
]));

assert('fueling mode, details, food add, and low-confidence controls are selectable', hasAll(nutrition, [
  'testID="fuel-mode-quick"',
  'testID="fuel-mode-detailed"',
  'testID="fuel-details-toggle"',
  'setShowFuelDetails((current) => !current)',
  'testID={`fuel-quick-intent-${intent.id}`}',
  "navigation.navigate('FoodSearch'",
  'testID="fuel-open-weight-class"',
  'testID="fuel-scan-food"',
  'testID="fuel-custom-food"',
]));
assert('meal and food search add flows expose stable selectors and handlers', hasAll(mealSection, [
  'meal-section-toggle-',
  'meal-add-',
  'onAddFood',
  'meal-food-row-',
  'onSelectFood(food.id)',
]) && hasAll(foodSearch, [
  'testID="food-search-input"',
  'testID="food-search-back"',
  'testID="food-search-scan"',
  'food-search-mode-',
  'handleSelectMode(mode)',
]) && hasAll(foodSearchItem, [
  'food-search-result-',
  'onSelect(item)',
]));
assert('food detail and custom food submits remain guarded and selectable', hasAll(foodDetail, [
  'testID="food-detail-submit"',
  'onPress={handleAdd}',
  'disabled={saving}',
  'testID="food-detail-save-favorite"',
  'setFavoriteOnSave((current) => !current)',
]) && hasAll(customFood, [
  'testID="custom-food-submit"',
  'onPress={handleSave}',
  'disabled={!canSave || saving}',
]));

assert('check-in fields, missing-data prompt action, tooltip close, and submit are selectable', hasAll(checkIn, [
  'testID="check-in-weight-input"',
  'check-in-help-',
  'check-in-add-pain',
  'check-in-pain-',
  'testID="check-in-submit"',
  'onPress={saveCheck}',
  'testID="check-in-tooltip-close"',
  'setScaleValue(scale.key, value)',
]));

assert('body-mass evaluation, safe navigation, and blocked-plan CTAs are stable', hasAll(weightClassHome, [
  'testID="weight-class-evaluate-class"',
  "nav.navigate('WeightClassPlanSetup')",
  'testID="weight-class-past-plans"',
  'testID="weight-class-fight-week-support"',
  'testID="weight-class-post-weigh-in-recovery"',
  'testID="weight-class-end-plan"',
]) && hasAll(weightClassSetup, [
  'testID="weight-class-setup-back"',
  'testID="weight-class-setup-next"',
  'testID="weight-class-setup-activate"',
  'testID={`weight-class-sport-${sport}`}',
  'Automatic support blocked',
  'professionalReviewRequired',
]) && hasAll(bodyMassViewModel, [
  'saferAlternatives',
  'Review safer options',
  "won't build a risky plan",
]));

assert('navigation tabs expose stable selectors for tab switching', ['tab-today', 'tab-train', 'tab-plan', 'tab-fuel', 'tab-me'].every((id) => tabs.includes(`testID="${id}"`)));
assert('modal and sheet close/confirm controls expose stable selectors', hasAll(datePicker, ['`${testID}-cancel`', '`${testID}-done`', '`${testID}-scrim`'])
  && hasAll(timePicker, ['`${testID}-cancel`', '`${testID}-done`', '`${testID}-scrim`'])
  && hasAll(readinessGate, ['testID="readiness-gate-cancel"', 'testID="readiness-gate-adjust"', 'testID="readiness-gate-log-planned"'])
  && prCelebration.includes('testID="pr-celebration-dismiss"')
  && hasAll(dayDetail, ['testID="day-detail-add-cancel"', 'testID="day-detail-edit-cancel"', 'testID="day-detail-back"']));

assertActiveTouchablesHaveHandlers('Today and mission active touchables have handlers', dashboard + todayMissionPanel);
assertActiveTouchablesHaveHandlers('Setup and fight active touchables have handlers', onboarding + weeklySetup + fightFlow + weightClassSetup);
assertActiveTouchablesHaveHandlers('Training active touchables have handlers', trainingPrescription + guidedWorkout + workoutSummary);
assertActiveTouchablesHaveHandlers('Fuel and check-in active touchables have handlers', nutrition + mealSection + foodSearch + foodSearchItem + foodDetail + customFood + checkIn);
assertActiveTouchablesHaveHandlers('Body-mass and modal active touchables have handlers', weightClassHome + datePicker + timePicker + readinessGate + prCelebration);

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
