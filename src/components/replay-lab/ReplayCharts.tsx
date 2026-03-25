import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bar, CartesianChart, Line } from 'victory-native';
import { COLORS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';
import { Card } from '../Card';
import { ChartStat, ChartLegend, ChartDateAxis } from './primitives/ChartWidgets';
import { CollapsibleSection } from './primitives/CollapsibleSection';
import { PillButton } from './primitives/PillButton';
import {
  formatNumber,
  formatSignedNumber,
  summarizeMetric,
  summarizeGap,
  findExtremePoint,
  type ChartWindowSize,
} from './helpers';
import type { EngineReplayRun } from '../../../lib/engine/simulation/lab';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReplayChartsProps {
  chartData: EngineReplayRun['chartData'];
  chartWindowSize: ChartWindowSize;
  onChangeWindowSize: (size: ChartWindowSize) => void;
}

// ---------------------------------------------------------------------------
// Signal chart (readiness / weight)
// ---------------------------------------------------------------------------

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
      <View style={styles.statsRow}>
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
      <View style={styles.legendRow}>
        <ChartLegend color={color} label={title} />
      </View>
      <Text style={styles.insight}>{insight}</Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Calories chart
// ---------------------------------------------------------------------------

function CaloriesChart({ data }: { data: EngineReplayRun['chartData'] }) {
  if (data.length < 2) return null;
  const actualSummary = summarizeMetric(data, 'actualCalories');
  const targetSummary = summarizeMetric(data, 'prescribedCalories');
  const gap = summarizeGap(data, 'actualCalories', 'prescribedCalories');

  return (
    <Card>
      <Text style={styles.sectionTitle}>Calories</Text>
      <Text style={styles.sectionSubtitle}>Actual intake vs prescribed target</Text>
      <View style={styles.statsRow}>
        <ChartStat label="Actual Avg" value={formatNumber(actualSummary.avg, 0, ' kcal')} />
        <ChartStat label="Target Avg" value={formatNumber(targetSummary.avg, 0, ' kcal')} />
        <ChartStat label="Avg Gap" value={formatSignedNumber(gap.avgGap, 0, ' kcal')} tone={gap.avgGap <= 0 ? 'good' : 'warning'} />
        <ChartStat label="Worst Miss" value={`${formatSignedNumber(gap.biggestDeficit, 0, ' kcal')} / ${formatSignedNumber(gap.biggestSurplus, 0, ' kcal')}`} />
      </View>
      <View style={styles.chartArea}>
        <CartesianChart data={data as any[]} xKey="x" yKeys={['actualCalories', 'prescribedCalories']} domainPadding={{ left: 12, right: 18, top: 16 }}>
          {({ points, chartBounds }) => (
            <>
              <Bar points={points.actualCalories} chartBounds={chartBounds} color={COLORS.chart.accent} roundedCorners={{ topLeft: 6, topRight: 6 }} barWidth={8} />
              <Line points={points.prescribedCalories} color={COLORS.chart.protein} strokeWidth={2} curveType="natural" />
            </>
          )}
        </CartesianChart>
      </View>
      <ChartDateAxis data={data} />
      <View style={styles.legendRow}>
        <ChartLegend color={COLORS.chart.accent} label="Actual intake" />
        <ChartLegend color={COLORS.chart.protein} label="Prescribed target" />
      </View>
      <Text style={styles.insight}>
        Fueling averaged {formatSignedNumber(gap.avgGap, 0, ' kcal')} against target. Largest deficit was {formatSignedNumber(gap.biggestDeficit, 0, ' kcal')} and largest surplus was {formatSignedNumber(gap.biggestSurplus, 0, ' kcal')}.
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Load chart
// ---------------------------------------------------------------------------

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
      <View style={styles.statsRow}>
        <ChartStat label="Actual Avg" value={formatNumber(actualSummary.avg, 0)} />
        <ChartStat label="Target Avg" value={formatNumber(targetSummary.avg, 0)} />
        <ChartStat label="Avg Gap" value={formatSignedNumber(gap.avgGap, 0)} tone={gap.avgGap <= 0 ? 'good' : 'warning'} />
        <ChartStat label="Peak Day" value={peakDay ? `${formatNumber(peakDay.actualLoad, 0)} on ${peakDay.label}` : '--'} />
      </View>
      <View style={styles.chartArea}>
        <CartesianChart data={data as any[]} xKey="x" yKeys={['actualLoad', 'prescribedLoad']} domainPadding={{ left: 12, right: 18, top: 16 }}>
          {({ points, chartBounds }) => (
            <>
              <Bar points={points.actualLoad} chartBounds={chartBounds} color={COLORS.chart.fatigue} roundedCorners={{ topLeft: 6, topRight: 6 }} barWidth={8} />
              <Line points={points.prescribedLoad} color={COLORS.chart.fitness} strokeWidth={2} curveType="natural" />
            </>
          )}
        </CartesianChart>
      </View>
      <ChartDateAxis data={data} />
      <View style={styles.legendRow}>
        <ChartLegend color={COLORS.chart.fatigue} label="Actual load" />
        <ChartLegend color={COLORS.chart.fitness} label="Prescribed load" />
      </View>
      <Text style={styles.insight}>
        Load averaged {formatSignedNumber(gap.avgGap, 0)} versus prescription. Peak actual load hit {peakDay ? `${formatNumber(peakDay.actualLoad, 0)} on ${peakDay.label}` : '--'}.
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ReplayCharts (public)
// ---------------------------------------------------------------------------

const ZOOM_OPTIONS: { size: ChartWindowSize; label: string }[] = [
  { size: 7, label: '7D' },
  { size: 14, label: '14D' },
  { size: 28, label: '28D' },
  { size: 'all', label: 'All' },
];

export function ReplayCharts({ chartData, chartWindowSize, onChangeWindowSize }: ReplayChartsProps) {
  if (chartData.length < 2) return null;

  const readinessInsight = `Readiness moved ${formatSignedNumber(summarizeMetric(chartData, 'readiness').delta, 1)} points in this window. Lowest day here was ${formatNumber(findExtremePoint(chartData, 'readiness', 'min')?.readiness ?? 0, 1)}/5 on ${findExtremePoint(chartData, 'readiness', 'min')?.label ?? '--'}.`;
  const weightInsight = `Net weight change in this window was ${formatSignedNumber(summarizeMetric(chartData, 'weight').delta, 1, ' lb')}. Lowest weigh-in here was ${formatNumber(findExtremePoint(chartData, 'weight', 'min')?.weight ?? 0, 1, ' lb')} on ${findExtremePoint(chartData, 'weight', 'min')?.label ?? '--'}.`;

  return (
    <CollapsibleSection
      title="Block Trends"
      subtitle="Charts stay available, but the workout canvas remains the primary focus."
      defaultOpen={false}
    >
      <View style={styles.zoomRow} accessibilityRole="toolbar" accessibilityLabel="Chart zoom controls">
        {ZOOM_OPTIONS.map((option) => (
          <PillButton
            key={option.label}
            active={chartWindowSize === option.size}
            label={option.label}
            onPress={() => onChangeWindowSize(option.size)}
            size="sm"
            accessibilityLabel={`Zoom to ${option.label === 'All' ? 'all days' : option.label}`}
          />
        ))}
      </View>

      <SignalChart
        title="Readiness"
        subtitle="Subjective readiness across the block"
        data={chartData}
        yKey="readiness"
        color={COLORS.chart.readiness}
        valueSuffix="/5"
        decimals={1}
        insight={readinessInsight}
      />
      <SignalChart
        title="Body Weight"
        subtitle="End-of-day weight across the block"
        data={chartData}
        yKey="weight"
        color={COLORS.chart.fitness}
        valueSuffix=" lb"
        decimals={1}
        insight={weightInsight}
      />
      <CaloriesChart data={chartData} />
      <LoadChart data={chartData} />
    </CollapsibleSection>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  zoomRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  sectionSubtitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  chartArea: { height: 180 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  insight: {
    marginTop: SPACING.sm,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
});
