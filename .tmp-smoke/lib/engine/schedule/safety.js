"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustNutritionForDay = adjustNutritionForDay;
exports.detectOvertrainingRisk = detectOvertrainingRisk;
const loadAndValidation_1 = require("./loadAndValidation");
function adjustNutritionForDay(baseTargets, dayActivities, trainingIntensityCap) {
    if (dayActivities.length === 0 || dayActivities.every(a => a.activity_type === 'rest')) {
        return {
            carbModifierPct: -10,
            calorieModifier: Math.round(baseTargets.adjustedCalories * -0.08),
            proteinModifier: 0,
            hydrationBoostOz: 0,
            message: 'Rest day detected. Carbs reduced by 10% and calories slightly lowered. Your body uses fewer carbohydrates when not training, so excess carbs on rest days can slow body composition goals.',
        };
    }
    let hasSparring = false;
    let hasHeavySC = false;
    let hasRunning = false;
    for (const a of dayActivities) {
        if (a.activity_type === 'sparring')
            hasSparring = true;
        if (a.activity_type === 'sc' && a.expected_intensity >= 7)
            hasHeavySC = true;
        if (a.activity_type === 'running')
            hasRunning = true;
    }
    const isDoubleSession = dayActivities.filter(a => a.activity_type !== 'rest' && a.activity_type !== 'active_recovery').length >= 2;
    // Build modifiers
    let carbMod = 0;
    let calMod = 0;
    let proteinMod = 0;
    let waterBoost = 0;
    const reasons = [];
    if (hasSparring) {
        carbMod += 15;
        calMod += 200;
        waterBoost += 16;
        reasons.push('Sparring day â€” carbs increased by 15% to fuel explosive output and replenish glycogen. Extra 200 calories to cover the high metabolic demand. +16oz water for sweat losses.');
    }
    if (hasHeavySC) {
        carbMod += 10;
        calMod += 150;
        proteinMod += 10;
        reasons.push('Heavy S&C â€” carbs up 10% to fuel strength work, extra protein for muscle protein synthesis.');
    }
    if (hasRunning) {
        carbMod += 5;
        calMod += 100;
        waterBoost += 12;
        reasons.push('Running session â€” moderate carb and calorie increase for sustained energy. Extra hydration for cardiovascular work.');
    }
    if (isDoubleSession) {
        carbMod += 10;
        calMod += 200;
        waterBoost += 8;
        reasons.push('Double session day â€” significant additional fuel needed. Your body burns substantially more glycogen across multiple training bouts.');
    }
    // Cap modifiers at reasonable limits
    carbMod = Math.min(carbMod, 35);
    calMod = Math.min(calMod, 600);
    // Weight cut intensity cap: clamp positive nutrition boosts
    if (trainingIntensityCap != null && trainingIntensityCap > 0) {
        if (trainingIntensityCap <= 4) {
            // Fight week: zero out all positive calorie/carb boosts
            if (carbMod > 0 || calMod > 0) {
                carbMod = 0;
                calMod = 0;
                proteinMod = 0;
                reasons.length = 0;
                reasons.push('Weight cut fight week â€” all calorie and carb boosts suppressed. Your cut protocol macros take priority over activity-based adjustments.');
            }
        }
        else if (trainingIntensityCap <= 8) {
            // Intensified phase: halve positive modifiers
            if (carbMod > 0 || calMod > 0) {
                carbMod = Math.round(carbMod * 0.5);
                calMod = Math.round(calMod * 0.5);
                proteinMod = Math.round(proteinMod * 0.5);
                reasons.push('Active weight cut â€” activity-based calorie and carb boosts halved to stay within your deficit.');
            }
        }
    }
    return {
        carbModifierPct: carbMod,
        calorieModifier: calMod,
        proteinModifier: proteinMod,
        hydrationBoostOz: waterBoost,
        message: reasons.join(' ') || 'Standard training day â€” no special adjustments needed.',
    };
}
// â”€â”€â”€ detectOvertrainingRisk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Analyzes the week's planned load, ACWR trend, and sleep quality
 * to detect overtraining risks and provide recommendations.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
function detectOvertrainingRisk(weekActivities, acwr, sleepTrendAvg, isOnActiveCut = false, context) {
    const warnings = [];
    const fitnessLevel = context?.fitnessLevel ?? 'intermediate';
    const phase = context?.phase ?? 'off-season';
    const weeklyMetrics = (0, loadAndValidation_1.computeWeekLoadMetrics)(weekActivities);
    const totalWeeklyLoad = weeklyMetrics.totalWeeklyLoad;
    const thresholds = (0, loadAndValidation_1.getAcwrPlanningThresholds)(fitnessLevel, phase, isOnActiveCut, weeklyMetrics);
    // 1. Count high-intensity sessions
    const highIntensitySessions = weekActivities.filter((a) => (0, loadAndValidation_1.isHighIntensity)(a.expected_intensity));
    // 2. ACWR check using personalized thresholds
    const dangerThreshold = thresholds.redline;
    const cautionThreshold = thresholds.caution;
    if (acwr > dangerThreshold) {
        warnings.push({
            severity: 'danger',
            title: isOnActiveCut ? 'Overtraining Risk During Weight Cut' : 'ACWR Spike Detected',
            message: isOnActiveCut
                ? `Your ACWR is ${acwr.toFixed(2)} while on an active cut, above your personalized redline of ${dangerThreshold.toFixed(2)}.`
                : `Your ACWR is ${acwr.toFixed(2)}, above your personalized redline of ${dangerThreshold.toFixed(2)}.`,
            recommendation: isOnActiveCut
                ? 'Drop at least 2 high-intensity sessions this week and replace with active recovery.'
                : 'Drop at least 1 high-intensity session this week and reduce intensity across remaining sessions.',
        });
    }
    else if (acwr > cautionThreshold) {
        warnings.push({
            severity: 'caution',
            title: isOnActiveCut ? 'Elevated Load During Weight Cut' : 'Training Load Trending High',
            message: isOnActiveCut
                ? `Your ACWR is ${acwr.toFixed(2)} and exceeds your personalized caution threshold (${cautionThreshold.toFixed(2)}).`
                : `Your ACWR is ${acwr.toFixed(2)}, above your personalized caution threshold (${cautionThreshold.toFixed(2)}).`,
            recommendation: isOnActiveCut
                ? 'Keep at least 2 sessions lighter this week and prioritize recovery nutrition.'
                : 'Keep one session lighter this week to avoid crossing into the redline zone.',
        });
    }
    // 3. Phase-specific weekly high-intensity cap
    const phaseCap = loadAndValidation_1.PHASE_HIGH_INTENSITY_CAPS[phase] ?? 4;
    const highCap = isOnActiveCut ? Math.max(2, phaseCap - 1) : phaseCap;
    if (highIntensitySessions.length > highCap) {
        warnings.push({
            severity: 'caution',
            title: 'Too Many Intense Sessions',
            message: `You have ${highIntensitySessions.length} high-intensity sessions planned this week. More than ${highCap} per week increases cumulative fatigue and diminishes returns.`,
            recommendation: `Convert ${highIntensitySessions.length - highCap} session(s) to moderate intensity (RPE 5-6) or active recovery.`,
        });
    }
    // 4. Sleep check
    if (sleepTrendAvg > 0 && sleepTrendAvg < 3.0) {
        warnings.push({
            severity: 'danger',
            title: 'Poor Sleep Quality',
            message: `Your 3-day sleep average is ${sleepTrendAvg.toFixed(1)}/5. Sleep below 3.0 significantly impairs recovery and increases injury risk.`,
            recommendation: 'Reduce all session intensities by 2 points until sleep improves. Prioritize sleep hygiene over training volume.',
        });
    }
    // 5. Load cap check (lower during active cut)
    const loadCap = isOnActiveCut ? 4000 : 5000;
    if (totalWeeklyLoad > loadCap) {
        warnings.push({
            severity: 'caution',
            title: isOnActiveCut ? 'Weekly Load Too High for Cut' : 'Weekly Load Cap Exceeded',
            message: isOnActiveCut
                ? `Total planned load for the week is ${totalWeeklyLoad}. During a weight cut, the recommended cap is ${loadCap}.`
                : `Total planned load for the week is ${totalWeeklyLoad}. This exceeds the recommended ${loadCap} cap for most athletes.`,
            recommendation: 'Trim shorter conditioning sessions or reduce intensities on existing sessions.',
        });
    }
    // 6. Monotony and strain checks
    const monotonyCaution = isOnActiveCut ? 1.7 : 1.9;
    const monotonyDanger = isOnActiveCut ? 2.1 : 2.3;
    if (weeklyMetrics.monotony >= monotonyDanger) {
        warnings.push({
            severity: 'danger',
            title: 'Load Monotony Too High',
            message: `Weekly monotony is ${weeklyMetrics.monotony.toFixed(2)}. Repeating similar daily loads without variation increases overuse risk.`,
            recommendation: 'Insert at least 1 low-load day and vary session intensities across the week.',
        });
    }
    else if (weeklyMetrics.monotony >= monotonyCaution) {
        warnings.push({
            severity: 'caution',
            title: 'Elevated Load Monotony',
            message: `Weekly monotony is ${weeklyMetrics.monotony.toFixed(2)}. Load distribution may be too uniform for optimal recovery.`,
            recommendation: 'Alternate heavy and light days to improve adaptation and reduce fatigue carryover.',
        });
    }
    const strainCaution = isOnActiveCut ? 5000 : 6500;
    const strainDanger = isOnActiveCut ? 6500 : 8000;
    if (weeklyMetrics.strain >= strainDanger) {
        warnings.push({
            severity: 'danger',
            title: 'Weekly Strain Is Excessive',
            message: `Weekly strain is ${weeklyMetrics.strain}, which is above the danger threshold of ${strainDanger}.`,
            recommendation: 'Reduce either session duration or intensity in 2-3 sessions this week.',
        });
    }
    else if (weeklyMetrics.strain >= strainCaution) {
        warnings.push({
            severity: 'caution',
            title: 'Weekly Strain Is High',
            message: `Weekly strain is ${weeklyMetrics.strain}, above the caution threshold of ${strainCaution}.`,
            recommendation: 'Reduce at least one demanding session this week to protect recovery capacity.',
        });
    }
    if (weeklyMetrics.rollingFatigueScore >= 75) {
        warnings.push({
            severity: 'danger',
            title: 'Rolling Fatigue Very High',
            message: `Rolling fatigue score is ${weeklyMetrics.rollingFatigueScore.toFixed(1)} (${weeklyMetrics.fatigueBand}).`,
            recommendation: 'Plan a recovery-focused 48 hours before your next hard session.',
        });
    }
    else if (weeklyMetrics.rollingFatigueScore >= 60) {
        warnings.push({
            severity: 'caution',
            title: 'Rolling Fatigue Building',
            message: `Rolling fatigue score is ${weeklyMetrics.rollingFatigueScore.toFixed(1)}.`,
            recommendation: 'Keep the next high-intensity session short and add extra sleep and hydration focus.',
        });
    }
    // 7. Check for 72h high-CNS density
    const sortedHigh = highIntensitySessions
        .map((a) => ({ ...a, dateMs: (0, loadAndValidation_1.dateFromISO)(a.date).getTime() }))
        .sort((a, b) => a.dateMs - b.dateMs);
    for (let i = 0; i < sortedHigh.length; i++) {
        const windowEnd = sortedHigh[i].dateMs + 72 * 60 * 60 * 1000;
        const inWindow = sortedHigh.filter((s) => s.dateMs >= sortedHigh[i].dateMs && s.dateMs <= windowEnd);
        if (inWindow.length > loadAndValidation_1.MAX_HIGH_CNS_PER_72H) {
            warnings.push({
                severity: 'caution',
                title: 'CNS Density Too High',
                message: `${inWindow.length} high-intensity sessions within a 72-hour window. Your CNS needs more spacing between demanding efforts.`,
                recommendation: 'Space high-intensity sessions at least 36-48 hours apart.',
            });
            break;
        }
    }
    return warnings;
}
