import type {
    ReadinessState,
    WorkoutFocus,
    FitnessLevel,
    Phase,
    MuscleGroup,
    Equipment,
} from './types/foundational.ts';
import type {
    CampPhase,
} from './types/camp.ts';
import type {
    PerformanceGoalType,
} from './types/fightCampV1.ts';
import type {
    ExerciseLibraryRow,
    ExerciseHistoryEntry,
    ExerciseScoringContext,
    ExerciseUsageSummary,
    GenerateWorkoutInput,
    GenerateWorkoutInputV2,
    WorkoutPrescription,
    WorkoutPrescriptionV2,
    PrescribedExercise,
    PrescribedExerciseV2,
    WorkoutSetLogRow,
    WorkoutComplianceResult,
    EquipmentItem,
    ConditioningPrescription,
    PerformanceRiskState,
    SessionModulePlan,
    SectionExercisePrescription,
    TrainingBlockContext,
    WorkoutDoseBucket,
    WorkoutDoseCredit,
    WorkoutModuleBlock,
    WorkoutSessionSection,
} from './types/training.ts';
import type {
    MEDStatus,
    ReadinessProfile,
    StimulusConstraintSet,
    StimulusType,
} from './types/readiness.ts';
import { getRestTimerDefaults } from './adaptiveWorkout.ts';
import { prescribeConditioning } from './calculateConditioning.ts';
import { assessPerformanceRisk, getGoalBasedFocusRotation } from './performancePlanner.ts';
import { buildSectionedWorkoutSession } from './workoutSessionBuilder.ts';
import { getCalibratedCNSBudget } from './readiness/cnsBudget.ts';
import { deriveStimulusConstraintSet } from './readiness/profile.ts';
import { getExerciseRecoveryCost, scoreExerciseCandidate } from './sc/exerciseScoring.ts';

// ─── Constants ─────────────────────────────────────────────────

/**
 * CNS budget by readiness state.
 * Prime → athlete can handle high-CNS work.
 * Depleted → restrict to low-CNS mobility/recovery.
 */
/**
 * Default exercise count by readiness state.
 */
const EXERCISE_COUNT: Record<ReadinessState, number> = {
    Prime: 12,
    Caution: 9,
    Depleted: 5,
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

function resolveSessionFamily(
    focus: WorkoutFocus,
    explicitSessionFamily?: GenerateWorkoutInputV2['sessionFamily'],
): WorkoutPrescriptionV2['sessionFamily'] {
    if (explicitSessionFamily) return explicitSessionFamily;
    if (focus === 'conditioning') return 'conditioning';
    if (focus === 'recovery') return 'recovery';
    if (focus === 'sport_specific') return 'boxing_skill';
    return 'strength';
}

function resolveTrainingAge(
    fitnessLevel: FitnessLevel,
    explicitTrainingAge?: 'novice' | 'intermediate' | 'advanced',
): 'novice' | 'intermediate' | 'advanced' {
    if (explicitTrainingAge) return explicitTrainingAge;
    if (fitnessLevel === 'beginner') return 'novice';
    if (fitnessLevel === 'advanced' || fitnessLevel === 'elite') return 'advanced';
    return 'intermediate';
}

function resolveDayOfWeek(trainingDate?: string): number {
    if (trainingDate) {
        const parsed = new Date(`${trainingDate}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.getDay();
        }
    }
    return new Date().getDay();
}

function parseIsoDateToUtc(value: string): number | null {
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isNaN(parsed) ? null : parsed;
}

function daysBetweenIsoDates(later: string, earlier: string): number | null {
    const laterUtc = parseIsoDateToUtc(later);
    const earlierUtc = parseIsoDateToUtc(earlier);
    if (laterUtc == null || earlierUtc == null) return null;
    return Math.max(0, Math.floor((laterUtc - earlierUtc) / 86400000));
}

function buildExerciseUsageSummary(
    exerciseHistory: Map<string, ExerciseHistoryEntry[]> | undefined,
    exerciseLibrary: ExerciseLibraryRow[],
    trainingDate?: string,
): ExerciseUsageSummary {
    const byExerciseId: ExerciseUsageSummary['byExerciseId'] = {};
    const uniqueExercisesByMuscle7d: ExerciseUsageSummary['uniqueExercisesByMuscle7d'] = {};
    if (!exerciseHistory || !trainingDate) {
        return { byExerciseId, uniqueExercisesByMuscle7d };
    }

    const muscleByExercise = new Map(exerciseLibrary.map((exercise) => [exercise.id, exercise.muscle_group]));

    for (const [exerciseId, history] of exerciseHistory.entries()) {
        if (!history || history.length === 0) continue;
        const dayOffsets = history
            .map((entry) => daysBetweenIsoDates(trainingDate, entry.date))
            .filter((value): value is number => value != null)
            .sort((a, b) => a - b);

        if (dayOffsets.length === 0) continue;

        byExerciseId[exerciseId] = {
            daysSinceLastUse: dayOffsets[0] ?? null,
            uses7d: dayOffsets.filter((value) => value <= 6).length,
            uses14d: dayOffsets.filter((value) => value <= 13).length,
            uses28d: dayOffsets.filter((value) => value <= 27).length,
        };

        const muscleGroup = muscleByExercise.get(exerciseId);
        if (muscleGroup && dayOffsets.some((value) => value <= 6)) {
            const current = uniqueExercisesByMuscle7d[muscleGroup] ?? [];
            uniqueExercisesByMuscle7d[muscleGroup] = current.includes(exerciseId)
                ? current
                : [...current, exerciseId];
        }
    }

    return { byExerciseId, uniqueExercisesByMuscle7d };
}

function selectRotationFocus(
    performanceGoalType: PerformanceGoalType,
    scDayCount: number,
    recentFocuses7d: WorkoutFocus[],
    constraintSet?: StimulusConstraintSet | null,
): WorkoutFocus {
    const rotation = getGoalBasedFocusRotation({
        performanceGoalType,
        scDayCount,
    });
    const ranked = rotation
        .map((focus, index) => ({
            focus,
            index,
            recencyIndex: recentFocuses7d.indexOf(focus),
        }))
        .sort((a, b) => {
            const aRank = a.recencyIndex === -1 ? Number.POSITIVE_INFINITY : a.recencyIndex;
            const bRank = b.recencyIndex === -1 ? Number.POSITIVE_INFINITY : b.recencyIndex;
            if (bRank !== aRank) return bRank - aRank;
            return a.index - b.index;
        });

    return resolveFocusFromConstraints(ranked[0]?.focus ?? rotation[0] ?? 'full_body', constraintSet);
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
    constraintSet?: StimulusConstraintSet | null,
    performanceGoalType?: PerformanceGoalType,
    scDayCount: number = 4,
    recentFocuses7d: WorkoutFocus[] = [],
): WorkoutFocus {
    if (overrideFocus) return overrideFocus;

    if (performanceGoalType) {
        return selectRotationFocus(performanceGoalType, scDayCount, recentFocuses7d, constraintSet);
    }

    // Fight camp adjustments: more sport-specific work
    if (phase === 'fight-camp') {
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) return resolveFocusFromConstraints('sport_specific', constraintSet);
        if (dayOfWeek === 2 || dayOfWeek === 4) return resolveFocusFromConstraints('conditioning', constraintSet);
        return resolveFocusFromConstraints('recovery', constraintSet);
    }

    const baseFocus = WEEKLY_FOCUS_MAP[dayOfWeek] ?? 'full_body';
    if (readinessState === 'Depleted' && constraintSet && constraintSet.strengthBudget >= 50) {
        return resolveFocusFromConstraints(baseFocus === 'recovery' ? 'full_body' : baseFocus, constraintSet);
    }

    return resolveFocusFromConstraints(baseFocus, constraintSet);
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
    let score = 50;
    const constraintSet = context.constraintSet ?? null;
    const stimuli = getExerciseStimuli(exercise);
    const usage = context.exerciseUsageSummary?.byExerciseId[exercise.id];
    const uniqueExercisesByMuscle7d = context.exerciseUsageSummary?.uniqueExercisesByMuscle7d[exercise.muscle_group] ?? [];

    // 1. Readiness × exercise type alignment
    if (context.readinessState === 'Depleted') {
        if (exercise.type === 'heavy_lift' || exercise.type === 'power') {
            if (!constraintSet || constraintSet.strengthBudget < 50 || stimuli.includes('heavy_strength') || stimuli.includes('max_velocity')) {
                return 0; // too heavy for depleted state
            }
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
    if (context.readinessState !== 'Depleted' && boostedTypes.includes(exercise.type)) {
        score += 15;
    }

    if (constraintSet) {
        const blockedHit = stimuli.filter((stimulus) => constraintSet.blockedStimuli.includes(stimulus));
        if (blockedHit.length > 0) {
            if (stimuli.includes('recovery') && constraintSet.allowedStimuli.includes('recovery')) {
                score += 10;
            } else if (blockedHit.includes('high_impact') || blockedHit.includes('hard_sparring')) {
                return 0;
            } else {
                score -= 30;
            }
        }

        if (stimuli.includes('machine_strength') && constraintSet.allowedStimuli.includes('machine_strength')) {
            score += 12;
        }
        if (stimuli.includes('controlled_strength') && constraintSet.allowedStimuli.includes('controlled_strength')) {
            score += 8;
        }
        if (stimuli.includes('aerobic_conditioning') && constraintSet.allowedStimuli.includes('aerobic_conditioning')) {
            score += 10;
        }
        if (stimuli.includes('tempo_conditioning') && constraintSet.allowedStimuli.includes('tempo_conditioning')) {
            score += 6;
        }
        if (stimuli.includes('technical_skill') && constraintSet.allowedStimuli.includes('technical_skill')) {
            score += 8;
        }
    }

    // 3. Recency penalty — don't repeat the same exercise within 48h
    if (usage?.daysSinceLastUse != null) {
        if (usage.daysSinceLastUse <= 2) {
            score -= 30;
        } else if (usage.daysSinceLastUse <= 6) {
            score -= 15;
        } else if (usage.daysSinceLastUse <= 13) {
            score += 4;
        } else if (usage.daysSinceLastUse <= 20) {
            score += 8;
        } else {
            score += 12;
        }
    } else if (context.recentExerciseIds.includes(exercise.id)) {
        score -= 30;
    }

    if ((usage?.uses7d ?? 0) >= 2) {
        score -= 8;
    }
    if ((usage?.uses14d ?? 0) >= 3) {
        score -= 15;
    }
    if (context.exerciseUsageSummary && uniqueExercisesByMuscle7d.length < 3 && !uniqueExercisesByMuscle7d.includes(exercise.id)) {
        score += 6;
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
        trainingAge,
        complianceHistory28d,
        readinessProfile,
        constraintSet,
    } = input;

    const dayOfWeek = resolveDayOfWeek(trainingDate);
    const resolvedConstraintSet = constraintSet ?? (readinessProfile
        ? deriveStimulusConstraintSet(readinessProfile, { phase, trainingIntensityCap })
        : null);

    // Weight cut fight week (cap <= 4): force recovery focus
    const effectiveFocus = (trainingIntensityCap != null && trainingIntensityCap <= 4 && (resolvedConstraintSet?.strengthBudget ?? 0) < 50)
        ? 'recovery' as WorkoutFocus
        : determineFocus(dayOfWeek, readinessState, phase, overrideFocus, resolvedConstraintSet);

    // Scale CNS budget proportionally when intensity cap is present
    const baseCNSBudget = getCalibratedCNSBudget({
        readinessState,
        trainingAge: resolveTrainingAge(fitnessLevel, trainingAge),
        complianceHistory28d,
    });
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
    let recoveryBudgetRemaining = totalCNSBudget;
    const scored = focusExercises.map(exercise => {
        const fitScore = scoreExerciseForUser(exercise, {
            readinessState,
            readinessProfile,
            constraintSet: resolvedConstraintSet,
            phase,
            acwr,
            recentExerciseIds,
            recentMuscleVolume,
            cnsBudgetRemaining: totalCNSBudget,
            fitnessLevel,
            recoveryBudget: totalCNSBudget,
        });
        const candidate = scoreExerciseCandidate(exercise, fitScore, {
            readinessState,
            readinessProfile,
            constraintSet: resolvedConstraintSet,
            phase,
            acwr,
            recentExerciseIds,
            recentMuscleVolume,
            cnsBudgetRemaining: totalCNSBudget,
            fitnessLevel,
            recoveryBudget: totalCNSBudget,
        });
        return {
            exercise,
            score: candidate.fitScore,
            recoveryCost: candidate.recoveryCost,
        };
    });

    // Sort by score descending and pick top exercises
    scored.sort((a, b) => b.score - a.score);

    const selectedExercises: PrescribedExercise[] = [];
    let usedCNS = 0;

    for (const { exercise, score, recoveryCost } of scored) {
        if (selectedExercises.length >= targetExerciseCount) break;
        if (score <= 0) continue;
        if (exercise.cns_load > cnsBudgetRemaining) continue;
        if (recoveryCost > recoveryBudgetRemaining) continue;

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
            recoveryCost,
        });

        usedCNS += exercise.cns_load;
        cnsBudgetRemaining -= exercise.cns_load;
        recoveryBudgetRemaining -= recoveryCost;
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
        message = `${capitalize(focusLabel)} day. You're in Prime shape — go after it. Recovery budget: ${usedCNS}/${totalCNSBudget}.`;
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
        let setTime = ex.setPrescription && ex.setPrescription.length > 0
            ? ex.setPrescription.reduce((sum, entry) => sum + (entry.sets * (0.75 + entry.restSeconds / 60)), 0)
            : ex.targetSets * (1 + restSec / 60);
        if (ex.supersetGroup != null) {
            setTime *= 0.8;
        }
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

function getConditioningTypeLabel(type: ConditioningPrescription['type']): string {
    const labels: Record<ConditioningPrescription['type'], string> = {
        heavy_bag_rounds: 'Heavy Bag Rounds',
        circuit: 'Conditioning Circuit',
        jump_rope: 'Jump Rope',
        sled_work: 'Sled Work',
        agility_drills: 'Agility Drills',
        sport_specific_drill: 'Sport-Specific Drills',
        assault_bike: 'Assault Bike',
        rowing: 'Rowing',
        swimming: 'Swimming',
        bike_erg: 'Bike Erg',
        ski_erg: 'Ski Erg',
        interval_medley: 'Interval Medley',
    };

    return labels[type];
}

function resolveConditioningEquipment(type: ConditioningPrescription['type']): Equipment {
    switch (type) {
        case 'heavy_bag_rounds':
            return 'heavy_bag';
        case 'sled_work':
            return 'sled';
        case 'assault_bike':
        case 'rowing':
        case 'bike_erg':
        case 'ski_erg':
            return 'machine';
        default:
            return 'bodyweight';
    }
}

function resolveConditioningExerciseType(type: ConditioningPrescription['type']): ExerciseLibraryRow['type'] {
    if (type === 'heavy_bag_rounds' || type === 'sport_specific_drill') return 'sport_specific';
    return 'conditioning';
}

function buildConditioningSetScheme(
    prescription: ConditioningPrescription,
    exercise: ConditioningPrescription['exercises'][number],
): string {
    const timedWork = exercise.timedWork ?? prescription.timedWork;
    if (timedWork?.format === 'emom') {
        return `EMOM ${Math.round(timedWork.totalDurationSec / 60)}`;
    }
    if (timedWork?.format === 'tabata') {
        return `Tabata: ${timedWork.roundCount ?? 8} x ${timedWork.workIntervalSec ?? 20}s on / ${timedWork.restIntervalSec ?? 10}s off`;
    }
    if (timedWork?.format === 'amrap') {
        return `${Math.round(timedWork.totalDurationSec / 60)}-min AMRAP`;
    }
    if (timedWork?.format === 'for_time') {
        return `For time (${Math.round(timedWork.totalDurationSec / 60)} min cap)`;
    }
    if (prescription.circuitRound) {
        return `${prescription.circuitRound.roundCount} circuit rounds`;
    }
    if (exercise.durationSec != null) {
        return `${exercise.rounds} x ${exercise.durationSec}s${exercise.restSec > 0 ? ` / ${exercise.restSec}s easy` : ''}`;
    }
    if (exercise.reps != null) {
        return `${exercise.rounds} x ${exercise.reps}`;
    }
    return `${prescription.rounds} rounds`;
}

function mapConditioningLoadingStrategy(
    prescription: ConditioningPrescription,
    exercise: ConditioningPrescription['exercises'][number],
): SectionExercisePrescription['loadingStrategy'] {
    const format = exercise.timedWork?.format ?? prescription.timedWork?.format ?? prescription.format;
    switch (format) {
        case 'emom':
            return 'emom';
        case 'amrap':
            return 'amrap';
        case 'tabata':
            return 'tabata';
        case 'for_time':
            return 'for_time';
        default:
            return prescription.circuitRound ? 'circuit_rounds' : 'intervals';
    }
}

function getConditioningSessionIndex(trainingDate?: string): number {
    if (!trainingDate) return 0;
    const parsed = Date.parse(`${trainingDate}T00:00:00Z`);
    if (Number.isNaN(parsed)) return 0;
    return Math.floor(parsed / 86400000);
}

function focusToDoseBucket(focus: WorkoutFocus): WorkoutDoseBucket {
    if (focus === 'conditioning') return 'conditioning';
    if (focus === 'recovery') return 'recovery';
    return 'strength';
}

function normalizeSessionModules(input: {
    focus: WorkoutFocus;
    sessionModules?: SessionModulePlan[] | null;
}): SessionModulePlan[] {
    if (input.sessionModules?.length) {
        return input.sessionModules.map((module) => ({
            preserveOnYellow: true,
            ...module,
        }));
    }

    return [{
        bucket: focusToDoseBucket(input.focus),
        focus: input.focus,
        preserveOnYellow: true,
    }];
}

function estimateSectionMinutes(section: WorkoutSessionSection): number {
    if (section.timeCap > 0) return section.timeCap;
    return Math.max(4, section.exercises.length * 4);
}

function clampModuleDuration(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
}

function buildSecondaryConditioningSection(input: {
    phase: Phase;
    fitnessLevel: FitnessLevel;
    readinessState: ReadinessState;
    readinessProfile?: ReadinessProfile | null;
    constraintSet: StimulusConstraintSet;
    acwr: number;
    trainingIntensityCap?: number;
    availableMinutes?: number;
    campPhaseContext: CampPhase | null;
    performanceRisk: PerformanceRiskState;
    blockContext: TrainingBlockContext | null;
    medStatus?: MEDStatus | null;
}): WorkoutSessionSection | null {
    const {
        phase,
        fitnessLevel,
        readinessState,
        readinessProfile,
        constraintSet,
        acwr,
        trainingIntensityCap,
        availableMinutes,
        campPhaseContext,
        performanceRisk,
        blockContext,
        medStatus,
    } = input;

    if (performanceRisk.level === 'orange' || performanceRisk.level === 'red') {
        return null;
    }

    const minimumDuration = performanceRisk.level === 'yellow' ? 12 : 16;
    const maximumDuration = performanceRisk.level === 'yellow' ? 16 : 24;
    const targetDuration = clampModuleDuration(
        availableMinutes ?? (performanceRisk.level === 'yellow' ? 14 : 18),
        minimumDuration,
        maximumDuration,
    );

    const prescription = prescribeConditioning({
        phase,
        fitnessLevel,
        readinessState,
        readinessProfile,
        constraintSet,
        acwr,
        sessionIndex: 0,
        activeCutPlan: null,
        trainingIntensityCap,
    });

    const addonWorkout = buildConditioningWorkoutV2({
        prescription: {
            ...prescription,
            totalDurationMin: Math.min(targetDuration, prescription.totalDurationMin),
        },
        campPhaseContext,
        availableMinutes: targetDuration,
        readinessProfile,
        constraintSet,
        performanceRisk,
        blockContext,
        medStatus,
    });

    const section = addonWorkout.sections?.[0];
    if (!section) return null;

    const sectionId = 'conditioning-finisher-1';
    return {
        ...section,
        id: sectionId,
        template: 'finisher',
        title: 'Conditioning Block',
        intent: 'Preserve the weekly conditioning touch without splitting the day into a second guided session.',
        timeCap: targetDuration,
        densityRule: 'Short dedicated engine block',
        finisherReason: 'Included to protect the weekly conditioning floor inside a combined training block.',
        exercises: section.exercises.map((exercise) => ({
            ...exercise,
            sectionId,
            sectionTemplate: 'finisher',
            sectionIntent: 'Preserve the weekly conditioning touch without splitting the day into a second guided session.',
        })),
    };
}

function buildDoseOutputs(input: {
    modules: SessionModulePlan[];
    focus: WorkoutFocus;
    sections: WorkoutSessionSection[];
    performanceRisk: PerformanceRiskState;
    estimatedDuration: number;
}): {
    plannedBucket: WorkoutDoseBucket | null;
    realizedBucket: WorkoutDoseBucket | null;
    secondaryAdaptations: WorkoutDoseBucket[];
    moduleBlocks: WorkoutModuleBlock[];
    doseCredits: WorkoutDoseCredit[];
} {
    const { modules, focus, sections, performanceRisk, estimatedDuration } = input;
    const primaryModule = modules[0] ?? null;
    const durabilityMinutes = sections
        .filter((section) => section.template === 'durability')
        .reduce((sum, section) => sum + estimateSectionMinutes(section), 0);
    const conditioningMinutes = sections
        .filter((section) => section.template === 'finisher' || (focus === 'conditioning' && section.template === 'main_strength'))
        .reduce((sum, section) => sum + estimateSectionMinutes(section), 0);

    const moduleBlocks: WorkoutModuleBlock[] = modules.map((module, index) => {
        const bucket = module.bucket;
        const durationMin = bucket === 'conditioning'
            ? conditioningMinutes || (module.durationMin ?? estimatedDuration)
            : bucket === 'durability'
                ? durabilityMinutes || (module.durationMin ?? 10)
                : index === 0
                    ? Math.max(estimatedDuration - conditioningMinutes, module.durationMin ?? 0)
                    : (module.durationMin ?? 0);
        const countedTowardDose = bucket === 'conditioning'
            ? conditioningMinutes >= 12 || focus === 'conditioning'
            : bucket === 'durability'
                ? durabilityMinutes >= 8
                : bucket === 'strength'
                    ? focus !== 'recovery' && focus !== 'conditioning'
                    : focus === 'recovery';

        return {
            bucket,
            title: bucket === 'conditioning'
                ? 'Conditioning'
                : bucket === 'durability'
                    ? 'Durability'
                    : bucket === 'recovery'
                        ? 'Recovery'
                        : 'Strength',
            focus: module.focus ?? null,
            durationMin: Math.max(0, durationMin),
            countedTowardDose,
        };
    });

    const doseCredits: WorkoutDoseCredit[] = moduleBlocks
        .filter((block) => block.countedTowardDose)
        .map((block) => ({
            bucket: block.bucket,
            credit: 1,
            preservedBySubstitution: Boolean(
                performanceRisk.level === 'yellow'
                && modules.some((module) => module.bucket === block.bucket && module.preserveOnYellow !== false),
            ),
            reason: block.bucket === 'conditioning'
                ? 'Dedicated conditioning work was kept inside the session.'
                : block.bucket === 'durability'
                    ? 'Durability work cleared its minimum support threshold.'
                    : block.bucket === 'recovery'
                        ? 'The day resolved as recovery.'
                        : 'Strength work remained in the session.',
        }));

    const plannedBucket = primaryModule?.bucket ?? null;
    const realizedBuckets = doseCredits.map((credit) => credit.bucket);
    return {
        plannedBucket,
        realizedBucket: realizedBuckets[0] ?? plannedBucket,
        secondaryAdaptations: realizedBuckets.filter((bucket) => bucket !== plannedBucket),
        moduleBlocks,
        doseCredits,
    };
}

function buildConditioningWorkoutV2(input: {
    prescription: ConditioningPrescription;
    campPhaseContext: CampPhase | null;
    availableMinutes?: number;
    gymEquipment?: EquipmentItem[];
    readinessProfile?: ReadinessProfile | null;
    constraintSet: StimulusConstraintSet;
    performanceRisk: PerformanceRiskState;
    blockContext: TrainingBlockContext | null;
    medStatus?: MEDStatus | null;
}): WorkoutPrescriptionV2 {
    const {
        prescription,
        campPhaseContext,
        availableMinutes,
        gymEquipment,
        readinessProfile,
        constraintSet,
        performanceRisk,
        blockContext,
        medStatus,
    } = input;

    const sectionId = 'conditioning-main-1';
    const conditioningTypeLabel = getConditioningTypeLabel(prescription.type);
    const targetRPE = prescription.intensityLabel === 'light' ? 5 : prescription.intensityLabel === 'moderate' ? 6 : 8;

    const exercises: SectionExercisePrescription[] = prescription.exercises.map((exercise, index) => {
        const preferredExercise: ExerciseLibraryRow = {
            id: exercise.exerciseId ?? `conditioning-${prescription.type}-${index + 1}`,
            name: exercise.name,
            type: resolveConditioningExerciseType(prescription.type),
            cns_load: prescription.cnsBudget,
            muscle_group: 'full_body',
            equipment: resolveConditioningEquipment(prescription.type),
            description: `${conditioningTypeLabel} prescription.`,
            cues: 'Stay on the prescribed pace and keep technique crisp.',
            sport_tags: prescription.type === 'heavy_bag_rounds' || prescription.type === 'sport_specific_drill'
                ? ['boxing']
                : ['general'],
        };
        const timedWork = exercise.timedWork ?? (index === 0 ? prescription.timedWork : undefined);
        const setCount = prescription.circuitRound
            ? prescription.circuitRound.roundCount
            : Math.max(1, exercise.rounds || prescription.rounds);
        const restSeconds = prescription.circuitRound
            ? prescription.circuitRound.restBetweenRoundsSec
            : timedWork?.restIntervalSec ?? exercise.restSec ?? prescription.restIntervalSec;
        const setPrescription = [{
            label: prescription.circuitRound
                ? 'Circuit rounds'
                : timedWork
                    ? conditioningTypeLabel
                    : 'Conditioning work',
            sets: setCount,
            reps: exercise.reps ?? (exercise.durationSec != null ? `${exercise.durationSec}s` : 'task'),
            targetRPE,
            restSeconds,
            timedWork,
            circuitRound: index === 0 ? prescription.circuitRound : undefined,
        }];

        return {
            exercise: preferredExercise,
            preferredExercise,
            targetSets: setCount,
            targetReps: exercise.reps ?? 1,
            targetRPE,
            supersetGroup: null,
            score: 90 - (index * 2),
            recoveryCost: prescription.cnsBudget,
            restSeconds,
            formCues: preferredExercise.cues,
            isSubstitute: false,
            role: 'anchor',
            loadingStrategy: mapConditioningLoadingStrategy(prescription, exercise),
            progressionAnchor: null,
            substitutions: [],
            coachingCues: ['Stay on the prescribed pace.', 'End the set if mechanics slip.'],
            fatigueCost: prescription.intensityLabel === 'hard' ? 'high' : prescription.intensityLabel === 'moderate' ? 'moderate' : 'low',
            setScheme: buildConditioningSetScheme(prescription, exercise),
            loadingNotes: prescription.message,
            setPrescription,
            sectionId,
            sectionTemplate: 'main_strength',
            sectionIntent: prescription.message,
        };
    });

    const sections: WorkoutSessionSection[] = [{
        id: sectionId,
        template: 'main_strength',
        title: conditioningTypeLabel,
        intent: prescription.message,
        timeCap: availableMinutes != null ? Math.min(availableMinutes, prescription.totalDurationMin) : prescription.totalDurationMin,
        restRule: 'Respect the work-to-rest structure exactly.',
        densityRule: prescription.circuitRound ? 'Round-based conditioning block' : prescription.format ? `${prescription.format} structure` : 'Conditioning intervals',
        exercises,
        decisionTrace: [
            'template:main_strength',
            'focus:conditioning',
            `conditioning_type:${prescription.type}`,
            `conditioning_format:${prescription.format ?? 'rounds'}`,
        ],
        finisherReason: null,
    }];

    const estimatedDuration = availableMinutes != null
        ? Math.min(availableMinutes, prescription.totalDurationMin)
        : prescription.totalDurationMin;

    return {
        focus: 'conditioning',
        workoutType: 'conditioning',
        exercises,
        payloadVersion: 'v3',
        sessionComposition: [{ bucket: 'conditioning', focus: 'conditioning', durationMin: estimatedDuration, preserveOnYellow: true }],
        secondaryAdaptations: [],
        plannedBucket: 'conditioning',
        realizedBucket: 'conditioning',
        moduleBlocks: [{
            bucket: 'conditioning',
            title: 'Conditioning',
            focus: 'conditioning',
            durationMin: estimatedDuration,
            countedTowardDose: true,
        }],
        doseCredits: [{
            bucket: 'conditioning',
            credit: 1,
            preservedBySubstitution: false,
            reason: 'Dedicated conditioning session.',
        }],
        totalCNSBudget: Math.max(prescription.cnsBudget, 15),
        usedCNS: prescription.cnsBudget,
        message: prescription.message,
        estimatedDurationMin: estimatedDuration,
        isDeloadWorkout: false,
        equipmentProfile: gymEquipment ? 'custom' : null,
        campPhaseContext,
        weeklyPlanDay: null,
        sparringDayGuidance: null,
        sessionTemplate: sections.map((section) => section.template),
        sessionGoal: `Build repeatable conditioning through ${conditioningTypeLabel.toLowerCase()}.`,
        sections,
        sessionIntent: `Build conditioning through ${conditioningTypeLabel.toLowerCase()} with a ${prescription.intensityLabel} output target.${availableMinutes ? ` Keep the work inside ${availableMinutes} minutes.` : ''}`,
        primaryAdaptation: 'conditioning',
        performanceRisk,
        readinessProfile: readinessProfile ?? null,
        constraintSet,
        medStatus: medStatus ?? null,
        blockContext,
        decisionTrace: [
            'focus:conditioning',
            `conditioning_type:${prescription.type}`,
            `conditioning_format:${prescription.format ?? 'rounds'}`,
        ],
        expectedActivationRPE: null,
        activationGuidance: null,
        interferenceWarnings: [],
    };
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
        trainingAge,
        complianceHistory28d,
        availableMinutes,
        gymEquipment,
        exerciseHistory,
        scDayCount = 4,
        recentFocuses7d = [],
        isDeloadWeek = false,
        weeklyPlanFocus,
        sparringDaysThisWeek,
        isSparringDay = false,
        progressionModel: inputProgressionModel,
        performanceGoalType,
        performanceRisk,
        blockContext,
        readinessProfile,
        constraintSet,
        medStatus = null,
        sessionFamily = null,
        sessionModules = null,
    } = input;
    const resolvedPerformanceGoalType = performanceGoalType ?? 'conditioning';

    const resolvedConstraintSet = constraintSet ?? deriveStimulusConstraintSet(
        readinessProfile ?? {
            neuralReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 62 : 34,
            structuralReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 60 : 38,
            metabolicReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 58 : 36,
            overallReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 60 : 36,
            trend: 'stable',
            dataConfidence: 'low',
            dataSufficiency: 'insufficient',
            cardioModifier: 1,
            proteinModifier: 1,
            flags: [],
            performanceAnchors: [],
            readinessState,
        },
        {
            phase,
            daysOut: null,
            isSparringDay,
            isDeloadWeek,
            trainingIntensityCap,
        },
    );

    // Sparring day: return activation-only workout
    if (isSparringDay) {
        return buildSparringDayWorkout(
            exerciseLibrary,
            gymEquipment,
            phase,
            readinessProfile ?? null,
            resolvedConstraintSet,
            medStatus,
            sessionFamily,
        );
    }

    const dayOfWeek = resolveDayOfWeek(trainingDate);

    // Use weekly plan focus if provided, otherwise determine from day
    const focusOverride = weeklyPlanFocus ?? overrideFocus;
    const exerciseUsageSummary = buildExerciseUsageSummary(exerciseHistory, exerciseLibrary, trainingDate);

    // Weight cut fight week (cap <= 4): force recovery
    const effectiveFocus = (trainingIntensityCap != null && trainingIntensityCap <= 4 && resolvedConstraintSet.strengthBudget < 50)
        ? 'recovery' as WorkoutFocus
        : determineFocus(
            dayOfWeek,
            readinessState,
            phase,
            focusOverride,
            resolvedConstraintSet,
            resolvedPerformanceGoalType,
            scDayCount,
            recentFocuses7d,
        );
    const resolvedSessionModules = normalizeSessionModules({
        focus: effectiveFocus,
        sessionModules,
    });

    const resolvedPerformanceRisk = performanceRisk ?? assessPerformanceRisk({
        readinessState,
        readinessProfile,
        constraintSet: resolvedConstraintSet,
        acwr,
        isDeloadWeek,
        trainingIntensityCap,
        isSparringDay,
    });
    const resolvedBlockContext = blockContext ?? null;

    // Scale CNS budget
    const calibratedBaseBudget = getCalibratedCNSBudget({
        readinessState,
        trainingAge: resolveTrainingAge(fitnessLevel, trainingAge),
        complianceHistory28d,
    });
    let baseCNSBudget = calibratedBaseBudget;
    if (trainingIntensityCap != null) {
        baseCNSBudget = Math.round(baseCNSBudget * (trainingIntensityCap / 10));
    }
    // Auto-taper CNS for sparring frequency
    if (sparringDaysThisWeek && sparringDaysThisWeek >= 2) {
        const taperMult = Math.max(0.75, 1.0 - (sparringDaysThisWeek - 1) * 0.175);
        baseCNSBudget = Math.round(baseCNSBudget * taperMult);
    }
    if (resolvedBlockContext) {
        baseCNSBudget = Math.round(baseCNSBudget * resolvedBlockContext.volumeMultiplier);
    }
    baseCNSBudget = Math.round(baseCNSBudget * resolvedConstraintSet.volumeMultiplier);
    const rawCNSBudget = baseCNSBudget * resolvedPerformanceRisk.cnsMultiplier;
    const minimumFloor = readinessState === 'Depleted' ? 0.65 : 0.75;
    const minimumBudget = Math.max(12, Math.round(calibratedBaseBudget * minimumFloor));
    const flooredBudget = Math.max(rawCNSBudget, minimumBudget);
    const totalCNSBudget = Math.max(15, Math.round(flooredBudget));

    // Deload: reduce exercise count and intensity
    const baseExerciseCount = EXERCISE_COUNT[readinessState];
    let targetExerciseCount = isDeloadWeek
        ? Math.max(3, baseExerciseCount - 1)
        : baseExerciseCount;
    if (resolvedPerformanceRisk.level === 'yellow') {
        targetExerciseCount = Math.max(3, targetExerciseCount - 1);
    } else if (resolvedPerformanceRisk.level === 'orange') {
        targetExerciseCount = Math.max(4, targetExerciseCount - 1);
    } else if (resolvedPerformanceRisk.level === 'red') {
        targetExerciseCount = Math.min(3, targetExerciseCount);
    }

    const rpeCap = Math.min(
        trainingIntensityCap ?? (isDeloadWeek ? 5 : 10),
        resolvedPerformanceRisk.intensityCap,
    );

    const workoutType = effectiveFocus === 'recovery' ? 'recovery' as const
        : effectiveFocus === 'conditioning' ? 'conditioning' as const
            : effectiveFocus === 'sport_specific' ? 'practice' as const
                : 'strength' as const;

    let campPhaseContext: CampPhase | null = null;
    if (phase.startsWith('camp-')) {
        campPhaseContext = phase.replace('camp-', '') as CampPhase;
    }

    if (effectiveFocus === 'conditioning') {
        const conditioningPrescription = prescribeConditioning({
            phase,
            fitnessLevel,
            readinessState,
            readinessProfile,
            constraintSet: resolvedConstraintSet,
            acwr,
            sessionIndex: getConditioningSessionIndex(trainingDate),
            activeCutPlan: null,
            trainingIntensityCap,
        });

        return buildConditioningWorkoutV2({
            prescription: conditioningPrescription,
            campPhaseContext,
            availableMinutes,
            gymEquipment,
            readinessProfile: readinessProfile ?? null,
            constraintSet: resolvedConstraintSet,
            performanceRisk: resolvedPerformanceRisk,
            blockContext: resolvedBlockContext,
            medStatus,
        });
    }

    const usableExercises = filterByEquipment(exerciseLibrary, gymEquipment);
    const scored = usableExercises.map(exercise => ({
        exercise,
        ...scoreExerciseCandidate(exercise, scoreExerciseForUser(exercise, {
            readinessState,
            readinessProfile,
            constraintSet: resolvedConstraintSet,
            phase,
            acwr,
            recentExerciseIds,
            recentMuscleVolume,
            cnsBudgetRemaining: totalCNSBudget,
            fitnessLevel,
            performanceGoalType: resolvedPerformanceGoalType,
            performanceRiskLevel: resolvedPerformanceRisk.level,
            allowHighImpact: resolvedPerformanceRisk.allowHighImpact,
            blockPhase: resolvedBlockContext?.phase,
            recoveryBudget: totalCNSBudget,
            exerciseUsageSummary,
        }), {
            readinessState,
            readinessProfile,
            constraintSet: resolvedConstraintSet,
            phase,
            acwr,
            recentExerciseIds,
            recentMuscleVolume,
            cnsBudgetRemaining: totalCNSBudget,
            fitnessLevel,
            performanceGoalType: resolvedPerformanceGoalType,
            performanceRiskLevel: resolvedPerformanceRisk.level,
            allowHighImpact: resolvedPerformanceRisk.allowHighImpact,
            blockPhase: resolvedBlockContext?.phase,
            recoveryBudget: totalCNSBudget,
            exerciseUsageSummary,
        }),
    }))
        .filter(item => item.fitScore > 0 && item.exercise.cns_load <= totalCNSBudget)
        .map(item => ({ ...item, score: item.fitScore }))
        .sort((a, b) => b.score - a.score);

    const sectionedSession = buildSectionedWorkoutSession({
        focus: effectiveFocus,
        scoredExercises: scored,
        usableExerciseLibrary: usableExercises,
        readinessState,
        rpeCap,
        performanceRisk: resolvedPerformanceRisk,
        performanceGoalType: resolvedPerformanceGoalType,
        blockContext: resolvedBlockContext,
        availableMinutes,
        fitnessLevel,
        exerciseHistory,
        progressionModel: inputProgressionModel,
        isDeloadWeek,
        targetExerciseCount,
        recoveryBudget: totalCNSBudget,
        trainingDate,
    });

    const finalExercises: SectionExercisePrescription[] = sectionedSession.exercises.map((exercise) => ({
        ...exercise,
        recoveryCost: getExerciseRecoveryCost(exercise.exercise),
    }));
    let sections = [...sectionedSession.sections];
    let exercises: SectionExercisePrescription[] = [...finalExercises];
    let estimatedDuration = sectionedSession.estimatedDuration || estimateWorkoutTime(finalExercises);
    const conditioningSecondary = resolvedSessionModules.find((module, index) =>
        index > 0 && module.bucket === 'conditioning',
    ) ?? null;
    if (conditioningSecondary) {
        const addonSection = buildSecondaryConditioningSection({
            phase,
            fitnessLevel,
            readinessState,
            readinessProfile,
            constraintSet: resolvedConstraintSet,
            acwr,
            trainingIntensityCap: trainingIntensityCap ?? undefined,
            availableMinutes: conditioningSecondary.durationMin
                ?? Math.max(14, (availableMinutes ?? (estimatedDuration + 18)) - estimatedDuration),
            campPhaseContext,
            performanceRisk: resolvedPerformanceRisk,
            blockContext: resolvedBlockContext,
            medStatus,
        });
        if (addonSection) {
            sections.push(addonSection);
            exercises = sections.flatMap((section) => section.exercises);
            estimatedDuration += addonSection.timeCap;
        }
    }
    const resolvedSessionFamily = resolveSessionFamily(effectiveFocus, sessionFamily);
    const primaryAdaptation = resolvePrimaryAdaptation(effectiveFocus, resolvedPerformanceGoalType);
    const sessionGoal = sectionedSession.sessionGoal;
    const sessionIntent = buildSessionIntent({
        focus: effectiveFocus,
        primaryAdaptation,
        performanceGoalType: resolvedPerformanceGoalType,
        performanceRisk: resolvedPerformanceRisk,
        blockContext: resolvedBlockContext,
        availableMinutes,
    });
    const doseOutputs = buildDoseOutputs({
        modules: resolvedSessionModules,
        focus: effectiveFocus,
        sections,
        performanceRisk: resolvedPerformanceRisk,
        estimatedDuration,
    });
    const decisionTrace = [
        `focus:${effectiveFocus}`,
        `goal:${resolvedPerformanceGoalType}`,
        `risk:${resolvedPerformanceRisk.level}`,
        ...(resolvedBlockContext ? [`block:${resolvedBlockContext.phase}`] : []),
        `sections:${sections.map(section => section.template).join('|')}`,
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
        message = `Low-readiness day. Training intent stays alive, but the stimulus has been substituted to fit today's constraints.`;
    } else if (readinessState === 'Caution') {
        message = `Moderate ${focusLabel} session. Stimulus is adjusted to protect the wrong stress while keeping productive work in.`;
    } else {
        message = `${capitalize(focusLabel)} day. You're in Prime shape — go after it.`;
    }

    if (availableMinutes) {
        message += ` ${exercises.length} exercises, ~${estimatedDuration} min.`;
    }

    return {
        focus: effectiveFocus,
        workoutType,
        exercises,
        payloadVersion: 'v3',
        sessionFamily: resolvedSessionFamily,
        sessionComposition: resolvedSessionModules,
        secondaryAdaptations: doseOutputs.secondaryAdaptations,
        plannedBucket: doseOutputs.plannedBucket,
        realizedBucket: doseOutputs.realizedBucket,
        moduleBlocks: doseOutputs.moduleBlocks,
        doseCredits: doseOutputs.doseCredits,
        totalCNSBudget,
        usedCNS: sections.reduce(
            (sum, section) => sum + section.exercises.reduce((sectionSum, exercise) => sectionSum + exercise.exercise.cns_load, 0),
            0,
        ),
        message,
        estimatedDurationMin: estimatedDuration,
        isDeloadWorkout: isDeloadWeek,
        equipmentProfile: gymEquipment ? 'custom' : null,
        campPhaseContext,
        weeklyPlanDay: null,
        sparringDayGuidance: null,
        sessionTemplate: sections.map(section => section.template),
        sessionGoal,
        sections,
        sessionIntent,
        primaryAdaptation,
        performanceRisk: resolvedPerformanceRisk,
        readinessProfile: readinessProfile ?? null,
        constraintSet: resolvedConstraintSet,
        medStatus,
        blockContext: resolvedBlockContext,
        decisionTrace,
        expectedActivationRPE: 4,
        activationGuidance: 'Log the activation block before main work. If it feels 2+ RPE above plan, the session should downshift.',
        interferenceWarnings: [],
    };
}

function focusBlockedByConstraints(
    focus: WorkoutFocus,
    constraintSet?: StimulusConstraintSet | null,
): boolean {
    if (!constraintSet) return false;

    if (focus === 'conditioning') {
        return constraintSet.blockedStimuli.includes('glycolytic_conditioning')
            && constraintSet.blockedStimuli.includes('tempo_conditioning')
            && constraintSet.aerobicBudget < 40;
    }

    if (focus === 'sport_specific') {
        return constraintSet.blockedStimuli.includes('hard_sparring')
            && constraintSet.blockedStimuli.includes('high_impact')
            && constraintSet.explosiveBudget < 40;
    }

    if (focus === 'lower' || focus === 'upper_push' || focus === 'upper_pull' || focus === 'full_body') {
        return constraintSet.blockedStimuli.includes('heavy_strength')
            && constraintSet.blockedStimuli.includes('controlled_strength')
            && constraintSet.strengthBudget < 40;
    }

    return false;
}

function resolveFocusFromConstraints(
    focus: WorkoutFocus,
    constraintSet?: StimulusConstraintSet | null,
): WorkoutFocus {
    if (!constraintSet) return focus;
    if (!focusBlockedByConstraints(focus, constraintSet)) return focus;

    if (constraintSet.strengthBudget >= 50 && !constraintSet.blockedStimuli.includes('controlled_strength')) {
        return focus === 'conditioning' ? 'full_body' : focus;
    }

    if (constraintSet.aerobicBudget >= 48 && !constraintSet.blockedStimuli.includes('aerobic_conditioning')) {
        return 'conditioning';
    }

    return 'recovery';
}

function getExerciseStimuli(exercise: ExerciseLibraryRow): StimulusType[] {
    const stimuli: StimulusType[] = [];
    const name = exercise.name.toLowerCase();

    if (exercise.type === 'power') {
        stimuli.push('max_velocity');
        if (name.includes('jump') || name.includes('bound') || name.includes('plyo')) {
            stimuli.push('plyometric', 'high_impact');
        }
    }

    if (exercise.type === 'heavy_lift') {
        if (exercise.equipment === 'machine') {
            stimuli.push('machine_strength', 'controlled_strength');
        } else if (exercise.cns_load >= 7) {
            stimuli.push('heavy_strength');
        } else {
            stimuli.push('controlled_strength');
        }
        if (name.includes('split squat') || name.includes('lunge') || name.includes('single')) {
            stimuli.push('controlled_strength');
        }
    }

    if (exercise.type === 'conditioning') {
        if (exercise.cns_load >= 6 || name.includes('sprint') || name.includes('bag')) {
            stimuli.push('glycolytic_conditioning');
        } else if (exercise.cns_load >= 4) {
            stimuli.push('tempo_conditioning');
        } else {
            stimuli.push('aerobic_conditioning');
        }
    }

    if (exercise.type === 'sport_specific') {
        stimuli.push('technical_skill');
        if (exercise.cns_load >= 6) {
            stimuli.push('hard_sparring', 'high_impact');
        }
    }

    if (exercise.type === 'mobility' || exercise.type === 'active_recovery') {
        stimuli.push('recovery');
    }

    return stimuli.length > 0 ? stimuli : ['recovery'];
}

/**
 * Build an activation-only workout for sparring days.
 */
function buildSparringDayWorkout(
    library: ExerciseLibraryRow[],
    gymEquipment?: EquipmentItem[],
    phase?: Phase,
    readinessProfile?: ReadinessProfile | null,
    constraintSet?: StimulusConstraintSet | null,
    medStatus?: MEDStatus | null,
    sessionFamily?: GenerateWorkoutInputV2['sessionFamily'],
): WorkoutPrescriptionV2 {
    let exercises = library.filter(e =>
        e.type === 'mobility' || e.type === 'active_recovery' ||
        (e.type === 'sport_specific' && e.cns_load <= 3)
    );
    exercises = filterByEquipment(exercises, gymEquipment);

    const selected = exercises.slice(0, 5);
    const setTargets = [2, 2, 2, 2, 3];
    const supportExercises: NonNullable<WorkoutPrescriptionV2['sections']>[number]['exercises'] = selected.map((exercise, index) => {
        const sets = setTargets[index] ?? 2;
        const sectionTemplate = index < 2 ? 'activation' : index < 4 ? 'durability' : 'cooldown';
        const sectionIntent = sectionTemplate === 'activation'
            ? 'Prime rhythm and mobility without adding fatigue.'
            : sectionTemplate === 'durability'
                ? 'Build trunk, hip, and shoulder readiness that supports the ring without draining it.'
                : 'Downshift and recover for sparring.';

        return {
            exercise,
            targetSets: sets,
            targetReps: exercise.type === 'sport_specific' ? 1 : 8,
            targetRPE: 3,
            supersetGroup: null,
            score: 50,
            restSeconds: 30,
            formCues: exercise.cues || undefined,
            role: sectionTemplate === 'activation' ? 'prep' : 'recovery',
            loadingStrategy: 'recovery_flow',
            progressionAnchor: null,
            preferredExercise: exercise,
            substitutions: [],
            coachingCues: exercise.cues ? [exercise.cues] : ['Stay easy and leave the session fresh.'],
            fatigueCost: 'low',
            setScheme: exercise.type === 'sport_specific'
                ? `${sets} x 1 easy rounds`
                : `${sets} x 8 smooth reps`,
            loadingNotes: 'Keep the session restorative so sparring gets your best energy.',
            setPrescription: [{
                label: sectionTemplate === 'activation' ? 'Prep' : sectionTemplate === 'durability' ? 'Support' : 'Recovery',
                sets,
                reps: exercise.type === 'sport_specific' ? '1 round' : 8,
                targetRPE: 3,
                restSeconds: 30,
            }],
            sectionId: sectionTemplate === 'activation' ? 'activation-1' : sectionTemplate === 'durability' ? 'durability-1' : 'cooldown-1',
            sectionTemplate,
            sectionIntent,
        };
    });

    const sections: NonNullable<WorkoutPrescriptionV2['sections']> = [
        {
            id: 'activation-1',
            template: 'activation' as const,
            title: 'Activation',
            intent: 'Prime rhythm and mobility without adding fatigue.',
            timeCap: 6,
            restRule: 'Keep it easy and controlled.',
            densityRule: '2 easy rounds',
            exercises: supportExercises.filter((exercise) => exercise.sectionTemplate === 'activation'),
            decisionTrace: ['template:activation', 'sparring day support'],
            finisherReason: null,
        },
        {
            id: 'durability-1',
            template: 'durability' as const,
            title: 'Support Circuit',
            intent: 'Build trunk, hip, and shoulder readiness that supports the ring without draining it.',
            timeCap: 8,
            restRule: 'Stay smooth and stop well short of fatigue.',
            densityRule: 'Controlled support circuit',
            exercises: supportExercises.filter((exercise) => exercise.sectionTemplate === 'durability'),
            decisionTrace: ['template:durability', 'sparring day support'],
            finisherReason: null,
        },
        {
            id: 'cooldown-1',
            template: 'cooldown' as const,
            title: 'Cooldown',
            intent: 'Downshift and recover for sparring.',
            timeCap: 4,
            restRule: 'Continuous easy flow.',
            densityRule: '1 easy round',
            exercises: supportExercises.filter((exercise) => exercise.sectionTemplate === 'cooldown'),
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
        exercises: supportExercises,
        payloadVersion: 'v3',
        sessionFamily: sessionFamily ?? 'durability_core',
        sessionComposition: [{ bucket: 'durability', focus: 'sport_specific', durationMin: 16, preserveOnYellow: true }],
        secondaryAdaptations: ['durability'],
        plannedBucket: 'durability',
        realizedBucket: 'durability',
        moduleBlocks: [{
            bucket: 'durability',
            title: 'Spar Support',
            focus: 'sport_specific',
            durationMin: Math.max(15, Math.min(20, estimateWorkoutTime(supportExercises))),
            countedTowardDose: true,
        }],
        doseCredits: [{
            bucket: 'durability',
            credit: 1,
            preservedBySubstitution: true,
            reason: 'Sparring-day support kept the durability touch alive.',
        }],
        totalCNSBudget: 22,
        usedCNS: supportExercises.reduce((sum, e) => sum + e.exercise.cns_load, 0),
        message: 'Sparring day - low-cost support work only. Prime positions, trunk, and breathing without draining the ring session.',
        estimatedDurationMin: Math.max(15, Math.min(20, estimateWorkoutTime(supportExercises))),
        isDeloadWorkout: false,
        equipmentProfile: gymEquipment ? 'custom' : null,
        campPhaseContext,
        weeklyPlanDay: null,
        sparringDayGuidance: null,
        sessionTemplate: sections.map(section => section.template),
        sessionGoal: 'Support sparring readiness with low-cost prep, support, and recovery work.',
        sections,
        sessionIntent: 'Support sparring with low-cost prep, trunk support, and recovery only.',
        primaryAdaptation: 'recovery',
        performanceRisk: null,
        readinessProfile: readinessProfile ?? null,
        constraintSet: constraintSet ?? null,
        medStatus: medStatus ?? null,
        blockContext: null,
        decisionTrace: ['focus:recovery', 'sparring day support'],
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


