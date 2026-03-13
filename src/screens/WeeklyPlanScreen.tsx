import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import DayPlanCard from '../components/DayPlanCard';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import type { WeeklyPlanEntryRow } from '../../lib/engine/types';
import { todayLocalDate } from '../../lib/utils/date';
import { supabase } from '../../lib/supabase';
import { getGuidedWorkoutContext } from '../../lib/api/fightCampService';

import { PlanStackParamList } from '../navigation/types';
type NavProp = NativeStackNavigationProp<PlanStackParamList>;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Return ISO date string -> short day name (Mon, Tue â€¦) */
function dayNameFromDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return DAY_NAMES[d.getDay()];
}

function isToday(dateStr: string): boolean {
    const today = todayLocalDate();
    return dateStr === today;
}

/** Group a flat list of entries by date, preserving chronological order. */
function groupByDate(entries: WeeklyPlanEntryRow[]): Array<{
    date: string;
    dayName: string;
    sessions: WeeklyPlanEntryRow[];
}> {
    const map = new Map<string, WeeklyPlanEntryRow[]>();
    for (const entry of entries) {
        const existing = map.get(entry.date) ?? [];
        existing.push(entry);
        map.set(entry.date, existing);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, sessions]) => ({
            date,
            dayName: dayNameFromDate(date),
            sessions,
        }));
}

// â”€â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function WeeklyPlanScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const { currentLevel } = useReadinessTheme();

    const {
        loading,
        entries,
        missedEntries,
        isDeloadWeek,
        weekPlan,
        loadPlan,
        rescheduleDay,
        cancelPlan,
    } = useWeeklyPlan();

    // Reload whenever the tab/screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadPlan();
        }, [loadPlan]),
    );

    // â”€â”€ Navigation handlers â”€â”€

    function handleDayPress(entry: WeeklyPlanEntryRow) {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const context = await getGuidedWorkoutContext(session.user.id, entry.date);
            navigation.navigate('GuidedWorkout', {
                weeklyPlanEntryId: entry.id,
                scheduledActivityId: entry.scheduled_activity_id ?? undefined,
                focus: entry.focus ?? undefined,
                availableMinutes: entry.estimated_duration_min,
                readinessState: currentLevel ?? 'Prime',
                phase: context.phase,
                fitnessLevel: context.fitnessLevel,
                trainingDate: entry.date,
                isDeloadWeek: entry.is_deload,
            });
        })();
    }

    function handleMissedBannerPress() {
        if (missedEntries.length > 0) {
            rescheduleDay(missedEntries[0]);
        }
    }

    function handleSetupPress() {
        navigation.navigate('WeeklyPlanSetup');
    }

    function handleOptionsPress() {
        Alert.alert(
            'Plan Options',
            'What would you like to do?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Regenerate Plan',
                    onPress: handleSetupPress,
                },
                {
                    text: 'End Current Plan',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'End Plan?',
                            'This will clear all upcoming scheduled sessions for this week. This cannot be undone.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'End Plan', style: 'destructive', onPress: cancelPlan },
                            ],
                        );
                    },
                },
            ],
            { cancelable: true }
        );
    }

    // â”€â”€ Grouped display data â”€â”€

    const grouped = groupByDate(entries);

    // â”€â”€ Loading state â”€â”€

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator color={COLORS.accent} size="large" />
                <Text style={styles.loadingText}>Building your weekâ€¦</Text>
            </View>
        );
    }

    // â”€â”€ Empty state (no config yet) â”€â”€

    if (!loading && entries.length === 0) {
        return (
            <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text style={styles.emptyTitle}>No Plan Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Set up your weekly training plan to get smart daily recommendations.
                    </Text>
                    <TouchableOpacity
                        style={styles.setupButton}
                        onPress={handleSetupPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.setupButtonText}>Set Up Weekly Plan</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    // â”€â”€ Main render â”€â”€

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* â”€â”€ Page Header â”€â”€ */}
            <View style={styles.header}>
                {!loading && entries.length > 0 && (
                    <TouchableOpacity
                        onPress={handleOptionsPress}
                        style={[styles.headerOptionsBtn, { position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 10 }]}
                    >
                        <Text style={styles.headerOptionsIcon}>â‹®</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>This Week</Text>
                    {isDeloadWeek && (
                        <Animated.View entering={FadeInDown.duration(300)} style={styles.deloadBadge}>
                            <Text style={styles.deloadBadgeText}>Recovery Week</Text>
                        </Animated.View>
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + SPACING.xl },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={loadPlan}
                        tintColor={COLORS.accent}
                        colors={[COLORS.accent]}
                    />
                }
            >
                {/* â”€â”€ Plan Summary Card â”€â”€ */}
                {weekPlan?.message ? (
                    <Animated.View entering={FadeInDown.delay(50).duration(400)}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryIcon}>ðŸ“‹</Text>
                            <Text style={styles.summaryText}>{weekPlan.message}</Text>
                        </View>
                    </Animated.View>
                ) : null}

                {/* â”€â”€ Missed Sessions Banner â”€â”€ */}
                {missedEntries.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <TouchableOpacity
                            style={styles.cautionBanner}
                            onPress={handleMissedBannerPress}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cautionBannerInner}>
                                <View style={styles.cautionIconBox}>
                                    <Text style={styles.cautionIconText}>!</Text>
                                </View>
                                <Text style={styles.cautionBannerText}>
                                    {missedEntries.length} missed session
                                    {missedEntries.length > 1 ? 's' : ''} â€” tap to reschedule
                                </Text>
                                <Text style={styles.cautionChevron}>â€º</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* â”€â”€ Day Cards â”€â”€ */}
                <SectionHeader title="Sessions" />

                {grouped.map((group, groupIdx) => {
                    const hasMissed = group.sessions.some(
                        (s) => s.status === 'skipped' || s.status === 'rescheduled',
                    );

                    // Map WeeklyPlanEntryRow[] â†’ DayPlanCard session props
                    const sessionProps = group.sessions.map((entry) => ({
                        slot: entry.slot,
                        sessionType: entry.session_type,
                        focus: entry.focus ?? null,
                        duration: entry.estimated_duration_min,
                        intensity: entry.target_intensity ?? null,
                        status: entry.status,
                    }));

                    return (
                        <Animated.View
                            key={group.date}
                            entering={FadeInDown.delay(groupIdx * 60).duration(400)}
                        >
                            <DayPlanCard
                                dayName={group.dayName}
                                date={group.date}
                                sessions={sessionProps}
                                isToday={isToday(group.date)}
                                isDeload={isDeloadWeek}
                                onPress={() => {
                                    // Navigate using the first entry for the day
                                    if (group.sessions.length > 0) {
                                        handleDayPress(group.sessions[0]);
                                    }
                                }}
                                onReschedule={
                                    hasMissed
                                        ? () => {
                                            const missed = group.sessions.find(
                                                (s) =>
                                                    s.status === 'skipped' ||
                                                    s.status === 'rescheduled',
                                            );
                                            if (missed) rescheduleDay(missed);
                                        }
                                        : undefined
                                }
                            />
                        </Animated.View>
                    );
                })}
            </ScrollView>
        </View >
    );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    loadingText: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    emptyTitle: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 24,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    emptySubtitle: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 15,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    setupButton: {
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.full,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    setupButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 15,
        color: COLORS.text.inverse,
    },

    // Header
    header: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.background,
        position: 'relative',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    headerTitle: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 28,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    headerOptionsBtn: {
        padding: SPACING.sm,
        marginRight: -SPACING.sm,
    },
    headerOptionsIcon: {
        fontSize: 24,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.secondary,
        textAlign: 'center',
    },
    deloadBadge: {
        backgroundColor: '#F3E8FF',
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 4,
    },
    deloadBadgeText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 12,
        color: '#166534',
        letterSpacing: 0.2,
    },

    // ScrollView
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        gap: SPACING.xs,
    },

    // Summary info card
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    summaryIcon: {
        fontSize: 16,
    },
    summaryText: {
        flex: 1,
        fontFamily: FONT_FAMILY.regular,
        fontSize: 13,
        color: COLORS.accent,
        lineHeight: 19,
    },

    // Missed sessions caution banner
    cautionBanner: {
        backgroundColor: COLORS.warning + '18',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
        marginBottom: SPACING.sm,
        overflow: 'hidden',
    },
    cautionBannerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    cautionIconBox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.warning,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cautionIconText: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 13,
        color: '#FFF',
        lineHeight: 16,
    },
    cautionBannerText: {
        flex: 1,
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        color: COLORS.warning,
    },
    cautionChevron: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 20,
        color: COLORS.warning,
        lineHeight: 22,
    },
});



