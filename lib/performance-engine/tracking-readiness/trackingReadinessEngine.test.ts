import {
  bodyMassHistoryFromTrackingEntries,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createComposedSession,
  createMeasurementRange,
  createPerformanceState,
  createPhaseState,
  createTrackingEntry,
  createUnknownBodyMassState,
  deriveRecentBodyMassTrend,
  generateAdaptiveTrainingWeek,
  generateNutritionTarget,
  normalizeBodyMass,
  resolveReadinessState,
  type ComposedSession,
  type ReadinessState,
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

function assertGreater(label: string, actual: number | null | undefined, threshold: number): void {
  assert(label, typeof actual === 'number' && actual > threshold);
}

const ATHLETE_ID = 'athlete-tracking';
const DATE = '2026-05-06';
const CONFIDENCE = confidenceFromLevel('medium');

function entry(input: {
  id: string;
  type: TrackingEntry['type'];
  value: unknown;
  unit?: string | null;
  date?: string;
  source?: TrackingEntry['source'];
  context?: Record<string, unknown>;
}): TrackingEntry {
  return createTrackingEntry({
    id: input.id,
    athleteId: ATHLETE_ID,
    timestamp: `${input.date ?? DATE}T08:00:00.000Z`,
    timezone: 'America/Vancouver',
    type: input.type,
    source: input.source ?? 'user_reported',
    value: input.value,
    unit: input.unit ?? 'score_1_5',
    confidence: CONFIDENCE,
    context: input.context,
  });
}

function session(input: {
  id: string;
  family: ComposedSession['family'];
  date?: string;
  intensity?: number;
  duration?: number;
  protectedAnchor?: boolean;
}): ComposedSession {
  const duration = input.duration ?? 60;
  const intensity = input.intensity ?? 7;
  return createComposedSession({
    id: input.id,
    family: input.family,
    title: input.family,
    date: input.date ?? DATE,
    source: input.protectedAnchor ? 'protected_anchor' : 'engine_generated',
    protectedAnchor: input.protectedAnchor ?? false,
    anchorId: input.protectedAnchor ? input.id : null,
    durationMinutes: createMeasurementRange({ target: duration, unit: 'minute', confidence: CONFIDENCE }),
    intensityRpe: createMeasurementRange({ target: intensity, unit: 'rpe', confidence: CONFIDENCE }),
    stressScore: Math.round((duration * intensity) / 10),
    tissueLoads: input.family === 'sparring' ? ['combat', 'neural'] : [],
    confidence: CONFIDENCE,
  });
}

function readiness(entries: TrackingEntry[], sessions: ComposedSession[] = []): ReadinessState {
  return resolveReadinessState({
    athleteId: ATHLETE_ID,
    date: DATE,
    entries,
    completedSessions: sessions,
  }).readiness;
}

function performanceState(input: { readiness: ReadinessState; sessions?: ComposedSession[] } = { readiness: readiness([]) }) {
  const athlete = createAthleteProfile({
    athleteId: ATHLETE_ID,
    userId: ATHLETE_ID,
    sport: 'boxing',
    preferredBodyMassUnit: 'lb',
  });
  const phase = createPhaseState({ current: 'build', activeSince: DATE });
  const bodyMass = {
    ...createUnknownBodyMassState('lb'),
    current: normalizeBodyMass({
      value: 170,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: DATE,
      confidence: CONFIDENCE,
    }),
    missingFields: [],
    confidence: CONFIDENCE,
  };
  const journey = createAthleteJourneyState({
    journeyId: `${ATHLETE_ID}:journey`,
    athlete,
    phase,
    bodyMassState: bodyMass,
  });

  return createPerformanceState({
    athlete,
    journey,
    phase,
    asOfDate: DATE,
    bodyMass,
    composedSessions: input.sessions ?? [],
    readiness: input.readiness,
    riskFlags: input.readiness.riskFlags,
  });
}

console.log('\n-- tracking and readiness engine --');

(() => {
  const result = readiness([]);

  assert('missing data remains unknown', result.readinessBand === 'unknown');
  assert('missing data does not synthesize a zero score', result.overallReadiness === null);
  assert('missing data is recorded', result.missingData.length > 0);
})();

(() => {
  const result = readiness([
    entry({ id: 'subjective-only', type: 'readiness', value: 4 }),
  ]);

  assert('no sleep/soreness data lowers readiness confidence', result.confidence.level === 'low');
  assert('missing sleep is flagged', result.trendFlags.includes('missing_sleep_data'));
  assert('missing soreness is flagged', result.trendFlags.includes('missing_soreness_data'));
})();

(() => {
  const poor = readiness([
    entry({ id: 'readiness-low', type: 'readiness', value: 2 }),
    entry({ id: 'sleep-poor', type: 'sleep_quality', value: 2 }),
    entry({ id: 'soreness-high', type: 'soreness', value: 5 }),
    entry({ id: 'stress-high', type: 'stress', value: 4 }),
    entry({ id: 'nutrition-low', type: 'nutrition_adherence', value: 45, unit: 'percent' }),
  ]);
  const generated = generateAdaptiveTrainingWeek({
    performanceState: performanceState({ readiness: poor }),
    weekStartDate: '2026-05-04',
  });
  const generatedHard = generated.composedSessions.filter((item) => !item.protectedAnchor && (item.intensityRpe.target ?? 0) >= 7);

  assert('poor readiness affects schedule', generatedHard.length === 0);
  assert('poor readiness creates training adjustment', poor.recommendedTrainingAdjustment.replaceWithMobility || poor.recommendedTrainingAdjustment.moveHeavySession);
})();

(() => {
  const result = readiness([
    entry({ id: 'readiness-low', type: 'readiness', value: 1 }),
    entry({ id: 'sleep-good', type: 'sleep_quality', value: 5 }),
    entry({ id: 'soreness-good', type: 'soreness', value: 1 }),
    entry({ id: 'stress-good', type: 'stress', value: 1 }),
    entry({ id: 'hrv-good', type: 'hrv', value: 95, unit: 'ms', source: 'device' }),
    entry({ id: 'rhr-good', type: 'resting_hr', value: 50, unit: 'bpm', source: 'device' }),
  ]);

  assert('subjective low readiness is respected', result.readinessBand === 'orange' || result.readinessBand === 'red');
  assert('wearable data does not override subjective concern automatically', result.trendFlags.includes('wearable_conflict_subjective_concern'));
})();

(() => {
  const result = readiness([
    entry({ id: 'ready', type: 'readiness', value: 4 }),
    entry({ id: 'sleep', type: 'sleep_quality', value: 4 }),
    entry({ id: 'soreness', type: 'soreness', value: 2 }),
    entry({ id: 'stress', type: 'stress', value: 2 }),
    entry({ id: 'injury', type: 'injury', value: true, unit: null }),
  ], [
    session({ id: 'heavy-lower', family: 'strength', intensity: 8 }),
  ]);

  assert('injury flag blocks conflicting training', result.riskFlags.some((flag) => flag.code === 'injury_conflict' && flag.blocksPlan));
  assert('injury drives professional training caution', result.recommendedTrainingAdjustment.professionalReviewRecommended);
})();

(() => {
  const result = readiness([
    entry({ id: 'ready', type: 'readiness', value: 4 }),
    entry({ id: 'sleep', type: 'sleep_quality', value: 4 }),
    entry({ id: 'soreness', type: 'soreness', value: 2 }),
    entry({ id: 'stress', type: 'stress', value: 2 }),
    entry({ id: 'nutrition-low', type: 'nutrition_adherence', value: 35, unit: 'percent' }),
  ], [
    session({ id: 'sparring', family: 'sparring', intensity: 8, protectedAnchor: true }),
  ]);

  assert('nutrition adherence affects readiness', result.trendFlags.includes('low_nutrition_support'));
  assert('nutrition adherence creates under-fueling risk with hard training', result.riskFlags.some((flag) => flag.code === 'under_fueling_risk'));
  assert('nutrition adjustment increases fueling', result.recommendedNutritionAdjustment.type === 'increase_fueling');
})();

(() => {
  const result = readiness([
    entry({ id: 'ready', type: 'readiness', value: 4 }),
    entry({ id: 'sleep', type: 'sleep_quality', value: 4 }),
    entry({ id: 'soreness-high', type: 'soreness', value: 5 }),
    entry({ id: 'stress', type: 'stress', value: 2 }),
  ], [
    session({ id: 'protected-sparring', family: 'sparring', intensity: 8, protectedAnchor: true }),
  ]);

  assert('high soreness after sparring affects readiness', result.trendFlags.includes('post_sparring_soreness'));
  assert('high soreness after sparring is explained', Boolean(result.explanation?.reasons.some((reason) => reason.includes('sparring'))));
})();

(() => {
  const entries = [
    entry({ id: 'mass-1', type: 'body_mass', value: 174, unit: 'lb', date: '2026-04-27' }),
    entry({ id: 'mass-2', type: 'body_mass', value: 172, unit: 'lb', date: '2026-05-01' }),
    entry({ id: 'mass-3', type: 'body_mass', value: 170, unit: 'lb', date: DATE }),
  ];
  const history = bodyMassHistoryFromTrackingEntries(entries);
  const trend = deriveRecentBodyMassTrend({ history, unit: 'lb' });

  assert('body mass trend tracking connects to body-mass engine', trend.direction === 'losing');
  assertGreater('body mass trend uses actual logged history', Math.abs(trend.weeklyChange.target ?? 0), 1);
})();

(() => {
  const lowNutrition = readiness([
    entry({ id: 'ready', type: 'readiness', value: 4 }),
    entry({ id: 'sleep', type: 'sleep_quality', value: 4 }),
    entry({ id: 'soreness', type: 'soreness', value: 2 }),
    entry({ id: 'stress', type: 'stress', value: 2 }),
    entry({ id: 'nutrition-low', type: 'nutrition_adherence', value: 35, unit: 'percent' }),
  ], [
    session({ id: 'hard-conditioning', family: 'conditioning', intensity: 8 }),
  ]);
  const supported = generateNutritionTarget({
    performanceState: performanceState({
      readiness: lowNutrition,
      sessions: [session({ id: 'hard-conditioning', family: 'conditioning', intensity: 8 })],
    }),
    date: DATE,
  });

  assert('tracking influences nutrition risk', supported.riskFlags.some((flag) => flag.code === 'under_fueling_risk'));
  assert('tracking influences nutrition targets', supported.target.explanation?.reasons.some((reason) => reason.includes('training session')) === true);
})();

(() => {
  const result = resolveReadinessState({
    athleteId: ATHLETE_ID,
    date: DATE,
    entries: [
      entry({ id: 'bad-mass', type: 'body_mass', value: 0, unit: 'lb' }),
      entry({ id: 'sleep-hours', type: 'sleep_duration', value: 7.5, unit: 'hours' }),
    ],
  });

  assert('unit normalization converts sleep hours to minutes', result.readiness.sleepScore !== null);
  assert('invalid tracking value becomes anomaly instead of zero', result.anomalies.some((item) => item.type === 'body_mass'));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
