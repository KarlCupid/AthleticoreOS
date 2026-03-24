import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, CartesianChart, Line } from 'victory-native';

import {
  ENGINE_REPLAY_SCENARIOS,
  buildEngineReplayRun,
  type EngineReplayDay,
  type EngineReplayExerciseLog,
  type EngineReplayFinding,
  type EngineReplayPrescribedExercise,
  type EngineReplayRun,
} from '../../lib/engine/simulation/lab.ts';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

interface EngineReplayLabProps {
  visible: boolean;
  onClose: () => void;
}

type ReplayTab = 'overview' | 'workout' | 'fuel' | 'decisions';
type ChartWindowSize = 7 | 14 | 28 | 'all';

function formatPhase(value: string) {
  return value.replace(/[-_]/g, ' ');
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function severityColors(severity: EngineReplayFinding['severity']) {
  if (severity === 'danger') return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
  if (severity === 'warning') return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
  return { bg: COLORS.surfaceSecondary, fg: COLORS.text.secondary };
}

function riskColors(level: EngineReplayDay['riskLevel']) {
  if (level === 'critical') return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
  if (level === 'high') return { bg: '#FDE8E8', fg: COLORS.error };
  if (level === 'moderate') return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
  return { bg: COLORS.readiness.primeLight, fg: COLORS.readiness.prime };
}

function chunkWeeks(days: EngineReplayDay[]) {
  const weeks: Array<{ index: number; days: EngineReplayDay[] }> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ index: weeks.length, days: days.slice(i, i + 7) });
  }
  return weeks;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value: number, decimals = 0, suffix = '') {
  return `${value.toFixed(decimals)}${suffix}`;
}

function formatSignedNumber(value: number, decimals = 0, suffix = '') {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}${suffix}`;
}

function summarizeMetric(data: EngineReplayRun['chartData'], key: keyof EngineReplayRun['chartData'][number]) {
  const values = data.map((point) => Number(point[key]));
  return {
    first: values[0] ?? 0,
    last: values[values.length - 1] ?? 0,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: average(values),
    delta: (values[values.length - 1] ?? 0) - (values[0] ?? 0),
  };
}

function findExtremePoint(
  data: EngineReplayRun['chartData'],
  key: keyof EngineReplayRun['chartData'][number],
  mode: 'min' | 'max',
) {
  const sorted = [...data].sort((left, right) => (
    mode === 'min'
      ? Number(left[key]) - Number(right[key])
      : Number(right[key]) - Number(left[key])
  ));
  return sorted[0] ?? null;
}

function summarizeGap(data: EngineReplayRun['chartData'], actualKey: 'actualCalories' | 'actualLoad', targetKey: 'prescribedCalories' | 'prescribedLoad') {
  const gaps = data.map((point) => point[actualKey] - point[targetKey]);
  return {
    avgGap: average(gaps),
    biggestSurplus: Math.max(...gaps),
    biggestDeficit: Math.min(...gaps),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ChartStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warning';
}) {
  return (
    <View
      style={[
        styles.chartStat,
        tone === 'good' && styles.chartStatGood,
        tone === 'warning' && styles.chartStatWarning,
      ]}
    >
      <Text style={styles.chartStatLabel}>{label}</Text>
      <Text style={styles.chartStatValue}>{value}</Text>
    </View>
  );
}

function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.chartLegendItem}>
      <View style={[styles.chartLegendDot, { backgroundColor: color }]} />
      <Text style={styles.chartLegendText}>{label}</Text>
    </View>
  );
}

function ChartDateAxis({ data }: { data: EngineReplayRun['chartData'] }) {
  if (data.length === 0) return null;

  const midIndex = Math.floor((data.length - 1) / 2);

  return (
    <View style={styles.chartDateAxis}>
      <Text style={styles.chartDateText}>{data[0]?.label ?? '--'}</Text>
      <Text style={styles.chartDateText}>{data[midIndex]?.label ?? '--'}</Text>
      <Text style={styles.chartDateText}>{data[data.length - 1]?.label ?? '--'}</Text>
    </View>
  );
}

function ScenarioButton({
  selected,
  label,
  description,
  onPress,
}: {
  selected: boolean;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.scenarioButton, selected && styles.scenarioButtonSelected]}>
      <Text style={[styles.scenarioTitle, selected && styles.scenarioTitleSelected]}>{label}</Text>
      <Text style={styles.scenarioDescription}>{description}</Text>
    </AnimatedPressable>
  );
}

function SignalChart({
  title,
  subtitle,
  data,
  yKey,
  color,
  valueSuffix,
  decimals,
  insight,
}: {
  title: string;
  subtitle: string;
  data: EngineReplayRun['chartData'];
  yKey: 'readiness' | 'weight';
  color: string;
  valueSuffix: string;
  decimals: number;
  insight: string;
}) {
  if (data.length < 2) return null;

  const summary = summarizeMetric(data, yKey);

  return (
    <Card>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.chartStatsRow}>
        <ChartStat label="Current" value={formatNumber(summary.last, decimals, valueSuffix)} tone="good" />
        <ChartStat label="Change" value={formatSignedNumber(summary.delta, decimals, valueSuffix)} tone={summary.delta >= 0 ? 'good' : 'warning'} />
        <ChartStat label="Avg" value={formatNumber(summary.avg, decimals, valueSuffix)} />
        <ChartStat label="Range" value={`${formatNumber(summary.min, decimals, valueSuffix)} to ${formatNumber(summary.max, decimals, valueSuffix)}`} />
      </View>
      <View style={styles.chartArea}>
        <CartesianChart data={data as any[]} xKey="x" yKeys={[yKey]} domainPadding={{ left: 12, right: 18, top: 12 }}>
          {({ points }) => <Line points={points[yKey]} color={color} strokeWidth={2.5} curveType="natural" />}
        </CartesianChart>
      </View>
      <ChartDateAxis data={data} />
      <View style={styles.chartLegendRow}>
        <ChartLegendItem color={color} label={title} />
      </View>
      <Text style={styles.chartInsight}>{insight}</Text>
    </Card>
  );
}

function CaloriesChart({ data }: { data: EngineReplayRun['chartData'] }) {
  if (data.length < 2) return null;

  const actualSummary = summarizeMetric(data, 'actualCalories');
  const targetSummary = summarizeMetric(data, 'prescribedCalories');
  const gap = summarizeGap(data, 'actualCalories', 'prescribedCalories');

  return (
    <Card>
      <Text style={styles.sectionTitle}>Calories</Text>
      <Text style={styles.sectionSubtitle}>Actual intake vs prescribed target</Text>
      <View style={styles.chartStatsRow}>
        <ChartStat label="Actual Avg" value={formatNumber(actualSummary.avg, 0, ' kcal')} />
        <ChartStat label="Target Avg" value={formatNumber(targetSummary.avg, 0, ' kcal')} />
        <ChartStat label="Avg Gap" value={formatSignedNumber(gap.avgGap, 0, ' kcal')} tone={gap.avgGap <= 0 ? 'good' : 'warning'} />
        <ChartStat label="Worst Miss" value={`${formatSignedNumber(gap.biggestDeficit, 0, ' kcal')} / ${formatSignedNumber(gap.biggestSurplus, 0, ' kcal')}`} />
      </View>
      <View style={styles.chartArea}>
        <CartesianChart data={data as any[]} xKey="x" yKeys={['actualCalories', 'prescribedCalories']} domainPadding={{ left: 12, right: 18, top: 16 }}>
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.actualCalories}
                chartBounds={chartBounds}
                color={COLORS.chart.accent}
                roundedCorners={{ topLeft: 6, topRight: 6 }}
                barWidth={8}
              />
              <Line points={points.prescribedCalories} color={COLORS.chart.protein} strokeWidth={2} curveType="natural" />
            </>
          )}
        </CartesianChart>
      </View>
      <ChartDateAxis data={data} />
      <View style={styles.chartLegendRow}>
        <ChartLegendItem color={COLORS.chart.accent} label="Actual intake" />
        <ChartLegendItem color={COLORS.chart.protein} label="Prescribed target" />
      </View>
      <Text style={styles.chartInsight}>
        Fueling averaged {formatSignedNumber(gap.avgGap, 0, ' kcal')} against target. Largest deficit was {formatSignedNumber(gap.biggestDeficit, 0, ' kcal')} and largest surplus was {formatSignedNumber(gap.biggestSurplus, 0, ' kcal')}.
      </Text>
    </Card>
  );
}

function LoadChart({ data }: { data: EngineReplayRun['chartData'] }) {
  if (data.length < 2) return null;

  const actualSummary = summarizeMetric(data, 'actualLoad');
  const targetSummary = summarizeMetric(data, 'prescribedLoad');
  const gap = summarizeGap(data, 'actualLoad', 'prescribedLoad');
  const peakDay = findExtremePoint(data, 'actualLoad', 'max');

  return (
    <Card>
      <Text style={styles.sectionTitle}>Training Load</Text>
      <Text style={styles.sectionSubtitle}>Actual session load against prescribed load across the block</Text>
      <View style={styles.chartStatsRow}>
        <ChartStat label="Actual Avg" value={formatNumber(actualSummary.avg, 0)} />
        <ChartStat label="Target Avg" value={formatNumber(targetSummary.avg, 0)} />
        <ChartStat label="Avg Gap" value={formatSignedNumber(gap.avgGap, 0)} tone={gap.avgGap <= 0 ? 'good' : 'warning'} />
        <ChartStat label="Peak Day" value={peakDay ? `${formatNumber(peakDay.actualLoad, 0)} on ${peakDay.label}` : '--'} />
      </View>
      <View style={styles.chartArea}>
        <CartesianChart data={data as any[]} xKey="x" yKeys={['actualLoad', 'prescribedLoad']} domainPadding={{ left: 12, right: 18, top: 16 }}>
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.actualLoad}
                chartBounds={chartBounds}
                color={COLORS.chart.fatigue}
                roundedCorners={{ topLeft: 6, topRight: 6 }}
                barWidth={8}
              />
              <Line points={points.prescribedLoad} color={COLORS.chart.fitness} strokeWidth={2} curveType="natural" />
            </>
          )}
        </CartesianChart>
      </View>
      <ChartDateAxis data={data} />
      <View style={styles.chartLegendRow}>
        <ChartLegendItem color={COLORS.chart.fatigue} label="Actual load" />
        <ChartLegendItem color={COLORS.chart.fitness} label="Prescribed load" />
      </View>
      <Text style={styles.chartInsight}>
        Load averaged {formatSignedNumber(gap.avgGap, 0)} versus prescription. Peak actual load hit {peakDay ? `${formatNumber(peakDay.actualLoad, 0)} on ${peakDay.label}` : '--'}.
      </Text>
    </Card>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

function ChartWindowButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.chartWindowButton, active && styles.chartWindowButtonActive]}>
      <Text style={[styles.chartWindowButtonText, active && styles.chartWindowButtonTextActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

function ExerciseLogRow({ entry }: { entry: EngineReplayExerciseLog }) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderBody}>
          <Text style={styles.exerciseName}>{entry.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>{entry.sectionTitle ?? 'session'} | {entry.completed ? 'logged' : 'skipped'}</Text>
        </View>
        <Text style={[styles.exerciseStatus, !entry.completed && styles.exerciseStatusMiss]}>{entry.completed ? 'Logged' : 'Skipped'}</Text>
      </View>
      <Text style={styles.bodyText}>Planned {entry.targetSets} x {entry.targetReps} @ RPE {entry.targetRpe}</Text>
      <Text style={styles.bodyText}>
        Logged {entry.completedSets} x {entry.actualReps}
        {entry.actualRpe != null ? ` @ RPE ${entry.actualRpe}` : ''}
        {entry.actualWeight != null ? ` | ${entry.actualWeight} lb` : entry.suggestedWeight != null ? ` | target ${entry.suggestedWeight} lb` : ''}
      </Text>
      <Text style={styles.detailText}>{entry.note}</Text>
    </View>
  );
}

function PrescribedExerciseRow({ entry }: { entry: EngineReplayPrescribedExercise }) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderBody}>
          <Text style={styles.exerciseName}>{entry.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>{entry.sectionTemplate ?? 'main'} | {entry.sectionTitle ?? 'No section intent recorded'}</Text>
        </View>
        <Text style={styles.exerciseStatus}>Prescribed</Text>
      </View>
      <Text style={styles.bodyText}>{entry.setScheme ?? `${entry.targetSets} x ${entry.targetReps} @ RPE ${entry.targetRpe}`}</Text>
      <View style={styles.inlineStatRow}>
        <Text style={styles.inlineStat}>Sets {entry.targetSets}</Text>
        <Text style={styles.inlineStat}>Reps {entry.targetReps}</Text>
        <Text style={styles.inlineStat}>RPE {entry.targetRpe}</Text>
        <Text style={styles.inlineStat}>{entry.suggestedWeight != null ? `${entry.suggestedWeight} lb` : 'Bodyweight/open load'}</Text>
      </View>
      {entry.warmupSetCount > 0 ? <Text style={styles.detailText}>Warmup sets: {entry.warmupSetCount}</Text> : null}
    </View>
  );
}

function WorkoutComparisonRow({
  prescribed,
  logged,
}: {
  prescribed: EngineReplayPrescribedExercise;
  logged: EngineReplayExerciseLog | null;
}) {
  const completionRate = logged ? Math.round((logged.completedSets / Math.max(prescribed.targetSets, 1)) * 100) : 0;
  const repDelta = logged ? logged.actualReps - prescribed.targetReps : 0;
  const rpeDelta = logged?.actualRpe != null ? logged.actualRpe - prescribed.targetRpe : null;

  return (
    <View style={styles.comparisonCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderBody}>
          <Text style={styles.exerciseName}>{prescribed.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>{prescribed.sectionTemplate ?? 'main'} | {prescribed.sectionTitle ?? 'No section intent recorded'}</Text>
        </View>
        <Text style={[styles.exerciseStatus, (!logged || !logged.completed) && styles.exerciseStatusMiss]}>
          {logged?.completed ? `${completionRate}% done` : 'Missed'}
        </Text>
      </View>
      <View style={styles.comparisonGrid}>
        <View style={styles.comparisonCell}>
          <Text style={styles.comparisonLabel}>Prescription</Text>
          <Text style={styles.comparisonValue}>{prescribed.targetSets} x {prescribed.targetReps}</Text>
          <Text style={styles.detailText}>RPE {prescribed.targetRpe}{prescribed.suggestedWeight != null ? ` | ${prescribed.suggestedWeight} lb` : ''}</Text>
        </View>
        <View style={styles.comparisonCell}>
          <Text style={styles.comparisonLabel}>Logged</Text>
          <Text style={styles.comparisonValue}>{logged ? `${logged.completedSets} x ${logged.actualReps}` : 'No sets logged'}</Text>
          <Text style={styles.detailText}>
            {logged?.actualRpe != null ? `RPE ${logged.actualRpe}` : 'RPE --'}
            {logged?.actualWeight != null ? ` | ${logged.actualWeight} lb` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.inlineStatRow}>
        <Text style={styles.inlineStat}>Set delta {logged ? formatSignedNumber(logged.completedSets - prescribed.targetSets) : '--'}</Text>
        <Text style={styles.inlineStat}>Rep delta {logged ? formatSignedNumber(repDelta) : '--'}</Text>
        <Text style={styles.inlineStat}>RPE delta {rpeDelta != null ? formatSignedNumber(rpeDelta, 1) : '--'}</Text>
      </View>
      <Text style={styles.detailText}>{logged?.note ?? 'No simulated athlete note was generated.'}</Text>
    </View>
  );
}

function ConditioningDrillRow({
  name,
  subtitle,
  status,
  note,
}: {
  name: string;
  subtitle: string;
  status: string;
  note: string;
}) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderBody}>
          <Text style={styles.exerciseName}>{name}</Text>
          <Text style={styles.exerciseMeta}>{subtitle}</Text>
        </View>
        <Text style={styles.exerciseStatus}>{status}</Text>
      </View>
      <Text style={styles.detailText}>{note}</Text>
    </View>
  );
}

export function EngineReplayLab({ visible, onClose }: EngineReplayLabProps) {
  const insets = useSafeAreaInsets();
  const [scenarioId, setScenarioId] = useState(ENGINE_REPLAY_SCENARIOS[0]?.id ?? '');
  const [run, setRun] = useState<EngineReplayRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [tab, setTab] = useState<ReplayTab>('overview');
  const [chartWindowSize, setChartWindowSize] = useState<ChartWindowSize>(14);
  const [chartWindowStart, setChartWindowStart] = useState(0);

  async function executeReplay(nextScenarioId: string) {
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
  }

  useEffect(() => {
    if (visible) void executeReplay(scenarioId);
  }, [visible]);

  const selectedDay = run?.days[selectedDayIndex] ?? null;
  const weeks = useMemo(() => chunkWeeks(run?.days ?? []), [run]);
  const selectedWeekIndex = selectedDay ? Math.floor(selectedDay.index / 7) : 0;
  const selectedWeek = weeks[selectedWeekIndex] ?? null;
  const completedExerciseCount = selectedDay?.exerciseLogs.filter((entry) => entry.completed).length ?? 0;
  const prescribedExerciseCount = selectedDay?.prescribedExercises.length ?? 0;
  const completionRate = prescribedExerciseCount > 0
    ? Math.round((completedExerciseCount / prescribedExerciseCount) * 100)
    : 0;
  const plannedSetCount = selectedDay?.prescribedExercises.reduce((sum, entry) => sum + entry.targetSets, 0) ?? 0;
  const completedSetCount = selectedDay?.exerciseLogs.reduce((sum, entry) => sum + entry.completedSets, 0) ?? 0;
  const averageLoggedRpe = average((selectedDay?.exerciseLogs ?? []).filter((entry) => entry.actualRpe != null).map((entry) => entry.actualRpe ?? 0));
  const averagePrescribedRpe = average((selectedDay?.prescribedExercises ?? []).map((entry) => entry.targetRpe));
  const conditioningCompletionRate = selectedDay?.conditioningLog != null
    ? Math.round(selectedDay.conditioningLog.completionRate * 100)
    : 0;
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
  const chartWindowStartLabel = chartWindowData[0]?.label ?? '--';
  const chartWindowEndLabel = chartWindowData[chartWindowData.length - 1]?.label ?? '--';

  useEffect(() => {
    setChartWindowStart((current) => clamp(current, 0, maxChartWindowStart));
  }, [maxChartWindowStart]);

  function jumpDay(delta: number) {
    if (!run) return;
    setSelectedDayIndex((current) => Math.max(0, Math.min(run.days.length - 1, current + delta)));
  }

  function setChartZoom(nextWindow: ChartWindowSize) {
    if (!run) {
      setChartWindowSize(nextWindow);
      return;
    }

    const nextLength = nextWindow === 'all' ? run.chartData.length : nextWindow;
    const centeredStart = clamp(selectedDayIndex - Math.floor(nextLength / 2), 0, Math.max(0, run.chartData.length - nextLength));
    setChartWindowSize(nextWindow);
    setChartWindowStart(nextWindow === 'all' ? 0 : centeredStart);
  }

  function shiftChartWindow(direction: -1 | 1) {
    if (!run || chartWindowSize === 'all') return;
    setChartWindowStart((current) => clamp(current + (direction * chartWindowSize), 0, Math.max(0, run.chartData.length - chartWindowSize)));
  }

  function focusSelectedWeek() {
    if (!selectedWeek || !run) return;
    setChartWindowSize(7);
    setChartWindowStart(clamp(selectedWeek.days[0]?.index ?? 0, 0, Math.max(0, run.chartData.length - 7)));
  }

  function focusSelectedDay() {
    if (!run || chartWindowSize === 'all') return;
    setChartWindowStart(clamp(selectedDayIndex - Math.floor(chartWindowLength / 2), 0, maxChartWindowStart));
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Text style={styles.eyebrow}>INTERNAL LAB</Text>
            <Text style={styles.title}>Engine Replay Lab</Text>
            <Text style={styles.subtitle}>Block replay with simulated workout logging and a cleaner week/day browser.</Text>
          </View>
          <AnimatedPressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </AnimatedPressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]} showsVerticalScrollIndicator={false}>
          <Card title="Scenario">
            <View style={styles.listGap}>
              {ENGINE_REPLAY_SCENARIOS.map((scenario) => (
                <ScenarioButton
                  key={scenario.id}
                  selected={scenario.id === scenarioId}
                  label={scenario.label}
                  description={scenario.description}
                  onPress={() => setScenarioId(scenario.id)}
                />
              ))}
            </View>
            <AnimatedPressable style={styles.runButton} onPress={() => void executeReplay(scenarioId)}>
              <Text style={styles.runButtonText}>{loading ? 'Running...' : 'Run Replay'}</Text>
            </AnimatedPressable>
          </Card>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.bodyText}>Clearing the old replay and simulating the new block...</Text>
            </View>
          ) : null}

          {error ? (
            <Card>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : null}

          {run && selectedDay ? (
            <>
              <Card title="Run Summary" subtitle={`${run.scenario.label} | seed ${run.scenario.config.seed ?? 42}`}>
                <View style={styles.metricGrid}>
                  <MetricTile label="Days" value={String(run.summary.totalDays)} />
                  <MetricTile label="Final Weight" value={`${run.summary.finalWeightLbs.toFixed(1)} lbs`} />
                  <MetricTile label="Interventions" value={String(run.summary.interventionDays)} />
                  <MetricTile label="Danger Findings" value={String(run.summary.findingCounts.danger)} />
                </View>
              </Card>

              <Card title="Chart Focus" subtitle={`Viewing ${chartWindowData.length} day${chartWindowData.length === 1 ? '' : 's'} from ${chartWindowStartLabel} to ${chartWindowEndLabel}`}>
                <View style={styles.chartWindowRow}>
                  <ChartWindowButton active={chartWindowSize === 7} label="7D" onPress={() => setChartZoom(7)} />
                  <ChartWindowButton active={chartWindowSize === 14} label="14D" onPress={() => setChartZoom(14)} />
                  <ChartWindowButton active={chartWindowSize === 28} label="28D" onPress={() => setChartZoom(28)} />
                  <ChartWindowButton active={chartWindowSize === 'all'} label="All" onPress={() => setChartZoom('all')} />
                </View>
                <View style={styles.chartWindowRow}>
                  <AnimatedPressable
                    onPress={() => shiftChartWindow(-1)}
                    disabled={chartWindowSize === 'all' || chartWindowStart === 0}
                    style={[styles.chartActionButton, (chartWindowSize === 'all' || chartWindowStart === 0) && styles.chartActionButtonDisabled]}
                  >
                    <Text style={styles.chartActionButtonText}>Back</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={focusSelectedDay}
                    disabled={chartWindowSize === 'all'}
                    style={[styles.chartActionButton, chartWindowSize === 'all' && styles.chartActionButtonDisabled]}
                  >
                    <Text style={styles.chartActionButtonText}>Center Day</Text>
                  </AnimatedPressable>
                  <AnimatedPressable onPress={focusSelectedWeek} style={styles.chartActionButton}>
                    <Text style={styles.chartActionButtonText}>Selected Week</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => shiftChartWindow(1)}
                    disabled={chartWindowSize === 'all' || chartWindowStart >= maxChartWindowStart}
                    style={[styles.chartActionButton, (chartWindowSize === 'all' || chartWindowStart >= maxChartWindowStart) && styles.chartActionButtonDisabled]}
                  >
                    <Text style={styles.chartActionButtonText}>Forward</Text>
                  </AnimatedPressable>
                </View>
                <Text style={styles.chartInsight}>
                  Use shorter windows to zoom into a camp stretch, then center on the selected day or jump to the selected week to inspect local engine behavior.
                </Text>
              </Card>

              <SignalChart
                title="Readiness"
                subtitle="Subjective readiness across the block"
                data={chartWindowData}
                yKey="readiness"
                color={COLORS.chart.readiness}
                valueSuffix="/10"
                decimals={1}
                insight={`Readiness moved ${formatSignedNumber(summarizeMetric(chartWindowData, 'readiness').delta, 1)} points in this window. Lowest day here was ${formatNumber(findExtremePoint(chartWindowData, 'readiness', 'min')?.readiness ?? 0, 1)}/10 on ${findExtremePoint(chartWindowData, 'readiness', 'min')?.label ?? '--'}.`}
              />
              <SignalChart
                title="Body Weight"
                subtitle="End-of-day weight across the block"
                data={chartWindowData}
                yKey="weight"
                color={COLORS.chart.fitness}
                valueSuffix=" lb"
                decimals={1}
                insight={`Net weight change in this window was ${formatSignedNumber(summarizeMetric(chartWindowData, 'weight').delta, 1, ' lb')}. Lowest weigh-in here was ${formatNumber(findExtremePoint(chartWindowData, 'weight', 'min')?.weight ?? 0, 1, ' lb')} on ${findExtremePoint(chartWindowData, 'weight', 'min')?.label ?? '--'}.`}
              />
              <CaloriesChart data={chartWindowData} />
              <LoadChart data={chartWindowData} />

              <Card title="Replay Browser" subtitle="Pick a week, then inspect the days inside that week.">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                  {weeks.map((week) => (
                    <AnimatedPressable
                      key={`week-${week.index}`}
                      onPress={() => setSelectedDayIndex(week.days[0]?.index ?? 0)}
                      style={[styles.weekButton, week.index === selectedWeekIndex && styles.weekButtonActive]}
                    >
                      <Text style={[styles.weekButtonTitle, week.index === selectedWeekIndex && styles.weekButtonTitleActive]}>Week {week.index + 1}</Text>
                      <Text style={styles.weekButtonDate}>{formatDate(week.days[0].date)} - {formatDate(week.days[week.days.length - 1].date)}</Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>

                <View style={styles.dayNavRow}>
                  <AnimatedPressable
                    onPress={() => jumpDay(-1)}
                    disabled={selectedDayIndex === 0}
                    style={[styles.navButton, selectedDayIndex === 0 && styles.navButtonDisabled]}
                  >
                    <Text style={styles.navButtonText}>Previous</Text>
                  </AnimatedPressable>
                  <View style={styles.dayNavCenter}>
                    <Text style={styles.dayNavTitle}>{formatDate(selectedDay.date)}</Text>
                    <Text style={styles.dayNavSubtitle}>{formatPhase(selectedDay.phase)} | {formatPhase(selectedDay.sessionRole)}</Text>
                  </View>
                  <AnimatedPressable
                    onPress={() => jumpDay(1)}
                    disabled={selectedDayIndex === run.days.length - 1}
                    style={[styles.navButton, selectedDayIndex === run.days.length - 1 && styles.navButtonDisabled]}
                  >
                    <Text style={styles.navButtonText}>Next</Text>
                  </AnimatedPressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                  {selectedWeek?.days.map((day) => {
                    const risk = riskColors(day.riskLevel);
                    const active = day.index === selectedDayIndex;

                    return (
                      <AnimatedPressable key={`day-${day.index}`} onPress={() => setSelectedDayIndex(day.index)} style={[styles.dayButton, active && styles.dayButtonActive]}>
                        <Text style={[styles.dayButtonDate, active && styles.dayButtonDateActive]}>{formatDate(day.date)}</Text>
                        <Text style={styles.dayButtonRole} numberOfLines={1}>{formatPhase(day.sessionRole)}</Text>
                        <View style={[styles.riskChip, { backgroundColor: risk.bg }]}>
                          <Text style={[styles.riskChipText, { color: risk.fg }]}>{day.riskLevel}</Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              </Card>

              <Card title="Selected Day" subtitle={`${selectedDay.date} | ${formatPhase(selectedDay.cutPhase)} | ${selectedDay.exerciseLogs.length} exercise logs`}>
                <Text style={styles.dayHeadline}>{selectedDay.headline}</Text>
                <Text style={styles.bodyText}>{selectedDay.summary}</Text>
                <View style={styles.tagRow}>
                  <Text style={styles.tag}>Ready {selectedDay.readinessLogged}/10</Text>
                  <Text style={styles.tag}>Sleep {selectedDay.sleepLogged}/10</Text>
                  <Text style={styles.tag}>ACWR {selectedDay.acwrRatio.toFixed(2)}</Text>
                  <Text style={styles.tag}>Warm-up {selectedDay.didWarmup ? 'done' : 'missed'}</Text>
                </View>
                <View style={styles.tagRow}>
                  <Text style={styles.tag}>Risk {selectedDay.riskLevel}</Text>
                  <Text style={styles.tag}>Intervention {selectedDay.interventionState}</Text>
                  <Text style={styles.tag}>{selectedDay.isMandatoryRecovery ? 'Mandatory recovery' : 'Training allowed'}</Text>
                </View>
                <View style={styles.tabRow}>
                  <TabButton active={tab === 'overview'} label="Overview" onPress={() => setTab('overview')} />
                  <TabButton active={tab === 'workout'} label="Workout Log" onPress={() => setTab('workout')} />
                  <TabButton active={tab === 'fuel'} label="Fuel" onPress={() => setTab('fuel')} />
                  <TabButton active={tab === 'decisions'} label="Decisions" onPress={() => setTab('decisions')} />
                </View>
              </Card>

              {tab === 'overview' ? (
                <>
                  <Card title="Findings" subtitle="Invariant checks and notable engine conditions for this day.">
                    {selectedDay.findings.length > 0 ? (
                      <View style={styles.listGap}>
                        {selectedDay.findings.map((finding, index) => {
                          const colors = severityColors(finding.severity);

                          return (
                            <View key={`${finding.severity}-${finding.title}-${index}`} style={styles.findingRow}>
                              <View style={[styles.findingBadge, { backgroundColor: colors.bg }]}>
                                <Text style={[styles.findingBadgeText, { color: colors.fg }]}>{finding.title}</Text>
                              </View>
                              <Text style={styles.detailText}>{finding.detail}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : <Text style={styles.bodyText}>No findings on this day.</Text>}
                  </Card>

                  <Card title="Session Summary" subtitle={selectedDay.workoutTitle}>
                    <View style={styles.metricGrid}>
                      <MetricTile label="Prescribed Load" value={selectedDay.prescribedLoad.toFixed(0)} />
                      <MetricTile label="Actual Load" value={selectedDay.actualLoad.toFixed(0)} />
                      <MetricTile label="Start Weight" value={`${selectedDay.bodyWeightStart.toFixed(1)} lbs`} />
                      <MetricTile label="End Weight" value={`${selectedDay.bodyWeightEnd.toFixed(1)} lbs`} />
                    </View>
                    <Text style={styles.bodyText}>{selectedDay.workoutBlueprint}</Text>
                  </Card>
                </>
              ) : null}

              {tab === 'workout' ? (
                <>
                  <Card title="Workout Snapshot" subtitle={selectedDay.workoutType ?? 'untyped session'}>
                    <View style={styles.metricGrid}>
                      <MetricTile
                        label="Duration"
                        value={selectedDay.conditioningPrescription
                          ? `${selectedDay.conditioningLog?.completedDurationMin ?? 0} / ${selectedDay.conditioningPrescription.totalDurationMin} min`
                          : selectedDay.durationMin > 0
                            ? `${selectedDay.durationMin} min`
                            : '--'}
                      />
                      <MetricTile
                        label={selectedDay.conditioningPrescription ? 'Rounds' : 'Exercises'}
                        value={selectedDay.conditioningPrescription
                          ? `${selectedDay.conditioningLog?.completedRounds ?? 0} / ${selectedDay.conditioningPrescription.rounds}`
                          : `${completedExerciseCount} / ${prescribedExerciseCount}`}
                      />
                      <MetricTile
                        label={selectedDay.conditioningPrescription ? 'Drills' : 'Set Completion'}
                        value={selectedDay.conditioningPrescription
                          ? `${selectedDay.conditioningLog?.drillLogs.filter((entry) => entry.completed).length ?? 0} / ${selectedDay.conditioningPrescription.drills.length}`
                          : plannedSetCount > 0
                            ? `${completedSetCount} / ${plannedSetCount}`
                            : '--'}
                      />
                      <MetricTile label="Completion" value={`${selectedDay.conditioningPrescription ? conditioningCompletionRate : completionRate}%`} />
                    </View>
                    <View style={styles.metricGrid}>
                      <MetricTile
                        label="Planned Avg RPE"
                        value={selectedDay.conditioningPrescription
                          ? selectedDay.conditioningPrescription.intensityLabel
                          : prescribedExerciseCount > 0
                            ? averagePrescribedRpe.toFixed(1)
                            : '--'}
                      />
                      <MetricTile
                        label="Logged Avg RPE"
                        value={selectedDay.conditioningPrescription
                          ? selectedDay.conditioningLog?.actualRpe?.toFixed(1) ?? '--'
                          : completedExerciseCount > 0
                            ? averageLoggedRpe.toFixed(1)
                            : '--'}
                      />
                      <MetricTile label="Warm-up" value={selectedDay.didWarmup ? 'Completed' : 'Missed'} />
                      <MetricTile label="Role" value={formatPhase(selectedDay.sessionRole)} />
                    </View>
                    {selectedDay.activationGuidance ? <Text style={styles.bodyText}>Activation: {selectedDay.activationGuidance}</Text> : null}
                    {selectedDay.conditioningPrescription ? <Text style={styles.bodyText}>Conditioning: {selectedDay.conditioningPrescription.message}</Text> : null}
                    <Text style={styles.bodyText}>Blueprint: {selectedDay.workoutBlueprint}</Text>
                  </Card>

                  {selectedDay.conditioningPrescription ? (
                    <>
                      <Card title="Conditioning Prescription" subtitle={selectedDay.conditioningPrescription.message}>
                        <View style={styles.metricGrid}>
                          <MetricTile label="Type" value={formatPhase(selectedDay.conditioningPrescription.type)} />
                          <MetricTile label="Rounds" value={String(selectedDay.conditioningPrescription.rounds)} />
                          <MetricTile label="Work / Rest" value={`${selectedDay.conditioningPrescription.workIntervalSec}s / ${selectedDay.conditioningPrescription.restIntervalSec}s`} />
                          <MetricTile label="Est. Load" value={String(selectedDay.conditioningPrescription.estimatedLoad)} />
                        </View>
                        {selectedDay.conditioningPrescription.drills.map((drill, index) => (
                          <ConditioningDrillRow
                            key={`${drill.name}-prescribed-${index}`}
                            name={drill.name}
                            subtitle={`${drill.rounds} rounds${drill.durationSec != null ? ` | ${drill.durationSec}s work` : ''}${drill.reps != null ? ` | ${drill.reps} reps` : ''}${drill.restSec ? ` | ${drill.restSec}s rest` : ''}`}
                            status="Planned"
                            note="Engine prescribed this drill as part of the conditioning block."
                          />
                        ))}
                      </Card>

                      <Card title="Simulated Conditioning Log" subtitle={selectedDay.conditioningLog?.note ?? 'No simulated conditioning log exists.'}>
                        {selectedDay.conditioningLog ? (
                          <>
                            <View style={styles.metricGrid}>
                              <MetricTile label="Rounds" value={`${selectedDay.conditioningLog.completedRounds} / ${selectedDay.conditioningLog.prescribedRounds}`} />
                              <MetricTile label="Minutes" value={`${selectedDay.conditioningLog.completedDurationMin} / ${selectedDay.conditioningLog.targetDurationMin}`} />
                              <MetricTile label="Actual RPE" value={selectedDay.conditioningLog.actualRpe?.toFixed(1) ?? '--'} />
                              <MetricTile label="Completion" value={`${conditioningCompletionRate}%`} />
                            </View>
                            {selectedDay.conditioningLog.drillLogs.map((drill, index) => (
                              <ConditioningDrillRow
                                key={`${drill.name}-logged-${index}`}
                                name={drill.name}
                                subtitle={`${drill.completedRounds} / ${drill.targetRounds} rounds${drill.durationSec != null ? ` | ${drill.durationSec}s work` : ''}${drill.reps != null ? ` | ${drill.reps} reps` : ''}${drill.restSec ? ` | ${drill.restSec}s rest` : ''}`}
                                status={drill.completed ? 'Logged' : 'Missed'}
                                note={drill.note}
                              />
                            ))}
                          </>
                        ) : (
                          <Text style={styles.bodyText}>No simulated conditioning log exists for this day.</Text>
                        )}
                      </Card>
                    </>
                  ) : null}

                  <Card title="Prescribed Session" subtitle="Full prescription before the simulated athlete touched it.">
                    {selectedDay.prescribedExercises.length > 0
                      ? selectedDay.prescribedExercises.map((entry, index) => (
                        <PrescribedExerciseRow key={`${entry.exerciseId}-${entry.sectionTemplate ?? 'section'}-${index}`} entry={entry} />
                      ))
                      : <Text style={styles.bodyText}>No exercise prescription was generated for this day.</Text>}
                  </Card>

                  <Card title="Prescribed vs Logged" subtitle="Side-by-side comparison for each exercise in the session.">
                    {selectedDay.prescribedExercises.length > 0
                      ? selectedDay.prescribedExercises.map((entry, index) => {
                        const logged = selectedDay.exerciseLogs.find((candidate) => candidate.exerciseId === entry.exerciseId) ?? null;
                        return (
                          <WorkoutComparisonRow
                            key={`${entry.exerciseId}-compare-${index}`}
                            prescribed={entry}
                            logged={logged}
                          />
                        );
                      })
                      : <Text style={styles.bodyText}>No prescribed exercises exist to compare on this day.</Text>}
                  </Card>

                  <Card title="Raw Simulated Workout Log" subtitle="Exercise-by-exercise output from the simulated athlete.">
                    {selectedDay.exerciseLogs.length > 0
                      ? selectedDay.exerciseLogs.map((entry, index) => (
                        <ExerciseLogRow key={`${entry.exerciseId}-${entry.sectionTitle ?? 'section'}-${index}`} entry={entry} />
                      ))
                      : <Text style={styles.bodyText}>No exercise-level simulated log exists for this day.</Text>}
                  </Card>
                </>
              ) : null}

              {tab === 'fuel' ? (
                <Card title="Nutrition & Hydration" subtitle="Prescribed targets vs simulated actual intake.">
                  <View style={styles.metricGrid}>
                    <MetricTile label="Prescribed" value={`${selectedDay.prescribedCalories} kcal`} />
                    <MetricTile label="Actual" value={`${selectedDay.actualCalories} kcal`} />
                    <MetricTile label="Water" value={`${selectedDay.waterTargetOz} oz`} />
                    <MetricTile label="Sodium" value={selectedDay.sodiumTargetMg != null ? `${selectedDay.sodiumTargetMg} mg` : '--'} />
                  </View>
                  <View style={styles.metricGrid}>
                    <MetricTile label="Protein" value={`${selectedDay.actualProtein} / ${selectedDay.prescribedProtein}g`} />
                    <MetricTile label="Carbs" value={`${selectedDay.actualCarbs} / ${selectedDay.prescribedCarbs}g`} />
                    <MetricTile label="Fat" value={`${selectedDay.actualFat} / ${selectedDay.prescribedFat}g`} />
                    <MetricTile label="Cut Phase" value={formatPhase(selectedDay.cutPhase)} />
                  </View>
                </Card>
              ) : null}

              {tab === 'decisions' ? (
                <>
                  <Card title="Decision Trace" subtitle="Why the engine prescribed this day the way it did.">
                    {selectedDay.decisionReasons.length > 0
                      ? selectedDay.decisionReasons.map((reason, index) => (
                        <View key={`${reason.subsystem}-${reason.title}-${index}`} style={styles.reasonRow}>
                          <Text style={styles.reasonTitle}>{reason.title}</Text>
                          <Text style={styles.detailText}>{reason.sentence}</Text>
                        </View>
                      ))
                      : <Text style={styles.bodyText}>No decision reasons were captured for this day.</Text>}
                  </Card>
                  <Card title="Narrative Notes" subtitle="Simulated coach and athlete perspective.">
                    <Text style={styles.noteLabel}>Coach</Text>
                    <Text style={styles.bodyText}>{selectedDay.coachingInsight || 'No coaching note generated.'}</Text>
                    <Text style={[styles.noteLabel, styles.noteLabelSpacing]}>Athlete</Text>
                    <Text style={styles.bodyText}>{selectedDay.athleteMonologue || 'No athlete monologue generated.'}</Text>
                  </Card>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerBody: { flex: 1 },
  eyebrow: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, letterSpacing: 1 },
  title: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  subtitle: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20, marginTop: SPACING.xs },
  closeButton: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  closeText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  content: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  listGap: { gap: SPACING.sm },
  scenarioButton: { borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md },
  scenarioButtonSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  scenarioTitle: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  scenarioTitleSelected: { color: COLORS.accent },
  scenarioDescription: { marginTop: SPACING.xs, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 18 },
  runButton: { marginTop: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.accent, alignItems: 'center', paddingVertical: SPACING.md },
  runButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
  loadingWrap: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
  errorText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.depleted },
  chartWindowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  chartWindowButton: { borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSecondary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  chartWindowButtonActive: { backgroundColor: COLORS.accent },
  chartWindowButtonText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  chartWindowButtonTextActive: { color: COLORS.text.inverse },
  chartActionButton: { borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSecondary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  chartActionButtonDisabled: { opacity: 0.45 },
  chartActionButtonText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  metricTile: { flexBasis: '48%', backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md },
  metricLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase' },
  metricValue: { marginTop: SPACING.xs, fontSize: 18, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary },
  sectionTitle: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  sectionSubtitle: { marginTop: SPACING.xs, marginBottom: SPACING.sm, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  chartStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  chartStat: { flexBasis: '48%', backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.sm },
  chartStatGood: { backgroundColor: COLORS.accentLight },
  chartStatWarning: { backgroundColor: COLORS.readiness.cautionLight },
  chartStatLabel: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase' },
  chartStatValue: { marginTop: 4, fontSize: 14, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary },
  chartArea: { height: 180 },
  chartDateAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  chartDateText: { fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
  chartLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.sm },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  chartLegendDot: { width: 10, height: 10, borderRadius: 999 },
  chartLegendText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  chartInsight: { marginTop: SPACING.sm, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 18 },
  horizontalRow: { gap: SPACING.sm },
  weekButton: { minWidth: 136, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md },
  weekButtonActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  weekButtonTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  weekButtonTitleActive: { color: COLORS.accent },
  weekButtonDate: { marginTop: 4, fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  dayNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginVertical: SPACING.md },
  navButton: { borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSecondary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  navButtonDisabled: { opacity: 0.45 },
  navButtonText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  dayNavCenter: { flex: 1, alignItems: 'center' },
  dayNavTitle: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  dayNavSubtitle: { marginTop: 4, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  dayButton: { width: 120, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md },
  dayButtonActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  dayButtonDate: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  dayButtonDateActive: { color: COLORS.accent },
  dayButtonRole: { marginTop: 6, fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  riskChip: { alignSelf: 'flex-start', marginTop: SPACING.sm, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  riskChipText: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, textTransform: 'uppercase' },
  dayHeadline: { fontSize: 18, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  bodyText: { marginTop: SPACING.sm, fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20 },
  detailText: { marginTop: 4, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  tag: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 6 },
  inlineStatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  inlineStat: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  tabButton: { borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSecondary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tabButtonActive: { backgroundColor: COLORS.accent },
  tabButtonText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  tabButtonTextActive: { color: COLORS.text.inverse },
  findingRow: { gap: SPACING.xs },
  findingBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  findingBadgeText: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, textTransform: 'uppercase' },
  comparisonCard: { borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md, marginBottom: SPACING.md },
  comparisonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  comparisonCell: { flexBasis: '48%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm },
  comparisonLabel: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase' },
  comparisonValue: { marginTop: 4, fontSize: 14, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary },
  exerciseRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderLight, paddingBottom: SPACING.md, marginBottom: SPACING.md },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, alignItems: 'flex-start' },
  exerciseHeaderBody: { flex: 1 },
  exerciseName: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  exerciseMeta: { marginTop: 4, fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
  exerciseStatus: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.prime, textTransform: 'uppercase' },
  exerciseStatusMiss: { color: COLORS.readiness.depleted },
  noteLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  noteLabelSpacing: { marginTop: SPACING.md },
  reasonRow: { paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderLight },
  reasonTitle: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
});
