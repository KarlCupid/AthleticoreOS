import {
  addDays,
  confidenceFromKnownPoints,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createComposedSession,
  createMeasurementRange,
  createPerformanceState,
  createPhaseState,
  createPhaseTransition,
  createRiskFlag,
  createUnknownBodyMassState,
  createUnknownNutritionDataQuality,
  createUnknownReadinessState,
  daysBetween,
  fromNullable,
  isKnown,
  isProtectedWorkout,
  normalizeBodyMass,
  normalizeConfidence,
  normalizeDurationMinutes,
  normalizeISODate,
  normalizeTimeZone,
  toFiniteNumberOrNull,
  toNonNegativeNumberOrNull,
  valueOrNull,
} from './index.ts';

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

function assertClose(label: string, actual: number | null, expected: number, tolerance = 0.001) {
  assert(label, actual !== null && Math.abs(actual - expected) <= tolerance);
}

console.log('\n-- performance-engine foundation --');

(() => {
  const athlete = createAthleteProfile({
    athleteId: 'athlete-1',
    userId: 'user-1',
    sport: 'boxing',
    timeZone: 'America/Vancouver',
    onboardingCompletedAt: '2026-04-27T15:00:00.000Z',
  });
  const journey = createAthleteJourneyState({ journeyId: 'journey-1', athlete });
  const state = createPerformanceState({
    athlete,
    journey,
    asOfDate: '2026-04-28',
  });

  assert('athlete sport is retained', state.athlete.sport === 'boxing');
  assert('performance state uses schema v1', state.schemaVersion === 'performance-state-v1');
  assert('journey is continuous and shared by performance state', state.journey.journeyId === 'journey-1');
  assert('journey timeline starts from onboarding context', state.journey.timelineStartDate === '2026-04-27');
  assert('default readiness is unknown, not zero', state.readiness.readinessBand === 'unknown');
  assert('default readiness score is null', state.readiness.overallReadiness === null);
})();

(() => {
  const missing = fromNullable<number>(null);
  const known = fromNullable(72);

  assert('null becomes unknown', !isKnown(missing));
  assert('unknown returns null, not zero', valueOrNull(missing) === null);
  assert('known value stays known', isKnown(known) && known.value === 72);
  assert('invalid numeric string is null', toFiniteNumberOrNull('not-a-number') === null);
  assert('negative non-negative value is null', toNonNegativeNumberOrNull(-1) === null);
})();

(() => {
  const pounds = normalizeBodyMass({ value: 100, fromUnit: 'kg', toUnit: 'lb' });
  const badMass = normalizeBodyMass({ value: 0, fromUnit: 'kg', toUnit: 'lb' });

  assertClose('kg normalizes to lb', pounds?.value ?? null, 220.46226218);
  assert('invalid body mass returns null', badMass === null);
  assert('invalid timezone falls back to UTC', normalizeTimeZone('Bad/Zone') === 'UTC');
  assert('valid timezone is retained', normalizeTimeZone('America/Vancouver') === 'America/Vancouver');
})();

(() => {
  assert('ISO date normalizes date object', normalizeISODate(new Date(Date.UTC(2026, 3, 28))) === '2026-04-28');
  assert('invalid ISO date is null', normalizeISODate('2026-02-30') === null);
  assert('date add works in UTC', addDays('2026-04-28', 2) === '2026-04-30');
  assert('day delta works in UTC', daysBetween('2026-04-28', '2026-05-01') === 3);
  assert('hours normalize to minutes', normalizeDurationMinutes(1.5, 'hours') === 90);
})();

(() => {
  const unknownConfidence = normalizeConfidence(null);
  const clampedConfidence = normalizeConfidence(2);
  const lowFromData = confidenceFromKnownPoints(1, 10);

  assert('missing confidence is unknown', unknownConfidence.level === 'unknown');
  assert('confidence is clamped to high', clampedConfidence.score === 1 && clampedConfidence.level === 'high');
  assert('sparse data produces low confidence', lowFromData.level === 'low');
  assert('level helper creates medium confidence', confidenceFromLevel('medium').level === 'medium');
})();

(() => {
  const duration = createMeasurementRange({
    target: 75,
    unit: 'minute',
    confidence: confidenceFromLevel('medium'),
  });
  const rpe = createMeasurementRange({
    min: 6,
    target: 7,
    max: 8,
    unit: 'rpe',
    confidence: confidenceFromLevel('medium'),
  });
  const session = createComposedSession({
    id: 'session-1',
    family: 'sparring',
    title: 'Coach sparring',
    source: 'protected_anchor',
    durationMinutes: duration,
    intensityRpe: rpe,
  });

  assert('protected source marks session protected', session.protectedAnchor);
  assert('protected workout predicate recognizes anchor', isProtectedWorkout(session));
})();

(() => {
  const transition = createPhaseTransition({
    from: 'build',
    to: 'camp',
    reason: 'fight_confirmed',
  });
  const phase = createPhaseState({
    current: 'camp',
    previous: 'build',
    transitionReason: 'fight_confirmed',
    transitionHistory: [transition],
  });

  assert('phase current is camp', phase.current === 'camp');
  assert('phase retains previous state', phase.previous === 'build');
  assert('phase transition is not a restart', phase.isRestart === false);
  assert('phase history records transition', phase.transitionHistory.length === 1);
})();

(() => {
  const risk = createRiskFlag({
    id: 'risk-1',
    domain: 'weight_class',
    code: 'unsafe_weight_class_target',
    severity: 'critical',
    message: 'Current body mass is unknown.',
  });
  const readiness = createUnknownReadinessState('2026-04-28');
  const bodyMass = createUnknownBodyMassState('lb');
  const dataQuality = createUnknownNutritionDataQuality([{ field: 'food_amount', reason: 'not_collected' }]);

  assert('critical risk defaults to hard stop', risk.hardStop);
  assert('critical risk blocks plan', risk.blocksPlan);
  assert('unknown readiness has missing field', readiness.missingData[0]?.field === 'readiness_check_in');
  assert('unknown body mass does not synthesize zero', bodyMass.current === null);
  assert('partial nutrition data quality records missing field', dataQuality.availability === 'partial');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
