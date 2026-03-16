/**
 * Standalone test script for lib/engine/calculateWeight.ts
 *
 * Run with:  npx tsx lib/engine/calculateWeight.test.ts
 */

import { calculateWeightTrend, calculateWeightCorrection, calculateWeightReadinessPenalty } from '.ts';
import type { WeightDataPoint, WeightTrendResult } from '.ts';

// ─── Helpers ───────────────────────────────────────────────────

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

function makeHistory(startDate: string, startWeight: number, dailyChange: number, days: number): WeightDataPoint[] {
    const history: WeightDataPoint[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        history.push({
            date: d.toISOString().split('T')[0],
            weight: Math.round((startWeight + dailyChange * i) * 10) / 10,
        });
    }
    return history;
}

// ─── calculateWeightTrend Tests ────────────────────────────────

console.log('\n── calculateWeightTrend ──');

// Test 1: Declining weight — on_track
(() => {
    const history = makeHistory('2026-02-01', 160, -0.2, 14);
    const result = calculateWeightTrend({
        weightHistory: history,
        targetWeightLbs: 155,
        baseWeightLbs: 160,
        phase: 'fight-camp',
        deadlineDate: '2026-04-01',
    });
    assert('14d declining → velocity < 0', result.weeklyVelocityLbs < 0);
    assert('Status is on_track', result.status === 'on_track');
    assert('currentWeight matches last entry', result.currentWeight === history[history.length - 1].weight);
    assert('remainingLbs > 0', result.remainingLbs > 0);
    assert('Has projected date', result.projectedDate !== null);
    assert('Has projected earliest date', result.projectedDateEarliest !== null);
    assert('Has projected latest date', result.projectedDateLatest !== null);
    assert('Has projection confidence', !!result.projectionConfidence);
    const hasRange = !!result.projectedDateEarliest && !!result.projectedDateLatest;
    assert('Projection range ordered', !hasRange || (result.projectedDateEarliest as string) <= (result.projectedDateLatest as string));
    assert('percentComplete > 0', result.percentComplete > 0);
})();

// Test 1b: Volatile trend - uncertainty stays explicit
(() => {
    const history = makeHistory('2026-02-01', 170, -0.25, 21).map((p, i) => ({
        ...p,
        weight: Math.round((p.weight + (i % 2 === 0 ? 0.2 : -0.2)) * 10) / 10,
    }));

    const result = calculateWeightTrend({
        weightHistory: history,
        targetWeightLbs: 162,
        baseWeightLbs: 170,
        phase: 'fight-camp',
        deadlineDate: '2026-05-01',
    });

    assert('Volatile trend has projection range', result.projectedWeeklyVelocityRange != null);
    if (result.projectedWeeklyVelocityRange) {
        assert(
            'Velocity range ordered (optimistic <= expected <= conservative)',
            result.projectedWeeklyVelocityRange.optimistic <= result.projectedWeeklyVelocityRange.expected &&
            result.projectedWeeklyVelocityRange.expected <= result.projectedWeeklyVelocityRange.conservative,
        );
    }
    assert('Volatile trend has explicit confidence', !!result.projectionConfidence);
})();
// Test 2: Flat history — stalled
(() => {
    const history = makeHistory('2026-02-01', 160, 0, 14);
    const result = calculateWeightTrend({
        weightHistory: history,
        targetWeightLbs: 155,
        baseWeightLbs: 160,
        phase: 'fight-camp',
        deadlineDate: null,
    });
    assert('Flat weight → status stalled', result.status === 'stalled');
    assert('velocity near 0', Math.abs(result.weeklyVelocityLbs) < 0.3);
})();

// Test 3: Rapid loss — ahead, isRapidLoss
(() => {
    const history = makeHistory('2026-02-01', 165, -0.5, 14);
    const result = calculateWeightTrend({
        weightHistory: history,
        targetWeightLbs: 155,
        baseWeightLbs: 165,
        phase: 'fight-camp',
        deadlineDate: null,
    });
    assert('Rapid loss → isRapidLoss', result.isRapidLoss);
    assert('Status is ahead', result.status === 'ahead');
})();

// Test 4: No target
(() => {
    const history = makeHistory('2026-02-01', 160, -0.1, 10);
    const result = calculateWeightTrend({
        weightHistory: history,
        targetWeightLbs: null,
        baseWeightLbs: 160,
        phase: 'off-season',
        deadlineDate: null,
    });
    assert('No target → status no_target', result.status === 'no_target');
    assert('remainingLbs === 0', result.remainingLbs === 0);
})();

// Test 5: Empty history
(() => {
    const result = calculateWeightTrend({
        weightHistory: [],
        targetWeightLbs: 155,
        baseWeightLbs: 160,
        phase: 'fight-camp',
        deadlineDate: null,
    });
    assert('Empty history → uses baseWeight', result.currentWeight === 160);
    assert('Empty history → stalled', result.status === 'stalled');
    assert('Empty history → message', result.message.includes('Not enough'));
})();

// Test 6: Gaining during fight-camp
(() => {
    const history = makeHistory('2026-02-01', 155, 0.15, 14);
    const result = calculateWeightTrend({
        weightHistory: history,
        targetWeightLbs: 150,
        baseWeightLbs: 155,
        phase: 'fight-camp',
        deadlineDate: null,
    });
    assert('Gaining during cut → status gaining', result.status === 'gaining');
})();

// ─── calculateWeightCorrection Tests ───────────────────────────

console.log('\n── calculateWeightCorrection ──');

// Test 7: Off-season → no correction
(() => {
    const trend: WeightTrendResult = {
        currentWeight: 165,
        movingAverage7d: 165,
        weeklyVelocityLbs: 0.5,
        totalChangeLbs: 2,
        remainingLbs: 0,
        projectedDaysToTarget: null,
        projectedDate: null,
        status: 'no_target',
        isRapidLoss: false,
        percentComplete: 0,
        message: '',
    };
    const result = calculateWeightCorrection({
        weightTrend: trend,
        phase: 'off-season',
        currentTDEE: 2500,
        deadlineDate: null,
    });
    assert('Off-season → correction = 0', result.correctionDeficitCal === 0);
    assert('Off-season → adjusted = TDEE', result.adjustedCalorieTarget === 2500);
})();

// Test 8: Fight-camp + behind → correction 300
(() => {
    const trend: WeightTrendResult = {
        currentWeight: 160,
        movingAverage7d: 160,
        weeklyVelocityLbs: -0.3,
        totalChangeLbs: -2,
        remainingLbs: 5,
        projectedDaysToTarget: null,
        projectedDate: null,
        status: 'behind',
        isRapidLoss: false,
        percentComplete: 40,
        message: '',
    };
    const result = calculateWeightCorrection({
        weightTrend: trend,
        phase: 'fight-camp',
        currentTDEE: 2500,
        deadlineDate: null,
    });
    assert('Fight-camp behind → correction = 300', result.correctionDeficitCal === 300);
    assert('Adjusted = 2200', result.adjustedCalorieTarget === 2200);
})();

// Test 9: Ahead → negative correction (reduce deficit)
(() => {
    const trend: WeightTrendResult = {
        currentWeight: 155,
        movingAverage7d: 155,
        weeklyVelocityLbs: -3.5,
        totalChangeLbs: -10,
        remainingLbs: 0,
        projectedDaysToTarget: null,
        projectedDate: null,
        status: 'ahead',
        isRapidLoss: true,
        percentComplete: 100,
        message: '',
    };
    const result = calculateWeightCorrection({
        weightTrend: trend,
        phase: 'fight-camp',
        currentTDEE: 2500,
        deadlineDate: null,
    });
    assert('Ahead → negative correction', result.correctionDeficitCal < 0);
    assert('Adjusted > TDEE', result.adjustedCalorieTarget > 2500);
})();

// ─── calculateWeightReadinessPenalty Tests ──────────────────────

console.log('\n── calculateWeightReadinessPenalty ──');

// Test 10: Off-season → no penalty
(() => {
    const trend: WeightTrendResult = {
        currentWeight: 160,
        movingAverage7d: 160,
        weeklyVelocityLbs: -3.0,
        totalChangeLbs: -5,
        remainingLbs: 5,
        projectedDaysToTarget: null,
        projectedDate: null,
        status: 'ahead',
        isRapidLoss: true,
        percentComplete: 50,
        message: '',
    };
    const result = calculateWeightReadinessPenalty(trend, 'off-season');
    assert('Off-season → penalty = 0', result.penaltyPoints === 0);
    assert('Off-season → not stressor', !result.isStressor);
})();

// Test 11: Rapid loss > 2 lbs/wk → 1 point
(() => {
    const trend: WeightTrendResult = {
        currentWeight: 158,
        movingAverage7d: 158,
        weeklyVelocityLbs: -2.5,
        totalChangeLbs: -7,
        remainingLbs: 3,
        projectedDaysToTarget: null,
        projectedDate: null,
        status: 'ahead',
        isRapidLoss: true,
        percentComplete: 70,
        message: '',
    };
    const result = calculateWeightReadinessPenalty(trend, 'fight-camp');
    assert('Rapid loss (-2.5) → penalty = 1', result.penaltyPoints === 1);
    assert('Is stressor', result.isStressor);
})();

// Test 12: Very rapid loss > 3 lbs/wk → 2 points
(() => {
    const trend: WeightTrendResult = {
        currentWeight: 155,
        movingAverage7d: 155,
        weeklyVelocityLbs: -3.5,
        totalChangeLbs: -10,
        remainingLbs: 0,
        projectedDaysToTarget: null,
        projectedDate: null,
        status: 'ahead',
        isRapidLoss: true,
        percentComplete: 100,
        message: '',
    };
    const result = calculateWeightReadinessPenalty(trend, 'fight-camp');
    assert('Very rapid loss (-3.5) → penalty = 2', result.penaltyPoints === 2);
    assert('Is stressor', result.isStressor);
})();

// Test 13: Normal loss rate → no penalty
(() => {
    const trend: WeightTrendResult = {
        currentWeight: 158,
        movingAverage7d: 158,
        weeklyVelocityLbs: -1.5,
        totalChangeLbs: -5,
        remainingLbs: 3,
        projectedDaysToTarget: null,
        projectedDate: null,
        status: 'on_track',
        isRapidLoss: false,
        percentComplete: 60,
        message: '',
    };
    const result = calculateWeightReadinessPenalty(trend, 'fight-camp');
    assert('Normal rate → penalty = 0', result.penaltyPoints === 0);
    assert('Not stressor', !result.isStressor);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);




