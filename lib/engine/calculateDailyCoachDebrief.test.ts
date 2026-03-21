/**
 * Standalone test script for lib/engine/calculateDailyCoachDebrief.ts
 *
 * Run with:  npx tsx lib/engine/calculateDailyCoachDebrief.test.ts
 */

import {
    generateDailyCoachDebrief,
    validateDailyCoachDebriefInput,
} from './calculateDailyCoachDebrief.ts';
import type { DailyCoachDebriefInput } from './types.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
    if (condition) {
        passed++;
        console.log(`  PASS ${label}`);
    } else {
        failed++;
        console.error(`  FAIL ${label}`);
    }
}

function makeInput(partial: Partial<DailyCoachDebriefInput> = {}): DailyCoachDebriefInput {
    return {
        sleepQuality: 4,
        readiness: 4,
        stressLevel: 3,
        sorenessLevel: 3,
        confidenceLevel: 4,
        primaryLimiter: 'none',
        nutritionAdherence: 'Target Met',
        nutritionBarrier: 'none',
        coachingFocus: 'execution',
        trainingLoadSummary: {
            plannedMinutes: 70,
            plannedIntensity: 7,
            totalLoad: 490,
            acuteLoad: 2200,
            chronicLoad: 2100,
            acwrRatio: 1.05,
            acwrStatus: 'safe',
        },
        context: {
            phase: 'camp-build',
            campLabel: 'Fight Camp',
            isOnActiveCut: false,
        },
        previousDebrief: null,
        ...partial,
    };
}

// ─── Primary limiter determination ────────────────────────────

console.log('\n── Primary limiter determination ──');

(() => {
    // sleepQuality <= 2 -> sleep limiter
    const debrief = generateDailyCoachDebrief(makeInput({ sleepQuality: 2, primaryLimiter: 'none' }));
    assert('Low sleep -> sleep limiter', debrief.primary_limiter === 'sleep');
})();

(() => {
    // stressLevel >= 4 -> stress limiter
    const debrief = generateDailyCoachDebrief(makeInput({ stressLevel: 4, primaryLimiter: 'none' }));
    assert('High stress -> stress limiter', debrief.primary_limiter === 'stress');
})();

(() => {
    // sorenessLevel >= 4 -> soreness limiter
    const debrief = generateDailyCoachDebrief(makeInput({ sorenessLevel: 4, primaryLimiter: 'none' }));
    assert('High soreness -> soreness limiter', debrief.primary_limiter === 'soreness');
})();

(() => {
    // nutritionAdherence = Missed It -> nutrition limiter
    const debrief = generateDailyCoachDebrief(makeInput({ nutritionAdherence: 'Missed It', primaryLimiter: 'none' }));
    assert('Missed nutrition -> nutrition limiter', debrief.primary_limiter === 'nutrition');
})();

(() => {
    // Explicit limiter overrides inference
    const debrief = generateDailyCoachDebrief(makeInput({ primaryLimiter: 'hydration' }));
    assert('Explicit hydration limiter preserved', debrief.primary_limiter === 'hydration');
})();

// ─── Education card selection based on limiters ───────────────

console.log('\n── Education card selection ──');

(() => {
    const debrief = generateDailyCoachDebrief(makeInput({ sleepQuality: 2, primaryLimiter: 'none' }));
    assert('Sleep limiter -> sleep education topic',
        debrief.education_topic === 'sleep_debt_reset' || debrief.education_topic === 'sleep_anchor');
    assert('Has teaching snippet', debrief.teaching_snippet.length > 0);
    assert('Has today application', debrief.today_application.length > 0);
})();

(() => {
    const debrief = generateDailyCoachDebrief(makeInput({ primaryLimiter: 'time' }));
    assert('Time limiter -> time education topic',
        debrief.education_topic === 'time_priority_filter' || debrief.education_topic === 'time_density_upgrade');
})();

(() => {
    // With previous debrief showing same topic, should rotate to alternate
    const debrief = generateDailyCoachDebrief(makeInput({
        primaryLimiter: 'none',
        previousDebrief: {
            primary_limiter: 'none',
            education_topic: 'consistency_compound',
            risk_flags: [],
        },
    }));
    assert('Rotates away from previous topic', debrief.education_topic === 'load_progression_rule');
})();

// ─── Readiness bands ──────────────────────────────────────────

console.log('\n── Readiness bands ──');

(() => {
    const debrief = generateDailyCoachDebrief(makeInput());
    assert('Good inputs -> push band', debrief.readiness_band === 'push');
})();

(() => {
    const debrief = generateDailyCoachDebrief(makeInput({
        sleepQuality: 2,
        readiness: 2,
        trainingLoadSummary: { ...makeInput().trainingLoadSummary, acwrStatus: 'redline', acwrRatio: 1.6 },
    }));
    assert('Low sleep + low readiness + redline -> recover band', debrief.readiness_band === 'recover');
    assert('Recover has acwr_redline flag', debrief.risk_flags.includes('acwr_redline'));
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
