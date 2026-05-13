import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import type { WeightTrendResult, BodyMassTrendStatus, WeightDataPoint } from '../../lib/engine/types';

const BODY_TREND_BACKGROUND = require('../../assets/images/dashboard/body-trend-card-bg.png');
const CHART_WIDTH = 320;
const CHART_HEIGHT = 132;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 104;

interface WeightTrendCardProps {
    trend: WeightTrendResult;
    baseWeight?: number;
    targetWeight?: number | null;
    history?: WeightDataPoint[];
    onPress?: () => void;
    variant?: 'default' | 'todayCommand';
}

interface ChartPoint {
    x: number;
    y: number;
    weight: number;
    date: string;
    isLatest: boolean;
}

const STATUS_CONFIG: Record<BodyMassTrendStatus, { label: string; color: string; bg: string }> = {
    on_track: { label: 'On Track', color: COLORS.readiness.prime, bg: COLORS.readiness.primeLight },
    ahead: { label: 'Ahead', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
    behind: { label: 'Behind', color: COLORS.readiness.caution, bg: COLORS.readiness.cautionLight },
    stalled: { label: 'Stalled', color: COLORS.text.tertiary, bg: COLORS.surfaceSecondary },
    gaining: { label: 'Gaining', color: COLORS.readiness.depleted, bg: COLORS.readiness.depletedLight },
    no_target: { label: 'No Target', color: COLORS.text.tertiary, bg: COLORS.surfaceSecondary },
};

export const WeightTrendCard = memo(function WeightTrendCard({
    trend,
    baseWeight,
    targetWeight,
    history,
    onPress,
    variant = 'default',
}: WeightTrendCardProps) {
    const statusConfig = STATUS_CONFIG[trend.status];
    const velocityText = formatSignedWeight(trend.weeklyVelocityLbs);
    const velocityColor = trend.weeklyVelocityLbs < -0.1
        ? COLORS.readiness.prime
        : trend.weeklyVelocityLbs > 0.1
            ? COLORS.readiness.depleted
            : COLORS.text.tertiary;

    const chart = useMemo(
        () => buildChartModel(history, trend.currentWeight, targetWeight),
        [history, trend.currentWeight, targetWeight],
    );

    const showProgress = targetWeight != null && baseWeight != null && baseWeight > targetWeight;
    const progressPct = showProgress
        ? Math.min(1, Math.max(0, (baseWeight - trend.currentWeight) / (baseWeight - targetWeight)))
        : 0;

    if (variant === 'todayCommand') {
        const todayContent = (
            <Card
                style={styles.todayCard}
                backgroundImage={null}
            >
                <View style={styles.todayHeaderRow}>
                    <Text style={styles.todayKicker}>BODY TREND</Text>
                    <Text style={[styles.todayStatusText, { color: statusConfig.color }]} numberOfLines={1}>
                        {statusConfig.label}
                    </Text>
                </View>

                <View style={styles.todayTrendBody}>
                    <View style={styles.todayChartPanel}>
                        <Svg
                            width="100%"
                            height={88}
                            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                        >
                            <Path
                                d={`M 0 ${PLOT_BOTTOM} L ${CHART_WIDTH} ${PLOT_BOTTOM}`}
                                stroke="rgba(245,245,240,0.12)"
                                strokeWidth={1}
                            />
                            <Path
                                d={`M 0 ${PLOT_TOP} L ${CHART_WIDTH} ${PLOT_TOP}`}
                                stroke="rgba(245,245,240,0.08)"
                                strokeWidth={1}
                            />
                            {chart.targetPath ? (
                                <Path
                                    d={chart.targetPath}
                                    stroke="rgba(212,175,55,0.50)"
                                    strokeWidth={1.4}
                                    strokeDasharray="7 6"
                                />
                            ) : null}
                            <Path d={chart.areaPath} fill={COLORS.accent} opacity={0.12} />
                            <Path
                                d={chart.linePath}
                                fill="none"
                                stroke={COLORS.accent}
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {chart.points.map((point, index) => (
                                <Circle
                                    key={`${point.date}-today-${index}`}
                                    cx={point.x}
                                    cy={point.y}
                                    r={point.isLatest ? 5.2 : 3.4}
                                    fill={point.isLatest ? COLORS.accent : '#F5F5F0'}
                                    opacity={point.isLatest ? 1 : 0.66}
                                />
                            ))}
                        </Svg>
                        <View style={styles.todayChartLabelRow}>
                            <Text style={styles.todayChartLabel}>{chart.startLabel}</Text>
                            <Text style={styles.todayChartLabel}>{chart.endLabel}</Text>
                        </View>
                    </View>

                    <View style={styles.todayStatsColumn}>
                        <TodayTrendMetric
                            label="Change"
                            value={formatSignedWeight(trend.totalChangeLbs)}
                            suffix="lbs"
                            color={velocityColor}
                        />
                        <TodayTrendMetric
                            label="Lbs / week"
                            value={velocityText}
                            suffix="lbs"
                            color={velocityColor}
                        />
                        <TodayTrendMetric
                            label="Current"
                            value={trend.currentWeight.toFixed(1)}
                            suffix="lbs"
                            color={COLORS.text.primary}
                        />
                    </View>
                </View>
            </Card>
        );

        if (onPress) {
            return (
                <AnimatedPressable onPress={onPress}>
                    {todayContent}
                </AnimatedPressable>
            );
        }

        return todayContent;
    }

    const content = (
        <Card
            style={styles.card}
            backgroundImage={BODY_TREND_BACKGROUND}
            backgroundScrimColor="rgba(10, 10, 10, 0.50)"
        >
            <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                    <Text style={styles.eyebrow}>Tracked chart</Text>
                    <Text style={styles.title}>Body Trend</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                        style={[styles.statusText, { color: statusConfig.color }]}
                    >
                        {statusConfig.label}
                    </Text>
                </View>
            </View>

            <View style={styles.chartPanel}>
                <Svg
                    width="100%"
                    height={CHART_HEIGHT}
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                >
                    <Path
                        d={`M 0 ${PLOT_BOTTOM} L ${CHART_WIDTH} ${PLOT_BOTTOM}`}
                        stroke="rgba(245,245,240,0.12)"
                        strokeWidth={1}
                    />
                    <Path
                        d={`M 0 ${PLOT_TOP} L ${CHART_WIDTH} ${PLOT_TOP}`}
                        stroke="rgba(245,245,240,0.08)"
                        strokeWidth={1}
                    />
                    {chart.targetPath ? (
                        <Path
                            d={chart.targetPath}
                            stroke="rgba(212,175,55,0.50)"
                            strokeWidth={1.4}
                            strokeDasharray="7 6"
                        />
                    ) : null}
                    <Path d={chart.areaPath} fill={COLORS.accent} opacity={0.14} />
                    <Path
                        d={chart.linePath}
                        fill="none"
                        stroke={COLORS.accent}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {chart.points.map((point, index) => (
                        <Circle
                            key={`${point.date}-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={point.isLatest ? 5.2 : 3.4}
                            fill={point.isLatest ? COLORS.accent : '#F5F5F0'}
                            opacity={point.isLatest ? 1 : 0.66}
                        />
                    ))}
                </Svg>
                <View style={styles.chartLabelRow}>
                    <Text style={styles.chartLabel}>{chart.startLabel}</Text>
                    <Text style={styles.chartMiddleLabel}>{chart.middleLabel}</Text>
                    <Text style={styles.chartLabel}>{chart.endLabel}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <MetricCell value={trend.currentWeight.toFixed(1)} label="Current" />
                <MetricCell value={trend.movingAverage7d.toFixed(1)} label="7d avg" />
                <MetricCell value={velocityText} label="lbs/wk" color={velocityColor} />
            </View>

            {showProgress ? (
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>{baseWeight.toFixed(0)}</Text>
                        <Text style={styles.progressPct}>{trend.percentComplete}%</Text>
                        <Text style={styles.progressLabel}>{targetWeight.toFixed(0)} lbs</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${progressPct * 100}%`,
                                    backgroundColor: statusConfig.color,
                                },
                            ]}
                        />
                    </View>
                </View>
            ) : null}

            {trend.projectedDate ? (
                <View style={styles.projectionRow}>
                    <Text style={styles.projectionLabel}>Target by</Text>
                    <Text style={styles.projectionDate}>{formatDateLabel(trend.projectedDate)}</Text>
                </View>
            ) : null}

            <Text style={styles.message}>{trend.message}</Text>
        </Card>
    );

    if (onPress) {
        return (
            <AnimatedPressable onPress={onPress}>
                {content}
            </AnimatedPressable>
        );
    }

    return content;
});

function MetricCell({ value, label, color = '#F5F5F0' }: { value: string; label: string; color?: string }) {
    return (
        <View style={styles.statBlock}>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[styles.statValue, { color }]}
            >
                {value}
            </Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function TodayTrendMetric({
    label,
    value,
    suffix,
    color,
}: {
    label: string;
    value: string;
    suffix: string;
    color: string;
}) {
    return (
        <View style={styles.todayMetric}>
            <Text style={styles.todayMetricLabel}>{label}</Text>
            <View style={styles.todayMetricValueRow}>
                <Text
                    style={[styles.todayMetricValue, { color }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                >
                    {value}
                </Text>
                <Text style={styles.todayMetricSuffix}>{suffix}</Text>
            </View>
        </View>
    );
}

function buildChartModel(
    history: WeightDataPoint[] | undefined,
    currentWeight: number,
    targetWeight: number | null | undefined,
) {
    const cleanHistory = (history ?? [])
        .filter((point) => Number.isFinite(point.weight))
        .slice(-14);
    const source = cleanHistory.length >= 2
        ? cleanHistory
        : [
            { date: '', weight: currentWeight },
            { date: '', weight: currentWeight },
        ];

    const weights = source.map((point) => point.weight);
    if (targetWeight != null && Number.isFinite(targetWeight)) {
        weights.push(targetWeight);
    }

    const rawMin = Math.min(...weights);
    const rawMax = Math.max(...weights);
    const padding = Math.max(0.8, (rawMax - rawMin) * 0.2);
    const min = rawMin - padding;
    const max = rawMax + padding;
    const range = Math.max(max - min, 1);
    const plotHeight = PLOT_BOTTOM - PLOT_TOP;
    const xGap = source.length > 1 ? CHART_WIDTH / (source.length - 1) : 0;

    const points: ChartPoint[] = source.map((point, index) => ({
        x: source.length > 1 ? xGap * index : CHART_WIDTH / 2,
        y: PLOT_TOP + ((max - point.weight) / range) * plotHeight,
        weight: point.weight,
        date: point.date,
        isLatest: index === source.length - 1,
    }));

    const linePath = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(' ');
    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${linePath} L ${last.x.toFixed(1)} ${PLOT_BOTTOM} L ${first.x.toFixed(1)} ${PLOT_BOTTOM} Z`;
    const targetY = targetWeight != null && Number.isFinite(targetWeight)
        ? PLOT_TOP + ((max - targetWeight) / range) * plotHeight
        : null;

    return {
        points,
        linePath,
        areaPath,
        targetPath: targetY == null ? null : `M 0 ${targetY.toFixed(1)} L ${CHART_WIDTH} ${targetY.toFixed(1)}`,
        startLabel: formatDateLabel(source[0]?.date),
        endLabel: formatDateLabel(source[source.length - 1]?.date),
        middleLabel: cleanHistory.length >= 2 ? `Last ${cleanHistory.length} weigh-ins` : 'Log weights to build the line',
    };
}

function formatDateLabel(date: string | null | undefined): string {
    if (!date) return '--';
    return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function formatSignedWeight(value: number): string {
    if (Math.abs(value) < 0.05) return '0.0';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

const styles = StyleSheet.create({
    todayCard: {
        padding: SPACING.md,
        backgroundColor: 'rgba(10, 14, 16, 0.82)',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.15)',
        ...SHADOWS.md,
    },
    todayHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    todayKicker: {
        flex: 1,
        minWidth: 0,
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.accent,
        letterSpacing: 1.8,
    },
    todayStatusText: {
        maxWidth: 112,
        fontSize: 12,
        lineHeight: 15,
        fontFamily: FONT_FAMILY.semiBold,
    },
    todayTrendBody: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: SPACING.md,
    },
    todayChartPanel: {
        flex: 1.1,
        minWidth: 0,
        justifyContent: 'flex-end',
    },
    todayChartLabelRow: {
        marginTop: -4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    todayChartLabel: {
        fontSize: 10,
        lineHeight: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    todayStatsColumn: {
        flex: 0.9,
        minWidth: 128,
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: 'rgba(245, 245, 240, 0.14)',
        paddingLeft: SPACING.md,
        gap: SPACING.sm,
    },
    todayMetric: {
        flexBasis: '45%',
        flexGrow: 1,
        minWidth: 56,
    },
    todayMetricLabel: {
        fontSize: 10,
        lineHeight: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    todayMetricValueRow: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 3,
    },
    todayMetricValue: {
        fontSize: 22,
        lineHeight: 27,
        fontFamily: FONT_FAMILY.extraBold,
    },
    todayMetricSuffix: {
        fontSize: 10,
        lineHeight: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    card: {
        padding: SPACING.lg,
        backgroundColor: 'rgba(24, 24, 27, 0.9)',
        borderRadius: RADIUS.xxl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...SHADOWS.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    headerCopy: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        marginTop: 2,
        fontSize: 22,
        lineHeight: 28,
        fontFamily: FONT_FAMILY.black,
        letterSpacing: 0,
        color: '#F5F5F0',
    },
    statusBadge: {
        maxWidth: 116,
        paddingHorizontal: SPACING.sm + 4,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    statusText: {
        fontSize: 12,
        lineHeight: 15,
        fontFamily: FONT_FAMILY.semiBold,
        textAlign: 'center',
    },
    chartPanel: {
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(245,245,240,0.10)',
        backgroundColor: 'rgba(10,10,10,0.34)',
        paddingTop: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        paddingBottom: SPACING.xs,
        overflow: 'hidden',
    },
    chartLabelRow: {
        marginTop: -SPACING.xs,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.sm,
    },
    chartLabel: {
        minWidth: 54,
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.58)',
    },
    chartMiddleLabel: {
        flex: 1,
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.72)',
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        marginTop: SPACING.md,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(10,10,10,0.28)',
    },
    statBlock: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 74,
        paddingHorizontal: SPACING.xs,
        paddingVertical: SPACING.sm,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: 'rgba(255,255,255,0.08)',
    },
    statValue: {
        fontSize: 26,
        lineHeight: 32,
        fontFamily: FONT_FAMILY.black,
        letterSpacing: 0,
        textAlign: 'center',
    },
    statLabel: {
        marginTop: 2,
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.62)',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    progressSection: {
        marginTop: SPACING.md,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    progressLabel: {
        fontSize: 12,
        lineHeight: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.7)',
    },
    progressPct: {
        fontSize: 12,
        lineHeight: 15,
        fontFamily: FONT_FAMILY.black,
        color: '#F5F5F0',
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    projectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.md,
    },
    projectionLabel: {
        fontSize: 12,
        lineHeight: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.6)',
    },
    projectionDate: {
        fontSize: 13,
        lineHeight: 16,
        fontFamily: FONT_FAMILY.black,
        color: '#F5F5F0',
    },
    message: {
        marginTop: SPACING.md,
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.82)',
        lineHeight: 20,
    },
});
