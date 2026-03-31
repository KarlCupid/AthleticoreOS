import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
    InteractionManager,
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
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
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
            let isActive = true;
            InteractionManager.runAfterInteractions(() => {
                if (isActive) {
                    loadPlan();
                }
            });
            return () => {
                isActive = false;
            };
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
            <ScreenWrapper useSafeArea={true}>
                <View style={styles.header}>
                    <SkeletonLoader width="60%" height={32} shape="text" style={{ marginBottom: SPACING.md }} />
                </View>
                <View style={styles.scrollContent}>
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                </View>
            </ScreenWrapper>
        );
    }

    // ─── Empty state (no config yet) ───

    if (!loading && entries.length === 0) {
        return (
            <ScreenWrapper useSafeArea={true}>
                <View style={styles.header}>
                    <ScreenHeader
                        kicker="Plan"
                        title="No Plan Yet"
                        subtitle="Start your journey with a tailored schedule."
                    />
                </View>
                <View style={styles.scrollContent}>
                    <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()} style={{ width: '100%' }}>
                        <Card variant="glass" style={{ paddingVertical: SPACING.xxl, alignItems: 'center' }}>
                            <Text style={styles.emptyTitle}>No Plan Found</Text>
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
            </ScreenWrapper>
        );
    }

    // ─── Main render ───

    return (
        <ScreenWrapper useSafeArea={true}>
            <View style={styles.header}>
                <ScreenHeader
                    kicker="Plan"
                    title={isCurrentWeek ? 'This Week' : 'Planned Week'}
                    subtitle={activeWeekStart && !isCurrentWeek 
                        ? `Week of ${new Date(activeWeekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
                        : isDeloadWeek ? 'Recovery & Deload' : 'Your smart training schedule'}
                    rightAction={!loading && entries.length > 0 ? (
                        <TouchableOpacity
                            onPress={handleOptionsPress}
                            style={styles.headerOptionsBtn}
                        >
                            <Text style={styles.headerOptionsIcon}>⋮</Text>
                        </TouchableOpacity>
                    ) : null}
                >
                    <View style={styles.weekNavRow}>
                        <AnimatedPressable onPress={goToPrevWeek} style={styles.navBtn}>
                            <Text style={styles.navBtnText}>Prev</Text>
                        </AnimatedPressable>
                        
                        {!isCurrentWeek && (
                            <AnimatedPressable onPress={() => loadPlan()} style={[styles.navBtn, styles.navBtnToday]}>
                                <Text style={[styles.navBtnText, { color: COLORS.text.inverse }]}>Today</Text>
                            </AnimatedPressable>
                        )}

                        <AnimatedPressable onPress={goToNextWeek} style={styles.navBtn}>
                            <Text style={styles.navBtnText}>Next</Text>
                        </AnimatedPressable>
                    </View>
                </ScreenHeader>
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
                        <Card variant="glass" style={styles.summaryCard} noPadding>
                            <View style={styles.summaryCardInner}>
                                <Text style={styles.summaryIcon}>📋</Text>
                                <Text style={styles.summaryText}>{weekPlan.message}</Text>
                            </View>
                        </Card>
                    </Animated.View>
                ) : null}

                {/* ─── Missed Sessions Banner ─── */}
                {missedEntries.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.slow).springify()} style={{ marginBottom: SPACING.sm }}>
                        <AnimatedPressable onPress={handleMissedBannerPress}>
                            <Card variant="glass" style={styles.cautionBanner} noPadding>
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

                {/* ─── Metrics ─── */}
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

                {/* ─── Day Cards ─── */}
                <View style={{ marginTop: SPACING.xl }}>
                    <SectionHeader title="Sessions" />
                </View>

                {grouped.map((group, groupIdx) => {
                    const hasMissed = group.sessions.some(
                        (s) => s.status === 'skipped' || s.status === 'rescheduled',
                    );

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
        </ScreenWrapper>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    header: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    weekNavRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    navBtn: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 8,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    navBtnToday: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    navBtnText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    headerOptionsBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerOptionsIcon: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginTop: -2,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        gap: SPACING.sm,
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
    summaryCard: {
        marginBottom: SPACING.sm,
    },
    summaryCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
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
        color: '#C7D2FE', // Electric Indigo text for clarity
        lineHeight: 19,
    },
    cautionBanner: {
        backgroundColor: COLORS.warning + '18',
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
        borderRadius: RADIUS.lg,
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
