import { detectOvertrainingRisk } from './safety.ts';

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

console.log('\n-- schedule/safety --');

(() => {
  const highACWRWarnings = detectOvertrainingRisk(
    [
      { activity_type: 'sparring', expected_intensity: 9, estimated_duration_min: 60, date: '2026-03-16' },
      { activity_type: 'sc', expected_intensity: 8, estimated_duration_min: 60, date: '2026-03-17' },
    ],
    1.8,
    4.0,
    false,
  );

  assert('High ACWR produces at least one warning', highACWRWarnings.length > 0);
  assert('High ACWR can produce danger warning', highACWRWarnings.some((warning) => warning.severity === 'danger'));
})();

(() => {
  const cutWarnings = detectOvertrainingRisk(
    [
      { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 60, date: '2026-03-16' },
      { activity_type: 'conditioning', expected_intensity: 8, estimated_duration_min: 45, date: '2026-03-17' },
      { activity_type: 'sc', expected_intensity: 8, estimated_duration_min: 60, date: '2026-03-18' },
    ],
    1.35,
    4.0,
    true,
  );

  assert('Active cut lowers load tolerance', cutWarnings.length > 0);
})();

(() => {
  const sleepWarnings = detectOvertrainingRisk(
    [
      { activity_type: 'sc', expected_intensity: 5, estimated_duration_min: 45, date: '2026-03-16' },
    ],
    1.0,
    2.5,
    false,
  );

  assert('Poor sleep produces danger warning', sleepWarnings.some((warning) => warning.title === 'Poor Sleep Quality'));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
