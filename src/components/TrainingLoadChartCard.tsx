import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import type { DashboardWorkloadGuidance } from '../hooks/dashboard/buildTodayHomeState';

const TRAINING_DETAIL_BACKGROUND = require('../../assets/images/dashboard/training-detail-card-bg.png');
const CHART_EDGE_INSET = 6;
const CHART_VALUE_LABEL_WIDTH = 44;
const CHART_VALUE_LABEL_EDGE_SHIFT = (CHART_VALUE_LABEL_WIDTH / 2) - CHART_EDGE_INSET + 2;
const POINTER_LABEL_WIDTH = 112;
const POINTER_LABEL_HEIGHT = 52;

interface TrainingLoadChartDataPoint {
    value: number;
    label: string;
    isToday?: boolean;
}

interface TrainingLoadChartCardProps {
    trainingLoadData: TrainingLoadChartDataPoint[];
    workload: DashboardWorkloadGuidance;
}

interface ChartPointerItem {
    rawValue?: unknown;
    value?: unknown;
    displayLabel?: string;
}

export const TrainingLoadChartCard = memo(function TrainingLoadChartCard({ trainingLoadData, workload }: TrainingLoadChartCardProps) {
    const { width: screenWidth } = useWindowDimensions();
    const fallbackChartWidth = Math.max(0, screenWidth - (SPACING.lg * 2));
    const [measuredChartWidth, setMeasuredChartWidth] = React.useState(0);
    const chartWidth = measuredChartWidth || fallbackChartWidth;
    const pointSpacing = useMemo(() => {
        const pointGapCount = Math.max(trainingLoadData.length - 1, 1);
        return Math.max(1, (chartWidth - (CHART_EDGE_INSET * 2)) / pointGapCount);
    }, [chartWidth, trainingLoadData.length]);

    const handleChartLayout = React.useCallback((event: LayoutChangeEvent) => {
        const nextWidth = Math.floor(event.nativeEvent.layout.width);
        if (nextWidth > 0 && nextWidth !== measuredChartWidth) {
            setMeasuredChartWidth(nextWidth);
        }
    }, [measuredChartWidth]);

    const maxLoad = useMemo(() => {
        if (!trainingLoadData || trainingLoadData.length === 0) return 10;
        const values = trainingLoadData.map(d => d.value);
        return Math.max(...values, 10);
    }, [trainingLoadData]);

    const lineData = useMemo(() => {
        if (!trainingLoadData || trainingLoadData.length === 0) return [];
        const lastIndex = trainingLoadData.length - 1;
        return trainingLoadData.map((d, index) => {
            const isRest = d.value <= 5;
            const valueLabelShiftX = index === 0
                ? CHART_VALUE_LABEL_EDGE_SHIFT
                : index === lastIndex
                    ? -CHART_VALUE_LABEL_EDGE_SHIFT
                    : 0;
            return {
                value: d.value > 0 ? d.value : 5,
                rawValue: d.value,
                label: d.label,
                displayLabel: d.label,
                displayValue: isRest ? 'Rest day' : `${Math.round(d.value)} load`,
                labelTextStyle: {
                    color: d.isToday ? COLORS.text.primary : COLORS.text.tertiary,
                    fontFamily: FONT_FAMILY.semiBold,
                    fontSize: 10
                },
                dataPointLabelWidth: CHART_VALUE_LABEL_WIDTH,
                dataPointLabelShiftX: valueLabelShiftX,
                dataPointLabelComponent: () => (
                    <View style={[
                        styles.valueBadge,
                        isRest ? styles.valueBadgeRest : styles.valueBadgeLoad,
                    ]}>
                        <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                            style={[
                                styles.valueBadgeText,
                                {
                                    color: isRest ? COLORS.text.tertiary : (d.isToday ? COLORS.accent : COLORS.text.secondary),
                                    fontFamily: isRest ? FONT_FAMILY.semiBold : FONT_FAMILY.extraBold,
                                },
                            ]}
                        >
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

    const renderPointerLabel = React.useCallback((items: ChartPointerItem[], _secondaryItems: unknown, pointerIndex?: number) => {
        const fallbackIndex = typeof pointerIndex === 'number' ? pointerIndex : 0;
        const chartPoint = trainingLoadData[fallbackIndex];
        const item = items[0] ?? {};
        const rawValue = typeof item.rawValue === 'number'
            ? item.rawValue
            : typeof chartPoint?.value === 'number'
                ? chartPoint.value
                : item.value;
        const numericValue = Number(rawValue);
        const hasNumericValue = Number.isFinite(numericValue);
        const isRest = hasNumericValue && numericValue <= 5;
        const label = item.displayLabel ?? chartPoint?.label ?? 'Day';

        return (
            <View style={styles.chartTooltip}>
                <Text style={styles.chartTooltipDay}>{label}</Text>
                <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[styles.chartTooltipValue, isRest && styles.chartTooltipValueRest]}
                >
                    {isRest ? 'Rest day' : `${hasNumericValue ? Math.round(numericValue) : '--'} load`}
                </Text>
            </View>
        );
    }, [trainingLoadData]);

    if (!trainingLoadData || trainingLoadData.length === 0) return null;

    return (
        <Card
            variant="glass"
            noPadding
            style={styles.container}
            backgroundImage={TRAINING_DETAIL_BACKGROUND}
            backgroundScrimColor="rgba(10, 10, 10, 0.22)"
        >
            <View pointerEvents="none" style={styles.edgeTopLeft} />
            <View pointerEvents="none" style={styles.edgeBottomRight} />
            <View style={styles.header}>
                <Text style={styles.title}>Load trend</Text>
                <Text style={styles.subtitle}>{workload.label}</Text>
            </View>

            <View style={styles.guidanceBox}>
                <Text style={styles.guidanceTitle}>How to read this</Text>
                <Text style={styles.guidanceText}>{workload.chartHelp}</Text>
            </View>

            <View style={styles.chartContainer} onLayout={handleChartLayout}>
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
                        initialSpacing={CHART_EDGE_INSET}
                        endSpacing={CHART_EDGE_INSET}
                        spacing={pointSpacing}
                        disableScroll
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
                            pointerLabelWidth: POINTER_LABEL_WIDTH,
                            pointerLabelHeight: POINTER_LABEL_HEIGHT,
                            autoAdjustPointerLabelPosition: true,
                            pointerLabelComponent: renderPointerLabel,
                        }}
                    />
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.caption}>{workload.guidance}</Text>
                <Text style={styles.detail}>{workload.detail} - {workload.confidenceLabel}</Text>
            </View>
        </Card>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(10, 10, 10, 0.68)',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.26)',
        overflow: 'hidden',
    },
    edgeTopLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 42,
        height: 42,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: 'rgba(212, 175, 55, 0.50)',
    },
    edgeBottomRight: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 54,
        height: 54,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: 'rgba(212, 175, 55, 0.42)',
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
    guidanceBox: {
        marginTop: SPACING.sm,
        marginHorizontal: SPACING.md,
        padding: SPACING.sm,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: 'rgba(245,245,240,0.10)',
        backgroundColor: 'rgba(245,245,240,0.06)',
    },
    guidanceTitle: {
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    guidanceText: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    chartContainer: {
        marginTop: SPACING.md,
        paddingBottom: SPACING.xs,
        paddingTop: SPACING.lg,
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
    detail: {
        marginTop: 4,
        fontSize: 10,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        opacity: 0.72,
    },
    valueBadge: {
        minWidth: 28,
        maxWidth: 40,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 5,
        marginBottom: 4,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueBadgeLoad: {
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
    valueBadgeRest: {
        minWidth: 34,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    valueBadgeText: {
        fontSize: 9,
        lineHeight: 11,
        textAlign: 'center',
    },
    chartTooltip: {
        width: POINTER_LABEL_WIDTH,
        minHeight: POINTER_LABEL_HEIGHT,
        backgroundColor: 'rgba(10, 10, 10, 0.92)',
        paddingHorizontal: 9,
        paddingVertical: 7,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.62)',
        justifyContent: 'center',
    },
    chartTooltipDay: {
        color: COLORS.text.tertiary,
        fontSize: 10,
        lineHeight: 12,
        fontFamily: FONT_FAMILY.semiBold,
        textTransform: 'uppercase',
    },
    chartTooltipValue: {
        marginTop: 2,
        color: COLORS.text.primary,
        fontSize: 14,
        lineHeight: 18,
        fontFamily: FONT_FAMILY.extraBold,
    },
    chartTooltipValueRest: {
        color: COLORS.text.secondary,
    },
    webFallback: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(245,245,240,0.06)',
        marginHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: 'rgba(245,245,240,0.10)',
    },
    webFallbackText: {
        color: COLORS.text.tertiary,
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
    }
});
