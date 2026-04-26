import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import type { WeightTrendResult, WeightCutStatus } from '../../lib/engine/types';

const BODY_TREND_BACKGROUND = require('../../assets/images/dashboard/body-trend-card-bg.png');

interface WeightTrendCardProps {
    trend: WeightTrendResult;
    baseWeight?: number;
    targetWeight?: number | null;
    onPress?: () => void;
}

const STATUS_CONFIG: Record<WeightCutStatus, { label: string; color: string; bg: string }> = {
    on_track: { label: 'On Track', color: COLORS.readiness.prime, bg: COLORS.readiness.primeLight },
    ahead: { label: 'Ahead', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
    behind: { label: 'Behind', color: COLORS.readiness.caution, bg: COLORS.readiness.cautionLight },
    stalled: { label: 'Stalled', color: COLORS.text.tertiary, bg: COLORS.surfaceSecondary },
    gaining: { label: 'Gaining', color: COLORS.readiness.depleted, bg: COLORS.readiness.depletedLight },
    no_target: { label: 'No Target', color: COLORS.text.tertiary, bg: COLORS.surfaceSecondary },
};

export const WeightTrendCard = memo(function WeightTrendCard({ trend, baseWeight, targetWeight, onPress }: WeightTrendCardProps) {
    const statusConfig = STATUS_CONFIG[trend.status];
    const velocityAbs = Math.abs(trend.weeklyVelocityLbs);
    const arrow = trend.weeklyVelocityLbs < -0.1 ? '↓' : trend.weeklyVelocityLbs > 0.1 ? '↑' : '→';
    const arrowColor = trend.weeklyVelocityLbs < -0.1 ? COLORS.readiness.prime
        : trend.weeklyVelocityLbs > 0.1 ? COLORS.readiness.depleted
            : COLORS.text.tertiary;

    // Progress bar calculation
    const showProgress = targetWeight != null && baseWeight != null && baseWeight > (targetWeight ?? 0);
    const progressPct = showProgress
        ? Math.min(1, Math.max(0, (baseWeight! - trend.currentWeight) / (baseWeight! - targetWeight!)))
        : 0;

    const content = (
        <Card
            style={styles.card}
            backgroundImage={BODY_TREND_BACKGROUND}
            backgroundScrimColor="rgba(10, 10, 10, 0.46)"
        >
            {/* Header Row */}
            <View style={styles.headerRow}>
                <Text style={styles.title}>Weight Trend</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                    </Text>
                </View>
            </View>

            {/* Weight Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{trend.currentWeight.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Current</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{trend.movingAverage7d.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>7d Avg</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBlock}>
                    <View style={styles.velocityRow}>
                        <Text style={[styles.arrow, { color: arrowColor }]}>{arrow}</Text>
                        <Text style={[styles.statValue, { color: arrowColor }]}>
                            {velocityAbs.toFixed(1)}
                        </Text>
                    </View>
                    <Text style={styles.statLabel}>lbs/wk</Text>
                </View>
            </View>

            {/* Progress Bar */}
            {showProgress && (
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>{baseWeight?.toFixed(0)}</Text>
                        <Text style={styles.progressPct}>{trend.percentComplete}%</Text>
                        <Text style={styles.progressLabel}>{targetWeight?.toFixed(0)} lbs</Text>
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
            )}

            {/* Projected Date */}
            {trend.projectedDate && (
                <View style={styles.projectionRow}>
                    <Text style={styles.projectionLabel}>Target by</Text>
                    <Text style={styles.projectionDate}>
                        {new Date(trend.projectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        })}
                    </Text>
                </View>
            )}

            {/* Coaching Message */}
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

const styles = StyleSheet.create({
    card: {
        padding: SPACING.xl,
        backgroundColor: 'rgba(24, 24, 27, 0.9)', // Glassy Zinc 900
        borderRadius: RADIUS.xxl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...SHADOWS.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.black,
        letterSpacing: 0.5,
        color: '#F5F5F0',
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm + 4,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    statusText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    statBlock: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontFamily: FONT_FAMILY.black,
        color: '#F5F5F0',
        letterSpacing: 0,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    divider: {
        width: 2,
        height: 28,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
    },
    velocityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    arrow: {
        fontSize: 24,
        fontFamily: FONT_FAMILY.black,
    },
    progressSection: {
        marginBottom: SPACING.sm,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    progressLabel: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.7)',
    },
    progressPct: {
        fontSize: 12,
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
        marginBottom: SPACING.md,
    },
    projectionLabel: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.6)',
    },
    projectionDate: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.black,
        color: '#F5F5F0',
    },
    message: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 20,
    },
});
