import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { SectionHeader } from '../components/SectionHeader';
import { PrescriptionCard } from '../components/PrescriptionCard';
import { WorkoutHistoryTab } from '../components/WorkoutHistoryTab';
import { WorkoutAnalyticsTab } from '../components/WorkoutAnalyticsTab';
import { WorkoutPrescriptionSection } from '../components/WorkoutPrescriptionSection';
import { ActivityCard } from '../components/ActivityCard';

import { PlanStackParamList } from '../navigation/types';
import { useWorkoutData, computeACWRTimeSeries } from '../hooks/useWorkoutData';
import { todayLocalDate } from '../../lib/utils/date';
import { supabase } from '../../lib/supabase';
import { getGuidedWorkoutContext } from '../../lib/api/fightCampService';
import type { WeeklyPlanEntryRow } from '../../lib/engine/types';
import {
    buildSleepData,
    buildTrainingLoadData,
    buildWeightData,
    getWorkoutFocusLabel,
    WORKOUT_TABS,
    type WorkoutTabKey,
} from './workout/utils';

type NavProp = NativeStackNavigationProp<PlanStackParamList>;

function groupWeekEntries(entries: WeeklyPlanEntryRow[]): Array<{
    date: string;
    dayOfWeek: number;
    sessions: WeeklyPlanEntryRow[];
}> {
    const groups = new Map<string, { date: string; dayOfWeek: number; sessions: WeeklyPlanEntryRow[] }>();

    for (const entry of entries) {
        const existing = groups.get(entry.date);
        if (existing) {
            existing.sessions.push(entry);
            continue;
        }

        groups.set(entry.date, {
            date: entry.date,
            dayOfWeek: entry.day_of_week,
            sessions: [entry],
        });
    }

    return Array.from(groups.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((group) => ({
            ...group,
            sessions: [...group.sessions].sort((a, b) => a.slot.localeCompare(b.slot)),
        }));
}

export function WorkoutScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const { themeColor, currentLevel } = useReadinessTheme();

    const [activeTab, setActiveTab] = useState<WorkoutTabKey>('today');

    // Workout data hook
    const {
        loading, refreshing, loadData, onRefresh,
        prescription, todayActivities, workoutHistory,
        checkins, sessions, userId,
        cutProtocol,
        todayPlanEntry,
        weeklyEntries,
        isDeloadWeek,
        handleStartWorkout
    } = useWorkoutData(currentLevel);
    const displayedPrescription = prescription;

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const openGuidedWorkout = useCallback(async (entry: WeeklyPlanEntryRow) => {
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
    }, [navigation, currentLevel]);
    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={[styles.header, { paddingTop: SPACING.md }]}>
                    <SkeletonLoader width={60} height={28} shape="rect" style={{ borderRadius: RADIUS.sm }} />
                    <SkeletonLoader width="100%" height={36} shape="rect" style={{ marginTop: SPACING.md, borderRadius: RADIUS.sm }} />
                </View>
                <View style={{ padding: SPACING.lg }}>
                    <SkeletonLoader width="100%" height={60} shape="rect" style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.md }} />
                    <SkeletonLoader width="100%" height={200} shape="rect" style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.md }} />
                    <SkeletonLoader width="100%" height={48} shape="rect" style={{ borderRadius: RADIUS.lg }} />
                </View>
            </View>
        );
    }

    const weightData = buildWeightData(checkins);
    const sleepData = buildSleepData(checkins);
    const trainingLoadData = buildTrainingLoadData(sessions);
    const contextualTodayActivities = todayActivities.filter((activity) => activity.activity_type !== 'sc');
    const groupedWeeklyEntries = groupWeekEntries(weeklyEntries);

    const acwrData = computeACWRTimeSeries(sessions);
    const checkinDates = new Set(checkins.map(c => c.date));

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>S&C</Text>
                    <View style={styles.headerActions}>
                        <Pressable
                            style={styles.headerBtn}
                            onPress={() => navigation.navigate('PlanHome')}
                        >
                            <Text style={styles.headerBtnText}>Plan</Text>
                        </Pressable>
                        <Pressable
                            style={styles.headerBtn}
                            onPress={() => navigation.navigate('GymProfiles')}
                        >
                            <Text style={styles.headerBtnText}>Gym</Text>
                        </Pressable>
                    </View>
                </View>
                <View style={styles.tabBar}>
                    {WORKOUT_TABS.map(tab => (
                        <AnimatedPressable
                            key={tab}
                            style={[styles.tab, activeTab === tab && { backgroundColor: themeColor }]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && { color: '#FFF' }]}>
                                {tab === 'plan' ? 'Week' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </AnimatedPressable>
                    ))}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
                }
            >
                {activeTab === 'today' && (
                    <>
                        {/* Today's Weekly Plan Entry */}
                        {todayPlanEntry && (
                            <Animated.View entering={FadeInDown.delay(0).duration(300).springify()}>
                                <Pressable
                                    style={[styles.planEntryCard, isDeloadWeek && styles.planEntryDeload]}
                                    onPress={() => { void openGuidedWorkout(todayPlanEntry); }}
                                >
                                    <View style={styles.planEntryHeader}>
                                        <View>
                                            <Text style={styles.planEntryLabel}>
                                                {isDeloadWeek ? 'Recovery Day' : 'Today\'s Plan'}
                                            </Text>
                                            <Text style={styles.planEntryFocus}>
                                                {todayPlanEntry.focus
                                                    ? getWorkoutFocusLabel(todayPlanEntry.focus, todayPlanEntry.session_type)
                                                    : todayPlanEntry.session_type}
                                            </Text>
                                        </View>
                                        <View style={styles.planEntryMeta}>
                                            <Text style={styles.planEntryDuration}>{todayPlanEntry.estimated_duration_min} min</Text>
                                            {todayPlanEntry.target_intensity && (
                                                <Text style={styles.planEntryRPE}>RPE {todayPlanEntry.target_intensity}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <Text style={styles.planEntryAction}>
                                        {todayPlanEntry.status === 'completed' ? 'Completed' : 'Start Guided Workout ->'}
                                    </Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Weight Cut Intensity Cap Banner */}
                        {cutProtocol && (
                            <Animated.View
                                entering={FadeInDown.delay(0).duration(300).springify()}
                                style={[
                                    styles.cutBanner,
                                    {
                                        borderColor: cutProtocol.training_intensity_cap !== null && cutProtocol.training_intensity_cap <= 4
                                            ? '#F59E0B'
                                            : '#16A34A',
                                        backgroundColor: cutProtocol.training_intensity_cap !== null && cutProtocol.training_intensity_cap <= 4
                                            ? '#FFFBEB'
                                            : '#DCFCE7',
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.cutBannerTitle,
                                    {
                                        color: cutProtocol.training_intensity_cap !== null && cutProtocol.training_intensity_cap <= 4
                                            ? '#D97706'
                                            : '#4F46E5'
                                    }
                                ]}>
                                    WEIGHT CUT - Intensity Cap: {cutProtocol.training_intensity_cap !== null
                                        ? `${cutProtocol.training_intensity_cap}/10 RPE`
                                        : 'No cap'}
                                </Text>
                                {cutProtocol.training_recommendation && (
                                    <Text style={styles.cutBannerBody}>{cutProtocol.training_recommendation}</Text>
                                )}
                            </Animated.View>
                        )}

                        {/* Prescription Card */}
                        {displayedPrescription && (
                            <PrescriptionCard message={displayedPrescription.message} />
                        )}

                        {/* Workout Prescription */}
                        <WorkoutPrescriptionSection
                            prescription={displayedPrescription}
                            themeColor={themeColor}
                            onStart={() => {
                                if (todayPlanEntry) {
                                    void openGuidedWorkout(todayPlanEntry);
                                    return;
                                }
                                void handleStartWorkout(navigation);
                            }}
                        />

                        {/* Today's schedule */}
                        {contextualTodayActivities.length > 0 && (
                            <View style={{ marginTop: SPACING.lg }}>
                                <SectionHeader title={todayPlanEntry ? "Also On Today's Schedule" : "Today's Schedule"} />
                                {todayPlanEntry && (
                                    <Text style={styles.contextScheduleNote}>
                                        Your guided workout above is the S&C prescription. These items are the rest of today's training schedule.
                                    </Text>
                                )}
                                {contextualTodayActivities.map((activity) => (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        onPress={() => {
                                            if (activity.activity_type === 'sc' && todayPlanEntry) {
                                                void openGuidedWorkout(todayPlanEntry);
                                            }
                                        }}
                                        onLog={() => {
                                            if (activity.activity_type === 'sc' && todayPlanEntry) {
                                                void openGuidedWorkout(todayPlanEntry);
                                            }
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                )}

                {activeTab === 'plan' && (
                    <Animated.View entering={FadeInDown.delay(50).duration(300).springify()}>
                        {/* Week overview cards */}
                        {isDeloadWeek && (
                            <View style={styles.deloadBanner}>
                                <Text style={styles.deloadBannerText}>Recovery Week - Reduced volume to rebuild</Text>
                            </View>
                        )}
                        {groupedWeeklyEntries.length === 0 ? (
                            <View style={styles.emptyPlan}>
                                <Text style={styles.emptyPlanTitle}>No weekly plan yet</Text>
                                <Text style={styles.emptyPlanSub}>Set up your training days, session length, and preferences to get a smart weekly plan.</Text>
                                <Pressable
                                    style={styles.setupBtn}
                                    onPress={() => navigation.navigate('WeeklyPlanSetup')}
                                >
                                    <Text style={styles.setupBtnText}>Set Up Weekly Plan</Text>
                                </Pressable>
                            </View>
                        ) : (
                            groupedWeeklyEntries.map((group, idx) => {
                                    const today = todayLocalDate();
                                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                    const primaryEntry = group.sessions.find((session) => session.status !== 'completed') ?? group.sessions[0];
                                    const isGroupCompleted = group.sessions.every((session) => session.status === 'completed');
                                    const isGroupSkipped = group.sessions.every((session) => session.status === 'skipped');
                                    return (
                                        <Animated.View
                                            key={group.date}
                                            entering={FadeInDown.delay(idx * 60).duration(280).springify()}
                                        >
                                            <Pressable
                                                style={[
                                                    styles.weekCard,
                                                    group.date === today && styles.weekCardToday,
                                                    isGroupCompleted && styles.weekCardDone,
                                                ]}
                                                onPress={() => {
                                                    if (primaryEntry && !isGroupCompleted) {
                                                        void openGuidedWorkout(primaryEntry);
                                                    }
                                                }}
                                            >
                                                <View style={styles.weekCardLeft}>
                                                    <Text style={styles.weekCardDay}>{dayNames[group.dayOfWeek]}</Text>
                                                    <Text style={styles.weekCardDate}>{group.date.slice(5).replace('-', '/')}</Text>
                                                </View>
                                                <View style={styles.weekCardCenter}>
                                                    {group.sessions.map((session) => (
                                                        <View key={session.id} style={styles.weekSessionRow}>
                                                            <Text style={styles.weekSessionSlot}>
                                                                {session.slot === 'single' ? 'DAY' : session.slot.toUpperCase()}
                                                            </Text>
                                                            <View style={styles.weekSessionCopy}>
                                                                <Text style={styles.weekCardFocus}>
                                                                    {session.is_deload ? 'Recovery' : getWorkoutFocusLabel(session.focus, session.session_type)}
                                                                </Text>
                                                                <Text style={styles.weekCardMeta}>
                                                                    {session.estimated_duration_min} min
                                                                    {session.target_intensity ? ` | RPE ${session.target_intensity}` : ''}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                                <View style={styles.weekCardRight}>
                                                    {isGroupCompleted && <Text style={styles.weekCardDoneIcon}>Done</Text>}
                                                    {isGroupSkipped && <Text style={styles.weekCardSkipIcon}>Skip</Text>}
                                                    {!isGroupCompleted && group.date === today && (
                                                        <Text style={styles.weekCardTodayBadge}>Today</Text>
                                                    )}
                                                    {!isGroupCompleted && group.date > today && (
                                                        <Text style={styles.weekCardChevron}>{'>'}</Text>
                                                    )}
                                                </View>
                                            </Pressable>
                                        </Animated.View>
                                    );
                                })
                        )}
                        <Pressable
                            style={styles.planSettingsBtn}
                            onPress={() => navigation.navigate('WeeklyPlanSetup')}
                        >
                            <Text style={styles.planSettingsBtnText}>Adjust Weekly Plan</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {activeTab === 'history' && (
                    <WorkoutHistoryTab workoutHistory={workoutHistory} />
                )}

                {activeTab === 'analytics' && (
                    <WorkoutAnalyticsTab
                        userId={userId}
                        trainingLoadData={trainingLoadData}
                        acwrData={acwrData}
                        checkinDates={checkinDates}
                        weightData={weightData}
                        sleepData={sleepData}
                    />
                )}

                <View style={{ height: SPACING.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    headerActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    headerBtn: {
        backgroundColor: COLORS.surfaceSecondary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    headerBtnText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    // Today plan entry card
    planEntryCard: {
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.accent + '30',
    },
    planEntryDeload: {
        backgroundColor: '#F5F3FF',
        borderColor: '#15803D' + '30',
    },
    planEntryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xs,
    },
    planEntryLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    planEntryFocus: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginTop: 2,
    },
    planEntryMeta: {
        alignItems: 'flex-end',
    },
    planEntryDuration: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    planEntryRPE: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    planEntryAction: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        marginTop: SPACING.xs,
    },
    // Plan tab styles
    deloadBanner: {
        backgroundColor: '#F5F3FF',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#15803D' + '40',
    },
    deloadBannerText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: '#166534',
        textAlign: 'center',
    },
    emptyPlan: {
        alignItems: 'center',
        paddingVertical: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
    },
    emptyPlanTitle: {
        fontSize: 20,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    emptyPlanSub: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.lg,
    },
    setupBtn: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
    },
    setupBtnText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    weekCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.card,
    },
    weekCardToday: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    weekCardDone: {
        opacity: 0.7,
    },
    weekCardLeft: {
        width: 44,
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    weekCardDay: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    weekCardDate: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    weekCardCenter: {
        flex: 1,
    },
    weekCardFocus: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    weekCardMeta: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    weekCardRight: {
        alignItems: 'flex-end',
    },
    weekSessionRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    weekSessionSlot: {
        width: 28,
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
    },
    weekSessionCopy: {
        flex: 1,
    },
    weekCardDoneIcon: {
        fontSize: 18,
    },
    weekCardSkipIcon: {
        fontSize: 18,
    },
    weekCardTodayBadge: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        backgroundColor: COLORS.accentLight,
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    weekCardChevron: {
        fontSize: 22,
        color: COLORS.text.tertiary,
    },
    planSettingsBtn: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
        marginTop: SPACING.sm,
    },
    planSettingsBtnText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    cutBanner: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.xl,
        borderWidth: 1.5,
        padding: SPACING.md,
        gap: 4,
    },
    cutBannerTitle: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        letterSpacing: 0.3,
    },
    cutBannerBody: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 13,
        color: COLORS.text.secondary,
        lineHeight: 18,
    },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
        marginBottom: SPACING.md,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.borderLight,
        borderRadius: RADIUS.sm,
        padding: 2,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.xs + 2,
        borderRadius: RADIUS.sm - 2,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    content: {
        padding: SPACING.lg,
    },
    contextScheduleNote: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
        lineHeight: 18,
    },
    prescriptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
    },
    prescriptionMeta: {
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginTop: 2,
    },
    exerciseRow: {
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    supersetRow: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.chart.accent,
        paddingLeft: SPACING.sm,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    exerciseName: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    exerciseSub: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    supersetBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    supersetBadgeText: {
        fontSize: 9,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    cnsChip: {
        backgroundColor: COLORS.readiness.depleted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    cnsChipText: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    startButtonWrapper: {
        marginTop: SPACING.lg,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md + 2,
        borderRadius: RADIUS.lg,
    },
    startButtonText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
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


