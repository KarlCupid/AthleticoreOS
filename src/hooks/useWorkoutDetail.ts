import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
    getWeeklyPlanEntryById,
    markDaySkipped,
    restorePlanEntry,
    updatePlanEntryPrescription,
    regenerateDayWorkout,
} from '../../lib/api/weeklyPlanService';
import { getExerciseLibrary } from '../../lib/api/scService';
import { getErrorMessage } from '../../lib/utils/logger';
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
    const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryRow[]>([]);
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [swappedId, setSwappedId] = useState<string | null>(null); // shows "Swapped" badge
    const isMandatoryRecovery = entry?.daily_mission_snapshot?.trainingDirective?.isMandatoryRecovery ?? false;
    const mandatoryRecoveryReason = entry?.daily_mission_snapshot?.trainingDirective?.reason
        ?? 'Mandatory recovery is active for this session.';

    const load = useCallback(async (entryId: string) => {
        setIsLoading(true);
        try {
            const [loadedEntry, library] = await Promise.all([
                getWeeklyPlanEntryById(entryId),
                getExerciseLibrary(),
            ]);
            setEntry(loadedEntry);
            setExerciseLibrary(library);
            const snap = loadedEntry?.daily_mission_snapshot?.trainingDirective?.prescription
                ?? loadedEntry?.prescription_snapshot
                ?? null;
            setPrescription(snap);
        } catch (_err) {
            Alert.alert('Error', getErrorMessage(_err));
        } finally {
            setIsLoading(false);
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
        setTimeout(() => setSwappedId(null), 2000);

        // Persist
        try {
            await updatePlanEntryPrescription(entry.id, updated);
        } catch (_err) {
            // Revert on failure
            setPrescription(prescription);
            Alert.alert('Save failed', 'Could not save the exercise swap. Please try again.');
        }
    }, [prescription, entry, isMandatoryRecovery, mandatoryRecoveryReason]);

    const regenerate = useCallback(async (userId: string, newFocus?: WorkoutFocus) => {
        if (!entry) return;
        setIsRegenerating(true);
        try {
            const newPrescription = await regenerateDayWorkout(userId, entry.id, newFocus);
            setPrescription(newPrescription);
            setExpandedExerciseId(null);
            // Refresh entry to pick up any status/focus changes
            const refreshed = await getWeeklyPlanEntryById(entry.id);
            if (refreshed) setEntry(refreshed);
        } catch (_err) {
            Alert.alert('Error', `Could not regenerate workout: ${getErrorMessage(_err)}`);
        } finally {
            setIsRegenerating(false);
        }
    }, [entry]);

    const markSkipped = useCallback(async () => {
        if (!entry) return;
        try {
            await markDaySkipped(entry.id);
            setEntry(prev => prev ? { ...prev, status: 'skipped' } : prev);
        } catch (_err) {
            Alert.alert('Error', getErrorMessage(_err));
        }
    }, [entry]);

    const restore = useCallback(async () => {
        if (!entry) return;
        try {
            await restorePlanEntry(entry.id);
            setEntry(prev => prev ? { ...prev, status: 'planned' } : prev);
        } catch (_err) {
            Alert.alert('Error', getErrorMessage(_err));
        }
    }, [entry]);

    return {
        entry,
        prescription,
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
        markSkipped,
        restore,
    };
}
