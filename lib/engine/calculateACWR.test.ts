/**
 * Standalone test script for lib/engine/calculateACWR.ts
 */

import { calculateACWR, getPersonalizedACWRThresholds } from './calculateACWR.ts';
import type { TrainingSessionRow, LoadMetrics } from './types.ts';

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

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

function createMockSupabase(rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[]) {
  return {
    from: (_table: string) => ({
      select: (_fields: string) => ({
        eq: (_col: string, _val: string) => ({
          gte: (_gteCol: string, gteVal: string) => ({
            lte: (_lteCol: string, lteVal: string) => ({
              order: (_orderCol: string, _opts: { ascending: boolean }) => {
                const filtered = rows
                  .filter((r) => r.date >= gteVal && r.date <= lteVal)
                  .sort((a, b) => b.date.localeCompare(a.date));
                return Promise.resolve({ data: filtered, error: null });
              },
            }),
          }),
        }),
      }),
    }),
  };
}

function makeEmptyMetrics(): LoadMetrics {
  return {
    weeklyLoad: 0,
    monotony: 0,
    strain: 0,
    acuteEWMA: 0,
    chronicEWMA: 0,
    rollingFatigueRatio: 0,
    rollingFatigueScore: 0,
    fatigueBand: 'low',
    safetyThreshold: 1.2,
    thresholdSource: 'low_chronic',
    dailyLoads: [],
  };
}

console.log('\n-- calculateACWR --');

(async () => {
  // ── No data ────────────────────────────────────────────────
  console.log('\n  Section: No data');
  {
    const supabase = createMockSupabase([]);
    const result = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: '2026-03-08',
      fitnessLevel: 'beginner',
      phase: 'off-season',
    });

    assert('No data returns safe status', result.status === 'safe');
    assert('No data ratio is 0', result.ratio === 0);
    assert('No data chronic is 0', result.chronic === 0);
    assert('No data includes thresholds', result.thresholds.redline > result.thresholds.caution);
    assert('No data includes low fatigue score', result.loadMetrics.rollingFatigueScore === 0);
  }

  // ── Sparse 7-day steady dataset ────────────────────────────
  console.log('\n  Section: Sparse 7-day steady dataset');
  {
    const asOf = '2026-03-08';
    const rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 7; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 100 });
    }

    const supabase = createMockSupabase(rows);
    const result = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'fight-camp',
    });

    assert('Sparse 7-day dataset yields EWMA acute near 100', result.acute >= 95 && result.acute <= 100);
    assert('Sparse 7-day dataset yields EWMA chronic near 100', result.chronic >= 90 && result.chronic <= 100);
    assert('Sparse 7-day ratio is 1.00', result.ratio === 1);
    assert('Monotony metric is populated', result.loadMetrics.monotony > 0);
    assert('EWMA metrics are exposed', result.acuteEWMA > 0 && result.chronicEWMA > 0);
  }

  // ── Redline spike ──────────────────────────────────────────
  console.log('\n  Section: Redline spike');
  {
    const asOf = '2026-03-08';
    const rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];

    for (let i = 0; i < 7; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 300 });
    }
    for (let i = 7; i < 28; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 50 });
    }

    const supabase = createMockSupabase(rows);
    const result = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'fight-camp',
    });

    assert('High recent load triggers redline', result.status === 'redline');
    assert('High recent load ratio is above threshold', result.ratio > result.thresholds.redline);
    assert('High recent load increases fatigue score', result.loadMetrics.rollingFatigueScore > 60);
  }

  // ── Personalized thresholds: beginner+cut vs elite+off-season ──
  console.log('\n  Section: Personalized thresholds');
  {
    const asOf = '2026-03-08';
    const rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 14; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 120 });
    }

    const supabase = createMockSupabase(rows);
    const beginnerCut = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'beginner',
      phase: 'fight-camp',
      isOnActiveCut: true,
    });
    const eliteOff = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'elite',
      phase: 'off-season',
      isOnActiveCut: false,
    });

    assert('Personalized thresholds: beginner cut is stricter than elite off-season', beginnerCut.thresholds.redline < eliteOff.thresholds.redline);
    assert('Thresholds report EWMA source', beginnerCut.thresholds.source === 'ewma_personalized');
  }

  // ── Confidence levels ──────────────────────────────────────
  console.log('\n  Section: Confidence levels');
  {
    const asOf = '2026-03-08';

    // 5 days of data → 'low'
    const rows5: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 5; i++) {
      rows5.push({ date: addDays(asOf, -i), total_load: 100 });
    }
    const sub5 = createMockSupabase(rows5);
    const result5 = await calculateACWR({
      userId: 'u1',
      supabaseClient: sub5 as any,
      asOfDate: asOf,
    });
    assert('5 days of data yields low confidence', result5.thresholds.confidence === 'low');

    // 10 days of data → 'medium'
    const rows10: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 10; i++) {
      rows10.push({ date: addDays(asOf, -i), total_load: 100 });
    }
    const sub10 = createMockSupabase(rows10);
    const result10 = await calculateACWR({
      userId: 'u1',
      supabaseClient: sub10 as any,
      asOfDate: asOf,
    });
    assert('10 days of data yields medium confidence', result10.thresholds.confidence === 'medium');

    // 20 days of data → 'high'
    const rows20: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 20; i++) {
      rows20.push({ date: addDays(asOf, -i), total_load: 100 });
    }
    const sub20 = createMockSupabase(rows20);
    const result20 = await calculateACWR({
      userId: 'u1',
      supabaseClient: sub20 as any,
      asOfDate: asOf,
    });
    assert('20 days of data yields high confidence', result20.thresholds.confidence === 'high');
  }

  // ── Fitness level differences ──────────────────────────────
  console.log('\n  Section: Fitness level differences');
  {
    const asOf = '2026-03-08';
    const rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 14; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 150 });
    }

    const supabase = createMockSupabase(rows);

    const beginnerResult = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'beginner',
      phase: 'off-season',
    });

    const intermediateResult = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'off-season',
    });

    const eliteResult = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'elite',
      phase: 'off-season',
    });

    assert('Elite caution threshold is higher than beginner', eliteResult.thresholds.caution > beginnerResult.thresholds.caution);
    assert('Elite redline threshold is higher than beginner', eliteResult.thresholds.redline > beginnerResult.thresholds.redline);
    assert('Intermediate caution is between beginner and elite', intermediateResult.thresholds.caution > beginnerResult.thresholds.caution && intermediateResult.thresholds.caution < eliteResult.thresholds.caution);
    assert('All ratios are the same for same data', beginnerResult.ratio === eliteResult.ratio);
  }

  // ── Cut penalty ────────────────────────────────────────────
  console.log('\n  Section: Cut penalty');
  {
    const asOf = '2026-03-08';
    const rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 14; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 150 });
    }
    const supabase = createMockSupabase(rows);

    const noCut = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'off-season',
      isOnActiveCut: false,
    });

    const withCut = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'off-season',
      isOnActiveCut: true,
    });

    assert('Active cut lowers caution threshold', withCut.thresholds.caution < noCut.thresholds.caution);
    assert('Active cut lowers redline threshold', withCut.thresholds.redline < noCut.thresholds.redline);
    assert('Active cut includes active_cut factor', withCut.thresholds.personalizationFactors.includes('active_cut'));
    assert('No-cut does not include active_cut factor', !noCut.thresholds.personalizationFactors.includes('active_cut'));
  }

  // ── Phase adjustments ──────────────────────────────────────
  console.log('\n  Section: Phase adjustments');
  {
    const asOf = '2026-03-08';
    const rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 14; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 150 });
    }
    const supabase = createMockSupabase(rows);

    const offSeason = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'off-season',
    });

    const campTaper = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'camp-taper',
    });

    const campBuild = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
      fitnessLevel: 'intermediate',
      phase: 'camp-build',
    });

    // camp-taper has adjustment -0.08, off-season has 0, camp-build has +0.04
    assert('Camp-taper caution is lower than off-season', campTaper.thresholds.caution < offSeason.thresholds.caution);
    assert('Camp-build caution is higher than off-season', campBuild.thresholds.caution > offSeason.thresholds.caution);
    assert('Camp-taper includes phase factor', campTaper.thresholds.personalizationFactors.includes('phase:camp-taper'));
    assert('Off-season does not include phase factor', !offSeason.thresholds.personalizationFactors.some(f => f.startsWith('phase:')));
  }

  // ── Fatigue bands ──────────────────────────────────────────
  console.log('\n  Section: Fatigue bands');
  {
    const asOf = '2026-03-08';

    // Low fatigue: steady very low loads (must be < 47/day to stay under score 35 threshold)
    const rowsLow: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 28; i++) {
      rowsLow.push({ date: addDays(asOf, -i), total_load: 40 });
    }
    const subLow = createMockSupabase(rowsLow);
    const resultLow = await calculateACWR({
      userId: 'u1',
      supabaseClient: subLow as any,
      asOfDate: asOf,
    });
    assert('Steady low loads yield low fatigue band', resultLow.loadMetrics.fatigueBand === 'low');
    assert('Low fatigue score is below 35', resultLow.loadMetrics.rollingFatigueScore < 35);

    // High fatigue: spike recent loads hard with low chronic base
    const rowsHigh: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 5; i++) {
      rowsHigh.push({ date: addDays(asOf, -i), total_load: 400 });
    }
    for (let i = 5; i < 28; i++) {
      rowsHigh.push({ date: addDays(asOf, -i), total_load: 40 });
    }
    const subHigh = createMockSupabase(rowsHigh);
    const resultHigh = await calculateACWR({
      userId: 'u1',
      supabaseClient: subHigh as any,
      asOfDate: asOf,
    });
    assert('Spike loads yield high or very_high fatigue band', resultHigh.loadMetrics.fatigueBand === 'high' || resultHigh.loadMetrics.fatigueBand === 'very_high');
    assert('High fatigue score is at least 60', resultHigh.loadMetrics.rollingFatigueScore >= 60);
  }

  // ── EWMA source ────────────────────────────────────────────
  console.log('\n  Section: EWMA source');
  {
    const asOf = '2026-03-08';
    const rows: Pick<TrainingSessionRow, 'date' | 'total_load'>[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push({ date: addDays(asOf, -i), total_load: 100 });
    }
    const supabase = createMockSupabase(rows);
    const result = await calculateACWR({
      userId: 'u1',
      supabaseClient: supabase as any,
      asOfDate: asOf,
    });
    assert('Thresholds source is ewma_personalized', result.thresholds.source === 'ewma_personalized');
  }

  // ── getPersonalizedACWRThresholds direct tests ─────────────
  console.log('\n  Section: getPersonalizedACWRThresholds direct');
  {
    // Low data penalty (daysOfData < 7)
    const lowData = getPersonalizedACWRThresholds({
      fitnessLevel: 'intermediate',
      phase: 'off-season',
      isOnActiveCut: false,
      daysOfData: 3,
      chronicLoad: 500,
      loadMetrics: makeEmptyMetrics(),
    });
    assert('Low data includes low_data factor', lowData.personalizationFactors.includes('low_data'));
    assert('Low data confidence is low', lowData.confidence === 'low');

    // Limited data (7 <= days < 14)
    const limitedData = getPersonalizedACWRThresholds({
      fitnessLevel: 'intermediate',
      phase: 'off-season',
      isOnActiveCut: false,
      daysOfData: 10,
      chronicLoad: 500,
      loadMetrics: makeEmptyMetrics(),
    });
    assert('Limited data includes limited_data factor', limitedData.personalizationFactors.includes('limited_data'));
    assert('Limited data confidence is medium', limitedData.confidence === 'medium');

    // Stable history (days >= 24)
    const stableData = getPersonalizedACWRThresholds({
      fitnessLevel: 'intermediate',
      phase: 'off-season',
      isOnActiveCut: false,
      daysOfData: 25,
      chronicLoad: 500,
      loadMetrics: makeEmptyMetrics(),
    });
    assert('Stable history includes stable_history factor', stableData.personalizationFactors.includes('stable_history'));
    assert('Stable history confidence is high', stableData.confidence === 'high');

    // Low chronic load penalty (chronicLoad <= 400)
    const lowChronic = getPersonalizedACWRThresholds({
      fitnessLevel: 'intermediate',
      phase: 'off-season',
      isOnActiveCut: false,
      daysOfData: 14,
      chronicLoad: 300,
      loadMetrics: makeEmptyMetrics(),
    });
    assert('Low chronic load includes low_chronic_load factor', lowChronic.personalizationFactors.includes('low_chronic_load'));

    // High chronic load bonus (chronicLoad >= 1400)
    const highChronic = getPersonalizedACWRThresholds({
      fitnessLevel: 'intermediate',
      phase: 'off-season',
      isOnActiveCut: false,
      daysOfData: 14,
      chronicLoad: 1500,
      loadMetrics: makeEmptyMetrics(),
    });
    assert('High chronic load includes high_chronic_load factor', highChronic.personalizationFactors.includes('high_chronic_load'));

    // Caution is always clamped between 1.05 and 1.38
    assert('Caution threshold is at least 1.05', lowData.caution >= 1.05);
    assert('Caution threshold is at most 1.38', highChronic.caution <= 1.38);

    // Redline is always at least caution + 0.12
    assert('Redline is at least caution + 0.12 (lowData)', lowData.redline >= lowData.caution + 0.119);
    assert('Redline is at least caution + 0.12 (highChronic)', highChronic.redline >= highChronic.caution + 0.119);
  }

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
