/**
 * calculateWarmup.ts
 *
 * Warmup set calculator for guided workout sessions.
 * Generates progressive warmup ramps based on working weight,
 * equipment type, and whether the muscle group is already warm.
 *
 * Functions:
 *   1. generateWarmupSets — creates a warmup ramp for a given exercise
 *
 * @ANTI-WIRING:
 * All functions are pure and synchronous. No database queries. No LLM generation.
 */

import {
    WarmupSet,
    WarmupInput,
    WarmupResult,
    ExerciseType,
    Equipment,
} from './types';

// ─── Constants ───────────────────────────────────────────────

/** Minimum barbell weight (empty bar). */
const BAR_WEIGHT = 45;

/** Minimum dumbbell weight. */
const MIN_DUMBBELL = 5;

/** Common kettlebell weights (lbs). */
const KB_WEIGHTS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100];

/** Estimated time per warmup set (minutes). */
const TIME_PER_SET = 1.5;

/** Exercise types that get minimal warmup. */
const MINIMAL_WARMUP_TYPES: ExerciseType[] = [
    'mobility', 'active_recovery', 'conditioning', 'sport_specific',
];

// ─── Helpers ─────────────────────────────────────────────────

/** Round to nearest 5 lbs. */
function roundTo5(n: number): number {
    return Math.round(n / 5) * 5;
}

/** Find the closest kettlebell weight at or below the target. */
function nearestKBWeight(target: number): number {
    let closest = KB_WEIGHTS[0];
    for (const w of KB_WEIGHTS) {
        if (w <= target) closest = w;
        else break;
    }
    return closest;
}

// ─── generateWarmupSets ──────────────────────────────────────

/**
 * Generates a progressive warmup ramp for an exercise.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - workingWeight: number (the target working set weight in lbs)
 *   - exerciseType: ExerciseType (determines warmup depth)
 *   - equipment: Equipment (determines rounding and min weights)
 *   - isFirstExerciseForMuscle: boolean (full warmup vs abbreviated)
 *   - fitnessLevel: FitnessLevel (unused for now, reserved for future scaling)
 *
 * Returns: WarmupResult
 *   - sets: WarmupSet[] (the warmup ramp)
 *   - totalWarmupSets: number
 *   - estimatedTimeMinutes: number
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function generateWarmupSets(input: WarmupInput): WarmupResult {
    const { workingWeight, exerciseType, equipment, isFirstExerciseForMuscle } = input;

    // Minimal warmup for non-strength exercises
    if (MINIMAL_WARMUP_TYPES.includes(exerciseType)) {
        const sets: WarmupSet[] = [{
            setNumber: 1,
            weight: 0,
            reps: 10,
            label: 'Activation',
            isCompleted: false,
        }];
        return {
            sets,
            totalWarmupSets: 1,
            estimatedTimeMinutes: TIME_PER_SET,
        };
    }

    // Bodyweight exercises: 1 activation set
    if (equipment === 'bodyweight' || workingWeight <= 0) {
        const sets: WarmupSet[] = [{
            setNumber: 1,
            weight: 0,
            reps: 8,
            label: 'Bodyweight',
            isCompleted: false,
        }];
        return {
            sets,
            totalWarmupSets: 1,
            estimatedTimeMinutes: TIME_PER_SET,
        };
    }

    // Already warm muscle: abbreviated warmup
    if (!isFirstExerciseForMuscle) {
        return buildAbbreviatedWarmup(workingWeight, equipment);
    }

    // Full warmup ramp by equipment type
    switch (equipment) {
        case 'barbell':
            return buildBarbellWarmup(workingWeight);
        case 'dumbbell':
            return buildDumbbellWarmup(workingWeight);
        case 'kettlebell':
            return buildKettlebellWarmup(workingWeight);
        case 'cable':
        case 'machine':
        case 'band':
            return buildMachineWarmup(workingWeight);
        default:
            return buildDumbbellWarmup(workingWeight); // fallback
    }
}

// ─── Warmup Builders ─────────────────────────────────────────

function buildBarbellWarmup(workingWeight: number): WarmupResult {
    const sets: WarmupSet[] = [];
    let setNum = 1;

    // Very light working weight — just bar
    if (workingWeight <= 65) {
        sets.push({
            setNumber: setNum++,
            weight: BAR_WEIGHT,
            reps: 10,
            label: 'Bar',
            isCompleted: false,
        });
        return { sets, totalWarmupSets: sets.length, estimatedTimeMinutes: sets.length * TIME_PER_SET };
    }

    // Light working weight — bar + one set
    if (workingWeight <= 115) {
        sets.push({
            setNumber: setNum++,
            weight: BAR_WEIGHT,
            reps: 10,
            label: 'Bar',
            isCompleted: false,
        });
        const mid = roundTo5(workingWeight * 0.7);
        if (mid > BAR_WEIGHT) {
            sets.push({
                setNumber: setNum++,
                weight: mid,
                reps: 5,
                label: '70%',
                isCompleted: false,
            });
        }
        return { sets, totalWarmupSets: sets.length, estimatedTimeMinutes: sets.length * TIME_PER_SET };
    }

    // Standard full barbell ramp
    // Bar x 10
    sets.push({
        setNumber: setNum++,
        weight: BAR_WEIGHT,
        reps: 10,
        label: 'Bar',
        isCompleted: false,
    });

    // 50% x 5
    const fifty = roundTo5(workingWeight * 0.5);
    if (fifty > BAR_WEIGHT) {
        sets.push({
            setNumber: setNum++,
            weight: fifty,
            reps: 5,
            label: '50%',
            isCompleted: false,
        });
    }

    // 70% x 3
    const seventy = roundTo5(workingWeight * 0.7);
    if (seventy > fifty) {
        sets.push({
            setNumber: setNum++,
            weight: seventy,
            reps: 3,
            label: '70%',
            isCompleted: false,
        });
    }

    // 85% x 2 (only for heavier working weights)
    if (workingWeight >= 185) {
        const eightyfive = roundTo5(workingWeight * 0.85);
        if (eightyfive > seventy) {
            sets.push({
                setNumber: setNum++,
                weight: eightyfive,
                reps: 2,
                label: '85%',
                isCompleted: false,
            });
        }
    }

    return {
        sets,
        totalWarmupSets: sets.length,
        estimatedTimeMinutes: sets.length * TIME_PER_SET,
    };
}

function buildDumbbellWarmup(workingWeight: number): WarmupResult {
    const sets: WarmupSet[] = [];
    let setNum = 1;

    // Very light weight
    if (workingWeight <= 15) {
        sets.push({
            setNumber: setNum++,
            weight: MIN_DUMBBELL,
            reps: 10,
            label: 'Light',
            isCompleted: false,
        });
        return { sets, totalWarmupSets: sets.length, estimatedTimeMinutes: sets.length * TIME_PER_SET };
    }

    // ~30% x 8
    const thirty = Math.max(MIN_DUMBBELL, roundTo5(workingWeight * 0.3));
    sets.push({
        setNumber: setNum++,
        weight: thirty,
        reps: 8,
        label: '30%',
        isCompleted: false,
    });

    // ~60% x 5
    const sixty = roundTo5(workingWeight * 0.6);
    if (sixty > thirty) {
        sets.push({
            setNumber: setNum++,
            weight: sixty,
            reps: 5,
            label: '60%',
            isCompleted: false,
        });
    }

    // ~80% x 3
    const eighty = roundTo5(workingWeight * 0.8);
    if (eighty > sixty && workingWeight >= 40) {
        sets.push({
            setNumber: setNum++,
            weight: eighty,
            reps: 3,
            label: '80%',
            isCompleted: false,
        });
    }

    return {
        sets,
        totalWarmupSets: sets.length,
        estimatedTimeMinutes: sets.length * TIME_PER_SET,
    };
}

function buildKettlebellWarmup(workingWeight: number): WarmupResult {
    const sets: WarmupSet[] = [];
    let setNum = 1;

    // Light KB warmup
    const light = nearestKBWeight(workingWeight * 0.4);
    sets.push({
        setNumber: setNum++,
        weight: light,
        reps: 8,
        label: 'Light',
        isCompleted: false,
    });

    // Moderate KB warmup
    const moderate = nearestKBWeight(workingWeight * 0.7);
    if (moderate > light) {
        sets.push({
            setNumber: setNum++,
            weight: moderate,
            reps: 5,
            label: 'Moderate',
            isCompleted: false,
        });
    }

    return {
        sets,
        totalWarmupSets: sets.length,
        estimatedTimeMinutes: sets.length * TIME_PER_SET,
    };
}

function buildMachineWarmup(workingWeight: number): WarmupResult {
    const sets: WarmupSet[] = [];
    let setNum = 1;

    // Light x 10
    const light = roundTo5(workingWeight * 0.4);
    sets.push({
        setNumber: setNum++,
        weight: Math.max(5, light),
        reps: 10,
        label: 'Light',
        isCompleted: false,
    });

    // Moderate x 5
    const moderate = roundTo5(workingWeight * 0.7);
    if (moderate > light) {
        sets.push({
            setNumber: setNum++,
            weight: moderate,
            reps: 5,
            label: 'Moderate',
            isCompleted: false,
        });
    }

    return {
        sets,
        totalWarmupSets: sets.length,
        estimatedTimeMinutes: sets.length * TIME_PER_SET,
    };
}

function buildAbbreviatedWarmup(workingWeight: number, equipment: Equipment): WarmupResult {
    const sets: WarmupSet[] = [];
    let setNum = 1;

    // 50% x 5
    let fiftyWeight: number;
    if (equipment === 'barbell') {
        fiftyWeight = Math.max(BAR_WEIGHT, roundTo5(workingWeight * 0.5));
    } else if (equipment === 'kettlebell') {
        fiftyWeight = nearestKBWeight(workingWeight * 0.5);
    } else {
        fiftyWeight = Math.max(MIN_DUMBBELL, roundTo5(workingWeight * 0.5));
    }

    sets.push({
        setNumber: setNum++,
        weight: fiftyWeight,
        reps: 5,
        label: '50%',
        isCompleted: false,
    });

    // 75% x 3
    let seventyfiveWeight: number;
    if (equipment === 'barbell') {
        seventyfiveWeight = roundTo5(workingWeight * 0.75);
    } else if (equipment === 'kettlebell') {
        seventyfiveWeight = nearestKBWeight(workingWeight * 0.75);
    } else {
        seventyfiveWeight = roundTo5(workingWeight * 0.75);
    }

    if (seventyfiveWeight > fiftyWeight) {
        sets.push({
            setNumber: setNum++,
            weight: seventyfiveWeight,
            reps: 3,
            label: '75%',
            isCompleted: false,
        });
    }

    return {
        sets,
        totalWarmupSets: sets.length,
        estimatedTimeMinutes: sets.length * TIME_PER_SET,
    };
}
