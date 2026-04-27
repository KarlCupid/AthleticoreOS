import {
  adaptPrescriptionToDailyReadiness,
  deriveLegacyReadinessFromDailyCheck,
  estimateDailyPerformanceReadinessScore,
  inferPrimaryLimiterFromDailyCheck,
  mapScoreToPerformanceBand,
} from './dailyCheck.ts';
import type { ReadinessProfile, StimulusConstraintSet, WorkoutPrescriptionV2 } from '../types.ts';

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

function makeProfile(overrides: Partial<ReadinessProfile> = {}): ReadinessProfile {
  return {
    neuralReadiness: 82,
    structuralReadiness: 82,
    metabolicReadiness: 82,
    overallReadiness: 82,
    trend: 'stable',
    dataConfidence: 'medium',
    dataSufficiency: 'limited',
    cardioModifier: 1,
    proteinModifier: 1,
    flags: [],
    performanceAnchors: [],
    readinessState: 'Prime',
    ...overrides,
  };
}

function makeConstraints(overrides: Partial<StimulusConstraintSet> = {}): StimulusConstraintSet {
  return {
    explosiveBudget: 82,
    impactBudget: 82,
    strengthBudget: 82,
    aerobicBudget: 82,
    volumeMultiplier: 1,
    hardCaps: {
      intensityCap: 8,
      allowImpact: true,
      allowHardSparring: true,
      maxConditioningRounds: null,
    },
    allowedStimuli: ['heavy_strength', 'controlled_strength', 'technical_skill', 'recovery'],
    blockedStimuli: [],
    ...overrides,
  };
}

function makePrescription(): WorkoutPrescriptionV2 {
  const exercise = (name: string, sectionTemplate: any, targetSets: number, targetRPE: number) => ({
    exercise: { id: name, name, type: 'heavy_lift', cns_load: 6, muscle_group: 'full_body', equipment: 'barbell', description: '', cues: '', sport_tags: [] },
    targetSets,
    targetReps: 5,
    targetRPE,
    suggestedWeight: 100,
    sectionTemplate,
    sectionId: sectionTemplate,
    sectionIntent: '',
    role: sectionTemplate === 'finisher' ? 'finisher' : 'anchor',
    loadingStrategy: 'straight_sets',
    progressionAnchor: null,
    preferredExercise: { id: name, name, type: 'heavy_lift', cns_load: 6, muscle_group: 'full_body', equipment: 'barbell', description: '', cues: '', sport_tags: [] },
    substitutions: [],
    coachingCues: [],
    fatigueCost: 'moderate',
    setScheme: `${targetSets} x 5 @ RPE ${targetRPE}`,
    loadingNotes: '',
    setPrescription: [{ label: 'Work', sets: targetSets, reps: 5, targetRPE, restSeconds: 90 }],
  });

  const main = exercise('Main lift', 'main_strength', 4, 8);
  const finisher = exercise('Finisher', 'finisher', 3, 8);

  return {
    workoutType: 'strength',
    focus: 'full_body',
    exercises: [main, finisher],
    estimatedDurationMin: 60,
    isDeloadWorkout: false,
    equipmentProfile: null,
    campPhaseContext: null,
    weeklyPlanDay: null,
    sparringDayGuidance: null,
    sections: [
      { id: 'main', template: 'main_strength', title: 'Main', intent: '', timeCap: 20, restRule: '', densityRule: null, exercises: [main as any], decisionTrace: [] },
      { id: 'finish', template: 'finisher', title: 'Finish', intent: '', timeCap: 8, restRule: '', densityRule: null, exercises: [finisher as any], decisionTrace: [] },
    ],
    sessionIntent: null,
    primaryAdaptation: 'strength',
    performanceRisk: null,
    blockContext: null,
    decisionTrace: [],
    message: 'Base.',
  } as any;
}

console.log('\n-- daily performance check --');

{
  const score = estimateDailyPerformanceReadinessScore({
    sleepQuality: 5,
    energyLevel: 5,
    stressLevel: 1,
    sorenessLevel: 1,
    confidenceLevel: 5,
    fuelHydrationStatus: 5,
  });
  assert('Strong subjective check maps to Push', mapScoreToPerformanceBand(score) === 'Push');
  assert('Strong subjective check keeps high legacy readiness', deriveLegacyReadinessFromDailyCheck({
    sleepQuality: 5,
    energyLevel: 5,
    stressLevel: 1,
    sorenessLevel: 1,
    confidenceLevel: 5,
    fuelHydrationStatus: 5,
  }) >= 4);
}

{
  const input = {
    sleepQuality: 2,
    energyLevel: 2,
    stressLevel: 4,
    sorenessLevel: 4,
    confidenceLevel: 2,
    fuelHydrationStatus: 2,
    painLevel: 4,
  };
  const score = estimateDailyPerformanceReadinessScore(input);
  assert('Multiple hard limiters map to Protect', mapScoreToPerformanceBand(score) === 'Protect');
  assert('Sleep is the first primary limiter when severe', inferPrimaryLimiterFromDailyCheck(input) === 'sleep');
}

{
  const push = adaptPrescriptionToDailyReadiness({
    prescription: makePrescription(),
    readinessProfile: makeProfile(),
    constraintSet: makeConstraints(),
  });
  const protect = adaptPrescriptionToDailyReadiness({
    prescription: makePrescription(),
    readinessProfile: makeProfile({ readinessState: 'Depleted', overallReadiness: 35, neuralReadiness: 35, structuralReadiness: 35, metabolicReadiness: 35 }),
    constraintSet: makeConstraints({
      volumeMultiplier: 0.55,
      hardCaps: { intensityCap: 5, allowImpact: false, allowHardSparring: false, maxConditioningRounds: 4 },
      blockedStimuli: ['max_velocity', 'plyometric', 'high_impact', 'glycolytic_conditioning'],
    }),
  });

  assert('Push preserves finisher', Boolean(push?.exercises.some((exercise) => exercise.sectionTemplate === 'finisher')));
  assert('Protect removes finisher', !protect?.exercises.some((exercise) => exercise.sectionTemplate === 'finisher'));
  assert('Protect caps main RPE', (protect?.exercises[0].targetRPE ?? 10) <= 5);
  assert('Protect cuts duration', (protect?.estimatedDurationMin ?? 60) < 60);
}

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
