import type {
    ActivityType,
    ReadinessState,
    FitnessLevel,
    Phase,
} from '../types/foundational.ts';
import type { StimulusConstraintSet } from '../types/readiness.ts';
import type {
    ScheduledActivityRow,
    DayLoadValidation,
    WeekPlanEntry,
} from '../types/training.ts';
import { formatLocalDate, todayLocalDate } from '../../utils/date.ts';
import { getPersonalizedACWRThresholds } from '../calculateACWR.ts';

// ─── Constants ─────────────────────────────────────────────────

/**
 * Recovery windows (in hours) by activity type + intensity threshold.
 * If actual intensity >= threshold, enforce the full recovery window
 * before the next high-intensity session.
 */
const RECOVERY_WINDOWS: Record<string, { threshold: number; hours: number }> = {
    sparring: { threshold: 7, hours: 48 },
    boxing_practice: { threshold: 8, hours: 36 },
    sc: { threshold: 7, hours: 36 },
    running: { threshold: 8, hours: 24 },
    road_work: { threshold: 7, hours: 24 },
    conditioning: { threshold: 7, hours: 24 },
    active_recovery: { threshold: 10, hours: 0 },  // never blocks
    rest: { threshold: 10, hours: 0 },
    other: { threshold: 8, hours: 24 },
};

/**
 * CNS cost coefficients per activity type.
 * Multiplied by (intensity / 10) to get the CNS load for a session.
 */
const CNS_COEFFICIENTS: Record<string, number> = {
    sparring: 10,
    boxing_practice: 6,
    sc: 8,
    running: 4,
    road_work: 5,
    conditioning: 6,
    active_recovery: 1,
    rest: 0,
    other: 5,
};

/** Max high-CNS sessions (intensity >= 7) per 72h window. */
const MAX_HIGH_CNS_PER_72H = 2;

/** ACWR thresholds. */
const ACWR_DANGER = 1.5;

/** Weekly intensity caps by phase (max high-intensity sessions). */
const PHASE_HIGH_INTENSITY_CAPS: Record<Phase, number> = {
    'off-season': 4,
    'pre-camp': 4,
    'fight-camp': 3,
    'camp-base': 4,
    'camp-build': 3,
    'camp-peak': 3,
    'camp-taper': 2,
};

// ─── Helpers ───────────────────────────────────────────────────

function isHighIntensity(intensity: number): boolean {
    return intensity >= 7;
}

function dateFromISO(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
}

function addDays(dateStr: string, days: number): string {
    const d = dateFromISO(dateStr);
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
}

function daysBetween(a: string, b: string): number {
    const da = dateFromISO(a).getTime();
    const db = dateFromISO(b).getTime();
    return Math.abs(db - da) / (1000 * 60 * 60 * 24);
}

function getCNSLoad(activityType: ActivityType, intensity: number): number {
    const coeff = CNS_COEFFICIENTS[activityType] ?? 5;
    return coeff * (intensity / 10);
}

function getSessionLoad(durationMin: number, intensity: number): number {
    return durationMin * intensity;
}

function getDefaultChronicLoad(fitnessLevel: FitnessLevel): number {
    const baseByFitness: Record<FitnessLevel, number> = {
        beginner: 500,
        intermediate: 850,
        advanced: 1200,
        elite: 1600,
    };
    return baseByFitness[fitnessLevel] ?? 850;
}

function computeWeekLoadMetrics(
    weekActivities: Pick<ScheduledActivityRow, 'estimated_duration_min' | 'expected_intensity' | 'date'>[],
): {
    totalWeeklyLoad: number;
    monotony: number;
    strain: number;
    rollingFatigueRatio: number;
    rollingFatigueScore: number;
    fatigueBand: 'low' | 'moderate' | 'high' | 'very_high';
} {
    const totalWeeklyLoad = weekActivities.reduce(
        (sum, a) => sum + getSessionLoad(a.estimated_duration_min, a.expected_intensity),
        0,
    );

    if (weekActivities.length === 0) {
        return {
            totalWeeklyLoad: 0,
            monotony: 0,
            strain: 0,
            rollingFatigueRatio: 0,
            rollingFatigueScore: 0,
            fatigueBand: 'low',
        };
    }

    const sortedDates = Array.from(new Set(weekActivities.map((a) => a.date))).sort();
    const start = sortedDates[0] ?? todayLocalDate();
    const byDate = new Map<string, number>();
    for (const a of weekActivities) {
        byDate.set(a.date, (byDate.get(a.date) ?? 0) + getSessionLoad(a.estimated_duration_min, a.expected_intensity));
    }

    const dailyLoads: number[] = [];
    for (let i = 0; i < 7; i++) {
        const day = addDays(start, i);
        dailyLoads.push(byDate.get(day) ?? 0);
    }

    const avg7 = dailyLoads.reduce((sum, v) => sum + v, 0) / 7;
    const variance = dailyLoads.reduce((sum, v) => sum + ((v - avg7) ** 2), 0) / 7;
    const sd7 = Math.sqrt(variance);
    const monotony = totalWeeklyLoad <= 0
        ? 0
        : (sd7 < 1 ? 4 : Math.max(0, Math.min(6, avg7 / sd7)));
    const strain = Math.round(totalWeeklyLoad * monotony);

    const avg3 = (dailyLoads[4] + dailyLoads[5] + dailyLoads[6]) / 3;
    const rollingFatigueRatio = avg7 > 0 ? avg3 / avg7 : 0;
    const ratioComponent = Math.max(0, Math.min(1, (rollingFatigueRatio - 0.9) / 0.6)) * 70;
    const monotonyComponent = Math.max(0, Math.min(1, (monotony - 1.5) / 1.5)) * 30;
    const rollingFatigueScore = Math.round((ratioComponent + monotonyComponent) * 10) / 10;

    const fatigueBand = rollingFatigueScore >= 80
        ? 'very_high'
        : rollingFatigueScore >= 60
            ? 'high'
            : rollingFatigueScore >= 35
                ? 'moderate'
                : 'low';

    return {
        totalWeeklyLoad: Math.round(totalWeeklyLoad),
        monotony: Math.round(monotony * 100) / 100,
        strain,
        rollingFatigueRatio: Math.round(rollingFatigueRatio * 100) / 100,
        rollingFatigueScore,
        fatigueBand,
    };
}

function getAcwrPlanningThresholds(
    fitnessLevel: FitnessLevel,
    phase: Phase,
    isOnActiveCut: boolean,
    metrics?: {
        totalWeeklyLoad: number;
        monotony: number;
        strain: number;
        rollingFatigueRatio: number;
        rollingFatigueScore: number;
        fatigueBand: 'low' | 'moderate' | 'high' | 'very_high';
    },
): { caution: number; redline: number } {
    const fallbackMetrics = metrics ?? {
        totalWeeklyLoad: getDefaultChronicLoad(fitnessLevel),
        monotony: 1.3,
        strain: Math.round(getDefaultChronicLoad(fitnessLevel) * 1.3),
        rollingFatigueRatio: 1,
        rollingFatigueScore: 40,
        fatigueBand: 'moderate' as const,
    };

    const thresholds = getPersonalizedACWRThresholds({
        fitnessLevel,
        phase,
        isOnActiveCut,
        daysOfData: 21,
        chronicLoad: fallbackMetrics.totalWeeklyLoad,
        loadMetrics: {
            weeklyLoad: fallbackMetrics.totalWeeklyLoad,
            monotony: fallbackMetrics.monotony,
            strain: fallbackMetrics.strain,
            acuteEWMA: fallbackMetrics.totalWeeklyLoad,
            chronicEWMA: fallbackMetrics.totalWeeklyLoad,
            rollingFatigueRatio: fallbackMetrics.rollingFatigueRatio,
            rollingFatigueScore: fallbackMetrics.rollingFatigueScore,
            fatigueBand: fallbackMetrics.fatigueBand,
            safetyThreshold: 1.3,
            thresholdSource: 'standard_chronic',
        },
    });

    return {
        caution: thresholds.caution,
        redline: thresholds.redline,
    };
}

function buildDayLoadMap(
    activities: Pick<ScheduledActivityRow | WeekPlanEntry, 'date' | 'estimated_duration_min' | 'expected_intensity'>[],
): Map<string, number> {
    const map = new Map<string, number>();
    for (const a of activities) {
        if (!a.date) continue;
        const load = getSessionLoad(a.estimated_duration_min, a.expected_intensity);
        map.set(a.date, (map.get(a.date) ?? 0) + load);
    }
    return map;
}

function findCandidateDays(
    weekStartDate: string,
    activities: Pick<ScheduledActivityRow | WeekPlanEntry, 'date' | 'activity_type' | 'expected_intensity' | 'estimated_duration_min'>[],
    dayLoads: Map<string, number>,
    filter: (dayActs: typeof activities) => boolean,
    _loadCap: number,
): string[] {
    const candidates: string[] = [];
    for (let offset = 0; offset < 7; offset++) {
        const date = addDays(weekStartDate, offset);
        const dayActs = activities.filter(a => a.date === date);
        if (filter(dayActs)) {
            candidates.push(date);
        }
    }
    return candidates.sort((a, b) => (dayLoads.get(a) ?? 0) - (dayLoads.get(b) ?? 0));
}

// ─── getRecoveryWindow ─────────────────────────────────────────

/**
 * Returns hours of recommended recovery before the next high-intensity session.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getRecoveryWindow(
    activityType: ActivityType,
    intensity: number,
): number {
    const config = RECOVERY_WINDOWS[activityType] ?? { threshold: 8, hours: 24 };
    if (intensity >= config.threshold) {
        return config.hours;
    }
    // Low intensity → minimal recovery window
    return Math.max(0, Math.floor(config.hours * 0.3));
}

// ─── validateDayLoad ──────────────────────────────────────────

/**
 * Checks if a day's combined CNS/sRPE load is scientifically safe.
 * Returns a validation object.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function validateDayLoad(
    activities: Pick<ScheduledActivityRow, 'activity_type' | 'expected_intensity' | 'estimated_duration_min'>[],
): DayLoadValidation {
    if (activities.length === 0) {
        return {
            safe: true,
            totalLoad: 0,
            totalCNS: 0,
            activitiesCount: 0,
            message: 'Rest day. No activities scheduled.',
        };
    }

    let totalLoad = 0;
    let totalCNS = 0;

    for (const a of activities) {
        totalLoad += getSessionLoad(a.estimated_duration_min, a.expected_intensity);
        totalCNS += getCNSLoad(a.activity_type as ActivityType, a.expected_intensity);
    }

    const highIntensityCount = activities.filter(a => isHighIntensity(a.expected_intensity)).length;

    // Safety checks
    const issues: string[] = [];

    if (highIntensityCount > 2) {
        issues.push(`${highIntensityCount} high-intensity sessions in one day is excessive — risk of overreaching and accumulated CNS fatigue.`);
    }

    if (totalCNS > 16) {
        issues.push(`Combined CNS load of ${totalCNS.toFixed(1)} exceeds the safe daily threshold (16). Your nervous system needs time to recover between demanding efforts.`);
    }

    if (totalLoad > 800) {
        issues.push(`Total session load of ${totalLoad} exceeds the recommended daily cap (800). This level of volume increases injury risk and delays recovery.`);
    }

    // Check sparring + heavy SC on same day
    const hasSparring = activities.some(a => a.activity_type === 'sparring' && a.expected_intensity >= 7);
    const hasHeavySC = activities.some(a => a.activity_type === 'sc' && a.expected_intensity >= 7);
    if (hasSparring && hasHeavySC) {
        issues.push('Heavy sparring and heavy S&C in the same day creates excessive CNS stress. Consider moving one to an adjacent day or reducing intensity.');
    }

    const safe = issues.length === 0;
    const message = safe
        ? `Day load looks good. ${activities.length} session(s), total load ${totalLoad}, CNS ${totalCNS.toFixed(1)}.`
        : issues.join(' ');

    return { safe, totalLoad, totalCNS, activitiesCount: activities.length, message };
}

// ─── suggestAlternative ───────────────────────────────────────

/**
 * When readiness is Depleted and a high-intensity session is scheduled,
 * suggest a lighter alternative with educational explanation.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function suggestAlternative(
    activity: Pick<ScheduledActivityRow, 'activity_type' | 'expected_intensity' | 'custom_label'>,
    readinessState: ReadinessState,
    trainingIntensityCap?: number | null,
    constraintSet?: StimulusConstraintSet | null,
): { shouldSwap: boolean; alternative: ActivityType; message: string } {
    const intensity = activity.expected_intensity;
    const type = activity.activity_type as ActivityType;
    const label = activity.custom_label ?? type.replace(/_/g, ' ');

    // Weight cut intensity cap overrides readiness logic
    if (trainingIntensityCap != null && intensity > trainingIntensityCap) {
        const altType: ActivityType = trainingIntensityCap <= 2 ? 'rest' : 'active_recovery';
        return {
            shouldSwap: true,
            alternative: altType,
            message: `Weight cut protocol caps training at RPE ${trainingIntensityCap}. "${label}" at intensity ${intensity}/10 exceeds this limit. ` +
                (trainingIntensityCap <= 2
                    ? 'Rest only - no physical activity during this weight-class safety phase.'
                    : trainingIntensityCap <= 4
                        ? 'Light shadow boxing or stretching only during fight week.'
                        : 'Reduce intensity to stay within your cut protocol.'),
        };
    }

    if (readinessState === 'Prime') {
        return {
            shouldSwap: false,
            alternative: type,
            message: 'You are in peak readiness. Execute the planned work and keep quality high.',
        };
    }

    if (readinessState === 'Caution' && intensity < 7) {
        return {
            shouldSwap: false,
            alternative: type,
            message: 'Readiness is moderate. This session intensity is manageable — listen to your body and adjust mid-session if needed.',
        };
    }

    // Build swap suggestions by activity type
    const swapMap: Record<string, { alt: ActivityType; desc: string }> = {
        sparring: {
            alt: 'boxing_practice',
            desc: 'Technical pad work at 50% intensity. This keeps your timing sharp without the concussive CNS impact of live sparring.',
        },
        sc: {
            alt: constraintSet?.allowedStimuli.includes('controlled_strength') ? 'sc' : 'active_recovery',
            desc: constraintSet?.allowedStimuli.includes('controlled_strength')
                ? 'Keep the lift intent, but swap to a lower-cost machine or controlled unilateral strength block.'
                : 'Mobility and light movement work. Your nervous system is taxed — heavy lifting in this state increases injury risk by ~40% and reduces strength output.',
        },
        running: {
            alt: 'active_recovery',
            desc: 'Easy walk or light yoga. Your cardiovascular system recovers faster with gentle movement than complete rest.',
        },
        conditioning: {
            alt: constraintSet?.allowedStimuli.includes('aerobic_conditioning') ? 'road_work' : 'active_recovery',
            desc: constraintSet?.allowedStimuli.includes('aerobic_conditioning')
                ? 'Swap to a lower-cost aerobic touch like bike, easy run, or jump rope instead of hard intervals.'
                : 'Light stretching and foam rolling. Pushing conditioning while depleted delays recovery without meaningful fitness gains.',
        },
        boxing_practice: {
            alt: 'boxing_practice',
            desc: 'Keep the session technical only — crisp drills, lower impact, no hard live work.',
        },
    };

    const swap = swapMap[type];
    if (!swap) {
        return {
            shouldSwap: false,
            alternative: type,
            message: 'No specific alternative available. Consider reducing intensity to RPE 4-5.',
        };
    }

    const stateLabel = readinessState === 'Depleted' ? 'Depleted' : 'in Caution';

    return {
        shouldSwap: true,
        alternative: swap.alt,
        message: `Your readiness is ${stateLabel}. "${label}" at intensity ${intensity}/10 is not recommended. Suggested: ${swap.desc}`,
    };
}

export {
    MAX_HIGH_CNS_PER_72H,
    ACWR_DANGER,
    PHASE_HIGH_INTENSITY_CAPS,
    isHighIntensity,
    dateFromISO,
    addDays,
    daysBetween,
    getSessionLoad,
    getDefaultChronicLoad,
    computeWeekLoadMetrics,
    getAcwrPlanningThresholds,
    buildDayLoadMap,
    findCandidateDays,
};
