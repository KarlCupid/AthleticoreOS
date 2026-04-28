import {
  deriveRecentBodyMassTrend,
  evaluateWeightClassPlan,
  normalizeBodyMassOrNull,
} from './bodyMassWeightClassEngine.ts';
import { confidenceFromLevel } from '../utils/confidence.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function mass(value: number, measuredOn = '2026-04-28') {
  return normalizeBodyMassOrNull({
    value,
    unit: 'lb',
    measuredOn,
    confidence: confidenceFromLevel('medium'),
  });
}

function baseInput(overrides: Partial<Parameters<typeof evaluateWeightClassPlan>[0]> = {}) {
  return {
    athleteId: 'athlete-body-mass',
    sport: 'boxing' as const,
    asOfDate: '2026-04-28',
    competitionId: 'fight-1',
    competitionDate: '2026-06-15',
    weighInDateTime: '2026-06-14T18:00:00.000Z',
    competitionDateTime: '2026-06-15T04:00:00.000Z',
    currentBodyMass: mass(170),
    targetClassMass: mass(165, '2026-06-14'),
    desiredScaleWeight: mass(165, '2026-06-14'),
    phase: 'weight_class_management' as const,
    athleteAgeYears: 25,
    ...overrides,
  };
}

function allText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

const BANNED_METHODS = [
  'sauna',
  'sweat suit',
  'diuretic',
  'laxative',
  'vomiting',
  'severe fasting',
  'extreme fluid restriction',
];

console.log('\n-- body-mass-weight-class engine --');

(() => {
  const result = evaluateWeightClassPlan(baseInput({
    asOfDate: '2026-06-10',
    weighInDateTime: '2026-06-14T18:00:00.000Z',
    currentBodyMass: mass(180, '2026-06-10'),
    targetClassMass: mass(160, '2026-06-14'),
    desiredScaleWeight: mass(160, '2026-06-14'),
  }));

  assert('unsafe body-mass target is blocked', result.plan.feasibilityStatus === 'unsafe' && !result.shouldGenerateProtocol);
  assert('unsafe target creates blocking risk', result.riskFlags.some((risk) => risk.code === 'unsafe_weight_class_target' && risk.blocksPlan));
})();

(() => {
  const result = evaluateWeightClassPlan(baseInput({
    asOfDate: '2026-05-20',
    weighInDateTime: '2026-06-14T18:00:00.000Z',
    currentBodyMass: mass(173, '2026-05-20'),
    targetClassMass: mass(165, '2026-06-14'),
    desiredScaleWeight: mass(165, '2026-06-14'),
  }));

  assert('high-risk plan does not generate a protocol', result.plan.feasibilityStatus === 'high_risk' && !result.shouldGenerateProtocol);
  assert('safer alternatives are suggested', result.plan.alternatives.some((alt) => alt.type === 'choose_safer_class'));
})();

(() => {
  const result = evaluateWeightClassPlan(baseInput({
    athleteAgeYears: 16,
    currentBodyMass: mass(170),
    targetClassMass: mass(166, '2026-06-14'),
    desiredScaleWeight: mass(166, '2026-06-14'),
  }));

  assert('minor athlete requires professional review', result.plan.professionalReviewRequired);
  assert('minor athlete creates review risk', result.riskFlags.some((risk) => risk.code === 'professional_review_required'));
})();

(() => {
  const history = Array.from({ length: 14 }, (_, index) => ({
    date: `2026-04-${String(15 + index).padStart(2, '0')}`,
    value: 176 - index * 0.35,
    unit: 'lb' as const,
    source: 'scale',
  }));
  const result = evaluateWeightClassPlan(baseInput({
    bodyMassHistory: history,
    currentBodyMass: null,
    targetClassMass: mass(165, '2026-06-14'),
    desiredScaleWeight: mass(165, '2026-06-14'),
  }));

  assert('body mass trend uses actual logged history', result.plan.currentBodyMass?.value === history.at(-1)?.value);
  assert('rapid body mass decline triggers risk flag', result.riskFlags.some((risk) => risk.code === 'rapid_body_mass_change'));
})();

(() => {
  const result = evaluateWeightClassPlan(baseInput({
    currentBodyMass: null,
    targetClassMass: null,
    desiredScaleWeight: null,
    weighInDateTime: null,
    competitionDate: null,
    competitionDateTime: null,
  }));

  assert('missing body mass data creates insufficient_data', result.plan.feasibilityStatus === 'insufficient_data');
  assert('missing data risk is created', result.riskFlags.some((risk) => risk.code === 'missing_data'));
})();

(() => {
  const trend = deriveRecentBodyMassTrend({
    history: [
      { date: '2026-04-01', value: 170, unit: 'lb', source: 'scale' },
      { date: '2026-04-08', value: 169, unit: 'lb', source: 'scale' },
      { date: '2026-04-15', value: 168, unit: 'lb', source: 'scale' },
    ],
  });

  assert('trend direction detects losing', trend.direction === 'losing');
  assert('trend does not synthesize zero', trend.weeklyChange.target !== 0);
})();

(() => {
  const result = evaluateWeightClassPlan(baseInput({
    fightOpportunityStatus: 'short_notice',
    asOfDate: '2026-06-08',
    weighInDateTime: '2026-06-14T18:00:00.000Z',
    currentBodyMass: mass(178, '2026-06-08'),
    targetClassMass: mass(165, '2026-06-14'),
    desiredScaleWeight: mass(165, '2026-06-14'),
  }));

  assert('fight opportunity with unsafe weight target triggers risk', result.plan.safetyFlags.some((flag) => flag.code === 'fight_target_unsafe'));
})();

(() => {
  const result = evaluateWeightClassPlan(baseInput({
    underFuelingScreen: {
      rapidBodyMassDecline: true,
      persistentFatigue: true,
      dizzinessOrFaintness: true,
    },
  }));

  assert('under-fueling screen creates risk flag', result.riskFlags.some((risk) => risk.code === 'under_fueling_risk'));
  assert('under-fueling screen is explicitly not diagnostic', allText(result).includes('not a diagnosis'));
})();

(() => {
  const result = evaluateWeightClassPlan(baseInput());
  const text = allText(result);

  assert('nutrition implications are generated', result.plan.nutritionImplications.length > 0);
  assert('training implications are generated', result.plan.trainingImplications.length > 0);
  assert('no banned methods are recommended', BANNED_METHODS.every((method) => !text.includes(method)));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
