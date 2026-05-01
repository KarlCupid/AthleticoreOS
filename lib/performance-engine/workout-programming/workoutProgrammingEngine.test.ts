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
  assert('seed loader emits movement-slot rows', seedRows.session_template_movement_slots.length > 0);
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
