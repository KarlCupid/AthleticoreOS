import {
  compareRiskSeverity,
  confidenceFromLevel,
  createExplanation,
  createMissingDataRisk,
  createProfessionalReviewRisk,
  createRiskFlag,
  explainConfidence,
  explainPhaseTransition,
  explainPlanAdjustment,
  getBlockingRiskFlags,
  hasBlockingRisk,
  RISK_FLAG_CODES,
  RISK_FLAG_DEFINITIONS,
} from '../index.ts';

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

console.log('\n-- risk safety and explanation engine --');

(() => {
  const expectedCodes = [
    'under_fueling_risk',
    'unsafe_weight_class_target',
    'excessive_training_load',
    'protected_workout_conflict',
    'poor_readiness',
    'injury_conflict',
    'illness_conflict',
    'missing_data',
    'low_nutrition_confidence',
    'rapid_body_mass_change',
    'competition_proximity_conflict',
    'duplicate_or_conflicting_plan',
    'professional_review_required',
  ] as const;

  assert('risk flag definitions include all Phase 4 codes', expectedCodes.every((code) => RISK_FLAG_CODES.includes(code)));
  assert('risk flag code list has no duplicates', new Set(RISK_FLAG_CODES).size === RISK_FLAG_CODES.length);
  assert('risk definitions and exported codes share one source of truth', Object.keys(RISK_FLAG_DEFINITIONS).length === RISK_FLAG_CODES.length);
  assert('risk definition keys match their codes', RISK_FLAG_CODES.every((code) => RISK_FLAG_DEFINITIONS[code].code === code));
})();

(() => {
  assert('critical severity ranks above high', compareRiskSeverity('critical', 'high') > 0);
  assert('high severity ranks above moderate', compareRiskSeverity('high', 'moderate') > 0);
  assert('low severity ranks above info', compareRiskSeverity('low', 'info') > 0);
})();

(() => {
  const monitored = createRiskFlag({
    id: 'fuel-monitor',
    code: 'under_fueling_risk',
    severity: 'moderate',
    message: 'Fuel availability needs monitoring.',
  });
  const blocked = createRiskFlag({
    id: 'fuel-block',
    code: 'under_fueling_risk',
    severity: 'high',
    message: 'Severe under-fueling risk blocks this plan.',
  });

  assert('risk flag creation attaches canonical domain', monitored.domain === 'nutrition');
  assert('moderate under-fueling risk does not block by default', !monitored.blocksPlan);
  assert('severe under-fueling risk blocks plan', blocked.blocksPlan);
  assert('blocking risk helper returns only blocking flags', getBlockingRiskFlags([monitored, blocked]).length === 1);
  assert('hasBlockingRisk detects blocking flag', hasBlockingRisk([monitored, blocked]));
})();

(() => {
  const unsafeTarget = createRiskFlag({
    id: 'unsafe-target',
    code: 'unsafe_weight_class_target',
    evidence: [
      { metric: 'requested_loss_lb', value: 12 },
      { metric: 'timeframe_days', value: 10 },
    ],
  });
  const rapidLoss = createRiskFlag({
    id: 'minor-rapid-loss',
    code: 'rapid_body_mass_change',
    severity: 'critical',
    message: 'Dangerous rapid weight-loss behavior was requested by a minor athlete.',
    evidence: [{ metric: 'minor_athlete', value: true }],
  });

  assert('unsafe weight-class target blocks plan', unsafeTarget.blocksPlan);
  assert('unsafe weight-class target requires professional review', unsafeTarget.requiresProfessionalReview);
  assert('dangerous rapid body-mass change blocks when critical', rapidLoss.blocksPlan);
  assert('rapid body-mass change can require professional review', rapidLoss.requiresProfessionalReview);
})();

(() => {
  const poorReadiness = createRiskFlag({
    id: 'critical-readiness',
    code: 'poor_readiness',
    severity: 'critical',
  });
  const injury = createRiskFlag({
    id: 'injury-conflict',
    code: 'injury_conflict',
  });
  const illness = createRiskFlag({
    id: 'illness-conflict',
    code: 'illness_conflict',
  });
  const competition = createRiskFlag({
    id: 'competition-conflict',
    code: 'competition_proximity_conflict',
  });

  assert('critical readiness state blocks plan', poorReadiness.blocksPlan);
  assert('injury conflict blocks plan', injury.blocksPlan);
  assert('illness conflict blocks plan', illness.blocksPlan);
  assert('competition proximity conflict blocks plan', competition.blocksPlan);
})();

(() => {
  const missing = createMissingDataRisk({
    id: 'missing-readiness',
    context: 'Readiness',
    missingFields: ['sleep', 'soreness'],
  });

  assert('missing data risk uses canonical code', missing.code === 'missing_data');
  assert('missing data risk is non-blocking by default', !missing.blocksPlan);
  assert('missing data risk records evidence', missing.evidence.some((item) => item.metric === 'sleep'));
  assert('missing data explanation is typed', missing.explanation?.kind === 'missing_data');
  assert('missing data explanation treats data as unknown', Boolean(missing.explanation?.reasons.some((reason) => reason.includes('unknown'))));
})();

(() => {
  const review = createProfessionalReviewRisk({
    id: 'review-required',
    message: 'Professional review is required before aggressive body-mass change.',
  });

  assert('professional review flag uses canonical code', review.code === 'professional_review_required');
  assert('professional review flag blocks plan', review.blocksPlan);
  assert('professional review flag escalates', review.requiresProfessionalReview);
  assert('professional review explanation is human readable', review.explanation?.summary.includes('Professional review') ?? false);
})();

(() => {
  const explanation = createExplanation({
    kind: 'decision',
    summary: 'Protected sparring was preserved as a fixed anchor.',
    reasons: ['Protected workouts are non-negotiable anchors.'],
    confidence: confidenceFromLevel('medium'),
  });
  const phase = explainPhaseTransition({
    from: 'build',
    to: 'camp',
    reason: 'fight_confirmed',
    preserved: ['protected workouts', 'readiness history'],
  });
  const confidence = explainConfidence({
    context: 'Readiness',
    confidence: confidenceFromLevel('low', ['Sleep and soreness data are missing.']),
  });
  const adjustment = explainPlanAdjustment({
    summary: 'This recommendation is blocked because the requested body mass change appears unsafe for the available timeframe.',
    reasons: ['Unsafe weight-class targets block automatic planning.'],
    blocked: true,
  });

  assert('decision explanation is typed', explanation.kind === 'decision');
  assert('phase transition explanation is typed', phase.kind === 'phase_transition');
  assert('phase transition explanation preserves journey context', phase.reasons.some((reason) => reason.includes('protected workouts')));
  assert('confidence explanation cites missing data', confidence.summary === 'Readiness confidence is low.');
  assert('plan adjustment explanation can be blocking', adjustment.impact === 'restricted');
})();

(() => {
  const flag = createRiskFlag({
    id: 'protected-conflict',
    code: 'protected_workout_conflict',
    message: 'Protected sparring conflicts with the proposed hard session.',
  });

  assert('protected workout conflict blocks plan', flag.blocksPlan);
  assert('risk explanation is typed', flag.explanation?.kind === 'risk');
  assert('risk explanation says blocked', flag.explanation?.summary.toLowerCase().includes('blocked') ?? false);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
