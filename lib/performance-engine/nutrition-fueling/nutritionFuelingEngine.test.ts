import {
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createComposedSession,
  createFoodEntry,
  createMeasurementRange,
  createPerformanceState,
  createPhaseState,
  createRiskFlag,
  createUnknownBodyMassState,
  generateNutritionTarget,
  normalizeBodyMass,
  type AthleticorePhase,
  type ComposedSession,
  type FoodEntry,
  type MeasurementRange,
} from '../index.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function value(range: { target: number | null }): number {
  return range.target ?? 0;
}

const DATE = '2026-04-28';
const confidence = confidenceFromLevel('medium');

function range<TUnit extends 'minute' | 'rpe'>(target: number, unit: TUnit): MeasurementRange<TUnit> {
  return createMeasurementRange({
    target,
    unit,
    confidence,
  });
}

function session(input: {
  id: string;
  family: ComposedSession['family'];
  title: string;
  duration: number;
  intensity: number;
  protectedAnchor?: boolean;
}): ComposedSession {
  return createComposedSession({
    id: input.id,
    date: DATE,
    family: input.family,
    title: input.title,
    source: input.protectedAnchor ? 'protected_anchor' : 'engine_generated',
    protectedAnchor: input.protectedAnchor,
    durationMinutes: range(input.duration, 'minute'),
    intensityRpe: range(input.intensity, 'rpe'),
    confidence,
  });
}

function state(input: {
  phase?: AthleticorePhase;
  sessions?: ComposedSession[];
  goal?: 'maintain' | 'cut' | 'bulk' | 'unknown';
  foodEntries?: FoodEntry[];
  riskFlags?: ReturnType<typeof createRiskFlag>[];
} = {}) {
  const athlete = createAthleteProfile({
    athleteId: 'athlete-nutrition-test',
    userId: 'user-nutrition-test',
    sport: 'boxing',
    biologicalSex: 'male',
    ageYears: 25,
    preferredBodyMassUnit: 'lb',
    confidence,
  });
  const phase = createPhaseState({
    current: input.phase ?? 'build',
    activeSince: DATE,
    confidence,
  });
  const bodyMass = {
    ...createUnknownBodyMassState('lb'),
    current: normalizeBodyMass({
      value: 170,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: DATE,
      confidence,
    }),
    missingFields: [],
    confidence,
  };
  const journey = createAthleteJourneyState({
    journeyId: 'journey-nutrition-test',
    athlete,
    phase,
    bodyMassState: bodyMass,
    nutritionPreferences: {
      goal: input.goal ?? 'maintain',
      dietaryNotes: [],
      supplementNotes: [],
    },
    trackingPreferences: {
      bodyMass: true,
      readiness: true,
      nutrition: true,
      cycle: false,
    },
    riskFlags: input.riskFlags ?? [],
    confidence,
  });

  return {
    performanceState: createPerformanceState({
      athlete,
      journey,
      phase,
      asOfDate: DATE,
      bodyMass,
      composedSessions: input.sessions ?? [],
      riskFlags: input.riskFlags ?? [],
      confidence,
    }),
    foodEntries: input.foodEntries,
  };
}

console.log('\n-- nutrition-fueling engine --');

(() => {
  const rest = state();
  const hard = state({
    sessions: [
      session({ id: 'sparring-1', family: 'sparring', title: 'Team sparring', duration: 75, intensity: 9, protectedAnchor: true }),
    ],
  });
  const restTarget = generateNutritionTarget({ performanceState: rest.performanceState, date: DATE }).target;
  const hardTarget = generateNutritionTarget({ performanceState: hard.performanceState, date: DATE }).target;

  assert('training load raises energy target', value(hardTarget.energyTarget) > value(restTarget.energyTarget));
  assert('training load raises carbohydrate target', value(hardTarget.carbohydrateTarget) > value(restTarget.carbohydrateTarget));
  assert('protected sparring creates a session fueling directive', hardTarget.sessionFuelingDirectives[0]?.sessionId === 'sparring-1');
})();

(() => {
  const build = state({
    phase: 'build',
    sessions: [session({ id: 'skill', family: 'boxing_skill', title: 'Boxing practice', duration: 60, intensity: 7 })],
  });
  const camp = state({
    phase: 'camp',
    sessions: [session({ id: 'skill', family: 'boxing_skill', title: 'Boxing practice', duration: 60, intensity: 7 })],
  });
  const buildTarget = generateNutritionTarget({ performanceState: build.performanceState, date: DATE }).target;
  const campTarget = generateNutritionTarget({ performanceState: camp.performanceState, date: DATE }).target;

  assert('nutrition targets respond to phase', value(campTarget.energyTarget) > value(buildTarget.energyTarget));
  assert('camp phase increases fueling/recovery emphasis', campTarget.explanation?.reasons.some((reason) => reason.includes('Camp phase')) === true);
  assert('build phase supports sustainable progression', buildTarget.explanation?.reasons.some((reason) => reason.includes('Build phase')) === true);
})();

(() => {
  const sparringState = state({
    phase: 'camp',
    sessions: [session({ id: 'sparring-2', family: 'sparring', title: 'Hard sparring', duration: 70, intensity: 9, protectedAnchor: true })],
  });
  const target = generateNutritionTarget({ performanceState: sparringState.performanceState, date: DATE }).target;
  const directive = target.sessionFuelingDirectives[0];

  assert('sparring day increases fueling priority', directive?.priority === 'high');
  assert('sparring day carbohydrate demand is high', value(directive?.carbohydrateDemand ?? { target: 0 }) >= 80);
  assert('sparring explanation is generated', directive?.explanation?.reasons.some((reason) => reason.includes('Sparring increases fueling')) === true);
})();

(() => {
  const competition = state({
    phase: 'competition_week',
    sessions: [session({ id: 'fight', family: 'assessment', title: 'Competition', duration: 45, intensity: 10, protectedAnchor: true })],
  });
  const target = generateNutritionTarget({ performanceState: competition.performanceState, date: DATE }).target;

  assert('competition week avoids novel foods', target.sessionFuelingDirectives[0]?.preSessionGuidance.some((line) => line.includes('Avoid novel foods')) === true);
  assert('competition week uses fight week nutrition purpose', target.purpose === 'fight_week_support');
})();

(() => {
  const manualEntry = createFoodEntry({
    id: 'manual-food',
    athleteId: 'athlete-nutrition-test',
    timestamp: `${DATE}T12:00:00.000Z`,
    mealType: 'lunch',
    foodName: 'Estimated bowl',
    quantity: 1,
    unit: 'bowl',
    source: 'custom',
    nutrients: {
      energyKcal: 500,
    },
    isUserEstimated: true,
  });
  const verifiedEntry = createFoodEntry({
    id: 'verified-food',
    athleteId: 'athlete-nutrition-test',
    timestamp: `${DATE}T13:00:00.000Z`,
    mealType: 'lunch',
    foodName: 'USDA rice',
    quantity: 100,
    unit: 'g',
    gramsNormalized: 100,
    source: 'ingredient',
    sourceId: 'fdc-20051',
    nutrients: {
      energyKcal: 130,
      proteinG: 2.7,
      carbohydrateG: 28,
      fatG: 0.3,
      fiberG: null,
    },
  });

  assert('missing nutrients are unknown, not zero', manualEntry.nutrients.proteinG === null);
  assert('missing nutrient field is recorded', manualEntry.missingNutrients.includes('proteinG'));
  assert('manual food entry has lower confidence', (manualEntry.confidence.score ?? 0) < (verifiedEntry.confidence.score ?? 0));
  assert('verified food source ID is preserved', verifiedEntry.sourceId === 'fdc-20051');
})();

(() => {
  const manualEntry = createFoodEntry({
    id: 'manual-low-confidence',
    athleteId: 'athlete-nutrition-test',
    timestamp: `${DATE}T08:00:00.000Z`,
    mealType: 'breakfast',
    foodName: 'Estimated smoothie',
    source: 'custom',
    quantity: 1,
    unit: 'serving',
    nutrients: {
      energyKcal: 350,
    },
    isUserEstimated: true,
  });
  const lowConfidenceState = state({ foodEntries: [manualEntry] });
  const result = generateNutritionTarget({
    performanceState: lowConfidenceState.performanceState,
    date: DATE,
    foodEntries: lowConfidenceState.foodEntries,
  });

  assert('low nutrition confidence creates a risk flag', result.riskFlags.some((risk) => risk.code === 'low_nutrition_confidence'));
  assert('low nutrition confidence creates explanation', result.explanations.some((explanation) => explanation.kind === 'confidence'));
})();

(() => {
  const underFuelingRisk = createRiskFlag({
    id: 'risk-underfueling',
    code: 'under_fueling_risk',
    severity: 'high',
    appliesOn: DATE,
  });
  const riskState = state({ riskFlags: [underFuelingRisk] });
  const target = generateNutritionTarget({ performanceState: riskState.performanceState, date: DATE }).target;

  assert('under-fueling risk carries through nutrition target', target.riskFlags.some((risk) => risk.code === 'under_fueling_risk'));
  assert('under-fueling risk remains blocking when severe enough', target.riskFlags.some((risk) => risk.code === 'under_fueling_risk' && risk.blocksPlan));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
