import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
    getWeeklyPlanEntryById,
    markDayCompleted,
    markDaySkipped,
    restorePlanEntry,
    updatePlanEntryPrescription,
    regenerateDayWorkout,
} from '../../lib/api/weeklyPlanService';
import { getExerciseLibrary } from '../../lib/api/scService';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import { getErrorMessage, logError } from '../../lib/utils/logger';
import {
    generatedWorkoutCompletionOptionsForUser,
    generatedWorkoutFlowUserId,
    generatedWorkoutLifecycleOptionsForUser,
    getBoxingSnapshotFromWeeklyPlanEntry,
    workoutProgrammingService,
    type BoxingGeneratedPlanEntrySnapshot,
    type GeneratedWorkout,
    type GeneratedWorkoutSessionLifecycleStatus,
    type ProgressionDecision,
} from '../../lib/performance-engine/workout-programming';
import type { BoxingGeneratedWorkoutCompletionDraft } from '../components/workout/BoxingGeneratedWorkoutSessionCard';
import type {
    WeeklyPlanEntryRow,
    WorkoutPrescriptionV2,
    WorkoutFocus,
    ExerciseLibraryRow,
    WorkoutSessionSection,
    SectionExercisePrescription,
} from '../../lib/engine/types';

export function useWorkoutDetail() {
    const [entry, setEntry] = useState<WeeklyPlanEntryRow | null>(null);
    const [prescription, setPrescription] = useState<WorkoutPrescriptionV2 | null>(null);
    const [boxingSnapshot, setBoxingSnapshot] = useState<BoxingGeneratedPlanEntrySnapshot | null>(null);
    const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
    const [generatedStage, setGeneratedStage] = useState<'inspect' | 'started' | 'completed'>('inspect');
    const [generatedStartedAt, setGeneratedStartedAt] = useState<string | null>(null);
    const [generatedLifecycleStatus, setGeneratedLifecycleStatus] = useState<GeneratedWorkoutSessionLifecycleStatus | null>(null);
    const [generatedLifecycleMessage, setGeneratedLifecycleMessage] = useState<string | null>(null);
    const [generatedCompleting, setGeneratedCompleting] = useState(false);
    const [generatedProgressionDecision, setGeneratedProgressionDecision] = useState<ProgressionDecision | null>(null);
    const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryRow[]>([]);
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [swappedId, setSwappedId] = useState<string | null>(null); // shows "Swapped" badge
    const loadRequestIdRef = useRef(0);
    const mountedRef = useRef(true);
    const swappedBadgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMandatoryRecovery = prescription?.primaryAdaptation === 'recovery' && entry?.focus === 'recovery';
    const mandatoryRecoveryReason = 'Recovery is active for this session.';

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (swappedBadgeTimeoutRef.current) {
                clearTimeout(swappedBadgeTimeoutRef.current);
            }
        };
    }, []);

    const load = useCallback(async (entryId: string) => {
        const requestId = ++loadRequestIdRef.current;
        setIsLoading(true);
        try {
            const [loadedEntry, library] = await Promise.all([
                getWeeklyPlanEntryById(entryId),
                getExerciseLibrary(),
            ]);
            if (!mountedRef.current || requestId !== loadRequestIdRef.current) return;
            setEntry(loadedEntry);
            setExerciseLibrary(library);
            const boxing = getBoxingSnapshotFromWeeklyPlanEntry(loadedEntry);
            setBoxingSnapshot(boxing);
            setGeneratedWorkout(boxing?.generatedWorkout ?? null);
            setGeneratedStage(loadedEntry?.status === 'completed' ? 'completed' : 'inspect');
            setGeneratedStartedAt(null);
            setGeneratedLifecycleStatus(null);
            setGeneratedLifecycleMessage(null);
            setGeneratedProgressionDecision(null);
            const snap = loadedEntry?.prescription_snapshot ?? null;
            setPrescription(boxing ? null : snap);
        } catch (_err) {
            if (!mountedRef.current || requestId !== loadRequestIdRef.current) return;
            Alert.alert('Error', getErrorMessage(_err));
        } finally {
            if (mountedRef.current && requestId === loadRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const toggleExpanded = useCallback((exerciseId: string) => {
        setExpandedExerciseId(prev => (prev === exerciseId ? null : exerciseId));
    }, []);

    const swapExercise = useCallback(async (
        sectionId: string,
        exerciseId: string,
        substituteExercise: ExerciseLibraryRow,
    ) => {
        if (!prescription || !entry) return;
        if (isMandatoryRecovery) {
            Alert.alert('Mandatory recovery', mandatoryRecoveryReason);
            return;
        }

        // Build the replacement: preserve set prescription, swap the exercise row
        const updateSection = (section: WorkoutSessionSection): WorkoutSessionSection => {
            if (section.id !== sectionId) return section;
            return {
                ...section,
                exercises: section.exercises.map((ex): SectionExercisePrescription => {
                    if (ex.exercise.id !== exerciseId) return ex;
                    return {
                        ...ex,
                        exercise: substituteExercise,
                        coachingCues: substituteExercise.cues ? [substituteExercise.cues] : ex.coachingCues,
                        substitutions: [], // remove substitution options after swap
                    };
                }),
            };
        };

        const updated: WorkoutPrescriptionV2 = {
            ...prescription,
            sections: prescription.sections?.map(updateSection),
            exercises: prescription.exercises.map(ex =>
                ex.exercise.id === exerciseId
                    ? { ...ex, exercise: substituteExercise, coachingCues: substituteExercise.cues ? [substituteExercise.cues] : ex.coachingCues }
                    : ex,
            ),
        };

        // Optimistic update
        setPrescription(updated);
        setSwappedId(exerciseId);
        if (swappedBadgeTimeoutRef.current) {
            clearTimeout(swappedBadgeTimeoutRef.current);
        }
        swappedBadgeTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
                setSwappedId(null);
            }
        }, 2000);

        // Persist
        try {
            await updatePlanEntryPrescription(entry.id, updated);
        } catch (_err) {
            // Revert on failure
            setPrescription(prescription);
            Alert.alert('Save failed', 'Could not save the exercise swap. Please try again.');
        }
    }, [prescription, entry, isMandatoryRecovery, mandatoryRecoveryReason]);

    const regenerate = useCallback(async (newFocus?: WorkoutFocus) => {
        if (!entry) return;
        const userId = await getActiveUserId();
        if (!userId) {
            Alert.alert('Error', 'No authenticated user found.');
            return;
        }
        setIsRegenerating(true);
        try {
            const newWorkout = await regenerateDayWorkout(userId, entry.id, newFocus);
            if (!mountedRef.current) return;
            setGeneratedWorkout(newWorkout);
            setGeneratedStage('inspect');
            setPrescription(null);
            setExpandedExerciseId(null);
            // Refresh entry to pick up any status/focus changes
            const refreshed = await getWeeklyPlanEntryById(entry.id);
            if (mountedRef.current && refreshed) {
                setEntry(refreshed);
                const boxing = getBoxingSnapshotFromWeeklyPlanEntry(refreshed);
                setBoxingSnapshot(boxing);
                setGeneratedWorkout(boxing?.generatedWorkout ?? newWorkout);
            }
        } catch (_err) {
            if (!mountedRef.current) return;
            Alert.alert('Error', `Could not regenerate workout: ${getErrorMessage(_err)}`);
        } finally {
            if (mountedRef.current) {
                setIsRegenerating(false);
            }
        }
    }, [entry]);

    const startGeneratedWorkout = useCallback(async () => {
        if (!generatedWorkout) return;
        const userId = await getActiveUserId();
        const generatedWorkoutId = boxingSnapshot?.generatedWorkoutId ?? null;
        const occurredAt = new Date().toISOString();
        setGeneratedStartedAt(occurredAt);
        setGeneratedStage('started');
        setGeneratedLifecycleStatus('started');
        setGeneratedLifecycleMessage(null);
        try {
            const lifecycle = await workoutProgrammingService.startGeneratedWorkoutSession(
                generatedWorkoutFlowUserId(userId),
                generatedWorkoutId,
                generatedWorkoutLifecycleOptionsForUser(userId, occurredAt),
            );
            if (!mountedRef.current) return;
            setGeneratedStartedAt(lifecycle.lifecycle.startedAt ?? occurredAt);
            setGeneratedLifecycleStatus(lifecycle.lifecycle.status);
            setGeneratedLifecycleMessage(lifecycle.persisted ? null : 'Session started locally. Saving will resume when available.');
            if (lifecycle.fallbackMessage) setGeneratedLifecycleMessage(`Session started locally: ${lifecycle.fallbackMessage}`);
        } catch (_err) {
            if (!mountedRef.current) return;
            setGeneratedLifecycleMessage('Session started locally. Start state could not be saved yet.');
        }
    }, [boxingSnapshot?.generatedWorkoutId, generatedWorkout]);

    const pauseGeneratedWorkout = useCallback(async () => {
        const userId = await getActiveUserId();
        const generatedWorkoutId = boxingSnapshot?.generatedWorkoutId ?? null;
        const occurredAt = new Date().toISOString();
        setGeneratedLifecycleStatus('paused');
        setGeneratedLifecycleMessage('Session paused.');
        try {
            const lifecycle = await workoutProgrammingService.pauseGeneratedWorkoutSession(
                generatedWorkoutFlowUserId(userId),
                generatedWorkoutId,
                generatedWorkoutLifecycleOptionsForUser(userId, occurredAt),
            );
            if (!mountedRef.current) return;
            setGeneratedLifecycleStatus(lifecycle.lifecycle.status);
            setGeneratedLifecycleMessage(lifecycle.persisted ? 'Session paused and saved.' : 'Session paused locally.');
        } catch {
            if (mountedRef.current) setGeneratedLifecycleMessage('Session paused locally. Pause state could not be saved yet.');
        }
    }, [boxingSnapshot?.generatedWorkoutId]);

    const resumeGeneratedWorkout = useCallback(async () => {
        const userId = await getActiveUserId();
        const generatedWorkoutId = boxingSnapshot?.generatedWorkoutId ?? null;
        const occurredAt = new Date().toISOString();
        setGeneratedStage('started');
        setGeneratedLifecycleStatus('resumed');
        setGeneratedLifecycleMessage('Session resumed.');
        try {
            const lifecycle = await workoutProgrammingService.resumeGeneratedWorkoutSession(
                generatedWorkoutFlowUserId(userId),
                generatedWorkoutId,
                generatedWorkoutLifecycleOptionsForUser(userId, occurredAt),
            );
            if (!mountedRef.current) return;
            setGeneratedStartedAt((current) => current ?? lifecycle.lifecycle.startedAt ?? occurredAt);
            setGeneratedLifecycleStatus(lifecycle.lifecycle.status);
            setGeneratedLifecycleMessage(lifecycle.persisted ? 'Session resumed and saved.' : 'Session resumed locally.');
        } catch {
            if (mountedRef.current) setGeneratedLifecycleMessage('Session resumed locally. Resume state could not be saved yet.');
        }
    }, [boxingSnapshot?.generatedWorkoutId]);

    const abandonGeneratedWorkout = useCallback(async () => {
        const userId = await getActiveUserId();
        const generatedWorkoutId = boxingSnapshot?.generatedWorkoutId ?? null;
        const occurredAt = new Date().toISOString();
        try {
            await workoutProgrammingService.abandonGeneratedWorkoutSession(
                generatedWorkoutFlowUserId(userId),
                generatedWorkoutId,
                generatedWorkoutLifecycleOptionsForUser(userId, occurredAt),
            );
        } catch {
            // Local UI reset still wins; persistence can catch up from lifecycle records later.
        }
        if (!mountedRef.current) return;
        setGeneratedStage('inspect');
        setGeneratedStartedAt(null);
        setGeneratedLifecycleStatus(null);
        setGeneratedLifecycleMessage('Session abandoned.');
    }, [boxingSnapshot?.generatedWorkoutId]);

    const completeGeneratedWorkout = useCallback(async (draft: BoxingGeneratedWorkoutCompletionDraft) => {
        if (!generatedWorkout) return;
        const userId = await getActiveUserId();
        const completionInput = {
            workout: generatedWorkout,
            generatedWorkoutId: boxingSnapshot?.generatedWorkoutId ?? null,
            startedAt: generatedStartedAt,
            completedAt: new Date().toISOString(),
            ...draft,
        };
        setGeneratedCompleting(true);
        try {
            const result = await workoutProgrammingService.completeGeneratedWorkoutSession(
                generatedWorkoutFlowUserId(userId),
                completionInput,
                generatedWorkoutCompletionOptionsForUser(userId),
            );
            const completionLinkId = result.workoutCompletionId ?? boxingSnapshot?.generatedWorkoutId ?? generatedWorkout.templateId;
            if (entry?.id) {
                try {
                    await markDayCompleted(entry.id, completionLinkId);
                } catch (completionError) {
                    logError('useWorkoutDetail.completeGeneratedWorkout.markDayCompleted', completionError, {
                        weeklyPlanEntryId: entry.id,
                        generatedWorkoutId: boxingSnapshot?.generatedWorkoutId ?? null,
                        workoutCompletionId: result.workoutCompletionId ?? null,
                    });
                    throw completionError;
                }
            }
            if (userId && boxingSnapshot?.userProgramId) {
                try {
                    await workoutProgrammingService.markGeneratedProgramSessionCompletedForUser(
                        userId,
                        boxingSnapshot.userProgramId,
                        boxingSnapshot.sessionId,
                        {
                            completedAt: completionInput.completedAt,
                            workoutCompletionId: result.workoutCompletionId,
                        },
                        { useSupabase: true },
                    );
                } catch (programSyncError) {
                    logError('useWorkoutDetail.completeGeneratedWorkout.programSessionSync', programSyncError, {
                        weeklyPlanEntryId: entry?.id ?? null,
                        userProgramId: boxingSnapshot.userProgramId,
                        generatedProgramSessionId: boxingSnapshot.sessionId,
                    });
                    // Weekly plan completion is the source of truth in the app. Program-session sync is best-effort for older rows.
                }
            }
            const refreshedEntry = entry?.id ? await getWeeklyPlanEntryById(entry.id) : null;
            if (!mountedRef.current) return;
            setGeneratedProgressionDecision(result.progressionDecision);
            setGeneratedStage('completed');
            setGeneratedLifecycleStatus(result.lifecycle?.lifecycle.status ?? 'completed');
            setGeneratedLifecycleMessage(result.lifecycleFallbackMessage ? `Completion saved locally: ${result.lifecycleFallbackMessage}` : 'Completion saved. Progression updated.');
            setEntry((previous) => refreshedEntry ?? (previous ? { ...previous, status: 'completed', workout_log_id: completionLinkId } : previous));
            if (refreshedEntry) {
                const refreshedSnapshot = getBoxingSnapshotFromWeeklyPlanEntry(refreshedEntry);
                setBoxingSnapshot(refreshedSnapshot);
                setGeneratedWorkout(refreshedSnapshot?.generatedWorkout ?? generatedWorkout);
            }
        } catch (_err) {
            if (!mountedRef.current) return;
            Alert.alert('Completion failed', getErrorMessage(_err));
        } finally {
            if (mountedRef.current) setGeneratedCompleting(false);
        }
    }, [boxingSnapshot, entry?.id, generatedStartedAt, generatedWorkout]);

    const markSkipped = useCallback(async () => {
        if (!entry) return;
        try {
            await markDaySkipped(entry.id);
            if (mountedRef.current) {
                setEntry(prev => prev ? { ...prev, status: 'skipped' } : prev);
            }
        } catch (_err) {
            Alert.alert('Error', getErrorMessage(_err));
        }
    }, [entry]);

    const restore = useCallback(async () => {
        if (!entry) return;
        try {
            await restorePlanEntry(entry.id);
            if (mountedRef.current) {
                setEntry(prev => prev ? { ...prev, status: 'planned' } : prev);
            }
        } catch (_err) {
            Alert.alert('Error', getErrorMessage(_err));
        }
    }, [entry]);

    return {
        entry,
        prescription,
        boxingSnapshot,
        generatedWorkout,
        generatedStage,
        generatedStartedAt,
        generatedLifecycleStatus,
        generatedLifecycleMessage,
        generatedCompleting,
        generatedProgressionDecision,
        isBoxingGeneratedEntry: Boolean(boxingSnapshot),
        exerciseLibrary,
        expandedExerciseId,
        isLoading,
        isRegenerating,
        swappedId,
        isMandatoryRecovery,
        mandatoryRecoveryReason,
        load,
        toggleExpanded,
        swapExercise,
        regenerate,
        startGeneratedWorkout,
        pauseGeneratedWorkout,
        resumeGeneratedWorkout,
        abandonGeneratedWorkout,
        completeGeneratedWorkout,
        markSkipped,
        restore,
    };
}
