import {
  buildPersonalizedWorkoutInputFromPerformanceState,
  resolvePainFlagsFromRecentReports,
  resolveProtectedWorkoutsFromSchedule,
  resolveReadinessBandFromAppState,
  resolveTrainingGoalFromCurrentPhase,
  resolveUserEquipmentFromProfile,
} from './index.ts';
import { generateWeeklyWorkoutProgram } from './programBuilder.ts';
import { generatePreviewWorkoutFromPerformanceState } from './workoutProgrammingService.ts';
import {
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createMeasurementRange,
  createNoNutritionAdjustment,
  createNoTrainingAdjustment,
  createPerformanceState,
  createPhaseState,
  createUnknownReadinessState,
  type AthleticorePhase,
  type PerformanceState,
  type ReadinessState,
  type TrainingBlockGoal,
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

const DATE = '2026-05-04';
const CONFIDENCE = confidenceFromLevel('medium');

function readiness(band: ReadinessState['readinessBand'], score: number | null): ReadinessState {
  const base = createUnknownReadinessState(DATE);
  if (band === 'unknown') return base;
  return {
    ...base,
    overallReadiness: score,
    readinessBand: band,
    subjectiveScore: score,
    sleepScore: score,
    sorenessScore: score,
    stressScore: score,
    nutritionSupportScore: score,
    recoveryScore: score,
    trendFlags: [],
    missingData: [],
    recommendedTrainingAdjustment: createNoTrainingAdjustment([`Readiness is ${band}.`]),
    recommendedNutritionAdjustment: createNoNutritionAdjustment([`Readiness is ${band}.`]),
  };
}

function buildState(input: {
  phase?: AthleticorePhase;
  blockGoal?: TrainingBlockGoal;
  readinessState?: ReadinessState;
} = {}): PerformanceState {
  const athlete = createAthleteProfile({
    athleteId: 'athlete-1',
    userId: 'user-1',
    sport: 'boxing',
    competitionLevel: 'amateur',
    trainingBackground: 'competitive',
  });
  const phase = createPhaseState({
    current: input.phase ?? 'build',
    activeSince: DATE,
    transitionReason: input.phase === 'recovery' ? 'recovery_started' : 'build_phase_started',
  });
  const protectedAnchor = {
    id: 'boxing-practice',
    label: 'Boxing Practice',
    sessionFamily: 'boxing_skill' as const,
    dayOfWeek: 2,
    startTime: '18:00',
    expectedDurationMinutes: createMeasurementRange({ target: 75, unit: 'minute', confidence: CONFIDENCE }),
    expectedIntensityRpe: createMeasurementRange({ target: 7, unit: 'rpe', confidence: CONFIDENCE }),
    nonNegotiable: true as const,
    reason: 'Coach-led boxing practice is a protected anchor.',
    date: null,
    source: 'protected_anchor' as const,
    canMerge: false,
  };
  const activeTrainingBlock = {
    id: 'block-1',
    phase: phase.current,
    goal: input.blockGoal ?? 'strength',
    status: 'active' as const,
    startDate: DATE,
    endDate: null,
    protectedAnchors: [protectedAnchor],
    sessions: [],
    explanation: null,
    confidence: CONFIDENCE,
  };
  const journey = createAthleteJourneyState({
    journeyId: 'user-1:journey',
    athlete,
    timelineStartDate: DATE,
    phase,
    activeTrainingBlock,
    protectedWorkoutAnchors: [protectedAnchor],
    trainingAvailability: {
      availableDays: [1, 2, 3, 4, 5],
      windows: [],
      preferredSessionDurationMinutes: createMeasurementRange({ min: 30, target: 45, max: 60, unit: 'minute', confidence: CONFIDENCE }),
      allowTwoADays: false,
      confidence: CONFIDENCE,
    },
    goals: [
      {
        id: 'goal-1',
        mode: 'build_phase',
        type: input.blockGoal ?? 'strength',
        label: input.blockGoal ?? 'strength',
        targetMetric: null,
        targetValue: null,
        targetUnit: null,
        deadline: null,
        explanation: null,
      },
    ],
  });

  return createPerformanceState({
    athlete,
    journey,
    asOfDate: DATE,
    phase,
    activeTrainingBlock,
    trainingAvailability: journey.trainingAvailability,
    readiness: input.readinessState ?? readiness('green', 82),
    trackingEntries: [
      {
        id: 'sleep-1',
        athleteId: 'athlete-1',
        timestamp: `${DATE}T07:00:00.000Z`,
        timezone: 'UTC',
        type: 'sleep_quality',
        source: 'user_reported',
        value: 82,
        unit: 'percent',
        confidence: CONFIDENCE,
        context: {},
        notes: null,
      },
    ],
    confidence: CONFIDENCE,
  });
}

async function run() {
  console.log('\n-- workout programming app-state adapter --');

  {
    const state = buildState({ blockGoal: 'strength' });
    const mapped = buildPersonalizedWorkoutInputFromPerformanceState({
      performanceState: state,
      equipmentProfile: { equipment: ['dumbbells', 'bench', 'resistance_bands'] },
      recentPainReports: [{ location: 'right knee', severity: 5, notes: 'Pain increased after stairs.' }],
      request: { preferredToneVariant: 'coach_like' },
    });
    assert('full app state maps user profile and equipment', mapped.input.userId === 'user-1' && mapped.input.equipmentIds.includes('dumbbells') && mapped.input.equipmentIds.includes('resistance_band'));
    assert('full app state maps readiness and duration', mapped.input.readinessBand === 'green' && mapped.input.durationMinutes === 45);
    assert('full app state maps pain and protected anchors', mapped.input.safetyFlags?.includes('knee_caution') === true && (mapped.input.protectedWorkouts?.length ?? 0) === 1);
    assert('full app state emits app-signal decision traces', mapped.decisionTrace.some((entry) => entry.step === 'compose_personalized_input'));
  }

  {
    const state = buildState({ readinessState: createUnknownReadinessState(DATE) });
    const resolved = resolveReadinessBandFromAppState({ performanceState: state });
    const mapped = buildPersonalizedWorkoutInputFromPerformanceState({ performanceState: state });
    assert('missing readiness falls back to unknown', resolved.value === 'unknown' && mapped.input.readinessBand === 'unknown');
    assert('unknown readiness adds conservative safety flag', mapped.input.safetyFlags?.includes('unknown_readiness') === true);
  }

  {
    const state = buildState({ readinessState: readiness('red', 24) });
    const workout = await generatePreviewWorkoutFromPerformanceState({
      performanceState: state,
      equipmentProfile: { equipment: ['dumbbells', 'bench'] },
      request: { goalId: 'beginner_strength', durationMinutes: 40 },
    });
    const targetRpes = workout.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.prescription.targetRpe));
    assert('low readiness routes hard request to recovery', workout.workoutTypeId === 'recovery' && workout.safetyFlags.includes('poor_readiness'));
    assert('low readiness reduces intensity targets', targetRpes.every((rpe) => rpe <= 4));
    assert('low readiness trace is preserved on generated workout', workout.decisionTrace?.some((entry) => entry.step === 'resolve_readiness' && entry.selectedId === 'red') === true);
  }

  {
    const pain = resolvePainFlagsFromRecentReports({
      recentPainReports: [
        { location: 'low back', severity: 6 },
        { joint: 'left shoulder', severity: 'moderate' },
      ],
    });
    assert('pain reports become pain flags', pain.value.includes('back_caution') && pain.value.includes('shoulder_caution') && pain.value.includes('pain_increased_last_session'));
  }

  {
    const equipment = resolveUserEquipmentFromProfile({ equipmentProfile: { equipment: ['dumbbells', 'bench', 'lat_pulldown_machine'] } });
    assert('equipment profile normalizes legacy equipment ids', equipment.value.includes('dumbbells') && equipment.value.includes('lat_pulldown') && equipment.value.includes('bodyweight'));
    const state = buildState();
    const workout = await generatePreviewWorkoutFromPerformanceState({
      performanceState: state,
      equipmentProfile: { equipment: [] },
      request: { goalId: 'beginner_strength', durationMinutes: 30 },
    });
    const selectedEquipment = workout.blocks.flatMap((block) => block.exercises.flatMap((exercise) => exercise.equipmentIds));
    assert('equipment profile limits generated exercise selection', !selectedEquipment.includes('dumbbells') && !selectedEquipment.includes('barbell') && workout.safetyFlags.includes('equipment_limited'));
  }

  {
    const recoveryState = buildState({ phase: 'recovery', blockGoal: 'strength' });
    const goal = resolveTrainingGoalFromCurrentPhase({ performanceState: recoveryState });
    assert('current training phase influences generated goal', goal.value === 'recovery');
  }

  {
    const state = buildState();
    const protectedWorkouts = resolveProtectedWorkoutsFromSchedule({ performanceState: state });
    const mapped = buildPersonalizedWorkoutInputFromPerformanceState({
      performanceState: state,
      equipmentProfile: { equipment: ['dumbbells', 'bench'] },
    });
    const program = generateWeeklyWorkoutProgram({
      ...mapped.input,
      sessionsPerWeek: 2,
      desiredProgramLengthWeeks: 1,
      availableDays: [1, 2, 3, 4],
    });
    assert('protected workouts resolve from PerformanceState schedule anchors', protectedWorkouts.value.some((workout) => workout.id === 'boxing-practice' && workout.dayIndex === 2));
    assert('protected workouts flow into program builder', program.sessions.some((session) => session.protectedAnchor && session.label === 'Boxing Practice'));
  }
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
