/**
 * Standalone test script for lib/engine/calculateOverload.ts
 *
 * Run with:  npx tsx lib/engine/calculateOverload.test.ts
 */

import {
    estimateE1RM,
    suggestOverload,
    detectPR,
    shouldDeload,
    selectProgressionModel,
} from './calculateOverload.ts';
import type { ExerciseHistoryEntry, PRRecord } from './types.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${label}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${label}`);
    }
}

function makeHistory(weight: number, reps: number, rpe: number | null, n: number): ExerciseHistoryEntry[] {
    const out: ExerciseHistoryEntry[] = [];
    for (let i = 0; i < n; i++) {
        out.push({
            date: `2026-03-${String(i + 1).padStart(2, '0')}`,
            bestSetWeight: weight,
            bestSetReps: reps,
            bestSetRPE: rpe,
            totalVolume: weight * reps * 3,
            workingSets: 3,
            estimated1RM: weight,
        });
    }
    return out;
}

// ─── estimateE1RM ──────────────────────────────────────────────

console.log('\n── estimateE1RM ──');

(() => {
    // Epley: 200 * (1 + 5/30) = 200 * 1.1667 = 233.33
    // RPE 8: denominator = 1 - (10-8)*0.033 = 1 - 0.066 = 0.934
    // rpeFactor = 1/0.934 = 1.0707
    // result = 233.33 * 1.0707 = 249.83 → roundToHalf → 250.0
    const e1rm = estimateE1RM(200, 5, 8);
    assert('E1RM(200, 5, RPE 8) > 200', e1rm > 200);
    assert('E1RM(200, 5, RPE 8) is approximately 250', Math.abs(e1rm - 250) < 1);

    // Weight = 0 → 0
    assert('E1RM weight=0 → 0', estimateE1RM(0, 5, 8) === 0);

    // Reps = 0 → 0
    assert('E1RM reps=0 → 0', estimateE1RM(200, 0, 8) === 0);

    // RPE 10: denominator = 1 - (10-10)*0.033 = 1.0, rpeFactor = 1.0
    // Epley: 200 * (1 + 5/30) = 233.33, * 1.0 = 233.33 → roundToHalf → 233.5
    const e1rmRPE10 = estimateE1RM(200, 5, 10);
    const epleyRaw = 200 * (1 + 5 / 30);
    const roundedEpley = Math.round(epleyRaw * 2) / 2;
    assert('RPE 10 → rpeFactor = 1 (pure Epley)', Math.abs(e1rmRPE10 - roundedEpley) < 0.01);

    // Null RPE defaults to 8.5
    // denominator = 1 - (10-8.5)*0.033 = 1 - 0.0495 = 0.9505
    // rpeFactor = 1/0.9505 = 1.0521
    const e1rmNullRPE = estimateE1RM(200, 5, null);
    assert('Null RPE uses default (8.5)', e1rmNullRPE > 200);

    // 1 rep → minimal Epley uplift
    // Epley: 300 * (1 + 1/30) = 300 * 1.0333 = 310
    const singleRep = estimateE1RM(300, 1, 10);
    assert('Single rep at RPE 10 ≈ weight * 1.033', Math.abs(singleRep - 310) < 1);

    // Higher RPE → higher e1RM (more reps in reserve at lower RPE)
    const e1rmLowRPE = estimateE1RM(200, 5, 6);
    const e1rmHighRPE = estimateE1RM(200, 5, 9);
    assert('Lower RPE → higher e1RM estimate', e1rmLowRPE > e1rmHighRPE);

    // Negative weight → 0
    assert('Negative weight → 0', estimateE1RM(-50, 5, 8) === 0);
})();

// ─── suggestOverload ───────────────────────────────────────────

console.log('\n── suggestOverload ──');

(() => {
    // Linear progression: last RPE 7.5, target 8 → should increase weight
    const linear = suggestOverload({
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        history: makeHistory(185, 5, 7.5, 4),
        fitnessLevel: 'intermediate',
        progressionModel: 'linear',
        isDeloadWeek: false,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'chest',
    });
    assert('Linear: increases weight when RPE on target', linear.suggestedWeight > 185);
    // Upper body → +5 lbs
    assert('Linear: upper body increment = +5 lbs', linear.suggestedWeight === 190);
    assert('Linear: confidence medium with 4 entries', linear.confidence === 'medium');

    // Linear progression for lower body → +10 lbs
    const linearLower = suggestOverload({
        exerciseId: 'ex-2',
        exerciseName: 'Back Squat',
        history: makeHistory(200, 5, 7, 4),
        fitnessLevel: 'intermediate',
        progressionModel: 'linear',
        isDeloadWeek: false,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'quads',
    });
    assert('Linear: lower body increment = +10 lbs', linearLower.suggestedWeight === 210);

    // Deload override now anchors to ~67.5% of estimated 1RM.
    const deload = suggestOverload({
        exerciseId: 'ex-2',
        exerciseName: 'Back Squat',
        history: makeHistory(315, 5, 8.5, 5),
        fitnessLevel: 'advanced',
        progressionModel: 'wave',
        isDeloadWeek: true,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'quads',
    });
    // 60% of 315 = 189 → roundTo5 → 190
    assert('Deload: weight = 67.5% of e1RM', deload.suggestedWeight === 215);
    assert('Deload: isDeloadSet = true', deload.isDeloadSet === true);
    assert('Deload: RPE capped at 5', deload.suggestedRPE <= 5);
    assert('Deload: reps = target + 2', deload.suggestedReps === 7);

    // Readiness Caution → 0.95x
    const caution = suggestOverload({
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        history: makeHistory(200, 5, 7.5, 4),
        fitnessLevel: 'intermediate',
        progressionModel: 'linear',
        isDeloadWeek: false,
        readinessState: 'Caution',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'chest',
    });
    // Linear: 200 + 5 = 205, Caution: 205 * 0.95 = 194.75 → roundTo5 → 195
    assert('Caution: weight reduced ~5%', caution.suggestedWeight === 195);
    assert('Caution reasoning mentions Caution', caution.reasoning.includes('Caution'));

    // Readiness Depleted → 0.85x
    const depleted = suggestOverload({
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        history: makeHistory(200, 5, 7.5, 4),
        fitnessLevel: 'intermediate',
        progressionModel: 'linear',
        isDeloadWeek: false,
        readinessState: 'Depleted',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'chest',
    });
    // Linear: 200 + 5 = 205, Depleted: 205 * 0.85 = 174.25 → roundTo5 → 175
    assert('Depleted: weight reduced ~15%', depleted.suggestedWeight === 175);
    assert('Depleted reasoning mentions Depleted', depleted.reasoning.includes('Depleted'));

    // No history → confidence 'low', suggestedWeight 0
    const noHistory = suggestOverload({
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        history: [],
        fitnessLevel: 'beginner',
        progressionModel: 'linear',
        isDeloadWeek: false,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'chest',
    });
    assert('No history → confidence low', noHistory.confidence === 'low');
    assert('No history → suggestedWeight 0', noHistory.suggestedWeight === 0);
    assert('No history → RPE capped at 6', noHistory.suggestedRPE <= 6);
    assert('No history → not a deload set', noHistory.isDeloadSet === false);

    // High confidence with 6+ history entries
    const highConf = suggestOverload({
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        history: makeHistory(185, 5, 7.5, 8),
        fitnessLevel: 'intermediate',
        progressionModel: 'linear',
        isDeloadWeek: false,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'chest',
    });
    assert('6+ history → confidence high', highConf.confidence === 'high');

    // Wave progression: position 0 (history length % 3 === 0 → heavy day)
    // Need history length divisible by 3, e.g. 3
    const wave = suggestOverload({
        exerciseId: 'ex-3',
        exerciseName: 'Deadlift',
        history: makeHistory(300, 5, 8, 3),
        fitnessLevel: 'advanced',
        progressionModel: 'wave',
        isDeloadWeek: false,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'quads',
    });
    // position 3 % 3 = 0 → Heavy: weight = roundTo5(300 * 1.10) = 330, reps = max(1, 5-2) = 3
    assert('Wave heavy day: weight = +10%', wave.suggestedWeight === 330);
    assert('Wave heavy day: reps reduced', wave.suggestedReps === 3);

    // Block progression: position 1 (history length 4 % 3 = 1 → transmutation)
    const block = suggestOverload({
        exerciseId: 'ex-4',
        exerciseName: 'Front Squat',
        history: makeHistory(225, 5, 8, 4),
        fitnessLevel: 'advanced',
        progressionModel: 'block',
        isDeloadWeek: false,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'quads',
    });
    // position 4 % 3 = 1 → Transmutation: weight = roundTo5(225 * 1.05) = roundTo5(236.25) = 235
    assert('Block transmutation: weight ≈ +5%', block.suggestedWeight === 235);
    assert('Block transmutation: reps = target - 1', block.suggestedReps === 4);

    // RPE above target + 1 → hold weight
    const holdWeight = suggestOverload({
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        history: makeHistory(200, 5, 9.5, 4),
        fitnessLevel: 'intermediate',
        progressionModel: 'linear',
        isDeloadWeek: false,
        readinessState: 'Prime',
        targetRPE: 8,
        targetReps: 5,
        muscleGroup: 'chest',
    });
    assert('RPE > target+1 → hold weight', holdWeight.suggestedWeight === 200);
})();

// ─── shouldDeload ──────────────────────────────────────────────

console.log('\n── shouldDeload ──');

(() => {
    // ACWR >= 1.4 → true
    const highACWR = shouldDeload({
        weeksSinceLastDeload: 3,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.45,
        readinessState: 'Caution',
        recentSessionRPEs: [8, 9, 8, 9],
        consecutiveCautionDays: 2,
    });
    assert('ACWR >= 1.4 → shouldDeload', highACWR.shouldDeload === true);
    assert('ACWR trigger mentions ACWR', highACWR.reason.includes('ACWR'));

    // ACWR exactly 1.4 → true
    const exactACWR = shouldDeload({
        weeksSinceLastDeload: 2,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.4,
        readinessState: 'Prime',
        recentSessionRPEs: [7, 7, 7, 7],
        consecutiveCautionDays: 0,
    });
    assert('ACWR = 1.4 exactly → shouldDeload', exactACWR.shouldDeload === true);

    // Avg RPE >= 8.5 for 4+ sessions → true
    const highRPE = shouldDeload({
        weeksSinceLastDeload: 2,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.1,
        readinessState: 'Prime',
        recentSessionRPEs: [9, 9, 8.5, 8.5],
        consecutiveCautionDays: 0,
    });
    assert('Avg RPE >= 8.5 with 4+ sessions → shouldDeload', highRPE.shouldDeload === true);
    assert('RPE trigger mentions fatigue', highRPE.reason.includes('fatigue'));

    // Avg RPE >= 8.5 but only 3 sessions → not enough data
    const fewSessions = shouldDeload({
        weeksSinceLastDeload: 2,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.1,
        readinessState: 'Prime',
        recentSessionRPEs: [9, 9, 9],
        consecutiveCautionDays: 0,
    });
    assert('High RPE but <4 sessions → no deload', fewSessions.shouldDeload === false);

    // Consecutive caution days >= 5 → true
    const cautionDays = shouldDeload({
        weeksSinceLastDeload: 2,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.1,
        readinessState: 'Caution',
        recentSessionRPEs: [7, 7, 7, 7],
        consecutiveCautionDays: 5,
    });
    assert('5 consecutive caution days → shouldDeload', cautionDays.shouldDeload === true);
    assert('Caution days trigger mentions consecutive', cautionDays.reason.includes('consecutive'));

    // Scheduled deload: weeksSinceLastDeload >= interval
    const scheduled = shouldDeload({
        weeksSinceLastDeload: 6,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.0,
        readinessState: 'Prime',
        recentSessionRPEs: [7, 7, 7, 7],
        consecutiveCautionDays: 0,
    });
    assert('Scheduled deload (weeks >= interval) → shouldDeload', scheduled.shouldDeload === true);
    assert('Scheduled reason mentions deload', scheduled.reason.includes('Scheduled'));

    // No triggers → false
    const noTrigger = shouldDeload({
        weeksSinceLastDeload: 3,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.0,
        readinessState: 'Prime',
        recentSessionRPEs: [7, 7, 7, 7],
        consecutiveCautionDays: 0,
    });
    assert('No triggers → shouldDeload false', noTrigger.shouldDeload === false);
    assert('No triggers → suggestedDuration 0', noTrigger.suggestedDurationWeeks === 0);

    // Very high ACWR (>1.5) → 2 weeks duration
    const veryHighACWR = shouldDeload({
        weeksSinceLastDeload: 3,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.6,
        readinessState: 'Depleted',
        recentSessionRPEs: [9, 9, 9, 9],
        consecutiveCautionDays: 3,
    });
    assert('ACWR > 1.5 → 2 week deload', veryHighACWR.suggestedDurationWeeks === 2);

    // Normal ACWR trigger → 1 week duration
    const normalACWR = shouldDeload({
        weeksSinceLastDeload: 3,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.45,
        readinessState: 'Caution',
        recentSessionRPEs: [7, 7, 7, 7],
        consecutiveCautionDays: 0,
    });
    assert('ACWR 1.45 (<=1.5) → 1 week deload', normalACWR.suggestedDurationWeeks === 1);

    // 4 consecutive caution days (below threshold) → no deload
    const fourCaution = shouldDeload({
        weeksSinceLastDeload: 2,
        autoDeloadIntervalWeeks: 6,
        acwr: 1.0,
        readinessState: 'Caution',
        recentSessionRPEs: [7, 7, 7, 7],
        consecutiveCautionDays: 4,
    });
    assert('4 consecutive caution days → no deload', fourCaution.shouldDeload === false);
})();

// ─── selectProgressionModel ────────────────────────────────────

console.log('\n── selectProgressionModel ──');

(() => {
    // Beginner → always linear regardless of history
    assert('Beginner → linear', selectProgressionModel('beginner', 20) === 'linear');
    assert('Beginner + long history → still linear', selectProgressionModel('beginner', 100) === 'linear');

    // Insufficient history (<8) → linear regardless of level
    assert('Advanced + short history → linear', selectProgressionModel('advanced', 5) === 'linear');
    assert('Elite + short history → linear', selectProgressionModel('elite', 7) === 'linear');
    assert('Intermediate + short history → linear', selectProgressionModel('intermediate', 3) === 'linear');

    // Intermediate with sufficient history → wave
    assert('Intermediate + 8 entries → wave', selectProgressionModel('intermediate', 8) === 'wave');
    assert('Intermediate + 20 entries → wave', selectProgressionModel('intermediate', 20) === 'wave');

    // Advanced → block
    assert('Advanced + 10 entries → block', selectProgressionModel('advanced', 10) === 'block');

    // Elite → block
    assert('Elite + 20 entries → block', selectProgressionModel('elite', 20) === 'block');

    // Boundary: exactly 8 history entries
    assert('Intermediate + exactly 8 → wave', selectProgressionModel('intermediate', 8) === 'wave');
    assert('Advanced + exactly 8 → block', selectProgressionModel('advanced', 8) === 'block');
})();

// ─── detectPR ──────────────────────────────────────────────────

console.log('\n── detectPR ──');

(() => {
    // New weight PR
    const weightPR = detectPR('ex-1', 'Bench Press', 225, 5, 8, [
        { id: 'pr-1', exerciseId: 'ex-1', exerciseName: 'Bench Press', prType: 'weight', value: 220, repsAtPR: 5, weightAtPR: 220, rpeAtPR: 8, date: '2026-03-01' },
    ]);
    assert('Weight PR detected', weightPR.isNewPR === true);
    assert('Weight PR type = weight', weightPR.prType === 'weight');
    assert('Weight PR previous = 220', weightPR.previousBest === 220);
    assert('Weight PR new = 225', weightPR.newValue === 225);

    // No PR: weight below existing, reps below existing, e1RM below existing
    // detectPR checks weight, reps, and estimated_1rm — all must be covered to avoid a false positive
    const noPR = detectPR('ex-1', 'Bench Press', 200, 5, 8, [
        { id: 'pr-1', exerciseId: 'ex-1', exerciseName: 'Bench Press', prType: 'weight', value: 225, repsAtPR: 5, weightAtPR: 225, rpeAtPR: 8, date: '2026-03-01' },
        { id: 'pr-2', exerciseId: 'ex-1', exerciseName: 'Bench Press', prType: 'reps', value: 8, repsAtPR: 8, weightAtPR: 200, rpeAtPR: 8, date: '2026-03-01' },
        { id: 'pr-3', exerciseId: 'ex-1', exerciseName: 'Bench Press', prType: 'estimated_1rm', value: 265, repsAtPR: 5, weightAtPR: 225, rpeAtPR: 8, date: '2026-03-01' },
    ]);
    assert('No PR when weight, reps, and e1RM are all below existing', noPR.isNewPR === false);

    // Weight = 0 → no PR
    const zeroWeight = detectPR('ex-1', 'Bench Press', 0, 5, 8, []);
    assert('Zero weight → no PR', zeroWeight.isNewPR === false);

    // No existing PRs → new weight PR
    const firstPR = detectPR('ex-1', 'Bench Press', 135, 8, 7, []);
    assert('First ever lift → weight PR', firstPR.isNewPR === true);
    assert('First PR → previousBest null', firstPR.previousBest === null);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
