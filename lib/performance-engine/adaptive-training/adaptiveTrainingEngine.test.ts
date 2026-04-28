import {
  createAthleteJourneyState,
  createAthleteProfile,
  createMeasurementRange,
  createPerformanceState,
  createPhaseState,
  createUnknownReadinessState,
  generateAdaptiveTrainingWeek,
  scoreTrainingMerge,
  type AdaptiveSessionCandidate,
  type AdaptiveSessionKind,
  type AthleticorePhase,
  type PerformanceState,
  type ProtectedAnchorInput,
  type ProtectedWorkoutAnchor,
  type SessionFamily,
} from '../index.ts';
import { generateAdaptiveSmartWeekPlan } from '../../engine/adaptiveTrainingAdapter.ts';
import { generateSmartWeekPlan } from '../../engine/calculateSchedule.ts';
import type {
  MuscleGroup,
  RecurringActivityRow,
  SmartWeekPlanInput,
  WeeklyPlanConfigRow,
} from '../../engine/types.ts';

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

const WEEK_START = '2026-05-04';

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

function toJourneyAnchor(anchor: ProtectedAnchorInput): ProtectedWorkoutAnchor {
  return {
    id: anchor.id,
    label: anchor.label,
    sessionFamily: anchor.family ?? 'other',
    dayOfWeek: anchor.dayOfWeek,
    startTime: anchor.startTime ?? null,
    expectedDurationMinutes: createMeasurementRange({ target: anchor.durationMinutes, unit: 'minute' }),
    expectedIntensityRpe: createMeasurementRange({ target: anchor.intensityRpe, unit: 'rpe' }),
    nonNegotiable: true,
    reason: anchor.reason ?? 'Protected workout anchor.',
    date: anchor.date ?? null,
    source: anchor.source ?? 'protected_anchor',
    canMerge: anchor.canMerge ?? false,
  };
}

function buildState(input: {
  phase?: AthleticorePhase;
  availableDays?: number[];
  anchors?: ProtectedAnchorInput[];
} = {}): PerformanceState {
  const athlete = createAthleteProfile({
    athleteId: 'athlete-1',
    userId: 'athlete-1',
    sport: 'boxing',
    trainingBackground: 'competitive',
  });
  const phase = createPhaseState({
    current: input.phase ?? 'build',
    activeSince: WEEK_START,
    transitionReason: 'build_phase_started',
  });
  const availability = {
    availableDays: input.availableDays ?? [1, 2, 3, 4, 5],
    windows: [],
    preferredSessionDurationMinutes: createMeasurementRange({ target: 60, unit: 'minute' }),
    allowTwoADays: false,
    confidence: athlete.confidence,
  };
  const journey = createAthleteJourneyState({
    journeyId: 'athlete-1:journey',
    athlete,
    timelineStartDate: WEEK_START,
    phase,
    trainingAvailability: availability,
    protectedWorkoutAnchors: (input.anchors ?? []).map(toJourneyAnchor),
    goals: [
      {
        id: 'goal-1',
        mode: 'build_phase',
        type: 'conditioning',
        label: 'conditioning',
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
    asOfDate: WEEK_START,
    phase,
    trainingAvailability: availability,
    readiness: createUnknownReadinessState(WEEK_START),
  });
}

function anchor(input: {
  id: string;
  label: string;
  kind: AdaptiveSessionKind;
  family?: SessionFamily;
  dayOfWeek: number;
  date: string;
  duration?: number;
  intensity?: number;
  source?: ProtectedAnchorInput['source'];
}): ProtectedAnchorInput {
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    family: input.family,
    dayOfWeek: input.dayOfWeek,
    date: input.date,
    startTime: '18:00',
    durationMinutes: input.duration ?? 75,
    intensityRpe: input.intensity ?? 7,
    source: input.source ?? 'protected_anchor',
    canMerge: false,
    reason: 'Fixed athlete commitment.',
  };
}

function candidate(input: {
  id: string;
  title: string;
  kind: AdaptiveSessionKind;
  family?: SessionFamily;
  preferredDayOfWeek?: number;
  duration?: number;
  intensity?: number;
}): AdaptiveSessionCandidate {
  return {
    id: input.id,
    title: input.title,
    kind: input.kind,
    family: input.family ?? (input.kind === 'zone2' ? 'roadwork' : input.kind === 'mobility' || input.kind === 'core' ? 'recovery' : 'strength'),
    priority: input.kind === 'core' ? 'core' : input.kind === 'mobility' ? 'mobility' : input.kind === 'zone2' ? 'aerobic_base' : 'strength',
    durationMinutes: input.duration ?? 30,
    intensityRpe: input.intensity ?? 4,
    preferredDayOfWeek: input.preferredDayOfWeek,
  };
}

function makeConfig(overrides: Partial<WeeklyPlanConfigRow> = {}): WeeklyPlanConfigRow {
  return {
    id: 'config-1',
    user_id: 'athlete-1',
    available_days: [1, 2, 3, 4, 5],
    availability_windows: [],
    session_duration_min: 60,
    allow_two_a_days: false,
    two_a_day_days: [],
    am_session_type: 'sc',
    pm_session_type: 'boxing_practice',
    preferred_gym_profile_id: null,
    auto_deload_interval_weeks: 4,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRecurringActivity(
  type: RecurringActivityRow['activity_type'],
  days: number[],
  overrides: Partial<RecurringActivityRow> = {},
): RecurringActivityRow {
  return {
    id: `${type}-${days.join('-')}`,
    user_id: 'athlete-1',
    activity_type: type,
    custom_label: null,
    start_time: '18:00',
    estimated_duration_min: 75,
    expected_intensity: type === 'sparring' ? 8 : 5,
    session_components: [],
    recurrence: { frequency: 'weekly', interval: 1, days_of_week: days },
    is_active: true,
    athlete_locked: true,
    constraint_tier: 'mandatory',
    ...overrides,
  };
}

function makePlanInput(overrides: Partial<SmartWeekPlanInput> = {}): SmartWeekPlanInput {
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
    activeCutPlan: null,
    weeksSinceLastDeload: 1,
    gymProfile: null,
    weekStartDate: WEEK_START,
    recurringActivities: [],
    ...overrides,
  };
}

console.log('\n-- adaptive training engine --');

(() => {
  const sparring = anchor({
    id: 'sparring-anchor',
    label: 'Team sparring',
    kind: 'sparring',
    family: 'sparring',
    dayOfWeek: 2,
    date: '2026-05-05',
    intensity: 8,
  });
  const result = generateAdaptiveTrainingWeek({
    performanceState: buildState({ anchors: [sparring] }),
    weekStartDate: WEEK_START,
  });
  const session = result.composedSessions.find((item) => item.anchorId === 'sparring-anchor');

  assert('protected sparring cannot move', session?.date === '2026-05-05');
  assert('protected sparring remains protected', session?.protectedAnchor === true);
})();

(() => {
  const teamTraining = anchor({
    id: 'team-training',
    label: 'Team training',
    kind: 'boxing_skill',
    family: 'boxing_skill',
    dayOfWeek: 3,
    date: '2026-05-06',
    duration: 90,
    intensity: 8,
  });
  const result = generateAdaptiveTrainingWeek({
    performanceState: buildState({ anchors: [teamTraining] }),
    weekStartDate: WEEK_START,
  });
  const day = result.topology.days.find((item) => item.date === '2026-05-06');

  assert('protected team training counts as weekly load', (day?.totalStress ?? 0) >= 72);
  assert('high-intensity protected team training is a hard-day anchor', day?.hardDayAnchor === true);
})();

(() => {
  const practice = anchor({
    id: 'practice-anchor',
    label: 'Coached practice',
    kind: 'boxing_skill',
    family: 'boxing_skill',
    dayOfWeek: 3,
    date: '2026-05-06',
    duration: 75,
    intensity: 6,
  });
  const result = generateAdaptiveTrainingWeek({
    performanceState: buildState({ anchors: [practice] }),
    weekStartDate: WEEK_START,
    candidateSessions: [
      candidate({
        id: 'mobility-support',
        title: 'Mobility support',
        kind: 'mobility',
        family: 'recovery',
        preferredDayOfWeek: 3,
        intensity: 2,
      }),
    ],
  });
  const mobility = result.composedSessions.find((session) => session.id === 'mobility-support');

  assert('mobility can sit adjacent to protected practice', mobility?.date === '2026-05-06');
  assert('mobility plus protected practice creates a merge explanation', result.mergeScores.some((score) => score.decision === 'embedded_microdose'));
})();

(() => {
  const score = scoreTrainingMerge({
    primary: candidate({ id: 'competition', title: 'Tournament', kind: 'competition', family: 'assessment', intensity: 10 }),
    secondary: candidate({ id: 'heavy-lower', title: 'Heavy lower strength', kind: 'heavy_lower_strength', family: 'strength', intensity: 8 }),
  });

  assert('competition blocks high-intensity merge', score.decision === 'reject');
})();

(() => {
  const score = scoreTrainingMerge({
    primary: candidate({ id: 'strength', title: 'Strength', kind: 'strength', family: 'strength', intensity: 6 }),
    secondary: candidate({ id: 'mobility', title: 'Mobility', kind: 'mobility', family: 'recovery', intensity: 2 }),
  });

  assert('mobility and strength merge', score.decision === 'merge_single_session');
})();

(() => {
  const score = scoreTrainingMerge({
    primary: candidate({ id: 'core', title: 'Core', kind: 'core', family: 'recovery', intensity: 3 }),
    secondary: candidate({ id: 'zone2', title: 'Zone 2', kind: 'zone2', family: 'roadwork', intensity: 3 }),
  });

  assert('core and Zone 2 merge or microdose', score.decision === 'embedded_microdose' || score.decision === 'merge_single_session');
})();

(() => {
  const score = scoreTrainingMerge({
    primary: candidate({ id: 'power', title: 'Power', kind: 'power', family: 'strength', intensity: 7 }),
    secondary: candidate({ id: 'conditioning', title: 'Conditioning', kind: 'conditioning', family: 'conditioning', intensity: 7 }),
  });

  assert('power plus conditioning merge is rejected', score.decision === 'reject');
})();

(() => {
  const result = generateAdaptiveTrainingWeek({
    performanceState: buildState(),
    weekStartDate: WEEK_START,
    candidateSessions: [
      candidate({ id: 'strength-main', title: 'Strength main', kind: 'strength', family: 'strength', preferredDayOfWeek: 1, duration: 50, intensity: 6 }),
      candidate({ id: 'mobility-accessory', title: 'Mobility accessory', kind: 'mobility', family: 'recovery', preferredDayOfWeek: 1, duration: 15, intensity: 2 }),
      candidate({ id: 'core-accessory', title: 'Core accessory', kind: 'core', family: 'recovery', preferredDayOfWeek: 1, duration: 15, intensity: 3 }),
    ],
  });

  assert('recovery day preserved by embedding accessories', result.topology.recoveryDayCount >= 5);
  assert('accessory embedding records merge score', result.mergeScores.some((score) => score.decision === 'merge_single_session' || score.decision === 'embedded_microdose'));
})();

(() => {
  const score = scoreTrainingMerge({
    primary: candidate({ id: 'lower', title: 'Heavy lower strength', kind: 'heavy_lower_strength', family: 'strength', intensity: 8 }),
    secondary: candidate({ id: 'intervals', title: 'Hard run intervals', kind: 'hard_intervals', family: 'conditioning', intensity: 8 }),
  });

  assert('hard run intervals and heavy lower strength are split or separated', score.decision === 'same_day_split' || score.decision === 'keep_separate');
})();

(() => {
  const anchors = [
    anchor({ id: 'sparring-a', label: 'Sparring A', kind: 'sparring', family: 'sparring', dayOfWeek: 2, date: '2026-05-05', intensity: 8 }),
    anchor({ id: 'sparring-b', label: 'Sparring B', kind: 'sparring', family: 'sparring', dayOfWeek: 5, date: '2026-05-08', intensity: 8 }),
  ];
  const result = generateAdaptiveTrainingWeek({
    performanceState: buildState({ anchors }),
    weekStartDate: WEEK_START,
  });
  const generatedHard = result.composedSessions.filter((session) => !session.protectedAnchor && (session.intensityRpe.target ?? 0) >= 7);

  assert('multiple protected hard sessions reduce generated high-intensity volume', generatedHard.length <= 1);
})();

(() => {
  const locked = anchor({
    id: 'locked-lift',
    label: 'User-locked lift',
    kind: 'strength',
    family: 'strength',
    dayOfWeek: 4,
    date: '2026-05-07',
    source: 'user_locked',
  });
  const result = generateAdaptiveTrainingWeek({
    performanceState: buildState({ anchors: [locked] }),
    weekStartDate: WEEK_START,
  });
  const session = result.composedSessions.find((item) => item.anchorId === 'locked-lift');

  assert('user-locked workout remains fixed', session?.date === '2026-05-07');
  assert('user-locked workout source is preserved', session?.source === 'user_locked');
})();

(() => {
  const split = scoreTrainingMerge({
    primary: candidate({ id: 'speed', title: 'Speed', kind: 'speed', family: 'strength', intensity: 7 }),
    secondary: candidate({ id: 'lower', title: 'Heavy lower strength', kind: 'heavy_lower_strength', family: 'strength', intensity: 8 }),
  });
  const reject = scoreTrainingMerge({
    primary: candidate({ id: 'sparring', title: 'Sparring', kind: 'sparring', family: 'sparring', intensity: 8 }),
    secondary: candidate({ id: 'power', title: 'Power', kind: 'power', family: 'strength', intensity: 7 }),
  });
  const deferResult = generateAdaptiveTrainingWeek({
    performanceState: buildState({
      anchors: [
        anchor({ id: 'sparring-fixed', label: 'Fixed sparring', kind: 'sparring', family: 'sparring', dayOfWeek: 2, date: '2026-05-05', intensity: 8 }),
      ],
    }),
    weekStartDate: WEEK_START,
    candidateSessions: [
      {
        ...candidate({ id: 'defer-me', title: 'No safe slot', kind: 'heavy_lower_strength', family: 'strength', intensity: 8 }),
        fixedDate: '2026-05-05',
      },
    ],
  });

  assert('split decision has explanation', split.decision === 'same_day_split' && split.explanation.summary.length > 0);
  assert('reject decision has explanation', reject.decision === 'reject' && reject.explanation.impact === 'restricted');
  assert('defer decision has explanation', deferResult.mergeScores.some((score) => score.decision === 'defer' && score.explanation.summary.length > 0));
  assert('protected-anchor decision has explanation', deferResult.explanations.some((explanation) => explanation.summary.includes('Adaptive Training Engine')));
})();

(() => {
  const input = makePlanInput({
    recurringActivities: [
      makeRecurringActivity('sparring', [2], { id: 'protected-sparring', expected_intensity: 8 }),
    ],
  });
  const adapterResult = generateAdaptiveSmartWeekPlan(input);
  const wrapperResult = generateSmartWeekPlan(input);

  assert('adapter weekly plan uses Adaptive Training Engine', adapterResult.message.includes('Adaptive Training Engine'));
  assert('legacy generateSmartWeekPlan path delegates to Adaptive Training Engine', wrapperResult.weeklyMixPlan.weekIntent.includes('Adaptive Training Engine'));
  assert('protected sparring is locked in adapter output', adapterResult.entries.some((entry) => entry.session_type === 'sparring' && entry.placement_source === 'locked'));
  assert('no duplicate scheduling source of truth is exposed in weekly intent', !wrapperResult.weeklyMixPlan.weekIntent.toLowerCase().includes('legacy'));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
