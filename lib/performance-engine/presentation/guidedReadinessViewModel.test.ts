import {
  buildGuidedReadinessViewModel,
  buildTodaysMissionViewModel,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createFoodEntry,
  createPhaseState,
  createTrackingEntry,
  createUnknownBodyMassState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  type AthleteProfile,
  type AthleticorePhase,
  type FoodEntry,
  type ProtectedAnchorInput,
  type TrackingEntry,
} from '../index.ts';

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

const ATHLETE_ID = 'athlete-guided-readiness';
const DATE = '2026-05-06';
const WEEK_START = '2026-05-04';
const GENERATED_AT = '2026-05-06T12:00:00.000Z';
const CONFIDENCE = confidenceFromLevel('high');

function athlete(): AthleteProfile {
  return createAthleteProfile({
    athleteId: ATHLETE_ID,
    userId: ATHLETE_ID,
    sport: 'boxing',
    competitionLevel: 'amateur',
    ageYears: 25,
    trainingBackground: 'competitive',
    preferredBodyMassUnit: 'lb',
    confidence: CONFIDENCE,
  });
}

function bodyMass(weightLbs: number | null = 170) {
  if (weightLbs == null) return createUnknownBodyMassState('lb');
  return {
    ...createUnknownBodyMassState('lb'),
    current: normalizeBodyMass({
      value: weightLbs,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: DATE,
      confidence: CONFIDENCE,
    }),
    missingFields: [],
    confidence: CONFIDENCE,
  };
}

function sparringAnchor(): ProtectedAnchorInput {
  return {
    id: 'readiness-sparring',
    label: 'Team sparring',
    kind: 'sparring',
    family: 'sparring',
    dayOfWeek: 3,
    date: DATE,
    startTime: '18:00',
    durationMinutes: 90,
    intensityRpe: 9,
    source: 'protected_anchor',
    canMerge: false,
    reason: 'Coach-led sparring is fixed.',
  };
}

function tracked(input: {
  id: string;
  type: TrackingEntry['type'];
  value: unknown;
  unit?: string | null;
  source?: TrackingEntry['source'];
}): TrackingEntry {
  return createTrackingEntry({
    id: input.id,
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T08:00:00.000Z`,
    timezone: 'America/Vancouver',
    type: input.type,
    value: input.value,
    unit: input.unit ?? 'score_1_5',
    source: input.source ?? 'user_reported',
    confidence: CONFIDENCE,
  });
}

function goodTracking(): TrackingEntry[] {
  return [
    tracked({ id: 'ready-good', type: 'readiness', value: 4 }),
    tracked({ id: 'sleep-good', type: 'sleep_quality', value: 4 }),
    tracked({ id: 'sore-good', type: 'soreness', value: 2 }),
    tracked({ id: 'stress-good', type: 'stress', value: 2 }),
    tracked({ id: 'nutrition-good', type: 'nutrition_adherence', value: 90, unit: 'percent' }),
  ];
}

function poorSleepSorenessTracking(): TrackingEntry[] {
  return [
    tracked({ id: 'ready-low', type: 'readiness', value: 2 }),
    tracked({ id: 'sleep-low', type: 'sleep_quality', value: 2 }),
    tracked({ id: 'sore-high', type: 'soreness', value: 5 }),
    tracked({ id: 'fatigue-high', type: 'fatigue', value: 5 }),
    tracked({ id: 'stress-high', type: 'stress', value: 4 }),
    tracked({ id: 'nutrition-low', type: 'nutrition_adherence', value: 55, unit: 'percent' }),
  ];
}

function subjectiveConcernTracking(): TrackingEntry[] {
  return [
    tracked({ id: 'ready-low-subjective', type: 'readiness', value: 1 }),
    tracked({ id: 'sleep-good-subjective', type: 'sleep_quality', value: 5 }),
    tracked({ id: 'sore-clear-subjective', type: 'soreness', value: 1 }),
    tracked({ id: 'stress-clear-subjective', type: 'stress', value: 1 }),
    tracked({ id: 'nutrition-good-subjective', type: 'nutrition_adherence', value: 90, unit: 'percent' }),
    tracked({ id: 'device-hrv-good', type: 'hrv', value: 95, unit: 'ms', source: 'device' }),
  ];
}

function injuryConcernTracking(): TrackingEntry[] {
  return [
    ...goodTracking(),
    tracked({ id: 'pain-high', type: 'pain', value: 5 }),
  ];
}

function verifiedFood(): FoodEntry {
  return createFoodEntry({
    id: 'readiness-food',
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T09:00:00.000Z`,
    mealType: 'breakfast',
    foodName: 'Oats with yogurt',
    quantity: 1,
    unit: 'serving',
    gramsNormalized: 250,
    source: 'ingredient',
    sourceId: 'fdc:guided-readiness',
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

function run(input: {
  phase?: AthleticorePhase;
  trackingEntries?: TrackingEntry[];
  protectedAnchors?: ProtectedAnchorInput[];
  foodEntries?: FoodEntry[];
} = {}) {
  const profile = athlete();
  const phase = createPhaseState({
    current: input.phase ?? 'build',
    activeSince: WEEK_START,
    transitionReason: input.phase === 'recovery' ? 'recovery_started' : 'build_phase_started',
    confidence: CONFIDENCE,
  });
  const currentBodyMass = bodyMass(170);
  const journey = createAthleteJourneyState({
    journeyId: `${ATHLETE_ID}:journey`,
    athlete: profile,
    timelineStartDate: WEEK_START,
    phase,
    bodyMassState: currentBodyMass,
    confidence: CONFIDENCE,
  });

  return runUnifiedPerformanceEngine({
    athlete: profile,
    journey,
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    protectedAnchors: input.protectedAnchors ?? [],
    trackingEntries: input.trackingEntries ?? goodTracking(),
    bodyMassState: currentBodyMass,
    foodEntries: input.foodEntries ?? [verifiedFood()],
  });
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

console.log('\n-- guided readiness view model --');

{
  const model = buildGuidedReadinessViewModel(run());

  assert('guided readiness is generated from UPE output', model.source === 'unified_performance_engine' && model.available);
  assert('check-in inputs are quick athlete prompts', model.quickInputs.some((input) => input.id === 'recovery_feeling') && model.quickInputs.some((input) => input.id === 'pain_injury'));
  assert('readiness explanation appears', model.whyItChanged.length > 20 && model.trainingAdjustment.length > 20);
}

{
  const model = buildGuidedReadinessViewModel(run({ trackingEntries: [] }));

  assert('missing data lowers confidence', model.status === 'needs_context' && (model.confidence.level === 'low' || model.confidence.level === 'unknown'));
  assert('missing data asks for check-in without punishment', model.primaryMessage.toLowerCase().includes('hard to judge') && !allText(model).includes('failed'));
}

{
  const result = run({
    protectedAnchors: [sparringAnchor()],
    trackingEntries: poorSleepSorenessTracking(),
  });
  const model = buildGuidedReadinessViewModel(result);

  assert('poor sleep and soreness change readiness', result.canonicalOutputs.readiness.readinessBand !== 'green');
  assert('poor sleep and soreness produce coach-like guidance', allText(model).includes('under-recovered') || allText(model).includes('recovery'));
  assert('training adjustment is practical', /trim|controlled|mobility|heavy work should move|intensity should come down/.test(model.trainingAdjustment.toLowerCase()));
}

{
  const result = run({ trackingEntries: subjectiveConcernTracking() });
  const model = buildGuidedReadinessViewModel(result);

  assert('subjective low readiness is respected', result.canonicalOutputs.readiness.trendFlags.includes('subjective_concern') || result.canonicalOutputs.readiness.trendFlags.includes('wearable_conflict_subjective_concern'));
  assert('subjective low readiness is explained', model.whyItChanged.toLowerCase().includes('subjective') || model.whyItChanged.toLowerCase().includes('low readiness check-in'));
}

{
  const model = buildGuidedReadinessViewModel(run({ trackingEntries: injuryConcernTracking() }));
  const text = allText(model);

  assert('injury concern creates warning or adjustment', model.status === 'adjust_first' && model.riskHighlights.some((line) => line.toLowerCase().includes('pain or injury')));
  assert('injury copy avoids push-through language', !text.includes('push through') && !text.includes('no excuses'));
}

{
  const result = run({
    protectedAnchors: [sparringAnchor()],
    trackingEntries: poorSleepSorenessTracking(),
  });
  const mission = buildTodaysMissionViewModel(result);

  assert('readiness affects Today Mission', mission.readinessSummary.toLowerCase().includes('recovered') || mission.readinessSummary.toLowerCase().includes('fatigue') || mission.readinessSummary.toLowerCase().includes('recovery'));
  assert('Today Mission receives UPE readiness context', mission.source === 'unified_performance_engine' && mission.planAdjustments.some((line) => line.toLowerCase().includes('readiness') || line.toLowerCase().includes('fatigue')));
}

{
  const result = run({
    trackingEntries: goodTracking().filter((entry) => entry.type !== 'nutrition_adherence'),
  });
  const mission = buildTodaysMissionViewModel(result, { checkInLogged: true });

  assert('missing nutrition confidence does not punish completed check-in', mission.status !== 'needs_context' && mission.primaryFocus.toLowerCase().includes('check-in') === false);
}

{
  const result = run({
    protectedAnchors: [sparringAnchor()],
    trackingEntries: poorSleepSorenessTracking(),
  });
  const generatedHard = result.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 7);

  assert('readiness affects training recommendation', generatedHard.length === 0);
}

{
  const model = buildGuidedReadinessViewModel(run({ trackingEntries: poorSleepSorenessTracking() }));
  const text = allText(model);

  assert('readiness copy does not lead with black-box score language', !text.includes('/100') && !text.includes('readiness state yellow'));
  assert('readiness copy is not overly medical or hype-driven', !/clinical|diagnosis|beast mode|crush it/.test(text));
}

if (failed > 0) {
  throw new Error(`${failed} guided readiness view model test(s) failed`);
}

console.log(`guidedReadinessViewModel tests: ${passed} passed`);
