import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CartesianChart, Bar, Line } from 'victory-native';
import { Card } from './Card';
import { ConsistencyCalendar } from './ConsistencyCalendar';
import { SCAnalyticsSection } from './SCAnalyticsSection';
import { COLORS, SPACING } from '../theme/theme';

interface WorkoutAnalyticsMetricsProps {
  userId: string | null;
  trainingLoadData: Array<{ x: number | string; y: number }>;
  acwrData: Array<{ x: number | string; y: number }>;
  checkinDates: Set<string>;
  weightData: Array<{ x: number | string; y: number }>;
  sleepData: Array<{ x: number | string; y: number }>;
}

export function WorkoutAnalyticsMetrics({
  userId,
  trainingLoadData,
  acwrData,
  checkinDates,
  weightData,
  sleepData,
}: WorkoutAnalyticsMetricsProps) {
  return (
    <View style={styles.metricsStack}>
      {trainingLoadData.length > 1 ? (
        <Card title="Training load" subtitle="Recent workload trend">
          <View style={styles.chartFrame}>
            <CartesianChart
              data={trainingLoadData}
              xKey="x"
              yKeys={['y']}
              domainPadding={{ left: 12, right: 12, top: 20 }}
            >
              {({ points, chartBounds }) => (
                <Bar
                  points={points.y}
                  chartBounds={chartBounds}
                  color={COLORS.chart.fitness}
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                />
              )}
            </CartesianChart>
          </View>
        </Card>
      ) : null}

      {acwrData.length > 1 ? (
        <Card title="Load balance ratio" subtitle="The raw trend behind the plain-language summary">
          <View style={styles.chartFrame}>
            <CartesianChart
              data={acwrData}
              xKey="x"
              yKeys={['y']}
              domainPadding={{ left: 12, right: 12, top: 20 }}
            >
              {({ points }) => (
                <Line
                  points={points.y}
                  color={COLORS.chart.readiness}
                  strokeWidth={2.5}
                  curveType="natural"
                />
              )}
            </CartesianChart>
          </View>
        </Card>
      ) : null}

      {checkinDates.size > 0 ? (
        <Card title="Check-in consistency" subtitle="Last two weeks">
          <ConsistencyCalendar checkinDates={checkinDates} weeks={2} />
        </Card>
      ) : null}

      {weightData.length > 1 ? (
        <Card title="Weight trend" subtitle="Recent check-ins">
          <View style={styles.chartFrame}>
            <CartesianChart
              data={weightData}
              xKey="x"
              yKeys={['y']}
              domainPadding={{ left: 12, right: 12, top: 20 }}
            >
              {({ points }) => (
                <Line
                  points={points.y}
                  color={COLORS.chart.accent}
                  strokeWidth={2.5}
                  curveType="natural"
                />
              )}
            </CartesianChart>
          </View>
        </Card>
      ) : null}

      {sleepData.length > 1 ? (
        <Card title="Sleep quality" subtitle="Recent recovery signal">
          <View style={styles.chartFrame}>
            <CartesianChart
              data={sleepData}
              xKey="x"
              yKeys={['y']}
              domainPadding={{ left: 12, right: 12, top: 20 }}
            >
              {({ points, chartBounds }) => (
                <Bar
                  points={points.y}
                  chartBounds={chartBounds}
                  color={COLORS.chart.fatigue}
                  roundedCorners={{ topLeft: 4, topRight: 4 }}
                />
              )}
            </CartesianChart>
          </View>
        </Card>
      ) : null}

      {userId ? <SCAnalyticsSection userId={userId} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metricsStack: {
    gap: SPACING.lg,
  },
  chartFrame: {
    height: 180,
  },
});
