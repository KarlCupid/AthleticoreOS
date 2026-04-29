import {
  buildGuidedFuelingViewModel,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createFoodEntry,
  createPhaseState,
  createRiskFlag,
  createTrackingEntry,
  createUnknownBodyMassState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  type AthleteProfile,
  type AthleticorePhase,
  type FoodEntry,
  type ProtectedAnchorInput,
  type RiskFlag,
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

const ATHLETE_ID = 'athlete-guided-fuel';
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
    id: 'fuel-sparring',
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
}): TrackingEntry {
  return createTrackingEntry({
    id: input.id,
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T08:00:00.000Z`,
    timezone: 'America/Vancouver',
    type: input.type,
    value: input.value,
    unit: input.unit ?? 'score_1_5',
    confidence: CONFIDENCE,
  });
}

function tracking(): TrackingEntry[] {
  return [
    tracked({ id: 'ready-good', type: 'readiness', value: 4 }),
    tracked({ id: 'sleep-good', type: 'sleep_quality', value: 4 }),
    tracked({ id: 'sore-good', type: 'soreness', value: 2 }),
    tracked({ id: 'stress-good', type: 'stress', value: 2 }),
    tracked({ id: 'nutrition-good', type: 'nutrition_adherence', value: 90, unit: 'percent' }),
  ];
}

function verifiedFood(): FoodEntry {
  return createFoodEntry({
    id: 'verified-fuel',
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T09:00:00.000Z`,
    mealType: 'breakfast',
    foodName: 'Oats with yogurt',
    quantity: 1,
    unit: 'serving',
    gramsNormalized: 250,
    source: 'ingredient',
    sourceId: 'fdc:guided-fuel',
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

function manualFood(): FoodEntry {
  return createFoodEntry({
    id: 'manual-fuel',
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T12:00:00.000Z`,
    mealType: 'lunch',
    foodName: 'Estimated bowl',
    quantity: 1,
    unit: 'serving',
    source: 'custom',
    nutrients: {
      energyKcal: 400,
      proteinG: 20,
      carbohydrateG: null,
      fatG: null,
    },
    isVerified: false,
    isUserEstimated: true,
  });
}

function run(input: {
  phase?: AthleticorePhase;
  protectedAnchors?: ProtectedAnchorInput[];
  foodEntries?: FoodEntry[];
  risks?: RiskFlag[];
  currentWeightLbs?: number | null;
  targetWeightLbs?: number | null;
} = {}) {
  const profile = athlete();
  const phase = createPhaseState({
    current: input.phase ?? 'build',
    activeSince: WEEK_START,
    transitionReason: input.phase === 'recovery' ? 'recovery_started' : 'build_phase_started',
    confidence: CONFIDENCE,
  });
  const currentBodyMass = bodyMass(input.currentWeightLbs === undefined ? 170 : input.currentWeightLbs);
  const journey = createAthleteJourneyState({
    journeyId: `${ATHLETE_ID}:journey`,
    athlete: profile,
    timelineStartDate: WEEK_START,
    phase,
    bodyMassState: currentBodyMass,
    confidence: CONFIDENCE,
  });
  const targetClassMass = input.targetWeightLbs == null
    ? null
    : normalizeBodyMass({
      value: input.targetWeightLbs,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: '2026-05-20',
      confidence: CONFIDENCE,
    });

  return runUnifiedPerformanceEngine({
    athlete: profile,
    journey,
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    protectedAnchors: input.protectedAnchors ?? [],
    trackingEntries: tracking(),
    bodyMassState: currentBodyMass,
    foodEntries: input.foodEntries ?? [verifiedFood()],
    initialRiskFlags: input.risks ?? [],
    weightClass: targetClassMass
      ? {
        competitionId: 'fuel-weight-class',
        competitionDate: '2026-05-21',
        weighInDateTime: '2026-05-20T18:00:00.000Z',
        competitionDateTime: '2026-05-21T04:00:00.000Z',
        targetClassMass,
        desiredScaleWeight: targetClassMass,
      }
      : null,
  });
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

console.log('\n-- guided fueling view model --');

{
  const model = buildGuidedFuelingViewModel(run({ protectedAnchors: [sparringAnchor()] }), {
    actuals: { calories: 540, protein: 34, carbs: 76, fat: 14 },
    loggedMealCount: 1,
  });

  assert('fueling focus renders for high-output day', model.primaryFocus.toLowerCase().includes('today needs more fuel'));
  assert('session fueling directive appears', model.sessionGuidance.some((line) => line.toLowerCase().includes('before team sparring')) && model.sessionGuidance.some((line) => line.toLowerCase().includes('after team sparring')));
  assert('macro ranges appear without dominating the model', model.macroTargets.length === 4 && model.macroTargets.every((macro) => macro.rangeLabel !== 'Range unknown'));
}

{
  const buildModel = buildGuidedFuelingViewModel(run({ phase: 'build' }));
  const campModel = buildGuidedFuelingViewModel(run({ phase: 'camp', protectedAnchors: [sparringAnchor()] }));

  assert('build phase nutrition context appears', buildModel.phaseContext.toLowerCase().includes('build phase'));
  assert('camp phase nutrition context appears', campModel.phaseContext.toLowerCase().includes('camp phase') && campModel.whyItMatters.toLowerCase().includes('camp'));
}

{
  const model = buildGuidedFuelingViewModel(run({ phase: 'recovery' }));

  assert('recovery day nutrition guidance appears', model.primaryFocus.toLowerCase().includes('recovery days still need enough food') || model.recoveryNutritionFocus.toLowerCase().includes('recovery'));
  assert('recovery copy does not frame restriction as the goal', !allText(model).includes('restricting calories'));
}

{
  const model = buildGuidedFuelingViewModel(run({ foodEntries: [manualFood()] }), {
    loggedMealCount: 1,
    foodLogEstimatedCount: 1,
  });

  assert('low food log confidence is surfaced', model.foodLogConfidence.label.toLowerCase().includes('low') || model.foodLogConfidence.summary.toLowerCase().includes('estimated'));
  assert('missing nutrients are not shown as zero', model.foodLogConfidence.summary.toLowerCase().includes('cautious') && !model.foodLogConfidence.summary.includes('0'));
}

{
  const model = buildGuidedFuelingViewModel(run({ foodEntries: [] }), {
    loggedMealCount: 0,
    actuals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  });

  assert('missing food data is represented as not logged yet', model.macroTargets.every((macro) => macro.currentLabel === 'Not logged yet'));
  assert('missing nutrients are treated as unknown', model.foodLogConfidence.missingData.length > 0 && model.foodLogConfidence.summary.toLowerCase().includes('cautious'));
}

{
  const risk = createRiskFlag({
    id: 'fuel-risk',
    code: 'under_fueling_risk',
    severity: 'moderate',
    appliesOn: DATE,
    confidence: confidenceFromLevel('medium'),
  });
  const model = buildGuidedFuelingViewModel(run({ risks: [risk] }));
  const text = allText(model);

  assert('under-fueling risk is surfaced', model.riskHighlights.some((line) => line.toLowerCase().includes('fuel has been light')));
  assert('under-fueling copy avoids shame or fear language', !/shame|fear|failure|failed|noncompliant|bad athlete/.test(text));
}

{
  const model = buildGuidedFuelingViewModel(run({
    phase: 'camp',
    currentWeightLbs: 180,
    targetWeightLbs: 145,
    protectedAnchors: [sparringAnchor()],
  }));
  const text = allText(model);

  assert('body-mass or weight-class context appears when relevant', model.bodyMassContext?.toLowerCase().includes('body-mass') === true || model.bodyMassContext?.toLowerCase().includes('target looks too aggressive') === true);
  assert('aggressive body-mass language is avoided', !/weight-cut| cut |sauna|sweat suit/.test(text));
}

if (failed > 0) {
  throw new Error(`${failed} guided fueling view model test(s) failed`);
}

console.log(`guidedFuelingViewModel tests: ${passed} passed`);
