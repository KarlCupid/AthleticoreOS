import {
  buildGuidedFightOpportunityViewModel,
  type BuildGuidedFightOpportunityInput,
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

const BASE: BuildGuidedFightOpportunityInput = {
  athleteId: 'athlete-fight-ux',
  status: 'confirmed',
  asOfDate: '2026-05-06',
  generatedAt: '2026-05-06T12:00:00.000Z',
  currentPhase: 'build',
  competitionDate: '2026-06-20',
  competitionTime: '19:30',
  weighInDate: '2026-06-19',
  weighInTime: '18:00',
  targetWeightClassName: 'Welterweight',
  targetWeightLbs: 168,
  currentBodyMassLbs: 170,
  opponentName: 'Southpaw opponent',
  opponentStance: 'southpaw',
  eventName: 'City Championships',
  eventLocation: 'Vancouver',
  protectedWorkoutLabels: ['Team sparring'],
  readinessLabel: 'Readiness looks steady today',
};

function build(patch: Partial<BuildGuidedFightOpportunityInput> = {}) {
  return buildGuidedFightOpportunityViewModel({ ...BASE, ...patch });
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

console.log('\n-- guided fight opportunity view model --');

{
  const summary = build({ status: 'tentative', competitionDate: null, targetWeightLbs: null });

  assert('tentative fight flow keeps current phase', summary.status === 'tentative' && summary.recommendedTransition.toLowerCase().includes('stay'));
  assert('tentative fight copy avoids overriding build', summary.summary.toLowerCase().includes('without fully overriding your current build'));
  assert('tentative next steps stay lightweight', summary.whatHappensNext.includes('Keep the opportunity on the radar'));
}

{
  const summary = build();

  assert('confirmed fight flow recommends camp', summary.status === 'confirmed' && summary.recommendedTransition.toLowerCase().includes('camp'));
  assert('confirmed fight details include weigh-in and opponent/event context', summary.fightDetailsSummary?.includes('Weigh-in') === true && summary.fightDetailsSummary.includes('Opponent'));
  assert('confirmed fight keeps protected workouts in plan', summary.protectedWorkoutSummary.toLowerCase().includes('team sparring') && summary.protectedWorkoutSummary.toLowerCase().includes('protected'));
}

{
  const summary = build({
    status: 'confirmed',
    competitionDate: '2026-05-18',
    weighInDate: '2026-05-17',
  });

  assert('short-notice fight flow is detected from timing', summary.status === 'short_notice');
  assert('short-notice fight summary appears', summary.summary.toLowerCase().includes('short-notice opportunity'));
  assert('short-notice fight recommends tighter camp', summary.recommendedTransition.toLowerCase().includes('short-notice camp'));
}

{
  const summary = build({
    status: 'canceled',
    currentPhase: 'camp',
    competitionDate: '2026-06-20',
  });
  const text = allText(summary);

  assert('canceled fight updates journey without reset', summary.status === 'canceled' && summary.recommendedTransition.toLowerCase().includes('return to build'));
  assert('canceled fight preserves history language', summary.summary.toLowerCase().includes('without erasing'));
  assert('canceled fight avoids restart language', !/start over|restart|reset|transition executed/.test(text));
}

{
  const summary = build({
    status: 'rescheduled',
    currentPhase: 'camp',
    competitionDate: '2026-09-20',
  });
  const text = allText(summary);

  assert('rescheduled fight updates journey without reset', summary.status === 'rescheduled' && summary.summary.toLowerCase().includes('reshape the plan around the new date'));
  assert('rescheduled fight can recommend build when far away', summary.recommendedTransition.toLowerCase().includes('return to build'));
  assert('rescheduled fight avoids restart language', !/start over|restart|reset|transition executed/.test(text));
}

{
  const summary = build({
    status: 'short_notice',
    competitionDate: '2026-05-18',
    targetWeightClassName: 'Lightweight',
    targetWeightLbs: 150,
    currentBodyMassLbs: 180,
    weightClassChanged: true,
  });
  const text = allText(summary);

  assert('changed weight class triggers feasibility context', summary.bodyMassFeasibility.toLowerCase().includes('weight class changed') && summary.bodyMassFeasibility.toLowerCase().includes('feasibility'));
  assert('unsafe target warning uses body-mass language', summary.bodyMassFeasibility.toLowerCase().includes('target looks aggressive') && summary.riskHighlights.length > 0);
  assert('unsafe target warning avoids weight-cut language', !text.includes('weight-cut') && !text.includes(' cut ') && !text.includes('sauna') && !text.includes('sweat suit'));
}

{
  const summary = build();

  assert('fight summary displays recommended transition', summary.recommendedTransition.length > 0);
  assert('readiness evaluation is included', summary.readinessEvaluation.toLowerCase().includes('readiness'));
  assert('source is fight opportunity engine', summary.source === 'fight_opportunity_engine' && summary.opportunity != null);
}

if (failed > 0) {
  throw new Error(`${failed} guided fight opportunity view model test(s) failed`);
}

console.log(`guidedFightOpportunityViewModel tests: ${passed} passed`);
