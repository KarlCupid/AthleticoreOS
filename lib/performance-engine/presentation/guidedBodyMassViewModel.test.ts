import {
  buildGuidedBodyMassViewModel,
  changeFightOpportunityWeightClass,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createFightOpportunity,
  createFoodEntry,
  createPhaseState,
  createTrackingEntry,
  createUnknownBodyMassState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  type AthleteProfile,
  type AthleticorePhase,
  type BodyMassState,
  type FoodEntry,
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

const ATHLETE_ID = 'athlete-guided-body-mass';
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

function bodyMass(weightLbs: number | null = 170): BodyMassState {
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
    id: 'body-mass-food',
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T09:00:00.000Z`,
    mealType: 'breakfast',
    foodName: 'Oats with yogurt',
    quantity: 1,
    unit: 'serving',
    gramsNormalized: 250,
    source: 'ingredient',
    sourceId: 'fdc:guided-body-mass',
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
  currentWeightLbs?: number | null;
  targetWeightLbs?: number | null;
  weighInDate?: string | null;
  competitionDate?: string | null;
  fightOpportunity?: ReturnType<typeof createFightOpportunity> | null;
} = {}) {
  const profile = athlete();
  const phase = createPhaseState({
    current: input.phase ?? 'build',
    activeSince: WEEK_START,
    transitionReason: input.phase === 'camp' ? 'fight_confirmed' : 'build_phase_started',
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
      measuredOn: input.weighInDate ?? '2026-06-05',
      confidence: CONFIDENCE,
    });

  return runUnifiedPerformanceEngine({
    athlete: profile,
    journey,
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    phase,
    fightOpportunity: input.fightOpportunity ?? null,
    trackingEntries: tracking(),
    bodyMassState: currentBodyMass,
    foodEntries: [verifiedFood()],
    weightClass: input.fightOpportunity
      ? null
      : targetClassMass
        ? {
          competitionId: 'body-mass-weight-class',
          competitionDate: input.competitionDate ?? '2026-06-06',
          weighInDateTime: `${input.weighInDate ?? '2026-06-05'}T18:00:00.000Z`,
          competitionDateTime: `${input.competitionDate ?? '2026-06-06'}T04:00:00.000Z`,
          targetClassMass,
          desiredScaleWeight: targetClassMass,
        }
        : null,
  });
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

console.log('\n-- guided body-mass view model --');

{
  const model = buildGuidedBodyMassViewModel(run({ targetWeightLbs: 168 }));

  assert('body-mass screen model uses canonical language', model.primaryQuestion.includes('safely while maintaining performance'));
  assert('feasible status renders', model.status === 'feasible' && model.statusLabel === 'Feasible');
  assert('feasible copy is performance-aware', model.primaryMessage.toLowerCase().includes('manageable') && model.primaryMessage.toLowerCase().includes('fueling'));
}

{
  const model = buildGuidedBodyMassViewModel(run({ targetWeightLbs: 164 }));

  assert('aggressive status renders', model.status === 'aggressive' && model.statusLabel === 'Aggressive');
  assert('aggressive copy avoids risky framing', model.primaryMessage.toLowerCase().includes('avoid risky shortcuts'));
}

{
  const model = buildGuidedBodyMassViewModel(run({
    phase: 'camp',
    currentWeightLbs: 180,
    targetWeightLbs: 150,
    weighInDate: '2026-05-18',
    competitionDate: '2026-05-19',
  }));
  const text = allText(model);

  assert('unsafe status blocks plan', model.status === 'unsafe' && model.planBlocked);
  assert('safer alternatives appear', model.saferAlternatives.length > 0 && model.nextActions.includes('Review safer options'));
  assert('professional review recommendation appears when needed', model.professionalReviewRecommendation?.toLowerCase().includes('qualified review') === true);
  assert('unsafe warning uses body-mass and weight-class language', text.includes("won't build a risky plan") && !text.includes('weight cut'));
}

{
  const model = buildGuidedBodyMassViewModel(run({
    currentWeightLbs: null,
    targetWeightLbs: 168,
  }));

  assert('insufficient data status renders', model.status === 'insufficient_data' && model.statusLabel === 'Insufficient data');
  assert('missing data is represented safely', model.confidenceSummary.toLowerCase().includes('low') && model.missingData.length > 0);
}

{
  const fight = createFightOpportunity({
    id: 'changed-fight-weight-class',
    athleteId: ATHLETE_ID,
    status: 'confirmed',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-06-01',
    weighInDate: '2026-05-31',
    targetWeightClassName: 'Featherweight',
    targetWeightLbs: 147,
  });
  const changed = changeFightOpportunityWeightClass(fight, {
    asOfDate: DATE,
    updatedAt: '2026-05-07T12:00:00.000Z',
    currentPhase: 'build',
    targetWeightClassName: 'Lightweight',
    targetWeightLbs: 135,
  });
  const model = buildGuidedBodyMassViewModel(run({
    currentWeightLbs: 152,
    fightOpportunity: changed,
  }));

  assert('fight weight-class change flows into body-mass UX', model.targetClassLabel?.includes('Lightweight') === true && model.fightContext?.includes('Lightweight') === true);
  assert('changed class triggers feasibility and risk context', model.status === 'unsafe' && model.riskHighlights.length > 0);
}

{
  const model = buildGuidedBodyMassViewModel(run({
    phase: 'camp',
    currentWeightLbs: 180,
    targetWeightLbs: 150,
    weighInDate: '2026-05-18',
    competitionDate: '2026-05-19',
  }));
  const text = allText(model);

  assert('dangerous methods do not appear', !/weight[- ]cut|sauna|sweat suit|diuretic|laxative|vomit|severe fasting|extreme fluid restriction/.test(text));
  assert('model is sourced from UPE canonical output', model.source === 'unified_performance_engine' && model.available);
}

if (failed > 0) {
  throw new Error(`${failed} guided body-mass view model test(s) failed`);
}

console.log(`guidedBodyMassViewModel tests: ${passed} passed`);
