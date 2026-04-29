import {
  buildGuidedPhaseTransitionViewModel,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createFightOpportunity,
  createFoodEntry,
  createPhaseState,
  createPhaseTransition,
  createTrackingEntry,
  createUnknownBodyMassState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  type AthleteProfile,
  type AthleticorePhase,
  type FoodEntry,
  type PhaseTransitionReason,
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

const ATHLETE_ID = 'athlete-guided-phase';
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

function sparringAnchor(): ProtectedAnchorInput {
  return {
    id: 'guided-sparring',
    label: 'Team sparring',
    kind: 'sparring',
    family: 'sparring',
    dayOfWeek: 3,
    date: DATE,
    startTime: '18:00',
    durationMinutes: 90,
    intensityRpe: 8,
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
    source: 'user_reported',
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

function verifiedFood(): FoodEntry {
  return createFoodEntry({
    id: 'guided-food',
    athleteId: ATHLETE_ID,
    timestamp: `${DATE}T09:00:00.000Z`,
    mealType: 'breakfast',
    foodName: 'Oats with banana',
    quantity: 1,
    unit: 'serving',
    gramsNormalized: 260,
    source: 'ingredient',
    sourceId: 'fdc:guided-phase',
    nutrients: {
      energyKcal: 560,
      proteinG: 32,
      carbohydrateG: 86,
      fatG: 12,
    },
    isVerified: true,
  });
}

function transitionPhase(input: {
  from: AthleticorePhase;
  to: AthleticorePhase;
  reason: PhaseTransitionReason;
}) {
  return createPhaseState({
    current: input.to,
    previous: input.from,
    activeSince: DATE,
    plannedUntil: input.to === 'competition_week' ? '2026-05-12' : null,
    transitionReason: input.reason,
    transitionHistory: [
      createPhaseTransition({
        from: input.from,
        to: input.to,
        reason: input.reason,
        transitionedAt: GENERATED_AT,
      }),
    ],
    confidence: CONFIDENCE,
  });
}

function bodyMass(weightLbs = 170) {
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

function run(input: {
  phase?: AthleticorePhase;
  transition?: ReturnType<typeof transitionPhase>;
  fight?: ReturnType<typeof createFightOpportunity> | null;
  protectedAnchors?: ProtectedAnchorInput[];
  currentWeightLbs?: number;
  targetWeightLbs?: number | null;
} = {}) {
  const profile = athlete();
  const phase = input.transition ?? createPhaseState({
    current: input.phase ?? 'build',
    activeSince: WEEK_START,
    transitionReason: input.phase === 'camp' ? 'fight_confirmed' : 'build_phase_started',
    confidence: CONFIDENCE,
  });
  const currentBodyMass = bodyMass(input.currentWeightLbs ?? 170);
  const journey = createAthleteJourneyState({
    journeyId: `${ATHLETE_ID}:journey`,
    athlete: profile,
    timelineStartDate: WEEK_START,
    phase,
    bodyMassState: currentBodyMass,
    goals: [{
      id: 'goal-guided-phase',
      mode: phase.current === 'camp' || phase.current === 'short_notice_camp' || phase.current === 'competition_week'
        ? 'fight_camp'
        : 'build_phase',
      type: phase.current === 'recovery' ? 'recovery' : 'conditioning',
      label: phase.current === 'recovery' ? 'Recovery phase' : 'Conditioning build',
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
      measuredOn: '2026-05-12',
      confidence: CONFIDENCE,
    });

  return runUnifiedPerformanceEngine({
    athlete: profile,
    journey,
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    protectedAnchors: input.protectedAnchors ?? [sparringAnchor()],
    trackingEntries: goodTracking(),
    bodyMassState: currentBodyMass,
    fightOpportunity: input.fight ?? null,
    foodEntries: [verifiedFood()],
    weightClass: targetClassMass
      ? {
        competitionId: 'guided-weight-class',
        competitionDate: '2026-05-12',
        weighInDateTime: '2026-05-11T18:00:00.000Z',
        competitionDateTime: '2026-05-12T04:00:00.000Z',
        targetClassMass,
        desiredScaleWeight: targetClassMass,
      }
      : null,
  });
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

console.log('\n-- guided phase transition view model --');

{
  const fight = createFightOpportunity({
    id: 'guided-confirmed-fight',
    athleteId: ATHLETE_ID,
    status: 'confirmed',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-06-20',
    targetWeightClassName: 'Welterweight',
    targetWeightLbs: 168,
  });
  const result = run({ fight });
  const transition = buildGuidedPhaseTransitionViewModel(result);

  assert('guided phase transition is generated from UPE output', transition.available && transition.source === 'unified_performance_engine');
  assert('build to camp preserves journey context', transition.previousPhase === 'build' && transition.currentPhase === 'camp');
  assert('build to camp uses coach-like copy', transition.transitionSummary.includes("keeping what you've built") && transition.transitionSummary.includes('fight-specific work'));
  assert('preserved context is shown', transition.preservedContext.some((item) => item.includes('Protected workouts stay as anchors')));
  assert('changed focus is shown', transition.changedFocus.some((item) => item.includes('Fight-specific work moves up')));
}

{
  const fight = createFightOpportunity({
    id: 'guided-short-fight',
    athleteId: ATHLETE_ID,
    status: 'short_notice',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-05-18',
    targetWeightClassName: 'Lightweight',
    targetWeightLbs: 158,
  });
  const transition = buildGuidedPhaseTransitionViewModel(run({ fight }));

  assert('short-notice camp explanation appears', transition.currentPhase === 'short_notice_camp' && transition.transitionSummary.toLowerCase().includes('fight opportunity came up quickly'));
  assert('short-notice camp protects key sport sessions', transition.trainingChanges.toLowerCase().includes('key sport work stays protected'));
}

{
  const transition = buildGuidedPhaseTransitionViewModel(run({
    transition: transitionPhase({
      from: 'camp',
      to: 'competition_week',
      reason: 'competition_week_started',
    }),
    targetWeightLbs: 168,
  }));

  assert('competition week explanation appears', transition.currentPhase === 'competition_week' && transition.transitionSummary.toLowerCase().includes('showing up sharp'));
  assert('competition week changes focus safely', transition.changedFocus.some((item) => item.toLowerCase().includes('freshness')));
  assert('competition week CTA is clear', transition.ctaLabel === 'Review competition week');
}

{
  const transition = buildGuidedPhaseTransitionViewModel(run({
    transition: transitionPhase({
      from: 'competition_week',
      to: 'recovery',
      reason: 'recovery_started',
    }),
  }));

  assert('recovery explanation appears', transition.currentPhase === 'recovery' && transition.transitionSummary.toLowerCase().includes('recovery is part of the journey'));
  assert('recovery frames recovery as productive', transition.recoveryExpectations.toLowerCase().includes('recovery is the work'));
}

{
  const transition = buildGuidedPhaseTransitionViewModel(run({
    transition: transitionPhase({
      from: 'build',
      to: 'camp',
      reason: 'fight_confirmed',
    }),
    protectedAnchors: [sparringAnchor()],
  }));
  const text = allText(transition);

  assert('protected workouts are handled as anchors', transition.protectedWorkoutHandling.includes('Team sparring') && transition.protectedWorkoutHandling.includes('stays protected'));
  assert('old reset language is not used', !/start over|restart|reset|transition executed/.test(text));
  assert('one clear continue CTA is present', Boolean(transition.ctaLabel) && !Array.isArray((transition as unknown as { ctaLabels?: unknown }).ctaLabels));
}

if (failed > 0) {
  throw new Error(`${failed} guided phase transition view model test(s) failed`);
}

console.log(`guidedPhaseTransitionViewModel tests: ${passed} passed`);
