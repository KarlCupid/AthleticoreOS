import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import DayPlanCard from '../components/DayPlanCard';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { SectionHeader } from '../components/SectionHeader';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { StatCard } from '../components/StatCard';
import type { WeeklyPlanEntryRow } from '../../lib/engine/types';
import { todayLocalDate } from '../../lib/utils/date';
import { supabase } from '../../lib/supabase';
import { getGuidedWorkoutContext } from '../../lib/api/fightCampService';

import type { PlanStackParamList } from '../navigation/types';
type NavProp = NativeStackNavigationProp<PlanStackParamList>;

// ─── Helpers ─────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Return ISO date string -> short day name (Mon, Tue …) */
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

// ─── Screen ──────────────────────────────────────────────────────────

export function WeeklyPlanScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const { currentLevel } = useReadinessTheme();

    const {
        loading,
        entries,
        missedEntries,
        isDeloadWeek,
        isCurrentWeek,
        activeWeekStart,
        goToNextWeek,
        goToPrevWeek,
        generateActiveWeek,
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

    // ─── Navigation handlers ───

    function handleDayPress(entry: WeeklyPlanEntryRow) {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const context = await getGuidedWorkoutContext(session.user.id, entry.date);
            navigation.navigate('WorkoutDetail', {
                weeklyPlanEntryId: entry.id,
                date: entry.date,
                readinessState: currentLevel ?? 'Prime',
                phase: context.phase,
                fitnessLevel: context.fitnessLevel,
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

    // ─── Grouped display data ───

    const grouped = groupByDate(entries);

    // ─── Derived Metrics ───
    const totalSessions = entries.length;
    const completedSessions = entries.filter((e) => e.status === 'completed').length;
    
    const totalMinutes = entries.reduce((acc, curr) => acc + (curr.estimated_duration_min || 0), 0);
    const completedMinutes = entries
        .filter((e) => e.status === 'completed')
        .reduce((acc, curr) => acc + (curr.estimated_duration_min || 0), 0);

    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const completedHours = Math.round(completedMinutes / 60 * 10) / 10;

    // ─── Loading state ───

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={[styles.header, { paddingBottom: SPACING.md }]}>
                    <SkeletonLoader width="60%" height={32} shape="text" style={{ marginBottom: SPACING.md }} />
                </View>
                <View style={[styles.scrollContent, { paddingHorizontal: SPACING.lg }]}>
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                </View>
            </View>
        );
    }

    // ─── Empty state (no config yet) ───

    if (!loading && entries.length === 0) {
        return (
            <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
                <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()} style={{ width: '100%' }}>
                    <Card style={{ paddingVertical: SPACING.xxl, alignItems: 'center' }}>
                        <Text style={styles.emptyTitle}>No Plan Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            {activeWeekStart && !isCurrentWeek 
                                ? `Generate your training plan for the week of ${new Date(activeWeekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.` 
                                : 'Set up your weekly training plan to get smart daily recommendations tailored to your goals.'}
                        </Text>
                        {activeWeekStart && !isCurrentWeek ? (
                            <AnimatedPressable style={styles.setupButton} onPress={generateActiveWeek}>
                                <Text style={styles.setupButtonText}>Generate Plan</Text>
                            </AnimatedPressable>
                        ) : (
                            <AnimatedPressable style={styles.setupButton} onPress={handleSetupPress}>
                                <Text style={styles.setupButtonText}>Set Up Weekly Plan</Text>
                            </AnimatedPressable>
                        )}
                        
                        {/* Always allow returning to previous/current weeks even if empty */}
                        <View style={{ flexDirection: 'row', marginTop: SPACING.xl, gap: SPACING.xl }}>
                            <TouchableOpacity onPress={goToPrevWeek}>
                                <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary }}>« Prev Week</Text>
                            </TouchableOpacity>
                            {!isCurrentWeek && (
                                <TouchableOpacity onPress={() => loadPlan()}>
                                    <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent }}>Today</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={goToNextWeek}>
                                <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary }}>Next Week »</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                </Animated.View>
            </View>
        );
    }

    // ─── Main render ───

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* ─── Page Header ─── */}
            <View style={styles.header}>
                {!loading && entries.length > 0 && (
                    <TouchableOpacity
                        onPress={handleOptionsPress}
                        style={[styles.headerOptionsBtn, { position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 10 }]}
                    >
                        <Text style={styles.headerOptionsIcon}>⋮</Text>
                    </TouchableOpacity>
                )}
                <View style={[styles.headerRow, { justifyContent: 'space-between' }]}>
                    <TouchableOpacity onPress={goToPrevWeek} style={{ padding: SPACING.xs }}>
                        <Text style={{ fontSize: 24, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.secondary }}>«</Text>
                    </TouchableOpacity>
                    
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>{isCurrentWeek ? 'This Week' : 'Planned Week'}</Text>
                        {activeWeekStart && !isCurrentWeek && (
                            <Text style={styles.headerSubtitle}>
                                Week of {new Date(activeWeekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                        )}
                        {isDeloadWeek && (
                            <Animated.View entering={FadeInDown.duration(300)} style={styles.deloadBadge}>
                                <Text style={styles.deloadBadgeText}>Recovery Week</Text>
                            </Animated.View>
                        )}
                    </View>

                    <TouchableOpacity onPress={goToNextWeek} style={{ padding: SPACING.xs }}>
                        <Text style={{ fontSize: 24, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.secondary }}>»</Text>
                    </TouchableOpacity>
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
                {/* ─── Plan Summary Card ─── */}
                {weekPlan?.message ? (
                    <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.slow).springify()} style={{ marginBottom: SPACING.sm }}>
                        <Card variant="filled" style={styles.summaryCard} noPadding>
                            <Text style={styles.summaryIcon}>📋</Text>
                            <Text style={styles.summaryText}>{weekPlan.message}</Text>
                        </Card>
                    </Animated.View>
                ) : null}

                {/* ─── Missed Sessions Banner ─── */}
                {missedEntries.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.slow).springify()} style={{ marginBottom: SPACING.sm }}>
                        <AnimatedPressable onPress={handleMissedBannerPress}>
                            <Card style={styles.cautionBanner} noPadding>
                                <View style={styles.cautionBannerInner}>
                                    <View style={styles.cautionIconBox}>
                                        <Text style={styles.cautionIconText}>!</Text>
                                    </View>
                                    <Text style={styles.cautionBannerText}>
                                        {missedEntries.length} missed session
                                        {missedEntries.length > 1 ? 's' : ''} — tap to reschedule
                                    </Text>
                                    <Text style={styles.cautionChevron}>›</Text>
                                </View>
                            </Card>
                        </AnimatedPressable>
                    </Animated.View>
                )}

                {/* ─── Day Cards ─── */}
                <View style={{ marginTop: SPACING.md }}>
                    <SectionHeader title="Weekly Overview" />
                </View>
                
                <View style={styles.metricsRow}>
                    <StatCard
                        entering
                        enteringDelay={150}
                        icon={<Text style={{ fontSize: 16 }}>🎯</Text>}
                        label="Compliance"
                        value={`${completedSessions}/${totalSessions}`}
                        sub="Sessions Completed"
                        style={styles.metricCard}
                        color={COLORS.success}
                    />
                    <StatCard
                        entering
                        enteringDelay={200}
                        icon={<Text style={{ fontSize: 16 }}>⏱️</Text>}
                        label="Active Time"
                        value={`${completedHours}h`}
                        sub={`of ${totalHours}h planned`}
                        style={styles.metricCard}
                        color={COLORS.accent}
                    />
                </View>

                <View style={{ marginTop: SPACING.xl }}>
                    <SectionHeader title="Sessions" />
                </View>

                {grouped.map((group, groupIdx) => {
                    const hasMissed = group.sessions.some(
                        (s) => s.status === 'skipped' || s.status === 'rescheduled',
                    );

                    // Map WeeklyPlanEntryRow[] → DayPlanCard session props
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
                            entering={FadeInDown.delay(groupIdx * 60).duration(ANIMATION.slow).springify()}
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

// ─── Styles ──────────────────────────────────────────────────────────

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
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        paddingBottom: SPACING.md,
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
        fontSize: 32,
        color: COLORS.text.primary,
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: -4,
        marginBottom: 4,
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
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xs,
        gap: SPACING.xs,
    },

    metricsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginVertical: SPACING.xs,
    },
    metricCard: {
        flex: 1,
        width: 'auto',
    },

    // Summary info card
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accentLight,
        padding: SPACING.md,
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
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
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
