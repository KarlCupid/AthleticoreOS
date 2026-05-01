import {
  buildWorkoutProgrammingSeedRows,
  generateSingleSessionWorkout,
  queryWorkoutExercises,
  validateGeneratedWorkout,
  validateWorkoutProgrammingCatalog,
  workoutProgrammingCatalog,
} from './index.ts';
import type { GenerateSingleWorkoutInput, GeneratedWorkout } from './index.ts';

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

function generated(input: GenerateSingleWorkoutInput): GeneratedWorkout {
  const workout = generateSingleSessionWorkout(input);
  const validation = validateGeneratedWorkout(workout);
  assert(`${input.goalId} generated workout validates`, validation.valid);
  if (!validation.valid) {
    console.error(validation.errors.join('\n'));
  }
  return workout;
}

function allExercises(workout: GeneratedWorkout) {
  return workout.blocks.flatMap((block) => block.exercises);
}

const genericOntologyFragments = ['adjust as needed', 'use good form', 'do what feels right'];

console.log('\n-- workout programming engine --');

(() => {
  const validation = validateWorkoutProgrammingCatalog();
  assert(
    validation.valid ? 'catalog validates' : validation.errors.join('\n'),
    validation.valid,
  );
  assert('15 workout types seeded', workoutProgrammingCatalog.workoutTypes.length >= 15);
  assert('15 training goals seeded', workoutProgrammingCatalog.trainingGoals.length >= 15);
  assert('15 workout formats seeded', workoutProgrammingCatalog.workoutFormats.length >= 15);
  assert('20 movement patterns seeded', workoutProgrammingCatalog.movementPatterns.length >= 20);
  assert('25 muscle groups seeded', workoutProgrammingCatalog.muscleGroups.length >= 25);
  assert('25 equipment types seeded', workoutProgrammingCatalog.equipmentTypes.length >= 25);
  assert('50 exercises seeded', workoutProgrammingCatalog.exercises.length >= 50);
  assert('12 prescription templates seeded', workoutProgrammingCatalog.prescriptionTemplates.length >= 12);
  assert('12 session templates seeded', workoutProgrammingCatalog.sessionTemplates.length >= 12);
  assert('25 tracking metrics seeded', workoutProgrammingCatalog.trackingMetrics.length >= 25);
  assert('15 assessment metrics seeded', workoutProgrammingCatalog.assessmentMetrics.length >= 15);
  const seedRows = buildWorkoutProgrammingSeedRows();
  assert('seed loader emits exercise rows', seedRows.programming_exercises.length === workoutProgrammingCatalog.exercises.length);
  assert('seed loader emits enriched exercise ontology columns', seedRows.programming_exercises.every((exercise) => (
    Boolean(exercise.short_name)
    && Boolean(exercise.category)
    && exercise.sub_pattern_ids.length > 0
    && exercise.joints_involved.length > 0
    && exercise.plane_of_motion.length > 0
    && exercise.setup_instructions.length > 0
    && exercise.execution_instructions.length > 0
    && exercise.safety_notes.length > 0
    && Object.keys(exercise.default_prescription_ranges).length > 0
  )));
  assert('seed loader emits exercise relationship rows', (
    seedRows.exercise_progressions.length > 0
    && seedRows.exercise_regressions.length > 0
    && seedRows.exercise_substitution_links.length > 0
  ));
  assert('seed loader emits movement-slot rows', seedRows.session_template_movement_slots.length > 0);
})();

(() => {
  const ids = new Set(workoutProgrammingCatalog.exercises.map((exercise) => exercise.id));
  const validRelationIds = workoutProgrammingCatalog.exercises.every((exercise) => (
    [...(exercise.regressionExerciseIds ?? []), ...(exercise.progressionExerciseIds ?? []), ...(exercise.substitutionExerciseIds ?? [])]
      .every((id) => ids.has(id))
  ));
  const completeOntology = workoutProgrammingCatalog.exercises.every((exercise) => {
    const text = [
      ...(exercise.setupInstructions ?? []),
      ...(exercise.executionInstructions ?? []),
      ...(exercise.breathingInstructions ?? []),
      ...(exercise.safetyNotes ?? []),
    ].join(' ').toLowerCase();
    return (
      Boolean(exercise.shortName)
      && Boolean(exercise.category)
      && exercise.movementPatternIds.length > 0
      && exercise.primaryMuscleIds.length > 0
      && exercise.equipmentIds.length > 0
      && (exercise.equipmentRequiredIds?.length ?? 0) > 0
      && (exercise.subPatternIds?.length ?? 0) > 0
      && (exercise.jointsInvolved?.length ?? 0) > 0
      && Boolean(exercise.planeOfMotion)
      && Boolean(exercise.setupType)
      && ['low', 'moderate', 'high'].includes(exercise.technicalComplexity ?? '')
      && ['low', 'moderate', 'high'].includes(exercise.loadability ?? '')
      && ['low', 'moderate', 'high'].includes(exercise.fatigueCost ?? '')
      && Boolean(exercise.spineLoading)
      && Boolean(exercise.kneeDemand)
      && Boolean(exercise.hipDemand)
      && Boolean(exercise.shoulderDemand)
      && Boolean(exercise.wristDemand)
      && Boolean(exercise.ankleDemand)
      && Boolean(exercise.balanceDemand)
      && Boolean(exercise.cardioDemand)
      && (exercise.spaceRequired?.length ?? 0) > 0
      && exercise.homeFriendly != null
      && exercise.gymFriendly != null
      && exercise.beginnerFriendly != null
      && (exercise.setupInstructions?.length ?? 0) > 0
      && (exercise.executionInstructions?.length ?? 0) > 0
      && (exercise.breathingInstructions?.length ?? 0) > 0
      && (exercise.safetyNotes?.length ?? 0) > 0
      && exercise.trackingMetricIds.length > 0
      && Boolean(exercise.defaultPrescriptionRanges)
      && Object.keys(exercise.defaultPrescriptionRanges ?? {}).length > 0
      && !genericOntologyFragments.some((fragment) => text.includes(fragment))
    );
  });

  const stationaryBike = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'stationary_bike_zone2');
  const romanianDeadlift = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'romanian_deadlift');
  const gobletSquat = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'goblet_squat');
  const mobilityDrills = workoutProgrammingCatalog.exercises.filter((exercise) => exercise.category === 'mobility' || exercise.category === 'flexibility');

  assert('all exercises have complete ontology fields', completeOntology);
  assert('exercise ontology relationships reference existing exercises', validRelationIds);
  assert('goblet squat has sensible scaling relationships', Boolean(
    gobletSquat?.regressionExerciseIds?.includes('box_squat')
    && gobletSquat.regressionExerciseIds.includes('bodyweight_squat')
    && gobletSquat.progressionExerciseIds?.includes('trap_bar_deadlift'),
  ));
  assert('romanian deadlift carries hinge and back-safety ontology', Boolean(
    romanianDeadlift?.contraindicationFlags.includes('back_caution')
    && romanianDeadlift.spineLoading === 'high'
    && romanianDeadlift.hipDemand === 'high'
    && romanianDeadlift.regressionExerciseIds?.includes('hip_hinge_dowel'),
  ));
  assert('stationary bike supports zone 2 tracking ontology', Boolean(
    stationaryBike?.trackingMetricIds.includes('heart_rate_zone')
    && stationaryBike.trackingMetricIds.includes('heart_rate_avg')
    && stationaryBike.trackingMetricIds.includes('duration_minutes')
    && stationaryBike.defaultPrescriptionRanges?.heartRateZone
    && stationaryBike.defaultPrescriptionRanges?.talkTest,
  ));
  assert('mobility drills include target joints and range intent', mobilityDrills.every((exercise) => (
    (exercise.defaultPrescriptionRanges?.targetJoints?.length ?? 0) > 0
    && Boolean(exercise.defaultPrescriptionRanges?.rangeOfMotionIntent)
  )));
})();

(() => {
  const rows = queryWorkoutExercises({
    movementPatternIds: ['squat'],
    equipmentIds: ['bodyweight'],
    excludedSafetyFlags: ['knee_caution'],
    experienceLevel: 'beginner',
  });

  assert('exercise query returns bodyweight-compatible squats', rows.some((exercise) => exercise.id === 'box_squat'));
  assert('exercise query filters knee caution exercises', rows.every((exercise) => !exercise.contraindicationFlags.includes('knee_caution')));
})();

(() => {
  const scenarios: GenerateSingleWorkoutInput[] = [
    { goalId: 'beginner_strength', durationMinutes: 40, equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'], experienceLevel: 'beginner' },
    { goalId: 'hypertrophy', durationMinutes: 45, equipmentIds: ['dumbbells', 'bench', 'resistance_band'], experienceLevel: 'beginner' },
    { goalId: 'zone2_cardio', durationMinutes: 35, equipmentIds: ['stationary_bike'], experienceLevel: 'beginner' },
    { goalId: 'mobility', durationMinutes: 25, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' },
    { goalId: 'recovery', durationMinutes: 20, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' },
    { goalId: 'limited_equipment', durationMinutes: 35, equipmentIds: ['dumbbells', 'resistance_band'], experienceLevel: 'beginner' },
  ];

  for (const scenario of scenarios) {
    const workout = generated(scenario);
    assert(`${scenario.goalId} includes warmup`, workout.blocks.some((block) => block.kind === 'warmup'));
    assert(`${scenario.goalId} includes main block`, workout.blocks.some((block) => block.kind === 'main'));
    assert(`${scenario.goalId} includes cooldown`, workout.blocks.some((block) => block.kind === 'cooldown'));
    assert(`${scenario.goalId} duration fits`, workout.estimatedDurationMinutes <= scenario.durationMinutes * 1.1);
    assert(`${scenario.goalId} has complete prescriptions`, allExercises(workout).every((exercise) => (
      exercise.prescription.targetRpe > 0
      && exercise.prescription.restSeconds >= 0
      && (
        exercise.prescription.sets !== null
        || exercise.prescription.durationSeconds !== null
        || exercise.prescription.durationMinutes !== null
      )
    )));
  }
})();

(() => {
  const noEquipment = generated({
    goalId: 'no_equipment',
    durationMinutes: 30,
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
  });
  assert(
    'no-equipment workout only selects bodyweight-compatible exercises',
    allExercises(noEquipment).every((exercise) => (
      exercise.equipmentIds.includes('bodyweight')
      || exercise.equipmentIds.every((id) => ['mat', 'open_space', 'track_or_road'].includes(id))
    )),
  );
})();

(() => {
  const noJumping = generated({
    goalId: 'low_impact_conditioning',
    durationMinutes: 30,
    equipmentIds: ['bodyweight', 'stationary_bike', 'battle_rope'],
    experienceLevel: 'beginner',
    safetyFlags: ['no_jumping'],
  });
  assert(
    'no-jumping safety removes jump/land patterns',
    allExercises(noJumping).every((exercise) => !exercise.movementPatternIds.includes('jump_land')),
  );
})();

(() => {
  let blocked = false;
  try {
    generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 40,
      equipmentIds: ['bodyweight'],
      experienceLevel: 'beginner',
      safetyFlags: ['red_flag_symptoms'],
    });
  } catch {
    blocked = true;
  }
  assert('red-flag symptoms block workout generation', blocked);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
