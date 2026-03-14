import {
    ExerciseLibraryRow,
    ExerciseScoringContext,
    GenerateWorkoutInput,
    GenerateWorkoutInputV2,
    WorkoutPrescription,
    WorkoutPrescriptionV2,
    PrescribedExercise,
    PrescribedExerciseV2,
    WorkoutFocus,
    WorkoutSetLogRow,
    WorkoutComplianceResult,
    ReadinessState,
    Phase,
    MuscleGroup,
    EquipmentItem,
    CampPhase,
} from './types';
import { suggestOverload, selectProgressionModel } from './calculateOverload';
import { generateWarmupSets } from './calculateWarmup';
import { getRestTimerDefaults } from './adaptiveWorkout';

// ─── Constants ─────────────────────────────────────────────────

/**
 * CNS budget by readiness state.
 * Prime → athlete can handle high-CNS work.
 * Depleted → restrict to low-CNS mobility/recovery.
 */
const CNS_BUDGET: Record<ReadinessState, number> = {
    Prime: 50,
    Caution: 30,
    Depleted: 15,
};

/**
 * Default exercise count by readiness state.
 */
const EXERCISE_COUNT: Record<ReadinessState, number> = {
    Prime: 6,
    Caution: 4,
    Depleted: 3,
};

/**
 * Default set prescriptions by readiness × exercise type.
 */
const SET_PRESCRIPTIONS: Record<ReadinessState, { sets: number; reps: number; rpe: number }> = {
    Prime: { sets: 4, reps: 6, rpe: 8 },
    Caution: { sets: 3, reps: 8, rpe: 7 },
    Depleted: { sets: 2, reps: 10, rpe: 5 },
};

/**
 * Focus rotation for deterministic scheduling.
 * day-of-week → default focus (0 = Sunday).
 */
const WEEKLY_FOCUS_MAP: WorkoutFocus[] = [
    'recovery',         // Sunday
    'upper_push',       // Monday
    'lower',            // Tuesday
    'sport_specific',   // Wednesday
    'upper_pull',       // Thursday
    'full_body',        // Friday
    'conditioning',     // Saturday
];

/**
 * Phase → which exercise types to boost.
 */
const PHASE_BOOSTS: Record<Phase, string[]> = {
    'off-season': ['heavy_lift', 'power'],
    'pre-camp': ['conditioning', 'sport_specific', 'power'],
    'fight-camp': ['sport_specific', 'conditioning'],
    'camp-base': ['heavy_lift', 'power'],
    'camp-build': ['sport_specific', 'power', 'conditioning'],
    'camp-peak': ['sport_specific', 'conditioning'],
    'camp-taper': ['mobility', 'active_recovery'],
};

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
    'chest', 'back', 'shoulders', 'quads', 'hamstrings',
    'glutes', 'arms', 'core', 'full_body', 'neck', 'calves',
];

function resolveDayOfWeek(trainingDate?: string): number {
    if (trainingDate) {
        const parsed = new Date(`${trainingDate}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.getDay();
        }
    }
    return new Date().getDay();
}
// ─── Focus Determination ───────────────────────────────────────

/**
 * Determines today's training focus.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function determineFocus(
    dayOfWeek: number,
    readinessState: ReadinessState,
    phase: Phase,
    overrideFocus?: WorkoutFocus,
): WorkoutFocus {
    if (overrideFocus) return overrideFocus;

    // Depleted → always recovery
    if (readinessState === 'Depleted') return 'recovery';

    // Fight camp adjustments: more sport-specific work
    if (phase === 'fight-camp') {
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) return 'sport_specific';
        if (dayOfWeek === 2 || dayOfWeek === 4) return 'conditioning';
        return 'recovery';
    }

    return WEEKLY_FOCUS_MAP[dayOfWeek] ?? 'full_body';
}

// ─── Exercise Scoring ──────────────────────────────────────────

/**
 * Score an exercise 0-100 for how appropriate it is in the current context.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 *
 * Scoring factors:
 *   1. Readiness penalty: heavy lifts score low when Depleted
 *   2. Phase bonus: fight-camp boosts sport-specific
 *   3. Recency penalty: exercises done in last 48h scored lower
 *   4. Muscle balance: under-trained groups get a boost
 *   5. CNS budget: exercises exceeding remaining budget score 0
 */
export function scoreExerciseForUser(
    exercise: ExerciseLibraryRow,
    context: ExerciseScoringContext,
): number {
    let score = 50; // baseline

    // 1. Readiness × exercise type alignment
    if (context.readinessState === 'Depleted') {
        if (exercise.type === 'heavy_lift' || exercise.type === 'power') {
            return 0; // too heavy for depleted state
        }
        if (exercise.type === 'mobility' || exercise.type === 'active_recovery') {
            score += 30;
        }
    } else if (context.readinessState === 'Prime') {
        if (exercise.type === 'heavy_lift' || exercise.type === 'power') {
            score += 20;
        }
    } else {
        // Caution — moderate everything
        if (exercise.type === 'heavy_lift' && exercise.cns_load >= 9) {
            score -= 15;
        }
        if (exercise.type === 'mobility') {
            score += 10;
        }
    }

    // 1b. Fitness Level scaling
    if (context.fitnessLevel === 'beginner') {
        if (exercise.type === 'power') {
            score -= 40; // Avoid high-complexity Olympic lifts for beginners
        }
        if (exercise.cns_load >= 7) {
            score -= 15; // Shift towards foundational/machine work
        }
    } else if (context.fitnessLevel === 'advanced' || context.fitnessLevel === 'elite') {
        if (exercise.type === 'power' && exercise.cns_load >= 7) {
            score += 15; // Elites benefit from complex power development
        }
    }

    // 2. Phase bonus
    const boostedTypes = PHASE_BOOSTS[context.phase] ?? [];
    if (boostedTypes.includes(exercise.type)) {
        score += 15;
    }

    // 3. Recency penalty — don't repeat the same exercise within 48h
    if (context.recentExerciseIds.includes(exercise.id)) {
        score -= 25;
    }

    // 4. Muscle balance — boost under-trained groups
    const muscleVolume = context.recentMuscleVolume[exercise.muscle_group] ?? 0;
    const avgVolume = Object.values(context.recentMuscleVolume).reduce((a, b) => a + b, 0) /
        Math.max(Object.keys(context.recentMuscleVolume).length, 1);

    if (muscleVolume < avgVolume * 0.5) {
        score += 15; // under-trained — boost
    } else if (muscleVolume > avgVolume * 1.5) {
        score -= 10; // over-trained — reduce
    }

    // 5. CNS budget — hard reject if exercise exceeds remaining budget
    if (exercise.cns_load > context.cnsBudgetRemaining) {
        return 0;
    }

    // 6. ACWR safety — if overreaching, penalize high-CNS exercises
    if (context.acwr > 1.3 && exercise.cns_load >= 7) {
        score -= 20;
    }

    // Clamp 0-100
    return Math.max(0, Math.min(100, score));
}

// ─── Workout Generation ────────────────────────────────────────

/**
 * Generate a workout prescription based on athlete context.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - readinessState: ReadinessState (from GlobalReadinessState)
 *   - phase: Phase (from athlete_profiles)
 *   - acwr: number (from calculateACWR)
 *   - exerciseLibrary: ExerciseLibraryRow[] (from exercise_library table)
 *   - recentExerciseIds: string[] (exercise IDs from workouts in last 48h)
 *   - recentMuscleVolume: Record<MuscleGroup, number>
 *   - focus?: WorkoutFocus (optional override)
 *
 * Returns: WorkoutPrescription
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function generateWorkout(input: GenerateWorkoutInput): WorkoutPrescription {
    const {
        readinessState,
        phase,
        acwr,
        exerciseLibrary,
        recentExerciseIds,
        recentMuscleVolume,
        focus: overrideFocus,
        trainingIntensityCap,
        trainingDate,
        fitnessLevel,
    } = input;

    const dayOfWeek = resolveDayOfWeek(trainingDate);

    // Weight cut fight week (cap <= 4): force recovery focus
    const effectiveFocus = (trainingIntensityCap != null && trainingIntensityCap <= 4)
        ? 'recovery' as WorkoutFocus
        : determineFocus(dayOfWeek, readinessState, phase, overrideFocus);

    // Scale CNS budget proportionally when intensity cap is present
    const baseCNSBudget = CNS_BUDGET[readinessState];
    const totalCNSBudget = (trainingIntensityCap != null)
        ? Math.round(baseCNSBudget * (trainingIntensityCap / 10))
        : baseCNSBudget;

    const targetExerciseCount = EXERCISE_COUNT[readinessState];
    const prescription = SET_PRESCRIPTIONS[readinessState];

    // RPE cap from weight cut protocol
    const rpeCap = trainingIntensityCap ?? 10;

    // Determine workout type from focus
    const workoutType = effectiveFocus === 'recovery' ? 'recovery' as const
        : effectiveFocus === 'conditioning' ? 'conditioning' as const
            : effectiveFocus === 'sport_specific' ? 'practice' as const
                : 'strength' as const;

    // Filter exercises relevant to this focus
    const focusExercises = filterByFocus(exerciseLibrary, effectiveFocus);

    // Score each exercise
    let cnsBudgetRemaining = totalCNSBudget;
    const scored = focusExercises.map(exercise => ({
        exercise,
        score: scoreExerciseForUser(exercise, {
            readinessState,
            phase,
            acwr,
            recentExerciseIds,
            recentMuscleVolume,
            cnsBudgetRemaining: totalCNSBudget, // score with full budget first
            fitnessLevel,
        }),
    }));

    // Sort by score descending and pick top exercises
    scored.sort((a, b) => b.score - a.score);

    const selectedExercises: PrescribedExercise[] = [];
    let usedCNS = 0;

    for (const { exercise, score } of scored) {
        if (selectedExercises.length >= targetExerciseCount) break;
        if (score <= 0) continue;
        if (exercise.cns_load > cnsBudgetRemaining) continue;

        // Adjust sets/reps based on exercise type
        let sets = prescription.sets;
        let reps = prescription.reps;
        let rpe = Math.min(prescription.rpe, rpeCap); // enforce RPE cap

        if (exercise.type === 'heavy_lift') {
            reps = Math.max(3, prescription.reps - 2); // fewer reps for heavy lifts
        } else if (exercise.type === 'mobility' || exercise.type === 'active_recovery') {
            sets = 2;
            reps = 12;
            rpe = Math.min(4, rpeCap);
        } else if (exercise.type === 'conditioning') {
            sets = 3;
            reps = 1; // rounds/intervals
            rpe = Math.min(prescription.rpe, rpeCap);
        } else if (exercise.type === 'sport_specific') {
            sets = 3; // rounds
            reps = 1; // round-based
            rpe = Math.min(prescription.rpe, rpeCap);
        }

        selectedExercises.push({
            exercise,
            targetSets: sets,
            targetReps: reps,
            targetRPE: rpe,
            supersetGroup: null,
            score,
        });

        usedCNS += exercise.cns_load;
        cnsBudgetRemaining -= exercise.cns_load;
    }

    // Auto-pair complementary exercises into supersets (push + pull)
    applySupersets(selectedExercises);

    // Build message
    const focusLabel = effectiveFocus.replace(/_/g, ' ');
    let message: string;
    if (trainingIntensityCap != null && trainingIntensityCap <= 4) {
        message = `Weight cut fight week — recovery only. Light mobility and stretching. No heavy training.`;
    } else if (trainingIntensityCap != null) {
        message = `Weight cut active — intensity capped at ${trainingIntensityCap}/10. ${capitalize(focusLabel)} session adjusted for your cut protocol.`;
    } else if (readinessState === 'Depleted') {
        message = `Recovery day. Light mobility and active recovery to keep you moving without taxing your system.`;
    } else if (readinessState === 'Caution') {
        message = `Moderate ${focusLabel} session. Volume pulled back to let your body catch up.`;
    } else {
        message = `${capitalize(focusLabel)} day. You're in Prime shape — go after it. CNS budget: ${usedCNS}/${totalCNSBudget}.`;
    }

    return {
        focus: effectiveFocus,
        workoutType,
        exercises: selectedExercises,
        totalCNSBudget,
        usedCNS,
        message,
    };
}

// ─── Equipment Mapping ────────────────────────────────────────

/**
 * Maps exercise-level equipment to gym profile EquipmentItem.
 * 'bodyweight' and 'other' are always considered available.
 */
const EQUIPMENT_TO_GYM: Record<string, EquipmentItem | null> = {
    barbell: 'barbell',
    dumbbell: 'dumbbells',
    kettlebell: 'kettlebells',
    cable: 'cables',
    bodyweight: null,
    band: 'resistance_bands',
    machine: null,
    medicine_ball: 'medicine_balls',
    sled: 'sled',
    heavy_bag: 'heavy_bag',
    other: null,
};

const MACHINE_ITEMS: EquipmentItem[] = [
    'smith_machine', 'leg_press_machine', 'cable_crossover',
    'lat_pulldown_machine', 'assault_bike', 'rowing_machine',
];

// ─── Equipment Filter ─────────────────────────────────────────

/**
 * Filter exercises by available gym equipment.
 * Bodyweight and 'other' equipment always pass.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function filterByEquipment(
    exercises: ExerciseLibraryRow[],
    availableEquipment?: EquipmentItem[],
): ExerciseLibraryRow[] {
    if (!availableEquipment) return exercises;

    return exercises.filter(e => {
        const eq = e.equipment;
        if (eq === 'bodyweight' || eq === 'other') return true;
        if (eq === 'machine') return availableEquipment.some(item => MACHINE_ITEMS.includes(item));
        const required = EQUIPMENT_TO_GYM[eq];
        if (required == null) return true;
        return availableEquipment.includes(required);
    });
}

// ─── Time Estimation ──────────────────────────────────────────

/**
 * Estimate total workout time in minutes for a set of exercises.
 * Accounts for warmup sets, working sets, set execution, and rest.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
function estimateWorkoutTime(exercises: PrescribedExerciseV2[]): number {
    const restDefaults = getRestTimerDefaults();
    let totalMinutes = 0;

    for (const ex of exercises) {
        const warmupTime = (ex.warmupSets?.length ?? 0) * 1.5;
        const restSec = restDefaults[ex.exercise.type]?.defaultSeconds ?? 90;
        const setTime = ex.targetSets * (1 + restSec / 60); // ~1 min per set + rest
        totalMinutes += warmupTime + setTime;
    }

    return Math.round(totalMinutes);
}

/**
 * Trim exercises to fit a time budget, dropping lowest-scored exercises first.
 * For short workouts (<= 30 min), forces more supersets and reduces rest.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
function fitToTimeConstraint(
    exercises: PrescribedExerciseV2[],
    availableMinutes: number,
): PrescribedExerciseV2[] {
    if (availableMinutes <= 0) return exercises;

    // Sort by score descending (keep highest-scored)
    const sorted = [...exercises].sort((a, b) => b.score - a.score);
    const result: PrescribedExerciseV2[] = [];
    let estimatedTime = 0;

    for (const ex of sorted) {
        const restDefaults = getRestTimerDefaults();
        const warmupTime = (ex.warmupSets?.length ?? 0) * 1.5;
        const restSec = availableMinutes <= 30
            ? Math.min(restDefaults[ex.exercise.type]?.defaultSeconds ?? 90, 60)
            : restDefaults[ex.exercise.type]?.defaultSeconds ?? 90;
        const setTime = ex.targetSets * (1 + restSec / 60);
        const exerciseTime = warmupTime + setTime;

        if (estimatedTime + exerciseTime <= availableMinutes) {
            result.push({
                ...ex,
                restSeconds: restSec,
            });
            estimatedTime += exerciseTime;
        } else if (result.length < 2) {
            // Always include at least 2 exercises, reduce sets
            const reducedSets = Math.max(2, ex.targetSets - 1);
            const reducedTime = warmupTime + reducedSets * (1 + restSec / 60);
            result.push({
                ...ex,
                targetSets: reducedSets,
                restSeconds: restSec,
            });
            estimatedTime += reducedTime;
        }
    }

    // Short workouts: force supersets
    if (availableMinutes <= 30) {
        applySupersets(result);
    }

    return result;
}

// ─── V2 Workout Generation ────────────────────────────────────

/**
 * Generate an enhanced workout prescription (V2) with:
 *   - Equipment filtering + substitution
 *   - Time constraint fitting
 *   - Progressive overload suggestions per exercise
 *   - Warmup set generation
 *   - Rest timer defaults
 *   - Form cues surfacing
 *   - Deload week handling
 *   - Sparring day detection
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function generateWorkoutV2(input: GenerateWorkoutInputV2): WorkoutPrescriptionV2 {
    const {
        readinessState,
        phase,
        acwr,
        exerciseLibrary,
        recentExerciseIds,
        recentMuscleVolume,
        focus: overrideFocus,
        trainingIntensityCap,
        trainingDate,
        fitnessLevel,
        availableMinutes,
        gymEquipment,
        exerciseHistory,
        isDeloadWeek = false,
        weeklyPlanFocus,
        sparringDaysThisWeek,
        isSparringDay = false,
        progressionModel: inputProgressionModel,
    } = input;

    // Sparring day: return activation-only workout
    if (isSparringDay) {
        return buildSparringDayWorkout(exerciseLibrary, gymEquipment, phase);
    }

    const dayOfWeek = resolveDayOfWeek(trainingDate);

    // Use weekly plan focus if provided, otherwise determine from day
    const focusOverride = weeklyPlanFocus ?? overrideFocus;

    // Weight cut fight week (cap <= 4): force recovery
    const effectiveFocus = (trainingIntensityCap != null && trainingIntensityCap <= 4)
        ? 'recovery' as WorkoutFocus
        : determineFocus(dayOfWeek, readinessState, phase, focusOverride);

    // Scale CNS budget
    let baseCNSBudget = CNS_BUDGET[readinessState];
    if (trainingIntensityCap != null) {
        baseCNSBudget = Math.round(baseCNSBudget * (trainingIntensityCap / 10));
    }
    // Auto-taper CNS for sparring frequency
    if (sparringDaysThisWeek && sparringDaysThisWeek >= 2) {
        const taperMult = Math.max(0.5, 1.0 - (sparringDaysThisWeek - 1) * 0.175);
        baseCNSBudget = Math.round(baseCNSBudget * taperMult);
    }
    const totalCNSBudget = baseCNSBudget;

    // Deload: reduce exercise count and intensity
    const baseExerciseCount = EXERCISE_COUNT[readinessState];
    const targetExerciseCount = isDeloadWeek
        ? Math.max(3, baseExerciseCount - 1)
        : baseExerciseCount;

    const basePrescription = SET_PRESCRIPTIONS[readinessState];
    const prescription = isDeloadWeek
        ? { sets: Math.max(2, basePrescription.sets - 1), reps: basePrescription.reps + 2, rpe: Math.min(basePrescription.rpe, 5) }
        : basePrescription;

    const rpeCap = trainingIntensityCap ?? (isDeloadWeek ? 5 : 10);

    const workoutType = effectiveFocus === 'recovery' ? 'recovery' as const
        : effectiveFocus === 'conditioning' ? 'conditioning' as const
            : effectiveFocus === 'sport_specific' ? 'practice' as const
                : 'strength' as const;

    // Filter by focus, then by equipment
    let focusExercises = filterByFocus(exerciseLibrary, effectiveFocus);
    focusExercises = filterByEquipment(focusExercises, gymEquipment);

    // Score each exercise
    let cnsBudgetRemaining = totalCNSBudget;
    const scored = focusExercises.map(exercise => ({
        exercise,
        score: scoreExerciseForUser(exercise, {
            readinessState,
            phase,
            acwr,
            recentExerciseIds,
            recentMuscleVolume,
            cnsBudgetRemaining: totalCNSBudget,
            fitnessLevel,
        }),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Track which muscle groups we've added for warmup logic
    const muscleGroupsSeen = new Set<MuscleGroup>();
    const selectedExercises: PrescribedExerciseV2[] = [];
    let usedCNS = 0;
    const restDefaults = getRestTimerDefaults();

    for (const { exercise, score } of scored) {
        if (selectedExercises.length >= targetExerciseCount) break;
        if (score <= 0) continue;
        if (exercise.cns_load > cnsBudgetRemaining) continue;

        let sets = prescription.sets;
        let reps = prescription.reps;
        let rpe = Math.min(prescription.rpe, rpeCap);

        if (exercise.type === 'heavy_lift') {
            reps = Math.max(3, prescription.reps - 2);
        } else if (exercise.type === 'mobility' || exercise.type === 'active_recovery') {
            sets = 2;
            reps = 12;
            rpe = Math.min(4, rpeCap);
        } else if (exercise.type === 'conditioning') {
            sets = 3;
            reps = 1;
            rpe = Math.min(prescription.rpe, rpeCap);
        } else if (exercise.type === 'sport_specific') {
            sets = 3;
            reps = 1;
            rpe = Math.min(prescription.rpe, rpeCap);
        }

        // Generate overload suggestion if history is available
        let overloadSuggestion = undefined;
        let suggestedWeight = undefined;
        let weightSuggestionReasoning = undefined;
        const history = exerciseHistory?.get(exercise.id);
        if (history && history.length > 0) {
            const model = inputProgressionModel ?? selectProgressionModel(fitnessLevel, history.length);
            overloadSuggestion = suggestOverload({
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                history,
                fitnessLevel,
                progressionModel: model,
                isDeloadWeek,
                readinessState,
                targetRPE: rpe,
                targetReps: reps,
                muscleGroup: exercise.muscle_group,
            });
            suggestedWeight = overloadSuggestion.suggestedWeight;
            weightSuggestionReasoning = overloadSuggestion.reasoning;
        }

        // Generate warmup sets
        const isFirstForMuscle = !muscleGroupsSeen.has(exercise.muscle_group);
        const warmupResult = generateWarmupSets({
            workingWeight: suggestedWeight ?? 0,
            exerciseType: exercise.type,
            equipment: exercise.equipment,
            isFirstExerciseForMuscle: isFirstForMuscle,
            fitnessLevel,
        });
        muscleGroupsSeen.add(exercise.muscle_group);

        // Rest timer default
        const restSeconds = restDefaults[exercise.type]?.defaultSeconds ?? 90;

        selectedExercises.push({
            exercise,
            targetSets: sets,
            targetReps: reps,
            targetRPE: rpe,
            supersetGroup: null,
            score,
            suggestedWeight,
            weightSuggestionReasoning,
            warmupSets: warmupResult.sets,
            restSeconds,
            formCues: exercise.cues || undefined,
            isSubstitute: false,
            overloadSuggestion,
        });

        usedCNS += exercise.cns_load;
        cnsBudgetRemaining -= exercise.cns_load;
    }

    // Auto-pair supersets
    applySupersets(selectedExercises);

    // Fit to time constraint if specified
    const finalExercises = availableMinutes
        ? fitToTimeConstraint(selectedExercises, availableMinutes)
        : selectedExercises;

    const estimatedDuration = estimateWorkoutTime(finalExercises);

    // Build message
    const focusLabel = effectiveFocus.replace(/_/g, ' ');
    let message: string;
    if (isDeloadWeek) {
        message = `Recovery week. Light ${focusLabel} session — reduced volume and intensity. Focus on movement quality.`;
    } else if (trainingIntensityCap != null && trainingIntensityCap <= 4) {
        message = `Weight cut fight week — recovery only. Light mobility and stretching.`;
    } else if (trainingIntensityCap != null) {
        message = `Weight cut active — intensity capped at ${trainingIntensityCap}/10. ${capitalize(focusLabel)} session adjusted for your cut.`;
    } else if (readinessState === 'Depleted') {
        message = `Recovery day. Light mobility and active recovery.`;
    } else if (readinessState === 'Caution') {
        message = `Moderate ${focusLabel} session. Volume pulled back.`;
    } else {
        message = `${capitalize(focusLabel)} day. You're in Prime shape — go after it.`;
    }

    if (availableMinutes) {
        message += ` ${finalExercises.length} exercises, ~${estimatedDuration} min.`;
    }

    // Determine camp phase context
    let campPhaseContext: CampPhase | null = null;
    if (phase.startsWith('camp-')) {
        campPhaseContext = phase.replace('camp-', '') as CampPhase;
    }

    return {
        focus: effectiveFocus,
        workoutType,
        exercises: finalExercises,
        totalCNSBudget,
        usedCNS,
        message,
        estimatedDurationMin: estimatedDuration,
        isDeloadWorkout: isDeloadWeek,
        equipmentProfile: gymEquipment ? 'custom' : null,
        campPhaseContext,
        weeklyPlanDay: null,
        sparringDayGuidance: null,
    };
}

/**
 * Build an activation-only workout for sparring days.
 */
function buildSparringDayWorkout(
    library: ExerciseLibraryRow[],
    gymEquipment?: EquipmentItem[],
    phase?: Phase,
): WorkoutPrescriptionV2 {
    let exercises = library.filter(e =>
        e.type === 'mobility' || e.type === 'active_recovery' ||
        (e.type === 'sport_specific' && e.cns_load <= 3)
    );
    exercises = filterByEquipment(exercises, gymEquipment);

    const activation: PrescribedExerciseV2[] = exercises.slice(0, 5).map((exercise) => ({
        exercise,
        targetSets: 2,
        targetReps: exercise.type === 'sport_specific' ? 1 : 10,
        targetRPE: 3,
        supersetGroup: null,
        score: 50,
        restSeconds: 30,
        formCues: exercise.cues || undefined,
    }));

    let campPhaseContext: CampPhase | null = null;
    if (phase?.startsWith('camp-')) {
        campPhaseContext = phase.replace('camp-', '') as CampPhase;
    }

    return {
        focus: 'recovery',
        workoutType: 'recovery',
        exercises: activation,
        totalCNSBudget: 10,
        usedCNS: activation.reduce((sum, e) => sum + e.exercise.cns_load, 0),
        message: 'Sparring day — activation and mobility only. Save your energy for the ring.',
        estimatedDurationMin: 15,
        isDeloadWorkout: false,
        equipmentProfile: gymEquipment ? 'custom' : null,
        campPhaseContext,
        weeklyPlanDay: null,
        sparringDayGuidance: null,
    };
}

// ─── Volume Calculation ────────────────────────────────────────

/**
 * Calculate total volume load from a set of completed sets.
 * Volume = Σ(reps × weight_lbs) for working sets only.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function calculateVolumeLoad(
    sets: Pick<WorkoutSetLogRow, 'reps' | 'weight_lbs' | 'is_warmup'>[],
): { totalVolume: number; workingSets: number; totalSets: number } {
    let totalVolume = 0;
    let workingSets = 0;

    for (const set of sets) {
        if (!set.is_warmup) {
            totalVolume += set.reps * set.weight_lbs;
            workingSets++;
        }
    }

    return {
        totalVolume: Math.round(totalVolume),
        workingSets,
        totalSets: sets.length,
    };
}

// ─── Weekly Volume ─────────────────────────────────────────────

/**
 * Calculate weekly volume per muscle group from workout set logs.
 *
 * Pure synchronous function.
 */
export function calculateWeeklyVolume(
    sets: (Pick<WorkoutSetLogRow, 'reps' | 'weight_lbs' | 'is_warmup'> & {
        muscle_group: MuscleGroup;
    })[],
): Record<MuscleGroup, number> {
    const volume: Record<string, number> = {};
    for (const group of ALL_MUSCLE_GROUPS) {
        volume[group] = 0;
    }

    for (const set of sets) {
        if (!set.is_warmup) {
            volume[set.muscle_group] = (volume[set.muscle_group] ?? 0) + (set.reps * set.weight_lbs);
        }
    }

    return volume as Record<MuscleGroup, number>;
}

// ─── Workout Compliance ────────────────────────────────────────

/**
 * Compare planned vs actual workout adherence.
 * Mirrors computeMacroAdherence for nutrition.
 *
 * Pure synchronous function.
 */
export function getWorkoutCompliance(
    plannedSets: number,
    actualSets: number,
    plannedVolume: number,
    actualVolume: number,
): WorkoutComplianceResult {
    const setsCompletedPct = plannedSets > 0
        ? Math.round((actualSets / plannedSets) * 100)
        : actualSets > 0 ? 100 : 0;

    const volumeCompliancePct = plannedVolume > 0
        ? Math.round((actualVolume / plannedVolume) * 100)
        : actualVolume > 0 ? 100 : 0;

    const avgPct = (setsCompletedPct + volumeCompliancePct) / 2;

    let overall: WorkoutComplianceResult['overall'];
    if (avgPct >= 90) {
        overall = 'Target Met';
    } else if (avgPct >= 70) {
        overall = 'Close Enough';
    } else {
        overall = 'Missed It';
    }

    return { setsCompletedPct, volumeCompliancePct, overall };
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Filter exercises relevant to the given focus.
 */
function filterByFocus(
    library: ExerciseLibraryRow[],
    focus: WorkoutFocus,
): ExerciseLibraryRow[] {
    switch (focus) {
        case 'upper_push':
            return library.filter(e =>
                ['chest', 'shoulders', 'arms'].includes(e.muscle_group) ||
                e.type === 'power'
            );
        case 'upper_pull':
            return library.filter(e =>
                ['back', 'arms'].includes(e.muscle_group) ||
                e.type === 'power'
            );
        case 'lower':
            return library.filter(e =>
                ['quads', 'hamstrings', 'glutes', 'calves'].includes(e.muscle_group) ||
                e.type === 'power'
            );
        case 'full_body':
            return library.filter(e =>
                e.type !== 'mobility' && e.type !== 'active_recovery'
            );
        case 'sport_specific':
            return library.filter(e =>
                e.type === 'sport_specific' || e.sport_tags.includes('boxing')
            );
        case 'conditioning':
            return library.filter(e =>
                e.type === 'conditioning' || e.type === 'power'
            );
        case 'recovery':
            return library.filter(e =>
                e.type === 'mobility' || e.type === 'active_recovery'
            );
        default:
            return library;
    }
}

/**
 * Auto-pair complementary exercises into supersets.
 * Pairs push muscles with pull muscles when adjacent.
 */
function applySupersets(exercises: PrescribedExercise[]): void {
    const PUSH_GROUPS: MuscleGroup[] = ['chest', 'shoulders'];
    const PULL_GROUPS: MuscleGroup[] = ['back'];

    let supersetId = 1;
    for (let i = 0; i < exercises.length - 1; i++) {
        const current = exercises[i];
        const next = exercises[i + 1];

        const currentIsPush = PUSH_GROUPS.includes(current.exercise.muscle_group);
        const nextIsPull = PULL_GROUPS.includes(next.exercise.muscle_group);

        const currentIsPull = PULL_GROUPS.includes(current.exercise.muscle_group);
        const nextIsPush = PUSH_GROUPS.includes(next.exercise.muscle_group);

        if ((currentIsPush && nextIsPull) || (currentIsPull && nextIsPush)) {
            current.supersetGroup = supersetId;
            next.supersetGroup = supersetId;
            supersetId++;
            i++; // skip next since it's paired
        }
    }
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}


