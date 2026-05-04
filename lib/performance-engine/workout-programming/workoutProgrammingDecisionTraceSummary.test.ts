import {
  summarizeExerciseSelectionForUser,
  summarizeScoringTraceForAdmin,
  summarizeValidationTraceForAdmin,
  summarizeWorkoutDecisionForAdmin,
  summarizeWorkoutDecisionForUser,
} from './index.ts';
import type { GeneratedWorkout } from './types.ts';
import { generatePreviewWorkout } from './workoutProgrammingService.ts';
import { workoutProgrammingServiceFixtures } from './workoutProgrammingServiceFixtures.ts';

declare const process: { exit: (code?: number) => never };

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

function joined(value: unknown): string {
  return JSON.stringify(value);
}

function firstExerciseId(workout: GeneratedWorkout): string {
  const exercise = workout.blocks.flatMap((block) => block.exercises)[0];
  if (!exercise) throw new Error('Expected generated workout to include at least one exercise.');
  return exercise.exerciseId;
}

async function run(): Promise<void> {
  console.log('\n-- workout programming decision trace summaries --');

  const workout = await generatePreviewWorkout(workoutProgrammingServiceFixtures.beginnerBodyweightStrength, {
    persistGeneratedWorkout: false,
    contentReviewMode: 'preview',
  });
  const userSummary = summarizeWorkoutDecisionForUser(workout);
  const exerciseSummary = summarizeExerciseSelectionForUser(workout, firstExerciseId(workout));
  const userCopy = joined([userSummary, exerciseSummary]);
  assert('user summary does not expose raw internal IDs only', Boolean(
    userSummary.whyThisWorkout.length > 0
      && exerciseSummary.whyThisExercise.length > 0
      && !userCopy.includes('scoreBreakdown')
      && !userCopy.includes('totalScore')
      && !userCopy.includes('templateId')
      && !userCopy.includes('beginner_strength')
      && !userCopy.includes('bodyweight_strength'),
  ));
  assert('user exercise summary explains substitution choices', exerciseSummary.substitutions.length > 0 && /appears because/i.test(exerciseSummary.substitutions[0] ?? ''));

  const recoveryWorkout = await generatePreviewWorkout({
    ...workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
    readinessBand: 'red',
  }, {
    persistGeneratedWorkout: false,
    contentReviewMode: 'preview',
  });
  const recoverySummary = summarizeWorkoutDecisionForUser(recoveryWorkout);
  assert('user summary explains safety and recovery fallback', Boolean(
    recoveryWorkout.workoutTypeId === 'recovery'
      && recoverySummary.recoveryFallback
      && /recovery/i.test(recoverySummary.recoveryFallback)
      && (recoverySummary.safety.length > 0 || recoverySummary.intensityAdjustments.length > 0),
  ));

  const adminSummary = summarizeWorkoutDecisionForAdmin(workout);
  const scoringSummary = summarizeScoringTraceForAdmin(workout);
  assert('admin summary includes score breakdown', Boolean(
    adminSummary.scoring.selectedExerciseScores.length > 0
      && Object.keys(adminSummary.scoring.selectedExerciseScores[0]?.scoreBreakdown ?? {}).length > 0,
  ));
  assert('admin summary includes rejected candidates', scoringSummary.rejectedCandidates.length > 0);
  assert('admin summary includes selected template and prescription traces', Boolean(
    adminSummary.selectedTemplateTrace
      && adminSummary.selectedPrescriptionTrace.length > 0
      && adminSummary.movementSlotTrace.length > 0,
  ));

  const validationSummary = summarizeValidationTraceForAdmin(workout);
  assert('admin validation summary includes validation trace and content review gate decisions', Boolean(
    validationSummary.isValid === true
      && validationSummary.validationTrace.length > 0
      && validationSummary.contentReviewGateDecisions.length > 0,
  ));
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
