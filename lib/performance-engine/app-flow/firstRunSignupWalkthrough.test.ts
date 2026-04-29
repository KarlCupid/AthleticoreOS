import fs from 'node:fs';
import path from 'node:path';
import {
  initializeJourneyFromOnboarding,
  type OnboardingJourneyInput,
} from '../journey/initializeAthleteJourney.ts';
import {
  createFirstRunWalkthroughState,
  completeFirstRunWalkthrough,
  markFirstRunWalkthroughStepCompleted,
  skipFirstRunWalkthroughStep,
} from './firstRunWalkthroughState.ts';

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

function onboardingInput(overrides: Partial<OnboardingJourneyInput> = {}): OnboardingJourneyInput {
  return {
    userId: 'new-signup-user',
    capturedAt: '2026-04-29T12:00:00.000Z',
    asOfDate: '2026-04-29',
    age: 24,
    currentWeightLbs: 155,
    biologicalSex: 'male',
    trainingBackground: 'some',
    goalMode: 'build_phase',
    buildGoalType: 'conditioning',
    fightDate: null,
    targetWeightLbs: null,
    availableDays: [1, 3, 5],
    fixedSessions: [],
    nutritionPreferences: { goal: 'maintain' },
    trackingPreferences: { bodyMass: true, readiness: true, nutrition: true, cycle: false },
    ...overrides,
  };
}

console.log('\n-- firstRunSignupWalkthrough --');

(() => {
  const app = read('App.tsx');
  const onboarding = read('src/screens/OnboardingScreen.tsx');

  assert(
    'new sign-up enters walkthrough through no-profile onboarding route',
    app.includes("entryStatus === 'needs_onboarding'")
      && app.includes('<OnboardingScreen onComplete={() => { void refreshJourneyEntryState(); }} />')
      && onboarding.includes('Welcome to Athleticore.'),
  );

  assert(
    'walkthrough keeps current theme and component language',
    onboarding.includes("from '../theme/theme'")
      && onboarding.includes('styles.phaseCard')
      && onboarding.includes('styles.activityOptionCard')
      && onboarding.includes('AnimatedPressable')
      && onboarding.includes('ImageBackground'),
  );

  assert(
    'required steps stay minimal and optional sections can be skipped',
    onboarding.includes('const TOTAL_STEPS = 6')
      && onboarding.includes('availableDays.length > 0')
      && onboarding.includes("Age (optional)")
      && onboarding.includes("Current weight (optional)")
      && onboarding.includes("Not sure yet")
      && onboarding.includes('Optional. Skip this if nothing is fixed yet. Athleticore can ask again later.'),
  );

  assert(
    'Today Mission intro and completion CTA are present',
    onboarding.includes('Each day, Athleticore gives you a mission: what matters today, why it matters, what changed, and what to do next.')
      && onboarding.includes('Build my first mission')
      && onboarding.includes('onComplete()'),
  );
})();

(() => {
  const onboarding = read('src/screens/OnboardingScreen.tsx');
  const intake = read('src/screens/onboarding/completeCoachIntake.ts');

  assert(
    'no fight yet path uses build guidance without forcing a camp',
    onboarding.includes("No fight on the calendar? That's fine. Athleticore will help you build")
      && intake.includes("fightStatus === 'none' ? null : input.fightDate"),
  );

  assert(
    'tentative fight path does not force fight camp',
    onboarding.includes("fightStatus === 'confirmed' && fightDateWillBeSaved ? 'fight_camp' : 'build_phase'")
      && onboarding.includes("Add what you know without forcing camp language too early."),
  );

  assert(
    'confirmed fight path can create fight camp context',
    intake.includes("goalMode === 'fight_camp'")
      && intake.includes("fightOpportunityStatus: 'confirmed'")
      && intake.includes('targetWeightClassName: input.targetWeightClassName'),
  );

  assert(
    'readiness baseline saves into canonical check-in fields',
    intake.includes("from('daily_checkins')")
      && intake.includes('sleep_quality')
      && intake.includes('soreness_level')
      && intake.includes('pain_level')
      && intake.includes('checkin_version: 2'),
  );

  assert(
    'first-run walkthrough setup progress is persisted from onboarding',
    intake.includes('persistFirstRunWalkthroughState')
      && intake.includes("appliesTo: 'new_signup'")
      && intake.includes("step: 'today_mission_intro'")
      && !intake.includes('completeFirstRunWalkthrough'),
  );
})();

(() => {
  const source = [
    read('src/screens/OnboardingScreen.tsx'),
    read('src/screens/onboarding/completeCoachIntake.ts'),
  ].join('\n').toLowerCase();
  const unsafeTerms = [
    'water cut',
    'dehydration',
    'sweat suit',
    'sauna',
    'diuretic',
    'laxative',
    'push through',
    'proceed anyway',
  ];

  assert(
    'body-mass and weight-class setup uses safe language',
    source.includes('athleticore checks whether a target looks realistic while protecting performance.')
      && source.includes('we need a little body-mass history before making a confident call.')
      && !unsafeTerms.some((term) => source.includes(term)),
  );
})();

(() => {
  const initialized = initializeJourneyFromOnboarding(onboardingInput({
    age: null,
    currentWeightLbs: null,
    targetWeightLbs: null,
    nutritionPreferences: { goal: 'unknown', dietaryNotes: ['vegetarian'], supplementNotes: [] },
    injuryOrLimitationNotes: ['Returning after shoulder irritation.'],
  }));

  assert('AthleteJourneyState is created for brand-new setup', initialized.journey.journeyId === 'new-signup-user:journey');
  assert('PerformanceState is initialized for brand-new setup', initialized.performanceState.journey === initialized.journey);
  assert('missing body mass remains unknown, not zero', initialized.journey.bodyMassState?.current === null);
  assert('missing age remains unknown, not zero', initialized.athlete.ageYears === null);
  assert('fueling preferences are stored on the journey', initialized.journey.nutritionPreferences.dietaryNotes.includes('vegetarian'));
  assert('readiness or injury context is stored as limitation notes', initialized.journey.limitationNotes.length === 1);
})();

(() => {
  const initialized = initializeJourneyFromOnboarding(onboardingInput({
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
  }));

  assert('protected workouts are saved as anchors', initialized.journey.protectedWorkoutAnchors[0]?.nonNegotiable === true);
  assert('protected anchors appear in PerformanceState sessions', initialized.performanceState.composedSessions[0]?.protectedAnchor === true);
})();

(() => {
  const noFight = initializeJourneyFromOnboarding(onboardingInput({
    goalMode: 'build_phase',
    fightDate: null,
  }));
  const confirmedFight = initializeJourneyFromOnboarding(onboardingInput({
    goalMode: 'fight_camp',
    fightDate: '2026-07-01',
    targetWeightLbs: 150,
  }));

  assert('no fight yet path creates a build journey', noFight.journey.phase.current === 'build');
  assert('confirmed fight path creates active fight opportunity', confirmedFight.journey.activeFightOpportunity?.competitionDate === '2026-07-01');
})();

(() => {
  let state = createFirstRunWalkthroughState({
    userId: 'new-signup-user',
    appliesTo: 'new_signup',
    source: 'onboarding',
    now: '2026-04-29T12:00:00.000Z',
  });

  state = markFirstRunWalkthroughStepCompleted({ state, step: 'welcome', now: '2026-04-29T12:01:00.000Z' });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'journey_setup', now: '2026-04-29T12:02:00.000Z' });
  state = skipFirstRunWalkthroughStep({ state, step: 'protected_workout_setup', now: '2026-04-29T12:03:00.000Z' });
  state = skipFirstRunWalkthroughStep({ state, step: 'fight_context_setup', now: '2026-04-29T12:04:00.000Z' });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'fueling_setup', now: '2026-04-29T12:05:00.000Z' });
  state = skipFirstRunWalkthroughStep({ state, step: 'readiness_baseline', now: '2026-04-29T12:06:00.000Z' });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'today_mission_intro', now: '2026-04-29T12:07:00.000Z' });
  const completed = completeFirstRunWalkthrough({ state, now: '2026-04-29T12:08:00.000Z' });

  assert('new signup walkthrough can complete with optional sections skipped', completed.status === 'completed');
  assert('skipped protected workouts are not marked as completed anchors', !completed.hasCompletedProtectedWorkoutSetup);
  assert('Today Mission intro is marked complete', completed.hasSeenTodayMissionIntro);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
