import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    initFatigueState,
    processSetCompletion,
    getRestDuration,
} from '../../lib/engine/adaptiveWorkout';
import { autoregulateSession } from '../../lib/engine/sc/autoregulation';
import { detectPR } from '../../lib/engine/calculateOverload';
import {
    completeWorkout,
    getWorkoutEffortsForLog,
    getWorkoutSetsForLog,
    logWorkoutEffort,
    logWorkoutSetV2,
    startWorkoutV2,
} from '../../lib/api/scService';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getPRsForExercises, savePR, saveOverloadHistory } from '../../lib/api/overloadService';
import { todayLocalDate } from '../../lib/utils/date';
import { markRecommendationAccepted } from '../../lib/api/weeklyPlanService';
import {
    getDailyEngineState,
    getWeeklyAthleteSummary,
} from '../../lib/api/dailyPerformanceService';
import { isGuidedEngineScheduledActivity } from '../../lib/engine/sessionOwnership';
import type {
    DailyAthleteSummary,
    WorkoutPrescriptionV2,
    SessionFatigueState,
    SetAdaptationResult,
    PRDetectionResult,
    ReadinessState,
    WorkoutLogRow,
    WorkoutEffortKind,
    WorkoutEffortLogInput,
    GymProfileRow,
    ComplianceReason,
    PRRecord,
    ScheduledActivityRow,
    WeeklyPlanEntryRow,
} from '../../lib/engine/types';
import { logError } from '../../lib/utils/logger';
import { addMonitoringBreadcrumb } from '../../lib/observability/breadcrumbs';

function normalizeWorkoutFocus(focus: WorkoutPrescriptionV2['focus']): WorkoutLogRow['focus'] {
    return focus === 'strength' ? 'full_body' : focus;
}

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

export interface EffortEntry {
    exerciseId: string | null;
    effortKind: WorkoutEffortKind;
    effortIndex: number;
    targetSnapshot: Record<string, unknown>;
    actualSnapshot: Record<string, unknown>;
    actualRPE: number | null;
    qualityRating: number | null;
    painFlag: boolean;
    notes: string | null;
    completedAt: Date;
}

export interface ExerciseProgress {
    exerciseId: string;
    setsLogged: SetEntry[];
    effortsLogged: EffortEntry[];
    warmupChecked: number[];
    isComplete: boolean;
    prResult: PRDetectionResult | null;
}

interface WorkoutSummary {
    durationMin: number;
    avgRPE: number | null;
    totalVolume: number;
    totalSets: number;
}

function buildCachedPRRecord(
    exerciseId: string,
    exerciseName: string,
    detection: PRDetectionResult,
    reps: number,
    weight: number,
    rpe: number | null,
    achievedDate: string,
): PRRecord | null {
    if (!detection.prType || detection.newValue === null) {
        return null;
    }

    return {
        id: `${exerciseId}:${detection.prType}:${achievedDate}:${detection.newValue}`,
        exerciseId,
        exerciseName,
        prType: detection.prType,
        value: detection.newValue,
        repsAtPR: reps,
        weightAtPR: weight,
        rpeAtPR: rpe,
        estimated1RM: detection.prType === 'estimated_1rm' ? detection.newValue : null,
        achievedDate,
        date: achievedDate,
    };
}

export function useGuidedWorkout(weeklyPlanEntryId?: string, scheduledActivityId?: string) {
    // Workout state
    const [loading, setLoading] = useState(false);
    const [prescription, setPrescription] = useState<WorkoutPrescriptionV2 | null>(null);
    const [dailyAthleteSummary, setDailyAthleteSummary] = useState<DailyAthleteSummary | null>(null);
    const [workoutLog, setWorkoutLog] = useState<WorkoutLogRow | null>(null);
    const [gymProfile, setGymProfile] = useState<GymProfileRow | null>(null);
    const [isStarted, setIsStarted] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
    const [activationRPE, setActivationRPE] = useState<number | null>(null);
    const [complianceReason, setComplianceReason] = useState<ComplianceReason | null>(null);

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
    const sessionDateRef = useRef(todayLocalDate());
    const prHistoryRef = useRef<Map<string, PRRecord[]>>(new Map());
    const finishPromiseRef = useRef<Promise<WorkoutSummary | undefined> | null>(null);
    const finishedSummaryRef = useRef<WorkoutSummary | null>(null);
    const loadRequestRef = useRef(0);

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
                effortsLogged: [],
                warmupChecked: [],
                isComplete: false,
                prResult: null,
            };
        }
        setExerciseProgress(progress);
        setCurrentExerciseIndex(0);
        setAdaptationResult(null);
        setPrResult(null);
        finishPromiseRef.current = null;
        finishedSummaryRef.current = null;
        prHistoryRef.current = new Map();
    }, []);

    const resetPrescriptionState = useCallback((mission: DailyAthleteSummary | null, message: string | null) => {
        setDailyAthleteSummary(mission);
        setPrescription(null);
        setExerciseProgress({});
        setCurrentExerciseIndex(0);
        setAdaptationResult(null);
        setPrResult(null);
        setShowPRCelebration(false);
        finishPromiseRef.current = null;
        finishedSummaryRef.current = null;
        prHistoryRef.current = new Map();
        setEmptyStateMessage(message);
    }, []);

    const preloadPRHistory = useCallback(async (userId: string, nextPrescription: WorkoutPrescriptionV2) => {
        const exerciseIds = [...new Set(nextPrescription.exercises.map((exercise) => exercise.exercise.id))];

        try {
            prHistoryRef.current = await getPRsForExercises(userId, exerciseIds);
        } catch (error) {
            prHistoryRef.current = new Map();
            logError('useGuidedWorkout.preloadPRHistory', error, { userId });
        }
    }, []);

    const hydrateWorkoutProgress = useCallback(async (
        workout: WorkoutLogRow,
        nextPrescription: WorkoutPrescriptionV2,
    ) => {
        const [loggedSets, loggedEfforts] = await Promise.all([
            getWorkoutSetsForLog(workout.id),
            getWorkoutEffortsForLog(workout.id),
        ]);
        const exerciseOrder = new Map(nextPrescription.exercises.map((exercise, index) => [exercise.exercise.id, index]));
        const nextProgress: Record<string, ExerciseProgress> = {};

        for (const exercise of nextPrescription.exercises) {
            nextProgress[exercise.exercise.id] = {
                exerciseId: exercise.exercise.id,
                setsLogged: [],
                effortsLogged: [],
                warmupChecked: [],
                isComplete: false,
                prResult: null,
            };
        }

        for (const set of loggedSets) {
            const exerciseId = set.exercise_library_id;
            const existing = nextProgress[exerciseId];
            if (!existing) {
                continue;
            }

            existing.setsLogged.push({
                exerciseId,
                setNumber: set.set_number,
                reps: set.reps,
                weight: set.weight_lbs,
                rpe: set.rpe,
                isWarmup: set.is_warmup,
                wasAdapted: false,
                adaptationReason: null,
                completedAt: new Date(),
            });

            if (set.is_warmup && !existing.warmupChecked.includes(set.set_number)) {
                existing.warmupChecked.push(set.set_number);
            }
        }

        for (const effort of loggedEfforts) {
            const exerciseId = effort.exercise_library_id;
            if (!exerciseId) {
                continue;
            }

            const existing = nextProgress[exerciseId];
            if (!existing) {
                continue;
            }

            existing.effortsLogged.push({
                exerciseId,
                effortKind: effort.effort_kind,
                effortIndex: effort.effort_index,
                targetSnapshot: effort.target_snapshot ?? {},
                actualSnapshot: effort.actual_snapshot ?? {},
                actualRPE: effort.actual_rpe,
                qualityRating: effort.quality_rating,
                painFlag: effort.pain_flag,
                notes: effort.notes,
                completedAt: effort.completed_at ? new Date(effort.completed_at) : new Date(),
            });
        }

        for (const exercise of nextPrescription.exercises) {
            const progress = nextProgress[exercise.exercise.id];
            progress.setsLogged.sort((a, b) => a.setNumber - b.setNumber);
            progress.effortsLogged.sort((a, b) => a.effortIndex - b.effortIndex);
            progress.warmupChecked.sort((a, b) => a - b);
            progress.isComplete = (
                progress.setsLogged.filter((set) => !set.isWarmup).length + progress.effortsLogged.length
            ) >= exercise.targetSets;
        }

        const nextIndex = nextPrescription.exercises.findIndex((exercise) => {
            const progress = nextProgress[exercise.exercise.id];
            return !progress.isComplete;
        });
        const fallbackIndex = loggedSets.reduce((highestIndex, set) => {
            const index = exerciseOrder.get(set.exercise_library_id);
            return typeof index === 'number' ? Math.max(highestIndex, index) : highestIndex;
        }, 0);
        const fallbackEffortIndex = loggedEfforts.reduce((highestIndex, effort) => {
            const exerciseId = effort.exercise_library_id;
            const index = exerciseId ? exerciseOrder.get(exerciseId) : undefined;
            return typeof index === 'number' ? Math.max(highestIndex, index) : highestIndex;
        }, fallbackIndex);

        setExerciseProgress(nextProgress);
        setCurrentExerciseIndex(
            nextIndex >= 0
                ? nextIndex
                : Math.min(fallbackEffortIndex, Math.max(0, nextPrescription.exercises.length - 1)),
        );
        setStartTime(
            workout.created_at
                ? new Date(workout.created_at)
                : new Date(),
        );
    }, []);

    // ── Load + Generate Prescription ──────────────────────────────

    const loadAndGenerate = useCallback(async (
        _readinessState: ReadinessState,
        _phase: any,
        _fitnessLevel: any,
        _focus?: any,
        _availableMinutes?: number,
        trainingDate?: string,
        _isDeloadWeek: boolean = false,
    ) => {
        const requestId = ++loadRequestRef.current;
        const isCurrentRequest = () => requestId === loadRequestRef.current;
        setLoading(true);
        addMonitoringBreadcrumb('guided_workout', 'load_and_generate_started', {
            weeklyPlanEntryPresent: Boolean(weeklyPlanEntryId),
            scheduledActivityPresent: Boolean(scheduledActivityId),
            trainingDate: trainingDate ?? null,
        });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user || !isCurrentRequest()) return;
            const userId = session.user.id;
            const sessionDate = trainingDate ?? todayLocalDate();
            sessionDateRef.current = sessionDate;

            addMonitoringBreadcrumb('daily_engine', 'guided_workout_engine_load_started', {
                sessionDate,
                forceRefresh: false,
            });
            const [gym, engineState] = await Promise.all([
                getDefaultGymProfile(userId),
                getDailyEngineState(userId, sessionDate),
            ]);
            addMonitoringBreadcrumb('daily_engine', 'guided_workout_engine_load_succeeded', {
                sessionDate,
                hasPrescription: Boolean(engineState.workoutPrescription?.exercises?.length),
            });

            if (!isCurrentRequest()) {
                return;
            }

            setGymProfile(gym);
            setEmptyStateMessage(null);

            let mission = engineState.mission;

            if (weeklyPlanEntryId) {
                const weekStart = engineState.primaryPlanEntry?.week_start_date
                    ?? engineState.weeklyPlanEntries.find((entry: WeeklyPlanEntryRow) => entry.id === weeklyPlanEntryId)?.week_start_date
                    ?? engineState.weeklyPlanEntries[0]?.week_start_date
                    ?? null;
                const weeklyAthleteSummary = weekStart
                    ? await getWeeklyAthleteSummary(userId, weekStart)
                    : null;
                if (!isCurrentRequest()) {
                    return;
                }
                const matchingEntry = weeklyAthleteSummary?.entries.find((entry: WeeklyPlanEntryRow) => entry.id === weeklyPlanEntryId)
                    ?? engineState.weeklyPlanEntries.find((entry: WeeklyPlanEntryRow) => entry.id === weeklyPlanEntryId)
                    ?? null;
                const entrySummary = (matchingEntry as { dailyAthleteSummary?: typeof engineState.mission | null } | null)?.dailyAthleteSummary ?? null;

                mission = entrySummary ?? engineState.mission;

                const entryPrescription = entrySummary?.trainingDirective.prescription
                    ?? matchingEntry?.prescription_snapshot
                    ?? null;

                if (entryPrescription?.exercises?.length) {
                    setDailyAthleteSummary(mission);
                    setPrescription(entryPrescription);
                    initializeProgress(entryPrescription);
                    return;
                }

                resetPrescriptionState(
                    mission,
                    mission.trainingDirective.reason || mission.summary || 'This session does not have a guided S&C prescription from the engine.',
                );
                return;
            }

            if (scheduledActivityId) {
                const matchingActivity = engineState.scheduledActivities.find((activity: ScheduledActivityRow) => activity.id === scheduledActivityId) ?? null;
                const matchingEntry = matchingActivity?.weekly_plan_entry_id
                    ? engineState.weeklyPlanEntries.find((entry: WeeklyPlanEntryRow) => entry.id === matchingActivity.weekly_plan_entry_id) ?? null
                    : null;
                const entryPrescription = matchingEntry?.prescription_snapshot ?? null;

                if (matchingActivity && isGuidedEngineScheduledActivity(matchingActivity) && entryPrescription?.exercises?.length) {
                    setDailyAthleteSummary(mission);
                    setPrescription(entryPrescription);
                    initializeProgress(entryPrescription);
                    return;
                }

                if (matchingActivity && isGuidedEngineScheduledActivity(matchingActivity) && !matchingActivity.weekly_plan_entry_id) {
                    resetPrescriptionState(
                        mission,
                        'This engine-managed session is not linked to a canonical plan entry. Regenerate today\'s plan before starting it.',
                    );
                    return;
                }
                resetPrescriptionState(
                    mission,
                    mission.trainingDirective.reason || mission.summary || 'This session does not have a guided S&C prescription from the engine.',
                );
                return;
            }

            if (engineState.workoutPrescription?.exercises?.length) {
                setDailyAthleteSummary(mission);
                setPrescription(engineState.workoutPrescription);
                initializeProgress(engineState.workoutPrescription);
                return;
            }

            resetPrescriptionState(
                mission,
                mission.trainingDirective.reason || mission.summary || 'This session does not have a guided S&C prescription from the engine.',
            );
        } catch (error) {
            logError('useGuidedWorkout.loadAndGenerate', error, {
                weeklyPlanEntryPresent: Boolean(weeklyPlanEntryId),
                scheduledActivityPresent: Boolean(scheduledActivityId),
            });
        } finally {
            if (isCurrentRequest()) {
                setLoading(false);
            }
        }
    }, [initializeProgress, resetPrescriptionState, scheduledActivityId, weeklyPlanEntryId]);

    const cancelLoad = useCallback(() => {
        loadRequestRef.current += 1;
        setLoading(false);
    }, []);

    // ── Start Workout ─────────────────────────────────────────────

    const startWorkout = useCallback(async () => {
        if (!prescription) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        addMonitoringBreadcrumb('guided_workout', 'start_started', {
            weeklyPlanEntryPresent: Boolean(weeklyPlanEntryId),
            scheduledActivityPresent: Boolean(scheduledActivityId),
        });
        try {
            const gym = gymProfile;
            const log = await startWorkoutV2(session.user.id, {
                workoutType: prescription.workoutType,
                focus: normalizeWorkoutFocus(prescription.focus),
                weeklyPlanEntryId,
                scheduledActivityId,
                gymProfileId: gym?.id,
                date: sessionDateRef.current,
                sessionFamily: prescription.sessionPrescription?.sessionFamily ?? null,
                primaryModality: prescription.modality ?? prescription.sessionPrescription?.modality ?? null,
                energySystem: prescription.energySystem ?? prescription.sessionPrescription?.energySystem ?? null,
                doseSummary: prescription.doseSummary ?? prescription.sessionPrescription?.dose ?? {},
                trackingSchemaId: prescription.trackingSchemaId ?? prescription.sessionPrescription?.trackingSchema.id ?? null,
                safetyFlags: prescription.safetyFlags ?? prescription.sessionPrescription?.safetyFlags ?? [],
            });

            if (weeklyPlanEntryId) {
                await markRecommendationAccepted(weeklyPlanEntryId);
            }

            setWorkoutLog(log);
            setIsStarted(true);
            setIsComplete(false);
            setFatigueState(initFatigueState());
            setActivationRPE(null);
            setComplianceReason(null);
            finishPromiseRef.current = null;
            finishedSummaryRef.current = null;
            await Promise.all([
                hydrateWorkoutProgress(log, prescription),
                preloadPRHistory(session.user.id, prescription),
            ]);
            addMonitoringBreadcrumb('guided_workout', 'start_succeeded', {
                workoutType: prescription.workoutType,
                focus: prescription.focus,
            });
        } catch (error) {
            logError('useGuidedWorkout.startWorkout', error, {
                weeklyPlanEntryPresent: Boolean(weeklyPlanEntryId),
                scheduledActivityPresent: Boolean(scheduledActivityId),
            });
        }
    }, [gymProfile, hydrateWorkoutProgress, preloadPRHistory, prescription, scheduledActivityId, weeklyPlanEntryId]);

    const submitActivationRPE = useCallback((rpe: number) => {
        setActivationRPE(rpe);
        setPrescription((current) => current ? autoregulateSession(current, rpe, current.expectedActivationRPE) : current);
    }, []);

    // ── Log a Set ─────────────────────────────────────────────────

    const startRestTimerInternal = useCallback((seconds: number) => {
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

    const logSet = useCallback(async (
        exerciseId: string,
        reps: number,
        weight: number,
        rpe: number,
        isWarmup: boolean = false,
        options?: { skipRestTimer?: boolean },
    ) => {
        if (!workoutLog || !currentExercise) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;

        const progress = exerciseProgress[exerciseId];
        if (!progress) return;

        const workingSetNumber = progress.setsLogged.filter(s => !s.isWarmup).length + 1;

        // Process adaptation
        let adaptationResultForSet: SetAdaptationResult | null = null;
        let nextFatigueState = fatigueState;
        if (!isWarmup) {
            const adaptation = processSetCompletion({
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

            nextFatigueState = adaptation.updatedFatigueState;
            setFatigueState(nextFatigueState);
            setAdaptationResult(adaptation);
            adaptationResultForSet = adaptation;
        }

        // Log to Supabase
        const setEntry: SetEntry = {
            exerciseId,
            setNumber: workingSetNumber,
            reps,
            weight,
            rpe: isWarmup ? null : rpe,
            isWarmup,
            wasAdapted: (adaptationResultForSet?.adjustments.length ?? 0) > 0,
            adaptationReason: adaptationResultForSet?.feedbackMessage ?? null,
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
        if (!isWarmup && !options?.skipRestTimer) {
            const restDuration = getRestDuration(
                currentExercise.exercise.type,
                nextFatigueState.fatigueLevel,
            );
            startRestTimerInternal(restDuration);
        }

        if (!isWarmup) {
            void (async () => {
                const existingPRs = prHistoryRef.current.get(exerciseId) ?? [];
                const pr = detectPR(
                    exerciseId,
                    currentExercise.exercise.name,
                    weight,
                    reps,
                    rpe,
                    existingPRs,
                );

                if (!pr.isNewPR || !pr.prType || pr.newValue === null) {
                    return;
                }

                const cachedPR = buildCachedPRRecord(
                    exerciseId,
                    currentExercise.exercise.name,
                    pr,
                    reps,
                    weight,
                    rpe,
                    sessionDateRef.current,
                );

                if (!cachedPR) {
                    return;
                }

                prHistoryRef.current.set(exerciseId, [cachedPR, ...existingPRs]);
                setPrResult(pr);
                setShowPRCelebration(true);

                try {
                    await savePR(userId, {
                        exerciseId,
                        prType: pr.prType,
                        value: pr.newValue,
                        repsAtPR: reps,
                        weightAtPR: weight,
                        rpeAtPR: rpe,
                        estimated1RM: pr.prType === 'estimated_1rm' ? pr.newValue : null,
                        workoutLogId: workoutLog.id,
                    });
                } catch (error) {
                    prHistoryRef.current.set(exerciseId, existingPRs);
                    logError('useGuidedWorkout.logSet.savePR', error, {
                        exerciseId,
                        userId,
                        workoutLogId: workoutLog.id,
                    });
                }
            })();
        }
    }, [workoutLog, currentExercise, exerciseProgress, fatigueState, prescription, currentExerciseIndex, gymProfile, startRestTimerInternal]);

    // ── Rest Timer ────────────────────────────────────────────────

    const logEffort = useCallback(async (effort: WorkoutEffortLogInput) => {
        if (!workoutLog || !currentExercise) return;

        const exerciseId = effort.exercise_library_id ?? currentExercise.exercise.id;
        const progress = exerciseProgress[exerciseId];
        if (!progress) return;

        const effortIndex = effort.effort_index > 0
            ? effort.effort_index
            : progress.effortsLogged.length + 1;

        const saved = await logWorkoutEffort(workoutLog.id, {
            ...effort,
            exercise_library_id: exerciseId,
            effort_index: effortIndex,
        });

        const effortEntry: EffortEntry = {
            exerciseId,
            effortKind: saved.effort_kind,
            effortIndex: saved.effort_index,
            targetSnapshot: saved.target_snapshot ?? {},
            actualSnapshot: saved.actual_snapshot ?? {},
            actualRPE: saved.actual_rpe,
            qualityRating: saved.quality_rating,
            painFlag: saved.pain_flag,
            notes: saved.notes,
            completedAt: saved.completed_at ? new Date(saved.completed_at) : new Date(),
        };

        setExerciseProgress(prev => {
            const existing = prev[exerciseId];
            if (!existing) return prev;

            const effortsLogged = [...existing.effortsLogged, effortEntry];
            const workingSetCount = existing.setsLogged.filter((set) => !set.isWarmup).length;

            return {
                ...prev,
                [exerciseId]: {
                    ...existing,
                    effortsLogged,
                    isComplete: workingSetCount + effortsLogged.length >= currentExercise.targetSets,
                },
            };
        });
    }, [currentExercise, exerciseProgress, workoutLog]);

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

    const completeSection = useCallback(() => {
        if (!currentExercise || !prescription) {
            completeExercise();
            return;
        }

        const currentSectionId = currentExercise.sectionId ?? null;
        if (!currentSectionId) {
            completeExercise();
            return;
        }

        const sectionExerciseIds = prescription.exercises
            .filter((exercise) => exercise.sectionId === currentSectionId)
            .map((exercise) => exercise.exercise.id);
        const lastSectionExerciseIndex = prescription.exercises.reduce((lastIndex, exercise, index) => (
            exercise.sectionId === currentSectionId ? index : lastIndex
        ), currentExerciseIndex);

        setExerciseProgress(prev => {
            const next = { ...prev };
            for (const exerciseId of sectionExerciseIds) {
                if (next[exerciseId]) {
                    next[exerciseId] = {
                        ...next[exerciseId],
                        isComplete: true,
                    };
                }
            }
            return next;
        });
        setAdaptationResult(null);

        if (lastSectionExerciseIndex < prescription.exercises.length - 1) {
            setCurrentExerciseIndex(lastSectionExerciseIndex + 1);
        } else {
            setIsComplete(true);
        }
    }, [completeExercise, currentExercise, currentExerciseIndex, prescription]);

    const goToPreviousExercise = useCallback(() => {
        if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(i => i - 1);
            setAdaptationResult(null);
        }
    }, [currentExerciseIndex]);

    // ── Finish Workout ────────────────────────────────────────────

    const finishWorkout = useCallback(async () => {
        if (finishedSummaryRef.current) {
            return finishedSummaryRef.current;
        }

        if (finishPromiseRef.current) {
            return finishPromiseRef.current;
        }

        if (!workoutLog || !startTime) return;
        const finishPromise = (async () => {
            const durationMin = Math.round((Date.now() - startTime.getTime()) / 60000);

            const allSets = Object.values(exerciseProgress).flatMap(p => p.setsLogged);
            const allEfforts = Object.values(exerciseProgress).flatMap(p => p.effortsLogged);
            const workingSets = allSets.filter(s => !s.isWarmup && s.rpe !== null);
            const effortRPEs = allEfforts.filter((entry) => entry.actualRPE !== null);
            const loggedRPEs = [
                ...workingSets.map((entry) => entry.rpe ?? 0),
                ...effortRPEs.map((entry) => entry.actualRPE ?? 0),
            ];
            const avgRPE = loggedRPEs.length > 0
                ? loggedRPEs.reduce((sum, rpe) => sum + rpe, 0) / loggedRPEs.length
                : null;

            const totalVolume = workingSets.reduce((sum, entry) => sum + entry.reps * entry.weight, 0);
            const totalSets = workingSets.length + allEfforts.length;
            const summary: WorkoutSummary = { durationMin, avgRPE, totalVolume, totalSets };

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await Promise.all(
                    Object.entries(exerciseProgress).map(async ([exerciseId, progress]) => {
                        const working = progress.setsLogged.filter((set) => !set.isWarmup);
                        if (working.length === 0) {
                            return;
                        }

                        const best = working.reduce((currentBest, candidate) => (
                            candidate.weight > currentBest.weight ? candidate : currentBest
                        ));
                        await saveOverloadHistory(session.user.id, exerciseId, {
                            bestSetWeight: best.weight,
                            bestSetReps: best.reps,
                            bestSetRPE: best.rpe,
                            totalVolume: working.reduce((sum, entry) => sum + entry.reps * entry.weight, 0),
                            workingSets: working.length,
                            estimated1RM: 0,
                            progressionModel: null,
                        });
                    }),
                );

                await completeWorkout(
                    session.user.id,
                    workoutLog.id,
                    avgRPE ? Math.round(avgRPE * 10) / 10 : 6,
                    durationMin,
                    undefined,
                    {
                        complianceReason,
                        activationRPE,
                    },
                );
            }

            if (restTimerRef.current) {
                clearInterval(restTimerRef.current);
            }

            finishedSummaryRef.current = summary;
            return summary;
        })();

        finishPromiseRef.current = finishPromise;

        try {
            return await finishPromise;
        } finally {
            finishPromiseRef.current = null;
        }
    }, [activationRPE, complianceReason, exerciseProgress, startTime, workoutLog]);

    return {
        // State
        loading,
        dailyAthleteSummary,
        prescription,
        emptyStateMessage,
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
        activationRPE,
        complianceReason,
        // Rest timer
        restSeconds,
        restTotal,
        // Actions
        loadAndGenerate,
        cancelLoad,
        startWorkout,
        logSet,
        logEffort,
        toggleWarmupSet,
        completeExercise,
        completeSection,
        goToPreviousExercise,
        finishWorkout,
        submitActivationRPE,
        setComplianceReason,
        skipRest,
        extendRest,
    };
}




