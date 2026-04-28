/**
 * Standalone test script for lib/engine/presentation/trainingFloor.ts
 * Run with: npx tsx lib/engine/presentation/trainingFloor.test.ts
 */

import { buildTrainingFloorViewModel } from './trainingFloor.ts';
import type { DailyAthleteSummary } from '../types/mission.ts';
import type { WorkoutPrescriptionV2 } from '../types/training.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function makeMission(intentOverride = 'Push hard today', reasonOverride = 'High readiness.'): DailyAthleteSummary {
  return {
    date: '2026-03-18',
    engineVersion: 'v3',
    generatedAt: '2026-03-18T06:00:00Z',
    headline: 'Training day',
    summary: 'Go for it.',
    objective: {} as any,
    macrocycleContext: {} as any,
    trainingDirective: {
      sessionRole: 'develop',
      interventionState: 'none' as any,
      isMandatoryRecovery: false,
      focus: 'strength',
      workoutType: 'sc' as any,
      intent: intentOverride,
      reason: reasonOverride,
      intensityCap: null,
      durationMin: 60,
      volumeTarget: 'moderate',
      keyQualities: [],
      source: 'daily_engine',
      prescription: null,
    },
    fuelDirective: {} as any,
    hydrationDirective: {} as any,
    recoveryDirective: {} as any,
    riskState: { level: 'low', score: 0, label: 'Low', drivers: [] },
    decisionTrace: [],
    overrideState: { status: 'following_plan', note: '' },
  };
}

function makePrescription(overrides: Partial<WorkoutPrescriptionV2> = {}): WorkoutPrescriptionV2 {
  return {
    sessionGoal: 'Build lower body strength',
    activationGuidance: 'Glute bridges x15',
    isDeloadWorkout: false,
    exercises: [{ name: 'Squat' } as any, { name: 'Deadlift' } as any],
    estimatedDurationMin: 55,
    primaryAdaptation: 'strength',
    focus: 'strength',
    readinessState: 'Prime',
    rpeCap: 8,
    message: '',
    decisionTrace: [],
    totalCNSBudget: 70,
    usedCNS: 50,
    ...overrides,
  } as any;
}

console.log('\n── null prescription + null mission ──');

const empty = buildTrainingFloorViewModel(null, null);
assert('both null: sessionGoal has default string', empty.sessionGoal.length > 0);
assert('both null: exerciseCount = 0', empty.exerciseCount === 0);
assert('both null: estimatedDurationMin = 0', empty.estimatedDurationMin === 0);
assert('both null: activationRequired = false', empty.activationRequired === false);
assert('both null: activationGuidance = null', empty.activationGuidance === null);
assert('both null: isDeload = false', empty.isDeload === false);

console.log('\n── prescription present ──');

const rx = makePrescription();
const withRx = buildTrainingFloorViewModel(rx, null);
assert('prescription: sessionGoal from prescription', withRx.sessionGoal === 'Build lower body strength');
assert('prescription: exerciseCount = 2', withRx.exerciseCount === 2);
assert('prescription: estimatedDurationMin = 55', withRx.estimatedDurationMin === 55);
assert('prescription: activationRequired = true', withRx.activationRequired === true);
assert('prescription: activationGuidance passed through', withRx.activationGuidance === 'Glute bridges x15');
assert('prescription: isDeload = false', withRx.isDeload === false);
assert('prescription: primaryAdaptation = strength', withRx.primaryAdaptation === 'strength');

// Deload prescription
const deloadRx = makePrescription({ isDeloadWorkout: true });
const deloadResult = buildTrainingFloorViewModel(deloadRx, null);
assert('deload prescription: isDeload = true', deloadResult.isDeload === true);

// No activation guidance
const noActivation = makePrescription({ activationGuidance: undefined });
const noActResult = buildTrainingFloorViewModel(noActivation, null);
assert('no activation: activationRequired = false', noActResult.activationRequired === false);
assert('no activation: activationGuidance = null', noActResult.activationGuidance === null);

console.log('\n── mission fallback when no prescription ──');

const mission = makeMission('Sprint intervals', 'Peaking phase.');
const missionOnly = buildTrainingFloorViewModel(null, mission);
assert('mission: sessionGoal from trainingDirective.intent', missionOnly.sessionGoal === 'Sprint intervals');
assert('mission: reasonSentence from trainingDirective.reason', missionOnly.reasonSentence === 'Peaking phase.');

console.log('\n── prescription takes priority over mission ──');

const both = buildTrainingFloorViewModel(rx, mission);
assert('prescription overrides mission sessionGoal', both.sessionGoal === 'Build lower body strength');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
