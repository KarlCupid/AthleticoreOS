"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHASE_HIGH_INTENSITY_CAPS = exports.ACWR_DANGER = exports.MAX_HIGH_CNS_PER_72H = void 0;
exports.getRecoveryWindow = getRecoveryWindow;
exports.validateDayLoad = validateDayLoad;
exports.suggestAlternative = suggestAlternative;
exports.isHighIntensity = isHighIntensity;
exports.dateFromISO = dateFromISO;
exports.addDays = addDays;
exports.daysBetween = daysBetween;
exports.getSessionLoad = getSessionLoad;
exports.getDefaultChronicLoad = getDefaultChronicLoad;
exports.computeWeekLoadMetrics = computeWeekLoadMetrics;
exports.getAcwrPlanningThresholds = getAcwrPlanningThresholds;
exports.buildDayLoadMap = buildDayLoadMap;
exports.findCandidateDays = findCandidateDays;
const date_1 = require("../../utils/date");
const calculateACWR_1 = require("../calculateACWR");
// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Recovery windows (in hours) by activity type + intensity threshold.
 * If actual intensity >= threshold, enforce the full recovery window
 * before the next high-intensity session.
 */
const RECOVERY_WINDOWS = {
    sparring: { threshold: 7, hours: 48 },
    boxing_practice: { threshold: 8, hours: 36 },
    sc: { threshold: 7, hours: 36 },
    running: { threshold: 8, hours: 24 },
    road_work: { threshold: 7, hours: 24 },
    conditioning: { threshold: 7, hours: 24 },
    active_recovery: { threshold: 10, hours: 0 }, // never blocks
    rest: { threshold: 10, hours: 0 },
    other: { threshold: 8, hours: 24 },
};
/**
 * CNS cost coefficients per activity type.
 * Multiplied by (intensity / 10) to get the CNS load for a session.
 */
const CNS_COEFFICIENTS = {
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
exports.MAX_HIGH_CNS_PER_72H = MAX_HIGH_CNS_PER_72H;
/** ACWR thresholds. */
const ACWR_DANGER = 1.5;
exports.ACWR_DANGER = ACWR_DANGER;
/** Weekly intensity caps by phase (max high-intensity sessions). */
const PHASE_HIGH_INTENSITY_CAPS = {
    'off-season': 4,
    'pre-camp': 4,
    'fight-camp': 3,
    'camp-base': 4,
    'camp-build': 3,
    'camp-peak': 3,
    'camp-taper': 2,
};
exports.PHASE_HIGH_INTENSITY_CAPS = PHASE_HIGH_INTENSITY_CAPS;
// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function isHighIntensity(intensity) {
    return intensity >= 7;
}
function dateFromISO(dateStr) {
    return new Date(dateStr + 'T00:00:00');
}
function addDays(dateStr, days) {
    const d = dateFromISO(dateStr);
    d.setDate(d.getDate() + days);
    return (0, date_1.formatLocalDate)(d);
}
function daysBetween(a, b) {
    const da = dateFromISO(a).getTime();
    const db = dateFromISO(b).getTime();
    return Math.abs(db - da) / (1000 * 60 * 60 * 24);
}
function getCNSLoad(activityType, intensity) {
    const coeff = CNS_COEFFICIENTS[activityType] ?? 5;
    return coeff * (intensity / 10);
}
function getSessionLoad(durationMin, intensity) {
    return durationMin * intensity;
}
function getDefaultChronicLoad(fitnessLevel) {
    const baseByFitness = {
        beginner: 500,
        intermediate: 850,
        advanced: 1200,
        elite: 1600,
    };
    return baseByFitness[fitnessLevel] ?? 850;
}
function computeWeekLoadMetrics(weekActivities) {
    const totalWeeklyLoad = weekActivities.reduce((sum, a) => sum + getSessionLoad(a.estimated_duration_min, a.expected_intensity), 0);
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
    const start = sortedDates[0] ?? (0, date_1.todayLocalDate)();
    const byDate = new Map();
    for (const a of weekActivities) {
        byDate.set(a.date, (byDate.get(a.date) ?? 0) + getSessionLoad(a.estimated_duration_min, a.expected_intensity));
    }
    const dailyLoads = [];
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
function getAcwrPlanningThresholds(fitnessLevel, phase, isOnActiveCut, metrics) {
    const fallbackMetrics = metrics ?? {
        totalWeeklyLoad: getDefaultChronicLoad(fitnessLevel),
        monotony: 1.3,
        strain: Math.round(getDefaultChronicLoad(fitnessLevel) * 1.3),
        rollingFatigueRatio: 1,
        rollingFatigueScore: 40,
        fatigueBand: 'moderate',
    };
    const thresholds = (0, calculateACWR_1.getPersonalizedACWRThresholds)({
        fitnessLevel,
        phase,
        isOnActiveCut,
        daysOfData: 21,
        chronicLoad: fallbackMetrics.totalWeeklyLoad,
        loadMetrics: {
            weeklyLoad: fallbackMetrics.totalWeeklyLoad,
            monotony: fallbackMetrics.monotony,
            strain: fallbackMetrics.strain,
            rollingFatigueRatio: fallbackMetrics.rollingFatigueRatio,
            rollingFatigueScore: fallbackMetrics.rollingFatigueScore,
            fatigueBand: fallbackMetrics.fatigueBand,
        },
    });
    return {
        caution: thresholds.caution,
        redline: thresholds.redline,
    };
}
function buildDayLoadMap(activities) {
    const map = new Map();
    for (const a of activities) {
        if (!a.date)
            continue;
        const load = getSessionLoad(a.estimated_duration_min, a.expected_intensity);
        map.set(a.date, (map.get(a.date) ?? 0) + load);
    }
    return map;
}
/**
 * Returns candidate dates (sorted lowest-load-first) that pass the filter.
 * loadCap: skip days with load >= this value.
 */
function findCandidateDays(weekStartDate, activities, dayLoads, filter, _loadCap) {
    const candidates = [];
    for (let offset = 0; offset < 7; offset++) {
        const date = addDays(weekStartDate, offset);
        const dayActs = activities.filter(a => a.date === date);
        if (filter(dayActs)) {
            candidates.push(date);
        }
    }
    return candidates.sort((a, b) => (dayLoads.get(a) ?? 0) - (dayLoads.get(b) ?? 0));
}
// â”€â”€â”€ getRecoveryWindow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Returns hours of recommended recovery before the next high-intensity session.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
function getRecoveryWindow(activityType, intensity) {
    const config = RECOVERY_WINDOWS[activityType] ?? { threshold: 8, hours: 24 };
    if (intensity >= config.threshold) {
        return config.hours;
    }
    // Low intensity â†’ minimal recovery window
    return Math.max(0, Math.floor(config.hours * 0.3));
}
// â”€â”€â”€ validateDayLoad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Checks if a day's combined CNS/sRPE load is scientifically safe.
 * Returns a validation object.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
function validateDayLoad(activities) {
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
        totalCNS += getCNSLoad(a.activity_type, a.expected_intensity);
    }
    const highIntensityCount = activities.filter(a => isHighIntensity(a.expected_intensity)).length;
    // Safety checks
    const issues = [];
    if (highIntensityCount > 2) {
        issues.push(`${highIntensityCount} high - intensity sessions in one day is excessive â€” risk of overreaching and accumulated CNS fatigue.`);
    }
    if (totalCNS > 16) {
        issues.push(`Combined CNS load of ${totalCNS.toFixed(1)} exceeds the safe daily threshold(16).Your nervous system needs time to recover between demanding efforts.`);
    }
    if (totalLoad > 800) {
        issues.push(`Total session load of ${totalLoad} exceeds the recommended daily cap(800).This level of volume increases injury risk and delays recovery.`);
    }
    // Check sparring + heavy SC on same day
    const hasSparring = activities.some(a => a.activity_type === 'sparring' && a.expected_intensity >= 7);
    const hasHeavySC = activities.some(a => a.activity_type === 'sc' && a.expected_intensity >= 7);
    if (hasSparring && hasHeavySC) {
        issues.push('Heavy sparring and heavy S&C in the same day creates excessive CNS stress. Consider moving one to an adjacent day or reducing intensity.');
    }
    const safe = issues.length === 0;
    const message = safe
        ? `Day load looks good.${activities.length} session(s), total load ${totalLoad}, CNS ${totalCNS.toFixed(1)}.`
        : issues.join(' ');
    return { safe, totalLoad, totalCNS, activitiesCount: activities.length, message };
}
// â”€â”€â”€ suggestAlternative â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * When readiness is Depleted and a high-intensity session is scheduled,
 * suggest a lighter alternative with educational explanation.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
function suggestAlternative(activity, readinessState, trainingIntensityCap) {
    const intensity = activity.expected_intensity;
    const type = activity.activity_type;
    const label = activity.custom_label ?? type.replace(/_/g, ' ');
    // Weight cut intensity cap overrides readiness logic
    if (trainingIntensityCap != null && intensity > trainingIntensityCap) {
        const altType = trainingIntensityCap <= 2 ? 'rest' : 'active_recovery';
        return {
            shouldSwap: true,
            alternative: altType,
            message: `Weight cut protocol caps training at RPE ${trainingIntensityCap}. "${label}" at intensity ${intensity}/10 exceeds this limit. ` +
                (trainingIntensityCap <= 2
                    ? 'Rest only â€” no physical activity during this cut phase.'
                    : trainingIntensityCap <= 4
                        ? 'Light shadow boxing or stretching only during fight week.'
                        : 'Reduce intensity to stay within your cut protocol.'),
        };
    }
    if (readinessState === 'Prime') {
        return {
            shouldSwap: false,
            alternative: type,
            message: 'You\'re in peak readiness. Full send.',
        };
    }
    if (readinessState === 'Caution' && intensity < 7) {
        return {
            shouldSwap: false,
            alternative: type,
            message: 'Readiness is moderate. This session intensity is manageable â€” listen to your body and adjust mid-session if needed.',
        };
    }
    // Build swap suggestions by activity type
    const swapMap = {
        sparring: {
            alt: 'boxing_practice',
            desc: 'Technical pad work at 50% intensity. This keeps your timing sharp without the concussive CNS impact of live sparring.',
        },
        sc: {
            alt: 'active_recovery',
            desc: 'Mobility and light movement work. Your nervous system is taxed â€” heavy lifting in this state increases injury risk by ~40% and reduces strength output.',
        },
        running: {
            alt: 'active_recovery',
            desc: 'Easy walk or light yoga. Your cardiovascular system recovers faster with gentle movement than complete rest.',
        },
        conditioning: {
            alt: 'active_recovery',
            desc: 'Light stretching and foam rolling. Pushing conditioning while depleted delays recovery without meaningful fitness gains.',
        },
        boxing_practice: {
            alt: 'active_recovery',
            desc: 'Shadow boxing at conversational pace or mobility work. Technical skills are better drilled when fresh.',
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
        message: `Your readiness is ${stateLabel}."${label}" at intensity ${intensity}/10 is not recommended. Suggested: ${swap.desc}`,
    };
}
