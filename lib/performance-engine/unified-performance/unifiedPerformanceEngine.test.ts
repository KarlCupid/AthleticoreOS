import {
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createFoodEntry,
  createMeasurementRange,
  createPhaseState,
  createRiskFlag,
  createTrackingEntry,
  createUnknownBodyMassState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  UNIFIED_PERFORMANCE_ENGINE_VERSION,
  type AthleteJourneyState,
  type AthleteProfile,
  type AthleticorePhase,
  type BodyMassState,
  type ProtectedAnchorInput,
  type TrackingEntry,
} from '../index.ts';
import { createFightOpportunity } from '../fight-opportunity/fightOpportunityEngine.ts';
import { generateAdaptiveSmartWeekPlan } from '../../engine/adaptiveTrainingAdapter.ts';
import type { MuscleGroup, RecurringActivityRow, SmartWeekPlanInput, WeeklyPlanConfigRow } from '../../engine/types.ts';

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

const ATHLETE_ID = 'athlete-unified';
const DATE = '2026-05-06';
const WEEK_START = '2026-05-04';
const GENERATED_AT = '2026-05-06T12:00:00.000Z';
const CONFIDENCE = confidenceFromLevel('medium');

function athlete(input: { ageYears?: number | null } = {}): AthleteProfile {
  return createAthleteProfile({
    athleteId: ATHLETE_ID,
    userId: ATHLETE_ID,
    sport: 'boxing',
    competitionLevel: 'amateur',
    ageYears: input.ageYears ?? 25,
    preferredBodyMassUnit: 'lb',
    trainingBackground: 'competitive',
    confidence: CONFIDENCE,
  });
}

function bodyMass(value = 170, date = DATE): BodyMassState {
  return {
    ...createUnknownBodyMassState('lb'),
    current: normalizeBodyMass({
      value,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: date,
      confidence: CONFIDENCE,
    }),
    missingFields: [],
    confidence: CONFIDENCE,
  };
}

function journey(input: {
  phase?: AthleticorePhase;
  athlete?: AthleteProfile;
  bodyMass?: BodyMassState;
} = {}): AthleteJourneyState {
  const currentAthlete = input.athlete ?? athlete();
  const phase = createPhaseState({
    current: input.phase ?? 'build',
    activeSince: WEEK_START,
    transitionReason: input.phase === 'camp' ? 'fight_confirmed' : 'build_phase_started',
    confidence: CONFIDENCE,
  });

  return createAthleteJourneyState({
    journeyId: `${currentAthlete.athleteId}:journey`,
    athlete: currentAthlete,
    timelineStartDate: WEEK_START,
    phase,
    bodyMassState: input.bodyMass ?? bodyMass(),
    goals: [
      {
        id: 'goal-performance',
        mode: input.phase === 'camp' ? 'fight_camp' : 'build_phase',
        type: 'conditioning',
        label: 'conditioning',
        targetMetric: null,
        targetValue: null,
        targetUnit: null,
        deadline: null,
        explanation: null,
      },
    ],
    nutritionPreferences: {
      goal: 'maintain',
      dietaryNotes: [],
      supplementNotes: [],
    },
    trackingPreferences: {
      bodyMass: true,
      readiness: true,
      nutrition: true,
      cycle: false,
    },
    confidence: CONFIDENCE,
  });
}

function anchor(input: {
  id: string;
  kind: ProtectedAnchorInput['kind'];
  date: string;
  label?: string;
  intensity?: number;
  duration?: number;
}): ProtectedAnchorInput {
  return {
    id: input.id,
    label: input.label ?? input.kind.replace(/_/g, ' '),
    kind: input.kind,
    dayOfWeek: new Date(`${input.date}T00:00:00Z`).getUTCDay(),
    date: input.date,
    startTime: '18:00',
    durationMinutes: input.duration ?? 75,
    intensityRpe: input.intensity ?? 7,
    source: input.kind === 'competition' ? 'competition' : 'protected_anchor',
    canMerge: false,
    reason: 'Fixed athlete commitment.',
  };
}

function entry(input: {
  id: string;
  type: TrackingEntry['type'];
  value: unknown;
  unit?: string | null;
  date?: string;
}): TrackingEntry {
  return createTrackingEntry({
    id: input.id,
    athleteId: ATHLETE_ID,
    timestamp: `${input.date ?? DATE}T08:00:00.000Z`,
    timezone: 'America/Vancouver',
    type: input.type,
    source: 'user_reported',
    value: input.value,
    unit: input.unit ?? 'score_1_5',
    confidence: CONFIDENCE,
  });
}

function run(input: {
  phase?: AthleticorePhase;
  anchors?: ProtectedAnchorInput[];
  trackingEntries?: TrackingEntry[];
  fight?: ReturnType<typeof createFightOpportunity>;
  targetWeight?: number | null;
  currentWeight?: number;
  athleteProfile?: AthleteProfile;
  acuteChronicWorkloadRatio?: number | null;
} = {}) {
  const currentAthlete = input.athleteProfile ?? athlete();
  const currentBodyMass = bodyMass(input.currentWeight ?? 170);
  const targetClassMass = input.targetWeight == null
    ? null
    : normalizeBodyMass({
      value: input.targetWeight,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: '2026-05-20',
      confidence: CONFIDENCE,
    });

  return runUnifiedPerformanceEngine({
    athlete: currentAthlete,
    journey: journey({
      phase: input.phase,
      athlete: currentAthlete,
      bodyMass: currentBodyMass,
    }),
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    protectedAnchors: input.anchors,
    trackingEntries: input.trackingEntries,
    fightOpportunity: input.fight ?? null,
    bodyMassState: currentBodyMass,
    acuteChronicWorkloadRatio: input.acuteChronicWorkloadRatio,
    weightClass: targetClassMass
      ? {
        competitionId: 'fight-target',
        competitionDate: '2026-05-21',
        weighInDateTime: '2026-05-20T18:00:00.000Z',
        competitionDateTime: '2026-05-21T04:00:00.000Z',
        targetClassMass,
        desiredScaleWeight: targetClassMass,
      }
      : null,
    foodEntries: [
      createFoodEntry({
        id: 'verified-food',
        athleteId: ATHLETE_ID,
        timestamp: `${DATE}T09:00:00.000Z`,
        mealType: 'breakfast',
        foodName: 'Oats',
        quantity: 1,
        unit: 'serving',
        gramsNormalized: 80,
        source: 'ingredient',
        sourceId: 'fdc:123',
        nutrients: {
          energyKcal: 300,
          proteinG: 10,
          carbohydrateG: 54,
          fatG: 6,
        },
      }),
    ],
  });
}

const EMPTY_VOLUME: Record<MuscleGroup, number> = {
  chest: 0,
  back: 0,
  shoulders: 0,
  quads: 0,
  hamstrings: 0,
  glutes: 0,
  arms: 0,
  core: 0,
  full_body: 0,
  neck: 0,
  calves: 0,
};

function makeConfig(): WeeklyPlanConfigRow {
  return {
    id: 'config-unified',
    user_id: ATHLETE_ID,
    available_days: [1, 2, 3, 4, 5],
    availability_windows: [],
    session_duration_min: 60,
    allow_two_a_days: false,
    two_a_day_days: [],
    am_session_type: 'sc',
    pm_session_type: 'boxing_practice',
    preferred_gym_profile_id: null,
    auto_deload_interval_weeks: 4,
    created_at: GENERATED_AT,
    updated_at: GENERATED_AT,
  };
}

function recurringSparring(): RecurringActivityRow {
  return {
    id: 'sparring-recurring',
    user_id: ATHLETE_ID,
    activity_type: 'sparring',
    custom_label: 'Team sparring',
    start_time: '18:00',
    estimated_duration_min: 75,
    expected_intensity: 8,
    session_components: [],
    recurrence: { frequency: 'weekly', interval: 1, days_of_week: [2] },
    is_active: true,
    athlete_locked: true,
    constraint_tier: 'mandatory',
  };
}

function weeklyInput(): SmartWeekPlanInput {
  return {
    config: makeConfig(),
    readinessState: 'Prime',
    phase: 'off-season',
    acwr: 1,
    fitnessLevel: 'intermediate',
    performanceGoalType: 'conditioning',
    exerciseLibrary: [],
    recentExerciseIds: [],
    recentMuscleVolume: { ...EMPTY_VOLUME },
    campConfig: null,
    activeWeightClassPlan: null,
    weeksSinceLastDeload: 1,
    gymProfile: null,
    weekStartDate: WEEK_START,
    recurringActivities: [recurringSparring()],
  };
}

console.log('\n-- unified performance engine --');

(() => {
  const result = run({ phase: 'build' });

  assert('build phase produces shared-state performance output', result.engineVersion === UNIFIED_PERFORMANCE_ENGINE_VERSION);
  assert('build phase produces training output', result.training.composedSessions.length > 0);
  assert('build phase produces nutrition output', result.nutrition.target.phase === 'build');
  assert('build phase produces readiness output', result.readiness.readiness.date === DATE);
})();

(() => {
  const sparring = anchor({ id: 'sparring-anchor', kind: 'sparring', date: DATE, label: 'Team sparring', intensity: 8 });
  const result = run({ phase: 'camp', anchors: [sparring] });
  const sparringSession = result.training.composedSessions.find((session) => session.anchorId === 'sparring-anchor');

  assert('camp phase protects sparring', sparringSession?.protectedAnchor === true && sparringSession.date === DATE);
  assert('camp sparring adjusts fueling', result.nutrition.sessionFuelingDirectives.some((directive) => directive.sessionId === 'sparring-anchor' && directive.priority === 'high'));
})();

(() => {
  const fight = createFightOpportunity({
    id: 'short-notice-fight',
    athleteId: ATHLETE_ID,
    status: 'short_notice',
    asOfDate: DATE,
    createdAt: GENERATED_AT,
    currentPhase: 'build',
    competitionDate: '2026-05-20',
    targetWeightLbs: 165,
  });
  const result = run({ phase: 'build', fight });

  assert('short-notice fight transitions journey without reset', result.performanceState.phase.current === 'short_notice_camp');
  assert('short-notice transition preserves journey identity', result.performanceState.journey.journeyId === `${ATHLETE_ID}:journey`);
})();

(() => {
  const competition = anchor({ id: 'competition-anchor', kind: 'competition', date: DATE, label: 'Competition', intensity: 10 });
  const result = run({ phase: 'competition_week', anchors: [competition] });
  const generatedHard = result.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 6);

  assert('competition week blocks unnecessary hard generated training', generatedHard.length === 0);
})();

(() => {
  const result = run({ phase: 'recovery' });
  const generatedHard = result.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 6);

  assert('recovery phase reduces generated load', generatedHard.length === 0);
  assert('recovery phase supports recovery nutrition purpose', result.nutrition.target.purpose === 'recovery');
})();

(() => {
  const underFueled = run({
    phase: 'build',
    trackingEntries: [
      entry({ id: 'ready', type: 'readiness', value: 4 }),
      entry({ id: 'sleep', type: 'sleep_quality', value: 4 }),
      entry({ id: 'soreness', type: 'soreness', value: 2 }),
      entry({ id: 'stress', type: 'stress', value: 2 }),
      entry({ id: 'nutrition-low', type: 'nutrition_adherence', value: 35, unit: 'percent' }),
    ],
    anchors: [anchor({ id: 'hard-sparring', kind: 'sparring', date: DATE, intensity: 8 })],
  });
  const generatedHard = underFueled.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 7);

  assert('under-fueling affects training', generatedHard.length === 0);
  assert('under-fueling risk is shared through final state', underFueled.riskFlags.some((flag) => flag.code === 'under_fueling_risk'));
})();

(() => {
  const poor = run({
    phase: 'build',
    trackingEntries: [
      entry({ id: 'ready-low', type: 'readiness', value: 1 }),
      entry({ id: 'sleep-poor', type: 'sleep_quality', value: 2 }),
      entry({ id: 'soreness-high', type: 'soreness', value: 5 }),
      entry({ id: 'stress-high', type: 'stress', value: 5 }),
      entry({ id: 'nutrition', type: 'nutrition_adherence', value: 80, unit: 'percent' }),
    ],
  });
  const generatedHard = poor.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 7);

  assert('poor readiness affects training', generatedHard.length === 0);
  assert('poor readiness is explainable', Boolean(poor.readiness.readiness.explanation?.summary.includes('Readiness')));
})();

(() => {
  const highWorkloadCampScenario: {
    phase: AthleticorePhase;
    anchors: ProtectedAnchorInput[];
    trackingEntries: TrackingEntry[];
  } = {
    phase: 'camp',
    anchors: [
      anchor({
        id: 'intense-camp-session',
        kind: 'hard_intervals',
        date: DATE,
        label: 'Hard camp intervals',
        intensity: 9,
        duration: 70,
      }),
    ],
    trackingEntries: [
      entry({ id: 'readiness-moderate', type: 'readiness', value: 3 }),
      entry({ id: 'sleep-moderate', type: 'sleep_quality', value: 3 }),
      entry({ id: 'soreness-moderate', type: 'soreness', value: 3 }),
      entry({ id: 'stress-moderate', type: 'stress', value: 3 }),
      entry({ id: 'nutrition-ok', type: 'nutrition_adherence', value: 72, unit: 'percent' }),
    ],
  };
  const result = run({
    ...highWorkloadCampScenario,
    acuteChronicWorkloadRatio: 1.62,
  });
  const acwrDropped = run({
    ...highWorkloadCampScenario,
    acuteChronicWorkloadRatio: null,
  });
  const generatedHard = result.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 7);
  const trainingAdjustment = result.canonicalOutputs.readiness.recommendedTrainingAdjustment;

  assert('load spike prevents green readiness', result.canonicalOutputs.readiness.readinessBand !== 'green');
  assert('load spike creates workload risk', result.riskFlags.some((flag) => flag.code === 'excessive_training_load' && flag.evidence.some((item) => item.metric === 'acwr' && item.value === 1.62)));
  assert('load spike prevents ready final plan', result.finalPlanStatus !== 'ready');
  assert('load spike softens training adjustment', trainingAdjustment.replaceWithMobility || (trainingAdjustment.intensityCap ?? 10) <= 5 || (trainingAdjustment.volumeMultiplier ?? 1) < 1);
  assert('load spike avoids adding extra hard generated training', generatedHard.length === 0);
  assert('dropping ACWR removes workload risk in the same scenario', !acwrDropped.riskFlags.some((flag) => flag.code === 'excessive_training_load'));
  assert('ACWR materially changes canonical readiness output', result.canonicalOutputs.readiness.readinessBand !== acwrDropped.canonicalOutputs.readiness.readinessBand);
  assert('ACWR materially changes canonical final plan status', result.finalPlanStatus !== acwrDropped.finalPlanStatus);
})();

(() => {
  const sparring = anchor({ id: 'fuel-sparring', kind: 'sparring', date: DATE, intensity: 8 });
  const result = run({ phase: 'camp', anchors: [sparring] });

  assert('protected workouts influence schedule', result.training.topology.days.some((day) => day.hardDayAnchor));
  assert('protected workouts influence nutrition', result.nutrition.target.explanation?.reasons.some((reason) => reason.includes('Sparring')) === true);
})();

(() => {
  const unsafe = run({
    phase: 'weight_class_management',
    currentWeight: 180,
    targetWeight: 160,
  });

  assert('unsafe weight-class target blocks plan', unsafe.finalPlanStatus === 'blocked');
  assert('unsafe weight target risk is blocking', unsafe.blockingRiskFlags.some((flag) => flag.code === 'unsafe_weight_class_target'));
})();

(() => {
  const result = run({ phase: 'build' });

  assert('final output includes explanations', result.explanations.length > 0);
  assert('persistence plan is canonical only', result.persistencePlan.canonicalOnly);
  assert('no duplicate systems generate conflicting plans', result.persistencePlan.supersedes.some((item) => item.includes('retired standalone scheduler')));
})();

(() => {
  const result = generateAdaptiveSmartWeekPlan(weeklyInput());

  assert('app weekly planning call site uses canonical unified engine', result.message.includes('Unified Performance Engine'));
  assert('protected sparring remains fixed through call site', result.entries.some((entry) => entry.session_type === 'sparring' && entry.placement_source === 'locked'));
})();

(() => {
  const explicitRisk = createRiskFlag({
    id: 'manual-under-fueling',
    code: 'under_fueling_risk',
    severity: 'high',
    appliesOn: DATE,
  });
  const result = runUnifiedPerformanceEngine({
    athlete: athlete(),
    journey: journey({ phase: 'build' }),
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    bodyMassState: bodyMass(),
    initialRiskFlags: [explicitRisk],
  });
  const generatedHard = result.training.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 7);

  assert('nutrition risk can constrain generated training through shared state', generatedHard.length === 0);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
