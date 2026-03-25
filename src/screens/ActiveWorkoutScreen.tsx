import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    Vibration,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, ANIMATION, GRADIENTS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { IconPlus, IconCheckCircle } from '../components/icons';
import { styles } from './ActiveWorkoutScreen.styles';
import {
    logWorkoutSet,
    updateWorkoutSet,
    completeWorkout,
    cancelWorkout,
    getWorkoutSetsForLog,
    getExerciseLibrary,
} from '../../lib/api/scService';
import { ExerciseLibraryRow, WorkoutSetLogRow } from '../../lib/engine/types';
import type { TrainStackParamList } from '../navigation/types';
import { logError } from '../../lib/utils/logger';

type NavProp = NativeStackNavigationProp<TrainStackParamList>;
type RouteParams = { ActiveWorkout: TrainStackParamList['ActiveWorkout'] };

interface ExerciseGroup {
    exercise: ExerciseLibraryRow;
    sets: WorkoutSetLogRow[];
}

export function ActiveWorkoutScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProp<RouteParams, 'ActiveWorkout'>>();
    const { workoutLogId, focus, workoutType, selectedExerciseId, selectionToken } = route.params;
    const { themeColor } = useReadinessTheme();

    // Timer state
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

    // Rest timer state
    const [restSeconds, setRestSeconds] = useState(0);
    const [restActive, setRestActive] = useState(false);
    const [restDuration] = useState(90);
    const restRef = useRef<ReturnType<typeof setInterval>>(undefined);

    // Workout state
    const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
    const [allExercises, setAllExercises] = useState<ExerciseLibraryRow[]>([]);
    const [sessionRPE, setSessionRPE] = useState('');
    const processedSelectionTokenRef = useRef<string | null>(null);

    // Session timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            if (timerRunning) setElapsedSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [timerRunning]);

    // Rest timer
    useEffect(() => {
        if (restActive && restSeconds > 0) {
            restRef.current = setInterval(() => {
                setRestSeconds(s => {
                    if (s <= 1) {
                        setRestActive(false);
                        Vibration.vibrate([200, 100, 200]);
                        clearInterval(restRef.current);
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        }
        return () => clearInterval(restRef.current);
    }, [restActive, restSeconds]);

    // Load existing sets
    useEffect(() => {
        loadSets();
        loadExercises();
    }, [workoutLogId]);

    const loadExercises = async () => {
        try {
            const lib = await getExerciseLibrary();
            setAllExercises(lib);
        } catch (error) {
            logError('ActiveWorkoutScreen.loadExercises', error, { workoutLogId });
        }
    };

    const loadSets = async () => {
        try {
            const sets = await getWorkoutSetsForLog(workoutLogId);
            const grouped = new Map<string, ExerciseGroup>();

            for (const set of sets) {
                const exercise = set.exercise;
                if (!exercise) continue;

                const existingGroup = grouped.get(exercise.id);
                if (existingGroup) {
                    existingGroup.sets.push(set);
                } else {
                    grouped.set(exercise.id, { exercise, sets: [set] });
                }
            }

            setExerciseGroups(
                Array.from(grouped.values()).map(group => ({
                    ...group,
                    sets: group.sets.sort((a, b) => a.set_number - b.set_number),
                }))
            );
        } catch (error) {
            logError('ActiveWorkoutScreen.loadSets', error, { workoutLogId });
        }
    };

    const startRestTimer = (seconds?: number) => {
        clearInterval(restRef.current);
        setRestSeconds(seconds ?? restDuration);
        setRestActive(true);
    };

    const handleAddExercise = () => {
        navigation.navigate('ExerciseSearch', { workoutLogId });
    };

    const handleLogSet = async (exercise: ExerciseLibraryRow) => {
        try {
            const existingGroup = exerciseGroups.find(g => g.exercise.id === exercise.id);
            const nextSetNumber = (existingGroup?.sets.length ?? 0) + 1;

            const newSet = await logWorkoutSet(workoutLogId, {
                exercise_library_id: exercise.id,
                set_number: nextSetNumber,
                reps: 0,
                weight_lbs: 0,
                is_warmup: false,
            });

            setExerciseGroups(prev => {
                const existing = prev.find(g => g.exercise.id === exercise.id);
                if (existing) {
                    return prev.map(g =>
                        g.exercise.id === exercise.id
                            ? { ...g, sets: [...g.sets, newSet] }
                            : g
                    );
                }
                return [...prev, { exercise, sets: [newSet] }];
            });
        } catch (error) {
            logError('ActiveWorkoutScreen.handleLogSet', error, { workoutLogId, exerciseId: exercise.id });
        }
    };

    
    useEffect(() => {
        if (!selectedExerciseId || !selectionToken) {
            return;
        }

        if (processedSelectionTokenRef.current === selectionToken) {
            return;
        }

        const selectedExercise = allExercises.find(ex => ex.id === selectedExerciseId);
        if (!selectedExercise) {
            return;
        }

        processedSelectionTokenRef.current = selectionToken;
        void handleLogSet(selectedExercise);
        navigation.setParams({ selectedExerciseId: undefined, selectionToken: undefined });
    }, [allExercises, navigation, selectedExerciseId, selectionToken]);
    const handleUpdateSet = async (
        setId: string,
        exerciseId: string,
        field: keyof WorkoutSetLogRow,
        value: any,
    ) => {
        try {
            await updateWorkoutSet(setId, { [field]: value });
            setExerciseGroups(prev =>
                prev.map(g =>
                    g.exercise.id === exerciseId
                        ? {
                            ...g,
                            sets: g.sets.map(s =>
                                s.id === setId ? { ...s, [field]: value } : s
                            ),
                        }
                        : g
                )
            );

            // Auto-start rest timer after completing a set (when reps > 0)
            if (field === 'reps' && value > 0) {
                startRestTimer();
            }
        } catch (error) {
            logError('ActiveWorkoutScreen.handleUpdateSet', error, { setId, exerciseId });
        }
    };

    const handleCancelWorkout = () => {
        Alert.alert(
            'Cancel Workout',
            'Are you sure you want to cancel this workout? This action cannot be undone.',
            [
                { text: 'No, Continue', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelWorkout(workoutLogId);
                            navigation.goBack();
                        } catch (e: any) {
                            Alert.alert('Error', e.message ?? 'Failed to cancel workout');
                        }
                    },
                },
            ]
        );
    };

    const handleFinishWorkout = async () => {
        const rpe = parseInt(sessionRPE);
        if (!rpe || rpe < 1 || rpe > 10) {
            Alert.alert('Session RPE', 'Please enter a session RPE (1-10) before finishing.');
            return;
        }

        const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
        if (!session?.user) return;

        try {
            const durationMinutes = Math.ceil(elapsedSeconds / 60);
            await completeWorkout(session.user.id, workoutLogId, rpe, durationMinutes);
            Alert.alert('Workout Complete! 💪', `Duration: ${durationMinutes}min | RPE: ${rpe}`, [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to save workout');
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleQuickAddExercise = (exercise: ExerciseLibraryRow) => {
        // Add an exercise with one empty set
        handleLogSet(exercise);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header with timer */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>
                        {(focus ?? workoutType).replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <Text style={[styles.timer, { color: themeColor }]}>
                        {formatTime(elapsedSeconds)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.pauseButton}
                    onPress={() => setTimerRunning(!timerRunning)}
                >
                    <Text style={styles.pauseText}>{timerRunning ? '⏸' : '▶️'}</Text>
                </TouchableOpacity>
            </View>

            {/* Rest Timer Overlay */}
            {restActive && (
                <View style={[styles.restTimerBar, { backgroundColor: themeColor }]}>
                    <Text style={styles.restTimerText}>Rest: {formatTime(restSeconds)}</Text>
                    <TouchableOpacity onPress={() => { setRestActive(false); clearInterval(restRef.current); }}>
                        <Text style={styles.restSkipText}>Skip →</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Exercise Groups */}
                {exerciseGroups.map((group, gi) => (
                    <Animated.View key={group.exercise.id} entering={FadeInDown.delay(40 * gi).duration(ANIMATION.normal).springify()}>
                        <Card style={{ marginBottom: SPACING.md }}>
                            <Text style={styles.exerciseTitle}>{group.exercise.name}</Text>
                            <Text style={styles.exerciseMeta}>
                                {group.exercise.muscle_group.replace(/_/g, ' ')} · CNS {group.exercise.cns_load}
                            </Text>

                            {/* Set Header */}
                            <View style={styles.setHeader}>
                                <Text style={[styles.setHeaderText, { flex: 0.5 }]}>Set</Text>
                                <Text style={styles.setHeaderText}>Reps</Text>
                                <Text style={styles.setHeaderText}>Weight</Text>
                                <Text style={styles.setHeaderText}>RPE</Text>
                                <Text style={[styles.setHeaderText, { flex: 0.6 }]}>WU</Text>
                            </View>

                            {/* Sets */}
                            {group.sets.map((set, si) => (
                                <View key={set.id} style={styles.setRow}>
                                    <Text style={[styles.setNumber, { flex: 0.5 }]}>
                                        {set.is_warmup ? 'W' : si + 1}
                                    </Text>
                                    <TextInput
                                        style={styles.setInput}
                                        value={set.reps > 0 ? String(set.reps) : ''}
                                        onChangeText={t => handleUpdateSet(set.id, group.exercise.id, 'reps', parseInt(t) || 0)}
                                        keyboardType="number-pad"
                                        placeholder="—"
                                        placeholderTextColor={COLORS.text.tertiary}
                                    />
                                    <TextInput
                                        style={styles.setInput}
                                        value={set.weight_lbs > 0 ? String(set.weight_lbs) : ''}
                                        onChangeText={t => handleUpdateSet(set.id, group.exercise.id, 'weight_lbs', parseFloat(t) || 0)}
                                        keyboardType="decimal-pad"
                                        placeholder="lbs"
                                        placeholderTextColor={COLORS.text.tertiary}
                                    />
                                    <TextInput
                                        style={styles.setInput}
                                        value={set.rpe ? String(set.rpe) : ''}
                                        onChangeText={t => handleUpdateSet(set.id, group.exercise.id, 'rpe', parseInt(t) || null)}
                                        keyboardType="number-pad"
                                        placeholder="—"
                                        placeholderTextColor={COLORS.text.tertiary}
                                    />
                                    <TouchableOpacity
                                        style={{ flex: 0.6, alignItems: 'center' }}
                                        onPress={() => handleUpdateSet(set.id, group.exercise.id, 'is_warmup', !set.is_warmup)}
                                    >
                                        <View style={[
                                            styles.warmupToggle,
                                            set.is_warmup && { backgroundColor: COLORS.chart.accent },
                                        ]} />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Add Set Button */}
                            <TouchableOpacity
                                style={styles.addSetButton}
                                onPress={() => handleLogSet(group.exercise)}
                            >
                                <IconPlus size={14} color={themeColor} />
                                <Text style={[styles.addSetText, { color: themeColor }]}>Add Set</Text>
                            </TouchableOpacity>
                        </Card>
                    </Animated.View>
                ))}

                {/* Add Exercise Button */}
                <AnimatedPressable
                    style={styles.addExerciseButton}
                    onPress={handleAddExercise}
                >
                    <IconPlus size={18} color={themeColor} />
                    <Text style={[styles.addExerciseText, { color: themeColor }]}>Add Exercise</Text>
                </AnimatedPressable>

                {/* Quick Add — Recently used exercises */}
                {allExercises.length > 0 && exerciseGroups.length === 0 && (
                    <View style={{ marginTop: SPACING.lg }}>
                        <Text style={styles.quickAddTitle}>Quick Add</Text>
                        {allExercises.slice(0, 8).map((ex, qi) => (
                            <Animated.View key={ex.id} entering={FadeInDown.delay(30 * qi).duration(ANIMATION.normal).springify()}>
                                <AnimatedPressable
                                    style={styles.quickAddItem}
                                    onPress={() => handleQuickAddExercise(ex)}
                                >
                                    <Text style={styles.quickAddName}>{ex.name}</Text>
                                    <Text style={styles.quickAddMeta}>{ex.muscle_group.replace(/_/g, ' ')}</Text>
                                </AnimatedPressable>
                            </Animated.View>
                        ))}
                    </View>
                )}

                {/* Finish Section */}
                {exerciseGroups.length > 0 && (
                    <View style={styles.finishSection}>
                        <Text style={styles.finishLabel}>Session RPE (1-10)</Text>
                        <TextInput
                            style={styles.rpeInput}
                            value={sessionRPE}
                            onChangeText={setSessionRPE}
                            keyboardType="number-pad"
                            placeholder="8"
                            placeholderTextColor={COLORS.text.tertiary}
                            maxLength={2}
                        />
                        <AnimatedPressable
                            style={styles.finishButtonWrapper}
                            onPress={handleFinishWorkout}
                        >
                            <LinearGradient
                                colors={[...GRADIENTS.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.finishButton}
                            >
                                <IconCheckCircle size={20} color="#FFF" />
                                <Text style={styles.finishButtonText}>Finish Workout</Text>
                            </LinearGradient>
                        </AnimatedPressable>
                    </View>
                )}

                {/* Cancel Workout Button */}
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelWorkout}
                >
                    <Text style={styles.cancelButtonText}>Cancel Workout</Text>
                </TouchableOpacity>

                <View style={{ height: SPACING.xxl * 2 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}



