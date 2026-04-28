import {
  createAthleteJourneyState,
  createAthleteProfile,
  createComposedSession,
  createExplanation,
  createPerformanceState,
  createPhaseState,
  createPhaseTransition,
  createRiskFlag,
  createUnknownBodyMassState,
  type AthleteGoalSnapshot,
  type AthleteJourneyState,
  type AthleteProfile,
  type AthleticorePhase,
  type BodyMassState,
  type ComposedSession,
  type CompetitionLevel,
  type ConfidenceValue,
  type FightOpportunitySnapshot,
  type ISODateString,
  type ISODateTimeString,
  type NutritionPreferences,
  type PerformanceState,
  type PhaseState,
  type ProtectedWorkoutAnchor,
  type RiskFlag,
  type SessionFamily,
  type TrackingPreferences,
  type TrainingAvailability,
  type TrainingBackground,
  type TrainingBlock,
  type MeasurementRange,
  type UnknownField,
  type WeightClassPlan,
} from '../types/index.ts';
import { confidenceFromLevel } from '../utils/confidence.ts';
import { normalizeBodyMass, type BodyMassUnit } from '../utils/bodyMassUnits.ts';
import { createMeasurementRange } from '../utils/units.ts';

export type JourneyGoalMode = 'build_phase' | 'fight_camp';
export type JourneyBuildGoalType = 'strength' | 'conditioning' | 'boxing_skill' | 'weight_class_prep';
export type OnboardingTrainingBackground = 'new' | 'some' | 'advanced';

export interface OnboardingFixedSessionInput {
  id: string;
  activityType: 'boxing_practice' | 'sparring';
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  expectedIntensity: number;
  label: string;
}

export interface OnboardingJourneyInput {
  userId: string;
  capturedAt: ISODateTimeString;
  asOfDate: ISODateString;
  age: number | null;
  currentWeightLbs: number | null;
  biologicalSex: 'male' | 'female' | 'unknown';
  trainingBackground: OnboardingTrainingBackground | TrainingBackground;
  goalMode: JourneyGoalMode;
  buildGoalType: JourneyBuildGoalType;
  fightDate: ISODateString | null;
  targetWeightLbs: number | null;
  availableDays: number[];
  fixedSessions: OnboardingFixedSessionInput[];
  injuryOrLimitationNotes?: string[];
  nutritionPreferences?: Partial<NutritionPreferences>;
  trackingPreferences?: Partial<TrackingPreferences>;
}

export interface LegacyAthleteProfileSnapshot {
  user_id: string;
  age: number | null;
  biological_sex: 'male' | 'female' | null;
  fight_status: 'amateur' | 'pro' | null;
  phase: string | null;
  base_weight: number | null;
  target_weight: number | null;
  fight_date: string | null;
  athlete_goal_mode: string | null;
  performance_goal_type: string | null;
  nutrition_goal: string | null;
  cycle_tracking: boolean | null;
  training_age: string | null;
}

export interface LegacyAvailabilitySnapshot {
  available_days: number[];
  availability_windows?: Array<{
    dayOfWeek: number;
    startTime?: string | null;
    endTime?: string | null;
  }> | null;
  session_duration_min?: number | null;
  allow_two_a_days?: boolean | null;
}

export interface LegacyRecurringActivitySnapshot {
  id: string;
  activity_type: string;
  custom_label: string | null;
  start_time: string | null;
  estimated_duration_min: number | null;
  expected_intensity: number | null;
  recurrence: {
    frequency: string;
    days_of_week?: number[] | null;
  };
  constraint_tier?: string | null;
}

export interface ExistingAthleteJourneyInput {
  userId: string;
  asOfDate: ISODateString;
  generatedAt: ISODateTimeString;
  profile: LegacyAthleteProfileSnapshot;
  availability: LegacyAvailabilitySnapshot | null;
  recurringActivities: LegacyRecurringActivitySnapshot[];
  hasActiveBuildGoal: boolean;
  hasActiveFightCamp: boolean;
}

export interface AthleteJourneyInitialization {
  athlete: AthleteProfile;
  journey: AthleteJourneyState;
  performanceState: PerformanceState;
}

const MEDIUM_CONFIDENCE = confidenceFromLevel('medium', ['Initialized from onboarding or existing profile data.']);
const LOW_CONFIDENCE = confidenceFromLevel('low', ['Initialized from sparse or legacy data.']);

function mapTrainingBackground(value: OnboardingTrainingBackground | TrainingBackground | string | null): TrainingBackground {
  switch (value) {
    case 'advanced':
      return 'competitive';
    case 'some':
      return 'recreational';
    case 'new':
      return 'none';
    case 'none':
    case 'recreational':
    case 'competitive':
    case 'professional':
      return value;
    default:
      return 'unknown';
  }
}

function mapCompetitionLevel(value: 'amateur' | 'pro' | null | undefined): CompetitionLevel {
  if (value === 'pro') {
    return 'professional';
  }
  if (value === 'amateur') {
    return 'amateur';
  }
  return 'amateur';
}

function mapPhase(input: {
  goalMode: JourneyGoalMode | 'unknown';
  legacyPhase?: string | null;
}): AthleticorePhase {
  if (input.legacyPhase?.startsWith('camp') || input.legacyPhase === 'fight-camp') {
    return 'camp';
  }

  if (input.goalMode === 'fight_camp') {
    return 'camp';
  }

  if (input.goalMode === 'build_phase') {
    return 'build';
  }

  return 'unknown';
}

function sessionFamilyFromActivity(activityType: string): SessionFamily {
  if (activityType === 'sparring') {
    return 'sparring';
  }
  if (activityType === 'boxing_practice') {
    return 'boxing_skill';
  }
  return 'other';
}

function exactRange<TUnit extends 'minute' | 'rpe' | BodyMassUnit>(
  value: number | null,
  unit: TUnit,
  confidence: ConfidenceValue,
): MeasurementRange<TUnit> {
  return createMeasurementRange({
    min: value,
    target: value,
    max: value,
    unit,
    confidence,
  });
}

function targetBodyMassRange(value: number | null, unit: BodyMassUnit, confidence: ConfidenceValue) {
  return createMeasurementRange({
    min: value === null ? null : Math.max(0, value - 1),
    target: value,
    max: value === null ? null : value + 1,
    unit,
    confidence,
  });
}

function buildAvailability(input: {
  availableDays: number[];
  windows?: Array<{ dayOfWeek: number; startTime?: string | null; endTime?: string | null }> | null;
  sessionDurationMin?: number | null;
  allowTwoADays?: boolean | null;
  confidence: ConfidenceValue;
}): TrainingAvailability {
  const availableDays = [...new Set(input.availableDays)].sort((a, b) => a - b);
  const windows = input.windows ?? availableDays.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: null,
    endTime: null,
  }));

  return {
    availableDays,
    windows: windows.map((window) => ({
      dayOfWeek: window.dayOfWeek,
      startTime: window.startTime ?? null,
      endTime: window.endTime ?? null,
    })),
    preferredSessionDurationMinutes: exactRange(input.sessionDurationMin ?? 75, 'minute', input.confidence),
    allowTwoADays: Boolean(input.allowTwoADays),
    confidence: input.confidence,
  };
}

function buildProtectedAnchors(sessions: OnboardingFixedSessionInput[], confidence: ConfidenceValue): ProtectedWorkoutAnchor[] {
  return sessions.map((session) => ({
    id: session.id,
    label: session.label.trim() || (session.activityType === 'sparring' ? 'Sparring' : 'Boxing'),
    sessionFamily: sessionFamilyFromActivity(session.activityType),
    dayOfWeek: session.dayOfWeek,
    startTime: session.startTime,
    expectedDurationMinutes: exactRange(session.durationMin, 'minute', confidence),
    nonNegotiable: true,
    reason: 'Captured during onboarding as a fixed boxing commitment.',
  }));
}

function composedSessionsFromAnchors(anchors: ProtectedWorkoutAnchor[]): ComposedSession[] {
  return anchors.map((anchor) => createComposedSession({
    id: `${anchor.id}:session`,
    family: anchor.sessionFamily,
    title: anchor.label,
    source: 'protected_anchor',
    protectedAnchor: true,
    anchorId: anchor.id,
    durationMinutes: anchor.expectedDurationMinutes,
    intensityRpe: createMeasurementRange({
      min: null,
      target: null,
      max: null,
      unit: 'rpe',
    }),
  }));
}

function buildBodyMassState(input: {
  currentWeightLbs: number | null;
  targetWeightLbs: number | null;
  measuredOn: ISODateString;
  confidence: ConfidenceValue;
}): BodyMassState {
  const current = input.currentWeightLbs == null
    ? null
    : normalizeBodyMass({
      value: input.currentWeightLbs,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: input.measuredOn,
      confidence: input.confidence,
    });

  if (!current) {
    return createUnknownBodyMassState('lb');
  }

  return {
    current,
    trend: {
      direction: 'unknown',
      weeklyChange: createMeasurementRange({ unit: 'lb' }),
      confidence: LOW_CONFIDENCE,
    },
    targetRange: targetBodyMassRange(input.targetWeightLbs, 'lb', input.confidence),
    missingFields: input.targetWeightLbs == null ? [{ field: 'target_body_mass', reason: 'not_collected' }] : [],
    riskFlags: [],
    explanation: createExplanation({
      summary: 'Body-mass baseline captured for the athlete journey.',
      reasons: ['Current body mass came from onboarding or the existing athlete profile.'],
      confidence: input.confidence,
    }),
    confidence: input.confidence,
  };
}

function buildWeightClassPlan(input: {
  goalMode: JourneyGoalMode;
  targetWeightLbs: number | null;
  fightDate: ISODateString | null;
  confidence: ConfidenceValue;
}): WeightClassPlan | null {
  if (input.targetWeightLbs == null && input.fightDate == null) {
    return null;
  }

  return {
    id: 'initial-weight-class-plan',
    sport: 'boxing',
    status: input.targetWeightLbs == null ? 'exploratory' : 'planned',
    mode: input.goalMode === 'fight_camp' ? 'fight_week_support' : 'gradual_change',
    targetClassName: null,
    targetBodyMassRange: targetBodyMassRange(input.targetWeightLbs, 'lb', input.confidence),
    weighInDate: null,
    competitionDate: input.fightDate,
    safetyStatus: 'unknown',
    riskFlags: [],
    explanation: createExplanation({
      summary: 'Initial weight-class context captured without creating a cut protocol.',
      reasons: ['Phase 2 stores baseline context only; safety decisions come from later engines.'],
      confidence: input.confidence,
    }),
    confidence: input.confidence,
  };
}

function buildGoal(input: {
  mode: JourneyGoalMode;
  type: string;
  fightDate: ISODateString | null;
  targetWeightLbs: number | null;
}): AthleteGoalSnapshot {
  return {
    id: 'initial-goal',
    mode: input.mode,
    type: input.type,
    label: input.mode === 'fight_camp' ? 'Fight camp' : input.type.replace(/_/g, ' '),
    targetMetric: input.targetWeightLbs == null ? null : 'body_mass',
    targetValue: input.targetWeightLbs,
    targetUnit: input.targetWeightLbs == null ? null : 'lb',
    deadline: input.fightDate,
    explanation: createExplanation({
      summary: 'Initial objective captured during journey initialization.',
      reasons: ['Starting a phase records context on the ongoing athlete journey instead of resetting it.'],
      confidence: MEDIUM_CONFIDENCE,
    }),
  };
}

function buildPhaseState(input: {
  phase: AthleticorePhase;
  asOfDate: ISODateString;
  confidence: ConfidenceValue;
}): PhaseState {
  return createPhaseState({
    current: input.phase,
    activeSince: input.asOfDate,
    transitionReason: 'journey_initialized',
    transitionHistory: [
      createPhaseTransition({
        from: 'unknown',
        to: input.phase,
        reason: 'journey_initialized',
        transitionedAt: `${input.asOfDate}T00:00:00.000Z`,
        explanation: createExplanation({
          summary: 'The first phase starts the continuous journey.',
          reasons: ['Future phase changes should transition from this state instead of replacing the athlete baseline.'],
          confidence: input.confidence,
        }),
      }),
    ],
    confidence: input.confidence,
  });
}

function buildTrainingBlock(input: {
  phase: AthleticorePhase;
  goalType: JourneyBuildGoalType;
  asOfDate: ISODateString;
  anchors: ProtectedWorkoutAnchor[];
  confidence: ConfidenceValue;
}): TrainingBlock {
  return {
    id: 'initial-training-block',
    phase: input.phase,
    goal: input.phase === 'camp' ? 'fight_camp' : input.goalType,
    status: 'active',
    startDate: input.asOfDate,
    endDate: null,
    protectedAnchors: input.anchors,
    sessions: composedSessionsFromAnchors(input.anchors),
    explanation: createExplanation({
      summary: 'Initial training block created from onboarding context.',
      reasons: ['The block keeps protected workouts and athlete baseline attached to the journey.'],
      confidence: input.confidence,
    }),
    confidence: input.confidence,
  };
}

function buildFightOpportunity(input: {
  goalMode: JourneyGoalMode;
  fightDate: ISODateString | null;
  targetWeightLbs: number | null;
  confidence: ConfidenceValue;
}): FightOpportunitySnapshot | null {
  if (input.goalMode !== 'fight_camp' || !input.fightDate) {
    return null;
  }

  return {
    id: 'initial-fight-opportunity',
    status: 'confirmed',
    competitionDate: input.fightDate,
    targetWeightClassName: null,
    targetBodyMassRange: targetBodyMassRange(input.targetWeightLbs, 'lb', input.confidence),
    explanation: createExplanation({
      summary: 'Known fight captured as the first fight opportunity.',
      reasons: ['The opportunity belongs to the athlete journey and can be changed later without resetting the baseline.'],
      confidence: input.confidence,
    }),
  };
}

function buildRiskFlags(input: {
  currentWeightLbs: number | null;
  targetWeightLbs: number | null;
  fightDate: ISODateString | null;
  goalMode: JourneyGoalMode;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (input.currentWeightLbs == null) {
    flags.push(createRiskFlag({
      id: 'missing-body-mass-baseline',
      domain: 'data_quality',
      code: 'missing_body_mass_baseline',
      severity: 'caution',
      message: 'Current body mass is unknown, so body-mass and fueling decisions need more data.',
    }));
  }

  if (input.goalMode === 'fight_camp' && !input.fightDate) {
    flags.push(createRiskFlag({
      id: 'missing-fight-date',
      domain: 'fight_opportunity',
      code: 'missing_fight_date',
      severity: 'watch',
      message: 'Fight camp context is incomplete without a fight date.',
    }));
  }

  if (
    input.currentWeightLbs != null &&
    input.targetWeightLbs != null &&
    input.targetWeightLbs < input.currentWeightLbs * 0.9
  ) {
    flags.push(createRiskFlag({
      id: 'large-body-mass-change',
      domain: 'body_mass',
      code: 'large_body_mass_change',
      severity: 'watch',
      message: 'The target body mass is far from the starting body mass and needs safety review before recommendations.',
    }));
  }

  return flags;
}

function normalizeNutritionGoal(value: unknown): NutritionPreferences['goal'] {
  switch (value) {
    case 'cut':
    case 'lose':
      return 'cut';
    case 'bulk':
    case 'gain':
      return 'bulk';
    case 'maintain':
      return 'maintain';
    default:
      return 'unknown';
  }
}

function buildInitialization(input: {
  userId: string;
  capturedAt: ISODateTimeString;
  asOfDate: ISODateString;
  age: number | null;
  currentWeightLbs: number | null;
  biologicalSex: 'male' | 'female' | 'unknown';
  competitionLevel: CompetitionLevel;
  trainingBackground: TrainingBackground;
  goalMode: JourneyGoalMode;
  buildGoalType: JourneyBuildGoalType;
  fightDate: ISODateString | null;
  targetWeightLbs: number | null;
  availableDays: number[];
  fixedSessions: OnboardingFixedSessionInput[];
  availability?: LegacyAvailabilitySnapshot | null;
  nutritionPreferences: NutritionPreferences;
  trackingPreferences: TrackingPreferences;
  limitationNotes: string[];
  confidence: ConfidenceValue;
}): AthleteJourneyInitialization {
  const missingFields: UnknownField[] = [];
  if (input.age == null) missingFields.push({ field: 'age', reason: 'not_collected' });
  if (input.currentWeightLbs == null) missingFields.push({ field: 'current_body_mass', reason: 'not_collected' });

  const athlete = createAthleteProfile({
    athleteId: input.userId,
    userId: input.userId,
    sport: 'boxing',
    competitionLevel: input.competitionLevel,
    biologicalSex: input.biologicalSex,
    ageYears: input.age,
    preferredBodyMassUnit: 'lb',
    trainingBackground: input.trainingBackground,
    onboardingCompletedAt: input.capturedAt,
    missingFields,
    confidence: input.confidence,
  });
  const phase = mapPhase({ goalMode: input.goalMode });
  const phaseState = buildPhaseState({ phase, asOfDate: input.asOfDate, confidence: input.confidence });
  const protectedWorkoutAnchors = buildProtectedAnchors(input.fixedSessions, input.confidence);
  const trainingAvailability = buildAvailability({
    availableDays: input.availableDays,
    windows: input.availability?.availability_windows,
    sessionDurationMin: input.availability?.session_duration_min,
    allowTwoADays: input.availability?.allow_two_a_days,
    confidence: input.confidence,
  });
  const bodyMassState = buildBodyMassState({
    currentWeightLbs: input.currentWeightLbs,
    targetWeightLbs: input.targetWeightLbs,
    measuredOn: input.asOfDate,
    confidence: input.confidence,
  });
  const weightClassPlan = buildWeightClassPlan({
    goalMode: input.goalMode,
    targetWeightLbs: input.targetWeightLbs,
    fightDate: input.fightDate,
    confidence: input.confidence,
  });
  const riskFlags = buildRiskFlags({
    currentWeightLbs: input.currentWeightLbs,
    targetWeightLbs: input.targetWeightLbs,
    fightDate: input.fightDate,
    goalMode: input.goalMode,
  });
  const activeTrainingBlock = buildTrainingBlock({
    phase,
    goalType: input.buildGoalType,
    asOfDate: input.asOfDate,
    anchors: protectedWorkoutAnchors,
    confidence: input.confidence,
  });
  const activeFightOpportunity = buildFightOpportunity({
    goalMode: input.goalMode,
    fightDate: input.fightDate,
    targetWeightLbs: input.targetWeightLbs,
    confidence: input.confidence,
  });
  const goals = [buildGoal({
    mode: input.goalMode,
    type: input.buildGoalType,
    fightDate: input.fightDate,
    targetWeightLbs: input.targetWeightLbs,
  })];
  const initializationExplanation = createExplanation({
    summary: 'Athlete journey initialized from onboarding baseline.',
    reasons: [
      'Onboarding data becomes the starting context for future phases, blocks, fights, recovery periods, and plan changes.',
    ],
    confidence: input.confidence,
  });

  const journey = createAthleteJourneyState({
    journeyId: `${input.userId}:journey`,
    athlete,
    initializedAt: input.capturedAt,
    timelineStartDate: input.asOfDate,
    sportProfile: {
      primarySport: 'boxing',
      combatDiscipline: 'boxing',
      competitionLevel: input.competitionLevel,
      fightStatus: input.competitionLevel === 'professional' ? 'professional' : 'amateur',
      rounds: input.goalMode === 'fight_camp' ? 3 : null,
      roundDurationSec: input.goalMode === 'fight_camp' ? 180 : null,
      restDurationSec: input.goalMode === 'fight_camp' ? 60 : null,
    },
    goals,
    phase: phaseState,
    activeTrainingBlock,
    activeFightOpportunity,
    trainingAvailability,
    protectedWorkoutAnchors,
    bodyMassState,
    weightClassPlan,
    nutritionPreferences: input.nutritionPreferences,
    trackingPreferences: input.trackingPreferences,
    limitationNotes: input.limitationNotes,
    riskFlags,
    events: [
      {
        id: `${input.userId}:onboarding-completed`,
        athleteId: input.userId,
        type: 'onboarding_completed',
        occurredAt: input.capturedAt,
        effectiveDate: input.asOfDate,
        payload: {
          goalMode: input.goalMode,
          buildGoalType: input.buildGoalType,
          availableDays: input.availableDays,
          protectedWorkoutCount: protectedWorkoutAnchors.length,
        },
        explanation: initializationExplanation,
      },
    ],
    missingFields,
    confidence: input.confidence,
  });

  const performanceState = createPerformanceState({
    athlete,
    journey,
    asOfDate: input.asOfDate,
    generatedAt: input.capturedAt,
    phase: phaseState,
    activeTrainingBlock,
    trainingAvailability,
    composedSessions: composedSessionsFromAnchors(protectedWorkoutAnchors),
    bodyMass: bodyMassState,
    weightClassPlan,
    riskFlags,
    explanations: [initializationExplanation],
    unknowns: missingFields,
    confidence: input.confidence,
  });

  return { athlete, journey, performanceState };
}

export function initializeJourneyFromOnboarding(input: OnboardingJourneyInput): AthleteJourneyInitialization {
  return buildInitialization({
    ...input,
    competitionLevel: 'amateur',
    trainingBackground: mapTrainingBackground(input.trainingBackground),
    nutritionPreferences: {
      goal: input.nutritionPreferences?.goal ?? 'unknown',
      dietaryNotes: input.nutritionPreferences?.dietaryNotes ?? [],
      supplementNotes: input.nutritionPreferences?.supplementNotes ?? [],
    },
    trackingPreferences: {
      bodyMass: input.trackingPreferences?.bodyMass ?? true,
      readiness: input.trackingPreferences?.readiness ?? true,
      nutrition: input.trackingPreferences?.nutrition ?? true,
      cycle: input.trackingPreferences?.cycle ?? false,
    },
    limitationNotes: input.injuryOrLimitationNotes ?? [],
    confidence: MEDIUM_CONFIDENCE,
  });
}

export function initializeJourneyFromExistingData(input: ExistingAthleteJourneyInput): AthleteJourneyInitialization {
  const goalMode: JourneyGoalMode = input.profile.athlete_goal_mode === 'fight_camp' ? 'fight_camp' : 'build_phase';
  const buildGoalType = ((): JourneyBuildGoalType => {
    switch (input.profile.performance_goal_type) {
      case 'strength':
      case 'conditioning':
      case 'boxing_skill':
      case 'weight_class_prep':
        return input.profile.performance_goal_type;
      default:
        return 'conditioning';
    }
  })();
  const availability = input.availability;
  const availableDays = availability?.available_days?.length
    ? availability.available_days
    : availability?.availability_windows?.map((window) => window.dayOfWeek) ?? [];
  const fixedSessions = input.recurringActivities
    .filter((activity) => (
      activity.recurrence.frequency === 'weekly' &&
      Boolean(activity.recurrence.days_of_week?.length) &&
      (activity.activity_type === 'boxing_practice' || activity.activity_type === 'sparring')
    ))
    .map<OnboardingFixedSessionInput>((activity) => ({
      id: activity.id,
      activityType: activity.activity_type === 'sparring' ? 'sparring' : 'boxing_practice',
      dayOfWeek: activity.recurrence.days_of_week?.[0] ?? 1,
      startTime: activity.start_time?.slice(0, 5) ?? '19:00',
      durationMin: activity.estimated_duration_min ?? 60,
      expectedIntensity: activity.expected_intensity ?? 7,
      label: activity.custom_label ?? '',
    }));

  const initialization = buildInitialization({
    userId: input.userId,
    capturedAt: input.generatedAt,
    asOfDate: input.asOfDate,
    age: input.profile.age,
    currentWeightLbs: input.profile.base_weight,
    biologicalSex: input.profile.biological_sex ?? 'unknown',
    competitionLevel: mapCompetitionLevel(input.profile.fight_status),
    trainingBackground: mapTrainingBackground(input.profile.training_age),
    goalMode,
    buildGoalType,
    fightDate: input.profile.fight_date,
    targetWeightLbs: input.profile.target_weight,
    availableDays,
    fixedSessions,
    availability,
    nutritionPreferences: {
      goal: normalizeNutritionGoal(input.profile.nutrition_goal),
      dietaryNotes: [],
      supplementNotes: [],
    },
    trackingPreferences: {
      bodyMass: true,
      readiness: true,
      nutrition: true,
      cycle: Boolean(input.profile.cycle_tracking),
    },
    limitationNotes: [],
    confidence: LOW_CONFIDENCE,
  });

  const resolvedPhase = buildPhaseState({
    phase: mapPhase({ goalMode, legacyPhase: input.profile.phase }),
    asOfDate: input.asOfDate,
    confidence: LOW_CONFIDENCE,
  });

  return {
    athlete: initialization.athlete,
    journey: {
      ...initialization.journey,
      phase: resolvedPhase,
    },
    performanceState: {
      ...initialization.performanceState,
      phase: resolvedPhase,
      journey: {
        ...initialization.journey,
        phase: resolvedPhase,
      },
    },
  };
}
