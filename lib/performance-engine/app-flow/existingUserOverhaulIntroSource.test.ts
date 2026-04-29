import fs from 'node:fs';
import path from 'node:path';
import {
  createFirstRunWalkthroughState,
  dismissFirstRunWalkthrough,
  markFirstRunWalkthroughStepCompleted,
  resolveFirstRunWalkthroughState,
  verifyFirstRunWalkthroughDoesNotResetAthleteJourneyState,
} from './firstRunWalkthroughState.ts';
import { initializeJourneyFromOnboarding } from '../journey/initializeAthleteJourney.ts';

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

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const NOW = '2026-04-29T12:00:00.000Z';

console.log('\n-- existing user overhaul intro source --');

(() => {
  const dashboard = read('src/screens/DashboardScreen.tsx');
  const card = read('src/components/first-run/ExistingUserOverhaulIntroCard.tsx');

  assert(
    'existing user sees overhaul intro once',
    dashboard.includes('shouldShowExistingUserOverhaulIntro')
      && dashboard.includes('state.appliesTo !== "existing_user_overhaul_intro"')
      && dashboard.includes('state.hasSeenTodayMissionIntro')
      && dashboard.includes('state.status === "completed"')
      && dashboard.includes('state.status === "dismissed"')
      && dashboard.includes('<ExistingUserOverhaulIntroCard'),
  );

  assert(
    'Today Mission is introduced in the existing-user intro',
    card.includes("Today's Mission brings the key pieces together so you know what to do and why.")
      && card.includes("Open Today's Mission")
      && dashboard.indexOf('<TodayMissionPanel') < dashboard.indexOf('<ExistingUserOverhaulIntroCard'),
  );

  assert(
    'existing user history and continuity copy is present',
    card.includes('Your history is coming with you.')
      && card.includes('Plans no longer restart from scratch.')
      && card.includes('Protected workouts stay anchored')
      && card.includes('Fight opportunities, fueling, readiness, and body-mass context stay connected.'),
  );

  assert(
    'missing critical data prompts appear without full re-onboarding',
    dashboard.includes('buildExistingUserMissingDataPrompts')
      && dashboard.includes("Log today's check-in so readiness can guide the next call.")
      && dashboard.includes('Add protected workouts if sparring, classes, or coach-led sessions should stay anchored.')
      && dashboard.includes('Missing data stays unknown, not zero.')
      && card.includes('Review missing context')
      && !dashboard.includes('<OnboardingScreen'),
  );

  assert(
    'user can skip without losing data',
    dashboard.includes('dismissAndPersistFirstRunWalkthrough')
      && card.includes('existing-user-overhaul-dismiss')
      && card.includes('Dismiss'),
  );

  assert(
    'completion persists and moves into the app tour',
    dashboard.includes('completeAndPersistFirstRunWalkthroughStep')
      && dashboard.includes('step: "today_mission_intro"')
      && dashboard.includes('currentStep: "app_tour"'),
  );

  assert(
    'user routes to Today Mission instead of onboarding restart',
    card.includes("Open Today's Mission")
      && !card.includes('onboarding')
      && !card.includes('start over'),
  );

  assert(
    'current theme and components are preserved',
    card.includes("from '../Card'")
      && card.includes("from '../AnimatedPressable'")
      && card.includes("from '../../theme/theme'")
      && card.includes('COLORS.accent')
      && card.includes('SPACING.lg')
      && card.includes('RADIUS.full')
      && card.includes('flexWrap: \'wrap\'')
      && card.includes('minHeight: 48')
      && card.includes('minHeight: 44'),
  );

  const lowerCard = card.toLowerCase();
  assert(
    'body-mass and weight-class copy remains safety-first',
    lowerCard.includes('weight-class guidance safety-first')
      && lowerCard.includes('asks for more context')
      && ![
        'water cut',
        'dehydration',
        'sweat suit',
        'sauna',
        'diuretic',
        'laxative',
        'push through',
        'proceed anyway',
      ].some((term) => lowerCard.includes(term)),
  );
})();

(() => {
  const resolution = resolveFirstRunWalkthroughState({
    userId: 'existing-overhaul-user',
    hasProfile: true,
    hasHistoricalTrainingData: true,
    hasHistoricalNutritionData: true,
    hasHistoricalReadinessData: true,
    hasHistoricalBodyMassData: true,
    hasHistoricalScheduleData: true,
    hasActiveBuildGoal: true,
    source: 'app_entry',
    now: NOW,
  });

  const introSeen = markFirstRunWalkthroughStepCompleted({
    state: resolution.state,
    step: 'today_mission_intro',
    now: NOW,
  });
  const completed = markFirstRunWalkthroughStepCompleted({
    state: introSeen,
    step: 'app_tour',
    now: NOW,
  });
  const repeatResolution = resolveFirstRunWalkthroughState({
    userId: 'existing-overhaul-user',
    hasProfile: true,
    hasHistoricalTrainingData: true,
    existingState: completed,
    source: 'app_entry',
    now: NOW,
  });

  assert('existing migrated user needs existing_user_overhaul_intro', resolution.appliesTo === 'existing_user_overhaul_intro');
  assert('existing user intro starts at Today Mission, not onboarding', resolution.state.currentStep === 'today_mission_intro');
  assert('completed existing-user walkthrough does not repeat', !repeatResolution.needsWalkthrough);
})();

(() => {
  const initialized = initializeJourneyFromOnboarding({
    userId: 'existing-preserved-user',
    capturedAt: NOW,
    asOfDate: '2026-04-29',
    age: 29,
    currentWeightLbs: 170,
    biologicalSex: 'unknown',
    trainingBackground: 'advanced',
    goalMode: 'fight_camp',
    buildGoalType: 'conditioning',
    fightDate: '2026-06-12',
    targetWeightLbs: 165,
    availableDays: [1, 2, 4, 6],
    fixedSessions: [
      {
        id: 'sparring-anchor',
        activityType: 'sparring',
        dayOfWeek: 4,
        startTime: '18:30',
        durationMin: 90,
        expectedIntensity: 9,
        label: 'Team sparring',
      },
    ],
  });
  const beforeJourney = initialized.journey;
  const beforePerformanceState = initialized.performanceState;
  const walkthrough = createFirstRunWalkthroughState({
    userId: 'existing-preserved-user',
    appliesTo: 'existing_user_overhaul_intro',
    source: 'existing_user_migration',
    now: NOW,
  });
  const dismissed = dismissFirstRunWalkthrough({ state: walkthrough, now: NOW });
  const continuity = verifyFirstRunWalkthroughDoesNotResetAthleteJourneyState({
    beforeJourney,
    afterJourney: initialized.journey,
    beforePerformanceState,
    afterPerformanceState: initialized.performanceState,
  });

  assert('existing user data is preserved when intro is dismissed', dismissed.status === 'dismissed' && continuity.journeyPreserved);
  assert('PerformanceState is preserved when intro is dismissed', continuity.performanceStatePreserved);
  assert('no phase reset occurs', initialized.performanceState.phase.current === beforePerformanceState.phase.current);
  assert('protected workout anchor is preserved', initialized.journey.protectedWorkoutAnchors[0]?.id === 'sparring-anchor');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
