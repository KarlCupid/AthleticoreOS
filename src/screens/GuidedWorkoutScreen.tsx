import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Vibration,
    InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
    COLORS,
    FONT_FAMILY,
    SPACING,
    RADIUS,
    SHADOWS,
    TAP_TARGETS,
} from '../theme/theme';
import { useGuidedWorkout } from '../hooks/useGuidedWorkout';
import { useInteractionMode } from '../context/InteractionModeContext';
import { buildTrainingFloorViewModel } from '../../lib/engine/presentation';
import { SkiaRestTimer } from '../components/workout/SkiaRestTimer';
import { WorkoutProgressArc } from '../components/workout/WorkoutProgressArc';
import { ProgressRing } from '../components/ProgressRing';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { LinearGradient } from 'expo-linear-gradient';
import PRCelebration from '../components/PRCelebration';
import { Card } from '../components/Card';
import {
    buildWarmupSetsWithState,
    resolveGuidedWorkoutParams,
    type GuidedWorkoutRoute,
    type GuidedWorkoutStackParamList,
} from './guidedWorkout/utils';

// ---------------------------------------------------------------------------
import {
    formatElapsed,
    formatDisplayWeight,
    weightIncrement,
    mapPRType,
    LoadingSkeleton,
    PrescriptionPreview,
} from './guidedWorkout/ui';
import { resolveRenderer } from './guidedWorkout/strategies';
import { fromPrescriptionV2, fromExerciseProgress } from '../components/workout/adapters';
// Main screen
// ---------------------------------------------------------------------------

type NavProp = NativeStackNavigationProp<GuidedWorkoutStackParamList>;

export function GuidedWorkoutScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<GuidedWorkoutRoute>();
    const params = route.params;
    const resolvedParams = resolveGuidedWorkoutParams(params);

    // Hook
    const {
        loading,
        dailyAthleteSummary,
        prescription,
        emptyStateMessage,
        gymProfile,
        isStarted,
        isComplete,
        startTime,
        currentExerciseIndex,
        currentExercise,
        currentProgress,
        adaptationResult,
        prResult,
        showPRCelebration,
        setShowPRCelebration,
        restSeconds,
        restTotal,
        loadAndGenerate,
        startWorkout,
        logSet,
        logEffort,
        toggleWarmupSet,
        completeExercise,
        completeSection,
        goToPreviousExercise,
        finishWorkout,
        skipRest,
        extendRest,
        cancelLoad,
    } = useGuidedWorkout(resolvedParams.weeklyPlanEntryId, resolvedParams.scheduledActivityId);

    const { isGymFloor, setMode } = useInteractionMode();

    // Activation check
    const [activationCheckDone, setActivationCheckDone] = useState(false);

    // Training floor view model (pure, no side effects)
    const floorVM = buildTrainingFloorViewModel(prescription ?? null, dailyAthleteSummary ?? null);

    // Elapsed timer
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Input state
    const [selectedWeight, setSelectedWeight] = useState(0);
    const [selectedReps, setSelectedReps] = useState(0);
    const [selectedRPE, setSelectedRPE] = useState<number | null>(null);
    const [isLoggingSet, setIsLoggingSet] = useState(false);
    const [isAutoStarting, setIsAutoStarting] = useState(false);
    const autoStartTriggeredRef = useRef(false);
    const summaryNavigationTriggeredRef = useRef(false);

    // Form cue expanded
    const [formCueExpanded, setFormCueExpanded] = useState(false);

    // Adaptation banner dismiss
    const [adaptationDismissed, setAdaptationDismissed] = useState(false);
    const adaptationDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // â”€â”€ Load on focus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const task = InteractionManager.runAfterInteractions(() => {
                if (!isActive) {
                    return;
                }

                loadAndGenerate(
                    resolvedParams.readinessState,
                    resolvedParams.phase,
                    resolvedParams.fitnessLevel,
                    resolvedParams.focus,
                    resolvedParams.availableMinutes,
                    resolvedParams.trainingDate,
                    resolvedParams.isDeloadWeek,
                );
            });

            return () => {
                isActive = false;
                task.cancel?.();
                cancelLoad();
            };
        }, [
            cancelLoad,
            loadAndGenerate,
            resolvedParams.readinessState,
            resolvedParams.phase,
            resolvedParams.fitnessLevel,
            resolvedParams.focus,
            resolvedParams.availableMinutes,
            resolvedParams.trainingDate,
            resolvedParams.isDeloadWeek,
        ]),
    );

    // â”€â”€ Elapsed timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    useEffect(() => {
        if (!resolvedParams.autoStart || loading || !prescription || isStarted || autoStartTriggeredRef.current) {
            return;
        }

        autoStartTriggeredRef.current = true;
        setIsAutoStarting(true);
        void startWorkout().finally(() => {
            setIsAutoStarting(false);
        });
    }, [isStarted, loading, prescription, resolvedParams.autoStart, startWorkout]);

    // â”€â”€ Gym-floor mode: hide tabs during workout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        setMode(isStarted ? 'gym-floor' : 'standard');
        return () => {
            setMode('standard');
        };
    }, [isStarted, setMode]);

    const finalizeWorkoutAndNavigate = useCallback(async () => {
        if (summaryNavigationTriggeredRef.current) {
            return;
        }

        summaryNavigationTriggeredRef.current = true;

        try {
            const summary = await finishWorkout();
            navigation.replace('WorkoutSummary', {
                durationMin: summary?.durationMin,
                totalSets: summary?.totalSets,
                totalVolume: summary?.totalVolume,
                avgRPE: summary?.avgRPE,
            });
        } catch (_error) {
            summaryNavigationTriggeredRef.current = false;
            Alert.alert('Error', 'Failed to finish the workout. Please try again.');
        }
    }, [finishWorkout, navigation]);

    // â”€â”€ Navigate on complete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        if (!isComplete) return;
        void finalizeWorkoutAndNavigate();
    }, [finalizeWorkoutAndNavigate, isComplete]);

    // â”€â”€ Pre-fill inputs when exercise changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Auto-dismiss adaptation banner after 3 s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Vibrate on rest end â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const prevRestRef = useRef<number | null>(null);
    useEffect(() => {
        if (prevRestRef.current !== null && prevRestRef.current > 0 && restSeconds === null) {
            Vibration.vibrate([200, 100, 200]);
        }
        prevRestRef.current = restSeconds;
    }, [restSeconds]);

    // â”€â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const totalExercises = prescription?.exercises.length ?? 0;

    const workingSetsLogged = currentProgress
        ? currentProgress.setsLogged.filter(s => !s.isWarmup).length + currentProgress.effortsLogged.length
        : 0;
    const targetSets = currentExercise?.targetSets ?? 0;

    const warmupSets = currentExercise?.warmupSets ?? [];
    const warmupChecked = currentProgress?.warmupChecked ?? [];
    const warmupSetsWithState = buildWarmupSetsWithState(warmupSets, warmupChecked);
    const allWarmupsDone = warmupSets.length === 0 || warmupChecked.length >= warmupSets.length;

    const nextExercise = prescription?.exercises[currentExerciseIndex + 1] ?? null;
    const isLastExercise = currentExerciseIndex >= totalExercises - 1;
    const activeWorkoutBottomPadding = Math.max(insets.bottom, SPACING.md) + TAP_TARGETS.focus.recommended;

    const overloadSuggestion = currentExercise?.overloadSuggestion ?? null;
    const showWeightBanner = overloadSuggestion !== null && workingSetsLogged === 0;


    // -- Strategy renderer resolution ------------------------------

    const sessionVM = prescription ? fromPrescriptionV2(prescription, dailyAthleteSummary ?? null) : null;

    // Find current exercise's VM and resolve the correct renderer
    const currentExerciseVM = sessionVM?.flatExercises[currentExerciseIndex] ?? null;
    const currentSectionVM = currentExerciseVM?.sectionId
        ? sessionVM?.sections.find(s => s.id === currentExerciseVM.sectionId) ?? null
        : null;
    const currentSectionIndex = currentSectionVM
        ? sessionVM?.sections.indexOf(currentSectionVM) ?? 0
        : 0;

    const StrategyRenderer = currentExerciseVM
        ? resolveRenderer(
              currentExerciseVM.loadingStrategy,
              sessionVM?.workoutType,
              currentExerciseVM.sectionTemplate,
              currentExerciseVM.wizardKind ?? sessionVM?.wizardKind,
              sessionVM?.sessionFamily,
          )
        : null;

    const currentProgressVM = currentProgress
        ? fromExerciseProgress(currentProgress, targetSets)
        : null;
    const usesAutoRpeLogging = currentExercise?.loadingStrategy != null
        && [
            'emom',
            'amrap',
            'tabata',
            'circuit_rounds',
            'density_block',
            'for_time',
            'timed_sets',
            'intervals',
        ].includes(currentExercise.loadingStrategy);

    // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleBeginWorkout = async () => {
        await startWorkout();
    };

    const handleLogSet = async () => {
        if (!currentExercise || isLoggingSet) return;
        const effectiveRPE = selectedRPE
            ?? (usesAutoRpeLogging
                ? (currentExercise.targetRPE > 0 ? currentExercise.targetRPE : 6)
                : null);
        if (effectiveRPE === null) return;
        setIsLoggingSet(true);
        try {
            await logSet(
                currentExercise.exercise.id,
                selectedReps,
                selectedWeight,
                effectiveRPE,
                false,
                { skipRestTimer: usesAutoRpeLogging },
            );
            setSelectedRPE(null);
        } catch (_error) {
            Alert.alert('Error', 'Failed to log set. Please try again.');
        } finally {
            setIsLoggingSet(false);
        }
    };

    const handleCompleteExercise = () => {
        if (currentSectionVM?.template === 'activation' || currentSectionVM?.template === 'cooldown') {
            completeSection();
            return;
        }
        completeExercise();
    };

    const handleFinishWorkout = () => {
        Alert.alert(
            'Finish session?',
            'Stop here and save what you completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Finish session',
                    style: 'default',
                    onPress: async () => {
                        await finalizeWorkoutAndNavigate();
                    },
                },
            ],
        );
    };

    const handleLeaveWorkout = useCallback(() => {
        if (!isStarted) {
            navigation.goBack();
            return;
        }

        Alert.alert(
            'Leave workout?',
            'Your progress is saved. You can come back and resume this session later.',
            [
                { text: 'Stay', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'default',
                    onPress: () => {
                        skipRest();
                        navigation.goBack();
                    },
                },
            ],
        );
    }, [isStarted, navigation, skipRest]);

    const handleSkipExercise = () => {
        Alert.alert(
            'Skip this exercise?',
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
    const strategyProps = sessionVM && currentExerciseVM && StrategyRenderer
        ? {
            session: sessionVM,
            currentSection: currentSectionVM,
            currentSectionIndex,
            exercise: currentExerciseVM,
            exerciseIndex: currentExerciseIndex,
            totalExercises,
            progress: currentProgressVM,
            selectedWeight,
            selectedReps,
            selectedRPE,
            isLoggingSet,
            isGymFloor,
            adaptationResult,
            adaptationDismissed,
            restSeconds,
            restTotal,
            onLogSet: handleLogSet,
            onLogEffort: logEffort,
            onCompleteExercise: handleCompleteExercise,
            onSkipExercise: handleSkipExercise,
            onWeightDecrement: handleWeightDecrement,
            onWeightIncrement: handleWeightIncrement,
            onRepsDecrement: handleRepsDecrement,
            onRepsIncrement: handleRepsIncrement,
            onSelectRPE: setSelectedRPE,
            onDismissAdaptation: () => setAdaptationDismissed(true),
            onSkipRest: skipRest,
            onExtendRest: extendRest,
            onFinishWorkout: handleFinishWorkout,
            warmupSets: warmupSetsWithState.map((set) => ({
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps,
                label: set.label,
                isCompleted: set.isCompleted,
            })),
            allWarmupsDone,
            onToggleWarmup: (setNumber: number) => {
                if (currentExercise) {
                    toggleWarmupSet(currentExercise.exercise.id, setNumber);
                }
            },
            showWeightBanner,
            overloadSuggestion: overloadSuggestion ? {
                lastSessionWeight: overloadSuggestion.lastSessionWeight,
                lastSessionReps: overloadSuggestion.lastSessionReps,
                lastSessionRPE: overloadSuggestion.lastSessionRPE,
                suggestedWeight: overloadSuggestion.suggestedWeight,
                suggestedReps: overloadSuggestion.suggestedReps,
                reasoning: overloadSuggestion.reasoning,
                isDeloadSet: overloadSuggestion.isDeloadSet,
            } : null,
            onAcceptSuggestion: handleAcceptSuggestion,
            onModifySuggestion: handleModifySuggestion,
            formCues: currentExercise?.formCues ?? null,
            formCueExpanded,
            onToggleFormCue: () => setFormCueExpanded(v => !v),
            isLastExercise,
            nextExerciseName: nextExercise?.exercise.name ?? null,
            formatWeight: formatDisplayWeight,
        }
        : null;

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>

            {/* â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {loading && <LoadingSkeleton />}

            {/* â”€â”€ Not started: activation check (if required) â”€â”€â”€ */}
            {!loading && prescription && !isStarted && !resolvedParams.autoStart && floorVM.activationRequired && !activationCheckDone && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Card style={styles.missionCard}>
                        <Text style={styles.missionKicker}>ACTIVATION REQUIRED</Text>
                        <Text style={styles.missionIntent}>{floorVM.sessionGoal}</Text>
                        <Text style={[styles.missionReason, { marginTop: SPACING.md }]}>
                            {floorVM.activationGuidance}
                        </Text>
                    </Card>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Activation done"
                        accessibilityHint="Continues to the workout preview."
                        style={[styles.primaryButton, { marginBottom: SPACING.sm }]}
                        onPress={() => setActivationCheckDone(true)}
                        activeOpacity={0.82}
                        testID="guided-workout-activation-done"
                    >
                        <Text style={styles.primaryButtonText}>Activation done - continue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Skip activation"
                        accessibilityHint="Continues without logging the activation check."
                        style={styles.skipLink}
                        onPress={() => setActivationCheckDone(true)}
                        activeOpacity={0.7}
                        testID="guided-workout-skip-activation"
                    >
                        <Text style={styles.skipLinkText}>Skip activation</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* â”€â”€ Not started: prescription preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {!loading && prescription && !isStarted && !resolvedParams.autoStart && (!floorVM.activationRequired || activationCheckDone) && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Card style={styles.missionCard}>
                        <Text style={styles.missionKicker}>SESSION ROLE</Text>
                        <Text style={styles.missionIntent}>{floorVM.sessionGoal}</Text>
                        <Text style={styles.missionReason}>{floorVM.reasonSentence}</Text>
                    </Card>
                    <PrescriptionPreview
                        prescription={prescription}
                        gymProfile={gymProfile}
                        onBegin={handleBeginWorkout}
                    />
                </ScrollView>
            )}

            {!loading && prescription && !isStarted && resolvedParams.autoStart && (
                <View style={styles.autoStartState}>
                    <Card style={styles.autoStartCard}>
                        <Text style={styles.missionKicker}>STARTING WORKOUT</Text>
                        <Text style={styles.missionIntent}>
                            {isAutoStarting ? 'Opening your live workout logger…' : 'Preparing your session…'}
                        </Text>
                        <Text style={styles.missionReason}>
                            We are taking you straight to the active workout screen.
                        </Text>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                            accessibilityHint="Leaves the auto-start screen."
                            style={styles.autoStartBackButton}
                            onPress={handleLeaveWorkout}
                            activeOpacity={0.8}
                            testID="guided-workout-auto-start-back"
                        >
                            <Text style={styles.autoStartBackText}>Back</Text>
                        </TouchableOpacity>
                    </Card>
                </View>
            )}

            {/* â”€â”€ Active workout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {!loading && isStarted && currentExercise && (
                <>
                    {/* Header */}
                    <View style={styles.header}>
                        <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel="Previous exercise"
                            accessibilityHint="Moves back to the previous exercise when available."
                            accessibilityState={{ disabled: currentExerciseIndex === 0 || restSeconds !== null }}
                            style={styles.backButton}
                            onPress={goToPreviousExercise}
                            disabled={currentExerciseIndex === 0 || restSeconds !== null}
                            haptic
                            activeScale={0.88}
                            testID="guided-workout-previous-exercise"
                        >
                            <Text
                                style={[
                                    styles.backButtonText,
                                    (currentExerciseIndex === 0 || restSeconds !== null) && styles.backButtonDisabled,
                                ]}
                            >
                                {'‹'}
                            </Text>
                        </AnimatedPressable>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTimer}>{formatElapsed(elapsedSeconds)}</Text>
                            <Text style={styles.headerTimerLabel}>elapsed</Text>
                        </View>

                        <View style={styles.headerRingContainer}>
                            <ProgressRing
                                progress={totalExercises > 0 ? (currentExerciseIndex + 1) / totalExercises : 0}
                                size={36}
                                strokeWidth={3}
                                color={COLORS.accent}
                                label={`${currentExerciseIndex + 1}/${totalExercises}`}
                                labelStyle={styles.ringLabel}
                            />
                        </View>

                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Leave workout"
                            accessibilityHint="Asks for confirmation before leaving this workout."
                            style={styles.leaveButton}
                            onPress={handleLeaveWorkout}
                            activeOpacity={0.7}
                            testID="guided-workout-leave"
                        >
                            <Text style={styles.leaveButtonText}>Leave</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Accent gradient line */}
                    <LinearGradient
                        colors={['transparent', COLORS.accent + '40', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.headerAccentLine}
                    />

                    {/* Segmented progress arc */}
                    <View style={styles.progressBarContainer}>
                        <WorkoutProgressArc
                            exerciseCount={totalExercises}
                            currentIndex={currentExerciseIndex}
                            currentSetProgress={targetSets > 0 ? workingSetsLogged / targetSets : 0}
                        />
                    </View>

                    {/* Scrollable content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: activeWorkoutBottomPadding }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {StrategyRenderer && strategyProps ? (
                            <StrategyRenderer {...strategyProps} />
                        ) : null}
                    </ScrollView>

                    {/* Rest timer overlay */}
                    {restSeconds !== null && (
                        <SkiaRestTimer
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

            {/* â”€â”€ No prescription yet (edge case) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {!loading && !prescription && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                        {emptyStateMessage ?? 'No guided S&C workout is prescribed for this session.'}
                    </Text>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Retry loading guided workout"
                        style={styles.retryButton}
                        onPress={() =>
                            loadAndGenerate(
                                resolvedParams.readinessState,
                                resolvedParams.phase,
                                resolvedParams.fitnessLevel,
                                resolvedParams.focus,
                                resolvedParams.availableMinutes,
                                resolvedParams.trainingDate,
                                resolvedParams.isDeloadWeek,
                            )
                        }
                        testID="guided-workout-retry"
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
        backgroundColor: 'transparent',
    },

    // â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.background,
    },
    backButton: {
        width: TAP_TARGETS.focus.min,
        height: TAP_TARGETS.focus.min,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 32,
        color: COLORS.accent,
        lineHeight: 36,
    },
    backButtonDisabled: {
        color: COLORS.text.tertiary,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    headerTimer: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 28,
        color: COLORS.text.primary,
        letterSpacing: 2,
        includeFontPadding: false,
    },
    headerTimerLabel: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 10,
        letterSpacing: 1.5,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
    },
    headerRight: {
        width: 56,
        alignItems: 'flex-end',
    },
    headerRingContainer: {
        marginRight: SPACING.xs,
    },
    ringLabel: {
        fontSize: 9,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    headerAccentLine: {
        height: 1.5,
        backgroundColor: 'transparent',
    },
    leaveButton: {
        minWidth: 64,
        minHeight: TAP_TARGETS.focus.min,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
    },
    leaveButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.accent,
    },

    // â”€â”€ Progress bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    progressBarContainer: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.background,
    },

    // â”€â”€ Scroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
    },
    missionCard: {
        marginBottom: SPACING.md,
    },
    missionKicker: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 11,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
    },
    missionIntent: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 15,
        color: COLORS.text.primary,
        lineHeight: 22,
    },
    missionReason: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 13,
        color: COLORS.text.secondary,
        lineHeight: 20,
        marginTop: SPACING.xs,
    },

    // â”€â”€ Exercise header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    exerciseHeader: {
        marginBottom: SPACING.md,
    },
    exerciseName: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 28,
        color: COLORS.text.primary,
        letterSpacing: 0,
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

    // â”€â”€ Set tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Section gap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    sectionGap: {
        marginBottom: SPACING.md,
    },

    // â”€â”€ Input row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    primaryButton: {
        minHeight: TAP_TARGETS.focusPrimary.min,
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
        color: COLORS.text.inverse,
        letterSpacing: 0.2,
    },
    completeButton: {
        backgroundColor: COLORS.success,
    },
    skipLink: {
        minHeight: TAP_TARGETS.focus.min,
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

    // â”€â”€ Empty / error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    autoStartState: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.md,
    },
    autoStartCard: {
        paddingVertical: SPACING.lg,
    },
    autoStartBackButton: {
        minHeight: TAP_TARGETS.focus.min,
        alignSelf: 'flex-start',
        marginTop: SPACING.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surfaceSecondary,
    },
    autoStartBackText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 13,
        color: COLORS.text.secondary,
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
        minHeight: TAP_TARGETS.focus.min,
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm + 4,
        borderRadius: RADIUS.full,
    },
    retryButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 15,
        color: COLORS.text.inverse,
    },
});
