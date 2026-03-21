/**
 * Standalone test script for lib/engine/presentation/decisionReason.ts
 * Run with: npx tsx lib/engine/presentation/decisionReason.test.ts
 */

import { getPrimaryDecisionReason, getDecisionReason, getAllDecisionReasons } from './decisionReason.ts';
import type { DecisionTraceItem } from '../types/mission.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function makeItem(overrides: Partial<DecisionTraceItem> = {}): DecisionTraceItem {
  return {
    subsystem: 'training',
    title: 'Test item',
    detail: 'Some detail. Second sentence.',
    humanInterpretation: null,
    impact: 'kept',
    ...overrides,
  };
}

console.log('\n── getPrimaryDecisionReason ──');

// Empty trace → fallback
const fallback = getPrimaryDecisionReason([]);
assert('empty trace: fallback impact = kept', fallback.impact === 'kept');
assert('empty trace: fallback subsystem = training', fallback.subsystem === 'training');

// Highest impact wins: escalated > restricted > adjusted > kept
const trace = [
  makeItem({ impact: 'kept', title: 'Kept item' }),
  makeItem({ impact: 'adjusted', title: 'Adjusted item' }),
  makeItem({ impact: 'escalated', title: 'Escalated item', subsystem: 'risk' }),
];
const primary = getPrimaryDecisionReason(trace);
assert('returns highest-impact item', primary.impact === 'escalated');
assert('returns correct title', primary.title === 'Escalated item');

// restricted > adjusted
const restrictedVsAdjusted = getPrimaryDecisionReason([
  makeItem({ impact: 'adjusted' }),
  makeItem({ impact: 'restricted', title: 'Restricted', subsystem: 'fuel' }),
]);
assert('restricted wins over adjusted', restrictedVsAdjusted.impact === 'restricted');

// humanInterpretation used when present
const withHuman = getPrimaryDecisionReason([
  makeItem({ humanInterpretation: 'Human friendly text. Extra.', impact: 'adjusted' }),
]);
assert('humanInterpretation used over detail', withHuman.sentence === 'Human friendly text.');

// Falls back to detail when humanInterpretation is null
const withDetail = getPrimaryDecisionReason([
  makeItem({ detail: 'Detail sentence. More.', humanInterpretation: null, impact: 'adjusted' }),
]);
assert('detail used when humanInterpretation null', withDetail.sentence === 'Detail sentence.');

// Sentence truncated to first sentence and punctuated
const long = getPrimaryDecisionReason([
  makeItem({ detail: 'First sentence here', humanInterpretation: null, impact: 'adjusted' }),
]);
assert('sentence ends with period', long.sentence.endsWith('.'));

console.log('\n── getDecisionReason ──');

const subsystemTrace = [
  makeItem({ subsystem: 'training', title: 'Training item', impact: 'adjusted' }),
  makeItem({ subsystem: 'fuel', title: 'Fuel item', impact: 'kept' }),
];

const fuelMatch = getDecisionReason(subsystemTrace, 'fuel');
assert('returns matching subsystem item', fuelMatch.title === 'Fuel item');

const noMatch = getDecisionReason(subsystemTrace, 'hydration', 'Custom fallback sentence');
assert('no match: subsystem is requested subsystem', noMatch.subsystem === 'hydration');
assert('no match: uses fallback sentence', noMatch.sentence === 'Custom fallback sentence');

const noMatchNoFallback = getDecisionReason(subsystemTrace, 'recovery');
assert('no match without fallback: has default sentence', noMatchNoFallback.sentence.length > 0);

console.log('\n── getAllDecisionReasons ──');

const all = getAllDecisionReasons([
  makeItem({ subsystem: 'training', impact: 'kept' }),
  makeItem({ subsystem: 'fuel', impact: 'adjusted' }),
  makeItem({ subsystem: 'risk', impact: 'escalated' }),
]);
assert('returns one entry per trace item', all.length === 3);
assert('preserves order', all[0].subsystem === 'training' && all[1].subsystem === 'fuel');
assert('maps impacts correctly', all[2].impact === 'escalated');

// Empty trace returns empty array
assert('empty trace returns empty array', getAllDecisionReasons([]).length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
