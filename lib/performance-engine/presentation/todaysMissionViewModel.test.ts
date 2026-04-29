import {
  buildTodaysMissionViewModel,
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

const ATHLETE_ID = 'athlete-today-mission';
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
    ageYears: 24,
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
    id: 'today-sparring',
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

function goodTracking(): TrackingEntry[] {
  return [
    tracked({ id: 'ready-good', type: 'readiness', value: 4 }),
    tracked({ id: 'sleep-good', type: 'sleep_quality', value: 4 }),
    tracked({ id: 'sore-good', type: 'soreness', value: 2 }),
    tracked({ id: 'stress-good', type: 'stress', value: 2 }),
    tracked({ id: 'nutrition-good', type: 'nutrition_adherence', value: 90, unit: 'percent' }),
  ];
}

function poorTracking(): TrackingEntry[] {
  return [
    tracked({ id: 'ready-low', type: 'readiness', value: 1 }),
    tracked({ id: 'sleep-low', type: 'sleep_quality', value: 2 }),
    tracked({ id: 'sore-high', type: 'soreness', value: 5 }),
    tracked({ id: 'fatigue-high', type: 'fatigue', value: 5 }),
    tracked({ id: 'stress-high', type: 'stress', value: 5 }),
    tracked({ id: 'nutrition-low', type: 'nutrition_adherence', value: 50, unit: 'percent' }),
  ];
}

function verifiedFood(): FoodEntry {
  return createFoodEntry({
    id: 'verified-breakfast',
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T09:00:00.000Z`,
    mealType: 'breakfast',
    foodName: 'Oats with yogurt',
    quantity: 1,
    unit: 'serving',
    gramsNormalized: 250,
    source: 'ingredient',
    sourceId: 'fdc:today-mission',
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
  phase?: Parameters<typeof createPhaseState>[0]['current'];
  protectedAnchors?: ProtectedAnchorInput[];
  trackingEntries?: TrackingEntry[];
  foodEntries?: FoodEntry[];
  currentWeightLbs?: number | null;
  targetWeightLbs?: number | null;
  fight?: ReturnType<typeof createFightOpportunity> | null;
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
    goals: [{
      id: 'goal-today',
      mode: input.phase === 'camp' ? 'fight_camp' : 'build_phase',
      type: input.phase === 'recovery' ? 'recovery' : 'conditioning',
      label: input.phase === 'recovery' ? 'Recovery phase' : 'Conditioning build',
      targetMetric: null,
      targetValue: null,
      targetUnit: null,
      deadline: null,
      explanation: null,
    }],
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
    trackingEntries: input.trackingEntries ?? goodTracking(),
    bodyMassState: currentBodyMass,
    fightOpportunity: input.fight ?? null,
    foodEntries: input.foodEntries ?? [verifiedFood()],
    weightClass: targetClassMass
      ? {
        competitionId: 'weight-class-today',
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

console.log('\n-- todays mission view model --');

{
  const result = run();
  const mission = buildTodaysMissionViewModel(result);
  assert('generated from canonical PerformanceState date', mission.date === result.canonicalOutputs.performanceState.asOfDate);
  assert('generated from canonical athlete id', mission.athleteId === result.canonicalOutputs.performanceState.athlete.athleteId);
  assert('marks UPE as source', mission.source === 'unified_performance_engine');
  assert('does not require a legacy daily mission snapshot', result.persistencePlan.canonicalOnly && mission.missionTitle === "Today's Mission");
}

{
  const mission = buildTodaysMissionViewModel(run());
  assert('build phase mission exposes phase', mission.currentPhase === 'build' && mission.phaseLabel === 'Build');
  assert('build phase explains why today matters', mission.whyTodayMatters.toLowerCase().includes('build phase'));
}

{
  const fight = createFightOpportunity({
    id: 'confirmed-fight',
    athleteId: ATHLETE_ID,
    status: 'confirmed',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-06-20',
    weighInDate: '2026-06-19',
    targetWeightClassName: 'Welterweight',
    targetWeightLbs: 168,
  });
  const mission = buildTodaysMissionViewModel(run({ fight }));
  assert('camp phase mission includes fight context', mission.fightOrCompetitionContext?.toLowerCase().includes('confirmed fight') === true);
  assert('camp phase does not use restart language', !allText(mission).includes('restart'));
}

{
  const mission = buildTodaysMissionViewModel(run({ phase: 'recovery' }));
  assert('recovery day frames recovery as productive', mission.primaryFocus.toLowerCase().includes('recovery') && mission.whyTodayMatters.toLowerCase().includes('productive'));
  assert('recovery next action is clear', mission.nextActions.some((item) => item.label === 'Take recovery day seriously'));
}

{
  const mission = buildTodaysMissionViewModel(run({ protectedAnchors: [sparringAnchor()] }));
  assert('protected sparring is shown as anchor', mission.protectedWorkoutSummary?.toLowerCase().includes('protected') === true && mission.primaryFocus.toLowerCase().includes('sparring'));
  assert('protected sparring influences training summary', mission.trainingSummary.toLowerCase().includes('sparring is the anchor'));
}

{
  const mission = buildTodaysMissionViewModel(run({
    protectedAnchors: [sparringAnchor()],
    trackingEntries: poorTracking(),
  }));
  assert('poor readiness changes mission status', mission.status === 'train_smart' || mission.status === 'pull_back' || mission.status === 'blocked' || mission.status === 'needs_context');
  assert('poor readiness copy is coach-like', mission.readinessSummary.toLowerCase().includes('recovered') || mission.readinessSummary.toLowerCase().includes('fatigue') || mission.readinessSummary.toLowerCase().includes('controlled') || mission.readinessSummary.toLowerCase().includes('recovery'));
  assert('poor readiness avoids raw band jargon', !mission.readinessSummary.toLowerCase().includes('state yellow'));
}

{
  const mission = buildTodaysMissionViewModel(run({ protectedAnchors: [sparringAnchor()] }));
  assert('fueling focus appears for high-output day', mission.fuelingFocus.toLowerCase().includes('more fuel') && mission.fuelingFocus.toLowerCase().includes('carbs'));
  assert('fueling action appears for high-output day', mission.nextActions.some((item) => item.label === 'Review fueling target'));
}

{
  const mission = buildTodaysMissionViewModel(run({
    trackingEntries: [],
    foodEntries: [],
    currentWeightLbs: null,
  }));
  assert('low confidence is represented safely', mission.status === 'needs_context' && mission.confidence.missingData.length > 0);
  assert('missing readiness is unknown, not safe', mission.readinessSummary.toLowerCase().includes('unknown') && mission.readinessSummary.toLowerCase().includes('not treat missing data as safe'));
  assert('missing context asks for check-in', mission.nextActions[0]?.label === 'Log your check-in');
}

{
  const mission = buildTodaysMissionViewModel(run({
    fight: createFightOpportunity({
      id: 'unsafe-fight',
      athleteId: ATHLETE_ID,
      status: 'short_notice',
      asOfDate: DATE,
      createdAt: GENERATED_AT,
      currentPhase: 'build',
      competitionDate: '2026-05-18',
      weighInDate: '2026-05-17',
      targetWeightClassName: 'Lightweight',
      targetWeightLbs: 150,
    }),
    currentWeightLbs: 180,
    targetWeightLbs: 150,
  }));
  const text = allText(mission);
  assert('unsafe body-mass risk is surfaced', mission.status === 'blocked' && mission.bodyMassContext?.toLowerCase().includes('too aggressive') === true);
  assert('unsafe body-mass copy avoids weight-cut language', !text.includes('weight-cut') && !text.includes(' cut ') && !text.includes('sauna') && !text.includes('sweat suit'));
  assert('unsafe body-mass action points to safer options', mission.nextActions.some((item) => item.label === 'Review safer options'));
}

{
  const mission = buildTodaysMissionViewModel(run({ protectedAnchors: [sparringAnchor()] }));
  const labels = mission.nextActions.map((item) => item.label);
  const clearLabels = [
    "Start today's training",
    'Log your check-in',
    'Review fueling target',
    'Confirm fight details',
    'Log body mass',
    'Review safer options',
    'Take recovery day seriously',
    'Review plan',
  ];
  assert('next actions are limited to three', mission.nextActions.length >= 1 && mission.nextActions.length <= 3);
  assert('next actions use clear labels', labels.every((label) => clearLabels.includes(label)));
  assert('first next action is primary', mission.nextActions[0]?.priority === 'primary');
}

if (failed > 0) {
  throw new Error(`${failed} todays mission view model test(s) failed`);
}

console.log(`todaysMissionViewModel tests: ${passed} passed`);
