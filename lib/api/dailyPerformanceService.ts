import { supabase } from '../supabase';
import {
  DAILY_ENGINE_VERSION,
  calculateCampRisk,
  calculateWeightTrend,
  deriveReadinessProfile,
  deriveStimulusConstraintSet,
  generateWorkoutV2,
  getHydrationProtocol,
  type ACWRResult,
  type DailyAthleteSummary,
  type DecisionTraceItem,
  type MacrocycleContext,
  type MissionRiskLevel,
  type MEDStatus,
  type PerformanceObjective,
  type Phase,
  type ReadinessProfile,
  type ReadinessState,
  type NutritionFuelingTarget,
  type ScheduledActivityRow,
  type StimulusConstraintSet,
  type DailyEngineState,
  type WeeklyAthleteSummaryPlan,
  type WeeklyPlanEntryRow,
} from '../engine/index.ts';
import { calculateACWR } from '../engine/calculateACWR';
import { determineCampPhase, toCampEnginePhase } from '../engine/calculateCamp';
import { getAthleteContext, normalizeNutritionGoal } from './athleteContextService';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getDefaultGymProfile } from './gymProfileService';
import { getExerciseHistoryBatch, getRecentExerciseIds, getExerciseLibrary, getRecentMuscleVolume } from './scService';
import { getScheduledActivities } from './scheduleService';
import { getEffectiveWeight, getWeightHistory } from './weightService';
import { isActiveGuidedEnginePlanEntry } from '../engine/sessionOwnership';
import { adaptPrescriptionToDailyReadiness } from '../engine/readiness/dailyCheck.ts';
import { resolveWeeklyAthleteSummaryWithDependencies } from './weeklyAthleteSummaryResolver';
import type { WorkoutPrescriptionV2 } from '../engine/types';
import {
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createPhaseState,
  createTrackingEntry,
  createUnknownBodyMassState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  type AdaptiveSessionKind,
  type AthleticorePhase,
  type BodyMassState,
  type ComposedSession,
  type Explanation,
  type NutritionTarget,
  type ProtectedAnchorInput,
  type RiskFlag,
  type SessionFuelingDirective,
  type UnifiedPerformanceEngineResult,
} from '../performance-engine/index.ts';

interface DailyPerformanceOptions {
  forceRefresh?: boolean;
}

const dailyEngineStateCache = new Map<string, DailyEngineState>();
const dailyEngineStateInFlight = new Map<string, Promise<DailyEngineState>>();
const weeklyAthleteSummaryCache = new Map<string, WeeklyAthleteSummaryPlan>();
const weeklyAthleteSummaryInFlight = new Map<string, Promise<WeeklyAthleteSummaryPlan>>();
let hasDailyPerformanceCheckColumns: boolean | null = null;

const DAILY_CHECKIN_LEGACY_SELECT = 'date, sleep_quality, readiness, stress_level, soreness_level, confidence_level';
const DAILY_CHECKIN_PERFORMANCE_SELECT = `${DAILY_CHECKIN_LEGACY_SELECT}, energy_level, pain_level`;
const DAILY_PERFORMANCE_CHECK_COLUMNS = [
  'energy_level',
  'pain_level',
  'readiness_score',
  'checkin_version',
] as const;

function isMissingDailyPerformanceCheckColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  const message = typeof maybe.message === 'string' ? maybe.message : '';
  return (maybe.code === 'PGRST204' || maybe.code === '42703')
    && DAILY_PERFORMANCE_CHECK_COLUMNS.some((column) => message.includes(column));
}

function getDailyEngineStateCacheKey(userId: string, date: string): string {
  return `${userId}::${date}`;
}

function getWeeklyAthleteSummaryCacheKey(userId: string, weekStart: string): string {
  return `${userId}::${weekStart}`;
}

function clearUserScopedKeys<T>(store: Map<string, T>, userId: string) {
  const prefix = `${userId}::`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateEngineDataCache(input: {
  userId: string;
  date?: string;
  weekStart?: string;
}) {
  const { userId, date, weekStart } = input;

  if (date) {
    const dailyKey = getDailyEngineStateCacheKey(userId, date);
    dailyEngineStateCache.delete(dailyKey);
    dailyEngineStateInFlight.delete(dailyKey);
  } else {
    clearUserScopedKeys(dailyEngineStateCache, userId);
    clearUserScopedKeys(dailyEngineStateInFlight, userId);
  }

  if (weekStart) {
    const weeklyKey = getWeeklyAthleteSummaryCacheKey(userId, weekStart);
    weeklyAthleteSummaryCache.delete(weeklyKey);
    weeklyAthleteSummaryInFlight.delete(weeklyKey);
    return;
  }

  clearUserScopedKeys(weeklyAthleteSummaryCache, userId);
  clearUserScopedKeys(weeklyAthleteSummaryInFlight, userId);
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function addDays(date: string, delta: number): string {
  const target = new Date(`${date}T00:00:00`);
  target.setDate(target.getDate() + delta);
  return target.toISOString().slice(0, 10);
}

function getWeekWindow(date: string): { weekStart: string; weekEnd: string } {
  const target = new Date(`${date}T00:00:00`);
  const day = target.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + mondayOffset);
  const weekStart = target.toISOString().slice(0, 10);
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
  };
}

function mapLegacyPhaseToUnifiedPhase(phase: Phase): AthleticorePhase {
  switch (phase) {
    case 'fight-camp':
    case 'camp-base':
    case 'camp-build':
    case 'camp-peak':
      return 'camp';
    case 'camp-taper':
      return 'competition_week';
    case 'pre-camp':
      return 'weight_class_management';
    case 'off-season':
    default:
      return 'build';
  }
}

function trainingBackgroundFromFitnessLevel(value: string) {
  if (value === 'beginner') return 'recreational' as const;
  if (value === 'advanced') return 'competitive' as const;
  if (value === 'elite') return 'professional' as const;
  return 'competitive' as const;
}

function kindForScheduledActivity(activity: ScheduledActivityRow): AdaptiveSessionKind {
  const sessionKind = (activity.session_kind ?? '').toLowerCase();
  if (sessionKind.includes('competition') || sessionKind.includes('tournament') || sessionKind.includes('fight')) return 'competition';
  if (sessionKind.includes('spar')) return 'sparring';
  if (sessionKind.includes('mobility')) return 'mobility';
  if (sessionKind.includes('prehab')) return 'prehab';
  if (sessionKind.includes('breath')) return 'breathwork';
  if (sessionKind.includes('core')) return 'core';
  if (sessionKind.includes('speed')) return 'speed';
  if (sessionKind.includes('power')) return 'power';
  if (sessionKind.includes('threshold')) return 'threshold';
  if (sessionKind.includes('interval')) return 'hard_intervals';
  if (sessionKind.includes('zone2') || sessionKind.includes('zone_2')) return 'zone2';

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
    default:
      return activity.expected_intensity >= 7 ? 'conditioning' : 'recovery';
  }
}

function protectedAnchorsFromScheduledActivities(activities: ScheduledActivityRow[]): ProtectedAnchorInput[] {
  return activities
    .filter((activity) => activity.status !== 'skipped')
    .filter((activity) => (
      activity.athlete_locked === true
      || activity.constraint_tier === 'mandatory'
      || activity.activity_type === 'sparring'
      || activity.activity_type === 'boxing_practice'
    ))
    .map((activity) => ({
      id: activity.id,
      label: activity.custom_label ?? String(activity.activity_type).replace(/_/g, ' '),
      kind: kindForScheduledActivity(activity),
      dayOfWeek: new Date(`${activity.date}T00:00:00Z`).getUTCDay(),
      date: activity.date,
      startTime: activity.start_time ?? null,
      durationMinutes: activity.estimated_duration_min,
      intensityRpe: activity.intended_intensity ?? activity.expected_intensity,
      source: activity.athlete_locked ? 'user_locked' : activity.activity_type === 'sparring' || activity.activity_type === 'boxing_practice' ? 'protected_anchor' : 'manual',
      canMerge: false,
      reason: 'Scheduled athlete commitment loaded as a protected anchor for unified performance planning.',
    }));
}

function buildDailyBodyMassState(input: {
  currentWeightLbs: number | null;
  date: string;
}): BodyMassState {
  const confidence = confidenceFromLevel(input.currentWeightLbs != null ? 'medium' : 'unknown', [
    input.currentWeightLbs != null ? 'Current body mass came from athlete context.' : 'Current body mass is missing.',
  ]);
  const current = input.currentWeightLbs != null
    ? normalizeBodyMass({
      value: input.currentWeightLbs,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: input.date,
      confidence,
    })
    : null;

  return {
    ...createUnknownBodyMassState('lb'),
    current,
    missingFields: current ? [] : [{ field: 'current_body_mass', reason: 'not_collected' }],
    confidence,
  };
}

interface DailyReadinessCheckinRow {
  date: string;
  sleep_quality?: number | null;
  readiness?: number | null;
  energy_level?: number | null;
  stress_level?: number | null;
  soreness_level?: number | null;
  pain_level?: number | null;
  confidence_level?: number | null;
}

function buildUnifiedTrackingEntries(input: {
  userId: string;
  date: string;
  readinessProfile: ReadinessProfile;
  currentWeightLbs: number | null;
  todayCheckin?: DailyReadinessCheckinRow | null;
}) {
  const checkinConfidence = confidenceFromLevel('medium', [
    'Daily check-in was entered by the athlete and projected into canonical tracking state.',
  ]);
  const entries: ReturnType<typeof createTrackingEntry>[] = [];
  const todayCheckin = input.todayCheckin;

  if (todayCheckin) {
    const makeCheckinEntry = (
      suffix: string,
      type: Parameters<typeof createTrackingEntry>[0]['type'],
      value: number | boolean | string | null | undefined,
      unit: string | null = 'score_1_5',
    ) => {
      if (value == null) return;
      entries.push(createTrackingEntry({
        id: `${input.userId}:${input.date}:${suffix}`,
        athleteId: input.userId,
        timestamp: `${input.date}T08:00:00.000Z`,
        timezone: 'UTC',
        type,
        source: 'user_reported',
        value,
        unit,
        confidence: checkinConfidence,
        context: { source: 'daily_checkin' },
      }));
    };

    makeCheckinEntry('readiness-checkin', 'readiness', todayCheckin.readiness ?? todayCheckin.energy_level);
    makeCheckinEntry('sleep-quality', 'sleep_quality', todayCheckin.sleep_quality);
    makeCheckinEntry('stress', 'stress', todayCheckin.stress_level);
    makeCheckinEntry('soreness', 'soreness', todayCheckin.soreness_level);
    makeCheckinEntry(
      'fatigue',
      'fatigue',
      todayCheckin.energy_level == null ? null : Math.max(1, Math.min(5, 6 - todayCheckin.energy_level)),
    );
    makeCheckinEntry('pain', 'pain', todayCheckin.pain_level);
    makeCheckinEntry('training-confidence', 'mood', todayCheckin.confidence_level);
  } else {
    entries.push(createTrackingEntry({
      id: `${input.userId}:${input.date}:legacy-readiness-profile`,
      athleteId: input.userId,
      timestamp: `${input.date}T08:00:00.000Z`,
      timezone: 'UTC',
      type: 'readiness',
      source: 'system_inferred',
      value: input.readinessProfile.overallReadiness,
      unit: 'percent',
      confidence: confidenceFromLevel(input.readinessProfile.dataConfidence, [
        'Daily readiness profile was projected into canonical tracking state during performance engine integration.',
      ]),
      context: {
        sourceReadinessState: input.readinessProfile.readinessState,
        flags: input.readinessProfile.flags,
      },
    }));
  }

  if (input.currentWeightLbs != null) {
    entries.push(createTrackingEntry({
      id: `${input.userId}:${input.date}:body-mass`,
      athleteId: input.userId,
      timestamp: `${input.date}T07:00:00.000Z`,
      timezone: 'UTC',
      type: 'body_mass',
      source: 'system_inferred',
      value: input.currentWeightLbs,
      unit: 'lb',
      confidence: confidenceFromLevel('medium', [
        'Body mass came from current athlete context and remains source-qualified.',
      ]),
    }));
  }

  return entries;
}

function resolveUnifiedDailyPerformance(input: {
  userId: string;
  date: string;
  athleteContext: Awaited<ReturnType<typeof getAthleteContext>>;
  objectiveContext: MacrocycleContext;
  readinessProfile: ReadinessProfile;
  todayCheckin?: DailyReadinessCheckinRow | null;
  scheduledActivities: ScheduledActivityRow[];
  currentWeight: number | null;
  targetWeight: number | null;
  weekStart: string;
}): UnifiedPerformanceEngineResult | null {
  const profile = input.athleteContext.profile;
  if (!profile) return null;
  const canonicalCurrentWeight = input.objectiveContext.currentWeightLbs ?? input.currentWeight ?? null;

  const phase = createPhaseState({
    current: mapLegacyPhaseToUnifiedPhase(input.objectiveContext.phase),
    activeSince: input.date,
    plannedUntil: input.objectiveContext.camp?.fightDate ?? profile.fight_date ?? null,
    transitionReason: input.objectiveContext.goalMode === 'fight_camp' ? 'fight_confirmed' : 'build_phase_started',
  });
  const athlete = createAthleteProfile({
    athleteId: input.userId,
    userId: input.userId,
    sport: 'boxing',
    competitionLevel: profile.fight_status === 'pro' ? 'professional' : 'amateur',
    biologicalSex: profile.biological_sex ?? undefined,
    ageYears: profile.age ?? null,
    preferredBodyMassUnit: 'lb',
    trainingBackground: trainingBackgroundFromFitnessLevel(input.athleteContext.fitnessLevel),
  });
  const bodyMass = buildDailyBodyMassState({
    currentWeightLbs: canonicalCurrentWeight,
    date: input.date,
  });
  const journey = createAthleteJourneyState({
    journeyId: `${input.userId}:journey`,
    athlete,
    timelineStartDate: input.date,
    phase,
    bodyMassState: bodyMass,
    nutritionPreferences: {
      goal: normalizeNutritionGoal(profile.nutrition_goal),
      dietaryNotes: [],
      supplementNotes: [],
    },
    trackingPreferences: {
      bodyMass: true,
      readiness: true,
      nutrition: true,
      cycle: Boolean(profile.cycle_tracking),
    },
    confidence: confidenceFromLevel('low', [
      'Daily app flow was projected into AthleteJourneyState during Phase 9 integration.',
    ]),
  });
  const targetClassMass = input.objectiveContext.targetWeightLbs != null
    ? normalizeBodyMass({
      value: input.objectiveContext.targetWeightLbs ?? input.targetWeight,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: input.objectiveContext.camp?.fightDate ?? profile.fight_date ?? null,
      confidence: confidenceFromLevel('medium'),
    })
    : null;
  const hasWeightClassContext = input.objectiveContext.goalMode === 'fight_camp'
    || input.objectiveContext.weightClassState !== 'none'
    || profile.active_weight_class_plan_id != null;

  return runUnifiedPerformanceEngine({
    athlete,
    journey,
    asOfDate: input.date,
    weekStartDate: input.weekStart,
    generatedAt: new Date().toISOString(),
    phase,
    bodyMassState: bodyMass,
    trackingEntries: buildUnifiedTrackingEntries({
      userId: input.userId,
      date: input.date,
      readinessProfile: input.readinessProfile,
      currentWeightLbs: canonicalCurrentWeight,
      todayCheckin: input.todayCheckin,
    }),
    protectedAnchors: protectedAnchorsFromScheduledActivities(input.scheduledActivities),
    acuteChronicWorkloadRatio: null,
    weightClass: hasWeightClassContext
      ? {
        competitionId: input.objectiveContext.camp?.id ?? profile.active_weight_class_plan_id ?? null,
        competitionDate: input.objectiveContext.camp?.fightDate ?? profile.fight_date ?? null,
        weighInDateTime: null,
        competitionDateTime: input.objectiveContext.camp?.fightDate
          ? `${input.objectiveContext.camp.fightDate}T00:00:00.000Z`
          : profile.fight_date
            ? `${profile.fight_date}T00:00:00.000Z`
            : null,
        targetClassMass,
        desiredScaleWeight: targetClassMass,
      }
      : null,
  });
}

function rangeTarget(range: { target?: number | null; min?: number | null; max?: number | null } | null | undefined): number | null {
  const value = range?.target ?? range?.min ?? range?.max ?? null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundedTarget(range: { target?: number | null; min?: number | null; max?: number | null } | null | undefined, fallback = 0): number {
  return Math.round(rangeTarget(range) ?? fallback);
}

function primaryUnifiedSession(result: UnifiedPerformanceEngineResult | null): ComposedSession | null {
  if (!result) return null;
  return result.canonicalOutputs.composedSessions.find((session) => session.date === result.performanceState.asOfDate)
    ?? result.canonicalOutputs.composedSessions[0]
    ?? null;
}

function workoutTypeFromSession(session: ComposedSession | null): DailyAthleteSummary['trainingDirective']['workoutType'] {
  switch (session?.family) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
      return 'practice';
    case 'strength':
      return 'strength';
    case 'conditioning':
    case 'roadwork':
      return 'conditioning';
    case 'recovery':
    case 'rest':
      return 'recovery';
    default:
      return null;
  }
}

function workoutFocusFromSession(session: ComposedSession | null): DailyAthleteSummary['trainingDirective']['focus'] {
  switch (session?.family) {
    case 'sparring':
    case 'boxing_skill':
      return 'sport_specific';
    case 'strength':
      return 'strength';
    case 'conditioning':
    case 'roadwork':
      return 'conditioning';
    case 'recovery':
    case 'rest':
      return 'recovery';
    default:
      return null;
  }
}

function sessionRoleFromUnified(result: UnifiedPerformanceEngineResult | null, session: ComposedSession | null): DailyAthleteSummary['trainingDirective']['sessionRole'] {
  if (!result) return 'recover';
  if (result.finalPlanStatus === 'blocked') return 'recover';
  if (result.canonicalOutputs.readiness.recommendedTrainingAdjustment.replaceWithMobility) return 'recover';
  if (session?.family === 'rest') return 'rest';
  if (session?.family === 'recovery') return 'recover';
  if (session?.family === 'sparring' || session?.family === 'boxing_skill') return 'spar_support';
  if (result.performanceState.phase.current === 'competition_week' || result.performanceState.phase.current === 'taper') return 'taper_sharpen';
  return result.finalPlanStatus === 'ready' ? 'develop' : 'express';
}

function riskLevelFromUnified(result: UnifiedPerformanceEngineResult | null): MissionRiskLevel {
  if (!result) return 'moderate';
  if (result.blockingRiskFlags.some((flag) => flag.severity === 'critical')) return 'critical';
  if (result.riskFlags.some((flag) => flag.severity === 'critical')) return 'critical';
  if (result.riskFlags.some((flag) => flag.severity === 'high')) return 'high';
  if (result.riskFlags.some((flag) => flag.severity === 'moderate')) return 'moderate';
  return 'low';
}

function nutritionSafetyWarningFromRisks(flags: RiskFlag[]): NutritionFuelingTarget['safetyWarning'] {
  if (flags.some((flag) => flag.code === 'under_fueling_risk' && flag.severity === 'critical')) return 'critical_energy_availability';
  if (flags.some((flag) => flag.code === 'under_fueling_risk')) return 'low_energy_availability';
  return 'none';
}

function priorityFromSession(session: ComposedSession | null): NutritionFuelingTarget['prioritySession'] {
  switch (session?.family) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
      return 'boxing_practice';
    case 'strength':
      return 'heavy_sc';
    case 'conditioning':
    case 'roadwork':
      return 'conditioning';
    default:
      return 'recovery';
  }
}

function fuelStateFromUnified(target: NutritionTarget, session: ComposedSession | null): NutritionFuelingTarget['fuelState'] {
  if (target.phase === 'competition_week' || target.phase === 'taper') return 'taper';
  if (session?.family === 'sparring' || session?.family === 'boxing_skill') return 'spar_support';
  if (session?.family === 'strength') return 'strength_power';
  if (session?.family === 'recovery' || session?.family === 'rest') return 'active_recovery';
  if (!session) return 'rest';
  return 'aerobic';
}

function fuelingWindowFromDirective(
  directive: SessionFuelingDirective | null,
  timing: 'pre' | 'intra' | 'post',
) {
  return directive?.windows?.find((window) => window.timing === timing) ?? null;
}

function sessionFuelingPlanFromUnified(input: {
  directive: SessionFuelingDirective | null;
  session: ComposedSession | null;
  priority: NutritionFuelingTarget['prioritySession'];
}): NutritionFuelingTarget['sessionFuelingPlan'] {
  const pre = fuelingWindowFromDirective(input.directive, 'pre');
  const intra = fuelingWindowFromDirective(input.directive, 'intra');
  const post = fuelingWindowFromDirective(input.directive, 'post');
  const sessionLabel = input.session?.title ?? input.directive?.sessionType ?? 'Training support';

  return {
    priority: input.priority,
    priorityLabel: input.priority.replace(/_/g, ' '),
    sessionLabel,
    preSession: {
      label: 'Before training',
      timing: pre ? 'Before session' : 'Use normal meal timing',
      carbsG: roundedTarget(pre?.carbGrams),
      proteinG: roundedTarget(pre?.proteinGrams),
      notes: pre?.notes ?? input.directive?.preSessionGuidance ?? [],
      lowResidue: input.directive?.gutComfortConcern === 'moderate' || input.directive?.gutComfortConcern === 'high',
    },
    intraSession: {
      fluidsOz: roundedTarget(intra?.fluidOunces ?? input.directive?.hydrationDemand, 0),
      electrolytesMg: roundedTarget(intra?.sodiumMg, 0) || null,
      carbsG: roundedTarget(intra?.carbGrams),
      notes: intra?.notes ?? input.directive?.duringSessionGuidance ?? [],
    },
    betweenSessions: null,
    postSession: {
      label: 'After training',
      timing: post ? 'After session' : 'Use normal meals',
      carbsG: roundedTarget(post?.carbGrams),
      proteinG: roundedTarget(post?.proteinGrams ?? input.directive?.proteinRecoveryDemand, 25),
      notes: post?.notes ?? input.directive?.postSessionGuidance ?? [],
    },
    hydrationNotes: input.directive?.duringSessionGuidance ?? [],
    coachingNotes: [
      input.directive?.explanation?.summary ?? 'Session fueling came from the Nutrition and Fueling Engine.',
    ],
  };
}

function nutritionFuelingTargetFromUnified(input: {
  result: UnifiedPerformanceEngineResult | null;
  hydration: ReturnType<typeof getHydrationProtocol>;
  date: string;
}): NutritionFuelingTarget {
  const target = input.result?.canonicalOutputs.nutritionTarget ?? null;
  const session = primaryUnifiedSession(input.result);
  const directive = target?.sessionFuelingDirectives[0] ?? input.result?.canonicalOutputs.sessionFuelingDirectives[0] ?? null;
  const priority = priorityFromSession(session);
  const calories = roundedTarget(target?.energyTargetRange ?? target?.energyTarget);
  const protein = roundedTarget(target?.proteinTargetRange ?? target?.proteinTarget);
  const carbs = roundedTarget(target?.carbohydrateTargetRange ?? target?.carbohydrateTarget);
  const fat = roundedTarget(target?.fatTargetRange ?? target?.fatTarget);
  const hydrationOz = roundedTarget(target?.hydrationTarget, input.hydration.dailyWaterOz ?? 96);
  const sodiumTarget = roundedTarget(target?.sodiumElectrolyteGuidance?.sodiumTargetRange, 0) || null;
  const reasons = [
    target?.explanation?.summary ?? 'Nutrition target resolved from the Unified Performance Engine.',
    ...(target?.explanation?.reasons ?? []),
  ].filter(Boolean);

  return {
    engineVersion: 'nutrition_fueling_engine_v1',
    canonicalPhase: target?.phase ?? input.result?.performanceState.phase.current,
    tdee: calories,
    adjustedCalories: calories,
    protein,
    carbs,
    fat,
    proteinModifier: 1,
    phaseMultiplier: 0,
    weightCorrectionDeficit: 0,
    message: reasons.join(' '),
    source: input.result ? 'daily_activity_adjusted' : 'base',
    fuelState: target ? fuelStateFromUnified(target, session) : 'rest',
    prioritySession: priority,
    deficitClass: target?.purpose === 'body_composition_support' || target?.purpose === 'weight_class_management_support' ? 'steady_deficit' : 'steady_maintain',
    recoveryNutritionFocus: target?.recoveryDirectives[0]?.focus === 'tissue_repair'
      ? 'impact_recovery'
      : target?.recoveryDirectives[0]?.focus ?? 'none',
    sessionDemandScore: Math.max(0, Math.min(95, Math.round(((session?.durationMinutes.target ?? 0) * (session?.intensityRpe.target ?? 0)) / 6))),
    hydrationBoostOz: Math.max(0, hydrationOz - 80),
    hydrationPlan: {
      dailyTargetOz: hydrationOz,
      sodiumTargetMg: sodiumTarget,
      emphasis: priority === 'recovery' ? 'baseline' : 'performance',
      notes: [
        ...(target?.sodiumElectrolyteGuidance?.electrolyteNotes ?? []),
        input.hydration.message,
      ],
    },
    sessionFuelingPlan: sessionFuelingPlanFromUnified({ directive, session, priority }),
    reasonLines: reasons,
    energyAvailability: null,
    fuelingFloorTriggered: Boolean(target?.riskFlags.some((flag) => flag.code === 'under_fueling_risk')),
    deficitBankDelta: 0,
    safetyWarning: nutritionSafetyWarningFromRisks(target?.riskFlags ?? []),
    safetyEvents: [],
    traceLines: input.result?.explanations.map((explanation) => explanation.summary) ?? reasons,
  };
}

function decisionTraceFromExplanations(explanations: Explanation[]): DecisionTraceItem[] {
  return explanations.slice(0, 8).map((explanation) => ({
    subsystem: explanation.kind === 'risk'
      ? 'risk'
      : explanation.summary.toLowerCase().includes('nutrition') || explanation.summary.toLowerCase().includes('fuel')
        ? 'fuel'
        : explanation.summary.toLowerCase().includes('readiness') || explanation.summary.toLowerCase().includes('recovery')
          ? 'recovery'
          : 'training',
    title: explanation.summary,
    detail: explanation.reasons.join(' '),
    humanInterpretation: explanation.reasons[0] ?? null,
    impact: explanation.impact === 'unknown' ? 'adjusted' : explanation.impact,
  }));
}

function buildDailyAthleteSummaryFromUnified(input: {
  date: string;
  objectiveContext: MacrocycleContext;
  readinessProfile: ReadinessProfile;
  constraintSet: StimulusConstraintSet;
  medStatus: MEDStatus | null;
  hydration: ReturnType<typeof getHydrationProtocol>;
  workoutPrescription: WorkoutPrescriptionV2 | null;
  unifiedPerformance: UnifiedPerformanceEngineResult | null;
}): { summary: DailyAthleteSummary; nutritionTarget: NutritionFuelingTarget } {
  const session = primaryUnifiedSession(input.unifiedPerformance);
  const nutritionTarget = nutritionFuelingTargetFromUnified({
    result: input.unifiedPerformance,
    hydration: input.hydration,
    date: input.date,
  });
  const riskLevel = riskLevelFromUnified(input.unifiedPerformance);
  const explanations = input.unifiedPerformance?.explanations ?? [];
  const trainingReason = session?.explanation?.summary
    ?? input.unifiedPerformance?.canonicalOutputs.trainingBlock.explanation?.summary
    ?? 'Training was resolved from the Unified Performance Engine.';
  const readinessAdjustment = input.unifiedPerformance?.canonicalOutputs.readiness.recommendedTrainingAdjustment;
  const sessionRole = sessionRoleFromUnified(input.unifiedPerformance, session);

  return {
    nutritionTarget,
    summary: {
      date: input.date,
      engineVersion: input.unifiedPerformance?.engineVersion ?? DAILY_ENGINE_VERSION,
      generatedAt: input.unifiedPerformance?.performanceState.generatedAt ?? new Date().toISOString(),
      headline: input.unifiedPerformance?.finalPlanStatus === 'blocked'
        ? 'Plan blocked for safety'
        : input.unifiedPerformance?.canonicalOutputs.trainingBlock.goal
          ? `${input.unifiedPerformance.canonicalOutputs.trainingBlock.goal.replace(/_/g, ' ')} focus`
          : 'Daily athlete summary',
      summary: input.unifiedPerformance?.explanations[0]?.summary
        ?? 'Daily athlete summary was projected from unified performance state.',
      objective: input.objectiveContext.performanceObjective,
      macrocycleContext: input.objectiveContext,
      readinessProfile: input.readinessProfile,
      trainingDirective: {
        sessionRole,
        interventionState: input.unifiedPerformance?.finalPlanStatus === 'blocked' ? 'hard' : input.unifiedPerformance?.finalPlanStatus === 'caution' ? 'soft' : 'none',
        isMandatoryRecovery: sessionRole === 'recover' || Boolean(readinessAdjustment?.replaceWithMobility),
        focus: workoutFocusFromSession(session),
        workoutType: workoutTypeFromSession(session),
        intent: session?.title ?? input.unifiedPerformance?.canonicalOutputs.trainingBlock.explanation?.summary ?? 'Follow the unified performance plan.',
        reason: trainingReason,
        intensityCap: input.unifiedPerformance?.finalPlanStatus === 'blocked' ? 2 : null,
        durationMin: rangeTarget(session?.durationMinutes),
        volumeTarget: input.unifiedPerformance
          ? `${input.unifiedPerformance.canonicalOutputs.composedSessions.length} composed session${input.unifiedPerformance.canonicalOutputs.composedSessions.length === 1 ? '' : 's'}`
          : 'Unified performance state pending',
        keyQualities: session?.tissueLoads?.length ? session.tissueLoads : [session?.family ?? 'recovery'],
        constraintSet: input.constraintSet,
        medStatus: input.medStatus,
        source: 'daily_engine',
        prescription: input.workoutPrescription,
      },
      fuelDirective: {
        state: nutritionTarget.fuelState,
        prioritySession: nutritionTarget.prioritySession,
        deficitClass: nutritionTarget.deficitClass,
        recoveryNutritionFocus: nutritionTarget.recoveryNutritionFocus,
        sessionDemandScore: nutritionTarget.sessionDemandScore,
        calories: nutritionTarget.adjustedCalories,
        protein: nutritionTarget.protein,
        carbs: nutritionTarget.carbs,
        fat: nutritionTarget.fat,
        preSessionCarbsG: nutritionTarget.sessionFuelingPlan.preSession.carbsG,
        intraSessionCarbsG: nutritionTarget.sessionFuelingPlan.intraSession.carbsG,
        postSessionProteinG: nutritionTarget.sessionFuelingPlan.postSession.proteinG,
        intraSessionHydrationOz: nutritionTarget.sessionFuelingPlan.intraSession.fluidsOz,
        hydrationBoostOz: nutritionTarget.hydrationBoostOz,
        sodiumTargetMg: nutritionTarget.hydrationPlan.sodiumTargetMg,
        compliancePriority: nutritionTarget.prioritySession === 'recovery' ? 'recovery' : input.objectiveContext.weightClassState === 'driving' ? 'weight' : 'performance',
        adjustmentFlag: null,
        source: 'daily_engine',
        message: nutritionTarget.message,
        reasons: nutritionTarget.reasonLines,
        sessionFuelingPlan: nutritionTarget.sessionFuelingPlan,
        energyAvailability: nutritionTarget.energyAvailability,
        fuelingFloorTriggered: nutritionTarget.fuelingFloorTriggered,
        safetyWarning: nutritionTarget.safetyWarning,
      },
      hydrationDirective: {
        waterTargetOz: nutritionTarget.hydrationPlan.dailyTargetOz,
        sodiumTargetMg: nutritionTarget.hydrationPlan.sodiumTargetMg,
        protocol: 'Steady hydration support from the Nutrition and Fueling Engine.',
        message: nutritionTarget.hydrationPlan.notes[0] ?? input.hydration.message,
      },
      recoveryDirective: {
        emphasis: input.unifiedPerformance?.canonicalOutputs.readiness.recommendedTrainingAdjustment.type.replace(/_/g, ' ') ?? 'normal recovery',
        sleepTargetHours: 8,
        modalities: readinessAdjustment?.replaceWithMobility ? ['mobility', 'easy breathing'] : ['normal cooldown'],
        restrictions: input.unifiedPerformance?.blockingRiskFlags.map((flag) => flag.message) ?? [],
      },
      riskState: {
        level: riskLevel,
        score: input.unifiedPerformance ? Math.min(100, input.unifiedPerformance.riskFlags.length * 20 + input.unifiedPerformance.blockingRiskFlags.length * 30) : 35,
        label: riskLevel,
        drivers: input.unifiedPerformance?.riskFlags.map((flag) => flag.message) ?? ['Unified performance state is unavailable.'],
        flags: input.readinessProfile.flags,
        anchorSummary: input.unifiedPerformance?.canonicalOutputs.composedSessions.some((item) => item.protectedAnchor)
          ? 'Protected workouts remain fixed anchors.'
          : null,
      },
      decisionTrace: decisionTraceFromExplanations(explanations),
      overrideState: {
        status: input.unifiedPerformance?.finalPlanStatus === 'blocked' ? 'override_available' : 'following_plan',
        note: input.unifiedPerformance?.finalPlanStatus === 'blocked'
          ? 'A blocking risk requires review before progressing.'
          : 'Daily summary follows the Unified Performance Engine output.',
      },
    },
  };
}

function buildPerformanceObjective(input: {
  goalMode: MacrocycleContext['goalMode'];
  performanceGoalType: MacrocycleContext['performanceGoalType'];
  buildGoal: MacrocycleContext['buildGoal'];
  phase: Phase;
  camp: MacrocycleContext['camp'];
  weightClassState: MacrocycleContext['weightClassState'];
  targetWeightLbs: number | null;
}): PerformanceObjective {
  const { goalMode, performanceGoalType, buildGoal, phase, camp, weightClassState, targetWeightLbs } = input;

  if (goalMode === 'fight_camp') {
    const primaryOutcome = weightClassState === 'driving'
      ? 'Arrive sharp and on weight for the fight'
      : 'Peak performance for the target fight';

    return {
      mode: 'fight_camp',
      goalType: performanceGoalType,
      primaryOutcome,
      secondaryConstraint: weightClassState === 'driving' ? 'weight_trajectory' : 'protect_recovery',
      goalLabel: camp ? `Fight camp ending ${camp.fightDate}` : 'Fight camp',
      targetMetric: targetWeightLbs != null ? 'body_weight_lbs' : 'fight_readiness',
      targetValue: targetWeightLbs,
      targetUnit: targetWeightLbs != null ? 'lbs' : null,
      deadline: camp?.fightDate ?? null,
      horizonWeeks: camp?.totalWeeks ?? null,
      successWindow: camp?.fightDate ?? null,
    };
  }

  return {
    mode: 'build_phase',
    goalType: buildGoal?.goal_type ?? performanceGoalType,
    primaryOutcome: buildGoal?.primary_outcome ?? buildGoal?.goal_statement ?? `Build ${phase.replace(/-/g, ' ')} capacity`,
    secondaryConstraint: buildGoal?.secondary_constraint ?? 'protect_recovery',
    goalLabel: buildGoal?.goal_label ?? null,
    targetMetric: buildGoal?.target_metric ?? 'training_consistency',
    targetValue: buildGoal?.target_value ?? null,
    targetUnit: buildGoal?.target_unit ?? null,
    deadline: buildGoal?.target_date ?? null,
    horizonWeeks: buildGoal?.target_horizon_weeks ?? null,
    successWindow: buildGoal?.success_window ?? null,
  };
}

export async function resolveObjectiveContext(userId: string, date: string): Promise<MacrocycleContext> {
  const [athleteContext, buildGoal, camp] = await Promise.all([
    getAthleteContext(userId),
    getActiveBuildPhaseGoal(userId),
    getActiveFightCamp(userId),
  ]);

  const profile = athleteContext.profile;
  const effectiveWeight = profile?.base_weight != null
    ? await getEffectiveWeight(userId, profile.base_weight)
    : null;
  const weightHistory = await getWeightHistory(userId, 30);

  const campPhase = camp ? determineCampPhase(camp, date) : null;
  const phase = campPhase ? toCampEnginePhase(campPhase) : athleteContext.phase;
  const targetWeightLbs = camp?.targetWeight ?? profile?.target_weight ?? null;

  const weightTrend = profile && effectiveWeight != null
    ? calculateWeightTrend({
      weightHistory,
      targetWeightLbs,
      baseWeightLbs: profile.base_weight ?? effectiveWeight,
      phase,
      deadlineDate: camp?.fightDate ?? profile.fight_date ?? null,
    })
    : null;

  const weightClassState = camp?.weightClassState
    ?? (athleteContext.hasActiveWeightClassPlan ? 'driving' : 'none');
  const daysOut = camp?.fightDate ? Math.max(0, daysBetween(date, camp.fightDate)) : null;
  const isTravelWindow = Boolean(
    camp?.travelStartDate
    && camp.travelStartDate <= date
    && (!camp.travelEndDate || date <= camp.travelEndDate),
  );

  const performanceObjective = buildPerformanceObjective({
    goalMode: athleteContext.goalMode,
    performanceGoalType: athleteContext.performanceGoalType,
    buildGoal,
    phase,
    camp,
    weightClassState,
    targetWeightLbs,
  });

  return {
    date,
    phase,
    goalMode: athleteContext.goalMode,
    performanceGoalType: athleteContext.performanceGoalType,
    performanceObjective,
    buildGoal,
    camp,
    campPhase,
    weightClassState,
    hasActiveWeightClassPlan: athleteContext.hasActiveWeightClassPlan,
    weighInTiming: camp?.weighInTiming ?? null,
    daysOut,
    isTravelWindow,
    currentWeightLbs: weightTrend?.currentWeight ?? effectiveWeight,
    targetWeightLbs,
    remainingWeightLbs: weightTrend?.remainingLbs ?? (effectiveWeight != null && targetWeightLbs != null ? Math.max(0, effectiveWeight - targetWeightLbs) : null),
    weightTrend,
  };
}

async function getPlanEntriesForDate(userId: string, date: string): Promise<WeeklyPlanEntryRow[]> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('slot');

  if (error) throw error;
  return (data ?? []) as WeeklyPlanEntryRow[];
}

async function getPlanEntriesForRange(userId: string, startDate: string, endDate: string): Promise<WeeklyPlanEntryRow[]> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('slot');

  if (error) throw error;
  return (data ?? []) as WeeklyPlanEntryRow[];
}

function pickPrimaryPlanEntry(entries: WeeklyPlanEntryRow[]): WeeklyPlanEntryRow | null {
  if (entries.length === 0) return null;

  const slotRank: Record<WeeklyPlanEntryRow['slot'], number> = {
    single: 0,
    pm: 1,
    am: 2,
  };

  return [...entries].sort((a, b) => {
    const intensityDelta = (b.target_intensity ?? 0) - (a.target_intensity ?? 0);
    if (intensityDelta !== 0) return intensityDelta;

    const durationDelta = b.estimated_duration_min - a.estimated_duration_min;
    if (durationDelta !== 0) return durationDelta;

    return slotRank[a.slot] - slotRank[b.slot];
  })[0] ?? null;
}

function pickPrimaryEnginePlanEntry(entries: WeeklyPlanEntryRow[]): WeeklyPlanEntryRow | null {
  return entries.find((entry) => isActiveGuidedEnginePlanEntry(entry)) ?? null;
}

function pickPrimaryScheduledActivity(activities: ScheduledActivityRow[]): ScheduledActivityRow | null {
  const activeActivities = activities.filter((activity) => activity.status !== 'skipped');
  if (activeActivities.length === 0) return null;

  const activityRank = (activity: ScheduledActivityRow): number => {
    switch (activity.activity_type) {
      case 'sparring':
        return 0;
      case 'boxing_practice':
        return 1;
      case 'sc':
        return 2;
      case 'conditioning':
        return 3;
      case 'road_work':
      case 'running':
        return 4;
      default:
        return 5;
    }
  };

  return [...activeActivities].sort((a, b) => {
    const rankDelta = activityRank(a) - activityRank(b);
    if (rankDelta !== 0) return rankDelta;

    const intensityDelta = (b.expected_intensity ?? 0) - (a.expected_intensity ?? 0);
    if (intensityDelta !== 0) return intensityDelta;

    return (b.estimated_duration_min ?? 0) - (a.estimated_duration_min ?? 0);
  })[0] ?? null;
}

async function resolveACWR(
  userId: string,
  date: string,
  phase: Phase,
  fitnessLevel: string,
  hasActiveWeightClassPlan: boolean,
  cycleDay: number | null,
): Promise<ACWRResult> {
  return calculateACWR({
    userId,
    supabaseClient: supabase,
    asOfDate: date,
    fitnessLevel: fitnessLevel as any,
    phase,
    hasActiveWeightClassPlan,
    cycleDay,
  });
}

async function resolveReadinessProfile(input: {
  userId: string;
  date: string;
  acwr: ACWRResult;
  objectiveContext: MacrocycleContext;
  trainingIntensityCap?: number | null;
  cycleDay?: number | null;
}): Promise<{
  readinessProfile: ReadinessProfile;
  readinessState: ReadinessState;
  constraintSet: StimulusConstraintSet;
  todayCheckin: DailyReadinessCheckinRow | null;
}> {
  const { userId, date, acwr, objectiveContext, trainingIntensityCap = null, cycleDay = null } = input;
  const historyStart = addDays(date, -6);
  const recentActivityStart = addDays(date, -5);

  let checkinsResult: any = { data: [] };
  let recentActivities: any[] = [];
  let activationResult: any = { data: [] };
  const checkinSelect = hasDailyPerformanceCheckColumns === false
    ? DAILY_CHECKIN_LEGACY_SELECT
    : DAILY_CHECKIN_PERFORMANCE_SELECT;

  try {
    const [cRes, rAct, aRes] = await Promise.all([
      supabase
        .from('daily_checkins')
        .select(checkinSelect)
        .eq('user_id', userId)
        .gte('date', historyStart)
        .lte('date', date)
        .order('date'),
      getScheduledActivities(userId, recentActivityStart, date),
      supabase
        .from('workout_log')
        .select('date, activation_rpe')
        .eq('user_id', userId)
        .not('activation_rpe', 'is', null)
        .lte('date', date)
        .order('date', { ascending: false })
        .limit(1),
    ]);
    checkinsResult = cRes;
    recentActivities = rAct;
    activationResult = aRes;

    if (cRes.error) throw cRes.error;
    if (aRes.error) throw aRes.error;
    if (checkinSelect === DAILY_CHECKIN_PERFORMANCE_SELECT) {
      hasDailyPerformanceCheckColumns = true;
    }
  } catch (error) {
    if (isMissingDailyPerformanceCheckColumnError(error)) {
      hasDailyPerformanceCheckColumns = false;
    } else {
      console.error('Error resolving readiness data:', error);
    }
    // Fallback: If queries fail (e.g. missing columns), try a minimal checkin fetch
    try {
      const fallbackCheckins = await supabase
        .from('daily_checkins')
        .select(DAILY_CHECKIN_LEGACY_SELECT)
        .eq('user_id', userId)
        .gte('date', historyStart)
        .lte('date', date);
      checkinsResult = fallbackCheckins;
    } catch (fallbackError) {
      console.error('Readiness fallback failed:', fallbackError);
    }
  }

  const checkins = ((checkinsResult.data ?? []) as DailyReadinessCheckinRow[]);
  const todayCheckin = checkins.find((checkin) => checkin.date === date) ?? null;
  const readinessHistory = checkins
    .map((checkin) => checkin.readiness)
    .filter((value): value is number => typeof value === 'number');
  const recentSparringCount48h = recentActivities.filter((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped').length;
  const recentSparringDecayLoad5d = recentActivities
    .filter((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped')
    .reduce((sum, activity) => {
      const hoursAgo = Math.max(0, daysBetween(activity.date, date) * 24);
      return sum + (Math.exp(-hoursAgo / 72) * ((activity.expected_intensity ?? 0) / 10));
    }, 0);
  const recentHighImpactCount48h = recentActivities.filter((activity) =>
    (activity.activity_type === 'sparring' || activity.activity_type === 'boxing_practice')
    && activity.expected_intensity >= 7
    && activity.status !== 'skipped',
  ).length;
  const recentHeavyStrengthCount48h = recentActivities.filter((activity) =>
    activity.activity_type === 'sc'
    && activity.expected_intensity >= 7
    && activity.status !== 'skipped',
  ).length;
  const latestActivationRPE = (activationResult.data as Array<{ date: string; activation_rpe?: number | null }> | null)?.[0]?.activation_rpe ?? null;
  const profile = deriveReadinessProfile({
    sleepQuality: todayCheckin?.sleep_quality ?? null,
    subjectiveReadiness: todayCheckin?.readiness ?? null,
    energyLevel: todayCheckin?.energy_level ?? null,
    fuelHydrationStatus: null,
    painLevel: todayCheckin?.pain_level ?? null,
    confidenceLevel: todayCheckin?.confidence_level ?? null,
    stressLevel: todayCheckin?.stress_level ?? null,
    sorenessLevel: todayCheckin?.soreness_level ?? null,
    acwrRatio: acwr.ratio,
    loadMetrics: acwr.loadMetrics,
    externalHeartRateLoad: null,
    activationRPE: latestActivationRPE,
    expectedActivationRPE: 4,
    baselineCognitiveScore: null,
    latestCognitiveScore: null,
    urineColor: null,
    bodyTempF: null,
    bodyMassIntensityCap: trainingIntensityCap,
    recentSparringCount48h,
    recentSparringDecayLoad5d,
    recentHighImpactCount48h,
    recentHeavyStrengthCount48h,
    goalMode: objectiveContext.goalMode,
    phase: objectiveContext.phase,
    daysOut: objectiveContext.daysOut,
    hasActiveWeightClassPlan: objectiveContext.hasActiveWeightClassPlan,
    hasHardSparringScheduled: recentActivities.some((activity) => activity.activity_type === 'sparring' && activity.status !== 'skipped'),
    hasTechnicalSessionScheduled: recentActivities.some((activity) => activity.activity_type === 'boxing_practice' && activity.status !== 'skipped'),
    readinessHistory,
    cycleDay,
  });
  const constraintSet = deriveStimulusConstraintSet(profile, {
    phase: objectiveContext.phase,
    goalMode: objectiveContext.goalMode,
    daysOut: objectiveContext.daysOut,
    trainingIntensityCap,
  });

  return {
    readinessProfile: profile,
    readinessState: profile.readinessState,
    constraintSet,
    todayCheckin,
  };
}

function inferPowerTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.primaryAdaptation === 'power') return true;
  return entry.focus === 'sport_specific'
    || entry.focus === 'full_body';
}

function inferStrengthTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.doseCredits?.some((credit) => credit.bucket === 'strength' && credit.credit > 0)) return true;
  if (entry.prescription_snapshot?.primaryAdaptation === 'strength') return true;
  return entry.session_type === 'sc'
    || entry.focus === 'lower'
    || entry.focus === 'upper_push'
    || entry.focus === 'upper_pull'
    || entry.focus === 'full_body';
}

function inferConditioningTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.doseCredits?.some((credit) => credit.bucket === 'conditioning' && credit.credit > 0)) return true;
  if (entry.prescription_snapshot?.primaryAdaptation === 'conditioning') return true;
  return entry.session_type === 'conditioning'
    || entry.session_type === 'road_work'
    || entry.focus === 'conditioning';
}

function summarizeMedExposure(targetTouches: number, scheduledTouches: number, dayIndex: number): { targetTouches: number; scheduledTouches: number; remainingTouches: number; status: 'met' | 'pending' | 'at_risk' | 'missed' } {
  const remainingTouches = Math.max(0, targetTouches - scheduledTouches);
  if (scheduledTouches >= targetTouches) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'met' };
  }
  if (dayIndex >= 5 && remainingTouches > 1) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'missed' };
  }
  if (dayIndex >= 4 && remainingTouches >= 1) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'at_risk' };
  }
  return { targetTouches, scheduledTouches, remainingTouches, status: 'pending' };
}

function deriveMEDStatus(entries: WeeklyPlanEntryRow[], date: string): MEDStatus {
  const weekStart = getWeekWindow(date).weekStart;
  const dayIndex = Math.max(0, daysBetween(weekStart, date));
  const activeEntries = entries.filter((entry) => entry.status !== 'skipped');
  const powerTouches = activeEntries.filter(inferPowerTouch).length;
  const strengthTouches = activeEntries.filter(inferStrengthTouch).length;
  const conditioningTouches = activeEntries.filter(inferConditioningTouch).length;

  const power = summarizeMedExposure(1, powerTouches, dayIndex);
  const strength = summarizeMedExposure(2, strengthTouches, dayIndex);
  const conditioning = summarizeMedExposure(2, conditioningTouches, dayIndex);
  const statuses = [power.status, strength.status, conditioning.status];
  const overall = statuses.includes('missed')
    ? 'missed'
    : statuses.includes('at_risk')
      ? 'at_risk'
      : 'on_track';

  return {
    power,
    strength,
    conditioning,
    overall,
    summary: overall === 'on_track'
      ? 'Minimum effective dose exposures are on track this week.'
      : overall === 'at_risk'
        ? 'At least one key quality is drifting toward a missed weekly exposure.'
        : 'The current week is missing at least one minimum effective dose target.',
  };
}

async function resolveWorkoutPrescription(input: {
  userId: string;
  date: string;
  phase: Phase;
  readinessState: ReadinessState;
  readinessProfile: ReadinessProfile;
  constraintSet: StimulusConstraintSet;
  acwr: ACWRResult;
  fitnessLevel: string;
  trainingAge: 'novice' | 'intermediate' | 'advanced';
  performanceGoalType: MacrocycleContext['performanceGoalType'];
  weeklyPlanEntry: WeeklyPlanEntryRow | null;
  objectiveContext: MacrocycleContext;
  medStatus: MEDStatus | null;
}): Promise<WorkoutPrescriptionV2 | null> {
  if (!input.weeklyPlanEntry) {
    return null;
  }

  const storedPrescription = input.weeklyPlanEntry.prescription_snapshot ?? null;

  if (storedPrescription) {
    return adaptPrescriptionToDailyReadiness({
      prescription: storedPrescription,
      readinessProfile: input.readinessProfile,
      constraintSet: input.constraintSet,
    });
  }

  const [gym, library, recentIds, recentMuscleVolume] = await Promise.all([
    getDefaultGymProfile(input.userId),
    getExerciseLibrary(),
    getRecentExerciseIds(input.userId),
    getRecentMuscleVolume(input.userId),
  ]);

  const exerciseHistory = await getExerciseHistoryBatch(
    input.userId,
    library.map((exercise) => exercise.id),
  );

  const generatedPrescription = generateWorkoutV2({
    readinessState: input.readinessState,
    readinessProfile: input.readinessProfile,
    constraintSet: input.constraintSet,
    phase: input.phase,
    acwr: input.acwr.ratio,
    exerciseLibrary: library,
    recentExerciseIds: recentIds,
    recentMuscleVolume,
    trainingDate: input.date,
    focus: input.weeklyPlanEntry?.focus ?? undefined,
    trainingIntensityCap: undefined,
    fitnessLevel: input.fitnessLevel as any,
    trainingAge: input.trainingAge,
    performanceGoalType: input.performanceGoalType,
    availableMinutes: input.weeklyPlanEntry?.estimated_duration_min,
    gymEquipment: gym?.equipment ?? [],
    exerciseHistory,
    isDeloadWeek: input.weeklyPlanEntry?.is_deload ?? false,
    weeklyPlanFocus: input.weeklyPlanEntry?.focus ?? undefined,
    medStatus: input.medStatus,
  });

  return adaptPrescriptionToDailyReadiness({
    prescription: generatedPrescription,
    readinessProfile: input.readinessProfile,
    constraintSet: input.constraintSet,
  });
}

export async function getDailyAthleteSummary(
  userId: string,
  date: string,
  options: DailyPerformanceOptions = {},
): Promise<DailyAthleteSummary> {
  const state = await getDailyEngineState(userId, date, options);
  return state.mission;
}

async function computeDailyEngineState(
  userId: string,
  date: string,
  _options: DailyPerformanceOptions = {},
): Promise<DailyEngineState> {
  const weekWindow = getWeekWindow(date);

  const [objectiveContext, athleteContext, weeklyPlanEntries, weeklyEntries, scheduledActivities] = await Promise.all([
    resolveObjectiveContext(userId, date),
    getAthleteContext(userId),
    getPlanEntriesForDate(userId, date),
    getPlanEntriesForRange(userId, weekWindow.weekStart, weekWindow.weekEnd),
    getScheduledActivities(userId, date, date),
  ]);

  const primaryPlanEntry = pickPrimaryPlanEntry(weeklyPlanEntries);
  const primaryEnginePlanEntry = pickPrimaryEnginePlanEntry(weeklyPlanEntries);

  const profile = athleteContext.profile;
  const profileCycleDay = typeof (profile as { cycle_day?: number | null } | null)?.cycle_day === 'number'
    ? (profile as { cycle_day?: number | null }).cycle_day ?? null
    : null;
  const canonicalCurrentWeight = objectiveContext.currentWeightLbs ?? profile?.base_weight ?? null;
  const canonicalTargetWeight = objectiveContext.targetWeightLbs ?? null;
  const currentWeight = canonicalCurrentWeight ?? 150;
  const targetWeight = canonicalTargetWeight ?? currentWeight;
  const acwr = await resolveACWR(
    userId,
    date,
    objectiveContext.phase,
    athleteContext.fitnessLevel,
    athleteContext.hasActiveWeightClassPlan,
    profileCycleDay,
  );
  const { readinessProfile, readinessState, constraintSet, todayCheckin } = await resolveReadinessProfile({
    userId,
    date,
    acwr,
    objectiveContext,
    trainingIntensityCap: null,
    cycleDay: profileCycleDay,
  });
  const medStatus = deriveMEDStatus(weeklyEntries, date);
  const workoutPrescription = await resolveWorkoutPrescription({
    userId,
    date,
    phase: objectiveContext.phase,
    readinessState,
    readinessProfile,
    constraintSet,
    acwr,
    fitnessLevel: athleteContext.fitnessLevel,
    trainingAge: athleteContext.trainingAge,
    performanceGoalType: athleteContext.performanceGoalType,
    weeklyPlanEntry: primaryEnginePlanEntry,
    objectiveContext,
    medStatus,
  });

  const hydration = getHydrationProtocol({
    phase: objectiveContext.phase,
    fightStatus: profile?.fight_status ?? 'amateur',
    currentWeightLbs: currentWeight,
    targetWeightLbs: targetWeight,
    weeklyVelocityLbs: objectiveContext.weightTrend?.weeklyVelocityLbs,
  });

  const riskAssessment = calculateCampRisk({
    goalMode: objectiveContext.goalMode,
    weightClassState: objectiveContext.weightClassState,
    daysOut: objectiveContext.daysOut,
    remainingWeightLbs: objectiveContext.remainingWeightLbs,
    weighInTiming: objectiveContext.weighInTiming,
    acwrRatio: acwr.ratio,
    isTravelWindow: objectiveContext.isTravelWindow,
  });
  const unifiedPerformance = resolveUnifiedDailyPerformance({
    userId,
    date,
    athleteContext,
    objectiveContext,
    readinessProfile,
    todayCheckin,
    scheduledActivities,
    currentWeight: canonicalCurrentWeight,
    targetWeight: canonicalTargetWeight,
    weekStart: weekWindow.weekStart,
  });
  const { summary: mission, nutritionTarget: nutritionTargets } = buildDailyAthleteSummaryFromUnified({
    date,
    objectiveContext,
    readinessProfile,
    constraintSet,
    medStatus,
    hydration,
    workoutPrescription,
    unifiedPerformance,
  });

  for (const event of nutritionTargets.safetyEvents ?? []) {
    console.info('[dailyPerformanceService] nutrition-safety-event', {
      userId,
      date,
      code: event.code,
      source: event.source,
      priorValue: event.priorValue,
      adjustedValue: event.adjustedValue,
      reason: event.reason,
    });
  }

  return {
    date,
    engineVersion: mission.engineVersion ?? DAILY_ENGINE_VERSION,
    objectiveContext,
    acwr,
    readinessState,
    readinessProfile,
    constraintSet,
    nutritionTargets,
    hydration,
    scheduledActivities,
    weeklyPlanEntries,
    primaryScheduledActivity: pickPrimaryScheduledActivity(scheduledActivities),
    primaryPlanEntry,
    primaryEnginePlanEntry,
    workoutPrescription: workoutPrescription ?? null,
    mission,
    campRisk: riskAssessment ?? null,
    medStatus,
    unifiedPerformance,
  };
}

export async function getDailyEngineState(
  userId: string,
  date: string,
  options: DailyPerformanceOptions = {},
): Promise<DailyEngineState> {
  const cacheKey = getDailyEngineStateCacheKey(userId, date);

  if (!options.forceRefresh) {
    const cached = dailyEngineStateCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = dailyEngineStateInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  } else {
    dailyEngineStateCache.delete(cacheKey);
    dailyEngineStateInFlight.delete(cacheKey);
  }

  const request = computeDailyEngineState(userId, date, options)
    .then((result) => {
      dailyEngineStateCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      dailyEngineStateInFlight.delete(cacheKey);
    });

  dailyEngineStateInFlight.set(cacheKey, request);
  return request;
}

async function computeWeeklyAthleteSummary(
  userId: string,
  weekStart: string,
  options: DailyPerformanceOptions = {},
): Promise<WeeklyAthleteSummaryPlan> {
  return resolveWeeklyAthleteSummaryWithDependencies(userId, weekStart, options, {
    loadWeeklyPlanEntries: async (targetUserId, targetWeekStart) => {
      const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('week_start_date', targetWeekStart)
        .order('date')
        .order('slot');

      if (error) throw error;
      return (data ?? []) as WeeklyPlanEntryRow[];
    },
    getDailyAthleteSummary,
  });
}

export async function getWeeklyAthleteSummary(
  userId: string,
  weekStart: string,
  options: DailyPerformanceOptions = {},
): Promise<WeeklyAthleteSummaryPlan> {
  const cacheKey = getWeeklyAthleteSummaryCacheKey(userId, weekStart);

  if (!options.forceRefresh) {
    const cached = weeklyAthleteSummaryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = weeklyAthleteSummaryInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  } else {
    weeklyAthleteSummaryCache.delete(cacheKey);
    weeklyAthleteSummaryInFlight.delete(cacheKey);
  }

  const request = computeWeeklyAthleteSummary(userId, weekStart, options)
    .then((result) => {
      weeklyAthleteSummaryCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      weeklyAthleteSummaryInFlight.delete(cacheKey);
    });

  weeklyAthleteSummaryInFlight.set(cacheKey, request);
  return request;
}
