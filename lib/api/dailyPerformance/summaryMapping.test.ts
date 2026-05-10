import { buildDailyAthleteSummaryFromUnified } from './summaryMapping';
import type { ComposedSession, UnifiedPerformanceEngineResult } from '../../performance-engine';

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

function supportSession(overrides: Partial<ComposedSession> = {}): ComposedSession {
  return {
    id: 'support-session',
    date: '2026-05-04',
    family: 'strength',
    source: 'engine_generated',
    protectedAnchor: false,
    anchorId: null,
    title: 'Strength support: trunk transfer',
    durationMinutes: { target: 35, min: 30, max: 40, unit: 'minute', confidence: { level: 'medium', reasons: [] } },
    intensityRpe: { target: 6, min: 5, max: 7, unit: 'rpe', confidence: { level: 'medium', reasons: [] } },
    startsAt: null,
    tissueLoads: ['trunk_transfer'],
    supportMetadata: {
      athleticDevelopmentDomain: 'strength',
      boxingSessionFamily: 'strength_power',
      boxingSessionRole: 'support_session',
      supportDomainLabel: 'Strength & power support',
      expectedFuelPriority: 'strength_power',
      expectedCarbDemandClass: 'moderate',
      expectedRecoveryDemandClass: 'high',
      expectedHydrationDemandClass: 'moderate',
      sessionEnergyDemandScore: 52,
      sessionRecoveryDemandScore: 64,
      sAndCRationale: 'Build force transfer for cleaner punching mechanics.',
      boxingRelevance: 'Supports boxing without replacing coach-led practice.',
      athleticDevelopmentRationale: 'Strength work fills the week quality gap.',
    },
    explanation: { kind: 'training', summary: 'Fallback summary.', reasons: [], impact: 'adjusted' },
    confidence: { level: 'medium', reasons: [] },
    ...overrides,
  } as unknown as ComposedSession;
}

function unifiedResult(session: ComposedSession): UnifiedPerformanceEngineResult {
  return {
    engineVersion: 'test',
    performanceState: {
      asOfDate: '2026-05-04',
      generatedAt: '2026-05-04T12:00:00.000Z',
      phase: { current: 'build', activeSince: '2026-05-04', plannedUntil: null, transitionReason: 'build_phase_started', transitionHistory: [] },
    },
    finalPlanStatus: 'ready',
    canonicalOutputs: {
      composedSessions: [session],
      trainingBlock: {
        goal: 'strength',
        explanation: { kind: 'training', summary: 'Training block fallback.', reasons: [], impact: 'adjusted' },
      },
      readiness: {
        recommendedTrainingAdjustment: {
          type: 'normal',
          replaceWithMobility: false,
        },
      },
      nutritionTarget: null,
      sessionFuelingDirectives: [],
    },
    explanations: [{ kind: 'training', summary: 'Unified explanation.', reasons: ['Test reason.'], impact: 'adjusted' }],
    riskFlags: [],
    blockingRiskFlags: [],
  } as unknown as UnifiedPerformanceEngineResult;
}

function build(session: ComposedSession) {
  return buildDailyAthleteSummaryFromUnified({
    date: '2026-05-04',
    objectiveContext: {
      performanceObjective: {
        mode: 'build_phase',
        goalType: 'general_athleticism',
        primaryOutcome: 'Build athletic base',
        secondaryConstraint: 'none',
        goalLabel: null,
        targetMetric: 'none',
        targetValue: null,
        targetUnit: null,
        deadline: null,
        horizonWeeks: null,
        successWindow: null,
      },
      weightClassState: 'none',
    } as any,
    readinessProfile: { flags: [] } as any,
    constraintSet: {} as any,
    medStatus: null,
    hydration: { dailyWaterOz: 96, message: 'Hydrate steadily.' } as any,
    workoutPrescription: null,
    unifiedPerformance: unifiedResult(session),
  }).summary;
}

console.log('\n-- daily athlete summary support metadata --');

(() => {
  const summary = build(supportSession());
  assert('strength support metadata reaches training directive', summary.trainingDirective.athleticDevelopmentDomain === 'strength'
    && summary.trainingDirective.supportDomainLabel === 'Strength & power support'
    && summary.trainingDirective.expectedFuelPriority === 'strength_power');
  assert('strength support demand scores reach training directive', summary.trainingDirective.sessionEnergyDemandScore === 52
    && summary.trainingDirective.sessionRecoveryDemandScore === 64);
  assert('support rationale wins over title/fallback copy', summary.trainingDirective.reason === 'Build force transfer for cleaner punching mechanics.');
  assert('strength support metadata reaches fuel directive', summary.fuelDirective.supportDomainLabel === 'Strength & power support'
    && summary.fuelDirective.athleticDevelopmentDomain === 'strength'
    && summary.fuelDirective.expectedFuelPriority === 'strength_power'
    && summary.fuelDirective.expectedCarbDemandClass === 'moderate'
    && summary.fuelDirective.sessionEnergyDemandScore === 52
    && summary.fuelDirective.boxingSessionFamily === 'strength_power'
    && summary.fuelDirective.boxingSessionRole === 'support_session'
    && summary.fuelDirective.boxingRelevance === 'Supports boxing without replacing coach-led practice.'
    && summary.fuelDirective.sAndCRationale === 'Build force transfer for cleaner punching mechanics.'
    && summary.fuelDirective.athleticDevelopmentRationale === 'Strength work fills the week quality gap.');
  assert('fuel directive reasons explain direct support metadata', summary.fuelDirective.reasons.some((reason) => reason.includes('direct strength power metadata')));
})();

(() => {
  const summary = build(supportSession({
    family: 'roadwork',
    title: 'Roadwork base',
    supportMetadata: {
      athleticDevelopmentDomain: 'roadwork',
      supportDomainLabel: 'Roadwork support',
      expectedFuelPriority: 'roadwork_aerobic',
      expectedCarbDemandClass: 'moderate',
      expectedRecoveryDemandClass: 'moderate',
      expectedHydrationDemandClass: 'moderate',
      sessionEnergyDemandScore: 46,
      sessionRecoveryDemandScore: 38,
      sAndCRationale: 'Build aerobic support for repeat-round recovery.',
    },
  }));
  assert('roadwork support keeps direct fuel priority in training directive', summary.trainingDirective.expectedFuelPriority === 'roadwork_aerobic');
  assert('roadwork support also drives nutrition priority directly', summary.fuelDirective.prioritySession === 'roadwork_aerobic');
  assert('roadwork support exposes fuel metadata directly', summary.fuelDirective.supportDomainLabel === 'Roadwork support'
    && summary.fuelDirective.expectedFuelPriority === 'roadwork_aerobic'
    && summary.fuelDirective.expectedCarbDemandClass === 'moderate'
    && summary.fuelDirective.expectedRecoveryDemandClass === 'moderate'
    && summary.fuelDirective.expectedHydrationDemandClass === 'moderate'
    && summary.fuelDirective.sAndCRationale === 'Build aerobic support for repeat-round recovery.');
})();

(() => {
  const summary = build(supportSession({
    family: 'recovery',
    title: 'Durability support',
    intensityRpe: { target: 3, min: 2, max: 4, unit: 'rpe', confidence: { level: 'medium', score: 0.7, reasons: [] }, precision: 'range' },
    supportMetadata: {
      athleticDevelopmentDomain: 'durability',
      boxingSessionFamily: 'shoulder_scap_durability',
      boxingSessionRole: 'support_session',
      supportDomainLabel: 'Durability support',
      expectedFuelPriority: 'durability',
      expectedCarbDemandClass: 'low',
      expectedRecoveryDemandClass: 'moderate',
      expectedHydrationDemandClass: 'baseline',
      sessionEnergyDemandScore: 22,
      sessionRecoveryDemandScore: 35,
      sAndCRationale: 'Build tissue capacity without adding sparring load.',
    },
  }));
  assert('durability support stays recovery/support, not boxing practice', summary.trainingDirective.workoutType === 'recovery'
    && summary.trainingDirective.sessionRole === 'recover'
    && summary.trainingDirective.expectedFuelPriority === 'durability');
  assert('durability support exposes recovery demand metadata to fuel directive', summary.fuelDirective.expectedFuelPriority === 'durability'
    && summary.fuelDirective.expectedRecoveryDemandClass === 'moderate'
    && summary.fuelDirective.sessionRecoveryDemandScore === 35
    && summary.fuelDirective.boxingSessionFamily === 'shoulder_scap_durability'
    && summary.fuelDirective.sAndCRationale === 'Build tissue capacity without adding sparring load.');
})();

(() => {
  const summary = build(supportSession({
    family: 'boxing_skill',
    title: 'Skill support: footwork rhythm',
    durationMinutes: { target: 15, min: 10, max: 20, unit: 'minute', confidence: { level: 'medium', score: 0.7, reasons: [] }, precision: 'range' },
    intensityRpe: { target: 3, min: 2, max: 4, unit: 'rpe', confidence: { level: 'medium', score: 0.7, reasons: [] }, precision: 'range' },
    supportMetadata: {
      athleticDevelopmentDomain: 'boxing_skill_support',
      boxingSessionFamily: 'footwork_agility',
      boxingSessionRole: 'footwork_agility',
      supportDomainLabel: 'Skill support',
      expectedFuelPriority: 'mobility',
      expectedCarbDemandClass: 'low',
      expectedRecoveryDemandClass: 'low',
      expectedHydrationDemandClass: 'baseline',
      sessionEnergyDemandScore: 20,
      sessionRecoveryDemandScore: 18,
      plannedIntensity: 'low',
      sAndCRationale: 'Keep footwork quality sharp without adding sparring load.',
    },
  }));
  assert('boxing skill support microdose does not become spar support', summary.trainingDirective.sessionRole !== 'spar_support'
    && summary.trainingDirective.sessionRole === 'develop');
})();

(() => {
  const summary = build(supportSession({
    family: 'conditioning',
    title: 'Conditioning support: alactic repeats',
    durationMinutes: { target: 36, min: 32, max: 40, unit: 'minute', confidence: { level: 'medium', score: 0.7, reasons: [] }, precision: 'range' },
    intensityRpe: { target: 8, min: 7, max: 9, unit: 'rpe', confidence: { level: 'medium', score: 0.7, reasons: [] }, precision: 'range' },
    supportMetadata: {
      athleticDevelopmentDomain: 'conditioning',
      boxingSessionFamily: 'alactic_repeat_power',
      boxingSessionRole: 'alactic_repeat_power',
      supportDomainLabel: 'Conditioning support',
      expectedFuelPriority: 'conditioning_intervals',
      expectedCarbDemandClass: 'high',
      expectedRecoveryDemandClass: 'high',
      expectedHydrationDemandClass: 'high',
      sessionEnergyDemandScore: 82,
      sessionRecoveryDemandScore: 78,
      plannedIntensity: 'hard',
      sAndCRationale: 'Build repeat-output capacity without generating sparring.',
    },
  }));
  assert('hard conditioning support is express/develop, not spar support', summary.trainingDirective.sessionRole !== 'spar_support'
    && (summary.trainingDirective.sessionRole === 'express' || summary.trainingDirective.sessionRole === 'develop'));
  assert('hard conditioning drives interval fuel metadata', summary.fuelDirective.expectedFuelPriority === 'conditioning_intervals'
    && summary.fuelDirective.sessionDemandScore === 82);
})();

(() => {
  const summary = build(supportSession({
    family: 'sparring',
    source: 'protected_anchor',
    protectedAnchor: true,
    title: 'Coach-led sparring',
    supportMetadata: null,
  }));
  assert('protected sparring still routes to spar support', summary.trainingDirective.sessionRole === 'spar_support');
})();

(() => {
  const mobilitySummary = build(supportSession({
    family: 'recovery',
    title: 'Mobility support',
    supportMetadata: {
      athleticDevelopmentDomain: 'mobility',
      supportDomainLabel: 'Mobility support',
      expectedFuelPriority: 'mobility',
      expectedCarbDemandClass: 'baseline',
      expectedRecoveryDemandClass: 'low',
      expectedHydrationDemandClass: 'baseline',
      sessionEnergyDemandScore: 12,
      sessionRecoveryDemandScore: 16,
      plannedIntensity: 'recovery',
    },
  }));
  assert('mobility support routes to recover behavior', mobilitySummary.trainingDirective.sessionRole === 'recover'
    && mobilitySummary.fuelDirective.expectedFuelPriority === 'mobility');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
