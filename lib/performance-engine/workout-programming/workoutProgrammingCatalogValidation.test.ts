import {
  generateSingleSessionWorkout,
  loadWorkoutProgrammingCatalog,
  validateDescriptionTemplateRecord,
  validateDeloadRuleRecord,
  validateExerciseRecord,
  validateGeneratedWorkoutRuntime,
  validatePrescriptionTemplateRecord,
  validateProgressionRuleRecord,
  validateRegressionRuleRecord,
  validateSubstitutionRuleRecord,
  validateValidationRuleRecord,
  validateWorkoutProgrammingCatalogRuntime,
  workoutIntelligenceCatalog,
  workoutProgrammingCatalog,
} from './index.ts';
import type {
  Exercise,
  GeneratedWorkout,
  PrescriptionTemplate,
  WorkoutProgrammingCatalog,
} from './index.ts';

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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function issueFields(result: ReturnType<typeof validateWorkoutProgrammingCatalogRuntime>): string[] {
  return result.errors.map((issue) => `${issue.recordType}.${issue.field}`);
}

function createInvalidCatalogMockClient() {
  const resistanceTemplate = workoutProgrammingCatalog.prescriptionTemplates.find((template) => template.kind === 'resistance');
  if (!resistanceTemplate) throw new Error('Missing resistance prescription template fixture.');

  const rows: Record<string, Record<string, unknown>[]> = {
    workout_types: [{
      id: 'strength',
      label: 'Strength',
      summary: 'Strength test taxonomy.',
    }],
    training_goals: [{
      id: 'beginner_strength',
      label: 'Beginner Strength',
      summary: 'Goal test taxonomy.',
      default_workout_type_id: 'strength',
    }],
    workout_formats: [{
      id: 'straight_sets',
      label: 'Straight Sets',
      summary: 'Format test taxonomy.',
    }],
    movement_patterns: [{
      id: 'squat',
      label: 'Squat',
      summary: 'Pattern test taxonomy.',
    }],
    muscle_groups: [{
      id: 'quads',
      label: 'Quads',
      summary: 'Muscle test taxonomy.',
      region: 'lower',
    }],
    equipment_types: [{
      id: 'bodyweight',
      label: 'Bodyweight',
      summary: 'Equipment test taxonomy.',
      category: 'bodyweight',
    }],
    tracking_metrics: [{
      id: 'reps',
      label: 'Reps',
      summary: 'Tracking metric test taxonomy.',
    }],
    assessment_metrics: [],
    prescription_templates: [{
      id: resistanceTemplate.id,
      label: resistanceTemplate.label,
      kind: resistanceTemplate.kind,
      prescription_payload: resistanceTemplate.payload,
      applies_to_workout_type_ids: ['strength'],
      applies_to_goal_ids: ['beginner_strength'],
      default_sets: resistanceTemplate.defaultSets ?? 2,
      default_reps: resistanceTemplate.defaultReps ?? '8',
      default_rpe: resistanceTemplate.defaultRpe,
      rest_seconds: resistanceTemplate.restSeconds,
      intensity_cue: resistanceTemplate.intensityCue,
    }],
    session_templates: [{
      id: 'db_test_session',
      label: 'DB Test Session',
      summary: 'Temporary session for catalog validation test.',
      workout_type_id: 'strength',
      format_id: 'straight_sets',
      min_duration_minutes: 20,
      default_duration_minutes: 30,
      max_duration_minutes: 45,
      experience_levels: ['beginner'],
      success_criteria: ['Move well.'],
    }],
    session_template_goals: [{
      session_template_id: 'db_test_session',
      training_goal_id: 'beginner_strength',
    }],
    session_template_blocks: [
      {
        id: 'db_warmup',
        session_template_id: 'db_test_session',
        kind: 'warmup',
        title: 'Warm-up',
        duration_minutes: 5,
        prescription_template_id: resistanceTemplate.id,
      },
      {
        id: 'db_main',
        session_template_id: 'db_test_session',
        kind: 'main',
        title: 'Main',
        duration_minutes: 20,
        prescription_template_id: resistanceTemplate.id,
      },
      {
        id: 'db_cooldown',
        session_template_id: 'db_test_session',
        kind: 'cooldown',
        title: 'Cooldown',
        duration_minutes: 5,
        prescription_template_id: resistanceTemplate.id,
      },
    ],
    session_template_movement_slots: [{
      id: 'db_slot',
      session_template_id: 'db_test_session',
      block_id: 'db_main',
      movement_pattern_ids: ['squat'],
      optional: false,
      sort_order: 0,
      preferred_exercise_ids: ['db_corrupt_squat'],
      avoid_exercise_ids: [],
    }],
    programming_exercises: [{
      id: 'db_corrupt_squat',
      name: 'DB Corrupt Squat',
      short_name: 'Corrupt Squat',
      category: 'strength',
      summary: 'Temporary corrupt exercise.',
      coaching_summary: 'Temporary corrupt coaching.',
      min_experience: 'beginner',
      intensity: 'low',
      impact: 'none',
      contraindication_flags: [],
      default_prescription_template_id: resistanceTemplate.id,
      setup_type: 'standing',
      technical_complexity: 'low',
      loadability: 'low',
      fatigue_cost: 'low',
      setup_instructions: ['Stand tall.'],
      execution_instructions: ['Squat with control.'],
      safety_notes: ['Stay pain free.'],
      default_prescription_ranges: { sets: { min: 1, max: 3 } },
    }],
    exercise_movement_patterns: [{
      exercise_id: 'db_corrupt_squat',
      movement_pattern_id: 'missing_pattern',
    }],
    exercise_primary_muscles: [{
      exercise_id: 'db_corrupt_squat',
      muscle_group_id: 'quads',
    }],
    exercise_secondary_muscles: [],
    exercise_equipment: [{
      exercise_id: 'db_corrupt_squat',
      equipment_type_id: 'bodyweight',
    }],
    exercise_workout_types: [{
      exercise_id: 'db_corrupt_squat',
      workout_type_id: 'strength',
    }],
    exercise_training_goals: [{
      exercise_id: 'db_corrupt_squat',
      training_goal_id: 'beginner_strength',
    }],
    exercise_tracking_metrics: [{
      exercise_id: 'db_corrupt_squat',
      tracking_metric_id: 'reps',
    }],
  };

  return {
    from(table: string) {
      return {
        select() {
          return Promise.resolve({ data: rows[table] ?? [], error: null });
        },
      };
    },
  };
}

async function run() {
  console.log('\n-- workout programming catalog runtime validation --');

  {
    const validation = validateWorkoutProgrammingCatalogRuntime(workoutProgrammingCatalog);
    assert('valid seeded catalog passes runtime validation', validation.valid);
  }

  {
    const catalog = clone(workoutProgrammingCatalog);
    catalog.exercises[0] = {
      ...catalog.exercises[0],
      movementPatternIds: [],
    };
    const validation = validateExerciseRecord(catalog.exercises[0], workoutProgrammingCatalog);
    assert('corrupt exercise fails', !validation.valid);
    assert('corrupt exercise reports movement pattern field', issueFields(validation).includes('Exercise.movementPatternIds'));
  }

  {
    const template = clone(workoutProgrammingCatalog.prescriptionTemplates.find((item) => item.kind === 'resistance') as PrescriptionTemplate);
    template.payload = { kind: 'resistance' } as never;
    const validation = validatePrescriptionTemplateRecord(template, workoutProgrammingCatalog);
    assert('corrupt prescription payload fails', !validation.valid);
    assert('corrupt prescription payload reports payload field', validation.errors.some((issue) => issue.field.startsWith('payload.')));
  }

  {
    const template = clone(workoutIntelligenceCatalog.descriptionTemplates[0]);
    delete (template as unknown as Record<string, unknown>).plainLanguageSummary;
    const validation = validateDescriptionTemplateRecord(template);
    assert('corrupt description template fails', !validation.valid);
    assert('corrupt description template reports copy field', validation.errors.some((issue) => issue.field === 'plainLanguageSummary'));
  }

  {
    const catalog = clone(workoutProgrammingCatalog);
    const exercise = catalog.exercises[0] as Exercise;
    exercise.movementPatternIds = ['missing_pattern'];
    const validation = validateWorkoutProgrammingCatalogRuntime(catalog);
    assert('missing referenced movement pattern fails catalog validation', !validation.valid);
    assert('missing referenced movement pattern is actionable', validation.errors.some((issue) => issue.field === 'movementPatternIds' && issue.suggestedCorrection.includes('movement_patterns')));
  }

  {
    const workout = clone(generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    })) as GeneratedWorkout;
    workout.blocks[0].exercises[0].prescription.payload = { kind: workout.blocks[0].exercises[0].prescription.kind } as never;
    const validation = validateGeneratedWorkoutRuntime(workout, workoutProgrammingCatalog);
    assert('invalid generated workout payload fails runtime validation', !validation.valid);
    assert('invalid generated workout reports generated prescription field', validation.errors.some((issue) => issue.recordType === 'GeneratedExercisePrescription' && issue.field.startsWith('prescription.payload')));
  }

  {
    assert('progression rule validator accepts seeded rule', validateProgressionRuleRecord(workoutIntelligenceCatalog.progressionRules[0]).valid);
    assert('regression rule validator accepts seeded rule', validateRegressionRuleRecord(workoutIntelligenceCatalog.regressionRules[0]).valid);
    assert('deload rule validator accepts seeded rule', validateDeloadRuleRecord(workoutIntelligenceCatalog.deloadRules[0]).valid);
    assert('substitution rule validator accepts seeded rule', validateSubstitutionRuleRecord(workoutIntelligenceCatalog.substitutionRules[0], workoutProgrammingCatalog).valid);
    assert('validation rule validator accepts seeded rule', validateValidationRuleRecord(workoutIntelligenceCatalog.validationRules[0]).valid);
  }

  {
    let rejected = false;
    let actionable = false;
    try {
      await loadWorkoutProgrammingCatalog({
        client: createInvalidCatalogMockClient(),
        catalogFallback: 'never',
      });
    } catch (error) {
      rejected = true;
      actionable = error instanceof Error
        && error.message.includes('Exercise')
        && error.message.includes('movementPatternIds')
        && error.message.includes('movement_patterns');
    }
    assert('Supabase-loaded invalid mock rows are rejected', rejected);
    assert('Supabase-loaded invalid mock rows produce actionable errors', actionable);
  }

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
