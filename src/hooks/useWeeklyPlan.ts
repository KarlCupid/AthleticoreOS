import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateSmartWeekPlan, handleMissedDay } from '../../lib/engine/calculateSchedule';
import { calculateACWR } from '../../lib/engine/calculateACWR';
import { buildMicrocyclePlan } from '../../lib/engine/calculateMission';
import { calculateNutritionTargets } from '../../lib/engine/calculateNutrition';
import { getHydrationProtocol } from '../../lib/engine/getHydrationProtocol';
import { getGlobalReadinessState } from '../../lib/engine/getGlobalReadinessState';
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
import { getAthleteContext, getActiveUserId, normalizeActivityLevel, normalizeNutritionGoal } from '../../lib/api/athleteContextService';
import { getRecurringActivities } from '../../lib/api/scheduleService';
import { getExerciseLibrary, getRecentExerciseIds } from '../../lib/api/scService';
import { getErrorMessage, logError } from '../../lib/utils/logger';
import { todayLocalDate } from '../../lib/utils/date';
import { resolveObjectiveContext } from '../../lib/api/dailyMissionService';
import type {
  WeeklyPlanConfigRow,
  WeeklyPlanEntryRow,
  SmartWeekPlanResult,
  ReadinessState,
  CampConfig,
  HydrationResult,
  GymProfileRow,
  MuscleGroup,
  CampPlanRow,
  WeightCutPlanRow,
  ResolvedNutritionTargets,
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
  const athleteContext = await getAthleteContext(userId);

  let acwr = 1.0;
  try {
    const acwrResult = await calculateACWR({
      userId,
      supabaseClient: supabase,
      asOfDate: date,
      fitnessLevel: athleteContext.fitnessLevel,
      phase: athleteContext.phase,
      isOnActiveCut: athleteContext.isOnActiveCut,
    });
    acwr = acwrResult.ratio;
  } catch (error) {
    logError('useWeeklyPlan.getCurrentReadinessContext.calculateACWR', error, { userId, date });
  }

  const { data: checkin } = await supabase
    .from('daily_checkins')
    .select('sleep_quality, readiness')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const readinessState = getGlobalReadinessState({
    sleep: checkin?.sleep_quality ?? 4,
    readiness: checkin?.readiness ?? 4,
    acwr,
  });

  return { readinessState, acwr };
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

  const [weeksSinceDeload, recurringActivities, exerciseLibrary, recentExerciseIds] = await Promise.all([
    getWeeksSinceLastDeload(userId),
    getRecurringActivities(userId),
    getExerciseLibrary(),
    getRecentExerciseIds(userId),
  ]);

  const result = generateSmartWeekPlan({
    config: planConfig,
    readinessState: readinessContext.readinessState,
    phase: athleteContext.phase,
    acwr: readinessContext.acwr,
    fitnessLevel: athleteContext.fitnessLevel,
    exerciseLibrary,
    recentExerciseIds,
    recentMuscleVolume: { ...EMPTY_VOLUME },
    campConfig,
    activeCutPlan,
    weeksSinceLastDeload: weeksSinceDeload,
    gymProfile: gym,
    weekStartDate: weekStart,
    recurringActivities,
  });

  const objectiveContext = await resolveObjectiveContext(userId, weekStart);

  let baseNutritionTargets: ResolvedNutritionTargets = {
    tdee: 0,
    adjustedCalories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    proteinModifier: 1,
    phaseMultiplier: 0,
    weightCorrectionDeficit: 0,
    message: '',
    source: 'base',
  };
  let hydration: HydrationResult = {
    dailyWaterOz: 100,
    waterLoadOz: null,
    shedCapPercent: 3,
    shedCapLbs: 0,
    message: 'Stay consistent with hydration this week.',
  };

  if (athleteContext.profile && objectiveContext.currentWeightLbs != null) {
    const baseTargets = calculateNutritionTargets({
      weightLbs: objectiveContext.currentWeightLbs,
      heightInches: athleteContext.profile.height_inches ?? null,
      age: athleteContext.profile.age ?? null,
      biologicalSex: athleteContext.profile.biological_sex ?? 'male',
      activityLevel: normalizeActivityLevel(athleteContext.profile.activity_level),
      phase: objectiveContext.phase,
      nutritionGoal: normalizeNutritionGoal(athleteContext.profile.nutrition_goal),
      cycleDay: null,
      coachProteinOverride: athleteContext.profile.coach_protein_override ?? null,
      coachCarbsOverride: athleteContext.profile.coach_carbs_override ?? null,
      coachFatOverride: athleteContext.profile.coach_fat_override ?? null,
      coachCaloriesOverride: athleteContext.profile.coach_calories_override ?? null,
    });
    baseNutritionTargets = {
      ...baseTargets,
      source: 'base',
    };
    hydration = getHydrationProtocol({
      phase: objectiveContext.phase,
      fightStatus: athleteContext.profile.fight_status ?? 'amateur',
      currentWeightLbs: objectiveContext.currentWeightLbs,
      targetWeightLbs: objectiveContext.targetWeightLbs ?? objectiveContext.currentWeightLbs,
      weeklyVelocityLbs: objectiveContext.weightTrend?.weeklyVelocityLbs,
    });
  }

  const weeklyMission = buildMicrocyclePlan({
    entries: result.entries,
    macrocycleContext: objectiveContext,
    readinessState: readinessContext.readinessState,
    acwr: {
      ratio: readinessContext.acwr,
      acute: 0,
      chronic: 0,
      status: readinessContext.acwr >= 1.5 ? 'redline' : readinessContext.acwr >= 1.3 ? 'caution' : 'safe',
      message: '',
      daysOfData: 0,
      thresholds: {
        caution: 1.3,
        redline: 1.5,
        confidence: 'low',
        personalizationFactors: [],
      },
      loadMetrics: {
        weeklyLoad: 0,
        monotony: 0,
        strain: 0,
        rollingFatigueRatio: 0,
        rollingFatigueScore: 0,
        fatigueBand: 'low',
      },
    },
    baseNutritionTargets,
    hydration,
  });

  await saveWeekPlan(userId, weeklyMission.entries);
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
        setEntries(existingPlan);
        setIsDeloadWeek(existingPlan.some((entry) => entry.is_deload));

        const today = await getTodayPlanEntry(userId);
        setTodayEntry(today);

        const missed = await getMissedEntries(userId);
        setMissedEntries(missed);
      } else {
        const weekStart = forceStartDate ?? todayStr();
        await generatePlan(userId, planConfig, gym, weekStart);

        const today = await getTodayPlanEntry(userId);
        setTodayEntry(today);
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

