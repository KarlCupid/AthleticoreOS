import { useState, useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { handleMissedDay } from '../../lib/engine/calculateSchedule';
import {
  getWeeklyPlanConfig,
  getActiveWeekPlan,
  markDayCompleted,
  markDaySkipped,
  rescheduleMissedDay,
  cancelActivePlan,
} from '../../lib/api/weeklyPlanService';
import { getWeeklyPlanEntriesForWeek } from '../../lib/api/weeklyPlanReadService';
import { generateAndSaveBoxingWeeklyPlan } from '../../lib/api/boxingWeeklyPlanService';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import { getErrorMessage, logError } from '../../lib/utils/logger';
import { todayLocalDate, addDays } from '../../lib/utils/date';
import { getDailyEngineState } from '../../lib/api/dailyPerformanceService';
import { resolveWeeklyPlanWeekStart } from '../../lib/engine/weeklyPlanWeekStart';
import {
  buildUnifiedPerformanceViewModel,
  type UnifiedPerformanceViewModel,
  type ReadinessBand,
} from '../../lib/performance-engine';
import type {
  WeeklyPlanConfigRow,
  WeeklyPlanEntryRow,
  SmartWeekPlanResult,
  ReadinessState,
  GymProfileRow,
  TrainingSessionFamily,
  WeeklyTrainingMixPlan,
  WorkoutDoseBucket,
  SessionDoseSummary,
} from '../../lib/engine/types';

const TARGET_FAMILIES: TrainingSessionFamily[] = ['sparring', 'boxing_skill', 'conditioning', 'strength', 'durability_core', 'recovery', 'rest'];

function mapDoseBucketToFamily(bucket: WorkoutDoseBucket): TrainingSessionFamily {
  if (bucket === 'conditioning') return 'conditioning';
  if (bucket === 'durability') return 'durability_core';
  if (bucket === 'recovery') return 'recovery';
  return 'strength';
}

function inferEntryFamily(entry: WeeklyPlanEntryRow): TrainingSessionFamily {
  if (entry.session_family) return entry.session_family;
  if (entry.session_type === 'sparring') return 'sparring';
  if (entry.session_type === 'boxing_practice') return 'boxing_skill';
  if (entry.focus === 'conditioning' || entry.session_type === 'conditioning') return 'conditioning';
  if (entry.focus === 'recovery' || entry.session_type === 'active_recovery') return 'recovery';
  if (entry.focus != null) return 'strength';
  return 'rest';
}

function emptyDoseSummary(): Required<SessionDoseSummary> {
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

function buildWeeklyMixPlanFromSavedEntries(
  entries: WeeklyPlanEntryRow[],
  summary: string,
  weekStart: string = entries[0]?.week_start_date ?? todayStr(),
): WeeklyTrainingMixPlan {
  const placementCounts = new Map<TrainingSessionFamily, number>();
  const realizedCounts = new Map<TrainingSessionFamily, number>();
  const scDoseSummary = emptyDoseSummary();

  for (const entry of entries) {
    const family = inferEntryFamily(entry);
    placementCounts.set(family, (placementCounts.get(family) ?? 0) + 1);

    const realizedBuckets = entry.realized_dose_buckets?.length
      ? entry.realized_dose_buckets
      : entry.prescription_snapshot?.realizedBucket
        ? [entry.prescription_snapshot.realizedBucket]
        : [];

    if (realizedBuckets.length > 0) {
      for (const bucket of realizedBuckets) {
        const realizedFamily = mapDoseBucketToFamily(bucket);
        realizedCounts.set(realizedFamily, (realizedCounts.get(realizedFamily) ?? 0) + 1);
      }
    } else if (entry.focus != null && entry.prescription_snapshot?.exercises?.length) {
      realizedCounts.set(family, (realizedCounts.get(family) ?? 0) + 1);
    }

    const dose = entry.dose_summary ?? entry.prescription_snapshot?.doseSummary ?? entry.prescription_snapshot?.sessionPrescription?.dose ?? null;
    if (dose) {
      scDoseSummary.hardSets += dose.hardSets ?? 0;
      scDoseSummary.sprintMeters += dose.sprintMeters ?? 0;
      scDoseSummary.plyoContacts += dose.plyoContacts ?? 0;
      scDoseSummary.hiitMinutes += dose.hiitMinutes ?? 0;
      scDoseSummary.aerobicMinutes += dose.aerobicMinutes ?? 0;
      scDoseSummary.circuitRounds += dose.circuitRounds ?? 0;
      scDoseSummary.highImpactCount += dose.highImpactCount ?? 0;
      scDoseSummary.tissueStressLoad += dose.tissueStressLoad ?? 0;
    }
  }

  const sessionTargets = TARGET_FAMILIES.map((family) => {
    const target = placementCounts.get(family) ?? 0;
    const realized = realizedCounts.get(family) ?? (family === 'sparring' || family === 'boxing_skill' ? target : 0);
    return {
      family,
      min: target > 0 ? 1 : 0,
      target,
      max: target,
      scheduled: realized,
      completed: entries.filter((entry) => inferEntryFamily(entry) === family && entry.status === 'completed').length,
      floor: target > 0 ? 1 : 0,
      realized,
      debt: Math.max(0, target - realized),
      metBySubstitution: 0,
      missReason: target > 0 && realized === 0 ? 'No realized dose was saved for this target.' : null,
    };
  });

  return {
    weekStartDate: weekStart,
    weekIntent: summary,
    sessionTargets,
    scDoseSummary,
    dailyPlacements: entries.map((entry) => ({
      date: entry.date,
      day_of_week: entry.day_of_week,
      slot: entry.slot,
      dayOrder: entry.day_order ?? null,
      sessionFamily: inferEntryFamily(entry),
      scSessionFamily: entry.sc_session_family ?? entry.prescription_snapshot?.scSessionFamily ?? null,
      sessionType: entry.session_type as any,
      focus: entry.focus,
      durationMin: entry.estimated_duration_min,
      targetIntensity: entry.target_intensity,
      source: entry.placement_source ?? 'generated',
      locked: entry.placement_source === 'locked',
      progressionIntent: entry.progression_intent ?? null,
      notes: entry.engine_notes,
      sessionModules: entry.session_modules ?? entry.prescription_snapshot?.sessionComposition ?? null,
      doseCredits: entry.dose_credits ?? entry.prescription_snapshot?.doseCredits ?? [],
      doseSummary: entry.dose_summary ?? entry.prescription_snapshot?.doseSummary ?? entry.prescription_snapshot?.sessionPrescription?.dose ?? null,
      realizedDoseBuckets: entry.realized_dose_buckets ?? (entry.prescription_snapshot?.realizedBucket ? [entry.prescription_snapshot.realizedBucket] : []),
      recurringActivityId: null,
    })),
    carryForwardAdjustments: entries
      .filter((entry) => Boolean(entry.carry_forward_reason))
      .map((entry) => ({
        family: inferEntryFamily(entry),
        fromDate: entry.date,
        suggestedDate: null,
        reason: entry.carry_forward_reason as string,
        status: 'deferred' as const,
      })),
  };
}

function buildWeeklyPlanLoadSummary(entries: WeeklyPlanEntryRow[]): string {
  if (entries.length === 0) {
    return 'There is no active weekly plan for this window.';
  }

  const trainingDays = new Set(entries.map((entry) => entry.date)).size;
  const supportSessions = entries.filter((entry) => inferEntryFamily(entry) !== 'rest').length;

  return `${supportSessions} scheduled session${supportSessions === 1 ? '' : 's'} across ${trainingDays} training day${trainingDays === 1 ? '' : 's'}.`;
}

function todayStr(): string {
  return todayLocalDate();
}

function isFixedCombatEntry(entry: WeeklyPlanEntryRow): boolean {
  return (
    entry.session_type === 'sparring'
    || entry.session_type === 'boxing_practice'
  ) && (
    entry.placement_source === 'locked'
    || entry.focus == null
  );
}

function shouldRepairUnderfilledWeek(
  entries: WeeklyPlanEntryRow[],
  weekStart: string,
): boolean {
  if (entries.length === 0 || entries.some((entry) => entry.is_deload)) {
    return false;
  }

  const weekEnd = addDays(weekStart, 6);
  if (weekEnd < todayStr()) {
    return false;
  }

  const fixedCombatDates = new Set(
    entries
      .filter(isFixedCombatEntry)
      .map((entry) => entry.date),
  );

  if (fixedCombatDates.size === 0) {
    return false;
  }

  const hasStandaloneGuidedSession = entries.some((entry) =>
    entry.focus != null && !fixedCombatDates.has(entry.date),
  );

  return !hasStandaloneGuidedSession;
}

function mapUnifiedReadinessToLegacy(band: ReadinessBand): ReadinessState {
  if (band === 'green') return 'Prime';
  if (band === 'yellow' || band === 'orange') return 'Caution';
  return 'Depleted';
}

async function getCurrentReadinessContext(
  userId: string,
  date: string = todayStr(),
): Promise<{ readinessState: ReadinessState; acwr: number }> {
  try {
    const engineState = await getDailyEngineState(userId, date);
    const canonicalReadiness = engineState.unifiedPerformance?.canonicalOutputs.readiness;
    return {
      readinessState: canonicalReadiness
        ? mapUnifiedReadinessToLegacy(canonicalReadiness.readinessBand)
        : engineState.readinessState,
      acwr: engineState.acwr.ratio,
    };
  } catch (error) {
    logError('useWeeklyPlan.getCurrentReadinessContext', error, { userId, date });
    return { readinessState: 'Prime', acwr: 1.0 };
  }
}

export async function generateAndSaveWeeklyPlan(
  userId: string,
  planConfig: WeeklyPlanConfigRow,
  gym: GymProfileRow | null,
  weekStart: string,
): Promise<SmartWeekPlanResult> {
  return generateAndSaveBoxingWeeklyPlan(userId, planConfig, gym, weekStart);
}

export function useWeeklyPlan() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WeeklyPlanConfigRow | null>(null);
  const [weekPlan, setWeekPlan] = useState<SmartWeekPlanResult | null>(null);
  const [entries, setEntries] = useState<WeeklyPlanEntryRow[]>([]);
  const [todayEntry, setTodayEntry] = useState<WeeklyPlanEntryRow | null>(null);
  const [missedEntries, setMissedEntries] = useState<WeeklyPlanEntryRow[]>([]);
  const [gymProfile, setGymProfile] = useState<GymProfileRow | null>(null);
  const [isDeloadWeek, setIsDeloadWeek] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWeekStart, setActiveWeekStart] = useState<string | null>(null);
  const [performanceContext, setPerformanceContext] = useState<UnifiedPerformanceViewModel>(() => buildUnifiedPerformanceViewModel(null));

  // Derive if the current active week is the "current" chronological week
  const isCurrentWeek = activeWeekStart != null && todayStr() >= activeWeekStart && todayStr() < addDays(activeWeekStart, 7);

  const applyWeeklyPlanEntries = useCallback((
    nextEntries: WeeklyPlanEntryRow[],
    summary: string,
    weekStart?: string,
  ) => {
    const nextIsDeload = nextEntries.some((entry) => entry.is_deload);
    const nextTodayEntry = nextEntries.find((entry) => entry.date === todayStr()) ?? null;
    const nextMissedEntries = nextEntries.filter((entry) => entry.status === 'planned' && entry.date < todayStr());
    const nextWeekStart = nextEntries[0]?.week_start_date ?? weekStart ?? null;

    setEntries(nextEntries);
    setTodayEntry(nextTodayEntry);
    setMissedEntries(nextMissedEntries);
    setIsDeloadWeek(nextIsDeload);
    setActiveWeekStart(nextWeekStart);
    setWeekPlan({
      entries: nextEntries,
      isDeloadWeek: nextIsDeload,
      deloadReason: null,
      weeklyFocusSplit: {},
      weeklyMixPlan: {
        ...buildWeeklyMixPlanFromSavedEntries(nextEntries, summary, nextWeekStart ?? undefined),
      },
      message: summary,
    });
  }, []);

  const loadPlan = useCallback(async (forceStartDate?: string) => {
    const userId = await getActiveUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const planConfig = await getWeeklyPlanConfig(userId);
      setConfig(planConfig);

      if (!planConfig) {
        setWeekPlan(null);
        setEntries([]);
        setTodayEntry(null);
        setMissedEntries([]);
        setIsDeloadWeek(false);
        setActiveWeekStart(null);
        setPerformanceContext(buildUnifiedPerformanceViewModel(null));
        setLoading(false);
        return;
      }

      const [gym, engineState, latestGeneratedEntries] = await Promise.all([
        getDefaultGymProfile(userId),
        getDailyEngineState(userId, todayStr(), { forceRefresh: Boolean(forceStartDate) }),
        getActiveWeekPlan(userId),
      ]);
      setGymProfile(gym);
      setPerformanceContext(buildUnifiedPerformanceViewModel(engineState.unifiedPerformance));

      const todayEngineWeekStart = engineState.primaryPlanEntry?.week_start_date
        ?? engineState.weeklyPlanEntries[0]?.week_start_date
        ?? null;
      const latestGeneratedWeekStart = latestGeneratedEntries[0]?.week_start_date ?? null;
      const weekStart = resolveWeeklyPlanWeekStart({
        forceStartDate,
        activeWeekStart,
        todayEngineWeekStart,
        latestGeneratedWeekStart,
      });

      if (!weekStart) {
        setWeekPlan(null);
        setEntries([]);
        setTodayEntry(null);
        setMissedEntries([]);
        setIsDeloadWeek(false);
        setActiveWeekStart(null);
      } else {
        const weeklyEntries = await getWeeklyPlanEntriesForWeek(userId, weekStart);
        if (gym && shouldRepairUnderfilledWeek(weeklyEntries, weekStart)) {
          const repairedWeek = await generateAndSaveBoxingWeeklyPlan(userId, planConfig, gym, weekStart);
          applyWeeklyPlanEntries(repairedWeek.entries, repairedWeek.message, weekStart);
        } else {
          applyWeeklyPlanEntries(weeklyEntries, buildWeeklyPlanLoadSummary(weeklyEntries), weekStart);
        }
      }
    } catch (err: unknown) {
      logError('useWeeklyPlan.loadPlan', err);
      setError(getErrorMessage(err));
    }

    setLoading(false);
  }, [activeWeekStart, applyWeeklyPlanEntries]);

  const completeDay = useCallback(async (entryId: string, workoutLogId: string) => {
    try {
      await markDayCompleted(entryId, workoutLogId);
      await loadPlan(activeWeekStart ?? undefined);
    } catch (err: unknown) {
      logError('useWeeklyPlan.completeDay', err, { entryId, workoutLogId });
    }
  }, [activeWeekStart, loadPlan]);

  const skipDay = useCallback(async (entryId: string) => {
    try {
      await markDaySkipped(entryId);
      await loadPlan(activeWeekStart ?? undefined);
    } catch (err: unknown) {
      logError('useWeeklyPlan.skipDay', err, { entryId });
    }
  }, [activeWeekStart, loadPlan]);

  const rescheduleDay = useCallback(
    async (missedEntry: WeeklyPlanEntryRow) => {
      const userId = await getActiveUserId();
      const readinessContext = userId
        ? await getCurrentReadinessContext(userId)
        : { readinessState: 'Prime' as const, acwr: 1.0 };

      const remaining = entries.filter((entry) => entry.status === 'planned');
      const result = handleMissedDay({
        missedEntry,
        remainingEntries: remaining,
        readinessState: readinessContext.readinessState,
        acwr: readinessContext.acwr,
      });

      if (result.redistributedExercises.length > 0 && userId) {
        const rescheduledDate = result.updatedEntries[0]?.date;
        if (rescheduledDate) {
          await rescheduleMissedDay(missedEntry.id, rescheduledDate);
          await loadPlan(activeWeekStart ?? undefined);
        }
      }

      return result;
    },
    [activeWeekStart, entries, loadPlan],
  );

  const cancelPlan = useCallback(async () => {
    try {
      const userId = await getActiveUserId();
      if (!userId) return;

      setLoading(true);
      await cancelActivePlan(userId);

      setWeekPlan(null);
      setEntries([]);
      setTodayEntry(null);
      setMissedEntries([]);
      setIsDeloadWeek(false);
      setActiveWeekStart(null);
      setPerformanceContext(buildUnifiedPerformanceViewModel(null));
    } catch (err: unknown) {
      logError('useWeeklyPlan.cancelPlan', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const goToNextWeek = useCallback(async () => {
    if (!activeWeekStart) return;
    const nextStart = addDays(activeWeekStart, 7);
    setActiveWeekStart(nextStart);
    await loadPlan(nextStart);
  }, [activeWeekStart, loadPlan]);

  const goToPrevWeek = useCallback(async () => {
    if (!activeWeekStart) return;
    const prevStart = addDays(activeWeekStart, -7);
    setActiveWeekStart(prevStart);
    await loadPlan(prevStart);
  }, [activeWeekStart, loadPlan]);

  const generateActiveWeek = useCallback(async () => {
    if (!activeWeekStart || !config) return;
    const userId = await getActiveUserId();
    if (!userId) return;
    if (!gymProfile) {
      setError('Create a default gym profile before generating a workout plan.');
      return;
    }

    setLoading(true);
    try {
      await generateAndSaveBoxingWeeklyPlan(userId, config, gymProfile, activeWeekStart);
      await loadPlan(activeWeekStart);
    } catch (err: unknown) {
      logError('useWeeklyPlan.generateActiveWeek', err);
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }, [activeWeekStart, config, gymProfile, loadPlan]);

  useEffect(() => {
    let isActive = true;
    InteractionManager.runAfterInteractions(() => {
        if (isActive) {
            void loadPlan();
        }
    });
    return () => {
        isActive = false;
    };
  }, [loadPlan]);

  return {
    loading,
    error,
    config,
    weekPlan,
    gymProfile,
    hasDefaultGymProfile: Boolean(gymProfile),
    entries,
    todayEntry,
    missedEntries,
    isDeloadWeek,
    isCurrentWeek,
    activeWeekStart,
    performanceContext,
    loadPlan,
    completeDay,
    skipDay,
    rescheduleDay,
    cancelPlan,
    goToNextWeek,
    goToPrevWeek,
    generateActiveWeek,
  };
}
