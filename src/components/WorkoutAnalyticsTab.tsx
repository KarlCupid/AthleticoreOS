import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Bar, Line } from 'victory-native';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { ConsistencyCalendar } from './ConsistencyCalendar';
import { NutritionAnalyticsSection } from './NutritionAnalyticsSection';
import { SCAnalyticsSection } from './SCAnalyticsSection';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface WorkoutAnalyticsTabProps {
    userId: string | null;
    trainingLoadData: any[];
    acwrData: any[];
    checkinDates: Set<string>;
    weightData: any[];
    sleepData: any[];
}

export function WorkoutAnalyticsTab({ userId, trainingLoadData, acwrData, checkinDates, weightData, sleepData }: WorkoutAnalyticsTabProps) {
    return (
        <View style={{ gap: SPACING.lg }}>
            {userId ? <SCAnalyticsSection userId={userId} /> : null}

            {/* Training Load Trend */}
            <SectionHeader title="Training Load" />
            <Card>
                {trainingLoadData.length > 1 ? (
                    <View style={{ height: 180 }}>
                        <CartesianChart
                            data={trainingLoadData}
                            xKey="x"
                            yKeys={["y"]}
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
                ) : (
                    <View style={[styles.emptyState, { height: 120, paddingVertical: 0 }]}>
                        <Text style={styles.emptyText}>Log training sessions to see load trends</Text>
                    </View>
                )}
            </Card>

            {/* ACWR History */}
            <SectionHeader title="ACWR History" />
            <Card>
                {acwrData.length > 1 ? (
                    <View style={{ height: 180 }}>
                        <CartesianChart
                            data={acwrData}
                            xKey="x"
                            yKeys={["y"]}
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
                ) : (
                    <View style={[styles.emptyState, { height: 120, paddingVertical: 0 }]}>
                        <Text style={styles.emptyText}>Need more data to show ACWR trends</Text>
                    </View>
                )}
            </Card>

            {/* Consistency Calendar */}
            <SectionHeader title="Consistency" />
            <Card>
                <ConsistencyCalendar checkinDates={checkinDates} weeks={2} />
            </Card>

            {/* Weight Trend */}
            <SectionHeader title="Weight Trend" />
            <Card>
                {weightData.length > 1 ? (
                    <View style={{ height: 180 }}>
                        <CartesianChart
                            data={weightData}
                            xKey="x"
                            yKeys={["y"]}
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
                ) : (
                    <View style={[styles.emptyState, { height: 120, paddingVertical: 0 }]}>
                        <Text style={styles.emptyText}>Log your weight daily to see trends</Text>
                    </View>
                )}
            </Card>

            {/* Sleep Quality */}
            <SectionHeader title="Sleep Quality" />
            <Card>
                {sleepData.length > 1 ? (
                    <View style={{ height: 160 }}>
                        <CartesianChart
                            data={sleepData}
                            xKey="x"
                            yKeys={["y"]}
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
                ) : (
                    <View style={[styles.emptyState, { height: 120, paddingVertical: 0 }]}>
                        <Text style={styles.emptyText}>Log sleep quality to see patterns</Text>
                    </View>
                )}
            </Card>

            {userId ? <NutritionAnalyticsSection userId={userId} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
});
