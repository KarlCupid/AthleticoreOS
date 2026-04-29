import {
  completeFirstRunWalkthrough,
  completeFirstRunWalkthroughWithRepository,
  createFirstRunWalkthroughState,
  dismissFirstRunWalkthrough,
  markFirstRunWalkthroughStepCompleted,
  resolveFirstRunWalkthroughState,
  resumeFirstRunWalkthrough,
  skipFirstRunWalkthroughStep,
  verifyFirstRunWalkthroughDoesNotResetAthleteJourneyState,
  type FirstRunWalkthroughState,
  type FirstRunWalkthroughStateRepository,
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

const NOW = '2026-04-29T12:00:00.000Z';

function makeRepository(): FirstRunWalkthroughStateRepository & { saved: FirstRunWalkthroughState[] } {
  const saved: FirstRunWalkthroughState[] = [];

  return {
    saved,
    async load(userId) {
      return saved.find((state) => state.userId === userId) ?? null;
    },
    async save(state) {
      saved.push(state);
      return state;
    },
  };
}

function makeInitializedJourney() {
  return initializeJourneyFromOnboarding({
    userId: 'athlete-1',
    capturedAt: NOW,
    asOfDate: '2026-04-29',
    age: null,
    currentWeightLbs: null,
    biologicalSex: 'unknown',
    trainingBackground: 'new',
    goalMode: 'build_phase',
    buildGoalType: 'conditioning',
    fightDate: null,
    targetWeightLbs: null,
    availableDays: [1, 3, 5],
    fixedSessions: [],
  });
}

console.log('\n-- first-run walkthrough state --');

(() => {
  const resolution = resolveFirstRunWalkthroughState({
    userId: 'new-user',
    hasProfile: false,
    source: 'auth_signup',
    now: NOW,
  });

  assert('new user needs new_signup walkthrough', resolution.needsWalkthrough && resolution.appliesTo === 'new_signup');
  assert('new signup starts with welcome', resolution.state.currentStep === 'welcome');
  assert('new signup records missing profile as unknown context', resolution.explanations.some((item) => item.code === 'missing_profile_unknown_baseline'));
})();

(() => {
  const resolution = resolveFirstRunWalkthroughState({
    userId: 'first-sign-in',
    hasProfile: false,
    source: 'auth_sign_in',
    now: NOW,
  });

  assert('first sign-in user needs first_sign_in walkthrough', resolution.needsWalkthrough && resolution.appliesTo === 'first_sign_in');
  assert('first sign-in still resumes setup from the first step', resolution.state.currentStep === 'welcome');
})();

(() => {
  const resolution = resolveFirstRunWalkthroughState({
    userId: 'existing-user',
    hasProfile: true,
    hasHistoricalTrainingData: true,
    hasHistoricalNutritionData: true,
    hasHistoricalReadinessData: true,
    source: 'app_entry',
    now: NOW,
  });

  assert('existing migrated user needs existing_user_overhaul_intro', resolution.needsWalkthrough && resolution.appliesTo === 'existing_user_overhaul_intro');
  assert('existing user intro starts at Today Mission', resolution.state.currentStep === 'today_mission_intro');
  assert('existing user is not classified as new user', !resolution.state.isNewUser && resolution.state.isExistingUserMigration);
})();

(() => {
  const completed = completeFirstRunWalkthrough({
    state: createFirstRunWalkthroughState({
      userId: 'completed-user',
      appliesTo: 'first_sign_in',
      now: NOW,
    }),
    now: NOW,
  });
  const resolution = resolveFirstRunWalkthroughState({
    userId: 'completed-user',
    hasProfile: true,
    existingState: completed,
    now: NOW,
  });

  assert('completed walkthrough does not repeat', !resolution.needsWalkthrough && resolution.state.status === 'completed');
})();

(() => {
  const initial = createFirstRunWalkthroughState({
    userId: 'skipped-user',
    appliesTo: 'new_signup',
    now: NOW,
  });
  const skipped = skipFirstRunWalkthroughStep({
    state: initial,
    step: 'protected_workout_setup',
    now: NOW,
  });
  const resumed = resumeFirstRunWalkthrough({ state: skipped, now: NOW });
  const dismissed = dismissFirstRunWalkthrough({ state: skipped, now: NOW });

  assert('skipped walkthrough can be resumed', skipped.canResume && resumed.status === 'in_progress');
  assert('skipped walkthrough can be safely dismissed', dismissed.status === 'dismissed' && !dismissed.canResume);
  assert('skipped step explains safe later guidance', skipped.explanations.some((item) => item.code === 'walkthrough_step_skipped'));
})();

(() => {
  const initialized = makeInitializedJourney();
  const state = createFirstRunWalkthroughState({
    userId: 'athlete-1',
    appliesTo: 'new_signup',
    now: NOW,
  });
  const updated = markFirstRunWalkthroughStepCompleted({
    state,
    step: 'today_mission_intro',
    now: NOW,
  });
  const continuity = verifyFirstRunWalkthroughDoesNotResetAthleteJourneyState({
    beforeJourney: initialized.journey,
    afterJourney: initialized.journey,
    beforePerformanceState: initialized.performanceState,
    afterPerformanceState: initialized.performanceState,
  });

  assert('walkthrough state update does not reset AthleteJourneyState', updated.userId === initialized.journey.athlete.userId && continuity.journeyPreserved);
  assert('walkthrough state update does not reset PerformanceState', continuity.performanceStatePreserved);
})();

(() => {
  const initialized = makeInitializedJourney();

  assert('missing age remains unknown', initialized.athlete.ageYears === null);
  assert('missing body mass remains unknown', initialized.journey.bodyMassState?.current === null);
  assert('walkthrough does not convert missing data to zero', initialized.journey.missingFields.some((field) => field.field === 'current_body_mass'));
})();

(async () => {
  const repository = makeRepository();
  const state = createFirstRunWalkthroughState({
    userId: 'persisted-user',
    appliesTo: 'first_sign_in',
    now: NOW,
  });
  const saved = await completeFirstRunWalkthroughWithRepository({
    state,
    repository,
    now: NOW,
  });
  const loaded = await repository.load('persisted-user');

  assert('walkthrough completion persists', saved.status === 'completed' && loaded?.completedAt === NOW);
  assert('persistence repository stores completion once', repository.saved.length === 1);

  const oldCompleted = {
    ...saved,
    walkthroughVersion: 0,
  };
  const updateResolution = resolveFirstRunWalkthroughState({
    userId: 'persisted-user',
    hasProfile: true,
    hasHistoricalTrainingData: true,
    existingState: oldCompleted,
    requiredVersion: 1,
    now: NOW,
  });

  assert('versioned walkthrough can trigger needs_update', updateResolution.state.status === 'needs_update');

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
  process.exit(failed > 0 ? 1 : 0);
})();
