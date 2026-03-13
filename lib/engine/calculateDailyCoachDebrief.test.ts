import {
  generateDailyCoachDebrief,
  validateDailyCoachDebriefInput,
} from './calculateDailyCoachDebrief';
import type { DailyCoachDebriefInput } from './types';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL ${name}: ${message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function makeInput(partial: Partial<DailyCoachDebriefInput> = {}): DailyCoachDebriefInput {
  return {
    sleepQuality: 4,
    readiness: 4,
    stressLevel: 3,
    sorenessLevel: 3,
    confidenceLevel: 4,
    primaryLimiter: 'none',
    nutritionAdherence: 'Target Met',
    nutritionBarrier: 'none',
    coachingFocus: 'execution',
    trainingLoadSummary: {
      plannedMinutes: 70,
      plannedIntensity: 7,
      totalLoad: 490,
      acuteLoad: 2200,
      chronicLoad: 2100,
      acwrRatio: 1.05,
      acwrStatus: 'safe',
    },
    context: {
      phase: 'camp-build',
      campLabel: 'Fight Camp',
      isOnActiveCut: false,
    },
    previousDebrief: null,
    ...partial,
  };
}

console.log('\n-- calculateDailyCoachDebrief --');

test('Prime + safe ACWR returns push band', () => {
  const debrief = generateDailyCoachDebrief(makeInput());
  assert(debrief.readiness_band === 'push', `expected push, got ${debrief.readiness_band}`);
  assert(debrief.acwr_status === 'safe', 'expected safe acwr status');
  assert(debrief.action_steps.length === 3, 'expected 3 action steps');
});

test('Poor sleep returns build band even with safe ACWR', () => {
  const debrief = generateDailyCoachDebrief(makeInput({
    sleepQuality: 3,
    readiness: 4,
    trainingLoadSummary: { ...makeInput().trainingLoadSummary, acwrStatus: 'safe', acwrRatio: 1.02 },
  }));
  assert(debrief.readiness_band === 'build', `expected build, got ${debrief.readiness_band}`);
});

test('Depleted or redline returns recover with risk flags', () => {
  const debrief = generateDailyCoachDebrief(makeInput({
    sleepQuality: 2,
    readiness: 2,
    trainingLoadSummary: {
      ...makeInput().trainingLoadSummary,
      acwrStatus: 'redline',
      acwrRatio: 1.58,
    },
  }));
  assert(debrief.readiness_band === 'recover', `expected recover, got ${debrief.readiness_band}`);
  assert(debrief.risk_flags.includes('acwr_redline'), 'expected acwr_redline risk flag');
});

test('Nutrition miss plus elevated load prioritizes nutrition action', () => {
  const debrief = generateDailyCoachDebrief(makeInput({
    nutritionAdherence: 'Missed It',
    nutritionBarrier: 'timing',
    coachingFocus: 'nutrition',
    primaryLimiter: 'nutrition',
    trainingLoadSummary: {
      ...makeInput().trainingLoadSummary,
      acwrStatus: 'caution',
      acwrRatio: 1.31,
    },
  }));

  const topStep = debrief.action_steps[0];
  assert(topStep.pillar === 'nutrition', `expected nutrition priority, got ${topStep.pillar}`);
  assert(topStep.priority === 1, `expected priority=1, got ${topStep.priority}`);
});

test('Validation catches range and enum issues', () => {
  const invalid = makeInput({
    sleepQuality: 7,
    readiness: 0,
    primaryLimiter: 'bad_limiter' as any,
  });
  const errors = validateDailyCoachDebriefInput(invalid);
  assert(errors.length >= 3, `expected >=3 errors, got ${errors.length}`);
});

test('Debrief JSON shape stays consistent', () => {
  const debrief = generateDailyCoachDebrief(makeInput());
  assert(typeof debrief.headline === 'string' && debrief.headline.length > 0, 'headline missing');
  assert(typeof debrief.reasoning === 'string' && debrief.reasoning.length > 0, 'reasoning missing');
  assert(typeof debrief.education_topic === 'string' && debrief.education_topic.length > 0, 'education_topic missing');
  assert(typeof debrief.today_application === 'string' && debrief.today_application.length > 0, 'today_application missing');
  assert(debrief.action_steps.every((step) => ['training', 'recovery', 'nutrition'].includes(step.pillar)), 'invalid pillar found');
});

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
