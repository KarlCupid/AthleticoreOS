import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MorningCheckIn } from '../components/MorningCheckIn';
import { SessionLogger } from '../components/SessionLogger';
import { Card } from '../components/Card';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { supabase } from '../../lib/supabase';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { todayLocalDate } from '../../lib/utils/date';

type WorkoutDraft = {
    id: string;
    label: string;
    intensity: number;
    minutes: string;
};

function createWorkoutDraft(): WorkoutDraft {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: '',
        intensity: 5,
        minutes: '',
    };
}

export function LogScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { themeColor } = useReadinessTheme();

    // Morning Check-In State
    const [weight, setWeight] = useState('');
    const [sleep, setSleep] = useState(3);
    const [readiness, setReadiness] = useState(3);

    // Workout Logger State (supports multiple workouts)
    const [workouts, setWorkouts] = useState<WorkoutDraft[]>([createWorkoutDraft()]);

    const [isSaving, setIsSaving] = useState(false);

    const logDate = todayLocalDate();
    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    const handleSaveLog = async () => {
        setIsSaving(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) {
                console.warn('No authenticated user found for logging.');
            }
            const userId = userData?.user?.id;

            const dailyCheckinData = {
                user_id: userId,
                morning_weight: weight ? parseFloat(weight) : null,
                sleep_quality: sleep,
                readiness: readiness,
                macro_adherence: null,
                date: logDate,
            };

            const { error: dailyError } = await supabase
                .from('daily_checkins')
                .upsert(dailyCheckinData, { onConflict: 'user_id,date' });

            if (dailyError) {
                console.error("Error saving daily checkin:", dailyError);
            }

            let hasSaveError = Boolean(dailyError);

            const validWorkouts = workouts
                .map((workout) => ({
                    ...workout,
                    parsedMinutes: parseInt(workout.minutes, 10),
                }))
                .filter((workout) => Number.isFinite(workout.parsedMinutes) && workout.parsedMinutes > 0);

            if (validWorkouts.length > 0) {
                const totalMinutes = validWorkouts.reduce((sum, workout) => sum + workout.parsedMinutes, 0);
                const weightedIntensity = Math.round(
                    validWorkouts.reduce((sum, workout) => sum + (workout.intensity * workout.parsedMinutes), 0) / totalMinutes,
                );

                const trainingData = {
                    user_id: userId,
                    duration_minutes: totalMinutes,
                    intensity_srpe: weightedIntensity,
                    date: logDate,
                };

                const { error: trainingError } = await supabase
                    .from('training_sessions')
                    .upsert(trainingData, { onConflict: 'user_id,date' });

                if (trainingError) {
                    console.error("Error saving training session:", trainingError);
                    hasSaveError = true;
                } else {
                    const { error: deleteActivityError } = await supabase
                        .from('activity_log')
                        .delete()
                        .eq('user_id', userId)
                        .eq('date', logDate);

                    if (deleteActivityError) {
                        console.error("Error clearing prior activity log rows:", deleteActivityError);
                        hasSaveError = true;
                    } else {
                        const { error: activityError } = await supabase
                            .from('activity_log')
                            .insert(
                                validWorkouts.map((workout) => ({
                                    user_id: userId,
                                    date: logDate,
                                    component_type: workout.label.trim()
                                        ? workout.label.trim().toLowerCase().replace(/\s+/g, '_')
                                        : 'training',
                                    duration_min: workout.parsedMinutes,
                                    intensity: workout.intensity,
                                    notes: workout.label.trim() || null,
                                })),
                            );

                        if (activityError) {
                            console.error("Error saving workout details:", activityError);
                            hasSaveError = true;
                        }
                    }
                }
            } else {
                const { error: deleteTrainingError } = await supabase
                    .from('training_sessions')
                    .delete()
                    .eq('user_id', userId)
                    .eq('date', logDate);

                if (deleteTrainingError) {
                    console.error("Error clearing training session:", deleteTrainingError);
                    hasSaveError = true;
                }

                const { error: deleteActivityError } = await supabase
                    .from('activity_log')
                    .delete()
                    .eq('user_id', userId)
                    .eq('date', logDate);

                if (deleteActivityError) {
                    console.error("Error clearing activity logs:", deleteActivityError);
                    hasSaveError = true;
                }
            }

            if (hasSaveError) {
                Alert.alert("Error", "Could not save log.");
                return;
            }

            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('HomeMain');
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Could not save log.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                <Text style={styles.headerTitle}>Log Entry</Text>
                <Text style={styles.headerDate}>{todayFormatted}</Text>
            </View>
            <View style={styles.dateNotice}>
                <Text style={styles.dateNoticeText}>Saving entries for {todayFormatted} ({logDate})</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Morning Check-In */}
                <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.normal).springify()}>
                    <Card title="Morning Check-In">
                        <MorningCheckIn
                            weight={weight}
                            setWeight={setWeight}
                            sleep={sleep}
                            setSleep={setSleep}
                            readiness={readiness}
                            setReadiness={setReadiness}
                        />
                    </Card>
                </Animated.View>

                {/* Training Session */}
                <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
                    <Card title="Training Session">
                        <Text style={styles.trainingHint}>
                            Log each workout block for {todayFormatted}. We combine them into one daily training load score.
                        </Text>
                        {workouts.map((workout, index) => (
                            <View key={workout.id} style={[styles.workoutBlock, index > 0 && styles.workoutBlockSpaced]}>
                                <View style={styles.workoutBlockHeader}>
                                    <Text style={styles.workoutBlockTitle}>Workout {index + 1}</Text>
                                    {workouts.length > 1 ? (
                                        <TouchableOpacity
                                            onPress={() => setWorkouts((prev) => prev.filter((entry) => entry.id !== workout.id))}
                                        >
                                            <Text style={styles.removeWorkoutText}>Remove</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type (optional): S&C, Boxing, Roadwork..."
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={workout.label}
                                    onChangeText={(value) => {
                                        setWorkouts((prev) => prev.map((entry) =>
                                            entry.id === workout.id ? { ...entry, label: value } : entry
                                        ));
                                    }}
                                />
                                <SessionLogger
                                    intensity={workout.intensity}
                                    setIntensity={(value) => {
                                        setWorkouts((prev) => prev.map((entry) =>
                                            entry.id === workout.id ? { ...entry, intensity: value } : entry
                                        ));
                                    }}
                                    minutes={workout.minutes}
                                    setMinutes={(value) => {
                                        setWorkouts((prev) => prev.map((entry) =>
                                            entry.id === workout.id ? { ...entry, minutes: value } : entry
                                        ));
                                    }}
                                />
                            </View>
                        ))}
                        <AnimatedPressable
                            style={styles.addWorkoutButton}
                            onPress={() => setWorkouts((prev) => [...prev, createWorkoutDraft()])}
                        >
                            <Text style={styles.addWorkoutButtonText}>+ Add Another Workout</Text>
                        </AnimatedPressable>
                    </Card>
                </Animated.View>

                {/* Save Button */}
                <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.normal).springify()}>
                    <AnimatedPressable
                        style={[styles.saveButtonWrapper, isSaving && styles.saveButtonDisabled]}
                        onPress={handleSaveLog}
                        disabled={isSaving}
                    >
                        <LinearGradient
                            colors={[...GRADIENTS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButton}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSaving ? 'Saving...' : 'Save Entry'}
                            </Text>
                        </LinearGradient>
                    </AnimatedPressable>
                </Animated.View>

                <View style={{ height: SPACING.xxl }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    headerDate: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    dateNotice: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.accentLight,
    },
    dateNoticeText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    trainingHint: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
        lineHeight: 19,
    },
    workoutBlock: {
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
    },
    workoutBlockSpaced: {
        marginTop: SPACING.md,
    },
    workoutBlockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    workoutBlockTitle: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    removeWorkoutText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.readiness.depleted,
    },
    input: {
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    addWorkoutButton: {
        marginTop: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.accent,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        backgroundColor: COLORS.accentLight,
    },
    addWorkoutButtonText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
    saveButtonWrapper: {
        marginTop: SPACING.lg,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    saveButton: {
        paddingVertical: SPACING.md + 2,
        alignItems: 'center',
        borderRadius: RADIUS.lg,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#FFF',
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 16,
    },
});

