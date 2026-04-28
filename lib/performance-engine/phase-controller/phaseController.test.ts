import {
  cancelFightOpportunity,
  changeFightOpportunityWeightClass,
  confirmFightOpportunity,
  createFightOpportunity,
  initializeJourneyFromOnboarding,
  recommendPhaseForFightOpportunity,
  recommendRecoveryAfterCompetition,
  rescheduleFightOpportunity,
  snapshotFightOpportunity,
  transitionPerformancePhase,
  type PerformanceState,
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

function buildBaseState(): PerformanceState {
  const initialized = initializeJourneyFromOnboarding({
    userId: 'athlete-1',
    capturedAt: '2026-04-28T12:00:00.000Z',
    asOfDate: '2026-04-28',
    age: 27,
    currentWeightLbs: 152,
    biologicalSex: 'male',
    trainingBackground: 'some',
    goalMode: 'build_phase',
    buildGoalType: 'conditioning',
    fightDate: null,
    targetWeightLbs: 147,
    availableDays: [1, 3, 5],
    fixedSessions: [
      {
        id: 'boxing-anchor',
        activityType: 'boxing_practice',
        dayOfWeek: 3,
        startTime: '19:00',
        durationMin: 90,
        expectedIntensity: 7,
        label: 'Boxing class',
      },
    ],
    nutritionPreferences: { goal: 'maintain' },
    trackingPreferences: { bodyMass: true, readiness: true, nutrition: true, cycle: false },
  });

  return {
    ...initialized.performanceState,
    trackingEntries: [
      {
        id: 'tracking-1',
        athleteId: 'athlete-1',
        timestamp: '2026-04-28T07:00:00.000Z',
        timezone: 'UTC',
        type: 'sleep_duration',
        source: 'user_reported',
        value: 420,
        unit: 'minute',
        confidence: initialized.performanceState.confidence,
        context: {},
        notes: null,
      },
    ],
  };
}

function transitionToRecommendation(state: PerformanceState, opportunity = snapshotFightOpportunity(createFightOpportunity({
  id: 'fight-1',
  athleteId: 'athlete-1',
  status: 'confirmed',
  asOfDate: '2026-04-28',
  createdAt: '2026-04-28T12:30:00.000Z',
  currentPhase: state.phase.current,
  competitionDate: '2026-06-20',
  targetWeightLbs: 147,
}))) {
  return transitionPerformancePhase({
    performanceState: state,
    to: opportunity.phaseRecommendation.recommendedPhase,
    reason: opportunity.phaseRecommendation.reason,
    transitionedAt: '2026-04-28T12:30:00.000Z',
    effectiveDate: '2026-04-28',
    activeFightOpportunity: opportunity,
  });
}

console.log('\n-- phase controller and fight opportunity --');

(() => {
  const state = buildBaseState();
  const result = transitionToRecommendation(state);

  assert('build to camp transitions to camp', result.performanceState.phase.current === 'camp');
  assert('build to camp preserves journey id', result.journey.journeyId === state.journey.journeyId);
  assert('build to camp preserves body mass context', result.journey.bodyMassState?.current?.value === 152);
  assert('build to camp preserves tracking history', result.performanceState.trackingEntries.length === 1);
  assert('build to camp preserves protected workouts', result.journey.protectedWorkoutAnchors.length === 1);
  assert('build to camp preserves preferences', result.journey.nutritionPreferences.goal === 'maintain');
  assert('build to camp is transition, not restart', result.performanceState.phase.isRestart === false);
})();

(() => {
  const state = buildBaseState();
  const opportunity = snapshotFightOpportunity(createFightOpportunity({
    id: 'fight-short',
    athleteId: 'athlete-1',
    status: 'short_notice',
    asOfDate: '2026-04-28',
    createdAt: '2026-04-28T12:30:00.000Z',
    currentPhase: state.phase.current,
    competitionDate: '2026-05-12',
    targetWeightLbs: 147,
  }));
  const result = transitionToRecommendation(state, opportunity);

  assert('build to short-notice camp transitions internally', result.performanceState.phase.current === 'short_notice_camp');
  assert('short-notice camp preserves protected anchors', result.journey.protectedWorkoutAnchors[0]?.id === 'boxing-anchor');
})();

(() => {
  const recommendation = recommendPhaseForFightOpportunity({
    currentPhase: 'build',
    status: 'confirmed',
    competitionDate: '2026-06-20',
    asOfDate: '2026-04-28',
  });

  assert('confirmed fight recommends camp', recommendation.recommendedPhase === 'camp');
  assert('confirmed fight recommends a transition', recommendation.shouldTransition);
  assert('confirmed fight explanation is generated', recommendation.explanation.summary.length > 0);
})();

(() => {
  const recommendation = recommendPhaseForFightOpportunity({
    currentPhase: 'build',
    status: 'tentative',
    competitionDate: '2026-06-20',
    asOfDate: '2026-04-28',
  });

  assert('tentative fight keeps current phase', recommendation.recommendedPhase === 'build');
  assert('tentative fight does not fully override journey', !recommendation.shouldTransition);
})();

(() => {
  const state = buildBaseState();
  const campResult = transitionToRecommendation(state);
  const opportunity = createFightOpportunity({
    id: 'fight-cancel',
    athleteId: 'athlete-1',
    status: 'confirmed',
    asOfDate: '2026-04-28',
    createdAt: '2026-04-28T12:30:00.000Z',
    currentPhase: 'build',
    competitionDate: '2026-06-20',
    targetWeightLbs: 147,
  });
  const canceled = cancelFightOpportunity(opportunity, {
    asOfDate: '2026-05-01',
    updatedAt: '2026-05-01T12:00:00.000Z',
    currentPhase: campResult.performanceState.phase.current,
  });
  const result = transitionPerformancePhase({
    performanceState: campResult.performanceState,
    to: canceled.phaseRecommendation.recommendedPhase,
    reason: canceled.phaseRecommendation.reason,
    transitionedAt: canceled.updatedAt,
    effectiveDate: '2026-05-01',
    activeFightOpportunity: snapshotFightOpportunity(canceled),
  });

  assert('canceled fight returns camp to build', result.performanceState.phase.current === 'build');
  assert('canceled fight preserves body mass baseline', result.journey.bodyMassState?.current?.value === 152);
  assert('canceled fight preserves original journey start', result.journey.timelineStartDate === state.journey.timelineStartDate);
})();

(() => {
  const state = buildBaseState();
  const opportunity = createFightOpportunity({
    id: 'fight-reschedule',
    athleteId: 'athlete-1',
    status: 'confirmed',
    asOfDate: '2026-04-28',
    createdAt: '2026-04-28T12:30:00.000Z',
    currentPhase: state.phase.current,
    competitionDate: '2026-06-20',
    targetWeightLbs: 147,
  });
  const rescheduled = rescheduleFightOpportunity(opportunity, {
    asOfDate: '2026-05-10',
    updatedAt: '2026-05-10T12:00:00.000Z',
    currentPhase: 'camp',
    competitionDate: '2026-09-20',
  });

  assert('rescheduled fight keeps same opportunity id', rescheduled.id === opportunity.id);
  assert('rescheduled fight updates competition date', rescheduled.timing.competitionDate === '2026-09-20');
  assert('delayed reschedule recommends build', rescheduled.phaseRecommendation.recommendedPhase === 'build');
  assert('rescheduled fight retains history', rescheduled.history.length === 2);
})();

(() => {
  const recommendation = recommendPhaseForFightOpportunity({
    currentPhase: 'camp',
    status: 'confirmed',
    competitionDate: '2026-05-03',
    asOfDate: '2026-04-28',
  });

  assert('competition week is recommended close to fight', recommendation.recommendedPhase === 'competition_week');
  assert('competition week blocks casual hard-plan generation', recommendation.blocksCasualHardPlanGeneration);
})();

(() => {
  const recommendation = recommendRecoveryAfterCompetition({ currentPhase: 'competition_week' });

  assert('recovery follows competition', recommendation.recommendedPhase === 'recovery');
  assert('recovery blocks casual hard-plan generation', recommendation.blocksCasualHardPlanGeneration);
})();

(() => {
  const opportunity = createFightOpportunity({
    id: 'fight-weight',
    athleteId: 'athlete-1',
    status: 'confirmed',
    asOfDate: '2026-04-28',
    createdAt: '2026-04-28T12:30:00.000Z',
    currentPhase: 'build',
    competitionDate: '2026-06-20',
    targetWeightClassName: 'Lightweight',
    targetWeightLbs: 135,
  });
  const changed = changeFightOpportunityWeightClass(opportunity, {
    asOfDate: '2026-05-01',
    updatedAt: '2026-05-01T12:00:00.000Z',
    currentPhase: 'camp',
    targetWeightClassName: 'Welterweight',
    targetWeightLbs: 147,
  });
  const cleared = changeFightOpportunityWeightClass(changed, {
    asOfDate: '2026-05-02',
    updatedAt: '2026-05-02T12:00:00.000Z',
    currentPhase: 'camp',
    targetWeightClassName: null,
    targetWeightLbs: null,
  });

  assert('changed weight class updates target metadata', changed.target.weightClassName === 'Welterweight');
  assert('changed weight class hands feasibility to body-mass engine', changed.feasibility.status === 'needs_body_mass_engine');
  assert('changed weight class can return target to unknown', cleared.target.targetWeightLbs === null);
  assert('cleared weight class is not evaluated by body-mass engine yet', cleared.feasibility.status === 'not_evaluated');
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
