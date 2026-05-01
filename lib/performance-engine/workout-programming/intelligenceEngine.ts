import { workoutProgrammingCatalog } from './seedData.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import {
  generateSingleSessionWorkout,
  validateGeneratedWorkout,
} from './workoutProgrammingEngine.ts';
import { generateWorkoutDescription } from './workoutDescriptionService.ts';
import { rankExerciseSubstitutions } from './substitutionEngine.ts';
import { createWorkoutValidationResult, workoutValidationRuleIds } from './validationEngine.ts';
import type {
  ExerciseSubstitutionOption,
  GeneratedExercisePrescription,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
  WorkoutSafetyFlag,
  WorkoutValidationResult,
} from './types.ts';

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function flagIds(flags: WorkoutSafetyFlag[]): string[] {
  return flags.map((flag) => flag.id);
}

const descriptionToneVariants = new Set([
  'beginner_friendly',
  'coach_like',
  'clinical',
  'motivational',
  'minimal',
  'detailed',
  'athletic',
  'rehab_informed',
  'data_driven',
]);

const genericDescriptionFragments = [
  'adjust as needed',
  'do what feels right',
  'listen to your body',
  'workout summary',
  'summary template',
];

export function resolveSafetyFlags(
  input: PersonalizedWorkoutInput,
  intelligence: WorkoutIntelligenceCatalog = workoutIntelligenceCatalog,
): WorkoutSafetyFlag[] {
  const explicit = new Set([...(input.safetyFlags ?? []), ...(input.painFlags ?? [])]);
  if (input.readinessBand === 'red' || input.readinessBand === 'orange') explicit.add('poor_readiness');
  if (input.readinessBand === 'unknown' || !input.readinessBand) explicit.add('unknown_readiness');
  if (input.equipmentIds.length <= 1) explicit.add('equipment_limited');
  if (input.durationMinutes < 25) explicit.add('time_limited');

  return intelligence.safetyFlags.filter((flag) => explicit.has(flag.id));
}

export function validateWorkoutIntelligenceCatalog(
  catalog: WorkoutIntelligenceCatalog = workoutIntelligenceCatalog,
): WorkoutValidationResult {
  const errors: string[] = [];
  if (catalog.progressionRules.length < 20) errors.push('Expected at least 20 progression rules.');
  if (catalog.regressionRules.length < 20) errors.push('Expected at least 20 regression rules.');
  if (catalog.deloadRules.length < 10) errors.push('Expected at least 10 deload rules.');
  if (catalog.substitutionRules.length < 25) errors.push('Expected at least 25 substitution rules.');
  if (catalog.safetyFlags.length < 25) errors.push('Expected at least 25 safety flags.');
  if (catalog.coachingCueSets.length < 25) errors.push('Expected at least 25 coaching cue sets.');
  if (catalog.commonMistakeSets.length < 25) errors.push('Expected at least 25 common mistake sets.');
  if (catalog.descriptionTemplates.length < 20) errors.push('Expected at least 20 description templates.');
  if (catalog.validationRules.length < 25) errors.push('Expected 25 domain validation rules from QA spec.');
  const validationRuleIds = new Set(catalog.validationRules.map((rule) => rule.id));
  for (const ruleId of workoutValidationRuleIds()) {
    if (!validationRuleIds.has(ruleId)) errors.push(`Missing domain validation rule ${ruleId}.`);
  }

  for (const template of catalog.descriptionTemplates) {
    const templateId = template.descriptionTemplateId ?? template.id;
    const textFields = [
      template.summaryTemplate,
      template.sessionIntent,
      template.plainLanguageSummary,
      template.coachExplanation,
      template.effortExplanation,
      template.whyThisMatters,
      template.howItShouldFeel,
      template.scalingDown,
      template.scalingUp,
      template.breathingFocus,
      template.recoveryExpectation,
      template.completionMessage,
      template.nextSessionNote,
    ];
    const joined = [
      ...textFields.filter((value): value is string => Boolean(value)),
      ...(template.successCriteria ?? []),
      ...(template.formFocus ?? []),
      ...(template.commonMistakes ?? []),
      ...(template.safetyNotes ?? []),
    ].join(' ').toLowerCase();

    if (!template.descriptionTemplateId) errors.push(`${template.id} is missing descriptionTemplateId.`);
    if (!template.appliesToEntityType || !template.appliesToEntityId) errors.push(`${templateId} is missing entity scope.`);
    if (!template.toneVariant || !descriptionToneVariants.has(template.toneVariant)) errors.push(`${templateId} has unsupported tone variant.`);
    if (textFields.some((value) => !value?.trim())) errors.push(`${templateId} is missing full coaching language.`);
    if ((template.successCriteria?.length ?? 0) < 3) errors.push(`${templateId} needs at least three success criteria.`);
    if ((template.formFocus?.length ?? 0) < 2) errors.push(`${templateId} needs specific form focus cues.`);
    if ((template.safetyNotes?.length ?? 0) === 0) errors.push(`${templateId} needs safety notes.`);
    if (genericDescriptionFragments.some((fragment) => joined.includes(fragment))) errors.push(`${templateId} contains generic description language.`);
  }
  return createWorkoutValidationResult({ errors, failedRuleIds: errors.length ? ['intelligence_catalog_integrity'] : [] });
}

function exerciseById(catalog: WorkoutProgrammingCatalog, id: string) {
  return catalog.exercises.find((exercise) => exercise.id === id) ?? null;
}

function substitutionsFor(
  exercise: GeneratedExercisePrescription,
  workout: GeneratedWorkout,
  input: PersonalizedWorkoutInput,
  safetyFlagIds: string[],
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
): ExerciseSubstitutionOption[] {
  return rankExerciseSubstitutions({
    sourceExerciseId: exercise.exerciseId,
    movementPatternIds: exercise.movementPatternIds,
    primaryMuscleIds: exercise.primaryMuscleIds,
    workoutTypeId: workout.workoutTypeId,
    goalId: workout.goalId,
    equipmentIds: input.equipmentIds,
    safetyFlagIds,
    experienceLevel: input.experienceLevel,
    catalog,
    intelligence,
    limit: 3,
    ...(input.dislikedExerciseIds ? { dislikedExerciseIds: input.dislikedExerciseIds } : {}),
  });
}

function scaleExercise(
  exercise: GeneratedExercisePrescription,
  direction: 'down' | 'up',
): GeneratedExercisePrescription {
  const sets = exercise.prescription.sets;
  const durationMinutes = exercise.prescription.durationMinutes;
  const durationSeconds = exercise.prescription.durationSeconds;
  return {
    ...exercise,
    prescription: {
      ...exercise.prescription,
      sets: sets == null ? sets : Math.max(1, sets + (direction === 'down' ? -1 : 1)),
      durationMinutes: durationMinutes == null ? durationMinutes : Math.max(3, durationMinutes + (direction === 'down' ? -5 : 5)),
      durationSeconds: durationSeconds == null ? durationSeconds : Math.max(20, durationSeconds + (direction === 'down' ? -10 : 10)),
      targetRpe: Math.min(8, Math.max(1, exercise.prescription.targetRpe + (direction === 'down' ? -1 : 1))),
    },
  };
}

function enrichWorkout(
  workout: GeneratedWorkout,
  input: PersonalizedWorkoutInput,
  safetyFlagIds: string[],
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
): GeneratedWorkout {
  const disliked = new Set(input.dislikedExerciseIds ?? []);
  const blocks = workout.blocks.map((block) => ({
    ...block,
    exercises: block.exercises
      .filter((exercise) => !disliked.has(exercise.exerciseId))
      .map((exercise) => {
        const cues = intelligence.coachingCueSets.find((set) => set.exerciseId === exercise.exerciseId)?.cues ?? [];
        const mistakes = intelligence.commonMistakeSets.find((set) => set.exerciseId === exercise.exerciseId)?.mistakes ?? [];
        const shouldScaleDown = safetyFlagIds.includes('poor_readiness')
          || safetyFlagIds.includes('unknown_readiness')
          || safetyFlagIds.includes('pain_increased_last_session');
        const scaled = shouldScaleDown ? scaleExercise(exercise, 'down') : exercise;
        return {
          ...scaled,
          substitutions: substitutionsFor(scaled, workout, input, safetyFlagIds, catalog, intelligence),
          scalingOptions: {
            down: 'Reduce one set or five minutes and lower target RPE by one.',
            up: 'Add one set or five minutes only if pain is stable and RPE was below target.',
          },
          coachingCues: cues,
          commonMistakes: mistakes,
        };
      }),
  }));

  return {
    ...workout,
    blocks,
    safetyFlags: unique([...workout.safetyFlags, ...safetyFlagIds]),
    explanations: [
      ...workout.explanations,
      safetyFlagIds.includes('poor_readiness')
        ? 'Poor readiness capped intensity and volume before exercise selection was accepted.'
        : 'Readiness did not require a hard block, but missing data remains treated conservatively.',
      'Each exercise includes scaling and substitution options for real-world adjustment.',
    ],
  };
}

export function generatePersonalizedWorkout(
  input: PersonalizedWorkoutInput,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog = workoutIntelligenceCatalog,
): GeneratedWorkout {
  const resolvedSafety = resolveSafetyFlags(input, intelligence);
  const blocking = resolvedSafety.find((flag) => flag.severity === 'block');
  if (blocking) {
    const blockedWorkout: GeneratedWorkout = {
      schemaVersion: 'generated-workout-v1',
      workoutTypeId: 'recovery',
      goalId: input.goalId,
      templateId: 'blocked_by_safety',
      formatId: 'checklist',
      experienceLevel: input.experienceLevel,
      requestedDurationMinutes: input.durationMinutes,
      estimatedDurationMinutes: 0,
      equipmentIds: [],
      safetyFlags: flagIds(resolvedSafety),
      blocks: [],
      trackingMetricIds: ['pain_score_before', 'pain_score_after', 'notes'],
      successCriteria: ['Do not train hard until the blocking safety flag is resolved.'],
      explanations: [`Workout generation was blocked by ${blocking.label}. Safety wins over performance goals.`],
      blocked: true,
      validationWarnings: [`Blocked by ${blocking.id}.`],
    };
    const description = generateWorkoutDescription(blockedWorkout, {
      descriptionTemplateId: 'description_readiness_adjusted',
      templates: intelligence.descriptionTemplates,
      toneVariant: 'clinical',
    });
    return {
      ...blockedWorkout,
      sessionIntent: description.sessionIntent,
      userFacingSummary: description.plainLanguageSummary,
      description,
      coachingNotes: [description.coachExplanation, description.effortExplanation],
      safetyNotes: description.safetyNotes,
    };
  }

  const safetyFlagIds = unique([
    ...(input.safetyFlags ?? []),
    ...flagIds(resolvedSafety),
    ...resolvedSafety.flatMap((flag) => flag.contraindicationTags),
  ]);
  const base = generateSingleSessionWorkout({
    ...input,
    durationMinutes: input.preferredDurationMinutes ?? input.durationMinutes,
    safetyFlags: safetyFlagIds,
  }, catalog);
  const enriched = enrichWorkout(base, input, safetyFlagIds, catalog, intelligence);
  const validation = validateGeneratedWorkout(enriched, catalog);
  if (!validation.isValid) {
    throw new Error(`Personalized workout failed domain validation: ${validation.errors.join(' | ')}`);
  }
  return {
    ...enriched,
    validationWarnings: validation.warnings,
    validationErrors: validation.errors,
  };
}

export function validatePersonalizedWorkoutSafety(
  workout: GeneratedWorkout,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): WorkoutValidationResult {
  if (workout.blocked) return createWorkoutValidationResult();
  const errors = validateGeneratedWorkout(workout, catalog).errors;
  const selected = workout.blocks.flatMap((block) => block.exercises);
  for (const exercise of selected) {
    const source = exerciseById(catalog, exercise.exerciseId);
    if (!source) continue;
    const contraindicated = source.contraindicationFlags.filter((flag) => workout.safetyFlags.includes(flag));
    if (contraindicated.length > 0) {
      errors.push(`${source.name} violates safety flags: ${contraindicated.join(', ')}.`);
    }
  }
  return createWorkoutValidationResult({
    errors,
    failedRuleIds: errors.length ? ['personalized_safety_compatibility'] : [],
  });
}
