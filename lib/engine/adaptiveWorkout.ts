import type {
    ExerciseType,
} from './types/foundational.ts';
import type {
    FatigueLevel,
    FeedbackSeverity,
    SessionFatigueState,
} from './types/misc.ts';
import type {
    EquipmentItem,
    ExerciseAdjustment,
    ExerciseLibraryRow,
    RestTimerConfig,
    SetAdaptationResult,
    SetCompletionInput,
} from './types/training.ts';

// â”€â”€â”€ Equipment Mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Maps exercise-level equipment strings to the gym profile EquipmentItem
 * values. 'bodyweight' and 'other' are always considered available.
 */
const EQUIPMENT_TO_GYM_MAP: Record<string, EquipmentItem | null> = {
    barbell: 'barbell',
    dumbbell: 'dumbbells',
    kettlebell: 'kettlebells',
    cable: 'cables',
    bodyweight: null,       // always available
    band: 'resistance_bands',
    machine: null,          // handled separately â€” any machine item qualifies
    medicine_ball: 'medicine_balls',
    sled: 'sled',
    heavy_bag: 'heavy_bag',
    other: null,            // always available
};

const MACHINE_EQUIPMENT_ITEMS: EquipmentItem[] = [
    'smith_machine',
    'leg_press_machine',
    'cable_crossover',
    'lat_pulldown_machine',
    'assault_bike',
    'rowing_machine',
];

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Clamp a number between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Determine whether a given exercise can be performed with the
 * available gym equipment. If no equipment list is provided, all
 * exercises are considered available.
 */
function isEquipmentAvailable(
    exerciseEquipment: string,
    availableEquipment?: EquipmentItem[],
): boolean {
    if (!availableEquipment) return true;

    // bodyweight and 'other' are always available
    if (exerciseEquipment === 'bodyweight' || exerciseEquipment === 'other') {
        return true;
    }

    // machine exercises match if the gym has *any* machine-type item
    if (exerciseEquipment === 'machine') {
        return availableEquipment.some((item) => MACHINE_EQUIPMENT_ITEMS.includes(item));
    }

    const requiredItem = EQUIPMENT_TO_GYM_MAP[exerciseEquipment];
    if (requiredItem == null) return true; // unknown equipment â€” assume available
    return availableEquipment.includes(requiredItem);
}

// â”€â”€â”€ initFatigueState â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @ANTI-WIRING:
 * Returns a fresh SessionFatigueState with all counters at zero.
 * Call this once at the start of a workout session.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function initFatigueState(): SessionFatigueState {
    return {
        setsCompleted: 0,
        cumulativeRPEDelta: 0,
        avgRPEDelta: 0,
        consecutiveHighRPESets: 0,
        fatigueScore: 0,
        fatigueLevel: 'fresh',
    };
}

// â”€â”€â”€ processSetCompletion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - exerciseId: string       (from the current PrescribedExerciseV2)
 *   - exerciseName: string     (display name)
 *   - setNumber: number        (which set was just completed, 1-indexed)
 *   - actualWeight: number     (weight actually used, in lbs)
 *   - actualReps: number       (reps actually completed)
 *   - actualRPE: number        (athlete's reported RPE, 1-10)
 *   - targetWeight: number     (prescribed weight)
 *   - targetReps: number       (prescribed reps)
 *   - targetRPE: number        (prescribed RPE)
 *   - currentFatigueState: SessionFatigueState (running fatigue from prior sets)
 *   - remainingExercises: PrescribedExerciseV2[] (exercises still to come)
 *   - exerciseLibrary: ExerciseLibraryRow[] (full exercise library)
 *   - availableEquipment?: EquipmentItem[] (gym equipment, optional)
 *
 * Returns: SetAdaptationResult
 *   - updatedFatigueState: SessionFatigueState
 *   - adjustments: ExerciseAdjustment[]   (weight/rep/swap/set changes)
 *   - shouldEndWorkoutEarly: boolean
 *   - endEarlyReason: string | null
 *   - feedbackMessage: string             (plain-English coaching cue)
 *   - feedbackSeverity: FeedbackSeverity
 *
 * The caller is responsible for:
 *   1. Collecting athlete input after each set (weight, reps, RPE).
 *   2. Applying the returned adjustments to the remaining workout prescription.
 *   3. Displaying feedbackMessage to the athlete.
 *   4. Ending the workout if shouldEndWorkoutEarly is true.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function processSetCompletion(input: SetCompletionInput): SetAdaptationResult {
    const {
        exerciseId,
        actualRPE,
        targetWeight,
        targetReps,
        targetRPE,
        currentFatigueState,
        remainingExercises,
        exerciseLibrary,
        availableEquipment,
    } = input;

    // â”€â”€ 1. Compute RPE delta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const rpeDelta = actualRPE - targetRPE;

    // â”€â”€ 2. Update fatigue state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const setsCompleted = currentFatigueState.setsCompleted + 1;
    const cumulativeRPEDelta = currentFatigueState.cumulativeRPEDelta + rpeDelta;
    const avgRPEDelta = cumulativeRPEDelta / setsCompleted;
    const consecutiveHighRPESets =
        rpeDelta >= 1
            ? currentFatigueState.consecutiveHighRPESets + 1
            : 0;

    const rawFatigueScore =
        (avgRPEDelta * 20) +
        (consecutiveHighRPESets * 10) +
        (setsCompleted * 1.5);
    const fatigueScore = clamp(rawFatigueScore, 0, 100);

    let fatigueLevel: FatigueLevel;
    if (fatigueScore < 25) {
        fatigueLevel = 'fresh';
    } else if (fatigueScore < 50) {
        fatigueLevel = 'moderate';
    } else if (fatigueScore < 75) {
        fatigueLevel = 'high';
    } else {
        fatigueLevel = 'extreme';
    }

    const updatedFatigueState: SessionFatigueState = {
        setsCompleted,
        cumulativeRPEDelta,
        avgRPEDelta,
        consecutiveHighRPESets,
        fatigueScore,
        fatigueLevel,
    };

    // â”€â”€ 3. Generate adjustments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const adjustments: ExerciseAdjustment[] = [];
    let shouldEndWorkoutEarly = false;
    let endEarlyReason: string | null = null;
    let feedbackMessage = '';
    let feedbackSeverity: FeedbackSeverity = 'neutral';

    // RPE delta >= +2: heavy fatigue â€” reduce weight 10% AND reps 1-2
    if (rpeDelta >= 2) {
        const reducedWeight = Math.round(targetWeight * 0.9);
        const reducedReps = Math.max(1, targetReps - 2);

        adjustments.push({
            exerciseId,
            adjustmentType: 'weight_reduction',
            originalValue: targetWeight,
            adjustedValue: reducedWeight,
            reason: `RPE ${rpeDelta} points above target. Reducing weight by 10% for remaining sets.`,
        });

        adjustments.push({
            exerciseId,
            adjustmentType: 'rep_reduction',
            originalValue: targetReps,
            adjustedValue: reducedReps,
            reason: `RPE ${rpeDelta} points above target. Reducing reps for remaining sets.`,
        });

        feedbackMessage = `Fatigue building. Reducing target weight from ${targetWeight} to ${reducedWeight} for remaining sets.`;
        feedbackSeverity = 'warning';
    }
    // RPE delta == +1: mild fatigue â€” reduce weight 5%
    else if (rpeDelta === 1) {
        const reducedWeight = Math.round(targetWeight * 0.95);

        adjustments.push({
            exerciseId,
            adjustmentType: 'weight_reduction',
            originalValue: targetWeight,
            adjustedValue: reducedWeight,
            reason: `RPE 1 point above target. Reducing weight by 5% for remaining sets.`,
        });

        feedbackMessage = `RPE slightly higher than expected. Reducing to ${reducedWeight} lbs for next set.`;
        feedbackSeverity = 'caution';
    }
    // RPE delta <= -1: feeling strong â€” suggest weight increase
    else if (rpeDelta <= -1) {
        const increasedWeight = Math.max(
            Math.round(targetWeight * 1.025),
            targetWeight + 5,
        );

        adjustments.push({
            exerciseId,
            adjustmentType: 'weight_increase',
            originalValue: targetWeight,
            adjustedValue: increasedWeight,
            reason: `RPE ${Math.abs(rpeDelta)} point(s) below target. Consider increasing weight.`,
        });

        feedbackMessage = `Feeling strong! Consider bumping up to ${increasedWeight} lbs.`;
        feedbackSeverity = 'positive';
    }
    // RPE delta == 0: on target
    else {
        feedbackMessage = 'Right on target. Keep it up.';
        feedbackSeverity = 'neutral';
    }

    // 3+ consecutive high RPE sets: swap high-CNS remaining exercises
    if (consecutiveHighRPESets >= 3) {
        for (const prescribed of remainingExercises) {
            const exRow = exerciseLibrary.find((e) => e.id === prescribed.exercise.id);
            if (exRow && exRow.cns_load >= 7) {
                const substitute = findSubstituteExercise(exRow, exerciseLibrary, availableEquipment);
                if (substitute) {
                    adjustments.push({
                        exerciseId: prescribed.exercise.id,
                        adjustmentType: 'exercise_swap',
                        originalValue: exRow.cns_load,
                        adjustedValue: substitute.cns_load,
                        swapExerciseId: substitute.id,
                        swapExerciseName: substitute.name,
                        reason: `${consecutiveHighRPESets} consecutive high-RPE sets. Swapping ${exRow.name} (CNS ${exRow.cns_load}) for ${substitute.name} (CNS ${substitute.cns_load}).`,
                    });
                }
            }
        }
    }

    // Fatigue score >= 85: recommend ending workout early
    if (fatigueScore >= 85) {
        shouldEndWorkoutEarly = true;
        endEarlyReason = `Fatigue score reached ${Math.round(fatigueScore)}/100. Recommend ending workout.`;
        feedbackMessage = `Consider finishing your workout here. You've had a productive session \u2014 ${setsCompleted} sets completed.`;
        feedbackSeverity = 'warning';
    }
    // Fatigue score >= 70: cut remaining sets by 1
    else if (fatigueScore >= 70) {
        for (const prescribed of remainingExercises) {
            if (prescribed.targetSets > 1) {
                adjustments.push({
                    exerciseId: prescribed.exercise.id,
                    adjustmentType: 'set_reduction',
                    originalValue: prescribed.targetSets,
                    adjustedValue: prescribed.targetSets - 1,
                    reason: `Fatigue score ${Math.round(fatigueScore)}/100. Reducing volume for remaining exercises.`,
                });
            }
        }
    }

    return {
        updatedFatigueState,
        adjustments,
        shouldEndWorkoutEarly,
        endEarlyReason,
        feedbackMessage,
        feedbackSeverity,
    };
}

// â”€â”€â”€ findSubstituteExercise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - original: ExerciseLibraryRow   (the exercise to replace)
 *   - library: ExerciseLibraryRow[]  (full exercise library)
 *   - availableEquipment?: EquipmentItem[] (gym equipment, optional)
 *
 * Returns: ExerciseLibraryRow | null
 *   - A lower-CNS-load exercise for the same muscle group, or null if
 *     no suitable substitute exists.
 *
 * Selection criteria:
 *   1. Same muscle_group as the original exercise.
 *   2. Lower cns_load than the original.
 *   3. Not the same exercise.
 *   4. Equipment is available (if gym profile provided).
 *   5. Sorted by cns_load ascending â€” returns the lowest-CNS option.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function findSubstituteExercise(
    original: ExerciseLibraryRow,
    library: ExerciseLibraryRow[],
    availableEquipment?: EquipmentItem[],
): ExerciseLibraryRow | null {
    const candidates = library
        .filter((ex) =>
            ex.muscle_group === original.muscle_group &&
            ex.cns_load < original.cns_load &&
            ex.id !== original.id &&
            isEquipmentAvailable(ex.equipment, availableEquipment),
        )
        .sort((a, b) => a.cns_load - b.cns_load);

    return candidates.length > 0 ? candidates[0] : null;
}

// â”€â”€â”€ getRestTimerDefaults â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @ANTI-WIRING:
 * Returns the default rest timer configuration for each exercise type.
 * Values are in seconds.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getRestTimerDefaults(): Record<ExerciseType, RestTimerConfig> {
    return {
        heavy_lift: { exerciseType: 'heavy_lift', defaultSeconds: 150, minSeconds: 90, maxSeconds: 300 },
        power: { exerciseType: 'power', defaultSeconds: 180, minSeconds: 120, maxSeconds: 300 },
        sport_specific: { exerciseType: 'sport_specific', defaultSeconds: 60, minSeconds: 30, maxSeconds: 120 },
        conditioning: { exerciseType: 'conditioning', defaultSeconds: 60, minSeconds: 30, maxSeconds: 90 },
        mobility: { exerciseType: 'mobility', defaultSeconds: 30, minSeconds: 15, maxSeconds: 60 },
        active_recovery: { exerciseType: 'active_recovery', defaultSeconds: 30, minSeconds: 15, maxSeconds: 60 },
    };
}

// â”€â”€â”€ getRestDuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - exerciseType: ExerciseType (from the current exercise)
 *   - fatigueLevel: FatigueLevel (from SessionFatigueState.fatigueLevel)
 *
 * Returns: number (rest duration in seconds)
 *
 * When fatigue is 'high' or 'extreme', adds 30 seconds to the default
 * rest duration (capped at the exercise type's max).
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getRestDuration(exerciseType: ExerciseType, fatigueLevel: FatigueLevel): number {
    const defaults = getRestTimerDefaults();
    const config = defaults[exerciseType];

    let seconds = config.defaultSeconds;

    if (fatigueLevel === 'high' || fatigueLevel === 'extreme') {
        seconds = Math.min(seconds + 30, config.maxSeconds);
    }

    return seconds;
}

