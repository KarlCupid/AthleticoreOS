import { createRequire } from 'node:module';
import {
  validateNoDuplicateIds,
  validateReferences,
  validateWorkoutProgrammingContentPacks,
  workoutProgrammingCatalog,
} from './index.ts';

const requireFromTest = createRequire(__filename);

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

const expandedExerciseIds = [
  'hip_thrust',
  'lateral_lunge',
  'chest_supported_dumbbell_row',
  'cable_face_pull',
  'incline_dumbbell_curl',
  'hollow_body_hold',
  'copenhagen_side_plank_short_lever',
  'elliptical_zone2',
  'swim_easy_zone2',
  'assault_bike_intervals',
  'couch_stretch',
  'doorway_pec_stretch',
  'tandem_walk',
  'legs_up_breathing',
  'med_ball_chest_pass',
  'shadow_boxing_footwork',
];

function expandedExercises() {
  return expandedExerciseIds.map((id) => {
    const exercise = workoutProgrammingCatalog.exercises.find((candidate) => candidate.id === id);
    if (!exercise) throw new Error(`Missing expanded exercise ${id}.`);
    return exercise;
  });
}

function hasCompleteOntology(exercise: ReturnType<typeof expandedExercises>[number]): boolean {
  return Boolean(
    exercise.shortName
    && exercise.category
    && exercise.movementPatternIds.length > 0
    && exercise.subPatternIds?.length
    && exercise.primaryMuscleIds.length > 0
    && exercise.jointsInvolved?.length
    && exercise.equipmentIds.length > 0
    && exercise.equipmentRequiredIds?.length
    && exercise.setupType
    && exercise.technicalComplexity
    && exercise.loadability
    && exercise.fatigueCost
    && exercise.kneeDemand
    && exercise.hipDemand
    && exercise.shoulderDemand
    && exercise.wristDemand
    && exercise.ankleDemand
    && exercise.balanceDemand
    && exercise.cardioDemand
    && exercise.setupInstructions?.length
    && exercise.executionInstructions?.length
    && exercise.breathingInstructions?.length
    && exercise.safetyNotes?.length
    && exercise.trackingMetricIds.length > 0
    && exercise.defaultPrescriptionRanges
    && exercise.reviewStatus === 'needs_review'
    && exercise.rolloutEligibility === 'preview'
  );
}

function runAuditReport() {
  const { buildAuditReport } = requireFromTest('../../../scripts/workout-programming-content-utils.js') as {
    buildAuditReport: (projectRoot?: string) => {
      missingMedia: Array<{
        id: string;
        field: string;
        severity: string;
        details?: {
          mediaReviewStatus?: string;
          hasAltText?: boolean;
          hasMediaHooks?: boolean;
        };
      }>;
    };
  };

  return buildAuditReport(process.cwd()) as {
    missingMedia: Array<{
      id: string;
      field: string;
      severity: string;
      details?: {
        mediaReviewStatus?: string;
        hasAltText?: boolean;
        hasMediaHooks?: boolean;
      };
    }>;
  };
}

async function run(): Promise<void> {
  console.log('\n-- workout programming exercise expansion --');

  const exercises = expandedExercises();
  const ids = new Set(exercises.map((exercise) => exercise.id));
  assert('expanded exercise IDs are present and unique', ids.size === expandedExerciseIds.length);
  assert('expanded exercises cover requested programming categories', [
    'strength',
    'hypertrophy',
    'cardio',
    'conditioning',
    'flexibility',
    'balance',
    'recovery',
    'power',
    'skill',
  ].every((category) => exercises.some((exercise) => exercise.category === category)));
  assert('expanded exercises cover core durability and mobility patterns', exercises.some((exercise) => exercise.movementPatternIds.includes('anti_extension'))
    && exercises.some((exercise) => exercise.movementPatternIds.includes('hip_mobility')));
  assert('expanded exercises have complete ontology fields', exercises.every(hasCompleteOntology));
  assert('expanded exercises include media hooks without fake URLs', exercises.every((exercise) => (
    exercise.media
    && exercise.media.reviewStatus === 'needs_review'
    && exercise.media.altText
    && exercise.media.videoUrl === null
    && exercise.media.imageUrl === null
    && exercise.media.thumbnailUrl === null
  )));
  assert('expanded exercises keep substitution paths available', exercises.every((exercise) => (exercise.substitutionExerciseIds?.length ?? 0) > 0));
  assert('content packs still have no duplicate IDs', validateNoDuplicateIds().valid);
  assert('expanded exercise references resolve', validateReferences().valid);
  assert('expanded exercise content passes full content validation', validateWorkoutProgrammingContentPacks().valid);

  const audit = runAuditReport();
  const missingMediaIds = new Set(audit.missingMedia.map((entry) => entry.id));
  assert('media placeholders are reported by content audit', expandedExerciseIds.every((id) => missingMediaIds.has(id)));
  assert('audit report keeps media hook review metadata', audit.missingMedia
    .filter((entry) => expandedExerciseIds.includes(entry.id))
    .every((entry) => entry.details?.mediaReviewStatus === 'needs_review' && entry.details.hasAltText === true && entry.details.hasMediaHooks === true));
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
