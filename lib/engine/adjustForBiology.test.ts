/**
 * Standalone test for lib/engine/adjustForBiology.ts
 */

import { adjustForBiology } from './adjustForBiology.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function assertThrows(label: string, fn: () => void) {
  try {
    fn();
    failed++;
    console.error(`  FAIL ${label} (expected throw, did not throw)`);
  } catch {
    passed++;
    console.log(`  PASS ${label}`);
  }
}

console.log('\n-- adjustForBiology --');

(() => {
  // --- Menstrual phase (days 1-5) ---
  {
    const r = adjustForBiology({ cycleDay: 1 });
    assert('Day 1 phase is menstrual', r.cyclePhase === 'menstrual');
    assert('Day 1 cardioModifier is 0.85', r.cardioModifier === 0.85);
    assert('Day 1 proteinModifier is 1.0', r.proteinModifier === 1.0);
    assert('Day 1 message contains "Early cycle"', r.message.includes('Early cycle'));
  }
  {
    const r = adjustForBiology({ cycleDay: 5 });
    assert('Day 5 (boundary) phase is menstrual', r.cyclePhase === 'menstrual');
    assert('Day 5 cardioModifier is 0.85', r.cardioModifier === 0.85);
  }

  // --- Follicular phase (days 6-13) ---
  {
    const r = adjustForBiology({ cycleDay: 6 });
    assert('Day 6 phase is follicular', r.cyclePhase === 'follicular');
    assert('Day 6 cardioModifier is 1.1', r.cardioModifier === 1.1);
    assert('Day 6 proteinModifier is 1.0', r.proteinModifier === 1.0);
    assert('Day 6 message contains "Follicular"', r.message.includes('Follicular'));
  }
  {
    const r = adjustForBiology({ cycleDay: 13 });
    assert('Day 13 (boundary) phase is follicular', r.cyclePhase === 'follicular');
  }

  // --- Ovulatory phase (day 14) ---
  {
    const r = adjustForBiology({ cycleDay: 14 });
    assert('Day 14 phase is ovulatory', r.cyclePhase === 'ovulatory');
    assert('Day 14 cardioModifier is 1.08', r.cardioModifier === 1.08);
    assert('Day 14 proteinModifier is 1.0', r.proteinModifier === 1.0);
    assert('Day 14 message contains "Ovulation"', r.message.includes('Ovulation'));
  }

  // --- Ovulatory window continues through day 15 ---
  {
    const r = adjustForBiology({ cycleDay: 15 });
    assert('Day 15 phase is ovulatory', r.cyclePhase === 'ovulatory');
    assert('Day 15 cardioModifier is 1.08', r.cardioModifier === 1.08);
    assert('Day 15 proteinModifier is 1.0', r.proteinModifier === 1.0);
  }
  // --- Luteal-early phase (days 16-19) ---
  {
    const r = adjustForBiology({ cycleDay: 19 });
    assert('Day 19 (boundary) phase is luteal-early', r.cyclePhase === 'luteal-early');
  }

  // --- Luteal-late phase (days 20-28) ---
  {
    const r = adjustForBiology({ cycleDay: 20, energyDeficitPercent: 10 });
    assert('Day 20 phase is luteal-late', r.cyclePhase === 'luteal-late');
    assert('Day 20 cardioModifier is 0.8', r.cardioModifier === 0.8);
    assert('Day 20 proteinModifier is 1.15', r.proteinModifier === 1.15);
    assert('Day 20 message matches exact late-luteal text',
      r.message === 'Your body is working harder internally this week. We are dialing back the cardio intensity today and bumping up your protein.');
  }
  {
    const r = adjustForBiology({ cycleDay: 28 });
    assert('Day 28 (boundary) phase is luteal-late', r.cyclePhase === 'luteal-late');
    assert('Day 28 cardioModifier is 0.8', r.cardioModifier === 0.8);
  }

  // --- Invalid inputs ---
  assertThrows('Day 0 throws', () => adjustForBiology({ cycleDay: 0 }));
  assertThrows('Day 29 throws', () => adjustForBiology({ cycleDay: 29 }));
  assertThrows('Day -1 throws', () => adjustForBiology({ cycleDay: -1 }));
  assertThrows('Day 14.5 (non-integer) throws', () => adjustForBiology({ cycleDay: 14.5 as any }));

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
