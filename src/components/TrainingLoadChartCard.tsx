import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Bar } from 'victory-native';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface TrainingLoadChartCardProps {
    trainingLoadData: any[];
    acute: number;
    chronic: number;
    acwr: any;
}

export function TrainingLoadChartCard({ trainingLoadData, acute, chronic, acwr }: TrainingLoadChartCardProps) {
    return (
        <Card>
            <View style={styles.chartContainer}>
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
                                color={COLORS.chart.fitness}
                                roundedCorners={{ topLeft: 8, topRight: 8 }}
                                barWidth={40}
                            />
                            <Bar
                                points={points.fatigue}
                                chartBounds={chartBounds}
                                color={acute > chronic * 1.2 ? COLORS.readiness.depleted : COLORS.chart.fatigue}
                                roundedCorners={{ topLeft: 8, topRight: 8 }}
                                barWidth={40}
                            />
                            <Bar
                                points={points.readiness}
                                chartBounds={chartBounds}
                                color={COLORS.chart.readiness}
                                roundedCorners={{ topLeft: 8, topRight: 8 }}
                                barWidth={40}
                            />
                        </>
                    )}
                </CartesianChart>
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
                        ? 'Training load is high. Focus on recovery.'
                        : acwr.status === 'caution'
                            ? 'Training load is increasing. Monitor fatigue.'
                            : 'Training load is balanced.'}
                </Text>
            )}
        </Card>
    );
}

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
});
