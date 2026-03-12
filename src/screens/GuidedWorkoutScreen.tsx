import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Vibration,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    SlideInRight,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
    COLORS,
    FONT_FAMILY,
    SPACING,
    RADIUS,
    SHADOWS,
    GRADIENTS,
    ANIMATION,
} from '../theme/theme';
import { useGuidedWorkout } from '../hooks/useGuidedWorkout';
import RPESelector from '../components/RPESelector';
import WeightSuggestionBanner from '../components/WeightSuggestionBanner';
import AdaptationBanner from '../components/AdaptationBanner';
import WarmupSetsCard from '../components/WarmupSetsCard';
import RestTimerOverlay from '../components/RestTimerOverlay';
import FormCueCard from '../components/FormCueCard';
import PRCelebration from '../components/PRCelebration';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------

type GuidedWorkoutParams = {
    weeklyPlanEntryId?: string;
    scheduledActivityId?: string;
    focus?: string;
    availableMinutes?: number;
    readinessState: 'Prime' | 'Caution' | 'Depleted';
    phase: string;
    fitnessLevel: string;
    trainingDate?: string;
    isDeloadWeek?: boolean;
};

type RootStackParamList = {
    GuidedWorkout: GuidedWorkoutParams;
    WorkoutSummary: {
        workoutLogId?: string;
        durationMin?: number;
        totalSets?: number;
        totalVolume?: number;
        avgRPE?: number | null;
    };
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'GuidedWorkout'>;

// ---------------------------------------------------------------------------
import {
    formatElapsed,
    formatDisplayWeight,
    weightIncrement,
    mapPRType,
    LoadingSkeleton,
    SetDots,
    ProgressBar,
    NumberStepper,
    PrescriptionPreview,
} from './guidedWorkout/ui';
// Main screen
// ---------------------------------------------------------------------------

export function GuidedWorkoutScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const params = route.params;

    // Hook
    const {
        loading,
        prescription,
        gymProfile,
        isStarted,
        isComplete,
        startTime,
        currentExerciseIndex,
        currentExercise,
        currentProgress,
        fatigueState,
        adaptationResult,
        prResult,
        showPRCelebration,
        setShowPRCelebration,
        restSeconds,
        restTotal,
        loadAndGenerate,
        startWorkout,
        logSet,
        toggleWarmupSet,
        completeExercise,
        goToPreviousExercise,
        finishWorkout,
        skipRest,
        extendRest,
    } = useGuidedWorkout(params?.weeklyPlanEntryId, params?.scheduledActivityId);

    // Elapsed timer
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Input state
    const [selectedWeight, setSelectedWeight] = useState(0);
    const [selectedReps, setSelectedReps] = useState(0);
    const [selectedRPE, setSelectedRPE] = useState<number | null>(null);
    const [isLoggingSet, setIsLoggingSet] = useState(false);

    // Form cue expanded
    const [formCueExpanded, setFormCueExpanded] = useState(false);

    // Adaptation banner dismiss
    const [adaptationDismissed, setAdaptationDismissed] = useState(false);
    const adaptationDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Load on focus ────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            const safeReadiness = params?.readinessState ?? 'Prime';
            const safePhase = params?.phase ?? 'off-season';
            const safeFitness = params?.fitnessLevel ?? 'intermediate';

            loadAndGenerate(
                safeReadiness,
                safePhase,
                safeFitness,
                params?.focus,
                params?.availableMinutes,
                params?.trainingDate,
                params?.isDeloadWeek,
            );
        }, [
            loadAndGenerate,
            params?.readinessState,
            params?.phase,
            params?.fitnessLevel,
            params?.focus,
            params?.availableMinutes,
            params?.trainingDate,
            params?.isDeloadWeek,
        ]),
    );

    // ── Elapsed timer ─────────────────────────────────────────────
    useEffect(() => {
        if (!isStarted || !startTime) return;

        elapsedRef.current = setInterval(() => {
            const diffSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
            setElapsedSeconds(diffSeconds);
        }, 1000);

        return () => {
            if (elapsedRef.current) clearInterval(elapsedRef.current);
        };
    }, [isStarted, startTime]);

    // ── Navigate on complete ──────────────────────────────────────
    useEffect(() => {
        if (!isComplete) return;
        const doFinish = async () => {
            const summary = await finishWorkout();
            navigation.replace('WorkoutSummary', {
                durationMin: summary?.durationMin,
                totalSets: summary?.totalSets,
                totalVolume: summary?.totalVolume,
                avgRPE: summary?.avgRPE,
            });
        };
        doFinish();
    }, [isComplete]);

    // ── Pre-fill inputs when exercise changes ─────────────────────
    useEffect(() => {
        if (!currentExercise) return;
        setSelectedRPE(null);
        setAdaptationDismissed(false);
        setFormCueExpanded(false);

        const suggested = currentExercise.suggestedWeight;
        if (suggested && suggested > 0) {
            setSelectedWeight(suggested);
        } else {
            setSelectedWeight(45);
        }
        setSelectedReps(currentExercise.targetReps);
    }, [currentExercise?.exercise.id]);

    // ── Auto-dismiss adaptation banner after 3 s ──────────────────
    useEffect(() => {
        if (!adaptationResult) return;
        setAdaptationDismissed(false);
        if (adaptationDismissTimer.current) clearTimeout(adaptationDismissTimer.current);
        adaptationDismissTimer.current = setTimeout(() => {
            setAdaptationDismissed(true);
        }, 3000);
        return () => {
            if (adaptationDismissTimer.current) clearTimeout(adaptationDismissTimer.current);
        };
    }, [adaptationResult]);

    // ── Vibrate on rest end ───────────────────────────────────────
    const prevRestRef = useRef<number | null>(null);
    useEffect(() => {
        if (prevRestRef.current !== null && prevRestRef.current > 0 && restSeconds === null) {
            Vibration.vibrate([200, 100, 200]);
        }
        prevRestRef.current = restSeconds;
    }, [restSeconds]);

    // ── Derived values ────────────────────────────────────────────

    const totalExercises = prescription?.exercises.length ?? 0;
    const overallProgress = totalExercises > 0 ? currentExerciseIndex / totalExercises : 0;

    const workingSetsLogged = currentProgress
        ? currentProgress.setsLogged.filter(s => !s.isWarmup).length
        : 0;
    const targetSets = currentExercise?.targetSets ?? 0;
    const allTargetSetsLogged = workingSetsLogged >= targetSets && targetSets > 0;

    const warmupSets = currentExercise?.warmupSets ?? [];
    const warmupChecked = currentProgress?.warmupChecked ?? [];
    const warmupSetsWithState = warmupSets.map(ws => ({
        ...ws,
        isCompleted: warmupChecked.includes(ws.setNumber),
    }));
    const allWarmupsDone = warmupSets.length === 0 || warmupChecked.length >= warmupSets.length;

    const nextExercise = prescription?.exercises[currentExerciseIndex + 1] ?? null;
    const isLastExercise = currentExerciseIndex >= totalExercises - 1;

    const canLogSet = selectedRPE !== null && !isLoggingSet;

    const overloadSuggestion = currentExercise?.overloadSuggestion ?? null;
    const showWeightBanner = overloadSuggestion !== null && workingSetsLogged === 0;

    // ── Handlers ──────────────────────────────────────────────────

    const handleBeginWorkout = async () => {
        await startWorkout();
    };

    const handleLogSet = async () => {
        if (!currentExercise || selectedRPE === null || isLoggingSet) return;
        setIsLoggingSet(true);
        try {
            await logSet(
                currentExercise.exercise.id,
                selectedReps,
                selectedWeight,
                selectedRPE,
                false,
            );
            setSelectedRPE(null);
        } catch (e) {
            Alert.alert('Error', 'Failed to log set. Please try again.');
        } finally {
            setIsLoggingSet(false);
        }
    };

    const handleCompleteExercise = () => {
        completeExercise();
    };

    const handleFinishWorkout = () => {
        Alert.alert(
            'Finish Workout?',
            'Are you sure you want to finish the workout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Finish',
                    style: 'default',
                    onPress: async () => {
                        const summary = await finishWorkout();
                        navigation.replace('WorkoutSummary', {
                            durationMin: summary?.durationMin,
                            totalSets: summary?.totalSets,
                            totalVolume: summary?.totalVolume,
                            avgRPE: summary?.avgRPE,
                        });
                    },
                },
            ],
        );
    };

    const handleSkipExercise = () => {
        Alert.alert(
            'Skip Exercise?',
            `Skip ${currentExercise?.exercise.name ?? 'this exercise'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Skip',
                    style: 'destructive',
                    onPress: () => completeExercise(),
                },
            ],
        );
    };

    const handleAcceptSuggestion = () => {
        if (overloadSuggestion) {
            setSelectedWeight(overloadSuggestion.suggestedWeight);
            setSelectedReps(overloadSuggestion.suggestedReps);
        }
    };

    const handleModifySuggestion = () => {
        // Weight field is already editable; just dismiss suggestion focus
    };

    const handleWeightDecrement = () => {
        const inc = weightIncrement(selectedWeight);
        setSelectedWeight(prev => Math.max(0, Math.round((prev - inc) * 10) / 10));
    };

    const handleWeightIncrement = () => {
        const inc = weightIncrement(selectedWeight);
        setSelectedWeight(prev => Math.round((prev + inc) * 10) / 10);
    };

    const handleRepsDecrement = () => {
        setSelectedReps(prev => Math.max(1, prev - 1));
    };

    const handleRepsIncrement = () => {
        setSelectedReps(prev => prev + 1);
    };

    // ── Render ────────────────────────────────────────────────────

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>

            {/* ── Loading state ───────────────────────────────── */}
            {loading && <LoadingSkeleton />}

            {/* ── Not started: prescription preview ───────────── */}
            {!loading && prescription && !isStarted && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <PrescriptionPreview
                        prescription={prescription}
                        gymProfile={gymProfile}
                        onBegin={handleBeginWorkout}
                    />
                </ScrollView>
            )}

            {/* ── Active workout ───────────────────────────────── */}
            {!loading && isStarted && currentExercise && (
                <>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={goToPreviousExercise}
                            disabled={currentExerciseIndex === 0 || restSeconds !== null}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.backButtonText,
                                    (currentExerciseIndex === 0 || restSeconds !== null) && styles.backButtonDisabled,
                                ]}
                            >
                                ‹
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTimer}>{formatElapsed(elapsedSeconds)}</Text>
                        </View>

                        <View style={styles.headerRight}>
                            <Text style={styles.exerciseCounter}>
                                {currentExerciseIndex + 1} / {totalExercises}
                            </Text>
                        </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBarContainer}>
                        <ProgressBar progress={overallProgress} />
                    </View>

                    {/* Scrollable content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >

                        {/* Exercise name + muscle badge */}
                        <Animated.View
                            key={currentExercise.exercise.id}
                            entering={SlideInRight.duration(ANIMATION.normal).springify()}
                            style={styles.exerciseHeader}
                        >
                            <Text style={styles.exerciseName}>{currentExercise.exercise.name}</Text>
                            <View style={styles.muscleBadge}>
                                <Text style={styles.muscleBadgeText}>
                                    {currentExercise.exercise.muscle_group.replace(/_/g, ' ')}
                                </Text>
                            </View>
                        </Animated.View>

                        {/* Set tracker */}
                        <View style={styles.setTrackerRow}>
                            <Text style={styles.setTrackerLabel}>
                                Set {Math.min(workingSetsLogged + 1, targetSets)} of {targetSets}
                            </Text>
                            <SetDots
                                total={targetSets}
                                completed={workingSetsLogged}
                            />
                        </View>

                        {/* Warmup sets card */}
                        {warmupSets.length > 0 && !allWarmupsDone && (
                            <Animated.View
                                entering={FadeInDown.duration(ANIMATION.normal).springify()}
                                style={styles.sectionGap}
                            >
                                <WarmupSetsCard
                                    exerciseName={currentExercise.exercise.name}
                                    sets={warmupSetsWithState}
                                    onToggleSet={(setNumber) =>
                                        toggleWarmupSet(currentExercise.exercise.id, setNumber)
                                    }
                                />
                            </Animated.View>
                        )}

                        {/* Form cue card */}
                        {currentExercise.formCues ? (
                            <View style={styles.sectionGap}>
                                <FormCueCard
                                    exerciseName={currentExercise.exercise.name}
                                    cues={currentExercise.formCues}
                                    isExpanded={formCueExpanded}
                                    onToggle={() => setFormCueExpanded(v => !v)}
                                />
                            </View>
                        ) : null}

                        {/* Weight suggestion banner */}
                        {showWeightBanner && overloadSuggestion && (
                            <View style={styles.sectionGap}>
                                <WeightSuggestionBanner
                                    lastWeight={overloadSuggestion.lastSessionWeight}
                                    lastReps={overloadSuggestion.lastSessionReps}
                                    lastRPE={overloadSuggestion.lastSessionRPE}
                                    suggestedWeight={overloadSuggestion.suggestedWeight}
                                    suggestedReps={overloadSuggestion.suggestedReps}
                                    reasoning={overloadSuggestion.reasoning}
                                    onAccept={handleAcceptSuggestion}
                                    onModify={handleModifySuggestion}
                                    isDeload={overloadSuggestion.isDeloadSet}
                                />
                            </View>
                        )}

                        {/* Adaptation banner */}
                        {adaptationResult && !adaptationDismissed && (
                            <Animated.View
                                entering={FadeInDown.duration(ANIMATION.normal)}
                                exiting={FadeOut.duration(ANIMATION.fast)}
                                style={styles.sectionGap}
                            >
                                <AdaptationBanner
                                    message={adaptationResult.feedbackMessage}
                                    severity={adaptationResult.feedbackSeverity}
                                    onDismiss={() => setAdaptationDismissed(true)}
                                />
                            </Animated.View>
                        )}

                        {/* Weight + Reps input row */}
                        <View style={styles.inputRow}>
                            <NumberStepper
                                value={selectedWeight}
                                onDecrement={handleWeightDecrement}
                                onIncrement={handleWeightIncrement}
                                label="lbs"
                                formatValue={formatDisplayWeight}
                            />

                            <View style={styles.inputSeparator}>
                                <Text style={styles.inputSeparatorText}>×</Text>
                            </View>

                            <NumberStepper
                                value={selectedReps}
                                onDecrement={handleRepsDecrement}
                                onIncrement={handleRepsIncrement}
                                label="reps"
                            />
                        </View>

                        {/* RPE selector */}
                        <View style={styles.sectionGap}>
                            <RPESelector
                                value={selectedRPE}
                                onChange={setSelectedRPE}
                                disabled={isLoggingSet}
                            />
                        </View>

                        {/* Log set / Complete exercise button */}
                        <View style={styles.sectionGap}>
                            {!allTargetSetsLogged ? (
                                <TouchableOpacity
                                    style={[
                                        styles.primaryButton,
                                        !canLogSet && styles.primaryButtonDisabled,
                                    ]}
                                    onPress={handleLogSet}
                                    disabled={!canLogSet}
                                    activeOpacity={0.82}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isLoggingSet ? 'Logging...' : 'Log Set'}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.primaryButton, styles.completeButton]}
                                    onPress={handleCompleteExercise}
                                    activeOpacity={0.82}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isLastExercise ? 'Finish Workout' : 'Complete Exercise →'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Skip exercise link */}
                        {!allTargetSetsLogged && (
                            <TouchableOpacity
                                style={styles.skipLink}
                                onPress={handleSkipExercise}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.skipLinkText}>Skip Exercise</Text>
                            </TouchableOpacity>
                        )}

                        {/* Finish early link */}
                        {workingSetsLogged > 0 && (
                            <TouchableOpacity
                                style={styles.finishEarlyLink}
                                onPress={handleFinishWorkout}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.finishEarlyText}>Finish Workout Early</Text>
                            </TouchableOpacity>
                        )}

                    </ScrollView>

                    {/* Rest timer overlay */}
                    {restSeconds !== null && (
                        <RestTimerOverlay
                            totalSeconds={restTotal}
                            remainingSeconds={restSeconds}
                            exerciseType={currentExercise.exercise.type}
                            nextExerciseName={nextExercise?.exercise.name ?? null}
                            onSkip={skipRest}
                            onExtend={extendRest}
                        />
                    )}
                </>
            )}

            {/* ── No prescription yet (edge case) ─────────────── */}
            {!loading && !prescription && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                        Unable to generate a workout. Check your profile and try again.
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() =>
                            loadAndGenerate(
                                params.readinessState,
                                params.phase,
                                params.fitnessLevel,
                                params.focus,
                                params.availableMinutes,
                                params.trainingDate,
                                params.isDeloadWeek,
                            )
                        }
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* PR Celebration modal */}
            {prResult && prResult.isNewPR && prResult.prType && prResult.newValue !== null && (
                <PRCelebration
                    visible={showPRCelebration}
                    exerciseName={prResult.exerciseName}
                    prType={mapPRType(prResult.prType)}
                    value={prResult.newValue}
                    previousValue={prResult.previousBest}
                    onDismiss={() => setShowPRCelebration(false)}
                />
            )}
        </View>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // ── Header ────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...SHADOWS.sm,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 28,
        color: COLORS.accent,
        lineHeight: 32,
    },
    backButtonDisabled: {
        color: COLORS.text.tertiary,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTimer: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 22,
        color: COLORS.text.primary,
        letterSpacing: 1,
    },
    headerRight: {
        width: 56,
        alignItems: 'flex-end',
    },
    exerciseCounter: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.secondary,
    },

    // ── Progress bar ──────────────────────────────────────────────
    progressBarContainer: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
        backgroundColor: COLORS.surface,
    },

    // ── Scroll ────────────────────────────────────────────────────
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
    },

    // ── Exercise header ───────────────────────────────────────────
    exerciseHeader: {
        marginBottom: SPACING.md,
    },
    exerciseName: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 28,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
        marginBottom: SPACING.sm,
    },
    muscleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm + 4,
        paddingVertical: 4,
    },
    muscleBadgeText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 12,
        color: COLORS.accent,
        textTransform: 'capitalize',
    },

    // ── Set tracker ───────────────────────────────────────────────
    setTrackerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    setTrackerLabel: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 16,
        color: COLORS.text.secondary,
    },

    // ── Section gap ───────────────────────────────────────────────
    sectionGap: {
        marginBottom: SPACING.md,
    },

    // ── Input row ─────────────────────────────────────────────────
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    inputSeparator: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.lg,
    },
    inputSeparatorText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 22,
        color: COLORS.text.tertiary,
    },

    // ── Buttons ───────────────────────────────────────────────────
    primaryButton: {
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.md + 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.colored.accent,
    },
    primaryButtonDisabled: {
        backgroundColor: COLORS.border,
        shadowOpacity: 0,
        elevation: 0,
    },
    primaryButtonText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 17,
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    completeButton: {
        backgroundColor: COLORS.success,
    },
    skipLink: {
        alignItems: 'center',
        marginTop: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    skipLinkText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        color: COLORS.text.tertiary,
    },
    finishEarlyLink: {
        alignItems: 'center',
        marginTop: SPACING.xs,
        paddingVertical: SPACING.sm,
    },
    finishEarlyText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        color: COLORS.error + 'CC',
    },

    // ── Empty / error state ───────────────────────────────────────
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    emptyStateText: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 15,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    retryButton: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm + 4,
        borderRadius: RADIUS.full,
    },
    retryButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 15,
        color: '#FFFFFF',
    },
});




