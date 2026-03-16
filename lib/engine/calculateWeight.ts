import type {
    Phase,
} from './types/foundational.ts';
import type {
    WeightTrendInput,
    WeightTrendResult,
    WeightCorrectionInput,
    WeightCorrectionResult,
    WeightReadinessPenalty,
    WeightCutStatus,
} from './types/weight_cut.ts';
import { formatLocalDate, todayLocalDate } from '../utils/date.ts';

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - weightHistory: WeightDataPoint[] (from daily_checkins.morning_weight via weightService)
 *   - targetWeightLbs: number | null (from athlete_profiles.target_weight)
 *   - baseWeightLbs: number (from athlete_profiles.base_weight)
 *   - phase: Phase (from athlete_profiles.phase)
 *   - deadlineDate: string | null (from athlete_profiles.fight_date)
 *
 * Returns: WeightTrendResult
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */

// Helpers

function computeSMA(values: number[], window: number): number {
    if (values.length === 0) return 0;
    const slice = values.slice(-window);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

function computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeStdDev(values: number[]): number {
    if (values.length <= 1) return 0;
    const avg = computeMean(values);
    const variance = values.reduce((sum, v) => sum + ((v - avg) ** 2), 0) / values.length;
    return Math.sqrt(variance);
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
}

function daysBetween(a: string, b: string): number {
    const msPerDay = 86400000;
    return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / msPerDay);
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

function getWeeklyVelocitySeries(weights: number[]): number[] {
    const series: number[] = [];
    if (weights.length < 8) return series;

    for (let end = 7; end < weights.length; end++) {
        const recent = computeMean(weights.slice(Math.max(0, end - 6), end + 1));
        const prevSlice = weights.slice(Math.max(0, end - 13), Math.max(0, end - 6));
        if (prevSlice.length === 0) continue;
        const prev = computeMean(prevSlice);
        series.push(round1(recent - prev));
    }

    return series;
}

function confidenceFromHistory(historyLen: number, velocityStd: number): 'low' | 'medium' | 'high' {
    if (historyLen >= 21 && velocityStd <= 0.35) return 'high';
    if (historyLen >= 14 && velocityStd <= 0.7) return 'medium';
    return 'low';
}

// calculateWeightTrend

export function calculateWeightTrend(input: WeightTrendInput): WeightTrendResult {
    const { weightHistory, targetWeightLbs, baseWeightLbs, phase } = input;

    // Fallbacks for insufficient data
    if (weightHistory.length === 0) {
        return {
            currentWeight: baseWeightLbs,
            movingAverage7d: baseWeightLbs,
            weeklyVelocityLbs: 0,
            totalChangeLbs: 0,
            remainingLbs: targetWeightLbs != null ? baseWeightLbs - targetWeightLbs : 0,
            projectedDaysToTarget: null,
            projectedDate: null,
            projectedDateEarliest: null,
            projectedDateLatest: null,
            projectionConfidence: 'low',
            projectedWeeklyVelocityRange: null,
            status: targetWeightLbs != null ? 'stalled' : 'no_target',
            isRapidLoss: false,
            percentComplete: 0,
            message: 'Not enough weight data yet. Log your morning weight daily.',
        };
    }

    const weights = weightHistory.map((w) => w.weight);
    const currentWeight = weights[weights.length - 1];
    const movingAverage7d = round1(computeSMA(weights, 7));

    // Weekly velocity: compare last 7d avg vs previous 7d avg
    let weeklyVelocityLbs = 0;
    if (weights.length >= 7) {
        const recent7 = computeSMA(weights.slice(-7), 7);
        const previous7 = weights.length >= 14
            ? computeSMA(weights.slice(-14, -7), 7)
            : computeSMA(weights.slice(0, -7), weights.length - 7);
        weeklyVelocityLbs = round1(recent7 - previous7);
    } else if (weights.length >= 2) {
        // Not enough for two 7d windows, compute raw change scaled to weekly
        const totalDays = daysBetween(weightHistory[0].date, weightHistory[weightHistory.length - 1].date);
        if (totalDays > 0) {
            const totalChange = currentWeight - weights[0];
            weeklyVelocityLbs = round1((totalChange / totalDays) * 7);
        }
    }

    const totalChangeLbs = round1(currentWeight - baseWeightLbs);
    const isRapidLoss = weeklyVelocityLbs < -2.0;

    // No target path
    if (targetWeightLbs == null) {
        return {
            currentWeight,
            movingAverage7d,
            weeklyVelocityLbs,
            totalChangeLbs,
            remainingLbs: 0,
            projectedDaysToTarget: null,
            projectedDate: null,
            projectedDateEarliest: null,
            projectedDateLatest: null,
            projectionConfidence: 'low',
            projectedWeeklyVelocityRange: null,
            status: 'no_target',
            isRapidLoss,
            percentComplete: 0,
            message: weeklyVelocityLbs < -0.5
                ? `Weight trending down at ${Math.abs(weeklyVelocityLbs).toFixed(1)} lbs/wk.`
                : weeklyVelocityLbs > 0.3
                    ? `Weight trending up at ${weeklyVelocityLbs.toFixed(1)} lbs/wk.`
                    : 'Weight is stable.',
        };
    }

    // Target exists - compute remaining and status
    const remainingLbs = round1(currentWeight - targetWeightLbs);
    const totalToLose = baseWeightLbs - targetWeightLbs;
    const percentComplete = totalToLose > 0
        ? Math.min(100, Math.max(0, Math.round(((baseWeightLbs - currentWeight) / totalToLose) * 100)))
        : currentWeight <= targetWeightLbs ? 100 : 0;

    // Projection with uncertainty bands
    let projectedDaysToTarget: number | null = null;
    let projectedDate: string | null = null;
    let projectedDateEarliest: string | null = null;
    let projectedDateLatest: string | null = null;
    let projectedWeeklyVelocityRange: WeightTrendResult['projectedWeeklyVelocityRange'] = null;
    let projectionConfidence: WeightTrendResult['projectionConfidence'] = 'low';

    if (weeklyVelocityLbs < -0.1 && remainingLbs > 0) {
        const velocitySeries = getWeeklyVelocitySeries(weights);
        const observedStd = computeStdDev(velocitySeries);
        const velocityStd = observedStd > 0
            ? observedStd
            : Math.max(0.2, Math.abs(weeklyVelocityLbs) * 0.15);

        const expectedRate = Math.min(-0.1, weeklyVelocityLbs);
        const optimisticRate = Math.min(-0.1, expectedRate - velocityStd);
        const conservativeRate = Math.min(-0.1, expectedRate + velocityStd);

        projectedWeeklyVelocityRange = {
            optimistic: round1(optimisticRate),
            expected: round1(expectedRate),
            conservative: round1(conservativeRate),
        };

        const daysPerLb = 7 / Math.abs(expectedRate);
        projectedDaysToTarget = Math.round(remainingLbs * daysPerLb);

        const optimisticDays = Math.round(remainingLbs * (7 / Math.abs(optimisticRate)));
        const conservativeDays = Math.round(remainingLbs * (7 / Math.abs(conservativeRate)));

        const lastDate = weightHistory[weightHistory.length - 1].date;
        projectedDate = addDays(lastDate, projectedDaysToTarget);
        projectedDateEarliest = addDays(lastDate, optimisticDays);
        projectedDateLatest = addDays(lastDate, conservativeDays);
        projectionConfidence = confidenceFromHistory(weights.length, velocityStd);
    }

    // Status determination
    let status: WeightCutStatus;
    const isCutting = phase === 'fight-camp' || phase === 'pre-camp';

    if (remainingLbs <= 0) {
        status = 'on_track'; // Already at or below target
    } else if (weeklyVelocityLbs < -2.0) {
        status = 'ahead';
    } else if (weeklyVelocityLbs >= -2.0 && weeklyVelocityLbs <= -0.5) {
        status = 'on_track';
    } else if (Math.abs(weeklyVelocityLbs) <= 0.2 && weights.length >= 7) {
        status = 'stalled';
    } else if (weeklyVelocityLbs > 0.3 && isCutting) {
        status = 'gaining';
    } else if (weeklyVelocityLbs > -0.5 && isCutting) {
        status = 'behind';
    } else {
        status = 'on_track';
    }

    // Coaching message
    const projectionDetail = projectedDate && projectedDateEarliest && projectedDateLatest
        ? ` Projection window: ${projectedDateEarliest} to ${projectedDateLatest} (${projectionConfidence} confidence).`
        : '';

    const messages: Record<WeightCutStatus, string> = {
        on_track: `On track. Losing ${Math.abs(weeklyVelocityLbs).toFixed(1)} lbs/wk with ${remainingLbs.toFixed(1)} lbs to go.${projectionDetail}`,
        ahead: `Ahead of schedule at ${Math.abs(weeklyVelocityLbs).toFixed(1)} lbs/wk. Consider easing the deficit to preserve performance.${projectionDetail}`,
        behind: `Behind target. Current rate ${Math.abs(weeklyVelocityLbs).toFixed(1)} lbs/wk may not reach ${targetWeightLbs} lbs in time.${projectionDetail}`,
        stalled: `Weight has stalled near ${currentWeight.toFixed(1)} lbs. Consider a small calorie adjustment or a refeed day.${projectionDetail}`,
        gaining: `Gaining weight during ${phase.replace('-', ' ')}. Review nutrition compliance and calorie targets.${projectionDetail}`,
        no_target: 'No target weight set.',
    };

    return {
        currentWeight,
        movingAverage7d,
        weeklyVelocityLbs,
        totalChangeLbs,
        remainingLbs,
        projectedDaysToTarget,
        projectedDate,
        projectedDateEarliest,
        projectedDateLatest,
        projectionConfidence,
        projectedWeeklyVelocityRange,
        status,
        isRapidLoss,
        percentComplete,
        message: messages[status],
    };
}

// calculateWeightCorrection

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - weightTrend: WeightTrendResult (from calculateWeightTrend)
 *   - phase: Phase
 *   - currentTDEE: number (from calculateNutritionTargets.tdee)
 *   - deadlineDate: string | null (from athlete_profiles.fight_date)
 *
 * Returns: WeightCorrectionResult
 *
 * Phase-aware calorie correction. Caps at 1000 cal/day max correction.
 */
export function calculateWeightCorrection(input: WeightCorrectionInput): WeightCorrectionResult {
    const { weightTrend, phase, currentTDEE, deadlineDate } = input;

    // Off-season: no correction
    if (phase === 'off-season') {
        return {
            correctionDeficitCal: 0,
            adjustedCalorieTarget: currentTDEE,
            message: 'Off-season - no weight correction applied.',
        };
    }

    // Ahead in any phase: reduce deficit to preserve performance
    if (weightTrend.status === 'ahead') {
        const reduction = -125; // negative = add back calories
        return {
            correctionDeficitCal: reduction,
            adjustedCalorieTarget: currentTDEE - reduction,
            message: 'Ahead of target. Reducing deficit by 125 cal to preserve training performance.',
        };
    }

    // On-track or no_target: no correction
    if (weightTrend.status === 'on_track' || weightTrend.status === 'no_target') {
        return {
            correctionDeficitCal: 0,
            adjustedCalorieTarget: currentTDEE,
            message: weightTrend.status === 'on_track'
                ? 'Weight cut on track. No calorie correction needed.'
                : 'No target weight set.',
        };
    }

    // Behind, stalled, or gaining - apply correction
    let correction = 0;

    if (phase === 'pre-camp') {
        // Pre-camp: moderate correction
        if (weightTrend.status === 'behind' || weightTrend.status === 'stalled') {
            correction = 150;
        } else if (weightTrend.status === 'gaining') {
            correction = 200;
        }
    } else if (phase === 'fight-camp') {
        // Fight-camp: aggressive correction
        if (weightTrend.status === 'behind') {
            correction = 300;
        } else if (weightTrend.status === 'stalled') {
            correction = 250;
        } else if (weightTrend.status === 'gaining') {
            correction = 400;
        }
    }

    // Deadline-aware adjustment: if deadline is close, increase correction
    if (deadlineDate && weightTrend.remainingLbs > 0) {
        const today = todayLocalDate();
        const daysLeft = daysBetween(today, deadlineDate);
        if (daysLeft > 0 && daysLeft <= 14) {
            // Last 2 weeks: boost correction
            correction = Math.min(correction + 100, 500);
        }
    }

    // Cap at 1000 cal/day
    correction = Math.min(correction, 1000);

    // Ensure we don't go below safe floor (handled downstream by calculateNutritionTargets)
    const adjustedTarget = currentTDEE - correction;

    const statusMessages: Record<string, string> = {
        behind: `Behind schedule. Adding ${correction} cal deficit to get back on track.`,
        stalled: `Weight stalled. Adding ${correction} cal deficit to restart progress.`,
        gaining: `Gaining during ${phase.replace('-', ' ')}. ${correction} cal correction applied.`,
    };

    return {
        correctionDeficitCal: correction,
        adjustedCalorieTarget: adjustedTarget,
        message: statusMessages[weightTrend.status] || `${correction} cal correction applied.`,
    };
}

// calculateWeightReadinessPenalty

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - trend: WeightTrendResult (from calculateWeightTrend)
 *   - phase: Phase
 *
 * Returns: WeightReadinessPenalty
 *
 * Rapid weight loss is a physiological stressor that degrades readiness.
 */
export function calculateWeightReadinessPenalty(
    trend: WeightTrendResult,
    phase: Phase,
): WeightReadinessPenalty {
    // Off-season: weight changes are not treated as stressors
    if (phase === 'off-season') {
        return {
            penaltyPoints: 0,
            isStressor: false,
            message: 'Off-season - weight not factored into readiness.',
        };
    }

    const velocity = Math.abs(trend.weeklyVelocityLbs);

    // Very rapid: > 3 lbs/week
    if (trend.weeklyVelocityLbs < -3.0) {
        return {
            penaltyPoints: 2,
            isStressor: true,
            message: `Very rapid weight loss (${velocity.toFixed(1)} lbs/wk). High physiological stress - readiness reduced.`,
        };
    }

    // Rapid: > 2 lbs/week
    if (trend.weeklyVelocityLbs < -2.0) {
        return {
            penaltyPoints: 1,
            isStressor: true,
            message: `Rapid weight loss (${velocity.toFixed(1)} lbs/wk). Moderate stress - monitor recovery closely.`,
        };
    }

    return {
        penaltyPoints: 0,
        isStressor: false,
        message: 'Weight loss rate is within safe range.',
    };
}
