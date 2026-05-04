import {
  auditWorkoutProgrammingExerciseMedia,
  getPrimaryExerciseMediaAsset,
  workoutProgrammingCatalog,
} from './index.ts';
import type { Exercise, WorkoutProgrammingCatalog } from './types.ts';

declare const process: {
  exit: (code?: number) => never;
};

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

function fixtureExercise(id: string, update: Partial<Exercise>): Exercise {
  const source = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'goblet_squat')
    ?? workoutProgrammingCatalog.exercises[0];
  return {
    ...source,
    id,
    name: id.replace(/_/g, ' '),
    ...update,
  };
}

function catalogWith(exercises: Exercise[]): WorkoutProgrammingCatalog {
  return {
    ...workoutProgrammingCatalog,
    exercises,
  };
}

function run(): void {
  console.log('\n-- workout programming media audit --');

  const productionMissing = fixtureExercise('production_missing_media', {
    reviewStatus: 'approved',
    rolloutEligibility: 'production',
    media: {
      videoUrl: null,
      imageUrl: null,
      thumbnailUrl: null,
      animationUrl: null,
      altText: 'Production exercise awaiting reviewed media.',
      reviewStatus: 'needs_review',
      missingReason: 'shoot_scheduled',
      priority: 'medium',
    },
  });
  const betaMissing = fixtureExercise('beta_missing_media', {
    reviewStatus: 'needs_review',
    rolloutEligibility: 'preview',
    media: {
      videoUrl: null,
      imageUrl: null,
      thumbnailUrl: null,
      animationUrl: null,
      altText: 'Beta exercise awaiting reviewed media.',
      reviewStatus: 'needs_review',
      missingReason: 'asset_not_produced',
      priority: 'low',
    },
  });
  const missingAlt = fixtureExercise('media_missing_alt', {
    reviewStatus: 'approved',
    rolloutEligibility: 'production',
    media: {
      thumbnailUrl: 'https://example.test/workout-media/media-missing-alt.jpg',
      reviewStatus: 'approved',
      priority: 'medium',
    },
  });
  const unreviewed = fixtureExercise('unreviewed_media', {
    reviewStatus: 'approved',
    rolloutEligibility: 'production',
    media: {
      thumbnailUrl: 'https://example.test/workout-media/unreviewed-media.jpg',
      altText: 'Unreviewed exercise media.',
      reviewStatus: 'needs_review',
      priority: 'medium',
    },
  });
  const highPriorityNoDemo = fixtureExercise('high_priority_no_demo', {
    reviewStatus: 'approved',
    rolloutEligibility: 'production',
    media: {
      thumbnailUrl: 'https://example.test/workout-media/high-priority.jpg',
      altText: 'High-priority exercise thumbnail.',
      reviewStatus: 'approved',
      priority: 'high',
    },
  });
  const approvedDemo = fixtureExercise('approved_demo', {
    reviewStatus: 'approved',
    rolloutEligibility: 'production',
    media: {
      videoUrl: 'https://example.test/workout-media/approved-demo.mp4',
      thumbnailUrl: 'https://example.test/workout-media/approved-demo.jpg',
      altText: 'Approved demo exercise video.',
      reviewStatus: 'approved',
      priority: 'high',
    },
  });

  const report = auditWorkoutProgrammingExerciseMedia(catalogWith([
    productionMissing,
    betaMissing,
    missingAlt,
    unreviewed,
    highPriorityNoDemo,
    approvedDemo,
  ]), '2026-05-04T00:00:00.000Z');

  assert('audit reports production exercises missing media', report.productionExercisesMissingMedia.some((item) => item.id === 'production_missing_media'));
  assert('audit reports beta exercises missing media', report.betaExercisesMissingMedia.some((item) => item.id === 'beta_missing_media'));
  assert('audit reports missing alt text when media is present', report.missingAltText.some((item) => item.id === 'media_missing_alt'));
  assert('audit reports unreviewed media assets', report.unreviewedMedia.some((item) => item.id === 'unreviewed_media'));
  assert('audit reports high-priority exercises without demo assets', report.highPriorityExercisesWithoutDemoAssets.some((item) => item.id === 'high_priority_no_demo'));
  assert('approved high-priority demo does not create a blocker', !report.highPriorityExercisesWithoutDemoAssets.some((item) => item.id === 'approved_demo'));

  const asset = getPrimaryExerciseMediaAsset(approvedDemo.media);
  assert('approved media asset is selected with alt text', asset?.kind === 'thumbnail' && asset.altText === 'Approved demo exercise video.');
  assert('unreviewed media asset is not selected for UI display', getPrimaryExerciseMediaAsset(unreviewed.media) === null);
}

run();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
if (failed > 0) process.exit(1);
