import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateSmartWeekPlan, handleMissedDay } from '../../lib/engine/calculateSchedule';
import {
  getWeeklyPlanConfig,
  getActiveWeekPlan,
  saveWeekPlan,
  markDayCompleted,
  markDaySkipped,
  rescheduleMissedDay,
  getMissedEntries,
  getTodayPlanEntry,
  cancelActivePlan,
} from '../../lib/api/weeklyPlanService';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getWeeksSinceLastDeload } from '../../lib/api/overloadService';
import { getAthleteContext, getActiveUserId } from '../../lib/api/athleteContextService';
import { getRecurringActivities } from '../../lib/api/scheduleService';
import { getExerciseLibrary, getRecentExerciseIds, getRecentMuscleVolume } from '../../lib/api/scService';
import { getErrorMessage, logError } from '../../lib/utils/logger';
import { todayLocalDate } from '../../lib/utils/date';
import { getDailyEngineState, getWeeklyMission } from '../../lib/api/dailyMissionService';
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

  const loadPlan = useCallback(async (forceStartDate?: string) => {
    const userId = await getActiveUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const planConfig = await getWeeklyPlanConfig(userId);
      setConfig(planConfig);

      if (!planConfig) {
        setLoading(false);
        return;
      }

      const gym = await getDefaultGymProfile(userId);
      setGymProfile(gym);

      let existingPlan: WeeklyPlanEntryRow[] = [];
      if (!forceStartDate) {
        existingPlan = await getActiveWeekPlan(userId);
      }

      if (!forceStartDate && existingPlan.length > 0) {
        const weeklyMission = await getWeeklyMission(userId, existingPlan[0].week_start_date);
        setEntries(weeklyMission.entries);
        setIsDeloadWeek(weeklyMission.entries.some((entry) => entry.is_deload));

        const today = weeklyMission.entries.find((entry) => entry.date === todayStr())
          ?? await getTodayPlanEntry(userId);
        setTodayEntry(today);

        const missed = await getMissedEntries(userId);
        setMissedEntries(missed);
      } else {
        const weekStart = forceStartDate ?? todayStr();
        await generatePlan(userId, planConfig, gym, weekStart);
      }
    } catch (err: unknown) {
      logError('useWeeklyPlan.loadPlan', err);
      setError(getErrorMessage(err));
    }

    setLoading(false);
  }, []);

  const generatePlan = useCallback(
    async (
      userId: string,
      planConfig: WeeklyPlanConfigRow,
      gym: GymProfileRow | null,
      weekStart: string,
    ) => {
      try {
        const result = await generateAndSaveWeeklyPlan(userId, planConfig, gym, weekStart);
        setWeekPlan(result);
        setEntries(result.entries);
        setIsDeloadWeek(result.isDeloadWeek);
        setTodayEntry(result.entries.find((entry) => entry.date === todayStr()) ?? null);
      } catch (err: unknown) {
        logError('useWeeklyPlan.generatePlan', err, { userId, weekStart });
        setError(getErrorMessage(err));
      }
    },
    [],
  );

  const completeDay = useCallback(async (entryId: string, workoutLogId: string) => {
    try {
      await markDayCompleted(entryId, workoutLogId);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, status: 'completed' as const, workout_log_id: workoutLogId }
            : entry,
        ),
      );
    } catch (err: unknown) {
      logError('useWeeklyPlan.completeDay', err, { entryId, workoutLogId });
    }
  }, []);

  const skipDay = useCallback(async (entryId: string) => {
    try {
      await markDaySkipped(entryId);
      setEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, status: 'skipped' as const } : entry)),
      );
    } catch (err: unknown) {
      logError('useWeeklyPlan.skipDay', err, { entryId });
    }
  }, []);

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

      if (result.redistributedExercises.length > 0) {
        setEntries(result.updatedEntries);

        if (userId) {
          const rescheduledDate = result.updatedEntries[0]?.date;
          if (rescheduledDate) {
            await rescheduleMissedDay(missedEntry.id, rescheduledDate);
          }
        }
      }

      return result;
    },
    [entries],
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
    } catch (err: unknown) {
      logError('useWeeklyPlan.cancelPlan', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
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
    loadPlan,
    completeDay,
    skipDay,
    rescheduleDay,
    cancelPlan,
  };
}

