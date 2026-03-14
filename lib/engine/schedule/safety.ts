import {
  ScheduledActivityRow,
  NutritionDayAdjustment,
  NutritionTargets,
  OvertrainingWarning,
  FitnessLevel,
  Phase,
  FuelState,
} from '../types';
import {
  MAX_HIGH_CNS_PER_72H,
  PHASE_HIGH_INTENSITY_CAPS,
  computeWeekLoadMetrics,
  dateFromISO,
  getAcwrPlanningThresholds,
  isHighIntensity,
} from './loadAndValidation';
export function adjustNutritionForDay(
    baseTargets: NutritionTargets,
    dayActivities: Pick<ScheduledActivityRow, 'activity_type' | 'expected_intensity' | 'estimated_duration_min'>[],
    trainingIntensityCap?: number | null,
): NutritionDayAdjustment {
    const activeSessions = dayActivities.filter(
        (activity) => activity.activity_type !== 'rest' && activity.activity_type !== 'active_recovery',
    );
    const recoveryOnly = dayActivities.length > 0 && activeSessions.length === 0;

    if (dayActivities.length === 0 || dayActivities.every((activity) => activity.activity_type === 'rest')) {
        const reasons = [
            'Rest day detected. Pull carbohydrates and calories down slightly to match the lower workload without under-fueling recovery.',
        ];
        return {
            carbModifierPct: -15,
            calorieModifier: Math.round(baseTargets.adjustedCalories * -0.10),
            proteinModifier: 0,
            hydrationBoostOz: 0,
            fuelState: 'rest',
            sessionDemandScore: 0,
            reasons,
            message: reasons.join(' '),
        };
    }

    if (recoveryOnly) {
        const reasons = [
            'Only active recovery is scheduled. Keep protein steady, trim carbs slightly, and avoid turning a light day into a full training-feed day.',
        ];
        return {
            carbModifierPct: -5,
            calorieModifier: Math.round(baseTargets.adjustedCalories * -0.04),
            proteinModifier: 0,
            hydrationBoostOz: 4,
            fuelState: 'active_recovery',
            sessionDemandScore: 12,
            reasons,
            message: reasons.join(' '),
        };
    }

    let carbMod = 0;
    let calMod = 0;
    let proteinMod = 0;
    let waterBoost = 0;
    let demandScore = 0;
    let hasSparring = false;
    let hasHeavySC = false;
    let hasAerobic = false;
    const reasons: string[] = [];

    for (const activity of activeSessions) {
        const durationFactor = Math.max(0.75, activity.estimated_duration_min / 60);
        const intensityFactor = Math.max(0.75, activity.expected_intensity / 6);
        const sessionLoad = activity.estimated_duration_min * activity.expected_intensity;

        switch (activity.activity_type) {
            case 'sparring': {
                hasSparring = true;
                demandScore += Math.round((sessionLoad * 1.25) / 8);
                carbMod += Math.round(12 + durationFactor * 5 + intensityFactor * 3);
                calMod += Math.round(180 + durationFactor * 70);
                proteinMod += 8;
                waterBoost += Math.round(14 + durationFactor * 6);
                reasons.push('Sparring anchors the day. Carbs and hydration are pushed up to protect speed, repeat efforts, and glycogen recovery.');
                break;
            }
            case 'boxing_practice': {
                demandScore += Math.round((sessionLoad * 1.05) / 8);
                carbMod += Math.round(7 + durationFactor * 4);
                calMod += Math.round(100 + durationFactor * 50);
                waterBoost += Math.round(10 + durationFactor * 4);
                reasons.push('Boxing practice adds moderate glycolytic demand, so carbs and fluids are bumped to support skill quality.');
                break;
            }
            case 'sc': {
                const heavy = activity.expected_intensity >= 7;
                hasHeavySC ||= heavy;
                demandScore += Math.round((sessionLoad * (heavy ? 1.15 : 0.95)) / 8);
                carbMod += heavy ? Math.round(9 + intensityFactor * 3) : Math.round(5 + intensityFactor * 2);
                calMod += heavy ? Math.round(140 + durationFactor * 40) : Math.round(80 + durationFactor * 30);
                proteinMod += heavy ? 12 : 6;
                waterBoost += heavy ? 10 : 6;
                reasons.push(
                    heavy
                        ? 'Heavy S&C increases neural and glycogen demand, so both carbs and protein are raised.'
                        : 'Moderate S&C still needs a small carb and protein lift to keep training quality up.',
                );
                break;
            }
            case 'road_work':
            case 'running': {
                hasAerobic = true;
                demandScore += Math.round((sessionLoad * 0.95) / 8);
                carbMod += Math.round(6 + durationFactor * 4 + Math.max(0, intensityFactor - 1) * 2);
                calMod += Math.round(90 + durationFactor * 50);
                waterBoost += Math.round(12 + durationFactor * 5);
                reasons.push('Aerobic work raises fluid and carbohydrate demand, especially as duration climbs.');
                break;
            }
            case 'conditioning': {
                demandScore += Math.round((sessionLoad * 1.1) / 8);
                carbMod += Math.round(9 + durationFactor * 4 + intensityFactor * 2);
                calMod += Math.round(120 + durationFactor * 55);
                proteinMod += 5;
                waterBoost += Math.round(12 + durationFactor * 4);
                reasons.push('Conditioning adds repeated high-output work, so the engine lifts carbs, total calories, and hydration.');
                break;
            }
            default: {
                demandScore += Math.round(sessionLoad / 10);
                carbMod += 4;
                calMod += 60;
                waterBoost += 6;
                reasons.push('A mixed training session is scheduled, so the engine adds a conservative fuel bump.');
                break;
            }
        }
    }

    if (activeSessions.length >= 2) {
        demandScore += 18;
        carbMod += 8;
        calMod += 160;
        proteinMod += 4;
        waterBoost += 10;
        reasons.push('Multiple sessions stack demand across the day, so the fuel plan adds extra carbs, calories, and hydration.');
    }

    let fuelState: FuelState = 'aerobic';
    if (hasSparring) {
        fuelState = activeSessions.length >= 2 ? 'double_day' : 'spar_support';
    } else if (activeSessions.length >= 2) {
        fuelState = 'double_day';
    } else if (hasHeavySC) {
        fuelState = 'strength_power';
    } else if (hasAerobic) {
        fuelState = 'aerobic';
    }

    carbMod = Math.min(carbMod, 32);
    calMod = Math.min(calMod, 650);
    proteinMod = Math.min(proteinMod, 18);

    if (trainingIntensityCap != null && trainingIntensityCap > 0) {
        if (trainingIntensityCap <= 4) {
            carbMod = Math.min(carbMod, 0);
            calMod = Math.min(calMod, 0);
            proteinMod = Math.min(proteinMod, 4);
            fuelState = 'cut_protect';
            reasons.length = 0;
            reasons.push('Weight cut fight week is active, so performance boosts are suppressed and the cut-protection fuel state takes priority.');
        } else if (trainingIntensityCap <= 6) {
            carbMod = Math.round(carbMod * 0.4);
            calMod = Math.round(calMod * 0.4);
            proteinMod = Math.round(proteinMod * 0.6);
            reasons.push('Training is capped by the cut protocol, so performance fuel is reduced to stay inside the deficit.');
        } else if (trainingIntensityCap <= 8) {
            carbMod = Math.round(carbMod * 0.6);
            calMod = Math.round(calMod * 0.6);
            proteinMod = Math.round(proteinMod * 0.75);
            reasons.push('An active cut is in play, so the extra fuel is trimmed rather than fully removed.');
        }
    }

    demandScore = Math.max(0, Math.min(100, demandScore));

    return {
        carbModifierPct: carbMod,
        calorieModifier: calMod,
        proteinModifier: proteinMod,
        hydrationBoostOz: waterBoost,
        fuelState,
        sessionDemandScore: demandScore,
        reasons,
        message: reasons.join(' ') || 'Standard training day — no special adjustments needed.',
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
export function detectOvertrainingRisk(
    weekActivities: Pick<ScheduledActivityRow, 'activity_type' | 'expected_intensity' | 'estimated_duration_min' | 'date'>[],
    acwr: number,
    sleepTrendAvg: number,
    isOnActiveCut: boolean = false,
    context?: { fitnessLevel?: FitnessLevel; phase?: Phase },
): OvertrainingWarning[] {
    const warnings: OvertrainingWarning[] = [];
    const fitnessLevel = context?.fitnessLevel ?? 'intermediate';
    const phase = context?.phase ?? 'off-season';

    const weeklyMetrics = computeWeekLoadMetrics(weekActivities);
    const totalWeeklyLoad = weeklyMetrics.totalWeeklyLoad;
    const thresholds = getAcwrPlanningThresholds(fitnessLevel, phase, isOnActiveCut, weeklyMetrics);

    // 1. Count high-intensity sessions
    const highIntensitySessions = weekActivities.filter((a) => isHighIntensity(a.expected_intensity));

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
    } else if (acwr > cautionThreshold) {
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
    const phaseCap = PHASE_HIGH_INTENSITY_CAPS[phase] ?? 4;
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
    } else if (weeklyMetrics.monotony >= monotonyCaution) {
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
    } else if (weeklyMetrics.strain >= strainCaution) {
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
    } else if (weeklyMetrics.rollingFatigueScore >= 60) {
        warnings.push({
            severity: 'caution',
            title: 'Rolling Fatigue Building',
            message: `Rolling fatigue score is ${weeklyMetrics.rollingFatigueScore.toFixed(1)}.`,
            recommendation: 'Keep the next high-intensity session short and add extra sleep and hydration focus.',
        });
    }

    // 7. Check for 72h high-CNS density
    const sortedHigh = highIntensitySessions
        .map((a) => ({ ...a, dateMs: dateFromISO(a.date).getTime() }))
        .sort((a, b) => a.dateMs - b.dateMs);

    for (let i = 0; i < sortedHigh.length; i++) {
        const windowEnd = sortedHigh[i].dateMs + 72 * 60 * 60 * 1000;
        const inWindow = sortedHigh.filter((s) => s.dateMs >= sortedHigh[i].dateMs && s.dateMs <= windowEnd);
        if (inWindow.length > MAX_HIGH_CNS_PER_72H) {
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
