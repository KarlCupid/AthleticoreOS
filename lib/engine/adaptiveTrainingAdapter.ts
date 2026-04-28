import type {
  ActivityType,
  DailyTrainingPlacement,
  Phase,
  PlanSlot,
  RecurringActivityRow,
  ReadinessState as LegacyReadinessState,
  SCSessionFamily,
  SessionDoseSummary,
  SessionModulePlan,
  SmartWeekPlanInput,
  SmartWeekPlanResult,
  TrainingSessionFamily,
  WeeklyPlanEntryRow,
  WeeklySessionTarget,
  WeeklyTrainingMixPlan,
  WorkoutDoseBucket,
  WorkoutFocus,
  WorkoutPrescriptionV2,
} from './types.ts';
import { generateWorkoutV2 } from './calculateSC.ts';
import type {
  AdaptiveSessionKind,
  AdaptiveTrainingWeekResult,
  AthleticorePhase,
  ComposedSession,
  PerformanceState,
  ProtectedAnchorInput,
  ProtectedWorkoutAnchor,
  ReadinessState,
  SessionFamily,
  SessionSource,
  TrainingAvailability,
} from '../performance-engine/index.ts';
import {
  addDays,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createMeasurementRange,
  createPerformanceState,
  createPhaseState,
  resolveReadinessState,
  runUnifiedPerformanceEngine,
} from '../performance-engine/index.ts';

const ENGINE_NOTE_PREFIX = 'Adaptive Training Engine';
const LEGACY_SESSION_FAMILIES: TrainingSessionFamily[] = [
  'sparring',
  'boxing_skill',
  'conditioning',
  'strength',
  'durability_core',
  'recovery',
  'rest',
];

function normalizeDay(day: number | null | undefined): number | null {
  if (day == null) return null;
  if (day === 7) return 0;
  if (day < 0 || day > 6) return null;
  return day;
}

function dayOfWeekFromDate(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function dateForDay(weekStartDate: string, dayOfWeek: number): string {
  const weekStartDay = dayOfWeekFromDate(weekStartDate);
  const offset = (dayOfWeek - weekStartDay + 7) % 7;
  return addDays(weekStartDate, offset);
}

function mapLegacyPhase(phase: Phase, campConfigPresent: boolean): AthleticorePhase {
  if (phase === 'camp-taper') return 'taper';
  if (phase === 'pre-camp') return 'weight_class_management';
  if (phase === 'fight-camp' || phase === 'camp-base' || phase === 'camp-build' || phase === 'camp-peak') {
    return campConfigPresent ? 'camp' : 'camp';
  }
  return 'build';
}

function readinessPercent(readinessState: LegacyReadinessState): number {
  if (readinessState === 'Prime') return 82;
  if (readinessState === 'Caution') return 62;
  return 36;
}

function buildReadinessState(readinessState: LegacyReadinessState, date: string): ReadinessState {
  return resolveReadinessState({
    athleteId: 'legacy-weekly-athlete',
    date,
    entries: [
      {
        id: `legacy-readiness:${date}`,
        athleteId: 'legacy-weekly-athlete',
        timestamp: `${date}T08:00:00.000Z`,
        timezone: 'UTC',
        type: 'readiness',
        source: 'system_inferred',
        value: readinessPercent(readinessState),
        unit: 'percent',
        confidence: confidenceFromLevel('low', [
          'Legacy weekly planning only provides a coarse readiness state.',
        ]),
        context: { sourceReadinessState: readinessState },
        notes: null,
      },
    ],
  }).readiness;
}

function buildTrainingAvailability(input: SmartWeekPlanInput): TrainingAvailability {
  const days = input.config.available_days
    .map(normalizeDay)
    .filter((day): day is number => day !== null);

  return {
    availableDays: days.length > 0 ? days : [1, 2, 3, 4, 5],
    windows: input.config.availability_windows.map((window) => ({
      dayOfWeek: normalizeDay(window.dayOfWeek) ?? window.dayOfWeek,
      startTime: window.startTime ?? null,
      endTime: window.endTime ?? null,
    })),
    preferredSessionDurationMinutes: createMeasurementRange({
      min: Math.max(20, input.config.session_duration_min - 15),
      target: input.config.session_duration_min,
      max: input.config.session_duration_min + 15,
      unit: 'minute',
      confidence: confidenceFromLevel('medium'),
    }),
    allowTwoADays: input.config.allow_two_a_days,
    confidence: confidenceFromLevel('medium'),
  };
}

function activityKind(activity: RecurringActivityRow): AdaptiveSessionKind {
  const kind = (activity.session_kind ?? '').toLowerCase();
  if (kind.includes('competition') || kind.includes('tournament') || kind.includes('fight')) return 'competition';
  if (kind.includes('mobility')) return 'mobility';
  if (kind.includes('prehab')) return 'prehab';
  if (kind.includes('breath')) return 'breathwork';
  if (kind.includes('core')) return 'core';
  if (kind.includes('speed')) return 'speed';
  if (kind.includes('power')) return 'power';
  if (kind.includes('plyo')) return 'plyo';
  if (kind.includes('threshold')) return 'threshold';
  if (kind.includes('interval')) return 'hard_intervals';
  if (kind.includes('zone2') || kind.includes('zone_2')) return 'zone2';

  switch (activity.activity_type) {
    case 'sparring':
      return 'sparring';
    case 'boxing_practice':
      return 'boxing_skill';
    case 'sc':
      return activity.expected_intensity >= 7 ? 'heavy_lower_strength' : 'strength';
    case 'conditioning':
      return activity.expected_intensity >= 7 ? 'hard_intervals' : 'conditioning';
    case 'running':
    case 'road_work':
      return activity.expected_intensity >= 7 ? 'threshold' : 'zone2';
    case 'active_recovery':
      return 'recovery';
    case 'rest':
      return 'rest';
    case 'other':
    default:
      return activity.expected_intensity >= 7 ? 'conditioning' : 'recovery';
  }
}

function familyForKind(kind: AdaptiveSessionKind): SessionFamily {
  switch (kind) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
      return 'boxing_skill';
    case 'strength':
    case 'heavy_lower_strength':
    case 'heavy_upper_strength':
    case 'speed':
    case 'power':
    case 'plyo':
      return 'strength';
    case 'hard_intervals':
    case 'threshold':
    case 'conditioning':
      return 'conditioning';
    case 'zone2':
    case 'easy_aerobic':
    case 'long_endurance':
      return 'roadwork';
    case 'competition':
      return 'assessment';
    case 'rest':
      return 'rest';
    case 'mobility':
    case 'prehab':
    case 'core':
    case 'recovery':
    case 'breathwork':
    default:
      return 'recovery';
  }
}

function sourceForActivity(activity: RecurringActivityRow, kind: AdaptiveSessionKind): SessionSource {
  if (kind === 'competition') return 'competition';
  if (activity.athlete_locked) return 'user_locked';
  return 'protected_anchor';
}

function expandRecurringActivity(input: {
  activity: RecurringActivityRow;
  weekStartDate: string;
}): ProtectedAnchorInput[] {
  const { activity, weekStartDate } = input;
  if (!activity.is_active) return [];

  const recurrence = activity.recurrence;
  const days = recurrence.frequency === 'daily'
    ? [0, 1, 2, 3, 4, 5, 6]
    : recurrence.frequency === 'weekly'
      ? (recurrence.days_of_week ?? []).map(normalizeDay).filter((day): day is number => day !== null)
      : [];

  return days.map((dayOfWeek) => {
    const kind = activityKind(activity);
    return {
      id: `${activity.id}:${dateForDay(weekStartDate, dayOfWeek)}`,
      label: activity.custom_label ?? activity.activity_type.replace(/_/g, ' '),
      kind,
      family: familyForKind(kind),
      dayOfWeek,
      date: dateForDay(weekStartDate, dayOfWeek),
      startTime: activity.start_time ?? null,
      durationMinutes: Math.max(0, activity.estimated_duration_min),
      intensityRpe: Math.max(1, Math.min(10, activity.intended_intensity ?? activity.expected_intensity)),
      source: sourceForActivity(activity, kind),
      canMerge: false,
      reason: activity.constraint_tier === 'mandatory'
        ? 'Mandatory recurring workout captured as a protected anchor.'
        : 'Recurring or user-locked workout captured as a protected anchor.',
    };
  });
}

function loadProtectedAnchorInputs(input: SmartWeekPlanInput): ProtectedAnchorInput[] {
  return (input.recurringActivities ?? []).flatMap((activity) => expandRecurringActivity({
    activity,
    weekStartDate: input.weekStartDate,
  }));
}

function toJourneyAnchor(anchor: ProtectedAnchorInput): ProtectedWorkoutAnchor {
  return {
    id: anchor.id,
    label: anchor.label,
    sessionFamily: anchor.family ?? familyForKind(anchor.kind),
    dayOfWeek: normalizeDay(anchor.dayOfWeek),
    startTime: anchor.startTime ?? null,
    expectedDurationMinutes: createMeasurementRange({
      target: anchor.durationMinutes,
      unit: 'minute',
      confidence: confidenceFromLevel('medium'),
    }),
    expectedIntensityRpe: createMeasurementRange({
      target: anchor.intensityRpe,
      unit: 'rpe',
      confidence: confidenceFromLevel('medium'),
    }),
    nonNegotiable: true,
    reason: anchor.reason ?? 'Protected workouts are non-negotiable anchors.',
    date: anchor.date ?? null,
    source: anchor.source ?? 'protected_anchor',
    canMerge: anchor.canMerge ?? false,
  };
}

function buildPerformanceState(input: SmartWeekPlanInput, protectedAnchors: ProtectedAnchorInput[]): PerformanceState {
  const phase = createPhaseState({
    current: mapLegacyPhase(input.phase, input.campConfig != null),
    activeSince: input.weekStartDate,
    transitionReason: input.campConfig != null ? 'fight_confirmed' : 'build_phase_started',
  });
  const athlete = createAthleteProfile({
    athleteId: input.config.user_id,
    userId: input.config.user_id,
    sport: 'boxing',
    trainingBackground: input.fitnessLevel === 'beginner'
      ? 'recreational'
      : input.fitnessLevel === 'elite'
        ? 'professional'
        : 'competitive',
  });
  const trainingAvailability = buildTrainingAvailability(input);
  const journey = createAthleteJourneyState({
    journeyId: `${input.config.user_id}:journey`,
    athlete,
    timelineStartDate: input.weekStartDate,
    phase,
    goals: [
      {
        id: `${input.config.user_id}:active-goal`,
        mode: input.campConfig != null ? 'fight_camp' : 'build_phase',
        type: input.performanceGoalType ?? 'conditioning',
        label: (input.performanceGoalType ?? 'conditioning').replace(/_/g, ' '),
        targetMetric: null,
        targetValue: null,
        targetUnit: null,
        deadline: input.campConfig?.fightDate ?? input.activeWeightClassPlan?.weigh_in_date ?? null,
        explanation: null,
      },
    ],
    trainingAvailability,
    protectedWorkoutAnchors: protectedAnchors.map(toJourneyAnchor),
    confidence: confidenceFromLevel('low', [
      'PerformanceState was initialized from legacy weekly planner inputs during Phase 5 migration.',
    ]),
  });

  return createPerformanceState({
    athlete,
    journey,
    asOfDate: input.weekStartDate,
    generatedAt: new Date().toISOString(),
    phase,
    trainingAvailability,
    readiness: buildReadinessState(input.readinessState, input.weekStartDate),
    confidence: journey.confidence,
  });
}

function focusForSession(session: ComposedSession): WorkoutFocus | null {
  const title = session.title.toLowerCase();
  if (session.family === 'strength') {
    if (title.includes('lower') || session.tissueLoads?.includes('lower')) return 'lower';
    return 'full_body';
  }
  if (session.family === 'conditioning' || session.family === 'roadwork') return 'conditioning';
  if (session.family === 'recovery' || session.family === 'rest') return 'recovery';
  if (!session.protectedAnchor && (session.family === 'boxing_skill' || session.family === 'sparring')) return 'sport_specific';
  return null;
}

function legacyFamilyForSession(session: ComposedSession): TrainingSessionFamily {
  if (session.family === 'sparring') return 'sparring';
  if (session.family === 'boxing_skill') return 'boxing_skill';
  if (session.family === 'strength') return 'strength';
  if (session.family === 'conditioning' || session.family === 'roadwork') return 'conditioning';
  if (session.family === 'rest') return 'rest';
  if (session.title.toLowerCase().includes('core')) return 'durability_core';
  if (session.family === 'assessment') return 'sparring';
  return 'recovery';
}

function activityTypeForSession(session: ComposedSession): ActivityType {
  if (session.family === 'sparring') return 'sparring';
  if (session.family === 'boxing_skill') return 'boxing_practice';
  if (session.family === 'strength') return 'sc';
  if (session.family === 'conditioning') return 'conditioning';
  if (session.family === 'roadwork') return 'road_work';
  if (session.family === 'rest') return 'rest';
  if (session.family === 'assessment') return 'other';
  return 'active_recovery';
}

function scFamilyForSession(session: ComposedSession, focus: WorkoutFocus | null): SCSessionFamily | null {
  const title = session.title.toLowerCase();
  if (session.family === 'strength') {
    if (title.includes('speed')) return 'acceleration';
    if (title.includes('power')) return 'loaded_jump_power';
    return 'max_strength';
  }
  if (session.family === 'conditioning') return (session.intensityRpe.target ?? 0) >= 7 ? 'hiit' : 'tempo';
  if (session.family === 'roadwork') return (session.intensityRpe.target ?? 0) >= 7 ? 'threshold' : 'aerobic_base';
  if (session.family === 'recovery') return focus === 'recovery' ? 'tissue_capacity' : null;
  return null;
}

function bucketForSession(session: ComposedSession, focus: WorkoutFocus | null): WorkoutDoseBucket {
  if (session.family === 'conditioning' || session.family === 'roadwork' || focus === 'conditioning') return 'conditioning';
  if (session.family === 'recovery' || session.family === 'rest' || focus === 'recovery') return 'recovery';
  if (legacyFamilyForSession(session) === 'durability_core') return 'durability';
  return 'strength';
}

function doseSummaryForSession(session: ComposedSession): SessionDoseSummary {
  const duration = session.durationMinutes.target ?? 0;
  const intensity = session.intensityRpe.target ?? 0;
  const stress = session.stressScore ?? Math.round((duration * intensity) / 10);
  if (session.family === 'strength') {
    return {
      hardSets: intensity >= 7 ? 12 : 8,
      tissueStressLoad: stress,
      highImpactCount: session.tissueLoads?.includes('lower') ? 2 : 0,
    };
  }
  if (session.family === 'conditioning') {
    return {
      hiitMinutes: intensity >= 7 ? duration : 0,
      circuitRounds: intensity >= 7 ? 0 : 3,
      tissueStressLoad: stress,
    };
  }
  if (session.family === 'roadwork') {
    return {
      aerobicMinutes: duration,
      tissueStressLoad: stress,
    };
  }
  if (session.family === 'recovery') {
    return {
      tissueStressLoad: Math.min(stress, 10),
    };
  }
  return {
    tissueStressLoad: stress,
  };
}

function zeroDoseSummary(): Required<SessionDoseSummary> {
  return {
    hardSets: 0,
    sprintMeters: 0,
    plyoContacts: 0,
    hiitMinutes: 0,
    aerobicMinutes: 0,
    circuitRounds: 0,
    highImpactCount: 0,
    tissueStressLoad: 0,
  };
}

function addDoseSummary(total: Required<SessionDoseSummary>, next: SessionDoseSummary | null | undefined): void {
  if (!next) return;
  total.hardSets += next.hardSets ?? 0;
  total.sprintMeters += next.sprintMeters ?? 0;
  total.plyoContacts += next.plyoContacts ?? 0;
  total.hiitMinutes += next.hiitMinutes ?? 0;
  total.aerobicMinutes += next.aerobicMinutes ?? 0;
  total.circuitRounds += next.circuitRounds ?? 0;
  total.highImpactCount += next.highImpactCount ?? 0;
  total.tissueStressLoad += next.tissueStressLoad ?? 0;
}

function buildPrescription(input: {
  plannerInput: SmartWeekPlanInput;
  session: ComposedSession;
  focus: WorkoutFocus | null;
  scSessionFamily: SCSessionFamily | null;
  isDeloadWeek: boolean;
}): WorkoutPrescriptionV2 | null {
  const { plannerInput, session, focus, scSessionFamily, isDeloadWeek } = input;
  if (!focus || session.protectedAnchor || plannerInput.exerciseLibrary.length === 0) return null;

  return generateWorkoutV2({
    readinessState: plannerInput.readinessState,
    phase: plannerInput.phase,
    acwr: plannerInput.acwr,
    exerciseLibrary: plannerInput.exerciseLibrary,
    recentExerciseIds: plannerInput.recentExerciseIds ?? [],
    recentMuscleVolume: plannerInput.recentMuscleVolume,
    focus,
    fitnessLevel: plannerInput.fitnessLevel,
    trainingDate: session.date ?? plannerInput.weekStartDate,
    availableMinutes: session.durationMinutes.target ?? plannerInput.config.session_duration_min,
    gymEquipment: plannerInput.gymProfile?.equipment ?? undefined,
    exerciseHistory: plannerInput.exerciseHistory,
    isDeloadWeek,
    weeklyPlanFocus: focus,
    performanceGoalType: plannerInput.performanceGoalType,
    sessionFamily: legacyFamilyForSession(session),
    scSessionFamily,
  });
}

function modulesForSession(session: ComposedSession, focus: WorkoutFocus | null, prescription: WorkoutPrescriptionV2 | null): SessionModulePlan[] {
  if (prescription?.sessionComposition) return prescription.sessionComposition;
  if (!focus || session.protectedAnchor) return [];
  return [
    {
      bucket: bucketForSession(session, focus),
      focus,
      durationMin: session.durationMinutes.target ?? null,
      preserveOnYellow: session.family === 'conditioning' || session.family === 'recovery',
    },
  ];
}

function slotsForDate(sessions: ComposedSession[]): Map<string, PlanSlot> {
  const sorted = [...sessions].sort((a, b) => {
    if (a.protectedAnchor !== b.protectedAnchor) return a.protectedAnchor ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
  const slots = new Map<string, PlanSlot>();
  if (sorted.length === 1) {
    slots.set(sorted[0].id, 'single');
    return slots;
  }
  sorted.forEach((session, index) => {
    slots.set(session.id, index === 0 ? 'am' : 'pm');
  });
  return slots;
}

function convertSessionsToRows(input: {
  plannerInput: SmartWeekPlanInput;
  adaptive: AdaptiveTrainingWeekResult;
  isDeloadWeek: boolean;
}): { entries: WeeklyPlanEntryRow[]; placements: DailyTrainingPlacement[]; focusSplit: Partial<Record<WorkoutFocus, number>> } {
  const { plannerInput, adaptive, isDeloadWeek } = input;
  const sessionsByDate = new Map<string, ComposedSession[]>();
  for (const session of adaptive.composedSessions) {
    if (!session.date) continue;
    const list = sessionsByDate.get(session.date) ?? [];
    list.push(session);
    sessionsByDate.set(session.date, list);
  }

  const entries: WeeklyPlanEntryRow[] = [];
  const placements: DailyTrainingPlacement[] = [];
  const focusSplit: Partial<Record<WorkoutFocus, number>> = {};
  const createdAt = new Date().toISOString();
  const sortedDates = Array.from(sessionsByDate.keys()).sort();

  for (const date of sortedDates) {
    const sessions = sessionsByDate.get(date) ?? [];
    const slotMap = slotsForDate(sessions);
    sessions.forEach((session, index) => {
      const focus = focusForSession(session);
      const scSessionFamily = scFamilyForSession(session, focus);
      const prescription = buildPrescription({
        plannerInput,
        session,
        focus,
        scSessionFamily,
        isDeloadWeek,
      });
      const sessionModules = modulesForSession(session, focus, prescription);
      const doseSummary = prescription?.doseSummary ?? prescription?.sessionPrescription?.dose ?? doseSummaryForSession(session);
      const doseCredits = prescription?.doseCredits ?? [];
      const realizedDoseBuckets = Array.from(new Set(
        doseCredits
          .filter((credit) => credit.credit > 0)
          .map((credit) => credit.bucket),
      ));
      const notes = [
        `${ENGINE_NOTE_PREFIX}: ${session.explanation?.summary ?? 'Session placed from unified performance state.'}`,
        session.protectedAnchor ? 'Protected anchor preserved as fixed.' : null,
      ].filter(Boolean).join(' ');
      const dayOfWeek = dayOfWeekFromDate(date);
      const slot = slotMap.get(session.id) ?? (sessions.length === 1 ? 'single' : index === 0 ? 'am' : 'pm');
      const entry: WeeklyPlanEntryRow = {
        id: `${plannerInput.weekStartDate}-${dayOfWeek}-${session.id}`,
        user_id: plannerInput.config.user_id,
        week_start_date: plannerInput.weekStartDate,
        day_of_week: dayOfWeek,
        date,
        slot,
        day_order: index,
        session_type: activityTypeForSession(session),
        focus,
        session_family: legacyFamilyForSession(session),
        sc_session_family: scSessionFamily,
        placement_source: session.protectedAnchor ? 'locked' : 'generated',
        progression_intent: session.protectedAnchor
          ? 'protected_anchor'
          : `${ENGINE_NOTE_PREFIX.toLowerCase().replace(/ /g, '_')}:${adaptive.trainingBlock.goal}`,
        carry_forward_reason: null,
        session_modules: sessionModules,
        dose_credits: doseCredits,
        dose_summary: doseSummary,
        realized_dose_buckets: realizedDoseBuckets,
        estimated_duration_min: session.durationMinutes.target ?? 0,
        target_intensity: session.intensityRpe.target ?? null,
        status: 'planned',
        rescheduled_to: null,
        workout_log_id: null,
        prescription_snapshot: prescription,
        engine_notes: notes,
        is_deload: isDeloadWeek,
        created_at: createdAt,
      };

      entries.push(entry);
      placements.push({
        date,
        day_of_week: dayOfWeek,
        slot,
        dayOrder: index,
        sessionFamily: entry.session_family ?? legacyFamilyForSession(session),
        scSessionFamily,
        sessionType: entry.session_type as ActivityType,
        focus,
        durationMin: entry.estimated_duration_min,
        targetIntensity: entry.target_intensity,
        source: entry.placement_source ?? 'generated',
        locked: session.protectedAnchor,
        progressionIntent: entry.progression_intent ?? null,
        notes,
        sessionModules,
        doseCredits,
        doseSummary,
        realizedDoseBuckets,
        recurringActivityId: session.anchorId,
      });

      if (focus) {
        focusSplit[focus] = (focusSplit[focus] ?? 0) + 1;
      }
    });
  }

  return { entries, placements, focusSplit };
}

function buildWeeklyTargets(placements: DailyTrainingPlacement[]): WeeklySessionTarget[] {
  return LEGACY_SESSION_FAMILIES.map((family) => {
    const scheduled = placements.filter((placement) => placement.sessionFamily === family).length;
    return {
      family,
      min: scheduled > 0 ? 1 : 0,
      target: scheduled,
      max: Math.max(scheduled, scheduled + 1),
      scheduled,
      completed: 0,
      realized: scheduled,
      debt: 0,
      metBySubstitution: 0,
      missReason: null,
    };
  });
}

function buildWeeklyDoseSummary(placements: DailyTrainingPlacement[]): Required<SessionDoseSummary> {
  const total = zeroDoseSummary();
  for (const placement of placements) {
    addDoseSummary(total, placement.doseSummary);
  }
  return total;
}

function isDeloadWeek(input: SmartWeekPlanInput, performanceState: PerformanceState): boolean {
  if (performanceState.phase.current === 'deload' || performanceState.phase.current === 'taper' || performanceState.phase.current === 'recovery') {
    return true;
  }
  if (input.readinessState === 'Depleted') return true;
  return input.config.auto_deload_interval_weeks > 0 && input.weeksSinceLastDeload >= input.config.auto_deload_interval_weeks;
}

function deloadReason(input: SmartWeekPlanInput, performanceState: PerformanceState): string | null {
  if (!isDeloadWeek(input, performanceState)) return null;
  if (performanceState.phase.current === 'taper') return 'Taper phase reduces generated training stress.';
  if (input.readinessState === 'Depleted') return 'Readiness is depleted, so generated training is restricted.';
  return 'Auto-deload interval reached.';
}

function buildWeeklyMixPlan(input: {
  plannerInput: SmartWeekPlanInput;
  adaptive: AdaptiveTrainingWeekResult;
  placements: DailyTrainingPlacement[];
}): WeeklyTrainingMixPlan {
  const carryForwardAdjustments = input.adaptive.mergeScores
    .filter((score) => score.decision === 'defer' || score.decision === 'reject')
    .map((score) => ({
      family: 'recovery' as TrainingSessionFamily,
      fromDate: null,
      suggestedDate: null,
      reason: score.explanation.summary,
      status: score.decision === 'reject' ? 'cancelled' as const : 'deferred' as const,
    }));

  return {
    weekStartDate: input.plannerInput.weekStartDate,
    weekIntent: `${ENGINE_NOTE_PREFIX}: ${input.adaptive.trainingBlock.goal.replace(/_/g, ' ')} in ${input.adaptive.trainingBlock.phase.replace(/_/g, ' ')} phase.`,
    sessionTargets: buildWeeklyTargets(input.placements),
    scDoseSummary: buildWeeklyDoseSummary(input.placements),
    dailyPlacements: input.placements,
    carryForwardAdjustments,
  };
}

export function generateAdaptiveSmartWeekPlan(input: SmartWeekPlanInput): SmartWeekPlanResult {
  const protectedAnchors = loadProtectedAnchorInputs(input);
  const performanceState = buildPerformanceState(input, protectedAnchors);
  const unified = runUnifiedPerformanceEngine({
    performanceState,
    asOfDate: input.weekStartDate,
    weekStartDate: input.weekStartDate,
    protectedAnchors,
  });
  const adaptive = unified.training;
  const deload = isDeloadWeek(input, performanceState);
  const converted = convertSessionsToRows({
    plannerInput: input,
    adaptive,
    isDeloadWeek: deload,
  });

  return {
    entries: converted.entries,
    isDeloadWeek: deload,
    deloadReason: deloadReason(input, performanceState),
    weeklyFocusSplit: converted.focusSplit,
    weeklyMixPlan: buildWeeklyMixPlan({
      plannerInput: input,
      adaptive,
      placements: converted.placements,
    }),
    message: `Unified Performance Engine -> ${ENGINE_NOTE_PREFIX}: ${converted.entries.length} session(s), ${protectedAnchors.length} protected anchor(s), ${adaptive.topology.recoveryDayCount} recovery-preserved day(s).`,
  };
}
