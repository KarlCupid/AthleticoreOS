import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ENGINE_REPLAY_SCENARIOS,
  buildEngineReplayRun,
  type EngineReplayDay,
  type EngineReplayRun,
} from '../../../lib/engine/simulation/lab';
import type { MetricTone } from './styles';
import { average, chunkWeeks, clamp, formatDate, formatPhase, formatSignedNumber, type ChartWindowSize } from './helpers';

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

export interface ReplayDayRailItem {
  index: number;
  dateLabel: string;
  title: string;
  sessionLabel: string;
  preview: string;
  riskLevel: EngineReplayDay['riskLevel'];
  engineDangerDay: boolean;
  athleteOverrideDay: boolean;
  isMandatoryRecovery: boolean;
}

export interface ReplayWeekRail {
  index: number;
  label: string;
  rangeLabel: string;
  flagsLabel: string | null;
  days: ReplayDayRailItem[];
}

export interface ReplayQuickStat {
  label: string;
  value: string;
  tone?: MetricTone;
}

export function useReplayState(visible: boolean) {
  const [scenarioId, setScenarioId] = useState(ENGINE_REPLAY_SCENARIOS[0]?.id ?? '');
  const [run, setRun] = useState<EngineReplayRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [expandedWeekIndex, setExpandedWeekIndex] = useState(0);
  const [chartWindowSize, setChartWindowSize] = useState<ChartWindowSize>('all');
  const [chartWindowStart, setChartWindowStart] = useState(0);

  const generateReplaySeed = useCallback(() => {
    const timestampSeed = Date.now() >>> 0;
    const jitter = Math.floor(Math.random() * 0xffffffff) >>> 0;
    return (timestampSeed ^ jitter) >>> 0;
  }, []);

  // ---- Actions ----

  const findPreferredDayIndex = useCallback((nextRun: EngineReplayRun): number => {
    const interestingIndex = nextRun.days.findIndex((day) =>
      day.workoutType === 'conditioning'
      || day.conditioningPrescription != null
      || day.prescribedExercises.some((entry) => {
        const scheme = entry.setScheme?.toLowerCase() ?? '';
        return scheme.includes('emom')
          || scheme.includes('amrap')
          || scheme.includes('tabata')
          || scheme.includes('for time');
      }),
    );
    return interestingIndex >= 0 ? interestingIndex : 0;
  }, []);

  const executeReplay = useCallback(async (nextScenarioId: string) => {
    setLoading(true);
    setError(null);
    setRun(null);
    setSelectedDayIndex(0);
    setExpandedWeekIndex(0);
    setChartWindowStart(0);

    try {
      const nextRun = await buildEngineReplayRun(nextScenarioId, {
        seedOverride: generateReplaySeed(),
      });
      const preferredIndex = findPreferredDayIndex(nextRun);
      setRun(nextRun);
      setSelectedDayIndex(preferredIndex);
      setExpandedWeekIndex(Math.floor(preferredIndex / 7));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Replay failed.');
    } finally {
      setLoading(false);
    }
  }, [findPreferredDayIndex, generateReplaySeed]);

  useEffect(() => {
    if (visible) void executeReplay(scenarioId);
  }, [executeReplay, scenarioId, visible]);

  // ---- Derived ----

  const selectedDay: EngineReplayDay | null = run?.days[selectedDayIndex] ?? null;
  const weeks = useMemo(() => chunkWeeks(run?.days ?? []), [run]);
  const railWeeks: ReplayWeekRail[] = useMemo(() => (
    weeks.map((week) => {
      const engineDangerDays = week.days.filter((day) => day.engineDangerDay).length;
      const overrideDays = week.days.filter((day) => day.athleteOverrideDay).length;
      const mandatoryRecoveryDays = week.days.filter((day) => day.isMandatoryRecovery).length;
      const flags = [
        engineDangerDays > 0 ? `${engineDangerDays} danger` : null,
        overrideDays > 0 ? `${overrideDays} override` : null,
        mandatoryRecoveryDays > 0 ? `${mandatoryRecoveryDays} recovery` : null,
      ].filter(Boolean);

      return {
        index: week.index,
        label: `Week ${week.index + 1}`,
        rangeLabel: `${formatDate(week.days[0]?.date ?? '')} - ${formatDate(week.days[week.days.length - 1]?.date ?? '')}`,
        flagsLabel: flags.length > 0 ? flags.join(' | ') : null,
        days: week.days.map((day) => ({
          index: day.index,
          dateLabel: formatDate(day.date),
          title: day.workoutTitle || 'Untitled session',
          sessionLabel: buildSessionLabel(day),
          preview: buildDayPreview(day),
          riskLevel: day.riskLevel,
          engineDangerDay: day.engineDangerDay,
          athleteOverrideDay: day.athleteOverrideDay,
          isMandatoryRecovery: day.isMandatoryRecovery,
        })),
      };
    })
  ), [weeks]);

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
    const sessionExerciseCount = selectedDay.workoutSession?.sections.reduce((sum, section) => sum + section.exercises.length, 0) ?? 0;
    const prescribedExerciseCount = sessionExerciseCount > 0 ? sessionExerciseCount : selectedDay.prescribedExercises.length;
    const completionRate = prescribedExerciseCount > 0 ? Math.round((completedExerciseCount / prescribedExerciseCount) * 100) : 0;
    const plannedSetCount = selectedDay.prescribedExercises.reduce((sum, e) => sum + e.targetSets, 0);
    const completedSetCount = selectedDay.exerciseLogs.reduce((sum, e) => sum + e.completedSets, 0);
    const averageLoggedRpe = average(selectedDay.exerciseLogs.filter((e) => e.actualRpe != null).map((e) => e.actualRpe ?? 0));
    const averagePrescribedRpe = average(selectedDay.prescribedExercises.map((e) => e.targetRpe));
    const conditioningCompletionRate = selectedDay.conditioningLog != null ? Math.round(selectedDay.conditioningLog.completionRate * 100) : 0;

    return { completedExerciseCount, prescribedExerciseCount, completionRate, plannedSetCount, completedSetCount, averageLoggedRpe, averagePrescribedRpe, conditioningCompletionRate };
  }, [selectedDay]);

  const quickStats: ReplayQuickStat[] = useMemo(() => {
    if (!selectedDay) return [];

    const loadDelta = selectedDay.actualLoad - selectedDay.prescribedLoad;
    const calorieDelta = selectedDay.actualCalories - selectedDay.prescribedCalories;

    return [
      {
        label: 'Ready',
        value: `${selectedDay.readinessLogged}/5`,
        tone: selectedDay.readinessLogged >= 4 ? 'good' : selectedDay.readinessLogged <= 2 ? 'warning' : 'default',
      },
      {
        label: 'Sleep',
        value: `${selectedDay.sleepLogged}/5`,
        tone: selectedDay.sleepLogged >= 4 ? 'good' : selectedDay.sleepLogged <= 2 ? 'warning' : 'default',
      },
      {
        label: 'ACWR',
        value: selectedDay.acwrRatio.toFixed(2),
        tone: selectedDay.acwrRatio > 1.3 ? 'warning' : selectedDay.acwrRatio >= 0.8 ? 'good' : 'default',
      },
      {
        label: 'Intervention',
        value: formatPhase(selectedDay.interventionState),
        tone: selectedDay.interventionState === 'none' ? 'good' : 'default',
      },
      {
        label: 'Warm-up',
        value: selectedDay.didWarmup ? 'Done' : 'Missed',
        tone: selectedDay.didWarmup ? 'good' : 'warning',
      },
      {
        label: 'Load Delta',
        value: formatSignedNumber(loadDelta, 0),
        tone: Math.abs(loadDelta) <= 10 ? 'good' : loadDelta > 25 ? 'warning' : 'default',
      },
      {
        label: 'Fuel Delta',
        value: formatSignedNumber(calorieDelta, 0, ' kcal'),
        tone: Math.abs(calorieDelta) <= 50 ? 'good' : Math.abs(calorieDelta) > 200 ? 'warning' : 'default',
      },
    ];
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
      setExpandedWeekIndex(Math.floor(next / 7));
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
    setExpandedWeekIndex(Math.floor(index / 7));
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
    expandedWeekIndex,
    chartWindowSize,
    chartWindowData,

    // Derived
    railWeeks,
    workoutStats,
    quickStats,

    // Actions
    executeReplay,
    setChartZoom,
    setExpandedWeekIndex,
    jumpDay,
    selectDay,
  };
}

function buildDayPreview(day: EngineReplayDay) {
  if (day.prescriptionPreview[0]) return day.prescriptionPreview[0];
  if (day.conditioningPrescription?.message) return day.conditioningPrescription.message;
  if (day.prescribedExercises[0]) {
    const firstExercise = day.prescribedExercises[0].exerciseName;
    const remainingCount = Math.max(day.prescribedExercises.length - 1, 0);
    return remainingCount > 0 ? `${firstExercise} + ${remainingCount} more` : firstExercise;
  }
  if (day.workoutBlueprint) return day.workoutBlueprint;
  if (day.summary) return day.summary;
  return 'No workout preview recorded.';
}

function buildSessionLabel(day: EngineReplayDay) {
  const workoutLabel = formatPhase(day.workoutType ?? day.sessionRole);
  const roleLabel = formatPhase(day.sessionRole);
  return workoutLabel === roleLabel ? workoutLabel : `${workoutLabel} | ${roleLabel}`;
}
