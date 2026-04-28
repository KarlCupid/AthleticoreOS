import {
  initializeJourneyFromExistingData,
  initializeJourneyFromOnboarding,
  resolveJourneyAppEntryStatus,
} from './index.ts';

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

console.log('\n-- initializeAthleteJourney --');

(() => {
  const initialized = initializeJourneyFromOnboarding({
    userId: 'user-1',
    capturedAt: '2026-04-28T12:00:00.000Z',
    asOfDate: '2026-04-28',
    age: 25,
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
  });

  assert('new onboarding creates journey state', initialized.journey.journeyId === 'user-1:journey');
  assert('new onboarding creates initial performance state', initialized.performanceState.journey === initialized.journey);
  assert('athlete profile keeps age baseline', initialized.athlete.ageYears === 25);
  assert('body mass baseline is preserved', initialized.journey.bodyMassState?.current?.value === 155);
  assert('initial phase is build for build phase onboarding', initialized.journey.phase.current === 'build');
  assert('phase initialization is a transition, not restart', initialized.journey.phase.isRestart === false);
  assert('training availability is preserved', initialized.journey.trainingAvailability?.availableDays.length === 3);
  assert('nutrition preference is preserved', initialized.journey.nutritionPreferences.goal === 'maintain');
  assert('tracking preference is preserved', initialized.journey.trackingPreferences.readiness);
})();

(() => {
  const initialized = initializeJourneyFromOnboarding({
    userId: 'user-2',
    capturedAt: '2026-04-28T12:00:00.000Z',
    asOfDate: '2026-04-28',
    age: null,
    currentWeightLbs: null,
    biologicalSex: 'unknown',
    trainingBackground: 'new',
    goalMode: 'build_phase',
    buildGoalType: 'strength',
    fightDate: null,
    targetWeightLbs: null,
    availableDays: [2, 4],
    fixedSessions: [],
  });

  assert('missing age is unknown, not zero', initialized.athlete.ageYears === null);
  assert('missing body mass stays null', initialized.journey.bodyMassState?.current === null);
  assert('missing fields are recorded', initialized.journey.missingFields.some((field) => field.field === 'current_body_mass'));
  assert('initial data-quality risk is raised for missing body mass', initialized.journey.riskFlags.some((flag) => (
    flag.code === 'missing_data' &&
    flag.evidence.some((item) => item.metric === 'current_body_mass')
  )));
})();

(() => {
  const initialized = initializeJourneyFromOnboarding({
    userId: 'user-3',
    capturedAt: '2026-04-28T12:00:00.000Z',
    asOfDate: '2026-04-28',
    age: 28,
    currentWeightLbs: 150,
    biologicalSex: 'female',
    trainingBackground: 'advanced',
    goalMode: 'fight_camp',
    buildGoalType: 'conditioning',
    fightDate: '2026-06-15',
    targetWeightLbs: 145,
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

  assert('fight camp onboarding creates camp phase state', initialized.journey.phase.current === 'camp');
  assert('known fight is captured as fight opportunity', initialized.journey.activeFightOpportunity?.competitionDate === '2026-06-15');
  assert('target body mass range is preserved', initialized.journey.weightClassPlan?.targetBodyMassRange.target === 145);
  assert('protected workout is preserved as anchor', initialized.journey.protectedWorkoutAnchors[0]?.nonNegotiable === true);
  assert('protected workout is also exposed in initial performance sessions', initialized.performanceState.composedSessions[0]?.protectedAnchor === true);
})();

(() => {
  const initialized = initializeJourneyFromExistingData({
    userId: 'legacy-user',
    asOfDate: '2026-04-28',
    generatedAt: '2026-04-28T12:00:00.000Z',
    profile: {
      user_id: 'legacy-user',
      age: 31,
      biological_sex: 'male',
      fight_status: 'amateur',
      phase: 'off-season',
      base_weight: 170,
      target_weight: 165,
      fight_date: null,
      athlete_goal_mode: 'build_phase',
      performance_goal_type: 'weight_class_prep',
      nutrition_goal: 'cut',
      cycle_tracking: false,
      training_age: 'intermediate',
    },
    availability: {
      available_days: [1, 3, 5],
      availability_windows: [
        { dayOfWeek: 1, startTime: '18:00', endTime: '20:00' },
        { dayOfWeek: 3, startTime: '18:00', endTime: '20:00' },
        { dayOfWeek: 5, startTime: '18:00', endTime: '20:00' },
      ],
      session_duration_min: 75,
      allow_two_a_days: false,
    },
    recurringActivities: [
      {
        id: 'boxing-anchor',
        activity_type: 'boxing_practice',
        custom_label: 'Boxing class',
        start_time: '19:00:00',
        estimated_duration_min: 90,
        expected_intensity: 7,
        recurrence: { frequency: 'weekly', days_of_week: [3] },
        constraint_tier: 'mandatory',
      },
    ],
    hasActiveBuildGoal: true,
    hasActiveFightCamp: false,
  });

  assert('existing user initializes journey state', initialized.journey.journeyId === 'legacy-user:journey');
  assert('existing user migration preserves age', initialized.athlete.ageYears === 31);
  assert('existing user migration preserves body mass baseline', initialized.journey.bodyMassState?.current?.value === 170);
  assert('existing user migration preserves nutrition goal', initialized.journey.nutritionPreferences.goal === 'cut');
  assert('existing user migration preserves protected workouts', initialized.journey.protectedWorkoutAnchors.length === 1);
  assert('existing user migration creates initial performance state', initialized.performanceState.bodyMass?.current?.value === 170);
})();

(() => {
  assert(
    'missing profile needs onboarding',
    resolveJourneyAppEntryStatus({
      hasProfile: false,
      planningSetupVersion: 0,
      requiredPlanningSetupVersion: 2,
      hasTrainingAvailability: false,
      hasActiveObjective: false,
    }) === 'needs_onboarding',
  );
  assert(
    'profile without active objective needs training setup',
    resolveJourneyAppEntryStatus({
      hasProfile: true,
      planningSetupVersion: 2,
      requiredPlanningSetupVersion: 2,
      hasTrainingAvailability: true,
      hasActiveObjective: false,
    }) === 'needs_training_setup',
  );
  assert(
    'profile with journey prerequisites is ready',
    resolveJourneyAppEntryStatus({
      hasProfile: true,
      planningSetupVersion: 2,
      requiredPlanningSetupVersion: 2,
      hasTrainingAvailability: true,
      hasActiveObjective: true,
    }) === 'ready',
  );
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
