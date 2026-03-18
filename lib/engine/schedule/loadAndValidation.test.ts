import { getRecoveryWindow, validateDayLoad } from './loadAndValidation.ts';

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

console.log('\n-- schedule/loadAndValidation --');

(() => {
  // Recovery windows per activity type at high intensity
  assert('Sparring at intensity 7 → 48h recovery', getRecoveryWindow('sparring' as any, 7) === 48);
  assert('SC at intensity 7 → 36h recovery', getRecoveryWindow('sc' as any, 7) === 36);
  assert('Running at intensity 8 → 24h recovery', getRecoveryWindow('running' as any, 8) === 24);
  assert('Active recovery never blocks (0h)', getRecoveryWindow('active_recovery' as any, 5) === 0);

  // Low intensity reduces recovery window (floor(hours * 0.3))
  // sparring at intensity 5 (< threshold 7): floor(48*0.3) = 14
  assert('Sparring low intensity → floor(48*0.3)=14h', getRecoveryWindow('sparring' as any, 5) === 14);

  // validateDayLoad: empty day is safe rest day
  const restDay = validateDayLoad([]);
  assert('Empty day is safe rest day', restDay.safe === true && restDay.totalLoad === 0);

  // validateDayLoad: moderate single session is safe
  const moderateDay = validateDayLoad([
    { activity_type: 'boxing_practice' as any, expected_intensity: 6, estimated_duration_min: 60 },
  ]);
  assert('Single moderate session is safe', moderateDay.safe === true);

  // validateDayLoad: heavy sparring + heavy SC on same day is unsafe
  const overloadDay = validateDayLoad([
    { activity_type: 'sparring' as any, expected_intensity: 8, estimated_duration_min: 60 },
    { activity_type: 'sc' as any, expected_intensity: 8, estimated_duration_min: 60 },
  ]);
  assert('Heavy sparring + heavy SC same day is unsafe', overloadDay.safe === false);

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
