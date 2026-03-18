/**
 * mapTraceToSemantic — pure function mapping engine decisionTrace types to SEMANTIC_PALETTE tiers.
 *
 * This is the bridge between the engine's decision output and the AttentionCard's visual tier.
 * Only AttentionCard and coaching note components should consume this function.
 */

import { SemanticTier } from '../../../src/theme/theme';

// Subset of engine decision trace types that surface to the UI
export type DecisionTraceType =
    | 'nutrition_deficit'
    | 'nutrition_surplus'
    | 'nutrition_warning'
    | 'hydration_warning'
    | 'recovery_low'
    | 'overtraining_risk'
    | 'safety_gate_triggered'
    | 'session_modified'
    | 'deload_recommended'
    | 'weight_check_reminder'
    | 'weight_alert'
    | 'phase_transition'
    | 'schedule_change'
    | 'compliance_streak'
    | 'pr_achieved'
    | 'performance_gain';

const TRACE_TO_SEMANTIC: Record<DecisionTraceType, SemanticTier> = {
    // Nutrition — caution tier
    nutrition_deficit:      'caution',
    nutrition_surplus:      'caution',
    nutrition_warning:      'caution',
    hydration_warning:      'caution',

    // Recovery / safety — alert tier
    recovery_low:           'alert',
    overtraining_risk:      'alert',
    safety_gate_triggered:  'alert',
    session_modified:       'alert',
    deload_recommended:     'alert',

    // Weight — caution tier (non-urgent reminders) / alert (danger zone)
    weight_check_reminder:  'caution',
    weight_alert:           'alert',

    // Scheduling / informational — info tier
    phase_transition:       'info',
    schedule_change:        'info',

    // Positive — positive tier
    compliance_streak:      'positive',
    pr_achieved:            'positive',
    performance_gain:       'positive',
};

/**
 * Map a decisionTrace type to its SemanticTier for AttentionCard rendering.
 * Falls back to 'info' for any unknown trace type.
 */
export function mapTraceToSemantic(traceType: DecisionTraceType | string): SemanticTier {
    return (TRACE_TO_SEMANTIC as Record<string, SemanticTier>)[traceType] ?? 'info';
}

/**
 * Map a trace type to its AttentionCard type (which overlaps with SemanticTier for most cases).
 * Use this when mapping to AttentionCard's `type` prop.
 */
export function mapTraceToAttentionType(
    traceType: DecisionTraceType | string,
): 'nutrition' | 'recovery' | 'weight' | 'positive' | 'info' {
    const nutritionTypes = new Set(['nutrition_deficit', 'nutrition_surplus', 'nutrition_warning', 'hydration_warning']);
    const recoveryTypes  = new Set(['recovery_low', 'overtraining_risk', 'safety_gate_triggered', 'session_modified', 'deload_recommended']);
    const weightTypes    = new Set(['weight_check_reminder', 'weight_alert']);
    const positiveTypes  = new Set(['compliance_streak', 'pr_achieved', 'performance_gain']);

    if (nutritionTypes.has(traceType)) return 'nutrition';
    if (recoveryTypes.has(traceType))  return 'recovery';
    if (weightTypes.has(traceType))    return 'weight';
    if (positiveTypes.has(traceType))  return 'positive';
    return 'info';
}
