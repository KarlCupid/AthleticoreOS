import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CartesianChart, Bar } from 'victory-native';
import { LinearGradient, vec } from '@shopify/react-native-skia';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface TrainingLoadChartCardProps {
    trainingLoadData: any[];
    acute: number;
    chronic: number;
    acwr: any;
}

export const TrainingLoadChartCard = memo(function TrainingLoadChartCard({ trainingLoadData, acute, chronic, acwr }: TrainingLoadChartCardProps) {
    return (
        <Card>
            <View style={styles.chartContainer}>
                {Platform.OS === 'web' ? (
                    <View style={styles.webFallback}>
                        <Text style={styles.webFallbackText}>Chart not supported on web preview.</Text>
                    </View>
                ) : (
                    <CartesianChart
                        data={trainingLoadData}
                        xKey="x"
                        yKeys={["fitness", "fatigue", "readiness"]}
                        domainPadding={{ left: 40, right: 40, top: 20 }}
                    >
                        {({ points, chartBounds }) => (
                            <>
                                <Bar
                                    points={points.fitness}
                                    chartBounds={chartBounds}
                                    roundedCorners={{ topLeft: 12, topRight: 12, bottomLeft: 4, bottomRight: 4 }}
                                    barWidth={28}
                                >
                                    <LinearGradient start={vec(0, chartBounds.bottom)} end={vec(0, chartBounds.top)} colors={[COLORS.chart.fitness + '40', COLORS.chart.fitness]} />
                                </Bar>
                                <Bar
                                    points={points.fatigue}
                                    chartBounds={chartBounds}
                                    roundedCorners={{ topLeft: 12, topRight: 12, bottomLeft: 4, bottomRight: 4 }}
                                    barWidth={28}
                                >
                                    <LinearGradient start={vec(0, chartBounds.bottom)} end={vec(0, chartBounds.top)} colors={[(acute > chronic * 1.2 ? COLORS.readiness.depleted : COLORS.chart.fatigue) + '40', acute > chronic * 1.2 ? COLORS.readiness.depleted : COLORS.chart.fatigue]} />
                                </Bar>
                                <Bar
                                    points={points.readiness}
                                    chartBounds={chartBounds}
                                    roundedCorners={{ topLeft: 12, topRight: 12, bottomLeft: 4, bottomRight: 4 }}
                                    barWidth={28}
                                >
                                    <LinearGradient start={vec(0, chartBounds.bottom)} end={vec(0, chartBounds.top)} colors={[COLORS.chart.readiness + '40', COLORS.chart.readiness]} />
                                </Bar>
                            </>
                        )}
                    </CartesianChart>
                )}
            </View>
            <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.chart.fitness }]} />
                    <Text style={styles.legendText}>Fitness</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.chart.fatigue }]} />
                    <Text style={styles.legendText}>Fatigue</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.chart.readiness }]} />
                    <Text style={styles.legendText}>Readiness</Text>
                </View>
            </View>
            {acwr && (
                <Text style={styles.chartCaption}>
                    {acwr.status === 'redline'
                        ? `ACWR ${acwr.ratio?.toFixed(2) ?? '—'} — above 1.5. High injury risk. Prioritize recovery today.`
                        : acwr.status === 'caution'
                            ? `ACWR ${acwr.ratio?.toFixed(2) ?? '—'} — load rising. Monitor fatigue closely this week.`
                            : `ACWR ${acwr.ratio?.toFixed(2) ?? '—'} — in the optimal 0.8–1.3 zone. You can push hard today.`}
                </Text>
            )}
        </Card>
    );
});

const styles = StyleSheet.create({
    chartContainer: {
        height: 200,
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.lg,
        marginTop: SPACING.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    chartCaption: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    webFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: 8,
    },
    webFallbackText: {
        color: COLORS.text.tertiary,
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
    }
});
