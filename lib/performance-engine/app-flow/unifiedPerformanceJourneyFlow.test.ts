import {
  buildUnifiedPerformanceViewModel,
  cancelFightOpportunity,
  confidenceFromLevel,
  confirmFightOpportunity,
  createFightOpportunity,
  createFoodEntry,
  createTrackingEntry,
  createUnknownBodyMassState,
  initializeJourneyFromOnboarding,
  normalizeBodyMass,
  rescheduleFightOpportunity,
  runUnifiedPerformanceEngine,
  type AthleteJourneyInitialization,
  type FoodEntry,
  type OnboardingJourneyInput,
  type ProtectedAnchorInput,
  type TrackingEntry,
  type UnifiedPerformanceEngineResult,
} from '../index.ts';

// Highest-available-level app-flow tests. The repo has no runtime E2E runner,
// so this verifies onboarding -> UPE -> dashboard integration without mocking
// the canonical performance engines.

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

const ATHLETE_ID = 'athlete-flow';
const DATE = '2026-05-06';
const WEEK_START = '2026-05-04';
const GENERATED_AT = '2026-05-06T12:00:00.000Z';
const CONFIDENCE = confidenceFromLevel('medium');

type FightOpportunity = ReturnType<typeof createFightOpportunity>;

function onboardingInput(overrides: Partial<OnboardingJourneyInput> = {}): OnboardingJourneyInput {
  return {
    userId: ATHLETE_ID,
    capturedAt: GENERATED_AT,
    asOfDate: DATE,
    age: 24,
    currentWeightLbs: 170,
    biologicalSex: 'male',
    trainingBackground: 'advanced',
    goalMode: 'build_phase',
    buildGoalType: 'conditioning',
    fightDate: null,
    targetWeightLbs: null,
    availableDays: [1, 2, 3, 4, 5],
    fixedSessions: [
      {
        id: 'onboarding-sparring',
        activityType: 'sparring',
        dayOfWeek: 3,
        startTime: '18:00',
        durationMin: 90,
        expectedIntensity: 8,
        label: 'Team sparring',
      },
    ],
    nutritionPreferences: { goal: 'maintain' },
    trackingPreferences: { bodyMass: true, readiness: true, nutrition: true, cycle: false },
    ...overrides,
  };
}

function initialize(overrides: Partial<OnboardingJourneyInput> = {}): AthleteJourneyInitialization {
  return initializeJourneyFromOnboarding(onboardingInput(overrides));
}

function protectedAnchor(input: {
  id: string;
  kind: ProtectedAnchorInput['kind'];
  date?: string | null;
  label?: string;
  intensity?: number;
  duration?: number;
  canMerge?: boolean;
}): ProtectedAnchorInput {
  const date = input.date ?? DATE;

  return {
    id: input.id,
    label: input.label ?? input.kind.replace(/_/g, ' '),
    kind: input.kind,
    family: input.kind === 'sparring' ? 'sparring' : input.kind === 'competition' ? 'assessment' : undefined,
    dayOfWeek: date ? new Date(`${date}T00:00:00.000Z`).getUTCDay() : 3,
    date,
    startTime: '18:00',
    durationMinutes: input.duration ?? 75,
    intensityRpe: input.intensity ?? 7,
    source: input.kind === 'competition' ? 'competition' : 'protected_anchor',
    canMerge: input.canMerge ?? false,
    reason: 'Fixed athlete commitment.',
  };
}

function trackingEntry(input: {
  id: string;
  type: TrackingEntry['type'];
  value: unknown;
  unit?: string | null;
  daysAgo?: number;
  source?: TrackingEntry['source'];
}): TrackingEntry {
  const timestamp = new Date(`${DATE}T08:00:00.000Z`);
  timestamp.setUTCDate(timestamp.getUTCDate() - (input.daysAgo ?? 0));

  return createTrackingEntry({
    id: input.id,
    athleteId: ATHLETE_ID,
    timestamp: timestamp.toISOString(),
    timezone: 'America/Vancouver',
    type: input.type,
    source: input.source ?? 'user_reported',
    value: input.value,
    unit: input.unit ?? 'score_1_5',
    confidence: CONFIDENCE,
  });
}

function verifiedFoodEntry(id = 'verified-food'): FoodEntry {
  return createFoodEntry({
    id,
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T09:00:00.000Z`,
    mealType: 'breakfast',
    foodName: 'Oats with yogurt',
    quantity: 1,
    unit: 'serving',
    gramsNormalized: 250,
    source: 'ingredient',
    sourceId: 'fdc:12345',
    nutrients: {
      energyKcal: 540,
      proteinG: 34,
      carbohydrateG: 76,
      fatG: 14,
      fiberG: 9,
      sodiumMg: 320,
      potassiumMg: 620,
      calciumMg: 260,
      ironMg: 4,
      magnesiumMg: 95,
    },
    isVerified: true,
  });
}

function lowConfidenceFoodEntry(): FoodEntry {
  return createFoodEntry({
    id: 'manual-low-confidence-food',
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T13:00:00.000Z`,
    mealType: 'lunch',
    foodName: 'Estimated bowl',
    quantity: 1,
    unit: 'bowl',
    gramsNormalized: null,
    source: 'custom',
    nutrients: {
      energyKcal: 300,
    },
    isUserEstimated: true,
    isCustomFood: true,
  });
}

function runFlow(input: {
  initialized?: AthleteJourneyInitialization;
  performanceState?: AthleteJourneyInitialization['performanceState'];
  fight?: FightOpportunity | null;
  protectedAnchors?: ProtectedAnchorInput[];
  trackingEntries?: TrackingEntry[];
  foodEntries?: FoodEntry[];
  currentWeightLbs?: number | null;
  targetWeightLbs?: number | null;
  competitionDate?: string;
  weighInDateTime?: string;
} = {}): UnifiedPerformanceEngineResult {
  const initialized = input.initialized ?? initialize();
  const currentBodyMass = input.currentWeightLbs === null
    ? createUnknownBodyMassState('lb')
    : {
      ...createUnknownBodyMassState('lb'),
      current: normalizeBodyMass({
        value: input.currentWeightLbs ?? initialized.journey.bodyMassState?.current?.value ?? 170,
        fromUnit: 'lb',
        toUnit: 'lb',
        measuredOn: DATE,
        confidence: CONFIDENCE,
      }),
      missingFields: [],
      confidence: CONFIDENCE,
    };
  const targetClassMass = input.targetWeightLbs == null
    ? null
    : normalizeBodyMass({
      value: input.targetWeightLbs,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: input.competitionDate ?? '2026-05-21',
      confidence: CONFIDENCE,
    });

  return runUnifiedPerformanceEngine({
    performanceState: input.performanceState ?? initialized.performanceState,
    athlete: initialized.athlete,
    journey: initialized.journey,
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    fightOpportunity: input.fight ?? null,
    protectedAnchors: input.protectedAnchors,
    trackingEntries: input.trackingEntries,
    bodyMassState: currentBodyMass,
    weightClass: targetClassMass
      ? {
        competitionId: 'weight-class-flow',
        competitionDate: input.competitionDate ?? '2026-05-21',
        weighInDateTime: input.weighInDateTime ?? '2026-05-20T18:00:00.000Z',
        competitionDateTime: `${input.competitionDate ?? '2026-05-21'}T04:00:00.000Z`,
        targetClassMass,
        desiredScaleWeight: targetClassMass,
      }
      : null,
    foodEntries: input.foodEntries ?? [verifiedFoodEntry()],
  });
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

console.log('\n-- unified performance journey app-flow --');

(() => {
  const initialized = initialize({
    age: null,
    currentWeightLbs: null,
    availableDays: [1, 3, 5],
    fixedSessions: [],
    nutritionPreferences: { goal: 'unknown' },
  });
  const result = runFlow({
    initialized,
    currentWeightLbs: null,
    foodEntries: [verifiedFoodEntry('verified-onboarding-food')],
  });
  const viewModel = buildUnifiedPerformanceViewModel(result);

  assert('onboarding creates an AthleteJourneyState', initialized.journey.journeyId === `${ATHLETE_ID}:journey`);
  assert('onboarding initializes PerformanceState', initialized.performanceState.journey === initialized.journey);
  assert('missing age remains unknown, not zero', initialized.athlete.ageYears === null);
  assert('missing body mass remains unknown, not zero', initialized.journey.bodyMassState?.current === null);
  assert('missing onboarding fields are recorded', initialized.journey.missingFields.some((field) => field.field === 'current_body_mass'));
  assert('dashboard consumes initialized journey output', viewModel.available && viewModel.journey.continuityLabel.length > 0);
})();

(() => {
  const initialized = initialize();
  const baselineTracking = [
    trackingEntry({ id: 'baseline-readiness', type: 'readiness', value: 4 }),
    trackingEntry({ id: 'baseline-sleep', type: 'sleep_quality', value: 4 }),
    trackingEntry({ id: 'baseline-nutrition', type: 'nutrition_adherence', value: 90, unit: 'percent' }),
  ];
  const confirmedFight = createFightOpportunity({
    id: 'confirmed-camp-flow',
    athleteId: ATHLETE_ID,
    status: 'confirmed',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-06-27',
    weighInDate: '2026-06-26',
    targetWeightClassName: 'Welterweight',
    targetWeightLbs: 168,
  });
  const result = runFlow({
    initialized,
    fight: confirmedFight,
    trackingEntries: baselineTracking,
    currentWeightLbs: 170,
  });
  const viewModel = buildUnifiedPerformanceViewModel(result);

  assert('build phase transitions to camp', result.performanceState.phase.current === 'camp');
  assert('build to camp preserves journey identity', result.performanceState.journey.journeyId === initialized.journey.journeyId);
  assert('build to camp preserves tracking context', result.performanceState.trackingEntries.length === baselineTracking.length);
  assert('build to camp preserves body-mass context', result.performanceState.bodyMass?.current?.value === 170);
  assert('build to camp preserves nutrition context', result.nutrition.target.phase === 'camp');
  assert('dashboard explains build to camp transition', Boolean(viewModel.phase.changeSummary || viewModel.journey.whatChangedLabel));
})();

(() => {
  const initialized = initialize();
  const history = [
    trackingEntry({ id: 'fight-history-ready', type: 'readiness', value: 4 }),
    trackingEntry({ id: 'fight-history-sleep', type: 'sleep_quality', value: 4 }),
  ];
  const tentative = createFightOpportunity({
    id: 'tentative-flow',
    athleteId: ATHLETE_ID,
    status: 'tentative',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-07-18',
    targetWeightClassName: 'Welterweight',
    targetWeightLbs: 168,
  });
  const tentativeResult = runFlow({ initialized, fight: tentative, trackingEntries: history });
  const confirmed = confirmFightOpportunity(tentative, {
    asOfDate: DATE,
    updatedAt: GENERATED_AT,
    currentPhase: tentativeResult.performanceState.phase.current,
    competitionDate: '2026-07-18',
  });
  const confirmedResult = runFlow({
    initialized,
    performanceState: tentativeResult.performanceState,
    fight: confirmed,
    trackingEntries: history,
  });
  const shortNotice = createFightOpportunity({
    id: 'short-notice-flow',
    athleteId: ATHLETE_ID,
    status: 'short_notice',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-05-20',
    targetWeightClassName: 'Lightweight',
    targetWeightLbs: 166,
  });
  const shortNoticeResult = runFlow({ initialized, fight: shortNotice, trackingEntries: history });
  const canceled = cancelFightOpportunity(confirmed, {
    asOfDate: DATE,
    updatedAt: GENERATED_AT,
    currentPhase: confirmedResult.performanceState.phase.current,
    reason: 'Opponent withdrew',
  });
  const canceledResult = runFlow({
    initialized,
    performanceState: confirmedResult.performanceState,
    fight: canceled,
    trackingEntries: history,
  });
  const rescheduled = rescheduleFightOpportunity(confirmed, {
    asOfDate: DATE,
    updatedAt: GENERATED_AT,
    currentPhase: confirmedResult.performanceState.phase.current,
    competitionDate: '2026-10-15',
    weighInDate: '2026-10-14',
  });
  const rescheduledResult = runFlow({
    initialized,
    performanceState: confirmedResult.performanceState,
    fight: rescheduled,
    trackingEntries: history,
  });

  assert('tentative fight updates journey without overriding phase', tentativeResult.performanceState.phase.current === 'build');
  assert('tentative fight appears in dashboard journey context', buildUnifiedPerformanceViewModel(tentativeResult).journey.nextEventLabel?.toLowerCase().includes('fight') === true);
  assert('confirmed fight transitions appropriately', confirmedResult.performanceState.phase.current === 'camp');
  assert('short-notice fight recommends short-notice camp', shortNoticeResult.performanceState.phase.current === 'short_notice_camp');
  assert('canceled fight returns toward build without data loss', canceledResult.performanceState.phase.current === 'build' && canceledResult.performanceState.trackingEntries.length === history.length);
  assert('rescheduled fight preserves history while easing camp pressure', rescheduledResult.performanceState.phase.current === 'build' && rescheduled.history.length > confirmed.history.length);
})();

(() => {
  const initialized = initialize();
  const dashboardResult = runFlow({
    initialized,
    protectedAnchors: [
      protectedAnchor({ id: 'dashboard-sparring', kind: 'sparring', label: 'Team sparring', intensity: 8 }),
    ],
    trackingEntries: [
      trackingEntry({ id: 'dashboard-readiness', type: 'readiness', value: 2 }),
      trackingEntry({ id: 'dashboard-sleep', type: 'sleep_quality', value: 2 }),
      trackingEntry({ id: 'dashboard-soreness', type: 'soreness', value: 5 }),
      trackingEntry({ id: 'dashboard-nutrition', type: 'nutrition_adherence', value: 40, unit: 'percent' }),
    ],
    currentWeightLbs: 180,
    targetWeightLbs: 160,
    competitionDate: '2026-05-21',
  });
  const viewModel = buildUnifiedPerformanceViewModel(dashboardResult);

  assert('dashboard displays current phase', viewModel.phase.current !== 'unknown');
  assert('dashboard displays protected workouts', viewModel.protectedAnchors.some((item) => item.label === 'Team sparring'));
  assert('dashboard displays training focus', viewModel.focus.training.length > 0);
  assert('dashboard displays nutrition focus', viewModel.focus.nutrition.length > 0);
  assert('dashboard displays readiness context', viewModel.readiness.band !== 'unknown' && viewModel.readiness.explanation.length > 0);
  assert('dashboard displays body-mass or weight-class context', viewModel.bodyMass !== null && viewModel.focus.bodyMass !== null);
  assert('dashboard surfaces risk flags', viewModel.riskFlags.length > 0);
  assert('dashboard surfaces explanations', viewModel.explanations.length > 0);
})();

(() => {
  const initialized = initialize();
  const sparring = protectedAnchor({ id: 'fueling-sparring', kind: 'sparring', label: 'Hard sparring', intensity: 9, duration: 90 });
  const buildBaseline = runFlow({ initialized, protectedAnchors: [] });
  const campFight = createFightOpportunity({
    id: 'fueling-camp-fight',
    athleteId: ATHLETE_ID,
    status: 'confirmed',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-06-20',
  });
  const campSparring = runFlow({
    initialized,
    fight: campFight,
    protectedAnchors: [sparring],
  });
  const lowConfidence = runFlow({
    initialized,
    fight: campFight,
    protectedAnchors: [sparring],
    foodEntries: [lowConfidenceFoodEntry()],
  });
  const campCalories = campSparring.nutrition.target.energyTargetRange.target ?? 0;
  const buildCalories = buildBaseline.nutrition.target.energyTargetRange.target ?? 0;
  const sparringDirective = campSparring.nutrition.sessionFuelingDirectives.find((directive) => directive.sessionId === sparring.id);

  assert('sparring or camp day increases nutrition target demand', campCalories > buildCalories);
  assert('session fueling directive is available for sparring', sparringDirective?.priority === 'high');
  assert('dashboard can show session fueling directive summary', buildUnifiedPerformanceViewModel(campSparring).nutrition.sessionFuelingSummary !== null);
  assert('low nutrition confidence is surfaced', lowConfidence.riskFlags.some((flag) => flag.code === 'low_nutrition_confidence') && buildUnifiedPerformanceViewModel(lowConfidence).lowConfidence);
})();

(() => {
  const initialized = initialize();
  const sparring = protectedAnchor({ id: 'tracking-sparring', kind: 'sparring', label: 'Protected sparring', intensity: 8 });
  const poorTracking = [
    trackingEntry({ id: 'poor-readiness', type: 'readiness', value: 1 }),
    trackingEntry({ id: 'poor-sleep', type: 'sleep_quality', value: 2 }),
    trackingEntry({ id: 'high-soreness', type: 'soreness', value: 5 }),
    trackingEntry({ id: 'high-fatigue', type: 'fatigue', value: 5 }),
    trackingEntry({ id: 'high-stress', type: 'stress', value: 5 }),
    trackingEntry({ id: 'nutrition-support', type: 'nutrition_adherence', value: 55, unit: 'percent' }),
    trackingEntry({ id: 'good-hrv', type: 'hrv', value: 95, unit: 'ms', source: 'device' }),
  ];
  const result = runFlow({
    initialized,
    protectedAnchors: [sparring],
    trackingEntries: poorTracking,
  });
  const generatedHard = result.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 7);
  const viewModel = buildUnifiedPerformanceViewModel(result);

  assert('poor tracking changes readiness', result.readiness.readiness.readinessBand === 'red' || result.readiness.readiness.readinessBand === 'orange');
  assert('subjective low readiness is respected over good wearable data', result.readiness.readiness.trendFlags.includes('wearable_conflict_subjective_concern'));
  assert('readiness adjusts generated training recommendation', generatedHard.length === 0);
  assert('readiness explanation is surfaced', viewModel.readiness.explanation.length > 0 && viewModel.readiness.recommendedTrainingAdjustmentLabel !== null);
})();

(() => {
  const initialized = initialize({
    currentWeightLbs: 180,
    targetWeightLbs: 160,
  });
  const result = runFlow({
    initialized,
    currentWeightLbs: 180,
    targetWeightLbs: 160,
    competitionDate: '2026-05-21',
    weighInDateTime: '2026-05-20T18:00:00.000Z',
  });
  const viewModel = buildUnifiedPerformanceViewModel(result);
  const text = allText([result.weightClass, viewModel.bodyMass, result.explanations, result.riskFlags]);
  const bannedMethods = [
    'sauna',
    'sweat suit',
    'diuretic',
    'laxative',
    'vomiting',
    'severe fasting',
    'extreme fluid restriction',
  ];

  assert('unsafe body-mass target is blocked', result.finalPlanStatus === 'blocked');
  assert('body-mass flow surfaces safer alternatives or professional review', Boolean(result.weightClass?.plan.alternatives.length || result.weightClass?.plan.professionalReviewRequired));
  assert('body-mass dashboard surfaces feasibility and safety', viewModel.bodyMass?.feasibilityLabel !== null && viewModel.bodyMass?.safetyLabel !== null);
  assert('dangerous dehydration methods do not appear', bannedMethods.every((method) => !text.includes(method)));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
