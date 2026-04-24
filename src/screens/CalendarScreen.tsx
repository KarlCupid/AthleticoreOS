import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { MonthlyCalendar } from '../components/MonthlyCalendar';
import { ActivityCard } from '../components/ActivityCard';
import { StreakBadge } from '../components/StreakBadge';
import { OvertrainingAlert } from '../components/OvertrainingAlert';
import { getScheduledActivities, getTrainingStreakDays, syncEngineSchedule } from '../../lib/api/scheduleService';
import { detectOvertrainingRisk } from '../../lib/engine/calculateSchedule';
import type { ScheduledActivityRow, OvertrainingWarning } from '../../lib/engine/types';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { logError, logWarn } from '../../lib/utils/logger';

export function CalendarScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { themeColor } = useReadinessTheme();

    const [selectedDate, setSelectedDate] = useState(todayLocalDate());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activities, setActivities] = useState<ScheduledActivityRow[]>([]);
    const [streak, setStreak] = useState(0);
    const [warnings, setWarnings] = useState<OvertrainingWarning[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }

        const userId = session.user.id;

        try {
            // Load month's activities
            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            const startStr = formatLocalDate(firstDay);
            const endStr = formatLocalDate(lastDay);

            const monthActivities = await getScheduledActivities(userId, startStr, endStr);
            setActivities(monthActivities);

            // Load streak
            const streakDays = await getTrainingStreakDays(userId);
            setStreak(streakDays);

            // Get current week's activities for overtraining check
            const today = new Date();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const weekStartStr = formatLocalDate(weekStart);
            const weekEndStr = formatLocalDate(weekEnd);

            let weekActivities = monthActivities.filter(a => {
                return a.date >= weekStartStr && a.date <= weekEndStr;
            });

            // Auto-populate engine items for the current week if none exist
            
            const hasEngineItems = weekActivities.some(a => a.source === 'engine');
            if (!hasEngineItems) {
                try {
                    await syncEngineSchedule(userId, weekStartStr);
                    const newMonthActivities = await getScheduledActivities(userId, startStr, endStr);
                    setActivities(newMonthActivities);
                    weekActivities = newMonthActivities.filter(a => {
                        return a.date >= weekStartStr && a.date <= weekEndStr;
                    });
                } catch (error) {
                    logWarn('CalendarScreen.syncEngineSchedule', error, { userId, weekStartStr });
                }
            }

            // Check for ACWR from checkins
            await supabase
                .from('training_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(28);

            const { data: recentCheckins } = await supabase
                .from('daily_checkins')
                .select('sleep_quality')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(3);

            const sleepAvg = recentCheckins && recentCheckins.length > 0
                ? recentCheckins.reduce((s, c: any) => s + (c.sleep_quality ?? 3), 0) / recentCheckins.length
                : 0;

            const acwrRatio = 1.0; // default, could calculate from sessions
            const detectedWarnings = detectOvertrainingRisk(weekActivities, acwrRatio, sleepAvg);
            setWarnings(detectedWarnings);
        } catch (error) {
            logError('CalendarScreen.loadData', error, { currentMonth: currentMonth.toISOString() });
        }

        setLoading(false);
        setRefreshing(false);
    }, [currentMonth]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

    // Group activities by date for the calendar dots
    const activityDots = new Map<string, Set<string>>();
    for (const a of activities) {
        if (!activityDots.has(a.date)) activityDots.set(a.date, new Set());
        activityDots.get(a.date)!.add(a.activity_type);
    }

    // Activities for the selected date
    const selectedActivities = activities
        .filter(a => a.date === selectedDate)
        .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()} style={styles.header}>
                <Text style={styles.headerTitle}>Calendar</Text>
                <StreakBadge streak={streak} />
            </Animated.View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
            >
                {/* Overtraining Alerts */}
                {warnings.map((w, i) => (
                    <OvertrainingAlert key={i} warning={w} onDismiss={() => setWarnings(prev => prev.filter((_, j) => j !== i))} />
                ))}

                {/* Monthly Calendar Grid */}
                {loading ? (
                    <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
                        <SkeletonLoader width="100%" height={320} shape="rect" style={{ borderRadius: RADIUS.lg }} />
                    </View>
                ) : (
                    <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()}>
                        <MonthlyCalendar
                            currentMonth={currentMonth}
                            selectedDate={selectedDate}
                            activityDots={activityDots}
                            onSelectDate={setSelectedDate}
                            onChangeMonth={setCurrentMonth}
                        />
                    </Animated.View>
                )}

                {/* Day Detail */}
                <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.normal).springify()} style={styles.daySection}>
                    <View style={styles.daySectionHeader}>
                        <Text style={styles.daySectionTitle}>
                            {formatDateLabel(selectedDate)}
                        </Text>
                        <AnimatedPressable
                            style={[styles.addButton, { backgroundColor: themeColor }]}
                            onPress={() => navigation.navigate('DayDetail', { date: selectedDate })}
                        >
                            <Text style={styles.addButtonText}>View Day</Text>
                        </AnimatedPressable>
                    </View>

                    {loading ? (
                        <SkeletonLoader width="100%" height={80} shape="rect" style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.sm }} />
                    ) : selectedActivities.length === 0 ? (
                        <View style={styles.emptyDay}>
                            <Text style={styles.emptyDayText}>No activities scheduled</Text>
                            <AnimatedPressable
                                onPress={() => navigation.navigate('DayDetail', { date: selectedDate })}
                            >
                                <Text style={[styles.emptyDayLink, { color: themeColor }]}>+ Add Activity</Text>
                            </AnimatedPressable>
                        </View>
                    ) : (
                        selectedActivities.map(a => (
                            <ActivityCard
                                key={a.id}
                                activity={a}
                                onPress={() => navigation.navigate('DayDetail', { date: selectedDate })}
                            />
                        ))
                    )}
                </Animated.View>

                <View style={{ height: SPACING.xxl * 2 }} />
            </ScrollView>
        </View>
    );
}

function formatDateLabel(dateStr: string): string {
    const today = todayLocalDate();
    const d = new Date(dateStr + 'T12:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (dateStr === today) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === formatLocalDate(yesterday)) return 'Yesterday';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === formatLocalDate(tomorrow)) return 'Tomorrow';

    return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    headerTitle: {
        fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary,
    },
    daySection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
    daySectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: SPACING.md,
    },
    daySectionTitle: {
        fontSize: 18, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary,
    },
    addButton: {
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
        borderRadius: RADIUS.sm,
    },
    addButtonText: {
        fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: '#F5F5F0',
    },
    emptyDay: {
        alignItems: 'center', paddingVertical: SPACING.xl,
        backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
        ...SHADOWS.card,
    },
    emptyDayText: {
        fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary,
    },
    emptyDayLink: {
        fontSize: 14, fontFamily: FONT_FAMILY.semiBold, marginTop: SPACING.sm,
    },
});

