import type { FitnessLevel, Phase, OvertrainingWarning } from '../types/foundational.ts';
import type { ScheduledActivityRow } from '../types/training.ts';
import {
  MAX_HIGH_CNS_PER_72H,
  PHASE_HIGH_INTENSITY_CAPS,
  computeWeekLoadMetrics,
  dateFromISO,
  getAcwrPlanningThresholds,
  isHighIntensity,
} from './loadAndValidation.ts';

export function detectOvertrainingRisk(
    weekActivities: Pick<ScheduledActivityRow, 'activity_type' | 'expected_intensity' | 'estimated_duration_min' | 'date'>[],
    acwr: number,
    sleepTrendAvg: number,
    hasActiveWeightClassPlan: boolean = false,
    context?: { fitnessLevel?: FitnessLevel; phase?: Phase },
): OvertrainingWarning[] {
    const warnings: OvertrainingWarning[] = [];
    const fitnessLevel = context?.fitnessLevel ?? 'intermediate';
    const phase = context?.phase ?? 'off-season';

    const weeklyMetrics = computeWeekLoadMetrics(weekActivities);
    const totalWeeklyLoad = weeklyMetrics.totalWeeklyLoad;
    const thresholds = getAcwrPlanningThresholds(fitnessLevel, phase, hasActiveWeightClassPlan, weeklyMetrics);

    const highIntensitySessions = weekActivities.filter((a) => isHighIntensity(a.expected_intensity));

    const dangerThreshold = thresholds.redline;
    const cautionThreshold = thresholds.caution;

    if (acwr > dangerThreshold) {
        warnings.push({
            severity: 'danger',
            title: hasActiveWeightClassPlan ? 'Overtraining Risk During Weight-Class Management' : 'ACWR Spike Detected',
            message: hasActiveWeightClassPlan
                ? `Your ACWR is ${acwr.toFixed(2)} while on an active weight-class plan, above your personalized redline of ${dangerThreshold.toFixed(2)}.`
                : `Your ACWR is ${acwr.toFixed(2)}, above your personalized redline of ${dangerThreshold.toFixed(2)}.`,
            recommendation: hasActiveWeightClassPlan
                ? 'Drop at least 2 high-intensity sessions this week and replace with active recovery.'
                : 'Drop at least 1 high-intensity session this week and reduce intensity across remaining sessions.',
        });
    } else if (acwr > cautionThreshold) {
        warnings.push({
            severity: 'caution',
            title: hasActiveWeightClassPlan ? 'Elevated Load During Weight-Class Management' : 'Training Load Trending High',
            message: hasActiveWeightClassPlan
                ? `Your ACWR is ${acwr.toFixed(2)} and exceeds your personalized caution threshold (${cautionThreshold.toFixed(2)}).`
                : `Your ACWR is ${acwr.toFixed(2)}, above your personalized caution threshold (${cautionThreshold.toFixed(2)}).`,
            recommendation: hasActiveWeightClassPlan
                ? 'Keep at least 2 sessions lighter this week and prioritize recovery nutrition.'
                : 'Keep one session lighter this week to avoid crossing into the redline zone.',
        });
    }

    const phaseCap = PHASE_HIGH_INTENSITY_CAPS[phase] ?? 4;
    const highCap = hasActiveWeightClassPlan ? Math.max(2, phaseCap - 1) : phaseCap;
    if (highIntensitySessions.length > highCap) {
        warnings.push({
            severity: 'caution',
            title: 'Too Many Intense Sessions',
            message: `You have ${highIntensitySessions.length} high-intensity sessions planned this week. More than ${highCap} per week increases cumulative fatigue and diminishes returns.`,
            recommendation: `Convert ${highIntensitySessions.length - highCap} session(s) to moderate intensity (RPE 5-6) or active recovery.`,
        });
    }

    if (sleepTrendAvg > 0 && sleepTrendAvg < 3.0) {
        warnings.push({
            severity: 'danger',
            title: 'Poor Sleep Quality',
            message: `Your 3-day sleep average is ${sleepTrendAvg.toFixed(1)}/5. Sleep below 3.0 significantly impairs recovery and increases injury risk.`,
            recommendation: 'Reduce all session intensities by 2 points until sleep improves. Prioritize sleep hygiene over training volume.',
        });
    }

    const loadCap = hasActiveWeightClassPlan ? 4000 : 5000;
    if (totalWeeklyLoad > loadCap) {
        warnings.push({
            severity: 'caution',
            title: hasActiveWeightClassPlan ? 'Weekly Load Too High for Weight-Class Context' : 'Weekly Load Cap Exceeded',
            message: hasActiveWeightClassPlan
                ? `Total planned load for the week is ${totalWeeklyLoad}. During active weight-class management, the recommended cap is ${loadCap}.`
                : `Total planned load for the week is ${totalWeeklyLoad}. This exceeds the recommended ${loadCap} cap for most athletes.`,
            recommendation: 'Trim shorter conditioning sessions or reduce intensities on existing sessions.',
        });
    }

    const monotonyCaution = hasActiveWeightClassPlan ? 1.7 : 1.9;
    const monotonyDanger = hasActiveWeightClassPlan ? 2.1 : 2.3;
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

    const strainCaution = hasActiveWeightClassPlan ? 5000 : 6500;
    const strainDanger = hasActiveWeightClassPlan ? 6500 : 8000;
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
