import { useState, useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '../../lib/supabase';
import { handleMissedDay } from '../../lib/engine/calculateSchedule';
import { generateAdaptiveSmartWeekPlan } from '../../lib/engine/adaptiveTrainingAdapter';
import {
  getWeeklyPlanConfig,
  getActiveWeekPlan,
  saveWeekPlan,
  markDayCompleted,
  markDaySkipped,
  rescheduleMissedDay,
  cancelActivePlan,
} from '../../lib/api/weeklyPlanService';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getWeeksSinceLastDeload } from '../../lib/api/overloadService';
import { getAthleteContext, getActiveUserId } from '../../lib/api/athleteContextService';
import { getRecurringActivities } from '../../lib/api/scheduleService';
import { getExerciseLibrary, getRecentExerciseIds, getRecentMuscleVolume } from '../../lib/api/scService';
import { getErrorMessage, logError } from '../../lib/utils/logger';
import { todayLocalDate, addDays } from '../../lib/utils/date';
import { getDailyEngineState, getWeeklyMission, invalidateEngineDataCache } from '../../lib/api/dailyMissionService';
import { resolveWeeklyPlanWeekStart } from '../../lib/engine/weeklyPlanWeekStart';
import type {
  WeeklyPlanConfigRow,
  WeeklyPlanEntryRow,
  SmartWeekPlanResult,
  ReadinessState,
  CampConfig,
  GymProfileRow,
  MuscleGroup,
  CampPlanRow,
  WeightCutPlanRow,
  TrainingSessionFamily,
  WeeklyTrainingMixPlan,
  WorkoutDoseBucket,
  SessionDoseSummary,
} from '../../lib/engine/types';

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
    weekStartDate: entries[0]?.week_start_date ?? todayStr(),
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

function normalizeCampConfig(raw: CampPlanRow | CampConfig): CampConfig {
  if ('fightDate' in raw && 'campStartDate' in raw) {
    return raw;
  }

  const row = raw as CampPlanRow;
  return {
    id: row.id,
    user_id: row.user_id,
    fightDate: row.fight_date,
    campStartDate: row.camp_start_date,
    totalWeeks: row.total_weeks,
    hasConcurrentCut: row.has_concurrent_cut,
    basePhaseDates: {
      start: row.base_phase_start,
      end: row.base_phase_end,
    },
    buildPhaseDates: {
      start: row.build_phase_start,
      end: row.build_phase_end,
    },
    peakPhaseDates: {
      start: row.peak_phase_start,
      end: row.peak_phase_end,
    },
    taperPhaseDates: {
      start: row.taper_phase_start,
      end: row.taper_phase_end,
    },
    status: row.status,
  };
}

async function getCurrentReadinessContext(
  userId: string,
  date: string = todayStr(),
): Promise<{ readinessState: ReadinessState; acwr: number }> {
  try {
    const engineState = await getDailyEngineState(userId, date);
    return { readinessState: engineState.readinessState, acwr: engineState.acwr.ratio };
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
  if (!gym) {
    throw new Error('Create a default gym profile before generating a workout plan.');
  }

  const readinessContext = await getCurrentReadinessContext(userId, todayStr());
  const athleteContext = await getAthleteContext(userId);

  let campConfig: CampConfig | null = null;
  const { data: campData } = await supabase
    .from('fight_camps')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (campData) {
    campConfig = normalizeCampConfig(campData as CampPlanRow | CampConfig);
  }

  let activeCutPlan: WeightCutPlanRow | null = null;
  if (athleteContext.profile?.active_cut_plan_id) {
    const { data: cutPlan } = await supabase
      .from('weight_cut_plans')
      .select('*')
      .eq('id', athleteContext.profile.active_cut_plan_id)
      .maybeSingle();

    activeCutPlan = (cutPlan as WeightCutPlanRow | null) ?? null;
  }

  const [weeksSinceDeload, recurringActivities, exerciseLibrary, recentExerciseIds, recentMuscleVolume] = await Promise.all([
    getWeeksSinceLastDeload(userId),
    getRecurringActivities(userId),
    getExerciseLibrary(),
    getRecentExerciseIds(userId),
    getRecentMuscleVolume(userId),
  ]);

  if (exerciseLibrary.length === 0) {
    throw new Error('Exercise library is empty. Apply the S&C resource migration before generating a weekly plan.');
  }

  const result = generateAdaptiveSmartWeekPlan({
    config: planConfig,
    readinessState: readinessContext.readinessState,
    phase: athleteContext.phase,
    acwr: readinessContext.acwr,
    fitnessLevel: athleteContext.fitnessLevel,
    performanceGoalType: athleteContext.performanceGoalType,
    exerciseLibrary,
    recentExerciseIds,
    recentMuscleVolume: recentMuscleVolume ?? { ...EMPTY_VOLUME },
    campConfig,
    activeCutPlan,
    weeksSinceLastDeload: weeksSinceDeload,
    gymProfile: gym,
    weekStartDate: weekStart,
    recurringActivities,
  });

  const guidedWithoutPrescription = result.entries.filter((entry) =>
    entry.focus != null && !(entry.prescription_snapshot?.exercises?.length),
  );
  if (guidedWithoutPrescription.length > 0) {
    throw new Error(`Weekly plan generated ${guidedWithoutPrescription.length} guided session(s) without S&C prescriptions.`);
  }

  invalidateEngineDataCache({ userId, weekStart });
  await saveWeekPlan(userId, result.entries);
  invalidateEngineDataCache({ userId, weekStart });
  const weeklyMission = await getWeeklyMission(userId, weekStart, { forceRefresh: true });

  return {
    ...result,
    entries: weeklyMission.entries,
  };
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

  // Derive if the current active week is the "current" chronological week
  const isCurrentWeek = activeWeekStart != null && todayStr() >= activeWeekStart && todayStr() < addDays(activeWeekStart, 7);

  const applyWeeklyMission = useCallback((weeklyMission: Awaited<ReturnType<typeof getWeeklyMission>>) => {
    const nextEntries = weeklyMission.entries;
    const nextIsDeload = nextEntries.some((entry) => entry.is_deload);
    const nextTodayEntry = nextEntries.find((entry) => entry.date === todayStr()) ?? null;
    const nextMissedEntries = nextEntries.filter((entry) => entry.status === 'planned' && entry.date < todayStr());

    setEntries(nextEntries);
    setTodayEntry(nextTodayEntry);
    setMissedEntries(nextMissedEntries);
    setIsDeloadWeek(nextIsDeload);
    setActiveWeekStart(nextEntries[0]?.week_start_date ?? null);
    setWeekPlan({
      entries: nextEntries,
      isDeloadWeek: nextIsDeload,
      deloadReason: null,
      weeklyFocusSplit: {},
      weeklyMixPlan: {
        ...buildWeeklyMixPlanFromSavedEntries(nextEntries, weeklyMission.summary),
      },
      message: weeklyMission.summary,
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
        setLoading(false);
        return;
      }

      const [gym, engineState, latestGeneratedEntries] = await Promise.all([
        getDefaultGymProfile(userId),
        getDailyEngineState(userId, todayStr(), { forceRefresh: Boolean(forceStartDate) }),
        getActiveWeekPlan(userId),
      ]);
      setGymProfile(gym);

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
        const weeklyMission = await getWeeklyMission(userId, weekStart, { forceRefresh: Boolean(forceStartDate) });
        if (gym && shouldRepairUnderfilledWeek(weeklyMission.entries, weekStart)) {
          const repairedWeek = await generateAndSaveWeeklyPlan(userId, planConfig, gym, weekStart);
          applyWeeklyMission({
            entries: repairedWeek.entries.map((entry) => ({
              ...entry,
              daily_mission_snapshot: entry.daily_mission_snapshot ?? null,
            })),
            headline: 'Weekly mission',
            summary: repairedWeek.message,
          });
        } else {
          applyWeeklyMission(weeklyMission);
        }
      }
    } catch (err: unknown) {
      logError('useWeeklyPlan.loadPlan', err);
      setError(getErrorMessage(err));
    }

    setLoading(false);
  }, [activeWeekStart, applyWeeklyMission]);

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
      await generateAndSaveWeeklyPlan(userId, config, gymProfile, activeWeekStart);
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
