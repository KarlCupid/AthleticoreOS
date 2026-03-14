import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { generateWorkoutV2 } from '../../lib/engine/calculateSC';
import {
    initFatigueState,
    processSetCompletion,
    getRestDuration,
} from '../../lib/engine/adaptiveWorkout';
import { detectPR, suggestOverload, selectProgressionModel } from '../../lib/engine/calculateOverload';
import {
    completeWorkout,
    getExerciseLibrary,
    logWorkoutSetV2,
    startWorkoutV2,
    getExerciseHistoryBatch,
    getRecentExerciseIds,
    getRecentMuscleVolume,
} from '../../lib/api/scService';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getPRs, savePR, saveOverloadHistory } from '../../lib/api/overloadService';
import { calculateACWR } from '../../lib/engine/calculateACWR';
import { todayLocalDate } from '../../lib/utils/date';
import { getWeeklyPlanEntryById, markRecommendationAccepted } from '../../lib/api/weeklyPlanService';
import type {
    DailyMission,
    WorkoutPrescriptionV2,
    PrescribedExerciseV2,
    SessionFatigueState,
    SetAdaptationResult,
    PRDetectionResult,
    ReadinessState,
    MuscleGroup,
    WorkoutLogRow,
    GymProfileRow,
} from '../../lib/engine/types';
import { logError } from '../../lib/utils/logger';

export interface SetEntry {
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe: number | null;
    isWarmup: boolean;
    wasAdapted: boolean;
    adaptationReason: string | null;
    completedAt: Date;
}

export interface ExerciseProgress {
    exerciseId: string;
    setsLogged: SetEntry[];
    warmupChecked: number[];
    isComplete: boolean;
    prResult: PRDetectionResult | null;
}

const EMPTY_VOLUME: Record<MuscleGroup, number> = {
    chest: 0, back: 0, shoulders: 0, quads: 0, hamstrings: 0,
    glutes: 0, arms: 0, core: 0, full_body: 0, neck: 0, calves: 0,
};

export function useGuidedWorkout(weeklyPlanEntryId?: string, scheduledActivityId?: string) {
    // Workout state
    const [loading, setLoading] = useState(false);
    const [prescription, setPrescription] = useState<WorkoutPrescriptionV2 | null>(null);
    const [dailyMission, setDailyMission] = useState<DailyMission | null>(null);
    const [workoutLog, setWorkoutLog] = useState<WorkoutLogRow | null>(null);
    const [gymProfile, setGymProfile] = useState<GymProfileRow | null>(null);
    const [isStarted, setIsStarted] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);

    // Exercise state
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseProgress>>({});
    const [fatigueState, setFatigueState] = useState<SessionFatigueState>(initFatigueState());

    // Adaptation state
    const [adaptationResult, setAdaptationResult] = useState<SetAdaptationResult | null>(null);
    const [prResult, setPrResult] = useState<PRDetectionResult | null>(null);
    const [showPRCelebration, setShowPRCelebration] = useState(false);

    // Rest timer
    const [restSeconds, setRestSeconds] = useState<number | null>(null);
    const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [restTotal, setRestTotal] = useState(0);

    const currentExercise = prescription?.exercises[currentExerciseIndex] ?? null;
    const currentProgress = currentExercise
        ? (exerciseProgress[currentExercise.exercise.id] ?? null)
        : null;

    const initializeProgress = useCallback((nextPrescription: WorkoutPrescriptionV2) => {
        const progress: Record<string, ExerciseProgress> = {};
        for (const ex of nextPrescription.exercises) {
            progress[ex.exercise.id] = {
                exerciseId: ex.exercise.id,
                setsLogged: [],
                warmupChecked: [],
                isComplete: false,
                prResult: null,
            };
        }
        setExerciseProgress(progress);
        setCurrentExerciseIndex(0);
        setAdaptationResult(null);
    }, []);

    // ── Load + Generate Prescription ──────────────────────────────

    const loadAndGenerate = useCallback(async (
        readinessState: ReadinessState,
        phase: any,
        fitnessLevel: any,
        focus?: any,
        availableMinutes?: number,
        trainingDate?: string,
        isDeloadWeek: boolean = false,
    ) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const userId = session.user.id;
            const sessionDate = trainingDate ?? todayLocalDate();

            // Load gym profile
            const gym = await getDefaultGymProfile(userId);
            setGymProfile(gym);

            if (weeklyPlanEntryId) {
                const planEntry = await getWeeklyPlanEntryById(weeklyPlanEntryId);
                if (planEntry?.daily_mission_snapshot) {
                    setDailyMission(planEntry.daily_mission_snapshot);
                } else {
                    setDailyMission(null);
                }
                if (planEntry?.prescription_snapshot?.exercises?.length) {
                    const snapshot = (planEntry.daily_mission_snapshot?.trainingDirective.prescription ?? planEntry.prescription_snapshot) as WorkoutPrescriptionV2;
                    setPrescription(snapshot);
                    initializeProgress(snapshot);
                    setLoading(false);
                    return;
                }
            }

            // Load exercise library
            const library = await getExerciseLibrary();

            // Get ACWR
            let acwr = 1.0;
            try {
                const acwrResult = await calculateACWR({
                    userId,
                    supabaseClient: supabase,
                    asOfDate: sessionDate,
                    fitnessLevel: (fitnessLevel as any) ?? 'intermediate',
                    phase: (phase as any) ?? 'off-season',
                });
                acwr = acwrResult.ratio;
            } catch { /* default */ }

            // Get recent exercise IDs
            const [recentIds, recentMuscleVolume, historyMap] = await Promise.all([
                getRecentExerciseIds(userId),
                getRecentMuscleVolume(userId),
                getExerciseHistoryBatch(userId, library.map((exercise) => exercise.id)),
            ]);

            // Generate V2 prescription
            const baseInput = {
                readinessState,
                phase,
                acwr,
                exerciseLibrary: library,
                recentExerciseIds: recentIds,
                recentMuscleVolume: recentMuscleVolume ?? { ...EMPTY_VOLUME },
                focus,
                fitnessLevel,
            };

            const v2Prescription = generateWorkoutV2({
                ...baseInput,
                availableMinutes,
                gymEquipment: gym?.equipment ?? [],
                exerciseHistory: historyMap,
                isDeloadWeek,
                trainingDate: sessionDate,
            });

            // Batch-load exercise history for overload suggestions
            const exerciseIds = v2Prescription.exercises.map(e => e.exercise.id);
            const filteredHistoryMap = new Map(
                exerciseIds.map((exerciseId) => [exerciseId, historyMap.get(exerciseId) ?? []] as const),
            );

            // Augment exercises with overload suggestions
            const augmented = v2Prescription.exercises.map(ex => {
                const history = filteredHistoryMap.get(ex.exercise.id) ?? [];
                if (history.length === 0) return ex;

                const suggestion = suggestOverload({
                    exerciseId: ex.exercise.id,
                    exerciseName: ex.exercise.name,
                    history,
                    fitnessLevel,
                    progressionModel: selectProgressionModel(fitnessLevel as any, history.length),
                    isDeloadWeek,
                    readinessState,
                    targetRPE: ex.targetRPE,
                    targetReps: ex.targetReps,
                    muscleGroup: ex.exercise.muscle_group,
                });

                return {
                    ...ex,
                    suggestedWeight: suggestion.suggestedWeight,
                    weightSuggestionReasoning: suggestion.reasoning,
                    overloadSuggestion: suggestion,
                } as PrescribedExerciseV2;
            });

            const finalPrescription: WorkoutPrescriptionV2 = {
                ...v2Prescription,
                exercises: augmented,
            };

            setPrescription(finalPrescription);
            setDailyMission(null);
            initializeProgress(finalPrescription);
        } catch (error) {
            logError('useGuidedWorkout.loadAndGenerate', error, { weeklyPlanEntryId });
        }
        setLoading(false);
    }, [initializeProgress, weeklyPlanEntryId]);

    // ── Start Workout ─────────────────────────────────────────────

    const startWorkout = useCallback(async () => {
        if (!prescription) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        try {
            const gym = gymProfile;
            const log = await startWorkoutV2(session.user.id, {
                workoutType: prescription.workoutType,
                focus: prescription.focus,
                weeklyPlanEntryId,
                scheduledActivityId,
                gymProfileId: gym?.id,
            });

            if (weeklyPlanEntryId) {
                await markRecommendationAccepted(weeklyPlanEntryId);
            }

            setWorkoutLog(log);
            setIsStarted(true);
            setStartTime(new Date());
            setFatigueState(initFatigueState());
        } catch (error) {
            logError('useGuidedWorkout.startWorkout', error, { weeklyPlanEntryId, scheduledActivityId });
        }
    }, [prescription, weeklyPlanEntryId, scheduledActivityId, gymProfile]);

    // ── Log a Set ─────────────────────────────────────────────────

    const logSet = useCallback(async (
        exerciseId: string,
        reps: number,
        weight: number,
        rpe: number,
        isWarmup: boolean = false,
    ) => {
        if (!workoutLog || !currentExercise) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;

        const progress = exerciseProgress[exerciseId];
        if (!progress) return;

        const workingSetNumber = progress.setsLogged.filter(s => !s.isWarmup).length + 1;

        // Process adaptation
        let adaptation: SetAdaptationResult | null = null;
        if (!isWarmup) {
            adaptation = processSetCompletion({
                exerciseId,
                exerciseName: currentExercise.exercise.name,
                setNumber: workingSetNumber,
                actualReps: reps,
                actualWeight: weight,
                actualRPE: rpe,
                targetReps: currentExercise.targetReps,
                targetWeight: currentExercise.suggestedWeight ?? weight,
                targetRPE: currentExercise.targetRPE,
                currentFatigueState: fatigueState,
                exerciseLibrary: prescription?.exercises.map(e => e.exercise) ?? [],
                availableEquipment: gymProfile?.equipment ?? [],
                remainingExercises: prescription
                    ? prescription.exercises.slice(currentExerciseIndex + 1)
                    : [],
            });

            setFatigueState(adaptation.updatedFatigueState);
            setAdaptationResult(adaptation);

            // Check for PRs
            const existingPRs = await getPRs(userId, exerciseId);
            const pr = detectPR(
                exerciseId,
                currentExercise.exercise.name,
                weight,
                reps,
                rpe,
                existingPRs,
            );

            if (pr.isNewPR && pr.prType && pr.newValue !== null) {
                setPrResult(pr);
                setShowPRCelebration(true);
                await savePR(userId, {
                    exerciseId,
                    prType: pr.prType,
                    value: pr.newValue,
                    repsAtPR: reps,
                    weightAtPR: weight,
                    rpeAtPR: rpe,
                    estimated1RM: null,
                    workoutLogId: workoutLog.id,
                });
            }
        }

        // Log to Supabase
        const setEntry: SetEntry = {
            exerciseId,
            setNumber: workingSetNumber,
            reps,
            weight,
            rpe: isWarmup ? null : rpe,
            isWarmup,
            wasAdapted: (adaptation?.adjustments.length ?? 0) > 0,
            adaptationReason: adaptation?.feedbackMessage ?? null,
            completedAt: new Date(),
        };

        await logWorkoutSetV2(workoutLog.id, {
            exercise_library_id: exerciseId,
            set_number: workingSetNumber,
            reps,
            weight_lbs: weight,
            rpe: isWarmup ? undefined : rpe,
            is_warmup: isWarmup,
            target_weight: currentExercise.suggestedWeight,
            target_reps: currentExercise.targetReps,
            target_rpe: currentExercise.targetRPE,
            was_adapted: setEntry.wasAdapted,
            adaptation_reason: setEntry.adaptationReason ?? undefined,
        });

        // Update progress
        setExerciseProgress(prev => ({
            ...prev,
            [exerciseId]: {
                ...prev[exerciseId],
                setsLogged: [...(prev[exerciseId]?.setsLogged ?? []), setEntry],
            },
        }));

        // Start rest timer (unless warmup)
        if (!isWarmup) {
            const restDuration = getRestDuration(
                currentExercise.exercise.type,
                fatigueState.fatigueLevel,
            );
            startRestTimer(restDuration);
        }
    }, [workoutLog, currentExercise, exerciseProgress, fatigueState, prescription, currentExerciseIndex, gymProfile]);

    // ── Rest Timer ────────────────────────────────────────────────

    const startRestTimer = useCallback((seconds: number) => {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        setRestTotal(seconds);
        setRestSeconds(seconds);

        restTimerRef.current = setInterval(() => {
            setRestSeconds(prev => {
                if (prev === null || prev <= 1) {
                    if (restTimerRef.current) clearInterval(restTimerRef.current);
                    restTimerRef.current = null;
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const skipRest = useCallback(() => {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        restTimerRef.current = null;
        setRestSeconds(null);
    }, []);

    const extendRest = useCallback((additionalSeconds: number) => {
        setRestSeconds(prev => (prev ?? 0) + additionalSeconds);
        setRestTotal(prev => prev + additionalSeconds);
    }, []);

    // ── Warmup Toggle ─────────────────────────────────────────────

    const toggleWarmupSet = useCallback((exerciseId: string, setNumber: number) => {
        setExerciseProgress(prev => {
            const progress = prev[exerciseId];
            if (!progress) return prev;
            const checked = progress.warmupChecked.includes(setNumber)
                ? progress.warmupChecked.filter(n => n !== setNumber)
                : [...progress.warmupChecked, setNumber];
            return { ...prev, [exerciseId]: { ...progress, warmupChecked: checked } };
        });
    }, []);

    // ── Navigate Exercises ────────────────────────────────────────

    const completeExercise = useCallback(() => {
        if (!currentExercise) return;
        setExerciseProgress(prev => ({
            ...prev,
            [currentExercise.exercise.id]: {
                ...prev[currentExercise.exercise.id],
                isComplete: true,
            },
        }));
        setAdaptationResult(null);

        if (prescription && currentExerciseIndex < prescription.exercises.length - 1) {
            setCurrentExerciseIndex(i => i + 1);
        } else {
            setIsComplete(true);
        }
    }, [currentExercise, currentExerciseIndex, prescription]);

    const goToPreviousExercise = useCallback(() => {
        if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(i => i - 1);
            setAdaptationResult(null);
        }
    }, [currentExerciseIndex]);

    // ── Finish Workout ────────────────────────────────────────────

    const finishWorkout = useCallback(async () => {
        if (!workoutLog || !startTime) return;
        const durationMin = Math.round((Date.now() - startTime.getTime()) / 60000);

        // Calculate session RPE (avg of all working sets)
        const allSets = Object.values(exerciseProgress).flatMap(p => p.setsLogged);
        const workingSets = allSets.filter(s => !s.isWarmup && s.rpe !== null);
        const avgRPE = workingSets.length > 0
            ? workingSets.reduce((s, e) => s + (e.rpe ?? 0), 0) / workingSets.length
            : null;

        const totalVolume = workingSets.reduce((s, e) => s + e.reps * e.weight, 0);
        const totalSets = workingSets.length;

        // Save overload history for each exercise
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            for (const [exId, prog] of Object.entries(exerciseProgress)) {
                const working = prog.setsLogged.filter(s => !s.isWarmup);
                if (working.length === 0) continue;
                const best = working.reduce((a, b) => b.weight > a.weight ? b : a);
                await saveOverloadHistory(session.user.id, exId, {
                    bestSetWeight: best.weight,
                    bestSetReps: best.reps,
                    bestSetRPE: best.rpe,
                    totalVolume: working.reduce((s, e) => s + e.reps * e.weight, 0),
                    workingSets: working.length,
                    estimated1RM: 0,
                    progressionModel: null,
                });
            }
            await completeWorkout(
                session.user.id,
                workoutLog.id,
                avgRPE ? Math.round(avgRPE * 10) / 10 : 6,
                durationMin,
            );
        }

        setIsComplete(true);
        if (restTimerRef.current) clearInterval(restTimerRef.current);

        return { durationMin, avgRPE, totalVolume, totalSets };
    }, [workoutLog, startTime, exerciseProgress]);

    return {
        // State
        loading,
        dailyMission,
        prescription,
        workoutLog,
        gymProfile,
        isStarted,
        isComplete,
        startTime,
        // Exercise nav
        currentExerciseIndex,
        currentExercise,
        currentProgress,
        exerciseProgress,
        fatigueState,
        // Adaptation
        adaptationResult,
        prResult,
        showPRCelebration,
        setShowPRCelebration,
        // Rest timer
        restSeconds,
        restTotal,
        // Actions
        loadAndGenerate,
        startWorkout,
        logSet,
        toggleWarmupSet,
        completeExercise,
        goToPreviousExercise,
        finishWorkout,
        skipRest,
        extendRest,
    };
}




