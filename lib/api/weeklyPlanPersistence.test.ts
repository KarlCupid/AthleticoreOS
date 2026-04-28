import { buildWeeklyPlanEntryInsertPayload } from './weeklyPlanPersistence.ts';
import type { WeeklyPlanEntryRow } from '../engine/types.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

console.log('\n-- weeklyPlanPersistence --');

const entry = {
  user_id: 'user-1',
  week_start_date: '2026-04-20',
  day_of_week: 1,
  date: '2026-04-20',
  slot: 'single',
  day_order: 0,
  session_type: 'conditioning',
  focus: 'conditioning',
  session_family: 'conditioning',
  sc_session_family: null,
  placement_source: 'generated',
  progression_intent: 'Build speed while tracking meters.',
  carry_forward_reason: null,
  session_modules: null,
  dose_credits: null,
  dose_summary: null,
  realized_dose_buckets: null,
  estimated_duration_min: 45,
  target_intensity: 8,
  status: 'planned',
  rescheduled_to: null,
  workout_log_id: null,
  prescription_snapshot: {
    scSessionFamily: 'acceleration',
    sessionComposition: [{ bucket: 'conditioning', focus: 'conditioning', durationMin: 45, preserveOnYellow: true }],
    doseCredits: [{ bucket: 'conditioning', credit: 1, reason: 'Primary sprint dose' }],
    doseSummary: { sprintMeters: 160, highImpactCount: 8, tissueStressLoad: 5 },
    sessionPrescription: {
      sessionFamily: 'acceleration',
      dose: { sprintMeters: 160 },
    },
  },
  engine_notes: 'Speed emphasis.',
  is_deload: false,
} as unknown as Omit<WeeklyPlanEntryRow, 'id' | 'created_at'>;

const payload = buildWeeklyPlanEntryInsertPayload('user-1', entry);

assert('persists session family', payload.session_family === 'conditioning');
assert('falls back sc_session_family from prescription', payload.sc_session_family === 'acceleration');
assert('persists placement source', payload.placement_source === 'generated');
assert('persists progression intent', payload.progression_intent === 'Build speed while tracking meters.');
assert('persists session modules from prescription', Array.isArray(payload.session_modules));
assert('persists dose credits from prescription', Array.isArray(payload.dose_credits));
assert('persists dose summary from prescription', (payload.dose_summary as any)?.sprintMeters === 160);
assert('normalizes missing realized buckets to empty array', Array.isArray(payload.realized_dose_buckets) && (payload.realized_dose_buckets as unknown[]).length === 0);
assert('does not persist daily athlete summary mirrors', !('daily_performance_summary_snapshot' in payload));

if (failed > 0) {
  throw new Error(`weeklyPlanPersistence tests failed: ${failed}`);
}

console.log(`weeklyPlanPersistence tests passed: ${passed}`);
