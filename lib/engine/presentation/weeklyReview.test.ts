/**
 * Standalone test script for lib/engine/presentation/weeklyReview.ts
 * Run with: npx tsx lib/engine/presentation/weeklyReview.test.ts
 */

import { buildWeeklyReviewNarrativeViewModel } from './weeklyReview.ts';
import type { WeeklyComplianceReport } from '../types/schedule.ts';
import type { WeeklyReviewInsights } from './weeklyReview.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function makeReport(overrides: Partial<WeeklyComplianceReport> = {}): WeeklyComplianceReport {
  return {
    sc: { planned: 3, actual: 3, pct: 100 },
    boxing: { planned: 4, actual: 3, pct: 75 },
    running: { planned: 2, actual: 1, pct: 50 },
    conditioning: { planned: 0, actual: 0, pct: 0 },
    recovery: { planned: 1, actual: 1, pct: 100 },
    totalLoadPlanned: 800,
    totalLoadActual: 700,
    overallPct: 87,
    streak: 5,
    message: 'Solid week.',
    ...overrides,
  };
}

function makeInsights(overrides: Partial<WeeklyReviewInsights> = {}): WeeklyReviewInsights {
  return {
    readinessAvg: 72,
    readinessDelta: null,
    weightDelta: null,
    recommendationFollowThroughPct: 85,
    recommendationCount: 3,
    campRisk: null,
    campLabel: 'Off-season',
    ...overrides,
  };
}

console.log('\n── null report → default ──');

const nullResult = buildWeeklyReviewNarrativeViewModel(null, null);
assert('null report: whatImproved is default string', nullResult.whatImproved.length > 0);
assert('null report: whatChangesNext is default string', nullResult.whatChangesNext.length > 0);
assert('null report: overallPct = 0', nullResult.overallPct === 0);
assert('null report: streak = 0', nullResult.streak === 0);
assert('null report: complianceMetrics empty', nullResult.complianceMetrics.length === 0);
assert('null report: highlightChart = training_compliance', nullResult.highlightChart === 'training_compliance');

console.log('\n── whatImproved ──');

// Readiness delta > 0 wins
const posReadiness = buildWeeklyReviewNarrativeViewModel(makeReport(), makeInsights({ readinessDelta: 8 }));
assert('positive readinessDelta: mentions readiness improved', posReadiness.whatImproved.toLowerCase().includes('readiness'));

// Best sport compliance >= 80
const bestSport = buildWeeklyReviewNarrativeViewModel(makeReport({ sc: { planned: 3, actual: 3, pct: 100 } }), makeInsights({ readinessDelta: null }));
assert('best sport >= 80: mentions sport label', bestSport.whatImproved.includes('S&C') || bestSport.whatImproved.includes('%'));

// Streak fallback
const streakFallback = buildWeeklyReviewNarrativeViewModel(
  makeReport({ sc: { planned: 3, actual: 1, pct: 30 }, boxing: { planned: 3, actual: 1, pct: 30 }, running: { planned: 2, actual: 0, pct: 0 }, recovery: { planned: 1, actual: 0, pct: 0 }, streak: 4 }),
  makeInsights({ readinessDelta: null }),
);
assert('streak fallback: mentions days or consistency', streakFallback.whatImproved.toLowerCase().includes('4 day') || streakFallback.whatImproved.toLowerCase().includes('consistency') || streakFallback.whatImproved.toLowerCase().includes('streak'));

console.log('\n── whatSlipped ──');

// Worst sport < 70 is highlighted
const withSlip = buildWeeklyReviewNarrativeViewModel(
  makeReport({ running: { planned: 2, actual: 0, pct: 0 } }),
  makeInsights(),
);
assert('worst sport < 70: whatSlipped is not null', withSlip.whatSlipped !== null);
assert('worst sport < 70: mentions Running', withSlip.whatSlipped!.includes('Running'));

// All compliance >= 70: no sport slip
const goodCompliance = buildWeeklyReviewNarrativeViewModel(
  makeReport({
    sc: { planned: 3, actual: 3, pct: 100 },
    boxing: { planned: 3, actual: 2, pct: 70 },
    running: { planned: 2, actual: 2, pct: 100 },
    recovery: { planned: 1, actual: 1, pct: 100 },
  }),
  makeInsights({ recommendationFollowThroughPct: 90 }),
);
assert('all compliance >= 70: whatSlipped = null', goodCompliance.whatSlipped === null);

// Low follow-through triggers whatSlipped
const lowFollowThrough = buildWeeklyReviewNarrativeViewModel(
  makeReport({
    sc: { planned: 3, actual: 3, pct: 100 },
    boxing: { planned: 3, actual: 3, pct: 100 },
    running: { planned: 2, actual: 2, pct: 100 },
    recovery: { planned: 1, actual: 1, pct: 100 },
  }),
  makeInsights({ recommendationFollowThroughPct: 45, recommendationCount: 5 }),
);
assert('low follow-through: whatSlipped mentions follow-through pct', lowFollowThrough.whatSlipped !== null && lowFollowThrough.whatSlipped.includes('45%'));

console.log('\n── highlightChart selection ──');

const weightDeltaInsights = makeInsights({ weightDelta: 1.5 });
const weightChart = buildWeeklyReviewNarrativeViewModel(makeReport(), weightDeltaInsights);
assert('weight delta > 0.5: highlightChart = weight_trend', weightChart.highlightChart === 'weight_trend');

const readinessDeltaInsights = makeInsights({ weightDelta: 0.2, readinessDelta: 5 });
const readinessChart = buildWeeklyReviewNarrativeViewModel(makeReport(), readinessDeltaInsights);
assert('readiness delta present: highlightChart = readiness_trend', readinessChart.highlightChart === 'readiness_trend');

const defaultChart = buildWeeklyReviewNarrativeViewModel(makeReport(), makeInsights({ weightDelta: 0.1, readinessDelta: null }));
assert('no significant delta: highlightChart = training_compliance', defaultChart.highlightChart === 'training_compliance');

console.log('\n── complianceMetrics filtering ──');

const report = makeReport({ conditioning: { planned: 0, actual: 0, pct: 0 } });
const result = buildWeeklyReviewNarrativeViewModel(report, makeInsights());
const labels = result.complianceMetrics.map(m => m.label);
assert('conditioning excluded when planned = 0', !labels.includes('Conditioning'));
assert('sc included when planned > 0', labels.includes('S&C'));
assert('complianceMetrics has correct fields', result.complianceMetrics.every(m => 'planned' in m && 'actual' in m && 'pct' in m));

console.log('\n── overallPct and streak passed through ──');

const passThrough = buildWeeklyReviewNarrativeViewModel(makeReport({ overallPct: 92, streak: 7 }), null);
assert('overallPct passed through', passThrough.overallPct === 92);
assert('streak passed through', passThrough.streak === 7);

console.log('\n── narrativeSummary is concatenation ──');

assert('narrativeSummary includes whatImproved', result.narrativeSummary.includes(result.whatImproved));
assert('narrativeSummary includes whatChangesNext', result.narrativeSummary.includes(result.whatChangesNext));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
