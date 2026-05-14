import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ImageBackground,
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

import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, TAP_TARGETS } from '../theme/theme';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import { useWeeklyPlanScreenController } from '../hooks/useWeeklyPlanScreenController';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { formatLongWeekday, formatShortMonthDay } from '../../lib/utils/date';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';
import { sanitizeAthleteFacingCopy } from '../../lib/performance-engine/presentation';
import {
    buildWeeklyChartData,
    buildWeeklyLineData,
    buildWeeklyPlanGroups,
    getWeeklyChartLayout,
    isToday,
} from './weeklyPlanScreenUtils';

import type { PlanStackParamList } from '../navigation/types';
import type { TrainingSessionFamily, WeeklyPlanEntryRow, WeeklySessionTarget } from '../../lib/engine/types';
import type { WeeklyPlanGroup } from './weeklyPlanScreenUtils';

type NavProp = NativeStackNavigationProp<PlanStackParamList>;

const PLAN_BACKGROUND = require('../../assets/images/cards/planning-card-bg.png');

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

function formatPlanDuration(minutes: number | null | undefined): string {
    const safeMinutes = typeof minutes === 'number' && Number.isFinite(minutes) ? minutes : 0;
    if (safeMinutes <= 0) return 'Time not set';
    if (safeMinutes < 60) return `${safeMinutes}m`;
    const hours = Math.floor(safeMinutes / 60);
    const remaining = safeMinutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatPlanSessionLabel(entry: WeeklyPlanEntryRow): string {
    return getSessionFamilyLabel({
        sessionType: entry.session_type,
        focus: entry.focus,
    });
}

function getIntensityLabel(intensity: number | null | undefined): string | null {
    if (typeof intensity !== 'number' || !Number.isFinite(intensity)) return null;
    if (intensity <= 3) return 'Low';
    if (intensity <= 6) return 'Moderate';
    if (intensity <= 8) return 'Hard';
    return 'Very hard';
}

function getEntryStatusLabel(status: WeeklyPlanEntryRow['status']): string {
    if (status === 'completed') return 'Done';
    if (status === 'skipped') return 'Skipped';
    if (status === 'rescheduled') return 'Rescheduled';
    return 'Planned';
}

function getEntryStatusTone(status: WeeklyPlanEntryRow['status']): 'success' | 'warning' | 'neutral' {
    if (status === 'completed') return 'success';
    if (status === 'skipped' || status === 'rescheduled') return 'warning';
    return 'neutral';
}

function PlanMetricTile({
    icon,
    label,
    value,
    sub,
    tone = COLORS.accent,
}: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    value: string;
    sub: string;
    tone?: string;
}) {
    return (
        <View style={styles.metricTile}>
            <View style={[styles.metricIcon, { borderColor: `${tone}55`, backgroundColor: `${tone}18` }]}>
                <MaterialCommunityIcons name={icon} size={16} color={tone} />
            </View>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricSub}>{sub}</Text>
        </View>
    );
}

function TargetProgressGrid({
    targets,
    notes,
}: {
    targets: WeeklySessionTarget[];
    notes: string[];
}) {
    if (targets.length === 0) return null;

    return (
        <Card
            variant="glass"
            style={styles.targetCard}
            noPadding
            backgroundTone="planning"
            backgroundScrimColor="rgba(10, 10, 10, 0.78)"
        >
            <View style={styles.targetCardInner}>
                <View style={styles.blockHeaderRow}>
                    <View style={styles.blockHeaderCopy}>
                        <Text style={styles.blockKicker}>WEEK MIX</Text>
                        <Text style={styles.blockTitle}>Sessions by type</Text>
                    </View>
                    <Text style={styles.blockMeta}>Count / goal</Text>
                </View>
                <View style={styles.targetRows}>
                    {targets.map((target) => {
                        const isDebt = (target.debt ?? 0) > 0;
                        return (
                            <View key={target.family} style={[styles.targetRow, isDebt && styles.targetRowDebt]}>
                                <Text style={styles.targetLabel} numberOfLines={1}>{formatTargetFamily(target.family)}</Text>
                                <Text style={[styles.targetValue, isDebt && styles.targetValueDebt]}>
                                    {target.realized ?? target.scheduled}/{target.target}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                {notes.length > 0 ? (
                    <Text style={styles.targetNote} numberOfLines={2}>{notes.map(sanitizeAthleteFacingCopy).join(' ')}</Text>
                ) : null}
            </View>
        </Card>
    );
}

function ScheduleDayCard({
    group,
    isDeloadWeek,
    onOpen,
    onReschedule,
}: {
    group: WeeklyPlanGroup;
    isDeloadWeek: boolean;
    onOpen: () => void;
    onReschedule?: (() => void) | undefined;
}) {
    const today = isToday(group.date);
    const dayDate = new Date(`${group.date}T00:00:00`);
    const hasSessions = group.sessions.length > 0;
    const pressableProps = hasSessions
        ? { accessibilityRole: 'button' as const, onPress: onOpen }
        : {};

    return (
        <AnimatedPressable
            {...pressableProps}
            accessibilityLabel={hasSessions ? `${group.dayName} plan` : `${group.dayName} rest day`}
            style={[styles.scheduleCard, today && styles.scheduleCardToday]}
        >
            <View style={styles.scheduleDateColumn}>
                <Text style={[styles.scheduleDay, today && styles.scheduleDayToday]}>
                    {group.dayName.slice(0, 3)}
                </Text>
                <Text style={styles.scheduleDate}>
                    {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                {today ? <Text style={styles.todayChip}>Today</Text> : null}
            </View>
            <View style={styles.scheduleBody}>
                {!hasSessions ? (
                    <View style={styles.restRow}>
                        <View style={styles.restIcon}>
                            <MaterialCommunityIcons name="spa-outline" size={18} color={COLORS.text.tertiary} />
                        </View>
                        <View style={styles.restCopy}>
                            <Text style={styles.scheduleTitle}>Rest day</Text>
                            <Text style={styles.scheduleMeta}>Sleep, hydrate, and keep movement easy.</Text>
                        </View>
                    </View>
                ) : (
                    group.sessions.map((entry, index) => {
                        const tone = getEntryStatusTone(entry.status);
                        const intensity = getIntensityLabel(entry.target_intensity);
                        return (
                            <View
                                key={entry.id}
                                style={[
                                    styles.sessionRow,
                                    index === group.sessions.length - 1 && styles.sessionRowLast,
                                ]}
                            >
                                <View style={styles.sessionTimeline}>
                                    <View
                                        style={[
                                            styles.sessionDot,
                                            tone === 'success' && styles.sessionDotSuccess,
                                            tone === 'warning' && styles.sessionDotWarning,
                                        ]}
                                    />
                                    {index !== group.sessions.length - 1 ? <View style={styles.sessionLine} /> : null}
                                </View>
                                <View style={styles.sessionCopy}>
                                    <View style={styles.sessionTitleRow}>
                                        <Text style={styles.scheduleTitle} numberOfLines={1}>{formatPlanSessionLabel(entry)}</Text>
                                        <Text
                                            style={[
                                                styles.statusChip,
                                                tone === 'success' && styles.statusChipSuccess,
                                                tone === 'warning' && styles.statusChipWarning,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {getEntryStatusLabel(entry.status)}
                                        </Text>
                                    </View>
                                    <Text style={styles.scheduleMeta} numberOfLines={1}>
                                        {formatPlanDuration(entry.estimated_duration_min)}
                                        {intensity ? ` / ${intensity}` : ''}
                                        {entry.slot !== 'single' ? ` / ${entry.slot.toUpperCase()}` : ''}
                                    </Text>
                                    {entry.focus ? (
                                        <Text style={styles.scheduleNote} numberOfLines={2}>{entry.focus.replace(/_/g, ' ')}</Text>
                                    ) : null}
                                    {entry.is_deload || isDeloadWeek ? (
                                        <Text style={styles.deloadNote}>Keep this lighter</Text>
                                    ) : null}
                                </View>
                            </View>
                        );
                    })
                )}
                {onReschedule ? (
                    <AnimatedPressable
                        accessibilityRole="button"
                        accessibilityLabel="Reschedule missed session"
                        style={styles.rescheduleButton}
                        onPress={onReschedule}
                    >
                        <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                    </AnimatedPressable>
                ) : null}
            </View>
            {hasSessions ? (
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.text.tertiary} />
            ) : null}
        </AnimatedPressable>
    );
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
        performanceContext,
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

    const grouped = useMemo(() => buildWeeklyPlanGroups(entries, activeWeekStart), [entries, activeWeekStart]);
    const handleGymProfilePress = useCallback(() => {
        const parentNavigation = navigation.getParent() as { navigate?: (route: string, params?: unknown) => void } | undefined;
        parentNavigation?.navigate?.('Train', { screen: 'GymProfiles' });
    }, [navigation]);

    const nextSession = useMemo(() => {
        const upcomingAnchor = activeWeekStart ?? entries[0]?.date ?? '';
        return entries.find((entry) => entry.status === 'planned' && entry.date >= upcomingAnchor)
            ?? entries.find((entry) => entry.status === 'planned');
    }, [activeWeekStart, entries]);

    const chartData = useMemo(() => buildWeeklyChartData(grouped), [grouped]);
    const maxLoad = Math.max(...chartData.map((datum) => datum.y), 10);
    const chartLayout = useMemo(() => getWeeklyChartLayout(screenWidth), [screenWidth]);
    const lineData = useMemo(() => buildWeeklyLineData(chartData), [chartData]);
    const visibleTargets = useMemo(() => (
        weekPlan?.weeklyMixPlan.sessionTargets
            .filter((target) => target.family !== 'rest' && target.target > 0)
            .slice(0, 5) ?? []
    ), [weekPlan?.weeklyMixPlan.sessionTargets]);
    const targetNotes = useMemo(() => (
        weekPlan?.weeklyMixPlan.carryForwardAdjustments
            .map((adjustment) => adjustment.reason)
            .filter((reason): reason is string => Boolean(reason))
            .slice(0, 2) ?? []
    ), [weekPlan?.weeklyMixPlan.carryForwardAdjustments]);

    const totalSessions = entries.length;
    const completedSessions = entries.filter((entry) => entry.status === 'completed').length;
    const totalMinutes = entries.reduce((acc, curr) => acc + (curr.estimated_duration_min || 0), 0);
    const completedMinutes = entries
        .filter((entry) => entry.status === 'completed')
        .reduce((acc, curr) => acc + (curr.estimated_duration_min || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const completedHours = Math.round((completedMinutes / 60) * 10) / 10;

    const renderShell = (children: React.ReactNode) => (
        <ScreenWrapper style={styles.screenShell} useSafeArea={true}>
            <ImageBackground
                source={PLAN_BACKGROUND}
                resizeMode="cover"
                style={styles.background}
                imageStyle={styles.backgroundImage}
            >
                <View style={styles.backgroundOverlay} />
                {children}
            </ImageBackground>
        </ScreenWrapper>
    );

    if (loading) {
        return renderShell(
            <>
                <View style={styles.header}>
                    <SkeletonLoader width={84} height={18} shape="rect" style={{ borderRadius: RADIUS.sm, marginBottom: SPACING.md }} />
                    <SkeletonLoader width="62%" height={34} shape="rect" style={{ borderRadius: RADIUS.lg }} />
                </View>
                <View style={styles.loadingContent}>
                    <SkeletonLoader width="100%" height={132} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                    <SkeletonLoader width="100%" height={168} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.sm }} />
                    <SkeletonLoader width="100%" height={220} borderRadius={RADIUS.xl} />
                </View>
            </>,
        );
    }

    if (!hasDefaultGymProfile) {
        return renderShell(
            <>
                <View style={styles.header}>
                    <ScreenHeader
                        kicker="Plan"
                        title="Equipment needed"
                        subtitle="Add what you can use before workouts."
                    />
                </View>
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xxxl }]}>
                    <UnifiedJourneySummaryCard
                        summary={performanceContext}
                        compact
                        showBodyMass={Boolean(performanceContext.bodyMass)}
                        variant="todayCommand"
                    />
                    <Card
                        variant="glass"
                        style={styles.emptyCard}
                        backgroundTone="planning"
                        backgroundScrimColor="rgba(10, 10, 10, 0.74)"
                    >
                        <Text style={styles.emptyTitle}>Set up your equipment</Text>
                        <Text style={styles.emptySubtitle}>
                            Tell Athleticore what equipment is available so workouts fit your gym.
                        </Text>
                        <AnimatedPressable style={styles.setupButton} onPress={handleGymProfilePress}>
                            <Text style={styles.setupButtonText}>Set Up Equipment</Text>
                        </AnimatedPressable>
                    </Card>
                </ScrollView>
            </>,
        );
    }

    if (entries.length === 0) {
        return renderShell(
            <>
                <View style={styles.header}>
                    <ScreenHeader kicker="Plan" title="Set up your plan" subtitle="Tell Athleticore what you are training for." />
                </View>
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xxxl }]}>
                    <UnifiedJourneySummaryCard
                        summary={performanceContext}
                        compact
                        showBodyMass={Boolean(performanceContext.bodyMass)}
                        variant="todayCommand"
                    />
                    <Card
                        variant="glass"
                        style={styles.emptyCard}
                        backgroundTone="planning"
                        backgroundScrimColor="rgba(10, 10, 10, 0.74)"
                    >
                        <Text style={styles.emptyTitle}>Set up your plan</Text>
                        <Text style={styles.emptySubtitle}>
                            {activeWeekStart && !isCurrentWeek
                                ? `Build your training plan for the week of ${formatShortMonthDay(activeWeekStart)}.`
                                : 'Add your goals and fixed sessions to see daily training.'}
                        </Text>
                        <AnimatedPressable
                            style={styles.setupButton}
                            onPress={activeWeekStart && !isCurrentWeek ? generateActiveWeek : handleSetupPress}
                        >
                            <Text style={styles.setupButtonText}>
                                {activeWeekStart && !isCurrentWeek ? 'Build Plan' : 'Set Up Plan'}
                            </Text>
                        </AnimatedPressable>
                        <View style={styles.emptyWeekNav}>
                            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous week" onPress={goToPrevWeek}>
                                <Text style={styles.emptyWeekNavText}>Prev Week</Text>
                            </TouchableOpacity>
                            {!isCurrentWeek ? (
                                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go to current week" onPress={handleTodayPress}>
                                    <Text style={styles.emptyWeekNavTextAccent}>Today</Text>
                                </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next week" onPress={goToNextWeek}>
                                <Text style={styles.emptyWeekNavText}>Next Week</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                </ScrollView>
            </>,
        );
    }

    return renderShell(
        <>
            <View style={styles.header}>
                <ScreenHeader
                    kicker="Plan"
                    title={isCurrentWeek ? 'This Week' : 'Planned Week'}
                    subtitle={activeWeekStart && !isCurrentWeek
                        ? `Week of ${formatShortMonthDay(activeWeekStart)}`
                        : isDeloadWeek ? 'Lighter recovery week' : 'Your training schedule'}
                    rightAction={!loading && entries.length > 0 ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Plan options"
                            accessibilityHint="Opens weekly plan actions."
                            onPress={handleOptionsPress}
                            style={styles.headerOptionsBtn}
                        >
                            <MaterialCommunityIcons name="dots-vertical" size={20} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    ) : null}
                >
                    <View style={styles.weekNavRow}>
                        <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel="Previous week"
                            onPress={goToPrevWeek}
                            style={styles.weekNavButton}
                        >
                            <MaterialCommunityIcons name="chevron-left" size={17} color={COLORS.text.secondary} />
                            <Text style={styles.weekNavButtonText}>Prev</Text>
                        </AnimatedPressable>
                        <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel="Go to current week"
                            onPress={handleTodayPress}
                            style={[styles.weekNavButton, isCurrentWeek && styles.weekNavButtonActive]}
                        >
                            <MaterialCommunityIcons
                                name="calendar-today"
                                size={15}
                                color={isCurrentWeek ? COLORS.text.inverse : COLORS.accent}
                            />
                            <Text style={[styles.weekNavButtonText, isCurrentWeek && styles.weekNavButtonTextActive]}>
                                Today
                            </Text>
                        </AnimatedPressable>
                        <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel="Next week"
                            onPress={goToNextWeek}
                            style={styles.weekNavButton}
                        >
                            <Text style={styles.weekNavButtonText}>Next</Text>
                            <MaterialCommunityIcons name="chevron-right" size={17} color={COLORS.text.secondary} />
                        </AnimatedPressable>
                    </View>
                </ScreenHeader>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 176 },
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
                <Animated.View entering={FadeInDown.delay(20).duration(ANIMATION.slow).springify()} style={styles.journeyCardWrap}>
                    <UnifiedJourneySummaryCard
                        summary={performanceContext}
                        compact
                        showBodyMass={Boolean(performanceContext.bodyMass)}
                        variant="todayCommand"
                    />
                </Animated.View>

                {nextSession ? (
                    <Animated.View entering={FadeInDown.delay(40).duration(ANIMATION.slow).springify()}>
                        <Card
                            variant="glass"
                            style={styles.heroCard}
                            noPadding
                            backgroundTone="workoutFloor"
                            backgroundScrimColor="rgba(10, 10, 10, 0.58)"
                        >
                            <AnimatedPressable
                                accessibilityRole="button"
                                accessibilityLabel={`Start ${formatPlanSessionLabel(nextSession)}`}
                                accessibilityHint="Opens the next planned training session."
                                style={styles.heroCardInner}
                                onPress={() => handleDayPress(nextSession)}
                            >
                                <View style={styles.heroHeader}>
                                    <View style={styles.heroBadge}>
                                        <MaterialCommunityIcons name="play" size={13} color={COLORS.text.inverse} />
                                        <Text style={styles.heroBadgeText}>NEXT UP</Text>
                                    </View>
                                    <Text style={styles.heroDate}>{formatLongWeekday(nextSession.date)}</Text>
                                </View>
                                <Text style={styles.heroTitle} numberOfLines={2}>
                                    {formatPlanSessionLabel(nextSession)}
                                </Text>
                                <View style={styles.heroFooter}>
                                    <View style={styles.heroAction}>
                                        <Text style={styles.heroActionText}>Start Session</Text>
                                        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.text.inverse} />
                                    </View>
                                    <Text style={styles.heroDuration}>{formatPlanDuration(nextSession.estimated_duration_min)}</Text>
                                </View>
                            </AnimatedPressable>
                        </Card>
                    </Animated.View>
                ) : null}

                {weekPlan?.message ? (
                    <Animated.View entering={FadeInDown.delay(60).duration(ANIMATION.slow).springify()}>
                        <Card
                            variant="glass"
                            style={styles.coachNoteCard}
                            noPadding
                            backgroundTone="planning"
                            backgroundScrimColor="rgba(10, 10, 10, 0.76)"
                        >
                            <View style={styles.coachNoteInner}>
                                <View style={styles.coachIconBox}>
                                    <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={COLORS.accent} />
                                </View>
                                <View style={styles.coachNoteContent}>
                                    <Text style={styles.blockKicker}>WHY THIS WEEK</Text>
                                    <Text style={styles.coachNoteText} numberOfLines={3}>{weekPlan.message}</Text>
                                </View>
                            </View>
                        </Card>
                    </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(80).duration(ANIMATION.slow).springify()}>
                    <TargetProgressGrid targets={visibleTargets} notes={targetNotes} />
                </Animated.View>

                {missedEntries.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.slow).springify()}>
                        <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel={`${missedEntries.length} session${missedEntries.length > 1 ? 's' : ''} need a new day, tap to reschedule`}
                            onPress={handleMissedBannerPress}
                            style={styles.cautionBanner}
                        >
                            <View style={styles.cautionIconBox}>
                                <MaterialCommunityIcons name="alert" size={14} color={COLORS.text.inverse} />
                            </View>
                            <Text style={styles.cautionBannerText}>
                                {missedEntries.length} session{missedEntries.length > 1 ? 's' : ''} need a new day - tap to reschedule
                            </Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.warning} />
                        </AnimatedPressable>
                    </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(120).duration(ANIMATION.slow).springify()} style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                        <View>
                            <Text style={styles.sectionKicker}>WEEKLY OVERVIEW</Text>
                            <Text style={styles.sectionTitle}>Time and follow-through</Text>
                        </View>
                    </View>
                    <View style={styles.metricsRow}>
                        <PlanMetricTile
                            icon="target"
                            label="Completed"
                            value={`${completedSessions}/${totalSessions}`}
                            sub="sessions done"
                            tone={COLORS.success}
                        />
                        <PlanMetricTile
                            icon="timer-outline"
                            label="Training Time"
                            value={`${completedHours}h`}
                            sub={`${totalHours}h planned`}
                            tone={COLORS.accent}
                        />
                    </View>

                    <Card
                        variant="glass"
                        style={styles.chartCard}
                        noPadding
                        backgroundTone="trainingLoad"
                        backgroundScrimColor="rgba(10, 10, 10, 0.80)"
                    >
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>Training minutes by day</Text>
                            <Text style={styles.chartSubtitle}>How the week is spread out</Text>
                        </View>
                        <View style={styles.chartContainer}>
                            <LineChart
                                areaChart
                                curved
                                data={lineData}
                                width={Math.max(260, chartLayout.chartWidth - SPACING.md)}
                                height={142}
                                initialSpacing={12}
                                endSpacing={12}
                                spacing={chartLayout.pointSpacing}
                                color={COLORS.accent}
                                thickness={3}
                                maxValue={maxLoad + 50}
                                startFillColor={COLORS.accent}
                                endFillColor={COLORS.accent}
                                startOpacity={0.22}
                                endOpacity={0}
                                yAxisThickness={0}
                                xAxisThickness={0}
                                yAxisLabelWidth={0}
                                hideYAxisText
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

                <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.slow).springify()} style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                        <View>
                            <Text style={styles.sectionKicker}>SCHEDULE</Text>
                            <Text style={styles.sectionTitle}>Daily plan</Text>
                        </View>
                    </View>

                    <View style={styles.scheduleStack}>
                        {grouped.map((group, groupIdx) => {
                            const hasMissed = group.sessions.some((session) => session.status === 'skipped' || session.status === 'rescheduled');
                            return (
                                <Animated.View
                                    key={group.date}
                                    entering={FadeInDown.delay(groupIdx * 45).duration(ANIMATION.slow).springify()}
                                >
                                    <ScheduleDayCard
                                        group={group}
                                        isDeloadWeek={isDeloadWeek}
                                        onOpen={() => {
                                            if (group.sessions.length > 0) {
                                                handleDayPress(group.sessions[0]);
                                            }
                                        }}
                                        onReschedule={hasMissed ? () => {
                                            const missed = group.sessions.find((session) => session.status === 'skipped' || session.status === 'rescheduled');
                                            if (missed) rescheduleDay(missed);
                                        } : undefined}
                                    />
                                </Animated.View>
                            );
                        })}
                    </View>
                </Animated.View>
            </ScrollView>

            <Animated.View
                entering={FadeInDown.delay(380).duration(ANIMATION.normal).springify()}
                style={[styles.fabContainer, { bottom: Math.max(insets.bottom + 65, 75) }]}
            >
                <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel="Log training"
                    accessibilityHint="Opens the quick session logging flow."
                    style={styles.fab}
                    onPress={handleQuickLogPress}
                >
                    <MaterialCommunityIcons name="plus" size={22} color={COLORS.text.inverse} />
                    <Text style={styles.fabText}>Log Training</Text>
                </AnimatedPressable>
            </Animated.View>
        </>,
    );
}

const styles = StyleSheet.create({
    screenShell: {
        backgroundColor: COLORS.background,
    },
    background: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    backgroundImage: {
        opacity: 0.74,
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 8, 10, 0.74)',
    },
    header: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    loadingContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
    },
    weekNavRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    weekNavButton: {
        flex: 1,
        minHeight: TAP_TARGETS.plan.min,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.14)',
        backgroundColor: 'rgba(10, 10, 10, 0.48)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
    },
    weekNavButtonActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    weekNavButtonText: {
        fontSize: 13,
        lineHeight: 17,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    weekNavButtonTextActive: {
        color: COLORS.text.inverse,
    },
    headerOptionsBtn: {
        width: TAP_TARGETS.plan.min,
        height: TAP_TARGETS.plan.min,
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
        gap: SPACING.sm + 2,
    },
    journeyCardWrap: {
        marginBottom: 2,
    },
    heroCard: {
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
        borderColor: 'rgba(212, 175, 55, 0.34)',
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
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    heroBadge: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    heroBadgeText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 10,
        lineHeight: 13,
        color: COLORS.text.inverse,
        letterSpacing: 0.8,
    },
    heroDate: {
        flexShrink: 1,
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        lineHeight: 17,
        color: COLORS.text.secondary,
        textAlign: 'right',
    },
    heroTitle: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 28,
        lineHeight: 34,
        color: COLORS.text.primary,
        letterSpacing: 0,
    },
    heroFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    heroAction: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.text.primary,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.full,
        gap: 4,
    },
    heroActionText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.inverse,
    },
    heroDuration: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    coachNoteCard: {
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
        width: 38,
        height: 38,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.28)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coachNoteContent: {
        flex: 1,
        minWidth: 0,
    },
    coachNoteText: {
        marginTop: 4,
        fontFamily: FONT_FAMILY.regular,
        fontSize: 14,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    blockHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    blockHeaderCopy: {
        flex: 1,
        minWidth: 0,
    },
    blockKicker: {
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.accent,
        letterSpacing: 1.6,
    },
    blockTitle: {
        marginTop: 3,
        fontSize: 18,
        lineHeight: 23,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    blockMeta: {
        flexShrink: 1,
        maxWidth: '42%',
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        lineHeight: 17,
        color: COLORS.text.tertiary,
        textAlign: 'right',
    },
    targetCard: {
        backgroundColor: 'rgba(10, 10, 10, 0.58)',
        borderColor: COLORS.borderLight,
        borderWidth: 1,
    },
    targetCardInner: {
        padding: SPACING.md,
        gap: SPACING.sm + 2,
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
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.10)',
        backgroundColor: 'rgba(245, 245, 240, 0.07)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    targetRowDebt: {
        borderColor: 'rgba(212, 175, 55, 0.26)',
        backgroundColor: 'rgba(212, 175, 55, 0.09)',
    },
    targetLabel: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        lineHeight: 16,
        color: COLORS.text.secondary,
        marginBottom: 2,
    },
    targetValue: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 17,
        lineHeight: 22,
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
    cautionBanner: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.34)',
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    cautionIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.warning,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cautionBannerText: {
        flex: 1,
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        lineHeight: 18,
        color: COLORS.text.primary,
    },
    sectionBlock: {
        gap: SPACING.md,
    },
    sectionHeaderRow: {
        marginTop: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    sectionKicker: {
        fontSize: 11,
        lineHeight: 14,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.accent,
        letterSpacing: 1.7,
    },
    sectionTitle: {
        marginTop: 3,
        fontSize: 20,
        lineHeight: 25,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: SPACING.sm + 2,
    },
    metricTile: {
        flex: 1,
        minWidth: 0,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.12)',
        backgroundColor: 'rgba(10, 10, 10, 0.62)',
        padding: SPACING.md,
    },
    metricIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    metricLabel: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    metricValue: {
        marginTop: 4,
        fontSize: 24,
        lineHeight: 29,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    metricSub: {
        marginTop: 1,
        fontSize: 12,
        lineHeight: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    chartCard: {
        paddingTop: SPACING.md,
        paddingBottom: SPACING.xs,
        backgroundColor: 'rgba(10, 10, 10, 0.54)',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        overflow: 'visible',
    },
    chartHeader: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xs,
    },
    chartTitle: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 16,
        lineHeight: 21,
        color: COLORS.text.primary,
    },
    chartSubtitle: {
        marginTop: 2,
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        lineHeight: 16,
        color: COLORS.text.tertiary,
    },
    chartContainer: {
        marginTop: SPACING.sm,
        paddingBottom: SPACING.md,
        overflow: 'visible',
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
    scheduleStack: {
        gap: SPACING.sm,
    },
    scheduleCard: {
        minHeight: 88,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: SPACING.sm,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.12)',
        backgroundColor: 'rgba(10, 10, 10, 0.64)',
        padding: SPACING.md,
    },
    scheduleCardToday: {
        borderColor: 'rgba(212, 175, 55, 0.45)',
        backgroundColor: 'rgba(212, 175, 55, 0.10)',
    },
    scheduleDateColumn: {
        width: 58,
        alignItems: 'flex-start',
        paddingTop: 2,
    },
    scheduleDay: {
        fontSize: 15,
        lineHeight: 19,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    scheduleDayToday: {
        color: COLORS.accent,
    },
    scheduleDate: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    todayChip: {
        marginTop: SPACING.sm,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        fontSize: 10,
        lineHeight: 13,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.inverse,
    },
    scheduleBody: {
        flex: 1,
        minWidth: 0,
    },
    restRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        minHeight: 52,
    },
    restIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(245, 245, 240, 0.07)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    restCopy: {
        flex: 1,
        minWidth: 0,
    },
    sessionRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingBottom: SPACING.sm,
        marginBottom: SPACING.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(245, 245, 240, 0.10)',
    },
    sessionRowLast: {
        marginBottom: 0,
        paddingBottom: 0,
        borderBottomWidth: 0,
    },
    sessionTimeline: {
        width: 16,
        alignItems: 'center',
    },
    sessionDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: COLORS.accent,
        marginTop: 5,
    },
    sessionDotSuccess: {
        backgroundColor: COLORS.success,
    },
    sessionDotWarning: {
        backgroundColor: COLORS.warning,
    },
    sessionLine: {
        flex: 1,
        width: 1,
        marginTop: 4,
        backgroundColor: 'rgba(245, 245, 240, 0.13)',
    },
    sessionCopy: {
        flex: 1,
        minWidth: 0,
    },
    sessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    scheduleTitle: {
        flex: 1,
        minWidth: 0,
        fontSize: 15,
        lineHeight: 20,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        textTransform: 'capitalize',
    },
    statusChip: {
        maxWidth: 96,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
        backgroundColor: 'rgba(245, 245, 240, 0.08)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        fontSize: 10,
        lineHeight: 13,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    statusChipSuccess: {
        backgroundColor: 'rgba(183, 217, 168, 0.16)',
        color: COLORS.success,
    },
    statusChipWarning: {
        backgroundColor: 'rgba(212, 175, 55, 0.16)',
        color: COLORS.warning,
    },
    scheduleMeta: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    scheduleNote: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        textTransform: 'capitalize',
    },
    deloadNote: {
        marginTop: 5,
        fontSize: 11,
        lineHeight: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.success,
    },
    rescheduleButton: {
        alignSelf: 'flex-start',
        minHeight: 34,
        marginTop: SPACING.sm,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.34)',
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rescheduleButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 12,
        color: COLORS.warning,
    },
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
        minHeight: 52,
        borderRadius: RADIUS.full,
        gap: SPACING.sm,
        ...SHADOWS.colored.accent,
    },
    fabText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 15,
        color: COLORS.text.inverse,
    },
    emptyCard: {
        paddingVertical: SPACING.xxl,
        alignItems: 'center',
    },
    emptyTitle: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 24,
        lineHeight: 30,
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
        minHeight: 48,
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.card,
    },
    setupButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 15,
        color: COLORS.text.inverse,
    },
    emptyWeekNav: {
        flexDirection: 'row',
        marginTop: SPACING.xl,
        gap: SPACING.xl,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    emptyWeekNavText: {
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    emptyWeekNavTextAccent: {
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
});
