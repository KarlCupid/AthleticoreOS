import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import type { WeightTrendResult, WeightCutStatus } from '../../lib/engine/types';

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

export function WeightTrendCard({ trend, baseWeight, targetWeight, onPress }: WeightTrendCardProps) {
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
        <Card style={styles.card}>
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
}

const styles = StyleSheet.create({
    card: {
        padding: SPACING.lg,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
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
        fontSize: 20,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 28,
        backgroundColor: COLORS.border,
    },
    velocityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    arrow: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
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
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    progressPct: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.borderLight,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    projectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    projectionLabel: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    projectionDate: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    message: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 18,
    },
});
