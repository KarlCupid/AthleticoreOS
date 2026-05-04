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
  const betaHook = read('src/hooks/useGeneratedWorkoutBeta.ts');
  const devPreviewHook = read('src/hooks/useGeneratedWorkoutDevPreview.ts');
  const betaContainer = read('src/components/workout/GeneratedWorkoutBetaContainer.tsx');
  const devPreviewPanel = read('src/components/workout/GeneratedWorkoutDevPreviewPanel.tsx');
  const safetyCopy = read('lib/performance-engine/workout-programming/workoutSafetyCopy.ts');
  const fallbacks = read('lib/performance-engine/workout-programming/workoutProgrammingFallbacks.ts');
  const previewCard = read('src/components/workout/GeneratedWorkoutPreviewCard.tsx');
  const betaCard = read('src/components/workout/GeneratedWorkoutBetaSessionCard.tsx');
  const renderTest = read('lib/performance-engine/workout-programming/workoutProgrammingGeneratedWorkoutRender.test.ts');

  assert(
    'repo keeps source/fixture UI smoke guards alongside the React Native render harness',
    /@testing-library\/react-native/i.test(packageJson)
      && /react-test-renderer/i.test(packageJson)
      && renderTest.includes("@testing-library/react-native/pure")
      && renderTest.includes('GeneratedWorkoutPreviewCard')
      && renderTest.includes('GeneratedWorkoutBetaSessionCard'),
  );

  assert('feature flags gate generated workout preview and beta flow', hasAll(workoutScreen, [
    'useGeneratedWorkoutBeta',
    'GeneratedWorkoutBetaContainer',
    'GeneratedWorkoutDevPreviewPanel',
  ]) && hasAll(betaHook, [
    'resolveGeneratedWorkoutFeatureFlags',
    'process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA',
    'if (!betaEnabled) return;',
  ]) && !betaHook.includes('EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW') && hasAll(devPreviewHook, [
    'resolveGeneratedWorkoutFeatureFlags',
    'process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW',
    'if (!previewEnabled) return;',
    "resolveGeneratedWorkoutContentReviewOptions('dev-preview')",
  ]) && hasAll(fallbacks, [
    "const betaEnabled = betaFlag === '1'",
    "previewEnabled: !betaEnabled && dev && previewFlag === '1'",
  ]) && hasAll(betaContainer, [
    'testID="generated-workout-beta-section"',
  ]) && !betaContainer.includes('generated-workout-preview-section') && hasAll(devPreviewPanel, [
    'testID="generated-workout-preview-section"',
    'developer-only debug section',
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
    'testID="generated-workout-preview-why"',
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
    'GENERATED_WORKOUT_SAFETY_COPY.user.blockedWorkoutMessage',
    'workout.explanations',
    'generatedWorkoutDefaultSafetyNotes',
  ]));

  assert('preview and beta error states surface service failures without crashing the screen', hasAll(workoutScreen, [
    'GeneratedWorkoutBetaContainer',
  ]) && hasAll(betaHook, [
    'setError',
    'normalizeGeneratedWorkoutError',
    'formatGeneratedWorkoutPersistenceFallbackMessage',
    'canUseLocalGeneratedWorkoutFallback',
    'canUseLocalCompletionFallback',
  ]) && hasAll(devPreviewHook, [
    'setError',
    'normalizeGeneratedWorkoutError',
  ]) && hasAll(fallbacks, [
    'GENERATED_WORKOUT_SAFETY_COPY.persistence.generatedLocallyPersistenceUnavailable',
    'GENERATED_WORKOUT_SAFETY_COPY.persistence.completedLocallyPersistenceUnavailable',
    'GENERATED_WORKOUT_SAFETY_COPY.persistence.sessionStartedLocalPersistenceUnavailable',
    'GENERATED_WORKOUT_SAFETY_COPY.persistence.noSafeGeneratedWorkoutFound',
  ]) && hasAll(safetyCopy, [
    'sharpPainReminder',
    'redFlagSymptomMessage',
    'blockedWorkoutMessage',
    'professionalGuidance',
  ]) && hasAll(devPreviewPanel, [
    'Generated preview unavailable',
  ]) && betaCard.includes('{error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}'));

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
    'testID="generated-workout-beta-lifecycle"',
    'testID="generated-workout-beta-lifecycle-controls"',
    'testID="generated-workout-beta-pause"',
    'testID="generated-workout-beta-resume"',
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
    'generatedWorkoutSafetyReminder',
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
