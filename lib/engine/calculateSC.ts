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
    PerformanceGoalType,
    PerformanceRiskState,
    TrainingBlockContext,
} from './types';
import { getRestTimerDefaults } from './adaptiveWorkout';
import { assessPerformanceRisk } from './performancePlanner';
import { buildSectionedWorkoutSession } from './workoutSessionBuilder';

// ─── Constants ─────────────────────────────────────────────────

/**
 * CNS budget by readiness state.
 * Prime → athlete can handle high-CNS work.
 * Depleted → restrict to low-CNS mobility/recovery.
 */
const CNS_BUDGET: Record<ReadinessState, number> = {
    Prime: 65,
    Caution: 40,
    Depleted: 15,
};

/**
 * Default exercise count by readiness state.
 */
const EXERCISE_COUNT: Record<ReadinessState, number> = {
    Prime: 8,
    Caution: 6,
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

    // 7. Goal bias — steer exercise ranking toward the block objective
    if (context.performanceGoalType === 'strength') {
        if (exercise.type === 'heavy_lift') score += 15;
        if (exercise.type === 'power') score += 8;
        if (exercise.type === 'conditioning') score -= 6;
    } else if (context.performanceGoalType === 'conditioning') {
        if (exercise.type === 'conditioning') score += 18;
        if (exercise.type === 'power') score += 8;
        if (exercise.type === 'heavy_lift' && exercise.cns_load >= 8) score -= 10;
    } else if (context.performanceGoalType === 'boxing_skill') {
        if (exercise.type === 'power') score += 10;
        if (exercise.type === 'sport_specific') score += 12;
        if (exercise.type === 'heavy_lift' && exercise.cns_load >= 8) score -= 12;
    } else if (context.performanceGoalType === 'weight_class_prep') {
        if (exercise.type === 'conditioning') score += 8;
        if (exercise.type === 'mobility' || exercise.type === 'active_recovery') score += 10;
        if (exercise.type === 'heavy_lift' && exercise.cns_load >= 8) score -= 15;
    }

    // 8. Block phase — bias volume or sharpness based on where the athlete is in the block
    if (context.blockPhase === 'accumulate') {
        if (exercise.type === 'conditioning' || exercise.type === 'mobility') score += 4;
    } else if (context.blockPhase === 'intensify') {
        if (exercise.type === 'heavy_lift' || exercise.type === 'power') score += 8;
    } else if (context.blockPhase === 'realize') {
        if (exercise.type === 'power') score += 10;
        if (exercise.type === 'mobility') score -= 6;
    } else if (context.blockPhase === 'pivot') {
        if (exercise.type === 'mobility' || exercise.type === 'active_recovery') score += 20;
        if (exercise.type === 'heavy_lift') score -= 20;
    }

    // 9. Composite risk layer — aggressively remove expensive work when the week is unstable
    if (context.performanceRiskLevel === 'yellow' && exercise.cns_load >= 9) {
        score -= 10;
    } else if (context.performanceRiskLevel === 'orange') {
        if (!context.allowHighImpact && (exercise.type === 'heavy_lift' || exercise.type === 'power') && exercise.cns_load >= 7) {
            score -= 40;
        }
        if (exercise.type === 'mobility' || exercise.type === 'active_recovery') score += 8;
    } else if (context.performanceRiskLevel === 'red') {
        if (exercise.type === 'mobility' || exercise.type === 'active_recovery') {
            score += 20;
        } else if (exercise.cns_load >= 4 || !context.allowHighImpact) {
            return 0;
        }
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
        const warmupTime = (ex.warmupSets?.length ?? 0) * 1.25;
        const restSec = ex.restSeconds ?? restDefaults[ex.exercise.type]?.defaultSeconds ?? 90;
        const setTime = ex.setPrescription && ex.setPrescription.length > 0
            ? ex.setPrescription.reduce((sum, entry) => sum + (entry.sets * (0.75 + entry.restSeconds / 60)), 0)
            : ex.targetSets * (1 + restSec / 60);
        totalMinutes += warmupTime + setTime;
    }

    return Math.round(totalMinutes);
}

function resolvePrimaryAdaptation(
    focus: WorkoutFocus,
    performanceGoalType: PerformanceGoalType | undefined,
): WorkoutPrescriptionV2['primaryAdaptation'] {
    if (focus === 'recovery') return 'recovery';
    if (focus === 'conditioning') return 'conditioning';
    if (focus === 'sport_specific') return performanceGoalType === 'boxing_skill' ? 'power' : 'mixed';
    if (performanceGoalType === 'conditioning' || performanceGoalType === 'weight_class_prep') return 'conditioning';
    if (performanceGoalType === 'boxing_skill') return 'power';
    return focus === 'full_body' ? 'mixed' : 'strength';
}

function buildSessionIntent(input: {
    focus: WorkoutFocus;
    primaryAdaptation: WorkoutPrescriptionV2['primaryAdaptation'];
    performanceGoalType?: PerformanceGoalType;
    performanceRisk: PerformanceRiskState;
    blockContext: TrainingBlockContext | null;
    availableMinutes?: number;
}): string {
    const focusLabel = input.focus.replace(/_/g, ' ');
    const goalLabel = (input.performanceGoalType ?? 'conditioning').replace(/_/g, ' ');
    const timeLine = input.availableMinutes ? ` Keep the work inside ${input.availableMinutes} minutes.` : '';

    if (input.performanceRisk.level === 'red') {
        return `Protect recovery first. This ${focusLabel} session is being reduced to preserve the block.${timeLine}`;
    }
    if (input.performanceRisk.level === 'orange') {
        return `Preserve quality while controlling fatigue. Bias crisp ${focusLabel} work and skip any junk volume.${timeLine}`;
    }
    if (input.blockContext?.phase === 'realize') {
        return `Express ${goalLabel} qualities with high-quality ${focusLabel} work, then get out before fatigue drifts up.${timeLine}`;
    }
    if (input.blockContext?.phase === 'pivot') {
        return `Use this session to consolidate adaptation and stay fresh for the next build.${timeLine}`;
    }
    return `Build ${goalLabel} through ${focusLabel} work with a ${input.primaryAdaptation} bias.${timeLine}`;
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
        performanceGoalType,
        performanceRisk,
        blockContext,
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

    const resolvedPerformanceRisk = performanceRisk ?? assessPerformanceRisk({
        readinessState,
        acwr,
        isDeloadWeek,
        trainingIntensityCap,
        isSparringDay,
    });
    const resolvedBlockContext = blockContext ?? null;

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
    if (resolvedBlockContext) {
        baseCNSBudget = Math.round(baseCNSBudget * resolvedBlockContext.volumeMultiplier);
    }
    const rawCNSBudget = baseCNSBudget * resolvedPerformanceRisk.cnsMultiplier;
    const flooredBudget = Math.max(rawCNSBudget, CNS_BUDGET[readinessState] * 0.55);
    const totalCNSBudget = Math.max(10, Math.round(flooredBudget));

    // Deload: reduce exercise count and intensity
    const baseExerciseCount = EXERCISE_COUNT[readinessState];
    let targetExerciseCount = isDeloadWeek
        ? Math.max(3, baseExerciseCount - 1)
        : baseExerciseCount;
    if (resolvedPerformanceRisk.level === 'yellow') {
        targetExerciseCount = Math.max(3, targetExerciseCount - 1);
    } else if (resolvedPerformanceRisk.level === 'orange') {
        targetExerciseCount = Math.max(2, targetExerciseCount - 2);
    } else if (resolvedPerformanceRisk.level === 'red') {
        targetExerciseCount = Math.min(2, targetExerciseCount);
    }

    const rpeCap = Math.min(
        trainingIntensityCap ?? (isDeloadWeek ? 5 : 10),
        resolvedPerformanceRisk.intensityCap,
    );

    const workoutType = effectiveFocus === 'recovery' ? 'recovery' as const
        : effectiveFocus === 'conditioning' ? 'conditioning' as const
            : effectiveFocus === 'sport_specific' ? 'practice' as const
                : 'strength' as const;

    const usableExercises = filterByEquipment(exerciseLibrary, gymEquipment);
    const scored = usableExercises.map(exercise => ({
        exercise,
        score: scoreExerciseForUser(exercise, {
            readinessState,
            phase,
            acwr,
            recentExerciseIds,
            recentMuscleVolume,
            cnsBudgetRemaining: totalCNSBudget,
            fitnessLevel,
            performanceGoalType,
            performanceRiskLevel: resolvedPerformanceRisk.level,
            allowHighImpact: resolvedPerformanceRisk.allowHighImpact,
            blockPhase: resolvedBlockContext?.phase,
        }),
    }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

    const sectionedSession = buildSectionedWorkoutSession({
        focus: effectiveFocus,
        scoredExercises: scored,
        usableExerciseLibrary: usableExercises,
        readinessState,
        rpeCap,
        performanceRisk: resolvedPerformanceRisk,
        performanceGoalType,
        blockContext: resolvedBlockContext,
        availableMinutes,
        fitnessLevel,
        exerciseHistory,
        progressionModel: inputProgressionModel,
        isDeloadWeek,
        targetExerciseCount,
    });

    const finalExercises = sectionedSession.exercises;
    const estimatedDuration = sectionedSession.estimatedDuration || estimateWorkoutTime(finalExercises);
    const primaryAdaptation = resolvePrimaryAdaptation(effectiveFocus, performanceGoalType);
    const sessionGoal = sectionedSession.sessionGoal;
    const sessionIntent = buildSessionIntent({
        focus: effectiveFocus,
        primaryAdaptation,
        performanceGoalType,
        performanceRisk: resolvedPerformanceRisk,
        blockContext: resolvedBlockContext,
        availableMinutes,
    });
    const decisionTrace = [
        `focus:${effectiveFocus}`,
        `goal:${performanceGoalType ?? 'conditioning'}`,
        `risk:${resolvedPerformanceRisk.level}`,
        ...(resolvedBlockContext ? [`block:${resolvedBlockContext.phase}`] : []),
        `sections:${sectionedSession.sections.map(section => section.template).join('|')}`,
        ...resolvedPerformanceRisk.reasons.slice(0, 3),
    ];

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
        payloadVersion: 'v3',
        totalCNSBudget,
        usedCNS: sectionedSession.usedCNS,
        message,
        estimatedDurationMin: estimatedDuration,
        isDeloadWorkout: isDeloadWeek,
        equipmentProfile: gymEquipment ? 'custom' : null,
        campPhaseContext,
        weeklyPlanDay: null,
        sparringDayGuidance: null,
        sessionTemplate: sectionedSession.sections.map(section => section.template),
        sessionGoal,
        sections: sectionedSession.sections,
        sessionIntent,
        primaryAdaptation,
        performanceRisk: resolvedPerformanceRisk,
        blockContext: resolvedBlockContext,
        decisionTrace,
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

    const activation: NonNullable<WorkoutPrescriptionV2['sections']>[number]['exercises'] = exercises.slice(0, 5).map((exercise, index) => ({
        exercise,
        targetSets: 2,
        targetReps: exercise.type === 'sport_specific' ? 1 : 8,
        targetRPE: 3,
        supersetGroup: null,
        score: 50,
        restSeconds: 30,
        formCues: exercise.cues || undefined,
        role: index < 2 ? 'prep' : 'recovery',
        loadingStrategy: 'recovery_flow',
        progressionAnchor: null,
        preferredExercise: exercise,
        substitutions: [],
        coachingCues: exercise.cues ? [exercise.cues] : ['Stay easy and leave the session fresh.'],
        fatigueCost: 'low',
        setScheme: exercise.type === 'sport_specific' ? '2 x 1 easy rounds' : '2 x 8 smooth reps',
        loadingNotes: 'Keep the entire session low cost so sparring gets your best energy.',
        setPrescription: [{
            label: index < 2 ? 'Prep' : 'Recovery',
            sets: 2,
            reps: exercise.type === 'sport_specific' ? '1 round' : 8,
            targetRPE: 3,
            restSeconds: 30,
        }],
        sectionId: index < 2 ? 'activation-1' : 'cooldown-1',
        sectionTemplate: index < 2 ? 'activation' : 'cooldown',
        sectionIntent: index < 2
            ? 'Prime rhythm and mobility without adding fatigue.'
            : 'Downshift and recover for sparring.',
    }));

    const sections: NonNullable<WorkoutPrescriptionV2['sections']> = [
        {
            id: 'activation-1',
            template: 'activation' as const,
            title: 'Activation',
            intent: 'Prime rhythm and mobility without adding fatigue.',
            timeCap: 6,
            restRule: 'Keep it easy and controlled.',
            densityRule: '2 easy rounds',
            exercises: activation.slice(0, Math.min(2, activation.length)),
            decisionTrace: ['template:activation', 'sparring day support'],
            finisherReason: null,
        },
        {
            id: 'cooldown-1',
            template: 'cooldown' as const,
            title: 'Cooldown',
            intent: 'Downshift and recover for sparring.',
            timeCap: 6,
            restRule: 'Continuous easy flow.',
            densityRule: '1 easy round',
            exercises: activation.slice(Math.min(2, activation.length)),
            decisionTrace: ['template:cooldown', 'sparring day support'],
            finisherReason: null,
        },
    ].filter(section => section.exercises.length > 0);

    let campPhaseContext: CampPhase | null = null;
    if (phase?.startsWith('camp-')) {
        campPhaseContext = phase.replace('camp-', '') as CampPhase;
    }

    return {
        focus: 'recovery',
        workoutType: 'recovery',
        exercises: activation,
        payloadVersion: 'v3',
        totalCNSBudget: 10,
        usedCNS: activation.reduce((sum, e) => sum + e.exercise.cns_load, 0),
        message: 'Sparring day — activation and mobility only. Save your energy for the ring.',
        estimatedDurationMin: estimateWorkoutTime(activation),
        isDeloadWorkout: false,
        equipmentProfile: gymEquipment ? 'custom' : null,
        campPhaseContext,
        weeklyPlanDay: null,
        sparringDayGuidance: null,
        sessionTemplate: sections.map(section => section.template),
        sessionGoal: 'Support sparring readiness with low-cost activation and recovery work only.',
        sections,
        sessionIntent: 'Support sparring with low-cost activation and mobility only.',
        primaryAdaptation: 'recovery',
        performanceRisk: null,
        blockContext: null,
        decisionTrace: ['focus:recovery', 'sparring day activation'],
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


