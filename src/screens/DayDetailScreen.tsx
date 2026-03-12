import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { ActivityCard } from '../components/ActivityCard';
import { ReadinessGate } from '../components/ReadinessGate';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { styles } from './DayDetailScreen.styles';
import { getScheduledActivities, addManualActivity, applySameDayOverride, skipActivity, updateScheduledActivity } from '../../lib/api/scheduleService';
import { suggestAlternative, validateDayLoad, adjustNutritionForDay } from '../../lib/engine/calculateSchedule';
import { calculateNutritionTargets } from '../../lib/engine/calculateNutrition';
import { getGlobalReadinessState } from '../../lib/engine/getGlobalReadinessState';
import { calculateACWR } from '../../lib/engine/calculateACWR';
import { getGuidedWorkoutContext } from '../../lib/api/fightCampService';
import type { ScheduledActivityRow, ReadinessState, NutritionDayAdjustment } from '../../lib/engine/types';
import { todayLocalDate } from '../../lib/utils/date';

const ACTIVITY_OPTIONS: { type: string; label: string; icon: string }[] = [
    { type: 'boxing_practice', label: 'Boxing Practice', icon: '🥊' },
    { type: 'sparring', label: 'Sparring', icon: '🥊' },
    { type: 'sc', label: 'S&C', icon: '🏋️' },
    { type: 'running', label: 'Running', icon: '🏃' },
    { type: 'conditioning', label: 'Conditioning', icon: '💪' },
    { type: 'active_recovery', label: 'Active Recovery', icon: '🧘' },
    { type: 'other', label: 'Other', icon: '📝' },
];

export function DayDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { themeColor } = useReadinessTheme();

    const dateParam = route.params?.date ?? todayLocalDate();

    const [activities, setActivities] = useState<ScheduledActivityRow[]>([]);
    const [readinessState, setReadinessState] = useState<ReadinessState>('Prime');
    const [nutritionAdjustment, setNutritionAdjustment] = useState<NutritionDayAdjustment | null>(null);
    const [showAddPicker, setShowAddPicker] = useState(false);
    const [editingActivity, setEditingActivity] = useState<ScheduledActivityRow | null>(null);
    const [editTime, setEditTime] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [editIntensity, setEditIntensity] = useState('');
    const [gateActivity, setGateActivity] = useState<ScheduledActivityRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        const userId = session.user.id;

        try {
            const dayActivities = await getScheduledActivities(userId, dateParam, dateParam);
            setActivities(dayActivities);

            // Get readiness
            const { data: checkin } = await supabase
                .from('daily_checkins')
                .select('sleep_quality, readiness')
                .eq('user_id', userId)
                .eq('date', dateParam)
                .maybeSingle();

            const acwr = await calculateACWR({ userId, supabaseClient: supabase });

            if (checkin) {
                const state = getGlobalReadinessState({
                    sleep: checkin.sleep_quality ?? 3,
                    readiness: checkin.readiness ?? 3,
                    acwr: acwr.ratio,
                });
                setReadinessState(state);
            }

            // Nutrition adjustment
            const { data: profile } = await supabase
                .from('athlete_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (profile) {
                const baseTargets = calculateNutritionTargets({
                    weightLbs: profile.base_weight ?? 150,
                    heightInches: profile.height_inches ?? null,
                    age: profile.age ?? null,
                    biologicalSex: profile.biological_sex ?? 'male',
                    activityLevel: profile.activity_level ?? 'moderate',
                    phase: profile.phase ?? 'off-season',
                    nutritionGoal: profile.nutrition_goal ?? 'maintain',
                    cycleDay: null,
                    coachProteinOverride: null,
                    coachCarbsOverride: null,
                    coachFatOverride: null,
                    coachCaloriesOverride: null,
                });
                const adjustment = adjustNutritionForDay(baseTargets, dayActivities);
                setNutritionAdjustment(adjustment);
            }
        } catch (e) {
            console.error('DayDetail load error:', e);
        }

        setLoading(false);
        setRefreshing(false);
    }, [dateParam]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAddActivity = async (type: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        try {
            await addManualActivity(session.user.id, {
                date: dateParam,
                activity_type: type as any,
                estimated_duration_min: 60,
                expected_intensity: 5,
            });
            setShowAddPicker(false);
            loadData();
        } catch (e) {
            console.error('Add activity error:', e);
        }
    };

    const handleStartActivity = (activity: ScheduledActivityRow) => {
        // Check readiness gate
        if (readinessState !== 'Prime' && activity.expected_intensity >= 7) {
            setGateActivity(activity);
            return;
        }
        void navigateToLogger(activity);
    };

    const navigateToLogger = async (activity: ScheduledActivityRow) => {
        if (activity.activity_type === 'sc') {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const context = await getGuidedWorkoutContext(session.user.id, activity.date);
            navigation.navigate('Plan', {
                screen: 'GuidedWorkout',
                params: {
                    weeklyPlanEntryId: activity.weekly_plan_entry_id ?? undefined,
                    scheduledActivityId: activity.id,
                    focus: activity.custom_label ?? undefined,
                    availableMinutes: activity.estimated_duration_min,
                    readinessState,
                    phase: context.phase,
                    fitnessLevel: context.fitnessLevel,
                    trainingDate: activity.date,
                },
            });
        } else {
            navigation.navigate('ActivityLog', { activityId: activity.id, date: dateParam });
        }
    };

    const handleSkip = async (activity: ScheduledActivityRow) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await skipActivity(session.user.id, activity.id);
        loadData();
    };

    const handleIntensityOverride = async (activity: ScheduledActivityRow, type: 'lighter' | 'harder') => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        try {
            await applySameDayOverride(session.user.id, activity, { type });
            loadData();
        } catch (e) {
            console.error('DayDetail override error:', e);
        }
    };

    const handleEditClick = (activity: ScheduledActivityRow) => {
        setEditingActivity(activity);
        setEditTime(activity.start_time ?? '');
        setEditDuration(String(activity.estimated_duration_min));
        setEditIntensity(String(activity.expected_intensity));
    };

    const handleSaveEdit = async (updateType: 'single' | 'future') => {
        if (!editingActivity) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        try {
            await updateScheduledActivity(
                session.user.id,
                editingActivity.id,
                {
                    start_time: editTime || null,
                    estimated_duration_min: parseInt(editDuration) || 60,
                    expected_intensity: parseInt(editIntensity) || 5,
                },
                editingActivity.recurring_activity_id,
                updateType
            );
            setEditingActivity(null);
            loadData();
        } catch (e) {
            console.error('Save edit error:', e);
        }
    };

    // Day load validation
    const dayValidation = validateDayLoad(activities);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <AnimatedPressable onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </AnimatedPressable>
                <Text style={styles.headerTitle}>{formatDateLabel(dateParam)}</Text>
                <AnimatedPressable onPress={() => setShowAddPicker(true)}>
                    <Text style={[styles.addIcon, { color: themeColor }]}>+</Text>
                </AnimatedPressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={themeColor} />}
            >
                {loading ? (
                    <View style={{ paddingHorizontal: SPACING.lg }}>
                        <SkeletonLoader width="100%" height={100} shape="rect" style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.sm }} />
                        <SkeletonLoader width="100%" height={100} shape="rect" style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.sm }} />
                    </View>
                ) : (
                    <>
                        {/* Day Load Status */}
                        <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.normal).springify()} style={[styles.loadBanner, { backgroundColor: dayValidation.safe ? COLORS.readiness.primeLight : COLORS.readiness.depletedLight }]}>
                            <Text style={styles.loadBannerText}>
                                {dayValidation.safe ? '✓' : '⚠'} {dayValidation.message}
                            </Text>
                        </Animated.View>

                        {/* Nutrition Adjustment Info */}
                        {nutritionAdjustment && nutritionAdjustment.carbModifierPct !== 0 && (
                            <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()} style={styles.nutritionBanner}>
                                <Text style={styles.nutritionBannerTitle}>📊 Nutrition Adjusted</Text>
                                <Text style={styles.nutritionBannerText}>{nutritionAdjustment.message}</Text>
                            </Animated.View>
                        )}

                        {/* Activities Timeline */}
                        <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.normal).springify()} style={styles.timeline}>
                            {activities.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No activities scheduled</Text>
                                    <Text style={styles.emptySubtext}>Tap + to add an activity</Text>
                                </View>
                            ) : (
                                activities.map((a, i) => (
                                    <Animated.View key={a.id} entering={FadeInDown.delay(150 + (i * 50)).duration(ANIMATION.normal).springify()}>
                                        <ActivityCard
                                            activity={a}
                                            onPress={() => handleStartActivity(a)}
                                            onLog={() => handleStartActivity(a)}
                                            onSkip={() => handleSkip(a)}
                                            onEdit={() => handleEditClick(a)}
                                            onLighter={() => handleIntensityOverride(a, 'lighter')}
                                            onHarder={() => handleIntensityOverride(a, 'harder')}
                                            showActions
                                        />
                                    </Animated.View>
                                ))
                            )}
                        </Animated.View>
                    </>
                )}

                <View style={{ height: SPACING.xxl * 2 }} />
            </ScrollView>

            {/* Add Activity Picker Modal */}
            {showAddPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Add Activity</Text>
                        {ACTIVITY_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.type}
                                style={styles.pickerOption}
                                onPress={() => handleAddActivity(opt.type)}
                            >
                                <Text style={styles.pickerOptionIcon}>{opt.icon}</Text>
                                <Text style={styles.pickerOptionLabel}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowAddPicker(false)}>
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Edit Activity Modal */}
            {editingActivity && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Edit Activity</Text>

                        <Text style={styles.inputLabel}>Start Time (HH:MM / 24hr)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editTime}
                            onChangeText={setEditTime}
                            placeholder="e.g. 06:00"
                        />

                        <Text style={styles.inputLabel}>Duration (mins)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editDuration}
                            onChangeText={setEditDuration}
                            keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>Intensity (RPE 1-10)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editIntensity}
                            onChangeText={setEditIntensity}
                            keyboardType="numeric"
                        />

                        <TouchableOpacity style={[styles.applyButton, { backgroundColor: themeColor }]} onPress={() => handleSaveEdit('single')}>
                            <Text style={styles.applyButtonText}>Save (This Event Only)</Text>
                        </TouchableOpacity>

                        {editingActivity.recurring_activity_id && (
                            <TouchableOpacity style={[styles.applyButton, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: themeColor, marginTop: 8 }]} onPress={() => handleSaveEdit('future')}>
                                <Text style={[styles.applyButtonText, { color: themeColor }]}>Save (All Future Events)</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setEditingActivity(null)}>
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Readiness Gate */}
            {gateActivity && (
                <ReadinessGate
                    activity={gateActivity}
                    readinessState={readinessState}
                    onProceed={() => { void navigateToLogger(gateActivity); setGateActivity(null); }}
                    onSwitch={() => { setGateActivity(null); loadData(); }}
                    onDismiss={() => setGateActivity(null)}
                />
            )}
        </View>
    );
}

function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
}





