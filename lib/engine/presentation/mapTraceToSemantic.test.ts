/**
 * Standalone test script for lib/engine/presentation/mapTraceToSemantic.ts
 * Run with: npx tsx lib/engine/presentation/mapTraceToSemantic.test.ts
 */

import { mapTraceToSemantic, mapTraceToAttentionType } from './mapTraceToSemantic.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

console.log('\n── mapTraceToSemantic ──');

// Nutrition traces → caution
assert('nutrition_deficit → caution', mapTraceToSemantic('nutrition_deficit') === 'caution');
assert('nutrition_surplus → caution', mapTraceToSemantic('nutrition_surplus') === 'caution');
assert('nutrition_warning → caution', mapTraceToSemantic('nutrition_warning') === 'caution');
assert('hydration_warning → caution', mapTraceToSemantic('hydration_warning') === 'caution');

// Recovery / safety → alert
assert('recovery_low → alert', mapTraceToSemantic('recovery_low') === 'alert');
assert('overtraining_risk → alert', mapTraceToSemantic('overtraining_risk') === 'alert');
assert('safety_gate_triggered → alert', mapTraceToSemantic('safety_gate_triggered') === 'alert');
assert('session_modified → alert', mapTraceToSemantic('session_modified') === 'alert');
assert('deload_recommended → alert', mapTraceToSemantic('deload_recommended') === 'alert');

// Weight traces
assert('weight_check_reminder → caution', mapTraceToSemantic('weight_check_reminder') === 'caution');
assert('weight_alert → alert', mapTraceToSemantic('weight_alert') === 'alert');

// Scheduling / informational → info
assert('phase_transition → info', mapTraceToSemantic('phase_transition') === 'info');
assert('schedule_change → info', mapTraceToSemantic('schedule_change') === 'info');

// Positive → positive
assert('compliance_streak → positive', mapTraceToSemantic('compliance_streak') === 'positive');
assert('pr_achieved → positive', mapTraceToSemantic('pr_achieved') === 'positive');
assert('performance_gain → positive', mapTraceToSemantic('performance_gain') === 'positive');

// Unknown trace type falls back to info
assert('unknown type → info', mapTraceToSemantic('some_unknown_trace') === 'info');
assert('empty string → info', mapTraceToSemantic('') === 'info');

console.log('\n── mapTraceToAttentionType ──');

// Nutrition group
assert('nutrition_deficit → nutrition', mapTraceToAttentionType('nutrition_deficit') === 'nutrition');
assert('nutrition_warning → nutrition', mapTraceToAttentionType('nutrition_warning') === 'nutrition');
assert('hydration_warning → nutrition', mapTraceToAttentionType('hydration_warning') === 'nutrition');

// Recovery group
assert('recovery_low → recovery', mapTraceToAttentionType('recovery_low') === 'recovery');
assert('overtraining_risk → recovery', mapTraceToAttentionType('overtraining_risk') === 'recovery');
assert('safety_gate_triggered → recovery', mapTraceToAttentionType('safety_gate_triggered') === 'recovery');
assert('deload_recommended → recovery', mapTraceToAttentionType('deload_recommended') === 'recovery');

// Weight group
assert('weight_check_reminder → weight', mapTraceToAttentionType('weight_check_reminder') === 'weight');
assert('weight_alert → weight', mapTraceToAttentionType('weight_alert') === 'weight');

// Positive group
assert('pr_achieved → positive', mapTraceToAttentionType('pr_achieved') === 'positive');
assert('compliance_streak → positive', mapTraceToAttentionType('compliance_streak') === 'positive');
assert('performance_gain → positive', mapTraceToAttentionType('performance_gain') === 'positive');

// Informational / unknown → info
assert('phase_transition → info', mapTraceToAttentionType('phase_transition') === 'info');
assert('schedule_change → info', mapTraceToAttentionType('schedule_change') === 'info');
assert('unknown → info', mapTraceToAttentionType('unknown_type') === 'info');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
