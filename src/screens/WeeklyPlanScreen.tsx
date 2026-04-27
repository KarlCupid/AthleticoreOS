import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    InteractionManager,
    useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';

import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import { useWeeklyPlanScreenController } from '../hooks/useWeeklyPlanScreenController';
import DayPlanCard from '../components/DayPlanCard';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { SectionHeader } from '../components/SectionHeader';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { StatCard } from '../components/StatCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { formatLongWeekday, formatShortMonthDay } from '../../lib/utils/date';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';
import {
    buildWeeklyChartData,
    buildWeeklyLineData,
    buildWeeklyPlanGroups,
    getWeeklyChartLayout,
    isToday,
} from './weeklyPlanScreenUtils';

import type { PlanStackParamList } from '../navigation/types';
import type { TrainingSessionFamily } from '../../lib/engine/types';
type NavProp = NativeStackNavigationProp<PlanStackParamList>;

// ─── Helpers ─────────────────────────────────────────────────────────


/** Return ISO date string -> short day name (Mon, Tue …) */

// ─── Screen ──────────────────────────────────────────────────────────

function formatTargetFamily(family: TrainingSessionFamily): string {
    switch (family) {
        case 'boxing_skill':
            return 'Boxing';
        case 'durability_core':
            return 'Durability';
        case 'sparring':
            return 'Sparring';
        case 'conditioning':
            return 'Conditioning';
        case 'strength':
            return 'Strength';
        case 'recovery':
            return 'Recovery';
        case 'rest':
            return 'Rest';
        default:
            return String(family).replace(/_/g, ' ');
    }
}

export function WeeklyPlanScreen() {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const navigation = useNavigation<NavProp>();
    const { currentLevel } = useReadinessTheme();

    const {
        loading,
        entries,
        missedEntries,
        hasDefaultGymProfile,
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
    const {
        handleDayPress,
        handleMissedBannerPress,
        handleSetupPress,
        handleOptionsPress,
        handleTodayPress,
        handleQuickLogPress,
    } = useWeeklyPlanScreenController({
        navigation,
        currentLevel,
        missedEntries,
        rescheduleDay,
        cancelPlan,
        loadPlan,
    });

    // Reload whenever the tab/screen comes into focus
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const task = InteractionManager.runAfterInteractions(() => {
                if (isActive) {
                    void loadPlan();
                }
            });
            return () => {
                isActive = false;
                task.cancel();
            };
        }, [loadPlan]),
    );

    // ─── Navigation handlers ───


    // ─── Grouped display data ───

    const grouped = useMemo(() => buildWeeklyPlanGroups(entries, activeWeekStart), [entries, activeWeekStart]);
    const handleGymProfilePress = useCallback(() => {
        const parentNavigation = navigation.getParent() as { navigate?: (route: string, params?: unknown) => void } | undefined;
        parentNavigation?.navigate?.('Train', { screen: 'GymProfiles' });
    }, [navigation]);
    
    // Feature: Up Next Session
    const nextSession = useMemo(() => {
        const upcomingAnchor = activeWeekStart ?? entries[0]?.date ?? '';
        return entries.find((entry) => entry.status === 'planned' && entry.date >= upcomingAnchor)
            ?? entries.find((entry) => entry.status === 'planned');
    }, [activeWeekStart, entries]);

    // Feature: Weekly Load Chart Data
    const chartData = useMemo(() => buildWeeklyChartData(grouped), [grouped]);

    const maxLoad = Math.max(...chartData.map(d => d.y), 10);
    const chartLayout = useMemo(() => getWeeklyChartLayout(screenWidth), [screenWidth]);
    
    // Feature: Premium Wave Data
    const lineData = useMemo(() => buildWeeklyLineData(chartData), [chartData]);
    const visibleTargets = useMemo(() => (
        weekPlan?.weeklyMixPlan.sessionTargets
            .filter((target) => target.family !== 'rest' && target.target > 0)
            .slice(0, 5) ?? []
    ), [weekPlan?.weeklyMixPlan.sessionTargets]);
    const targetNotes = useMemo(() => (
        weekPlan?.weeklyMixPlan.carryForwardAdjustments
            .map((adjustment) => adjustment.reason)
            .filter(Boolean)
            .slice(0, 2) ?? []
    ), [weekPlan?.weeklyMixPlan.carryForwardAdjustments]);

    // ─── Derived Metrics ───
    const totalSessions = entries.length;
    const completedSessions = entries.filter((e) => e.status === 'completed').length;
    
    const totalMinutes = entries.reduce((acc, curr) => acc + (curr.estimated_duration_min || 0), 0);
    const completedMinutes = entries
        .filter((e) => e.status === 'completed')
        .reduce((acc, curr) => acc + (curr.estimated_duration_min || 0), 0);

    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const completedHours = Math.round(completedMinutes / 60 * 10) / 10;

    // ─── Loading / Empty States ───

    if (loading) {
        return (
            <ScreenWrapper useSafeArea={true}>
                <View style={styles.header}>
                    <SkeletonLoader width="60%" height={32} shape="text" style={{ marginBottom: SPACING.md }} />
                </View>
                <View style={styles.scrollContent}>
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                   <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!loading && !hasDefaultGymProfile) {
        return (
            <ScreenWrapper useSafeArea={true}>
                <View style={styles.header}>
                    <ScreenHeader
                        kicker="Plan"
                        title="Gym profile needed"
                        subtitle="Set equipment before workouts."
                    />
                </View>
                <View style={styles.scrollContent}>
                    <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()} style={{ width: '100%' }}>
                        <Card variant="glass" style={{ paddingVertical: SPACING.xxl, alignItems: 'center' }}>
                            <Text style={styles.emptyTitle}>Create a gym profile</Text>
                            <Text style={styles.emptySubtitle}>
                                Workout plans need your available equipment first.
                            </Text>
                            <AnimatedPressable style={styles.setupButton} onPress={handleGymProfilePress}>
                                <Text style={styles.setupButtonText}>Create Gym Profile</Text>
                            </AnimatedPressable>
                        </Card>
                    </Animated.View>
                </View>
            </ScreenWrapper>
        );
    }

    if (!loading && entries.length === 0) {
        return (
            <ScreenWrapper useSafeArea={true}>
                <View style={styles.header}>
                    <ScreenHeader kicker="Plan" title="No plan yet" subtitle="Set up your week." />
                </View>
                <View style={styles.scrollContent}>
                    <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()} style={{ width: '100%' }}>
                        <Card variant="glass" style={{ paddingVertical: SPACING.xxl, alignItems: 'center' }}>
                            <Text style={styles.emptyTitle}>No Plan Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {activeWeekStart && !isCurrentWeek 
                                    ? `Generate your training plan for the week of ${formatShortMonthDay(activeWeekStart)}.` 
                                    : 'Set up your week to see daily training.'}
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
                                    <TouchableOpacity onPress={handleTodayPress}>
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
                        ? `Week of ${formatShortMonthDay(activeWeekStart)}` 
                        : isDeloadWeek ? 'Recovery week' : 'Training schedule'}
                    rightAction={!loading && entries.length > 0 ? (
                        <TouchableOpacity onPress={handleOptionsPress} style={styles.headerOptionsBtn}>
                            <MaterialCommunityIcons name="dots-vertical" size={20} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    ) : null}
                >
                    <View style={styles.weekNavRow}>
                        <AnimatedPressable onPress={goToPrevWeek} style={styles.navBtn}>
                            <Text style={styles.navBtnText}>Prev</Text>
                        </AnimatedPressable>
                        
                        {!isCurrentWeek && (
                            <AnimatedPressable onPress={handleTodayPress} style={[styles.navBtn, styles.navBtnToday]}>
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
                    { paddingBottom: insets.bottom + 180 }, // Extensive padding to clear tab bar and FAB
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
                {/* ─── Feature: Up Next Hero Card ─── */}
                {nextSession && (
                    <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()}>
                        <Card variant="glass" style={styles.heroCard} noPadding>
                            <AnimatedPressable style={styles.heroCardInner} onPress={() => handleDayPress(nextSession)}>
                                <View style={styles.heroHeader}>
                                    <View style={styles.heroBadge}>
                                        <Text style={styles.heroBadgeText}>UP NEXT</Text>
                                    </View>
                                    <Text style={styles.heroDate}>{formatLongWeekday(nextSession.date)}</Text>
                                </View>
                                <Text style={styles.heroTitle}>
                                    {getSessionFamilyLabel({ sessionType: nextSession.session_type, focus: nextSession.focus })}
                                </Text>
                                <View style={styles.heroFooter}>
                                    <View style={styles.heroAction}>
                                        <Text style={styles.heroActionText}>Start Session</Text>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.text.inverse} />
                                    </View>
                                    <Text style={styles.heroDuration}>~{nextSession.estimated_duration_min}m</Text>
                                </View>
                            </AnimatedPressable>
                        </Card>
                    </Animated.View>
                )}

                {/* ─── Feature: Coach's Note ─── */}
                {weekPlan?.message ? (
                    <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.slow).springify()}>
                        <Card variant="glass" style={styles.coachNoteCard} noPadding>
                            <View style={styles.coachNoteInner}>
                                <View style={styles.coachIconBox}>
                                    <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={COLORS.accent} />
                                </View>
                                <View style={styles.coachNoteContent}>
                                    <Text style={styles.coachNoteTitle}>Coach note</Text>
                                    <Text style={styles.coachNoteText} numberOfLines={2}>{weekPlan.message}</Text>
                                </View>
                            </View>
                        </Card>
                    </Animated.View>
                ) : null}

                {/* ─── Missed Sessions Banner ─── */}
                {visibleTargets.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(75).duration(ANIMATION.slow).springify()}>
                        <Card variant="glass" style={styles.targetCard} noPadding>
                            <View style={styles.targetCardInner}>
                                <View style={styles.targetHeaderRow}>
                                    <Text style={styles.targetTitle}>Programming targets</Text>
                                    <Text style={styles.targetSubtitle}>Realized / planned</Text>
                                </View>
                                <View style={styles.targetRows}>
                                    {visibleTargets.map((target) => (
                                        <View key={target.family} style={styles.targetRow}>
                                            <Text style={styles.targetLabel}>{formatTargetFamily(target.family)}</Text>
                                            <Text style={[
                                                styles.targetValue,
                                                (target.debt ?? 0) > 0 && styles.targetValueDebt,
                                            ]}>
                                                {target.realized ?? target.scheduled}/{target.target}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                                {targetNotes.length > 0 ? (
                                    <Text style={styles.targetNote} numberOfLines={2}>{targetNotes.join(' ')}</Text>
                                ) : null}
                            </View>
                        </Card>
                    </Animated.View>
                ) : null}

                {missedEntries.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.slow).springify()}>
                        <AnimatedPressable onPress={handleMissedBannerPress}>
                            <Card variant="glass" style={styles.cautionBanner} noPadding>
                                <View style={styles.cautionBannerInner}>
                                    <View style={styles.cautionIconBox}>
                                        <MaterialCommunityIcons name="alert" size={14} color="#F5F5F0" />
                                    </View>
                                    <Text style={styles.cautionBannerText}>
                                        {missedEntries.length} missed session{missedEntries.length > 1 ? 's' : ''} — tap to reschedule
                                    </Text>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.warning} />
                                </View>
                            </Card>
                        </AnimatedPressable>
                    </Animated.View>
                )}

                {/* ─── Feature: Custom Load Chart ─── */}
                <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.slow).springify()}>
                    <View style={{ marginTop: SPACING.md, marginBottom: SPACING.md }}>
                        <SectionHeader title="Weekly Overview" />
                    </View>
                    <View style={styles.metricsRow}>
                        <StatCard icon={<MaterialCommunityIcons name="target" size={16} color={COLORS.success} />} color={COLORS.success} label="Compliance" value={`${completedSessions}/${totalSessions}`} sub="Sessions" style={styles.metricCard} />
                        <StatCard icon={<MaterialCommunityIcons name="timer-outline" size={16} color={COLORS.accent} />} color={COLORS.accent} label="Active Time" value={`${completedHours}h`} sub={`of ${totalHours}h`} style={styles.metricCard} />
                    </View>

                    <Card variant="glass" style={styles.chartCard} noPadding>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>Projected Load</Text>
                            <Text style={styles.chartSubtitle}>Minutes and load</Text>
                        </View>
                        
                        <View style={styles.chartContainer}>
                            <LineChart
                                areaChart
                                curved
                                data={lineData}
                                width={chartLayout.chartWidth}
                                height={150}
                                initialSpacing={15} // Sunday as leftmost
                                endSpacing={15} // Saturday as rightmost
                                spacing={chartLayout.pointSpacing}
                                color={COLORS.accent}
                                thickness={3}
                                maxValue={maxLoad + 50} 
                                startFillColor={COLORS.accent}
                                endFillColor={COLORS.accent}
                                startOpacity={0.25}
                                endOpacity={0.0}
                                yAxisThickness={0}
                                xAxisThickness={0}
                                yAxisLabelWidth={0} 
                                hideYAxisText={true}
                                hideRules
                                isAnimated
                                animationDuration={1200}
                                hideOrigin
                                noOfSections={3}
                                rulesType="none"
                                yAxisColor="transparent"
                                xAxisColor="transparent"
                                pointerConfig={{
                                    pointerStripColor: COLORS.accent,
                                    pointerStripWidth: 2,
                                    pointerColor: COLORS.accent,
                                    radius: 6,
                                    pointerLabelComponent: (items: Array<{ value: number }>) => (
                                        <View style={styles.chartTooltip}>
                                            <Text style={styles.chartTooltipText}>{items[0].value}m</Text>
                                        </View>
                                    ),
                                }}
                            />
                        </View>
                    </Card>
                </Animated.View>

                {/* ─── Day Cards ─── */}
                <View style={{ marginTop: SPACING.lg }}>
                    <SectionHeader title="Schedule" />
                </View>

                {grouped.map((group, groupIdx) => {
                    const hasMissed = group.sessions.some((s) => s.status === 'skipped' || s.status === 'rescheduled');
                    const sessionProps = group.sessions.map((entry) => ({
                        slot: entry.slot,
                        sessionType: entry.session_type,
                        focus: entry.focus ?? null,
                        duration: entry.estimated_duration_min,
                        intensity: entry.target_intensity ?? null,
                        status: entry.status,
                    }));

                    return (
                        <Animated.View key={group.date} entering={FadeInDown.delay(200 + groupIdx * 50).duration(ANIMATION.slow).springify()}>
                            <DayPlanCard
                                dayName={group.dayName}
                                date={group.date}
                                sessions={sessionProps}
                                isToday={isToday(group.date)}
                                isDeload={isDeloadWeek}
                                onPress={() => { if (group.sessions.length > 0) handleDayPress(group.sessions[0]); }}
                                onReschedule={hasMissed ? () => {
                                    const missed = group.sessions.find((s) => s.status === 'skipped' || s.status === 'rescheduled');
                                    if (missed) rescheduleDay(missed);
                                } : undefined}
                            />
                        </Animated.View>
                    );
                })}
            </ScrollView>

            {/* ─── Feature: Quick Logging FAB ─── */}
            <Animated.View entering={FadeInDown.delay(400).duration(ANIMATION.normal).springify()} style={[styles.fabContainer, { bottom: Math.max(insets.bottom + 65, 75) }]}>
                <AnimatedPressable style={styles.fab} onPress={handleQuickLogPress}>
                    <MaterialCommunityIcons name="plus" size={24} color={COLORS.text.inverse} />
                    <Text style={styles.fabText}>Log Session</Text>
                </AnimatedPressable>
            </Animated.View>
        </ScreenWrapper>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
        backgroundColor: 'rgba(10, 10, 10, 0.46)',
        paddingVertical: 8,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
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
        width: 36,
        height: 36,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(10, 10, 10, 0.46)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        gap: SPACING.sm,
    },
    // Hero Card
    heroCard: {
        marginBottom: SPACING.sm,
        backgroundColor: 'rgba(212, 175, 55, 0.08)', // Accent tint
        borderColor: 'rgba(212, 175, 55, 0.30)',
        borderWidth: 1,
        ...SHADOWS.colored.accent,
    },
    heroCardInner: {
        padding: SPACING.lg,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    heroBadge: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    heroBadgeText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 10,
        color: COLORS.text.inverse,
        letterSpacing: 0.5,
    },
    heroDate: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    heroTitle: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 28,
        color: COLORS.text.primary,
        marginBottom: SPACING.lg,
    },
    heroFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.text.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        gap: 4,
    },
    heroActionText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.inverse,
    },
    heroDuration: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    // Coach Note
    coachNoteCard: {
        marginBottom: SPACING.sm,
        backgroundColor: 'rgba(10, 10, 10, 0.58)',
        borderColor: COLORS.borderLight,
        borderWidth: 1,
    },
    coachNoteInner: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
    },
    coachIconBox: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(212, 175, 55, 0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coachNoteContent: {
        flex: 1,
    },
    coachNoteTitle: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        color: COLORS.accent,
        marginBottom: 2,
    },
    coachNoteText: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 14,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    targetCard: {
        marginBottom: SPACING.sm,
        backgroundColor: 'rgba(10, 10, 10, 0.58)',
        borderColor: COLORS.borderLight,
        borderWidth: 1,
    },
    targetCardInner: {
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    targetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    targetTitle: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    targetSubtitle: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: COLORS.text.tertiary,
    },
    targetRows: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    targetRow: {
        minWidth: 96,
        flexGrow: 1,
        flexBasis: '30%',
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surfaceSecondary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    targetLabel: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: 2,
    },
    targetValue: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 16,
        color: COLORS.success,
    },
    targetValueDebt: {
        color: COLORS.warning,
    },
    targetNote: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: COLORS.text.tertiary,
        lineHeight: 17,
    },
    // Charts & Metrics
    metricsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    metricCard: {
        flex: 1,
        width: 'auto',
    },
    chartCard: {
        paddingHorizontal: 0,
        paddingTop: SPACING.md,
        paddingBottom: 0,
        backgroundColor: 'rgba(10, 10, 10, 0.50)',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        overflow: 'visible', // Ensure numeric labels aren't clipped
    },
    chartHeader: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
    },
    chartTitle: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 16,
        color: COLORS.text.primary,
    },
    chartSubtitle: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 13,
        color: COLORS.text.tertiary,
    },
    chartContainer: {
        marginTop: SPACING.sm,
        paddingBottom: SPACING.md,
    },
    chartTooltip: {
        backgroundColor: COLORS.surfaceSecondary,
        padding: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    chartTooltipText: {
        color: COLORS.text.primary,
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
    },
    chartDayBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    chartDayBadgeToday: {
        backgroundColor: COLORS.accent,
    },
    chartDayText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 11,
        color: COLORS.text.tertiary,
    },
    webFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webFallbackText: {
        color: COLORS.text.tertiary,
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
    },
    // Empty states and banners
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
    cautionBannerText: {
        flex: 1,
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        color: COLORS.text.primary,
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
    // FAB
    fabContainer: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 10,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
        gap: SPACING.sm,
        ...SHADOWS.colored.accent,
    },
    fabText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 15,
        color: COLORS.text.inverse,
    },
});
