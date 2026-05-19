import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getActiveUserId } from '../../lib/api/athleteContextService';
import { generateAndSaveBoxingWeeklyPlan } from '../../lib/api/boxingWeeklyPlanService';
import { getDailyEngineState } from '../../lib/api/dailyPerformanceService';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getScheduledActivities, getTrainingStreakDays } from '../../lib/api/scheduleService';
import { getWeeklyPlanEntriesForRange } from '../../lib/api/weeklyPlanReadService';
import { getWeeklyPlanConfig, rescheduleMissedDay } from '../../lib/api/weeklyPlanService';
import { supabase } from '../../lib/supabase';
import { detectOvertrainingRisk, handleMissedDay } from '../../lib/engine/calculateSchedule';
import {
  buildPlanCalendarScheduleItems,
  getPlanCalendarItemDots,
  getPlanCalendarItemMetrics,
  type PlanCalendarItemMetrics,
  type PlanCalendarScheduleItem,
} from '../../lib/engine/presentation';
import type {
  OvertrainingWarning,
  ScheduledActivityRow,
  WeeklyPlanConfigRow,
  WeeklyPlanEntryRow,
} from '../../lib/engine/types';
import {
  buildUnifiedPerformanceViewModel,
  type UnifiedPerformanceViewModel,
} from '../../lib/performance-engine';
import { addDays, formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { getErrorMessage, logError } from '../../lib/utils/logger';

interface UsePlanCalendarDataInput {
  currentMonth: Date;
  visibleWeekStart: string;
  selectedDate: string;
}

interface LoadOptions {
  forceRefresh?: boolean;
  refresh?: boolean;
}

interface PlanCalendarDataState {
  items: PlanCalendarScheduleItem[];
  planEntries: WeeklyPlanEntryRow[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  config: WeeklyPlanConfigRow | null;
  hasDefaultGymProfile: boolean;
  missedEntries: WeeklyPlanEntryRow[];
  performanceContext: UnifiedPerformanceViewModel;
  warnings: OvertrainingWarning[];
  streak: number;
}

const EMPTY_METRICS: PlanCalendarItemMetrics = {
  scheduledDays: 0,
  plannedMinutes: 0,
  protectedAnchors: 0,
  totalItems: 0,
};

function monthBounds(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

function visibleRange(currentMonth: Date, visibleWeekStart: string, selectedDate: string): { start: string; end: string } {
  const month = monthBounds(currentMonth);
  const weekEnd = addDays(visibleWeekStart, 6);
  return {
    start: [month.start, visibleWeekStart, selectedDate].sort()[0],
    end: [month.end, weekEnd, selectedDate].sort()[2],
  };
}

function replaceRowsForSelectedDate<T extends { id: string; date: string }>(
  rows: readonly T[],
  selectedDate: string,
  selectedRows: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    if (row.date !== selectedDate) byId.set(row.id, row);
  }
  for (const row of selectedRows) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function activityTypeForItem(item: PlanCalendarScheduleItem): ScheduledActivityRow['activity_type'] {
  const raw = item.activityType ?? item.sessionType ?? item.dotType;
  switch (raw) {
    case 'boxing_practice':
    case 'sparring':
    case 'sc':
    case 'running':
    case 'road_work':
    case 'conditioning':
    case 'active_recovery':
    case 'rest':
    case 'other':
      return raw;
    default:
      return 'other';
  }
}

function buildWarningActivities(items: readonly PlanCalendarScheduleItem[]): Pick<
  ScheduledActivityRow,
  'activity_type' | 'expected_intensity' | 'estimated_duration_min' | 'date'
>[] {
  return items.map((item) => ({
    date: item.date,
    activity_type: activityTypeForItem(item),
    expected_intensity: item.intensity ?? 5,
    estimated_duration_min: item.durationMin,
  }));
}

function initialState(): PlanCalendarDataState {
  return {
    items: [],
    planEntries: [],
    loading: true,
    refreshing: false,
    error: null,
    config: null,
    hasDefaultGymProfile: false,
    missedEntries: [],
    performanceContext: buildUnifiedPerformanceViewModel(null),
    warnings: [],
    streak: 0,
  };
}

export function usePlanCalendarData({
  currentMonth,
  visibleWeekStart,
  selectedDate,
}: UsePlanCalendarDataInput) {
  const [state, setState] = useState<PlanCalendarDataState>(() => initialState());
  const [regenerating, setRegenerating] = useState(false);
  const loadRequestIdRef = useRef(0);

  useEffect(() => () => {
    loadRequestIdRef.current += 1;
  }, []);

  const loadData = useCallback(async (options: LoadOptions = {}) => {
    const requestId = ++loadRequestIdRef.current;
    setState((prev) => ({
      ...prev,
      loading: !options.refresh,
      refreshing: Boolean(options.refresh),
      error: null,
    }));

    const userId = await getActiveUserId();
    if (!userId) {
      if (requestId !== loadRequestIdRef.current) return;
      setState({
        ...initialState(),
        loading: false,
      });
      return;
    }

    const range = visibleRange(currentMonth, visibleWeekStart, selectedDate);
    const weekEnd = addDays(visibleWeekStart, 6);

    try {
      const [
        config,
        defaultGymProfile,
        dailyState,
        rangePlanEntries,
        rangeActivities,
        recentCheckinsResult,
        streak,
      ] = await Promise.all([
        getWeeklyPlanConfig(userId),
        getDefaultGymProfile(userId),
        getDailyEngineState(userId, selectedDate, { forceRefresh: Boolean(options.forceRefresh) }),
        getWeeklyPlanEntriesForRange(userId, range.start, range.end),
        getScheduledActivities(userId, range.start, range.end),
        supabase
          .from('daily_checkins')
          .select('sleep_quality')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(3),
        getTrainingStreakDays(userId),
      ]);

      if (recentCheckinsResult.error) throw recentCheckinsResult.error;

      const planEntries = replaceRowsForSelectedDate(
        rangePlanEntries,
        selectedDate,
        dailyState.weeklyPlanEntries,
      );
      const activities = replaceRowsForSelectedDate(
        rangeActivities,
        selectedDate,
        dailyState.scheduledActivities,
      );
      const items = buildPlanCalendarScheduleItems(planEntries, activities);
      const visibleWeekItems = items.filter((item) => item.date >= visibleWeekStart && item.date <= weekEnd);
      const sleepRows = (recentCheckinsResult.data ?? []) as Array<{ sleep_quality: number | null }>;
      const sleepAvg = sleepRows.length > 0
        ? sleepRows.reduce((sum, row) => sum + (row.sleep_quality ?? 3), 0) / sleepRows.length
        : 0;

      if (requestId !== loadRequestIdRef.current) return;
      setState({
        items,
        planEntries,
        loading: false,
        refreshing: false,
        error: null,
        config,
        hasDefaultGymProfile: Boolean(defaultGymProfile),
        missedEntries: planEntries.filter((entry) => entry.status === 'planned' && entry.date < todayLocalDate()),
        performanceContext: buildUnifiedPerformanceViewModel(dailyState.unifiedPerformance),
        warnings: detectOvertrainingRisk(buildWarningActivities(visibleWeekItems), dailyState.acwr.ratio, sleepAvg).slice(0, 3),
        streak,
      });
    } catch (error) {
      logError('usePlanCalendarData.loadData', error, { selectedDate, visibleWeekStart });
      if (requestId !== loadRequestIdRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: getErrorMessage(error) || 'Could not load your planning calendar.',
      }));
    }
  }, [currentMonth, selectedDate, visibleWeekStart]);

  const refresh = useCallback(() => {
    void loadData({ forceRefresh: true, refresh: true });
  }, [loadData]);

  const cancelLoad = useCallback(() => {
    loadRequestIdRef.current += 1;
  }, []);

  const dismissWarning = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      warnings: prev.warnings.filter((_, warningIndex) => warningIndex !== index),
    }));
  }, []);

  const rescheduleFirstMissedEntry = useCallback(async () => {
    const missedEntry = state.missedEntries[0];
    if (!missedEntry) return;

    const userId = await getActiveUserId();
    if (!userId) return;

    try {
      const todayState = await getDailyEngineState(userId, todayLocalDate(), { forceRefresh: true });
      const result = handleMissedDay({
        missedEntry,
        remainingEntries: state.planEntries.filter((entry) => entry.status === 'planned'),
        readinessState: todayState.readinessState,
        acwr: todayState.acwr.ratio,
      });

      const originalEntriesById = new Map(state.planEntries.map((entry) => [entry.id, entry]));
      const rescheduledDate = result.updatedEntries.find((updatedEntry) => {
        if (updatedEntry.id === missedEntry.id) return false;
        const original = originalEntriesById.get(updatedEntry.id);
        return original
          && updatedEntry.date >= todayLocalDate()
          && (
            updatedEntry.estimated_duration_min !== original.estimated_duration_min
            || updatedEntry.engine_notes !== original.engine_notes
            || updatedEntry.prescription_snapshot !== original.prescription_snapshot
          );
      })?.date;
      if (result.redistributedExercises.length > 0 && rescheduledDate) {
        await rescheduleMissedDay(missedEntry.id, rescheduledDate);
        await loadData({ forceRefresh: true, refresh: true });
      }
    } catch (error) {
      logError('usePlanCalendarData.rescheduleFirstMissedEntry', error, { missedEntryId: missedEntry.id });
      setState((prev) => ({
        ...prev,
        error: getErrorMessage(error) || 'Could not reschedule the missed session.',
      }));
    }
  }, [loadData, state.missedEntries, state.planEntries]);

  const regenerateVisibleWeek = useCallback(async (weekStart: string = visibleWeekStart): Promise<boolean> => {
    const userId = await getActiveUserId();
    if (!userId) return false;

    setRegenerating(true);
    setState((prev) => ({
      ...prev,
      error: null,
    }));

    try {
      const [planConfig, gymProfile] = await Promise.all([
        getWeeklyPlanConfig(userId),
        getDefaultGymProfile(userId),
      ]);

      if (!planConfig) {
        throw new Error('Set up a plan before generating a workout schedule.');
      }
      if (!gymProfile) {
        throw new Error('Set up a default gym profile before generating a workout schedule.');
      }

      const result = await generateAndSaveBoxingWeeklyPlan(userId, planConfig, gymProfile, weekStart);
      if (result.entries.length === 0) {
        throw new Error('Workout schedule generation completed without entries.');
      }

      await loadData({ forceRefresh: true, refresh: true });
      return true;
    } catch (error) {
      logError('usePlanCalendarData.regenerateVisibleWeek', error, { weekStart });
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: getErrorMessage(error) || 'Could not generate a new workout schedule.',
      }));
      return false;
    } finally {
      setRegenerating(false);
    }
  }, [loadData, visibleWeekStart]);

  const selectedDayItems = useMemo(
    () => state.items.filter((item) => item.date === selectedDate),
    [selectedDate, state.items],
  );
  const visibleWeekItems = useMemo(
    () => state.items.filter((item) => item.date >= visibleWeekStart && item.date <= addDays(visibleWeekStart, 6)),
    [state.items, visibleWeekStart],
  );
  const activityDots = useMemo(
    () => getPlanCalendarItemDots(state.items),
    [state.items],
  );
  const metrics = useMemo(
    () => state.items.length > 0 ? getPlanCalendarItemMetrics(state.items) : EMPTY_METRICS,
    [state.items],
  );

  return {
    ...state,
    selectedDayItems,
    visibleWeekItems,
    activityDots,
    metrics,
    regenerating,
    loadData,
    refresh,
    cancelLoad,
    dismissWarning,
    rescheduleFirstMissedEntry,
    regenerateVisibleWeek,
  };
}
