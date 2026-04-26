import { buildDashboardWorkloadGuidance } from './buildTodayHomeState';
import type { ACWRResult } from '../../../lib/engine/types';

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

function makeAcwr(overrides: Partial<ACWRResult> = {}): ACWRResult {
  return {
    ratio: 1,
    acute: 100,
    chronic: 100,
    acuteEWMA: 100,
    chronicEWMA: 100,
    status: 'safe',
    message: 'Your workload ratio is in range. Keep building.',
    daysOfData: 14,
    thresholds: {
      caution: 1.25,
      redline: 1.45,
      detrained: 0.8,
      confidence: 'high',
      personalizationFactors: [],
      source: 'ewma_personalized',
    },
    loadMetrics: {
      weeklyLoad: 700,
      monotony: 1,
      strain: 700,
      acuteEWMA: 100,
      chronicEWMA: 100,
      rollingFatigueRatio: 1,
      rollingFatigueScore: 20,
      fatigueBand: 'low',
      safetyThreshold: 1.25,
      thresholdSource: 'standard_chronic',
      dailyLoads: [100, 100, 100, 100, 100, 100, 100],
    },
    ...overrides,
  };
}

console.log('\n-- dashboard workload guidance --');

{
  const result = buildDashboardWorkloadGuidance(null);
  assert('No history uses need-more-history label', result.label === 'Need more history');
  assert('No history tells user to log training first', result.headline === 'Log training first');
  assert('No history avoids technical metric as primary copy', !result.guidance.includes('ACWR'));
  assert('No history explains that logged training powers the chart', result.chartHelp.includes('log training'));
}

{
  const result = buildDashboardWorkloadGuidance(makeAcwr());
  assert('Safe load uses ready-to-train label', result.label === 'Ready to train');
  assert('Safe load gives train-as-planned direction', result.headline === 'Train as planned');
  assert('Safe load explains normal base plainly', result.guidance.includes('normal base'));
  assert('Safe load explains how to read chart points', result.chartHelp.includes('Higher points'));
  assert('Safe load keeps ACWR in detail copy', result.detail.includes('ACWR 1.00'));
}

{
  const result = buildDashboardWorkloadGuidance(makeAcwr({ ratio: 0.65 }));
  assert('Detrained band uses build-gradually label', result.label === 'Build gradually');
  assert('Detrained band gives ease-back-in direction', result.headline === 'Ease back in');
}

{
  const result = buildDashboardWorkloadGuidance(makeAcwr({ ratio: 1.32, status: 'caution' }));
  assert('Caution load uses keep-controlled label', result.label === 'Keep it controlled');
  assert('Caution load gives trim-extras direction', result.headline === 'Trim extras');
  assert('Caution load keeps language calm', result.guidance.includes('Keep today controlled'));
}

{
  const result = buildDashboardWorkloadGuidance(makeAcwr({ ratio: 1.58, status: 'redline' }));
  assert('Redline engine state becomes recovery-first user copy', result.label === 'Recovery first');
  assert('Redline engine state avoids redline in primary copy', !result.label.toLowerCase().includes('redline'));
  assert('Redline guidance tells user to keep extras light', result.guidance.includes('Keep extras light today'));
}

{
  const result = buildDashboardWorkloadGuidance(makeAcwr({
    daysOfData: 4,
    thresholds: {
      caution: 1.25,
      redline: 1.45,
      detrained: 0.8,
      confidence: 'low',
      personalizationFactors: ['low_data'],
      source: 'ewma_personalized',
    },
  }));
  assert('Low confidence asks for more history', result.label === 'Need more history');
  assert('Low confidence tells user the trend is not reliable yet', result.guidance.includes('trend is reliable'));
  assert('Low confidence explains normal base gets clearer', result.chartHelp.includes('normal base gets clearer'));
  assert('Low confidence detail stays secondary', result.confidenceLabel === 'Low confidence');
}

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
