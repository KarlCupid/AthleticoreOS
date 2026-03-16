/**
 * Standalone test script for lib/engine/calculateACWR.ts
 */

import { calculateACWR } from '.ts';
import type { TrainingSessionRow } from '.ts';

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

console.log('\n-- calculateACWR --');

(async () => {
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

    assert('Sparse 7-day dataset yields acute 700', result.acute === 700);
    assert('Sparse 7-day dataset yields chronic ~700', result.chronic === 700);
    assert('Sparse 7-day ratio is 1.00', result.ratio === 1);
    assert('Monotony metric is populated', result.loadMetrics.monotony > 0);
  }

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
  }

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
