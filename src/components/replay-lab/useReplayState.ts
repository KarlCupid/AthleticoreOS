import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ENGINE_REPLAY_SCENARIOS,
  buildEngineReplayRun,
  type EngineReplayDay,
  type EngineReplayRun,
} from '../../../lib/engine/simulation/lab';
import { average, chunkWeeks, clamp, type ChartWindowSize, type ReplayTab } from './helpers';

export interface WorkoutStats {
  completedExerciseCount: number;
  prescribedExerciseCount: number;
  completionRate: number;
  plannedSetCount: number;
  completedSetCount: number;
  averageLoggedRpe: number;
  averagePrescribedRpe: number;
  conditioningCompletionRate: number;
}

export function useReplayState(visible: boolean) {
  const [scenarioId, setScenarioId] = useState(ENGINE_REPLAY_SCENARIOS[0]?.id ?? '');
  const [run, setRun] = useState<EngineReplayRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [tab, setTab] = useState<ReplayTab>('overview');
  const [chartWindowSize, setChartWindowSize] = useState<ChartWindowSize>('all');
  const [chartWindowStart, setChartWindowStart] = useState(0);

  // ---- Actions ----

  const executeReplay = useCallback(async (nextScenarioId: string) => {
    setLoading(true);
    setError(null);
    setRun(null);
    setSelectedDayIndex(0);
    setTab('overview');
    setChartWindowStart(0);

    try {
      const nextRun = await buildEngineReplayRun(nextScenarioId);
      setRun(nextRun);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Replay failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void executeReplay(scenarioId);
  }, [visible]);

  // ---- Derived ----

  const selectedDay: EngineReplayDay | null = run?.days[selectedDayIndex] ?? null;
  const weeks = useMemo(() => chunkWeeks(run?.days ?? []), [run]);
  const selectedWeekIndex = selectedDay ? Math.floor(selectedDay.index / 7) : 0;
  const selectedWeek = weeks[selectedWeekIndex] ?? null;

  const chartWindowLength = chartWindowSize === 'all' ? (run?.chartData.length ?? 0) : chartWindowSize;
  const maxChartWindowStart = Math.max(0, (run?.chartData.length ?? 0) - Math.max(chartWindowLength, 1));

  const chartWindowData = useMemo(() => {
    if (!run) return [];
    if (chartWindowSize === 'all') {
      return run.chartData.map((point, index) => ({ ...point, x: index }));
    }
    return run.chartData
      .slice(chartWindowStart, chartWindowStart + chartWindowLength)
      .map((point, index) => ({ ...point, x: index }));
  }, [run, chartWindowSize, chartWindowStart, chartWindowLength]);

  useEffect(() => {
    setChartWindowStart((current) => clamp(current, 0, maxChartWindowStart));
  }, [maxChartWindowStart]);

  // Workout stats for selected day
  const workoutStats: WorkoutStats = useMemo(() => {
    if (!selectedDay) {
      return { completedExerciseCount: 0, prescribedExerciseCount: 0, completionRate: 0, plannedSetCount: 0, completedSetCount: 0, averageLoggedRpe: 0, averagePrescribedRpe: 0, conditioningCompletionRate: 0 };
    }

    const completedExerciseCount = selectedDay.exerciseLogs.filter((e) => e.completed).length;
    const prescribedExerciseCount = selectedDay.prescribedExercises.length;
    const completionRate = prescribedExerciseCount > 0 ? Math.round((completedExerciseCount / prescribedExerciseCount) * 100) : 0;
    const plannedSetCount = selectedDay.prescribedExercises.reduce((sum, e) => sum + e.targetSets, 0);
    const completedSetCount = selectedDay.exerciseLogs.reduce((sum, e) => sum + e.completedSets, 0);
    const averageLoggedRpe = average(selectedDay.exerciseLogs.filter((e) => e.actualRpe != null).map((e) => e.actualRpe ?? 0));
    const averagePrescribedRpe = average(selectedDay.prescribedExercises.map((e) => e.targetRpe));
    const conditioningCompletionRate = selectedDay.conditioningLog != null ? Math.round(selectedDay.conditioningLog.completionRate * 100) : 0;

    return { completedExerciseCount, prescribedExerciseCount, completionRate, plannedSetCount, completedSetCount, averageLoggedRpe, averagePrescribedRpe, conditioningCompletionRate };
  }, [selectedDay]);

  // ---- Chart navigation ----

  const setChartZoom = useCallback((nextWindow: ChartWindowSize) => {
    if (!run) {
      setChartWindowSize(nextWindow);
      return;
    }
    const nextLength = nextWindow === 'all' ? run.chartData.length : nextWindow;
    const centeredStart = clamp(selectedDayIndex - Math.floor(nextLength / 2), 0, Math.max(0, run.chartData.length - nextLength));
    setChartWindowSize(nextWindow);
    setChartWindowStart(nextWindow === 'all' ? 0 : centeredStart);
  }, [run, selectedDayIndex]);

  const jumpDay = useCallback((delta: number) => {
    if (!run) return;
    setSelectedDayIndex((current) => {
      const next = Math.max(0, Math.min(run.days.length - 1, current + delta));
      // Auto-center chart when selected day moves outside the window
      if (chartWindowSize !== 'all') {
        const windowEnd = chartWindowStart + chartWindowLength;
        if (next < chartWindowStart || next >= windowEnd) {
          const centeredStart = clamp(next - Math.floor(chartWindowLength / 2), 0, Math.max(0, run.chartData.length - chartWindowLength));
          setChartWindowStart(centeredStart);
        }
      }
      return next;
    });
  }, [run, chartWindowSize, chartWindowStart, chartWindowLength]);

  const selectDay = useCallback((index: number) => {
    setSelectedDayIndex(index);
    // Auto-center chart when selecting a day outside the current window
    if (run && chartWindowSize !== 'all') {
      const windowEnd = chartWindowStart + chartWindowLength;
      if (index < chartWindowStart || index >= windowEnd) {
        const centeredStart = clamp(index - Math.floor(chartWindowLength / 2), 0, Math.max(0, run.chartData.length - chartWindowLength));
        setChartWindowStart(centeredStart);
      }
    }
  }, [run, chartWindowSize, chartWindowStart, chartWindowLength]);

  return {
    // State
    scenarioId,
    setScenarioId,
    run,
    loading,
    error,
    selectedDayIndex,
    selectedDay,
    tab,
    setTab,
    chartWindowSize,
    chartWindowData,

    // Derived
    weeks,
    selectedWeekIndex,
    selectedWeek,
    workoutStats,

    // Actions
    executeReplay,
    setChartZoom,
    jumpDay,
    selectDay,
  };
}
