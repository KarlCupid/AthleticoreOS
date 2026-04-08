import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface TrainingLoadChartDataPoint {
    value: number;
    label: string;
    isToday?: boolean;
}

interface TrainingLoadChartCardProps {
    trainingLoadData: TrainingLoadChartDataPoint[];
    acute: number;
    chronic: number;
    acwr: any;
}

export const TrainingLoadChartCard = memo(function TrainingLoadChartCard({ trainingLoadData, acute: _acute, chronic: _chronic, acwr }: TrainingLoadChartCardProps) {
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - (SPACING.lg * 2);

    const maxLoad = useMemo(() => {
        if (!trainingLoadData || trainingLoadData.length === 0) return 10;
        const values = trainingLoadData.map(d => d.value);
        return Math.max(...values, 10);
    }, [trainingLoadData]);

    const lineData = useMemo(() => {
        if (!trainingLoadData || trainingLoadData.length === 0) return [];
        return trainingLoadData.map((d) => {
            const isRest = d.value <= 5;
            return {
                value: d.value > 0 ? d.value : 5, // Baseline for rest
                label: d.label,
                labelTextStyle: { 
                    color: d.isToday ? COLORS.text.primary : COLORS.text.tertiary, 
                    fontFamily: FONT_FAMILY.semiBold,
                    fontSize: 10
                },
                dataPointLabelComponent: () => (
                    <View style={{ 
                        backgroundColor: isRest ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.4)', 
                        paddingHorizontal: 4, 
                        paddingVertical: 1, 
                        borderRadius: 4,
                        marginBottom: 4,
                        alignSelf: 'center',
                        borderWidth: isRest ? 1 : 0,
                        borderColor: 'rgba(255,255,255,0.1)'
                    }}>
                        <Text style={{ 
                            color: isRest ? COLORS.text.tertiary : (d.isToday ? COLORS.accent : COLORS.text.secondary), 
                            fontSize: 9, 
                            fontFamily: isRest ? FONT_FAMILY.semiBold : FONT_FAMILY.extraBold 
                        }}>
                            {isRest ? 'REST' : Math.round(d.value)}
                        </Text>
                    </View>
                ),
                dataPointLabelShiftY: isRest ? -15 : -25,
                showDataPointLabel: true,
                customDataPoint: () => (
                    <View style={{
                        width: isRest ? 5 : 7, 
                        height: isRest ? 5 : 7, 
                        backgroundColor: isRest ? 'rgba(255,255,255,0.2)' : (d.isToday ? COLORS.accent : COLORS.surfaceSecondary), 
                        borderRadius: 4, 
                        borderWidth: isRest ? 1 : 1.2, 
                        borderColor: d.isToday ? COLORS.text.inverse : (isRest ? 'rgba(255,255,255,0.1)' : COLORS.accent)
                    }} />
                ),
            };
        });
    }, [trainingLoadData]);

    if (!trainingLoadData || trainingLoadData.length === 0) return null;

    return (
        <Card variant="glass" noPadding style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Training Load</Text>
                <Text style={styles.subtitle}>7-Day Intensity Wave</Text>
            </View>

            <View style={styles.chartContainer}>
                {Platform.OS === 'web' ? (
                    <View style={styles.webFallback}>
                        <Text style={styles.webFallbackText}>Chart not supported on web preview.</Text>
                    </View>
                ) : (
                    <LineChart
                        areaChart
                        curved
                        data={lineData}
                        width={chartWidth}
                        height={120}
                        initialSpacing={10}
                        endSpacing={10}
                        spacing={(chartWidth - 20) / (trainingLoadData.length - 1 || 1)}
                        color={COLORS.accent}
                        thickness={2.5}
                        maxValue={maxLoad + (maxLoad * 0.5)} 
                        startFillColor={COLORS.accent}
                        endFillColor={COLORS.accent}
                        startOpacity={0.2}
                        endOpacity={0.0}
                        yAxisThickness={0}
                        xAxisThickness={0}
                        yAxisLabelWidth={0} 
                        hideYAxisText={true}
                        hideRules
                        isAnimated
                        animationDuration={1000}
                        hideOrigin
                        rulesType="none"
                        pointerConfig={{
                            pointerStripColor: COLORS.accent,
                            pointerStripWidth: 2,
                            pointerColor: COLORS.accent,
                            radius: 5,
                            pointerLabelComponent: (items: any[]) => (
                                <View style={styles.chartTooltip}>
                                    <Text style={styles.chartTooltipText}>{Math.round(items[0].value)}</Text>
                                </View>
                            ),
                        }}
                    />
                )}
            </View>

            <View style={styles.footer}>
                {acwr && (
                    <Text style={styles.caption}>
                        {acwr.status === 'redline'
                            ? `ACWR ${acwr.ratio?.toFixed(2) ?? '—'} — Overreaching. Prioritize recovery.`
                            : acwr.status === 'caution'
                                ? `ACWR ${acwr.ratio?.toFixed(2) ?? '—'} — Load rising. Monitor fatigue.`
                                : `ACWR ${acwr.ratio?.toFixed(2) ?? '—'} — Optimal loading zone. Keep building.`}
                    </Text>
                )}
            </View>
        </Card>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'visible',
    },
    header: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    title: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 16,
        color: COLORS.text.primary,
    },
    subtitle: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: COLORS.text.tertiary,
    },
    chartContainer: {
        marginTop: SPACING.md,
        paddingBottom: SPACING.xs,
        paddingTop: SPACING.lg, // Give room for labels
        overflow: 'visible',
    },
    footer: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
    },
    caption: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        textAlign: 'center',
    },
    chartTooltip: {
        backgroundColor: COLORS.surfaceSecondary,
        padding: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    chartTooltipText: {
        color: COLORS.text.primary,
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
    },
    webFallback: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        marginHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
    },
    webFallbackText: {
        color: COLORS.text.tertiary,
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
    }
});
