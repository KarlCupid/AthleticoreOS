/**
 * Standalone test for lib/engine/calculateWeight.ts
 */

import { calculateWeightTrend, calculateWeightCorrection, calculateWeightReadinessPenalty } from '.ts';
import type { WeightTrendResult } from '.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} ±${tolerance})`); }
}

function makeHistory(startDate: string, startWeight: number, dailyChange: number, days: number) {
  const history: { date: string; weight: number }[] = [];
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

function makeTrend(overrides: Partial<WeightTrendResult>): WeightTrendResult {
  return {
    currentWeight: 160,
    movingAverage7d: 160,
    weeklyVelocityLbs: -1.0,
    totalChangeLbs: -5,
    remainingLbs: 5,
    projectedDaysToTarget: null,
    projectedDate: null,
    projectedDateEarliest: null,
    projectedDateLatest: null,
    projectionConfidence: 'low',
    projectedWeeklyVelocityRange: null,
    status: 'on_track',
    isRapidLoss: false,
    percentComplete: 50,
    message: '',
    ...overrides,
  };
}

// ── calculateWeightTrend ──
console.log('\n-- calculateWeightTrend --');

// Empty history
(() => {
  const r = calculateWeightTrend({
    weightHistory: [],
    targetWeightLbs: 155,
    baseWeightLbs: 160,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('Empty → uses baseWeight', r.currentWeight === 160);
  assert('Empty → stalled status', r.status === 'stalled');
  assert('Empty → velocity 0', r.weeklyVelocityLbs === 0);
  assert('Empty → remainingLbs correct', r.remainingLbs === 5);
  assert('Empty → message about data', r.message.includes('Not enough'));
})();

// Empty history, no target
(() => {
  const r = calculateWeightTrend({
    weightHistory: [],
    targetWeightLbs: null,
    baseWeightLbs: 160,
    phase: 'off-season',
    deadlineDate: null,
  });
  assert('Empty no target → no_target status', r.status === 'no_target');
})();

// SMA verification with 7 known weights
(() => {
  const weights = [150, 151, 152, 153, 154, 155, 156];
  const history = weights.map((w, i) => ({
    date: `2026-02-${String(i + 1).padStart(2, '0')}`,
    weight: w,
  }));
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: null,
    baseWeightLbs: 150,
    phase: 'off-season',
    deadlineDate: null,
  });
  assertClose('7-weight SMA = 153', r.movingAverage7d, 153, 0.1);
  assert('currentWeight is last entry', r.currentWeight === 156);
})();

// Velocity with <7 days (scaling)
(() => {
  const history = makeHistory('2026-02-01', 160, -0.5, 4);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 155,
    baseWeightLbs: 160,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assertClose('Short history velocity scaled', r.weeklyVelocityLbs, -3.5, 0.2);
})();

// Status: on_track (velocity -1.0)
(() => {
  const history = makeHistory('2026-02-01', 160, -0.143, 14);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 155,
    baseWeightLbs: 160,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('Moderate loss → on_track', r.status === 'on_track');
})();

// Status: ahead (velocity < -2.0)
(() => {
  const history = makeHistory('2026-02-01', 165, -0.5, 14);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 155,
    baseWeightLbs: 165,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('Rapid loss → ahead', r.status === 'ahead');
  assert('isRapidLoss true', r.isRapidLoss === true);
})();

// Status: stalled (flat weight, 14d)
(() => {
  const history = makeHistory('2026-02-01', 160, 0, 14);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 155,
    baseWeightLbs: 160,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('Flat weight → stalled', r.status === 'stalled');
  assert('Stalled velocity near 0', Math.abs(r.weeklyVelocityLbs) <= 0.2);
})();

// Status: gaining (fight-camp, positive velocity)
(() => {
  const history = makeHistory('2026-02-01', 155, 0.15, 14);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 150,
    baseWeightLbs: 155,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('Gaining during fight-camp → gaining', r.status === 'gaining');
})();

// Status: behind (fight-camp, slow loss)
(() => {
  const history = makeHistory('2026-02-01', 160, -0.04, 14);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 155,
    baseWeightLbs: 160,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('Slow loss in fight-camp → behind', r.status === 'behind');
})();

// Already at target
(() => {
  const history = makeHistory('2026-02-01', 155, -0.1, 7);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 160,
    baseWeightLbs: 160,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('Below target → on_track', r.status === 'on_track');
  assert('remainingLbs <= 0', r.remainingLbs <= 0);
})();

// No target
(() => {
  const history = makeHistory('2026-02-01', 160, -0.1, 10);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: null,
    baseWeightLbs: 160,
    phase: 'off-season',
    deadlineDate: null,
  });
  assert('No target → no_target', r.status === 'no_target');
  assert('No target → remainingLbs 0', r.remainingLbs === 0);
})();

// Projection with enough data
(() => {
  const history = makeHistory('2026-01-01', 170, -0.2, 25);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 160,
    baseWeightLbs: 170,
    phase: 'fight-camp',
    deadlineDate: '2026-06-01',
  });
  assert('25d decline → has projection', r.projectedDate !== null);
  assert('Has projection range', r.projectedWeeklyVelocityRange !== null);
  if (r.projectedWeeklyVelocityRange) {
    assert('Velocity range ordered', r.projectedWeeklyVelocityRange.optimistic <= r.projectedWeeklyVelocityRange.expected);
  }
})();

// Volatile trend
(() => {
  const history = makeHistory('2026-02-01', 170, -0.25, 21).map((p, i) => ({
    ...p,
    weight: Math.round((p.weight + (i % 2 === 0 ? 0.2 : -0.2)) * 10) / 10,
  }));
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 162,
    baseWeightLbs: 170,
    phase: 'fight-camp',
    deadlineDate: '2026-05-01',
  });
  assert('Volatile has projection range', r.projectedWeeklyVelocityRange != null);
  assert('Volatile has confidence', !!r.projectionConfidence);
})();

// Percent complete
(() => {
  const history = makeHistory('2026-02-01', 155, 0, 7);
  const r = calculateWeightTrend({
    weightHistory: history,
    targetWeightLbs: 150,
    baseWeightLbs: 160,
    phase: 'fight-camp',
    deadlineDate: null,
  });
  assert('percentComplete = 50', r.percentComplete === 50);
})();

// ── calculateWeightCorrection ──
console.log('\n-- calculateWeightCorrection --');

// Off-season: 0
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'behind' }),
    phase: 'off-season',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('Off-season → correction = 0', r.correctionDeficitCal === 0);
  assert('Off-season → adjusted = TDEE', r.adjustedCalorieTarget === 2500);
})();

// Ahead: -125
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'ahead' }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('Ahead → correction = -125', r.correctionDeficitCal === -125);
  assert('Ahead → adjusted = 2625', r.adjustedCalorieTarget === 2625);
})();

// On-track: 0
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'on_track' }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('On-track → correction = 0', r.correctionDeficitCal === 0);
})();

// Pre-camp behind: 150
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'behind' }),
    phase: 'pre-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('Pre-camp behind → 150', r.correctionDeficitCal === 150);
})();

// Pre-camp gaining: 200
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'gaining' }),
    phase: 'pre-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('Pre-camp gaining → 200', r.correctionDeficitCal === 200);
})();

// Fight-camp behind: 300
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'behind' }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('Fight-camp behind → 300', r.correctionDeficitCal === 300);
})();

// Fight-camp stalled: 250
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'stalled' }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('Fight-camp stalled → 250', r.correctionDeficitCal === 250);
})();

// Fight-camp gaining: 400
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'gaining' }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('Fight-camp gaining → 400', r.correctionDeficitCal === 400);
})();

// Deadline boost
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'behind', remainingLbs: 5 }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: '2026-03-25',
  });
  assert('Deadline boost: correction > base 300', r.correctionDeficitCal > 300);
  assert('Deadline boost: capped at 500', r.correctionDeficitCal <= 500);
})();

// Global cap
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'gaining', remainingLbs: 10 }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: '2026-03-25',
  });
  assert('Correction capped at 1000', r.correctionDeficitCal <= 1000);
})();

// no_target: 0
(() => {
  const r = calculateWeightCorrection({
    weightTrend: makeTrend({ status: 'no_target' }),
    phase: 'fight-camp',
    currentTDEE: 2500,
    deadlineDate: null,
  });
  assert('no_target → correction = 0', r.correctionDeficitCal === 0);
})();

// ── calculateWeightReadinessPenalty ──
console.log('\n-- calculateWeightReadinessPenalty --');

(() => {
  const r = calculateWeightReadinessPenalty(makeTrend({ weeklyVelocityLbs: -3.5 }), 'off-season');
  assert('Off-season → penalty = 0', r.penaltyPoints === 0);
  assert('Off-season → not stressor', !r.isStressor);
})();

(() => {
  const r = calculateWeightReadinessPenalty(makeTrend({ weeklyVelocityLbs: -3.5 }), 'fight-camp');
  assert('Velocity -3.5 → penalty = 2', r.penaltyPoints === 2);
  assert('Is stressor', r.isStressor === true);
})();

(() => {
  const r = calculateWeightReadinessPenalty(makeTrend({ weeklyVelocityLbs: -2.5 }), 'fight-camp');
  assert('Velocity -2.5 → penalty = 1', r.penaltyPoints === 1);
})();

(() => {
  const r = calculateWeightReadinessPenalty(makeTrend({ weeklyVelocityLbs: -1.5 }), 'fight-camp');
  assert('Velocity -1.5 → penalty = 0', r.penaltyPoints === 0);
  assert('Not stressor', !r.isStressor);
})();

(() => {
  const r = calculateWeightReadinessPenalty(makeTrend({ weeklyVelocityLbs: -2.0 }), 'fight-camp');
  assert('Velocity -2.0 exact → penalty = 0', r.penaltyPoints === 0);
})();

(() => {
  const r = calculateWeightReadinessPenalty(makeTrend({ weeklyVelocityLbs: -3.0 }), 'fight-camp');
  assert('Velocity -3.0 exact → penalty = 1', r.penaltyPoints === 1);
})();

(() => {
  const r = calculateWeightReadinessPenalty(makeTrend({ weeklyVelocityLbs: -3.5 }), 'pre-camp');
  assert('Pre-camp also applies penalty = 2', r.penaltyPoints === 2);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
