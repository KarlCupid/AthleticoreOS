import fs from 'node:fs';
import path from 'node:path';
import {
  generatePreviewWorkout,
  validateWorkout,
} from './workoutProgrammingService.ts';
import { workoutProgrammingServiceFixtures } from './workoutProgrammingServiceFixtures.ts';
import type { GeneratedWorkout } from './types.ts';

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

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

function hasAll(source: string, needles: string[]): boolean {
  return needles.every((needle) => source.includes(needle));
}

function exercises(workout: GeneratedWorkout) {
  return workout.blocks.flatMap((block) => block.exercises);
}

async function run() {
  console.log('\n-- workout programming UI smoke guards --');

  const packageJson = read('package.json');
  const workoutScreen = read('src/screens/WorkoutScreen.tsx');
  const previewCard = read('src/components/workout/GeneratedWorkoutPreviewCard.tsx');
  const betaCard = read('src/components/workout/GeneratedWorkoutBetaSessionCard.tsx');

  assert(
    'repo uses lightweight source/fixture UI smoke tests because no RN render harness is installed',
    !/(playwright|cypress|detox|@testing-library\/react-native|react-test-renderer)/i.test(packageJson),
  );

  assert('feature flags gate generated workout preview and beta flow', hasAll(workoutScreen, [
    "const WORKOUT_PROGRAMMING_BETA_ENABLED = process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA === '1'",
    'const WORKOUT_PROGRAMMING_PREVIEW_ENABLED = !WORKOUT_PROGRAMMING_BETA_ENABLED',
    'if (!WORKOUT_PROGRAMMING_PREVIEW_ENABLED) return;',
    'if (!WORKOUT_PROGRAMMING_BETA_ENABLED) return;',
    '{!initialLoadError && WORKOUT_PROGRAMMING_BETA_ENABLED ? (',
    '{!initialLoadError && WORKOUT_PROGRAMMING_PREVIEW_ENABLED ? (',
    'testID="generated-workout-beta-section"',
    'testID="generated-workout-preview-section"',
  ]));

  assert('feature-flagged beta path does not replace existing workout screen flow', hasAll(workoutScreen, [
    'WorkoutPrescriptionSection',
    'WorkoutHistoryTab',
    'WorkoutAnalyticsTab',
    "navigation.navigate('GuidedWorkout'",
    "navigation.navigate('WeeklyPlanSetup')",
    "activeTab === 'history'",
    "activeTab === 'analytics'",
    "activeTab === 'plan'",
  ]));

  assert('preview card exposes all display sections requested by generated workouts', hasAll(previewCard, [
    'testID="generated-workout-preview-card"',
    'testID="generated-workout-preview-intent"',
    'testID="generated-workout-preview-session-header"',
    'testID="generated-workout-preview-blocks"',
    'formatPrescription(exercise)',
    'formatPayloadDetail(exercise.prescription.payload)',
    'formatTempoGuidance(exercise)',
    'exercise.coachingCues',
    'exercise.commonMistakes',
    'testID="generated-workout-preview-safety"',
    'testID="generated-workout-preview-scaling"',
    'testID="generated-workout-preview-substitutions"',
    'testID="generated-workout-preview-success"',
    'testID="generated-workout-preview-validation"',
    'testID="generated-workout-preview-tracking"',
    'testID="generated-workout-preview-completion"',
  ]));

  assert('preview card renders safety-blocked workouts explicitly', hasAll(previewCard, [
    'workout.blocked',
    'testID="generated-workout-preview-blocked"',
    'This generated session is blocked.',
    'workout.explanations',
    'Stop if pain becomes sharp',
    'seek professional guidance',
  ]));

  assert('preview and beta error states surface service failures without crashing the screen', hasAll(workoutScreen, [
    'generatedWorkoutPreviewError',
    'Generated preview unavailable',
    'setGeneratedWorkoutBetaError',
    'Generated locally. Persistence unavailable',
    'Completed locally. Persistence unavailable',
    "errorMessage(error, 'Generated workout failed.')",
  ]) && betaCard.includes('{error ? <Text style={styles.errorText}>{error}</Text> : null}'));

  assert('beta flow exposes generate, start, completion, feedback, and progression interaction states', hasAll(betaCard, [
    'testID="generated-workout-beta-card"',
    'testID="generated-workout-beta-stage-row"',
    'testID="generated-workout-beta-generate"',
    'onPress={submitGenerate}',
    'testID="generated-workout-beta-start"',
    'disabled={workout.blocked === true}',
    'onPress={onStart}',
    'testID="generated-workout-beta-checklist"',
    'Mark all',
    'testID="generated-workout-beta-session-log"',
    'testID="generated-workout-beta-feedback"',
    'Too easy',
    'Right',
    'Too hard',
    'testID="generated-workout-beta-notes"',
    'testID="generated-workout-beta-complete"',
    'onPress={submitComplete}',
    'testID="generated-workout-beta-next-progression"',
    'Recommended next step',
    'progressionDecision.userMessage',
    'SAFETY_REMINDER',
  ]));

  const preview = await generatePreviewWorkout(workoutProgrammingServiceFixtures.beginnerBodyweightStrength, {
    persistGeneratedWorkout: false,
    contentReviewMode: 'preview',
  });
  const previewExercises = exercises(preview);

  assert('valid generated workout fixture has all data needed by preview UI', Boolean(
    preview.sessionIntent
    && preview.userFacingSummary
    && preview.blocks.length > 0
    && previewExercises.length > 0
    && previewExercises.every((exercise) => exercise.name && exercise.prescription.payload.kind)
    && previewExercises.some((exercise) => (exercise.coachingCues?.length ?? 0) > 0)
    && previewExercises.some((exercise) => (exercise.commonMistakes?.length ?? 0) > 0)
    && (preview.safetyNotes?.length ?? preview.description?.safetyNotes?.length ?? 0) > 0
    && preview.scalingOptions?.down
    && preview.successCriteria.length > 0
    && (preview.trackingMetrics?.length ?? preview.trackingMetricIds.length) > 0,
  ));

  assert('generated fixture includes substitution copy for the preview substitutions section', previewExercises.some((exercise) => (exercise.substitutions?.length ?? 0) > 0));

  const warningFixture: GeneratedWorkout = {
    ...preview,
    validationWarnings: ['Review rest guidance before starting.'],
    validationErrors: [],
  };
  assert('validation warning fixture is display-ready', Boolean(
    warningFixture.validationWarnings?.includes('Review rest guidance before starting.')
    && previewCard.includes('workout.validationWarnings')
    && previewCard.includes('workout.validation?.warnings'),
  ));

  const invalidWorkout = {
    ...preview,
    blocks: [],
  } as GeneratedWorkout;
  const invalidResult = await validateWorkout(invalidWorkout);
  assert('invalid generated workout payload is rejected before UI handoff', !invalidResult.isValid && invalidResult.errors.length > 0);

  const blockedWorkout = await generatePreviewWorkout({
    ...workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
    safetyFlags: ['red_flag_symptoms'],
  }, {
    persistGeneratedWorkout: false,
    contentReviewMode: 'preview',
  });
  assert('safety-blocked generated workout has a displayable blocked state', Boolean(
    blockedWorkout.blocked
    && blockedWorkout.blocks.length === 0
    && blockedWorkout.explanations.some((explanation) => explanation.includes('Safety wins'))
    && (blockedWorkout.safetyNotes?.length ?? blockedWorkout.description?.safetyNotes?.length ?? 0) > 0,
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
