/**
 * calculateRoadWork.ts
 *
 * Full cardio / road work programming engine.
 *
 * Functions:
 *   1. prescribeRoadWork         â€” generates a single road work session
 *   2. getWeeklyRoadWorkPlan     â€” distributes road work across the week avoiding conflicts
 *   3. calculateRunningLoad      â€” converts a prescription to sRPE load for ACWR
 *   4. getRoadWorkType           â€” determines optimal run type for phase/readiness
 *
 * @ANTI-WIRING:
 * All functions are pure and synchronous. No database queries. No LLM generation.
 */

import type {
    CampConfig,
    FitnessLevel,
    Phase,
    ReadinessState,
    RoadWorkInterval,
    RoadWorkPrescription,
    RoadWorkType,
    WeeklyRoadWorkInput,
    WeightCutPlanRow,
    HRZone,
} from './types.ts';
import { getBodyMassTrainingIntensityCap } from '../performance-engine/body-mass-weight-class/index.ts';
import { formatLocalDate, todayLocalDate } from '../utils/date.ts';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Base run distances (miles) per fitness level for a standard easy run.
 * Other run types scale from these values.
 */
const BASE_DISTANCES: Record<FitnessLevel, number> = {
    beginner: 2.0,
    intermediate: 3.5,
    advanced: 5.0,
    elite: 7.0,
};

/**
 * Duration multipliers per road work type (relative to easy_run base).
 * Applied to calculate totalDurationMin.
 */
const TYPE_DURATION_MULTIPLIERS: Record<RoadWorkType, number> = {
    easy_run: 1.0,
    long_slow_distance: 1.8,
    tempo: 0.7,
    intervals: 0.8,  // total including rest periods
    hill_sprints: 0.5,
    recovery_jog: 0.6,
};

/**
 * CNS load per road work type (on a 1-10 scale, like exercise_library).
 */
const CNS_LOAD_BY_TYPE: Record<RoadWorkType, number> = {
    recovery_jog: 1,
    easy_run: 2,
    long_slow_distance: 3,
    tempo: 5,
    intervals: 7,
    hill_sprints: 8,
};

/**
 * HR zone for each run type (primary zone).
 */
const PRIMARY_ZONE: Record<RoadWorkType, HRZone> = {
    recovery_jog: 1,
    easy_run: 2,
    long_slow_distance: 2,
    tempo: 3,
    intervals: 4,
    hill_sprints: 5,
};

/**
 * HR zone range [min, max] for each run type.
 */
const ZONE_RANGE: Record<RoadWorkType, [HRZone, HRZone]> = {
    recovery_jog: [1, 2],
    easy_run: [2, 2],
    long_slow_distance: [2, 3],
    tempo: [3, 4],
    intervals: [4, 5],
    hill_sprints: [4, 5],
};

/**
 * Weekly road work focus by phase â€” defines what type of running to emphasize.
 */
const PHASE_RUN_FOCUS: Record<Phase, RoadWorkType[]> = {
    'off-season': ['easy_run', 'long_slow_distance'],
    'pre-camp': ['easy_run', 'tempo'],
    'fight-camp': ['tempo', 'intervals'],
    'camp-base': ['easy_run', 'long_slow_distance', 'tempo'],
    'camp-build': ['tempo', 'intervals', 'hill_sprints'],
    'camp-peak': ['intervals', 'hill_sprints', 'tempo'],
    'camp-taper': ['recovery_jog', 'easy_run'],
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
}

function dateFromISO(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
}

function isHighCNS(type: RoadWorkType): boolean {
    return CNS_LOAD_BY_TYPE[type] >= 6;
}

function getEstimatedMaxHR(age: number | null): number | null {
    return age !== null ? Math.round(220 - age) : null;
}

function buildPaceGuidance(type: RoadWorkType, maxHR: number | null): string {
    const zone = PRIMARY_ZONE[type];

    if (maxHR !== null) {
        const zoneRanges: Record<HRZone, [number, number]> = {
            1: [0.50, 0.60],
            2: [0.60, 0.70],
            3: [0.70, 0.80],
            4: [0.80, 0.90],
            5: [0.90, 1.00],
        };
        const [lo, hi] = zoneRanges[zone];
        const loHR = Math.round(maxHR * lo);
        const hiHR = Math.round(maxHR * hi);
        return `Keep HR between ${loHR}-${hiHR} bpm (Zone ${zone})`;
    }

    // RPE-based guidance when age is unknown
    const rpeGuide: Record<RoadWorkType, string> = {
        recovery_jog: 'Very easy â€” RPE 1-2, fully conversational',
        easy_run: 'Easy â€” RPE 3-4, can hold a full conversation',
        long_slow_distance: 'Comfortable â€” RPE 3-4, aerobic base pace',
        tempo: 'Comfortably hard â€” RPE 6-7, can speak in short sentences',
        intervals: 'Hard effort â€” RPE 8-9 during intervals, full rest between',
        hill_sprints: 'Maximal effort â€” RPE 9-10 uphill, walk down to recover',
    };
    return rpeGuide[type];
}

function buildProgressionNote(type: RoadWorkType, weekNum?: number): string {
    const weekStr = weekNum ? ` (Week ${weekNum})` : '';
    switch (type) {
        case 'easy_run':
            return `${weekStr} Add 5-10% distance per week during base building. Never increase more than one variable at a time.`;
        case 'long_slow_distance':
            return `${weekStr} Increase long run by 1 mile per 2 weeks max. Cut back 1 mile every 4th week for recovery.`;
        case 'tempo':
            return `${weekStr} Progress tempo from 20 min to 40 min over 6 weeks before adding a second tempo day.`;
        case 'intervals':
            return `${weekStr} Add 1 rep per week OR reduce rest by 15 sec. Don't do both at the same time.`;
        case 'hill_sprints':
            return `${weekStr} Start with 4-6 sprints. Add 1 rep every 2 weeks. Keep efforts maximal and rest complete.`;
        case 'recovery_jog':
            return `Taper week â€” keep this easy. No fitness is gained here; it's all about recovery.`;
        default:
            return '';
    }
}

function buildMessage(type: RoadWorkType, fitnessLevel: FitnessLevel, phase: Phase): string {
    const typeDescriptions: Record<RoadWorkType, string> = {
        recovery_jog: 'Recovery jog to flush legs and maintain aerobic engine',
        easy_run: 'Easy aerobic run building your cardiovascular base',
        long_slow_distance: 'Long slow distance run for aerobic development and mental toughness',
        tempo: 'Tempo run improving your lactate threshold â€” the pace you can sustain for an hour',
        intervals: 'High-intensity intervals targeting your VO2max and anaerobic capacity',
        hill_sprints: 'Hill sprints building explosive power, leg drive, and ground-contact strength',
    };

    const phaseContext: Partial<Record<Phase, string>> = {
        'off-season': 'Off-season focus: build aerobic base at low-moderate intensity.',
        'camp-base': 'Camp base phase: high volume, low intensity â€” building your engine.',
        'camp-build': 'Camp build phase: introducing higher intensities to simulate fight demand.',
        'camp-peak': 'Camp peak: minimal volume, maximal quality. Every session counts.',
        'camp-taper': 'Taper week: sharpen without accumulating fatigue.',
        'fight-camp': 'Fight camp: intensity and specificity are priority.',
    };

    return `${typeDescriptions[type]}. ${phaseContext[phase] || ''} ${fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1)}-level programming applied.`.trim();
}

function buildIntervals(type: RoadWorkType, fitnessLevel: FitnessLevel): RoadWorkInterval[] {
    if (type === 'intervals') {
        const repsByLevel: Record<FitnessLevel, number> = { beginner: 4, intermediate: 6, advanced: 8, elite: 10 };
        const reps = repsByLevel[fitnessLevel];
        return [{
            effortLabel: '400m sprint (or 90-sec effort)',
            durationSec: 90,
            restSec: type === 'intervals' ? 90 : 60,
            zone: 4,
            repetitions: reps,
        }];
    }
    if (type === 'hill_sprints') {
        const repsByLevel: Record<FitnessLevel, number> = { beginner: 4, intermediate: 6, advanced: 8, elite: 10 };
        return [{
            effortLabel: '10-15 sec uphill sprint',
            durationSec: 12,
            restSec: 120,
            zone: 5,
            repetitions: repsByLevel[fitnessLevel],
        }];
    }
    return [];
}

// â”€â”€â”€ getRoadWorkType â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Determines the ideal road work type given the current context.
 * Used to select from the phase's priority list while respecting readiness.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function getRoadWorkType(
    phase: Phase,
    readinessState: ReadinessState,
    acwr: number,
    sessionIndex: number = 0,  // 0 = first session this week, 1 = second, etc.
): RoadWorkType {
    // Override state: Depleted or ACWR danger â†’ always recovery jog
    if (readinessState === 'Depleted' || acwr >= 1.5) {
        return 'recovery_jog';
    }
    // Caution: downgrade to easy/recovery
    if (readinessState === 'Caution' || acwr >= 1.3) {
        return 'easy_run';
    }

    const priorityList = PHASE_RUN_FOCUS[phase];
    // Rotate through priority list based on session index so the week has variety
    return priorityList[sessionIndex % priorityList.length];
}

// â”€â”€â”€ prescribeRoadWork â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Generates a single road work session prescription.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - phase: Phase (from athlete_profiles)
 *   - fitnessLevel: FitnessLevel (from fitness_profiles)
 *   - readinessState: ReadinessState (from GlobalReadinessState)
 *   - acwr: number (from calculateACWR)
 *   - age: number | null (from athlete_profiles for HR zone calculation)
 *   - sessionIndex: number (0 = first run this week, increments for variety)
 *   - trainingIntensityCap: number | null (from active cut protocol)
 *   - campConfig: CampConfig | null (from camp plan)
 *
 * Returns: RoadWorkPrescription
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function prescribeRoadWork(input: {
    phase: Phase;
    fitnessLevel: FitnessLevel;
    readinessState: ReadinessState;
    acwr: number;
    age: number | null;
    sessionIndex?: number;
    activeCutPlan?: WeightCutPlanRow | null;
    campConfig?: CampConfig | null;
    trainingIntensityCap?: number | null;
    trainingIntensityCapOverride?: number | null; // Backward-compatible alias used by weekly planner
}): RoadWorkPrescription {
    const {
        phase,
        fitnessLevel,
        readinessState,
        acwr,
        age,
        sessionIndex = 0,
        activeCutPlan,
        trainingIntensityCap,
        trainingIntensityCapOverride,
        campConfig,
    } = input;

    // Determine run type
    let type = getRoadWorkType(phase, readinessState, acwr, sessionIndex);

    const resolvedIntensityCap = trainingIntensityCapOverride ?? trainingIntensityCap;
    const effectiveDate = todayLocalDate();
    const effectiveIntensityCap = resolvedIntensityCap !== undefined
        ? resolvedIntensityCap
        : getBodyMassTrainingIntensityCap(activeCutPlan, effectiveDate);

    // Apply intensity cap from weight-class safety context.
    // Walk down the intensity ladder until the type fits within the cap
    if (effectiveIntensityCap !== null && effectiveIntensityCap !== undefined) {
        const intensityLadder: RoadWorkType[] = [
            'hill_sprints', 'intervals', 'tempo', 'long_slow_distance', 'easy_run', 'recovery_jog',
        ];
        const startIdx = intensityLadder.indexOf(type);
        if (startIdx !== -1) {
            for (let idx = startIdx; idx < intensityLadder.length; idx++) {
                const candidate = intensityLadder[idx];
                if (CNS_LOAD_BY_TYPE[candidate] <= effectiveIntensityCap) {
                    type = candidate;
                    break;
                }
                // If we exhaust the list, default to recovery_jog
                if (idx === intensityLadder.length - 1) type = 'recovery_jog';
            }
        }
    }

    // Taper override during camp taper
    const isTaper = campConfig && (() => {
        const today = todayLocalDate();
        return today >= campConfig.taperPhaseDates.start && today <= campConfig.taperPhaseDates.end;
    })();
    if (isTaper && type !== 'recovery_jog' && type !== 'easy_run') {
        type = 'easy_run';
    }

    // Calculate distance
    const baseDistance = BASE_DISTANCES[fitnessLevel];
    const typeDistanceMultipliers: Record<RoadWorkType, number> = {
        recovery_jog: 0.5,
        easy_run: 1.0,
        long_slow_distance: 1.7,
        tempo: 0.6,
        intervals: null as any, // no fixed distance for intervals
        hill_sprints: null as any,
    };
    const hasDistance = type !== 'intervals' && type !== 'hill_sprints';
    const targetDistanceMiles = hasDistance
        ? Math.round((baseDistance * typeDistanceMultipliers[type]) * 4) / 4 // round to nearest 0.25mi
        : null;

    // Calculate duration
    const baseDurationMin = Math.round(baseDistance * 10); // ~10 min/mile base
    const totalDurationMin = Math.max(
        20,
        Math.round(baseDurationMin * TYPE_DURATION_MULTIPLIERS[type])
    );

    const maxHR = getEstimatedMaxHR(age);
    const intervals = buildIntervals(type, fitnessLevel);
    const warmupCooldownMin = type === 'recovery_jog' ? 0 : 5;

    const cnsBudget = CNS_LOAD_BY_TYPE[type];
    const estimatedLoad = totalDurationMin * cnsBudget;

    return {
        type,
        totalDurationMin,
        targetDistanceMiles,
        hrZone: PRIMARY_ZONE[type],
        hrZoneRange: ZONE_RANGE[type],
        estimatedMaxHR: maxHR,
        paceGuidance: buildPaceGuidance(type, maxHR),
        warmupCooldownMin,
        intervals,
        progressionNote: buildProgressionNote(type),
        message: buildMessage(type, fitnessLevel, phase),
        cnsBudget,
        estimatedLoad,
    };
}

// â”€â”€â”€ calculateRunningLoad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Converts a road work prescription into a session load (duration Ã— intensity)
 * compatible with the ACWR calculation system.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function calculateRunningLoad(prescription: RoadWorkPrescription): number {
    return prescription.estimatedLoad;
}

// â”€â”€â”€ getWeeklyRoadWorkPlan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Distributes road work sessions across the week, avoiding:
 *   - Days with high-CNS existing activities (sparring, heavy S&C)
 *   - Consecutive high-intensity run days
 *   - Days already at maximum load
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - input: WeeklyRoadWorkInput
 *     - weekStartDate: ISO date (Monday)
 *     - prescriptionsNeeded: number (from weeklyTargets.road_work_sessions)
 *     - recurringActivities: RecurringActivityRow[] (user's template)
 *     - existingActivities: ScheduledActivityRow[] (already on calendar for the week)
 *     - fitnessLevel: FitnessLevel
 *     - phase: Phase
 *     - readinessState: ReadinessState
 *     - acwr: number
 *     - age: number | null
 *     - campConfig: CampConfig | null
 *     - activeCutPlan: WeightCutPlanRow | null
 *
 * Returns: Array of RoadWorkPrescription (each with its assigned date attached via the .message field)
 * The caller assigns these to specific days when building the week plan.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getWeeklyRoadWorkPlan(
    input: WeeklyRoadWorkInput,
): { date: string; prescription: RoadWorkPrescription }[] {
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
        age,
        campConfig,
        activeCutPlan,
    } = input;

    // Build a map of existing day loads this week
    const allTemplateActivities = recurringActivities.filter(
        t => t.is_active && t.recurrence.frequency === 'weekly'
    );

    const dayData: { date: string; hasHighCNS: boolean; totalLoad: number }[] = [];
    for (let offset = 0; offset < 7; offset++) {
        const date = addDays(weekStartDate, offset);
        const dayOfWeek = dateFromISO(date).getDay();

        const templateForDay = allTemplateActivities.filter(t =>
            t.recurrence.days_of_week?.includes(dayOfWeek)
        );
        const existingForDay = existingActivities.filter(a => a.date === date);
        const allForDay = [...templateForDay, ...existingForDay];

        const hasHighCNS = allForDay.some(a =>
            a.activity_type === 'sparring' || a.activity_type === 'sc'
        );
        const totalLoad = existingForDay.reduce(
            (sum, a) => sum + (a.estimated_duration_min * a.expected_intensity),
            0
        );

        dayData.push({ date, hasHighCNS, totalLoad });
    }

    // Score candidate days â€” lower totalLoad and no high-CNS = better
    const candidateDays = dayData
        .filter(d => !d.hasHighCNS && d.totalLoad < 800)
        .sort((a, b) => a.totalLoad - b.totalLoad);

    const result: { date: string; prescription: RoadWorkPrescription }[] = [];
    const usedDates = new Set<string>();

    for (let i = 0; i < Math.min(prescriptionsNeeded, candidateDays.length); i++) {
        const day = candidateDays[i];
        if (usedDates.has(day.date)) continue;

        // Avoid consecutive high-intensity run days
        const prevDate = addDays(day.date, -1);
        const nextDate = addDays(day.date, 1);
        const prevIsIntense = result.some(
            r => r.date === prevDate && isHighCNS(r.prescription.type)
        );
        const nextIsIntense = result.some(
            r => r.date === nextDate && isHighCNS(r.prescription.type)
        );

        // If surrounded by high intensity, downgrade this session to easy
        const forceEasy = prevIsIntense && nextIsIntense;

        const trainingIntensityCap = getBodyMassTrainingIntensityCap(activeCutPlan, day.date);

        const prescription = forceEasy
            ? prescribeRoadWork({
                phase, fitnessLevel, readinessState: 'Caution',
                acwr, age, sessionIndex: i, trainingIntensityCapOverride: trainingIntensityCap, campConfig,
            })
            : prescribeRoadWork({
                phase, fitnessLevel, readinessState,
                acwr, age, sessionIndex: i, trainingIntensityCapOverride: trainingIntensityCap, campConfig,
            });

        result.push({ date: day.date, prescription });
        usedDates.add(day.date);
    }

    return result;
}

