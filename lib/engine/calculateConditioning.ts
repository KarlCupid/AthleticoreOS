/**
 * calculateConditioning.ts
 *
 * Conditioning programming engine — heavy bag, circuits, jump rope,
 * sport-specific drills, and metabolic conditioning.
 *
 * Functions:
 *   1. prescribeConditioning      — generates a single conditioning session
 *   2. getWeeklyConditioningPlan  — distributes conditioning across the week
 *
 * @ANTI-WIRING:
 * All functions are pure and synchronous. No database queries. No LLM generation.
 */

import type {
    ConditioningPrescription,
    ConditioningType,
    ConditioningExercise,
    WeeklyConditioningInput,
    FitnessLevel,
    Phase,
    ReadinessState,
    CampConfig,
    WeightCutPlanRow,
} from './types/foundational.ts';
import { getDailyCutIntensityCap } from './calculateWeightCut.ts';
import { formatLocalDate, todayLocalDate } from '../utils/date.ts';

// ─── Constants ─────────────────────────────────────────────────

/**
 * Base rounds for heavy bag work per fitness level.
 */
const BASE_BAG_ROUNDS: Record<FitnessLevel, number> = {
    beginner: 3,
    intermediate: 5,
    advanced: 8,
    elite: 10,
};

/**
 * Work intervals (seconds) per round for heavy bag.
 */
const BAG_WORK_INTERVAL: Record<FitnessLevel, number> = {
    beginner: 90,
    intermediate: 120,
    advanced: 180,
    elite: 180,
};

/**
 * Rest between rounds (seconds).
 */
const BAG_REST_INTERVAL: Record<FitnessLevel, number> = {
    beginner: 90,
    intermediate: 60,
    advanced: 60,
    elite: 45,
};

/**
 * CNS load per conditioning type.
 */
const CONDITIONING_CNS: Record<ConditioningType, number> = {
    heavy_bag_rounds: 7,
    circuit: 5,
    jump_rope: 4,
    sled_work: 6,
    agility_drills: 4,
    sport_specific_drill: 5,
};

/**
 * Conditioning priority list per phase.
 * More sport-specific during camp, more general during off-season.
 */
const PHASE_CONDITIONING_MAP: Record<Phase, ConditioningType[]> = {
    'off-season': ['circuit', 'jump_rope', 'agility_drills'],
    'pre-camp': ['circuit', 'heavy_bag_rounds', 'jump_rope'],
    'fight-camp': ['heavy_bag_rounds', 'sport_specific_drill', 'agility_drills'],
    'camp-base': ['circuit', 'jump_rope', 'heavy_bag_rounds'],
    'camp-build': ['heavy_bag_rounds', 'circuit', 'sport_specific_drill'],
    'camp-peak': ['heavy_bag_rounds', 'sport_specific_drill', 'agility_drills'],
    'camp-taper': ['jump_rope', 'agility_drills'],
};

// ─── Exercise Libraries ────────────────────────────────────────

const CIRCUIT_EXERCISES: ConditioningExercise[] = [
    { name: 'Burpees', durationSec: null, reps: 10, rounds: 3, restSec: 15 },
    { name: 'Jump Squats', durationSec: null, reps: 15, rounds: 3, restSec: 15 },
    { name: 'Mountain Climbers', durationSec: 30, reps: null, rounds: 3, restSec: 10 },
    { name: 'Push-ups', durationSec: null, reps: 15, rounds: 3, restSec: 15 },
    { name: 'Plank Hold', durationSec: 30, reps: null, rounds: 3, restSec: 10 },
    { name: 'Sprawls', durationSec: null, reps: 10, rounds: 3, restSec: 15 },
    { name: 'Box Jumps', durationSec: null, reps: 10, rounds: 3, restSec: 20 },
];

const BEGINNER_CIRCUIT_EXERCISES: ConditioningExercise[] = [
    { name: 'Squat Jumps', durationSec: null, reps: 10, rounds: 2, restSec: 20 },
    { name: 'Push-ups', durationSec: null, reps: 8, rounds: 2, restSec: 20 },
    { name: 'High Knees', durationSec: 20, reps: null, rounds: 2, restSec: 15 },
    { name: 'Plank Hold', durationSec: 20, reps: null, rounds: 2, restSec: 15 },
];

const SPORT_SPECIFIC_EXERCISES: ConditioningExercise[] = [
    { name: 'Shadow Boxing (with resistance bands)', durationSec: 60, reps: null, rounds: 3, restSec: 30 },
    { name: 'Defensive Footwork Drill', durationSec: 45, reps: null, rounds: 3, restSec: 30 },
    { name: 'Slip Rope Drill', durationSec: 60, reps: null, rounds: 3, restSec: 20 },
    { name: 'Double-End Bag', durationSec: 90, reps: null, rounds: 3, restSec: 30 },
    { name: 'Clinch Entry Practice', durationSec: 60, reps: null, rounds: 3, restSec: 30 },
];

const AGILITY_EXERCISES: ConditioningExercise[] = [
    { name: 'Ladder Drills (In-In-Out)', durationSec: 20, reps: null, rounds: 4, restSec: 20 },
    { name: 'Cone Shuffle', durationSec: 15, reps: null, rounds: 4, restSec: 15 },
    { name: 'Lateral Bounds', durationSec: null, reps: 10, rounds: 3, restSec: 15 },
    { name: 'T-Drill', durationSec: 20, reps: null, rounds: 3, restSec: 30 },
];

// ─── Helpers ───────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
}

function dateFromISO(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
}

function getConditioningType(
    phase: Phase,
    readinessState: ReadinessState,
    sessionIndex: number,
): ConditioningType {
    // Depleted = light active recovery only
    if (readinessState === 'Depleted') return 'jump_rope';

    const list = PHASE_CONDITIONING_MAP[phase];
    return list[sessionIndex % list.length];
}

// ─── prescribeConditioning ─────────────────────────────────────

/**
 * Generates a single conditioning session prescription.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - phase: Phase
 *   - fitnessLevel: FitnessLevel
 *   - readinessState: ReadinessState
 *   - activeCutPlan: WeightCutPlanRow | null
 *   - campConfig: CampConfig | null
 *
 * Returns: ConditioningPrescription
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function prescribeConditioning(input: {
    phase: Phase;
    fitnessLevel: FitnessLevel;
    readinessState: ReadinessState;
    acwr: number;
    sessionIndex?: number;
    activeCutPlan?: WeightCutPlanRow | null;
    campConfig?: CampConfig | null;
    trainingIntensityCap?: number | null;
    trainingIntensityCapOverride?: number | null; // Backward-compatible alias used by weekly planner
}): ConditioningPrescription {
    const {
        phase,
        fitnessLevel,
        readinessState,
        acwr,
        sessionIndex = 0,
        activeCutPlan,
        trainingIntensityCap,
        trainingIntensityCapOverride,
    } = input;

    // Determine conditioning type
    let type = getConditioningType(phase, readinessState, sessionIndex);

    const resolvedIntensityCap = trainingIntensityCapOverride ?? trainingIntensityCap;
    const effectiveDate = todayLocalDate();
    const effectiveIntensityCap = resolvedIntensityCap !== undefined
        ? resolvedIntensityCap
        : getDailyCutIntensityCap(activeCutPlan, effectiveDate);

    // Apply intensity cap — if cut is strict, no heavy bag
    if (effectiveIntensityCap !== null && effectiveIntensityCap !== undefined) {
        if (CONDITIONING_CNS[type] > effectiveIntensityCap) {
            type = 'jump_rope';
        }
    }

    // Depleted or high ACWR → force light
    if (readinessState === 'Depleted' || acwr >= 1.4) {
        type = 'jump_rope';
    }

    // Build exercises and parameters based on type
    let exercises: ConditioningExercise[];
    let rounds: number;
    let workIntervalSec: number;
    let restIntervalSec: number;
    let totalDurationMin: number;
    const intensityLabel: ConditioningPrescription['intensityLabel'] =
        readinessState === 'Depleted' ? 'light' :
            readinessState === 'Caution' ? 'moderate' :
                'hard';

    switch (type) {
        case 'heavy_bag_rounds': {
            rounds = Math.round(
                BASE_BAG_ROUNDS[fitnessLevel] *
                (readinessState === 'Caution' ? 0.7 : 1.0)
            );
            workIntervalSec = BAG_WORK_INTERVAL[fitnessLevel];
            restIntervalSec = BAG_REST_INTERVAL[fitnessLevel];
            totalDurationMin = Math.round(
                (rounds * (workIntervalSec + restIntervalSec)) / 60
            );
            exercises = [{
                name: 'Heavy Bag Rounds',
                durationSec: workIntervalSec,
                reps: null,
                rounds,
                restSec: restIntervalSec,
            }];
            break;
        }
        case 'circuit': {
            rounds = fitnessLevel === 'beginner' ? 2 : fitnessLevel === 'elite' ? 4 : 3;
            workIntervalSec = 30;
            restIntervalSec = 15;
            exercises = (fitnessLevel === 'beginner' ? BEGINNER_CIRCUIT_EXERCISES : CIRCUIT_EXERCISES)
                .slice(0, fitnessLevel === 'beginner' ? 4 : 5);
            totalDurationMin = Math.round((exercises.length * rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
            break;
        }
        case 'jump_rope': {
            const jrByLevel: Record<FitnessLevel, number> = { beginner: 3, intermediate: 5, advanced: 8, elite: 10 };
            rounds = jrByLevel[fitnessLevel];
            workIntervalSec = 60;
            restIntervalSec = 30;
            totalDurationMin = Math.round((rounds * (workIntervalSec + restIntervalSec)) / 60) + 3;
            exercises = [{ name: 'Jump Rope', durationSec: workIntervalSec, reps: null, rounds, restSec: restIntervalSec }];
            break;
        }
        case 'sport_specific_drill': {
            rounds = fitnessLevel === 'beginner' ? 2 : 3;
            workIntervalSec = 60;
            restIntervalSec = 30;
            exercises = SPORT_SPECIFIC_EXERCISES.slice(0, rounds + 1);
            totalDurationMin = Math.round((exercises.length * rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
            break;
        }
        case 'agility_drills': {
            rounds = fitnessLevel === 'beginner' ? 2 : 3;
            workIntervalSec = 20;
            restIntervalSec = 20;
            exercises = AGILITY_EXERCISES.slice(0, 3);
            totalDurationMin = Math.round((exercises.length * rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
            break;
        }
        case 'sled_work': {
            rounds = fitnessLevel === 'beginner' ? 4 : fitnessLevel === 'elite' ? 8 : 6;
            workIntervalSec = 30;
            restIntervalSec = 90;
            totalDurationMin = Math.round((rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
            exercises = [{ name: 'Sled Push (20m)', durationSec: null, reps: rounds, rounds: 1, restSec: restIntervalSec }];
            break;
        }
        default: {
            rounds = 3;
            workIntervalSec = 30;
            restIntervalSec = 30;
            totalDurationMin = 15;
            exercises = [];
        }
    }

    const cnsBudget = CONDITIONING_CNS[type];
    const estimatedLoad = totalDurationMin * cnsBudget;

    const typeLabels: Record<ConditioningType, string> = {
        heavy_bag_rounds: 'Heavy Bag Rounds',
        circuit: 'Conditioning Circuit',
        jump_rope: 'Jump Rope',
        sled_work: 'Sled Work',
        agility_drills: 'Agility Drills',
        sport_specific_drill: 'Sport-Specific Drills',
    };

    const phaseIntent: Partial<Record<Phase, string>> = {
        'camp-base': 'Building your aerobic conditioning base.',
        'camp-build': 'Increasing intensity to match fight-level demands.',
        'camp-peak': 'Sharpening sport-specific skills under fatigue.',
        'camp-taper': 'Maintaining feel while minimizing fatigue accumulation.',
        'fight-camp': 'Fight camp conditioning — quality over quantity.',
        'off-season': 'Off-season conditioning — general fitness focus.',
    };

    const message =
        `${typeLabels[type]}: ${rounds} rounds × ${Math.round(workIntervalSec / 60 * 10) / 10} min. ` +
        (phaseIntent[phase] ? phaseIntent[phase] + ' ' : '') +
        `Intensity: ${intensityLabel}.`;

    return {
        type,
        totalDurationMin,
        rounds,
        workIntervalSec,
        restIntervalSec,
        exercises,
        intensityLabel,
        message,
        cnsBudget,
        estimatedLoad,
    };
}

// ─── getWeeklyConditioningPlan ─────────────────────────────────

/**
 * Distributes conditioning sessions across the week.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function getWeeklyConditioningPlan(
    input: WeeklyConditioningInput,
): { date: string; prescription: ConditioningPrescription }[] {
    if (input.prescriptionsNeeded <= 0) return [];

    const {
        weekStartDate,
        prescriptionsNeeded,
        recurringActivities,
        existingActivities,
        fitnessLevel,
        phase,
        readinessState,
        acwr,
        campConfig,
        activeCutPlan,
    } = input;

    const allTemplateActivities = recurringActivities.filter(
        t => t.is_active && t.recurrence.frequency === 'weekly'
    );

    // Score each day of the week
    const candidateDays: { date: string; totalLoad: number }[] = [];
    for (let offset = 0; offset < 7; offset++) {
        const date = addDays(weekStartDate, offset);
        const dayOfWeek = dateFromISO(date).getDay();

        const templateForDay = allTemplateActivities.filter(t =>
            t.recurrence.days_of_week?.includes(dayOfWeek)
        );
        const existingForDay = existingActivities.filter(a => a.date === date);

        // Skip if day already has sparring or heavy S&C (protect CNS)
        const hasHighCNS = [...templateForDay, ...existingForDay].some(a =>
            a.activity_type === 'sparring' || a.activity_type === 'sc'
        );
        if (hasHighCNS) continue;

        const totalLoad = existingForDay.reduce(
            (sum, a) => sum + (a.estimated_duration_min * a.expected_intensity),
            0
        );

        // Allow conditioning on moderate-load days (can stack with boxing, road work)
        if (totalLoad < 900) {
            candidateDays.push({ date, totalLoad });
        }
    }

    candidateDays.sort((a, b) => a.totalLoad - b.totalLoad);

    const result: { date: string; prescription: ConditioningPrescription }[] = [];
    const usedDates = new Set<string>();

    for (let i = 0; i < Math.min(prescriptionsNeeded, candidateDays.length); i++) {
        const day = candidateDays[i];
        if (usedDates.has(day.date)) continue;

        const trainingIntensityCap = getDailyCutIntensityCap(activeCutPlan, day.date);

        const prescription = prescribeConditioning({
            phase, fitnessLevel, readinessState, acwr,
            sessionIndex: i, trainingIntensityCapOverride: trainingIntensityCap, campConfig: campConfig ?? undefined,
        });

        result.push({ date: day.date, prescription });
        usedDates.add(day.date);
    }

    return result;
}
