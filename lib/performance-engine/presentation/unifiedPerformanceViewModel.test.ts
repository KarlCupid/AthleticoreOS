import {
  buildUnifiedPerformanceViewModel,
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createPhaseState,
  createUnknownBodyMassState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  type AthleteProfile,
  type ProtectedAnchorInput,
} from '../index.ts';
import { createFightOpportunity } from '../fight-opportunity/fightOpportunityEngine.ts';

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

const ATHLETE_ID = 'athlete-phase-10';
const DATE = '2026-05-06';
const WEEK_START = '2026-05-04';
const GENERATED_AT = '2026-05-06T12:00:00.000Z';
const CONFIDENCE = confidenceFromLevel('medium');

function athlete(): AthleteProfile {
  return createAthleteProfile({
    athleteId: ATHLETE_ID,
    userId: ATHLETE_ID,
    sport: 'boxing',
    competitionLevel: 'amateur',
    ageYears: 24,
    trainingBackground: 'competitive',
    preferredBodyMassUnit: 'lb',
    confidence: CONFIDENCE,
  });
}

function anchor(): ProtectedAnchorInput {
  return {
    id: 'protected-sparring',
    label: 'Team sparring',
    kind: 'sparring',
    family: 'sparring',
    dayOfWeek: 4,
    date: '2026-05-07',
    startTime: '18:00',
    durationMinutes: 90,
    intensityRpe: 8,
    source: 'protected_anchor',
    canMerge: false,
    reason: 'Coach-led sparring is fixed.',
  };
}

function run(input: {
  fight?: ReturnType<typeof createFightOpportunity>;
  targetWeightLbs?: number | null;
} = {}) {
  const profile = athlete();
  const phase = createPhaseState({
    current: 'build',
    activeSince: WEEK_START,
    transitionReason: 'build_phase_started',
    confidence: CONFIDENCE,
  });
  const bodyMass = {
    ...createUnknownBodyMassState('lb'),
    current: normalizeBodyMass({
      value: 170,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: DATE,
      confidence: CONFIDENCE,
    }),
    missingFields: [],
    confidence: CONFIDENCE,
  };
  const journey = createAthleteJourneyState({
    journeyId: `${ATHLETE_ID}:journey`,
    athlete: profile,
    timelineStartDate: WEEK_START,
    phase,
    bodyMassState: bodyMass,
    goals: [{
      id: 'goal-1',
      mode: 'build_phase',
      type: 'conditioning',
      label: 'Conditioning build',
      targetMetric: null,
      targetValue: null,
      targetUnit: null,
      deadline: null,
      explanation: null,
    }],
    confidence: CONFIDENCE,
  });
  const targetClassMass = input.targetWeightLbs == null
    ? null
    : normalizeBodyMass({
      value: input.targetWeightLbs,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: '2026-05-20',
      confidence: CONFIDENCE,
    });

  return runUnifiedPerformanceEngine({
    athlete: profile,
    journey,
    asOfDate: DATE,
    weekStartDate: WEEK_START,
    generatedAt: GENERATED_AT,
    protectedAnchors: [anchor()],
    fightOpportunity: input.fight ?? null,
    bodyMassState: bodyMass,
    weightClass: targetClassMass
      ? {
        competitionId: 'fight-unsafe',
        competitionDate: '2026-05-21',
        weighInDateTime: '2026-05-20T18:00:00.000Z',
        competitionDateTime: '2026-05-21T04:00:00.000Z',
        targetClassMass,
        desiredScaleWeight: targetClassMass,
      }
      : null,
  });
}

const buildResult = run();
const buildVm = buildUnifiedPerformanceViewModel(buildResult);
assert('dashboard view model uses unified output', buildVm.available && buildVm.engineVersion === buildResult.engineVersion);
assert('phase context is exposed', buildVm.phase.label === 'Build' && buildVm.phase.reason.length > 0);
assert('protected workouts are visible as anchors', buildVm.protectedAnchors.some((item) => item.label === 'Team sparring'));
assert('nutrition screen can read canonical target numbers', buildVm.nutrition.numbers.calories != null && buildVm.nutrition.numbers.proteinG != null);
assert('readiness explanation is surfaced', buildVm.readiness.explanation.length > 0 && buildVm.readiness.confidenceLabel.includes('confidence'));

const fight = createFightOpportunity({
  id: 'fight-short-notice',
  athleteId: ATHLETE_ID,
  status: 'short_notice',
  asOfDate: DATE,
  createdAt: GENERATED_AT,
  currentPhase: 'build',
  competitionDate: '2026-05-18',
  weighInDate: '2026-05-17',
  targetWeightClassName: 'Lightweight',
  targetWeightLbs: 155,
});
const fightVm = buildUnifiedPerformanceViewModel(run({ fight }));
assert('fight opportunity updates journey context', fightVm.journey.nextEventLabel?.toLowerCase().includes('short notice fight') === true);
assert('phase transition context is shown', fightVm.journey.whatChangedLabel != null || fightVm.phase.changeSummary != null);

const unsafeVm = buildUnifiedPerformanceViewModel(run({ fight, targetWeightLbs: 150 }));
assert('body-mass screen receives feasibility and risk', unsafeVm.bodyMass?.feasibilityLabel === 'Unsafe' || unsafeVm.bodyMass?.riskLabel === 'Critical');
assert('safety blocking flags are surfaced', unsafeVm.planStatus === 'blocked' && unsafeVm.riskFlags.some((flag) => flag.blocksPlan));

const pendingVm = buildUnifiedPerformanceViewModel(null);
assert('missing unified state remains unknown', !pendingVm.available && pendingVm.lowConfidence && pendingVm.readiness.scoreLabel === 'Unknown');

if (failed > 0) {
  throw new Error(`${failed} unified performance view model test(s) failed`);
}

console.log(`unifiedPerformanceViewModel tests: ${passed} passed`);
