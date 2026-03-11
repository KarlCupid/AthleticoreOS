import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { IconActivity } from './icons';
import { COLORS, FONT_FAMILY, SPACING, ANIMATION } from '../theme/theme';

interface WorkoutHistoryTabProps {
    workoutHistory: any[];
}

export function WorkoutHistoryTab({ workoutHistory }: WorkoutHistoryTabProps) {
    return (
        <>
            <SectionHeader title="Workout History" />
            {workoutHistory.length === 0 ? (
                <Card>
                    <View style={styles.emptyState}>
                        <IconActivity size={32} color={COLORS.text.tertiary} />
                        <Text style={styles.emptyText}>No workouts logged yet</Text>
                        <Text style={styles.emptySubtext}>Complete your first workout to see it here</Text>
                    </View>
                </Card>
            ) : (
                workoutHistory.map((log, i) => (
                    <Animated.View key={log.id} entering={FadeInDown.delay(50 * i).duration(ANIMATION.normal).springify()}>
                        <Card style={{ marginBottom: SPACING.md }}>
                            <View style={styles.historyHeader}>
                                <View>
                                    <Text style={styles.historyDate}>
                                        {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'short', month: 'short', day: 'numeric',
                                        })}
                                    </Text>
                                    <Text style={styles.historyFocus}>
                                        {(log.focus ?? log.workout_type).replace(/_/g, ' ').toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.historyStats}>
                                    <View style={styles.historyStatItem}>
                                        <Text style={styles.historyStatValue}>{log.total_sets}</Text>
                                        <Text style={styles.historyStatLabel}>Sets</Text>
                                    </View>
                                    <View style={styles.historyStatItem}>
                                        <Text style={styles.historyStatValue}>
                                            {log.total_volume > 1000
                                                ? `${(log.total_volume / 1000).toFixed(1)}k`
                                                : log.total_volume}
                                        </Text>
                                        <Text style={styles.historyStatLabel}>Volume</Text>
                                    </View>
                                    <View style={styles.historyStatItem}>
                                        <Text style={styles.historyStatValue}>{log.session_rpe ?? '-'}</Text>
                                        <Text style={styles.historyStatLabel}>RPE</Text>
                                    </View>
                                    {log.duration_minutes && (
                                        <View style={styles.historyStatItem}>
                                            <Text style={styles.historyStatValue}>{log.duration_minutes}m</Text>
                                            <Text style={styles.historyStatLabel}>Time</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </Card>
                    </Animated.View>
                ))
            )}
        </>
    );
}

const styles = StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    emptySubtext: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        textAlign: 'center',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyDate: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    historyFocus: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    historyStats: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    historyStatItem: {
        alignItems: 'center',
    },
    historyStatValue: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    historyStatLabel: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
});
