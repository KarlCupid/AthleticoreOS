import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DailyTimelineRow } from '../../lib/engine/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { IconFire, IconCheckCircle, IconActivity } from './icons';

interface VerticalTimelineProps {
    blocks: DailyTimelineRow[];
    onBlockPress?: (block: DailyTimelineRow) => void;
}

export function VerticalTimeline({ blocks, onBlockPress }: VerticalTimelineProps) {
    if (!blocks || blocks.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No blocks scheduled for today.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {blocks.map((block, index) => {
                const isLast = index === blocks.length - 1;
                const isSkipped = block.status === 'Skipped';
                const isCompleted = block.status === 'Completed' || block.status === 'Audible';

                return (
                    <View key={block.id} style={styles.itemContainer}>
                        {/* Timeline Connector */}
                        <View style={styles.connectorContainer}>
                            <View style={[
                                styles.dot,
                                isSkipped ? styles.dotSkipped :
                                    isCompleted ? styles.dotCompleted : styles.dotScheduled
                            ]} />
                            {!isLast && <View style={[
                                styles.line,
                                isSkipped || isCompleted ? styles.lineFinished : styles.lineUpcoming
                            ]} />}
                        </View>

                        {/* Content Card */}
                        <TouchableOpacity
                            style={[
                                styles.card,
                                isSkipped && styles.cardSkipped
                            ]}
                            activeOpacity={0.7}
                            onPress={() => onBlockPress?.(block)}
                            disabled={isSkipped || isCompleted}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={[
                                    styles.blockType,
                                    isSkipped && styles.textMuted
                                ]}>{block.block_type}</Text>
                                <View style={[
                                    styles.statusBadge,
                                    isSkipped ? styles.badgeSkipped :
                                        isCompleted ? styles.badgeCompleted : styles.badgeScheduled
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        isSkipped ? styles.statusTextSkipped :
                                            isCompleted ? styles.statusTextCompleted : styles.statusTextScheduled
                                    ]}>{block.status}</Text>
                                </View>
                            </View>

                            <Text style={[
                                styles.intensityText,
                                isSkipped && styles.textMuted
                            ]}>
                                Target Load: {block.planned_intensity}/10
                                {block.actual_intensity ? ` • Actual: ${block.actual_intensity}/10` : ''}
                            </Text>

                            {/* Icons mapping context */}
                            <View style={styles.iconRow}>
                                {block.block_type === 'Boxing' && <IconFire size={16} color={isSkipped ? COLORS.text.tertiary : COLORS.chart.accent} />}
                                {block.block_type === 'S&C' && <IconActivity size={16} color={isSkipped ? COLORS.text.tertiary : COLORS.chart.fitness} />}
                                {block.block_type === 'Recovery' && <IconCheckCircle size={16} color={isSkipped ? COLORS.text.tertiary : COLORS.chart.readiness} />}
                            </View>

                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    emptyContainer: {
        padding: SPACING.lg,
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 14,
        color: COLORS.text.tertiary,
    },
    container: {
        paddingVertical: SPACING.sm,
    },
    itemContainer: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    connectorContainer: {
        width: 30,
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginTop: SPACING.md,
        zIndex: 2,
    },
    dotScheduled: {
        backgroundColor: COLORS.readiness.caution,
        borderWidth: 3,
        borderColor: COLORS.surface,
    },
    dotCompleted: {
        backgroundColor: COLORS.readiness.prime,
    },
    dotSkipped: {
        backgroundColor: COLORS.text.tertiary,
    },
    line: {
        width: 2,
        flex: 1,
        marginTop: 4,
        marginBottom: -16, // Connect to next
        zIndex: 1,
    },
    lineUpcoming: {
        backgroundColor: COLORS.borderLight,
        borderStyle: 'dashed',
    },
    lineFinished: {
        backgroundColor: COLORS.border,
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.card,
    },
    cardSkipped: {
        opacity: 0.7,
        backgroundColor: COLORS.background,
        elevation: 0,
        shadowOpacity: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    blockType: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    textMuted: {
        color: COLORS.text.tertiary,
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    badgeScheduled: {
        backgroundColor: COLORS.readiness.cautionLight,
    },
    badgeCompleted: {
        backgroundColor: COLORS.readiness.primeLight,
    },
    badgeSkipped: {
        backgroundColor: COLORS.borderLight,
    },
    statusText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
    },
    statusTextScheduled: {
        color: COLORS.readiness.caution,
    },
    statusTextCompleted: {
        color: COLORS.readiness.prime,
    },
    statusTextSkipped: {
        color: COLORS.text.tertiary,
    },
    intensityText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
