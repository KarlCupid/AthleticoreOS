import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface Props {
  weightHistory: { date: string; weight: number }[];
  targetWeight: number;
  projectedWeight?: number | null;
  weighInDate?: string;
}

interface DataPoint {
  x: number;
  actual: number | null;
  projected: number | null;
}

export function BodyMassTrendChart({
  weightHistory,
  targetWeight,
  projectedWeight,
  weighInDate,
}: Props) {
  const recentHistory = weightHistory.slice(-14);

  // Compute daysToWeighIn from the date if provided
  const daysToWeighIn = weighInDate
    ? Math.max(0, Math.ceil((new Date(weighInDate).getTime() - Date.now()) / 86400000))
    : undefined;

  if (recentHistory.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Log daily body mass to see your trend
        </Text>
      </View>
    );
  }

  // Build unified data array: actual points, then projection continuation
  const data: DataPoint[] = recentHistory.map((pt, i) => ({
    x: i,
    actual: pt.weight,
    projected: null,
  }));

  const lastX = data.length - 1;
  const lastWeight = recentHistory[recentHistory.length - 1].weight;

  // Add projection points if we have data
  if (projectedWeight != null && daysToWeighIn != null && daysToWeighIn > 0) {
    const totalDays = Math.min(daysToWeighIn, 14);
    const midX = lastX + Math.ceil(totalDays / 2);
    const endX = lastX + totalDays;
    const midWeight = (lastWeight + projectedWeight) / 2;

    data.push({ x: midX, actual: null, projected: midWeight });
    data.push({ x: endX, actual: null, projected: projectedWeight });
  }

  const allWeights = data.flatMap(d => [d.actual, d.projected]).filter((v): v is number => v !== null);
  const minY = Math.min(...allWeights, targetWeight) - 1.5;
  const maxY = Math.max(...allWeights) + 1.5;

  const onTrack = projectedWeight != null && projectedWeight <= targetWeight + 0.5;

  return (
    <View>
      <View style={styles.chartArea}>
        <CartesianChart
          data={data as any[]}
          xKey="x"
          yKeys={['actual', 'projected']}
          domain={{ y: [minY, maxY] }}
          domainPadding={{ left: 12, right: 20, top: 8 }}
        >
          {({ points }) => (
            <>
              <Line
                points={points.actual}
                color={COLORS.chart.fitness}
                strokeWidth={2.5}
                curveType="natural"
              />
              <Line
                points={points.projected}
                color={COLORS.readiness.caution}
                strokeWidth={2}
                curveType="linear"
              />
            </>
          )}
        </CartesianChart>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.chart.fitness }]} />
          <Text style={styles.legendLabel}>Actual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.readiness.caution }]} />
          <Text style={styles.legendLabel}>Projected</Text>
        </View>
        <View style={[
          styles.targetBadge,
          {
            backgroundColor: onTrack ? `${COLORS.success}18` : `${COLORS.error}18`,
            borderColor: onTrack ? `${COLORS.success}44` : `${COLORS.error}44`,
          },
        ]}>
          <Text style={[styles.targetText, { color: onTrack ? COLORS.success : COLORS.error }]}>
            Target: {targetWeight} lbs
          </Text>
        </View>
      </View>

      {projectedWeight != null && (
        <Text style={[styles.projectionNote, { color: onTrack ? COLORS.readiness.prime : COLORS.readiness.caution }]}>
          {onTrack
            ? `On track — projected ${projectedWeight.toFixed(1)} lbs at weigh-in`
            : `Projected ${projectedWeight.toFixed(1)} lbs — review body-mass support`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
  },
  emptyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  chartArea: { height: 160 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 18, height: 3, borderRadius: 2 },
  legendLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary },
  targetBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  targetText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 12 },
  projectionNote: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
