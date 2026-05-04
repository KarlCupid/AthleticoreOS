import {
  calculateACWR,
  deriveReadinessProfile,
  deriveStimulusConstraintSet,
  type ACWRResult,
  type FitnessLevel,
  type MacrocycleContext,
  type Phase,
  type ReadinessProfile,
  type ReadinessState,
  type ScheduledActivityRow,
  type StimulusConstraintSet,
} from '../../engine/index.ts';
import { logError } from '../../utils/logger';
import { addDays, daysBetween } from './dateWindow';
import type { DailyReadinessCheckinRow } from './trackingEntries';

type QueryResult<T> = { data: T | null; error: unknown | null };

interface ReadinessQueryBuilder {
  select: (columns: string) => ReadinessQueryBuilder;
  eq: (column: string, value: string | number | null) => ReadinessQueryBuilder;
  gte: (column: string, value: string) => ReadinessQueryBuilder;
  lte: (column: string, value: string) => ReadinessQueryBuilder;
  not: (column: string, operator: string, value: string | number | null) => ReadinessQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => ReadinessQueryBuilder;
  limit: (count: number) => ReadinessQueryBuilder;
}

interface ReadinessSupabaseClient {
  from(table: string): ReadinessQueryBuilder;
}

interface ActivationRpeRow {
  date: string;
  activation_rpe?: number | null;
}

export interface DailyPerformanceCheckColumnState {
  hasDailyPerformanceCheckColumns: boolean | null;
}

export interface ReadinessResolutionDependencies {
  calculateACWR: typeof calculateACWR;
  loadDailyCheckins: (input: {
    userId: string;
    startDate: string;
    endDate: string;
    select: string;
    ordered: boolean;
  }) => Promise<QueryResult<DailyReadinessCheckinRow[]>>;
  loadRecentActivities: (userId: string, startDate: string, endDate: string) => Promise<ScheduledActivityRow[]>;
  loadLatestActivationRpe: (userId: string, date: string) => Promise<QueryResult<ActivationRpeRow[]>>;
  deriveReadinessProfile: typeof deriveReadinessProfile;
  deriveStimulusConstraintSet: typeof deriveStimulusConstraintSet;
  logError: typeof logError;
  columnState: DailyPerformanceCheckColumnState;
}

export interface ResolvedReadinessProfile {
  readinessProfile: ReadinessProfile;
  readinessState: ReadinessState;
  constraintSet: StimulusConstraintSet;
  todayCheckin: DailyReadinessCheckinRow | null;
}

const DAILY_CHECKIN_LEGACY_SELECT = 'date, sleep_quality, readiness, stress_level, soreness_level, confidence_level';
const DAILY_CHECKIN_PERFORMANCE_SELECT = `${DAILY_CHECKIN_LEGACY_SELECT}, energy_level, pain_level`;
const DAILY_PERFORMANCE_CHECK_COLUMNS = [
  'energy_level',
  'pain_level',
  'readiness_score',
  'checkin_version',
] as const;

const defaultDailyPerformanceCheckColumnState: DailyPerformanceCheckColumnState = {
  hasDailyPerformanceCheckColumns: null,
};

function queryResult<T>(query: ReadinessQueryBuilder): Promise<QueryResult<T>> {
  return query as unknown as Promise<QueryResult<T>>;
}

function isMissingDailyPerformanceCheckColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  const message = typeof maybe.message === 'string' ? maybe.message : '';
  return (maybe.code === 'PGRST204' || maybe.code === '42703')
    && DAILY_PERFORMANCE_CHECK_COLUMNS.some((column) => message.includes(column));
}

async function loadDailyCheckins(input: {
  userId: string;
  startDate: string;
  endDate: string;
  select: string;
  ordered: boolean;
}): Promise<QueryResult<DailyReadinessCheckinRow[]>> {
  const client = (await import('../../supabase')).supabase as unknown as ReadinessSupabaseClient;
  let query = client
    .from('daily_checkins')
    .select(input.select)
    .eq('user_id', input.userId)
    .gte('date', input.startDate)
    .lte('date', input.endDate);

  if (input.ordered) {
    query = query.order('date');
  }

  return queryResult<DailyReadinessCheckinRow[]>(query);
}

async function loadLatestActivationRpe(userId: string, date: string): Promise<QueryResult<ActivationRpeRow[]>> {
  const client = (await import('../../supabase')).supabase as unknown as ReadinessSupabaseClient;
  return queryResult<ActivationRpeRow[]>(
    client
      .from('workout_log')
      .select('date, activation_rpe')
      .eq('user_id', userId)
      .not('activation_rpe', 'is', null)
      .lte('date', date)
      .order('date', { ascending: false })
      .limit(1),
  );
}

export const defaultReadinessResolutionDependencies: ReadinessResolutionDependencies = {
  calculateACWR,
  loadDailyCheckins,
  loadRecentActivities: async (userId, startDate, endDate) => {
    const module = await import('../scheduleService');
    return module.getScheduledActivities(userId, startDate, endDate);
  },
  loadLatestActivationRpe,
  deriveReadinessProfile,
  deriveStimulusConstraintSet,
  logError,
  columnState: defaultDailyPerformanceCheckColumnState,
};

export async function resolveACWRWithDependencies(
  input: {
    userId: string;
    date: string;
    phase: Phase;
    fitnessLevel: FitnessLevel;
    hasActiveWeightClassPlan: boolean;
    cycleDay: number | null;
    supabaseClient?: Parameters<typeof calculateACWR>[0]['supabaseClient'];
  },
  dependencies: Pick<ReadinessResolutionDependencies, 'calculateACWR'> = defaultReadinessResolutionDependencies,
): Promise<ACWRResult> {
  const supabaseClient = input.supabaseClient ?? (await import('../../supabase')).supabase;
  return dependencies.calculateACWR({
    userId: input.userId,
    supabaseClient,
    asOfDate: input.date,
    fitnessLevel: input.fitnessLevel,
    phase: input.phase,
    hasActiveWeightClassPlan: input.hasActiveWeightClassPlan,
    cycleDay: input.cycleDay,
  });
}

export async function resolveReadinessProfileWithDependencies(
  input: {
    userId: string;
    date: string;
    acwr: ACWRResult;
    objectiveContext: MacrocycleContext;
    trainingIntensityCap?: number | null;
    cycleDay?: number | null;
  },
  dependencies: ReadinessResolutionDependencies = defaultReadinessResolutionDependencies,
): Promise<ResolvedReadinessProfile> {
  const { userId, date, acwr, objectiveContext, trainingIntensityCap = null, cycleDay = null } = input;
  const historyStart = addDays(date, -6);
  const recentActivityStart = addDays(date, -5);

  let checkinsResult: QueryResult<DailyReadinessCheckinRow[]> = { data: [], error: null };
  let recentActivities: ScheduledActivityRow[] = [];
  let activationResult: QueryResult<ActivationRpeRow[]> = { data: [], error: null };
  const checkinSelect = dependencies.columnState.hasDailyPerformanceCheckColumns === false
    ? DAILY_CHECKIN_LEGACY_SELECT
    : DAILY_CHECKIN_PERFORMANCE_SELECT;

  try {
    const [cRes, rAct, aRes] = await Promise.all([
      dependencies.loadDailyCheckins({
        userId,
        startDate: historyStart,
        endDate: date,
        select: checkinSelect,
        ordered: true,
      }),
      dependencies.loadRecentActivities(userId, recentActivityStart, date),
      dependencies.loadLatestActivationRpe(userId, date),
    ]);
    checkinsResult = cRes;
    recentActivities = rAct;
    activationResult = aRes;

    if (cRes.error) throw cRes.error;
    if (aRes.error) throw aRes.error;
    if (checkinSelect === DAILY_CHECKIN_PERFORMANCE_SELECT) {
      dependencies.columnState.hasDailyPerformanceCheckColumns = true;
    }
  } catch (error) {
    if (isMissingDailyPerformanceCheckColumnError(error)) {
      dependencies.columnState.hasDailyPerformanceCheckColumns = false;
    } else {
      dependencies.logError('dailyPerformanceService.resolveReadinessProfile', error, { date });
    }

    try {
      checkinsResult = await dependencies.loadDailyCheckins({
        userId,
        startDate: historyStart,
        endDate: date,
        select: DAILY_CHECKIN_LEGACY_SELECT,
        ordered: false,
      });
    } catch (fallbackError) {
      dependencies.logError('dailyPerformanceService.resolveReadinessProfile.fallback', fallbackError, { date });
    }
  }

  const checkins = checkinsResult.data ?? [];
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
  const latestActivationRPE = activationResult.data?.[0]?.activation_rpe ?? null;
  const profile = dependencies.deriveReadinessProfile({
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
  const constraintSet = dependencies.deriveStimulusConstraintSet(profile, {
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
