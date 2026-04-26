import { useState, useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateSmartWeekPlan, handleMissedDay } from '../../lib/engine/calculateSchedule';
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
import { getDailyEngineState, getWeeklyMission } from '../../lib/api/dailyMissionService';
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

function todayStr(): string {
  return todayLocalDate();
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

  const result = generateSmartWeekPlan({
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

  await saveWeekPlan(userId, result.entries);
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
        weekStartDate: nextEntries[0]?.week_start_date ?? todayStr(),
        weekIntent: weeklyMission.summary,
        sessionTargets: [],
        scDoseSummary: {
          hardSets: 0,
          sprintMeters: 0,
          plyoContacts: 0,
          hiitMinutes: 0,
          aerobicMinutes: 0,
          circuitRounds: 0,
          highImpactCount: 0,
          tissueStressLoad: 0,
        },
        dailyPlacements: [],
        carryForwardAdjustments: [],
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
        applyWeeklyMission(weeklyMission);
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
    entries,
    todayEntry,
    missedEntries,
    gymProfile,
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
