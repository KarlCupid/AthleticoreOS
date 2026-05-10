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
})();

(() => {
  const summary = build(supportSession({
    family: 'recovery',
    title: 'Durability support',
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
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
