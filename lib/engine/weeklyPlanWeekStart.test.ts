import { resolveWeeklyPlanWeekStart } from './weeklyPlanWeekStart.ts';

let failed = 0;

function expectEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    failed += 1;
    console.error(`FAIL: ${message}\n  expected: ${String(expected)}\n  received: ${String(actual)}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

expectEqual(
  resolveWeeklyPlanWeekStart({
    forceStartDate: '2026-04-14',
    activeWeekStart: '2026-04-07',
    todayEngineWeekStart: '2026-03-31',
    latestGeneratedWeekStart: '2026-04-21',
  }),
  '2026-04-14',
  'prefers the explicit force-start week over all other sources',
);

expectEqual(
  resolveWeeklyPlanWeekStart({
    activeWeekStart: '2026-04-07',
    todayEngineWeekStart: '2026-03-31',
    latestGeneratedWeekStart: '2026-04-21',
  }),
  '2026-04-07',
  'prefers the currently selected active week when no force-start is provided',
);

expectEqual(
  resolveWeeklyPlanWeekStart({
    todayEngineWeekStart: '2026-03-31',
    latestGeneratedWeekStart: '2026-04-21',
  }),
  '2026-03-31',
  'prefers today engine-derived week before falling back to the latest generated week',
);

expectEqual(
  resolveWeeklyPlanWeekStart({
    todayEngineWeekStart: null,
    latestGeneratedWeekStart: '2026-04-21',
  }),
  '2026-04-21',
  'falls back to the latest generated week when today has no engine-derived week',
);

expectEqual(
  resolveWeeklyPlanWeekStart({}),
  null,
  'returns null when no week source exists',
);

if (failed > 0) {
  process.exit(1);
}
