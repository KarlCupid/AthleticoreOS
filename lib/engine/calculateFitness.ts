/**
 * calculateFitness.ts
 *
 * Fitness level assessment and evolution engine.
 *
 * Functions:
 *   1. assessFitnessFromQuestionnaire — scores the initial onboarding questionnaire
 *   2. deriveFitnessFromHistory       — re-derives level from training log (called weekly)
 *   3. getFitnessModifiers            — exposes per-level multipliers used by other engines
 *
 * @ANTI-WIRING:
 * All functions are pure and synchronous. No database queries. No LLM generation.
 * The caller is responsible for reading/writing to Supabase via fitnessService.ts.
 */

import {
    FitnessLevel,
    FitnessAssessmentInput,
    FitnessAssessmentResult,
    FitnessAssessmentCategory,
    FitnessModifiers,
    Phase,
    TrainingSessionRow,
    WeeklyTargetsRow,
} from './types';

// ─── Scoring Thresholds ────────────────────────────────────────

/**
 * Maps a raw 0-100 composite score to a FitnessLevel bucket.
 */
const LEVEL_THRESHOLDS: { min: number; level: FitnessLevel }[] = [
    { min: 75, level: 'elite' },
    { min: 50, level: 'advanced' },
    { min: 25, level: 'intermediate' },
    { min: 0, level: 'beginner' },
];

/**
 * Per-level volume and intensity modifiers.
 * These are the base values — phase can further adjust them.
 */
const FITNESS_MODIFIERS: Record<FitnessLevel, FitnessModifiers> = {
    beginner: {
        volumeMultiplier: 0.70,
        intensityCap: 7,
        recoveryDayFrequency: 3,
        roadWorkDistanceMultiplier: 0.65,
        conditioningRoundsMultiplier: 0.60,
    },
    intermediate: {
        volumeMultiplier: 0.90,
        intensityCap: 8,
        recoveryDayFrequency: 2,
        roadWorkDistanceMultiplier: 0.85,
        conditioningRoundsMultiplier: 0.80,
    },
    advanced: {
        volumeMultiplier: 1.10,
        intensityCap: 9,
        recoveryDayFrequency: 1,
        roadWorkDistanceMultiplier: 1.05,
        conditioningRoundsMultiplier: 1.10,
    },
    elite: {
        volumeMultiplier: 1.30,
        intensityCap: 10,
        recoveryDayFrequency: 1,
        roadWorkDistanceMultiplier: 1.30,
        conditioningRoundsMultiplier: 1.35,
    },
};

// ─── Helpers ───────────────────────────────────────────────────

function scoreToLevel(score: number): FitnessLevel {
    for (const { min, level } of LEVEL_THRESHOLDS) {
        if (score >= min) return level;
    }
    return 'beginner';
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

// ─── assessFitnessFromQuestionnaire ───────────────────────────

/**
 * Scores the initial fitness questionnaire and returns a detailed assessment.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - input: FitnessAssessmentInput (from FitnessQuestionnaireScreen)
 *
 * Returns: FitnessAssessmentResult
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function assessFitnessFromQuestionnaire(
    input: FitnessAssessmentInput
): FitnessAssessmentResult {
    const categories: FitnessAssessmentCategory[] = [];

    // ── 1. Training History (25 pts) ──
    // 0-1 years → 0-15pts | 1-3 → 15-40 | 3-7 → 40-70 | 7+ → 70-100
    const historyScore = clamp(
        input.trainingYears < 1 ? input.trainingYears * 15 :
            input.trainingYears < 3 ? 15 + (input.trainingYears - 1) * 12.5 :
                input.trainingYears < 7 ? 40 + (input.trainingYears - 3) * 7.5 :
                    70 + Math.min(input.trainingYears - 7, 5) * 6,
        0, 100
    );
    categories.push({
        name: 'Training History',
        score: historyScore,
        label: scoreToLevel(historyScore),
        detail: `${input.trainingYears} years of consistent training`,
    });

    // ── 2. Sport Background (20 pts) ──
    const backgroundMap = { none: 10, recreational: 35, competitive: 65, professional: 90 };
    const bgScore = backgroundMap[input.trainingBackground];
    // Sport experience adds up to 15 bonus points
    const sportBonus = clamp(input.sportExperienceYears * 3, 0, 15);
    const sportScore = clamp(bgScore + sportBonus, 0, 100);
    categories.push({
        name: 'Sport Background',
        score: sportScore,
        label: scoreToLevel(sportScore),
        detail: `${input.trainingBackground} background with ${input.sportExperienceYears} years in combat sports`,
    });

    // ── 3. Weekly Volume (20 pts) ──
    // 1-2 sessions → 10 | 3-4 → 35 | 5-6 → 65 | 7+ → 85+
    const volumeScore = clamp(
        input.weeklySessionCount <= 2 ? input.weeklySessionCount * 8 :
            input.weeklySessionCount <= 4 ? 16 + (input.weeklySessionCount - 2) * 15 :
                input.weeklySessionCount <= 6 ? 46 + (input.weeklySessionCount - 4) * 12 :
                    70 + Math.min(input.weeklySessionCount - 6, 6) * 5,
        0, 100
    );
    categories.push({
        name: 'Training Volume',
        score: volumeScore,
        label: scoreToLevel(volumeScore),
        detail: `${input.weeklySessionCount} sessions/week`,
    });

    // ── 4. Strength Baseline (20 pts) ──
    // Push-ups in 2 min: <20 → beginner, 20-40 → intermediate, 40-70 → advanced, 70+ → elite
    const strengthScore = clamp(
        input.maxPushUpsIn2Min < 20 ? input.maxPushUpsIn2Min * 1.25 :
            input.maxPushUpsIn2Min < 40 ? 25 + (input.maxPushUpsIn2Min - 20) * 1.25 :
                input.maxPushUpsIn2Min < 70 ? 50 + (input.maxPushUpsIn2Min - 40) * 0.83 :
                    75 + Math.min(input.maxPushUpsIn2Min - 70, 30) * 0.83,
        0, 100
    );
    categories.push({
        name: 'Strength Baseline',
        score: strengthScore,
        label: scoreToLevel(strengthScore),
        detail: `${input.maxPushUpsIn2Min} push-ups in 2 min`,
    });

    // ── 5. Cardio Baseline (15 pts) ──
    // 1.5mi run: null → skip | >900s (15min) → beginner | 720-900 → intermediate | 540-720 → advanced | <540 → elite
    let cardioScore = 50; // neutral if unknown
    let cardioDetail = 'Run time not provided — using neutral score';
    if (input.mile5RunTimeSeconds !== null) {
        const t = input.mile5RunTimeSeconds;
        cardioScore = clamp(
            t > 900 ? Math.max(0, 20 - (t - 900) / 30) :
                t > 720 ? 20 + (900 - t) / 6 :
                    t > 540 ? 45 + (720 - t) / 6 :
                        70 + Math.min((540 - t) / 6, 30),
            0, 100
        );
        const mins = Math.floor(t / 60);
        const secs = t % 60;
        cardioDetail = `1.5mi in ${mins}:${String(secs).padStart(2, '0')}`;
    }
    categories.push({
        name: 'Cardio Baseline',
        score: cardioScore,
        label: scoreToLevel(cardioScore),
        detail: cardioDetail,
    });

    // ── Composite Score (weighted average) ──
    const weights = [0.25, 0.20, 0.20, 0.20, 0.15];
    const compositeScore = Math.round(
        categories.reduce((sum, cat, i) => sum + cat.score * weights[i], 0)
    );

    // ── Injury penalty ──
    const penalizedScore = input.hasSignificantInjuries
        ? Math.max(0, compositeScore - 10)
        : compositeScore;

    const level = scoreToLevel(penalizedScore);

    // ── Confidence: higher if more data provided ──
    const confidence: FitnessAssessmentResult['confidence'] =
        input.mile5RunTimeSeconds !== null ? 'high' :
            input.maxPushUpsIn2Min > 0 ? 'medium' :
                'low';

    // ── Modifiers ──
    const modifiers = FITNESS_MODIFIERS[level];

    // ── Summary message ──
    const levelLabels: Record<FitnessLevel, string> = {
        beginner: 'building your foundation',
        intermediate: 'developing your capacity',
        advanced: 'refining your performance',
        elite: 'operating at peak level',
    };
    const summary =
        `Based on your responses, you're classified as ${level.toUpperCase()} — ` +
        `${levelLabels[level]}. ` +
        (input.hasSignificantInjuries ? 'Your injury history has been factored in. ' : '') +
        `Your program will start with volume at ${Math.round(modifiers.volumeMultiplier * 100)}% ` +
        `of standard targets and refine as your training history builds.`;

    return {
        level,
        compositeScore: penalizedScore,
        confidence,
        categories,
        summary,
        volumeMultiplier: modifiers.volumeMultiplier,
        intensityCap: modifiers.intensityCap,
        recommendedRecoveryDaysPerWeek: modifiers.recoveryDayFrequency,
    };
}

// ─── deriveFitnessFromHistory ──────────────────────────────────

/**
 * Re-derives fitness level from the athlete's training history.
 * Called weekly to evolve the stored fitness level over time.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - sessions: TrainingSessionRow[] (last 8 weeks from training_sessions table)
 *   - weeklyTargets: WeeklyTargetsRow (user's targets, for compliance calculation)
 *   - currentLevel: FitnessLevel (from fitness_profiles table)
 *
 * Returns: FitnessLevel — may be same, higher, or lower than current level.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function deriveFitnessFromHistory(
    sessions: TrainingSessionRow[],
    weeklyTargets: WeeklyTargetsRow,
    currentLevel: FitnessLevel,
): FitnessLevel {
    const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

    if (sortedSessions.length === 0) return currentLevel;

    // Need at least 14 days of tracked data (span, not session count) to make a judgment
    const firstDate = sortedSessions[0].date;
    const lastDate = sortedSessions[sortedSessions.length - 1].date;
    const spanDays = Math.floor(
        (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 3600 * 24)
    );
    if (spanDays < 14) {
        return currentLevel;
    }

    const weekGroups: TrainingSessionRow[][] = [];
    let currentWeek: TrainingSessionRow[] = [];
    let weekStart = sortedSessions[0]?.date ?? '';

    for (const s of sortedSessions) {
        const daysDiff = Math.floor(
            (new Date(s.date).getTime() - new Date(weekStart).getTime()) / (1000 * 3600 * 24)
        );
        if (daysDiff < 7) {
            currentWeek.push(s);
        } else {
            if (currentWeek.length) weekGroups.push(currentWeek);
            currentWeek = [s];
            weekStart = s.date;
        }
    }
    if (currentWeek.length) weekGroups.push(currentWeek);

    // Target sessions per week = sum of all targets (boxing + sc + running + road_work + conditioning)
    const weeklySessionTarget =
        weeklyTargets.sc_sessions +
        weeklyTargets.boxing_sessions +
        weeklyTargets.running_sessions +
        (weeklyTargets.road_work_sessions ?? 0) +
        weeklyTargets.conditioning_sessions;

    const validWeeks = weekGroups.slice(-8); // last 8 weeks
    if (validWeeks.length < 2) return currentLevel;

    const complianceScores = validWeeks.map(wk => {
        const hitTarget = Math.min(wk.length / Math.max(1, weeklySessionTarget), 1.2);
        return hitTarget;
    });
    const avgCompliance = complianceScores.reduce((s, c) => s + c, 0) / complianceScores.length;

    // ── Intensity trend ──
    const recentSessions = sortedSessions.slice(-28);
    const avgIntensity = recentSessions.length
        ? recentSessions.reduce((s, r) => s + r.intensity_srpe, 0) / recentSessions.length
        : 5;

    // ── Volume progression trend ──
    // Compare first 4 weeks vs last 4 weeks total load
    const firstHalf = validWeeks.slice(0, Math.floor(validWeeks.length / 2));
    const secondHalf = validWeeks.slice(Math.floor(validWeeks.length / 2));
    const firstLoad = firstHalf.flat().reduce((s, r) => s + r.total_load, 0);
    const secondLoad = secondHalf.flat().reduce((s, r) => s + r.total_load, 0);
    const hasProgression = secondLoad > firstLoad;

    // ── Scoring logic ──
    // High compliance + progression + high intensity → push level up
    // Low compliance → push level down (or stay)
    const levelOrder: FitnessLevel[] = ['beginner', 'intermediate', 'advanced', 'elite'];
    const currentIdx = levelOrder.indexOf(currentLevel);

    const canUpgrade = avgCompliance >= 0.85 && hasProgression && avgIntensity >= 6.5;
    const shouldDowngrade = avgCompliance < 0.50;

    if (canUpgrade && currentIdx < levelOrder.length - 1) {
        return levelOrder[currentIdx + 1];
    }
    if (shouldDowngrade && currentIdx > 0) {
        return levelOrder[currentIdx - 1];
    }
    return currentLevel;
}

// ─── getFitnessModifiers ───────────────────────────────────────

/**
 * Returns the FitnessModifiers for a given level and phase.
 * Phase can amplify or temper the base level modifiers.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getFitnessModifiers(
    level: FitnessLevel,
    phase: Phase,
): FitnessModifiers {
    const base = { ...FITNESS_MODIFIERS[level] };

    // Camp phases amplify volume and intensity expectations
    if (phase === 'camp-build' || phase === 'fight-camp') {
        base.volumeMultiplier = clamp(base.volumeMultiplier + 0.10, 0.70, 1.50);
        // Intensity cap stays — camp handles its own cap
    }
    if (phase === 'camp-peak') {
        // Peak: high intensity, reduced volume slightly
        base.volumeMultiplier = clamp(base.volumeMultiplier + 0.05, 0.70, 1.50);
    }
    if (phase === 'camp-taper') {
        // Taper: significant volume reduction, maintain intensity feel
        base.volumeMultiplier = clamp(base.volumeMultiplier - 0.25, 0.40, 1.50);
        base.intensityCap = Math.min(base.intensityCap, 7);
    }
    if (phase === 'off-season') {
        // Off-season: allow reduced volume targets for recovery
        base.volumeMultiplier = clamp(base.volumeMultiplier - 0.05, 0.50, 1.30);
        base.recoveryDayFrequency = Math.min(base.recoveryDayFrequency + 1, 4);
    }

    return base;
}
