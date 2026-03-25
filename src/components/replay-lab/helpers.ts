import { COLORS } from '../../theme/theme';
import type { EngineReplayDay, EngineReplayFinding, EngineReplayRun } from '../../../lib/engine/simulation/lab';

export type ChartWindowSize = 7 | 14 | 28 | 'all';

export function formatPhase(value: string) {
  return value.replace(/[-_]/g, ' ');
}

export function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function severityColors(severity: EngineReplayFinding['severity']) {
  if (severity === 'danger') return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
  if (severity === 'warning') return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
  return { bg: COLORS.surfaceSecondary, fg: COLORS.text.secondary };
}

export function findingOriginLabel(origin: EngineReplayFinding['origin']) {
  if (origin === 'engine') return 'Engine';
  if (origin === 'athlete') return 'Athlete';
  return 'Scenario';
}

export function riskColors(level: EngineReplayDay['riskLevel']) {
  if (level === 'critical') return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
  if (level === 'high') return { bg: '#FDE8E8', fg: COLORS.error };
  if (level === 'moderate') return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
  return { bg: COLORS.readiness.primeLight, fg: COLORS.readiness.prime };
}

export function chunkWeeks(days: EngineReplayDay[]) {
  const weeks: Array<{ index: number; days: EngineReplayDay[] }> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ index: weeks.length, days: days.slice(i, i + 7) });
  }
  return weeks;
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatNumber(value: number, decimals = 0, suffix = '') {
  return `${value.toFixed(decimals)}${suffix}`;
}

export function formatSignedNumber(value: number, decimals = 0, suffix = '') {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}${suffix}`;
}

export function summarizeMetric(data: EngineReplayRun['chartData'], key: keyof EngineReplayRun['chartData'][number]) {
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

export function findExtremePoint(
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

export function summarizeGap(data: EngineReplayRun['chartData'], actualKey: 'actualCalories' | 'actualLoad', targetKey: 'prescribedCalories' | 'prescribedLoad') {
  const gaps = data.map((point) => point[actualKey] - point[targetKey]);
  return {
    avgGap: average(gaps),
    biggestSurplus: Math.max(...gaps),
    biggestDeficit: Math.min(...gaps),
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
