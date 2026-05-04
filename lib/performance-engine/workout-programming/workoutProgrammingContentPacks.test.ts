import {
  generateSingleSessionWorkout,
  progressionRules,
  validateContentPackIds,
  validateNoDuplicateIds,
  validateDescriptionCompleteness,
  validatePrescriptionPayloads,
  validateReferences,
  validateReviewStatuses,
  validateWorkoutProgrammingContentPacks,
  workoutIntelligenceCatalog,
  workoutProgrammingCatalog,
} from './index.ts';
import {
  exerciseContentPacks,
  prescriptionContentPacks,
  sessionContentPacks,
  workoutIntelligenceContentCatalog,
  workoutProgrammingContentCatalog,
} from './content/index.ts';
import { intelligenceContentPacks } from './content/intelligence/index.ts';
import {
  assessmentMetrics as sourceAssessmentMetrics,
  equipmentTypes as sourceEquipmentTypes,
  exercises as sourceExercises,
  movementPatterns as sourceMovementPatterns,
  muscleGroups as sourceMuscleGroups,
  prescriptionTemplates as sourcePrescriptionTemplates,
  sessionTemplates as sourceSessionTemplates,
  trackingMetrics as sourceTrackingMetrics,
  trainingGoals as sourceTrainingGoals,
  workoutFormats as sourceWorkoutFormats,
  workoutTypes as sourceWorkoutTypes,
} from './content/source/seedContent.ts';
import {
  coachingCueSets as sourceCoachingCueSets,
  commonMistakeSets as sourceCommonMistakeSets,
  deloadRules as sourceDeloadRules,
  descriptionTemplates as sourceDescriptionTemplates,
  progressionRules as sourceProgressionRules,
  regressionRules as sourceRegressionRules,
  safetyFlags as sourceSafetyFlags,
  substitutionRules as sourceSubstitutionRules,
  validationRules as sourceValidationRules,
} from './content/source/intelligenceContent.ts';
import type { PrescriptionTemplate, WorkoutIntelligenceCatalog, WorkoutProgrammingCatalog } from './index.ts';

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

function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id);
}

function sameIds(left: { id: string }[], right: { id: string }[]): boolean {
  return JSON.stringify(ids(left)) === JSON.stringify(ids(right));
}

function prescriptionRuleIds(
  template: PrescriptionTemplate,
  field: 'progressionRuleIds' | 'regressionRuleIds' | 'deloadRuleIds',
): string[] {
  const topLevel = Array.isArray(template[field])
    ? template[field] as string[]
    : [];
  const payloadFields = template.payload as unknown as Partial<Record<typeof field, string[]>>;
  const payload = Array.isArray(payloadFields[field])
    ? payloadFields[field] as string[]
    : [];
  return Array.from(new Set([...topLevel, ...payload]));
}

function allPackItems(packs: Record<string, { id: string }[]>): { id: string }[] {
  return Object.values(packs).flat();
}

async function run(): Promise<void> {
  assert('content pack IDs are present and unique', validateContentPackIds().valid);
  assert('content packs have no duplicate IDs', validateNoDuplicateIds().valid);
  assert('content pack references resolve', validateReferences().valid);
  assert('content pack review metadata is valid', validateReviewStatuses().valid);
  assert('content pack prescription payloads validate', validatePrescriptionPayloads().valid);
  assert('content pack descriptions are complete', validateDescriptionCompleteness().valid);
  assert('full workout programming content pack validation passes', validateWorkoutProgrammingContentPacks().valid);
  assert('production prescription templates link progression, regression, and deload rules', workoutProgrammingContentCatalog.prescriptionTemplates
    .filter((template) => template.rolloutEligibility === 'production')
    .every((template) => (
      prescriptionRuleIds(template, 'progressionRuleIds').length > 0
      && prescriptionRuleIds(template, 'regressionRuleIds').length > 0
      && prescriptionRuleIds(template, 'deloadRuleIds').length > 0
    )));

  assert('exercise content packs cover source exercises', sameIds(workoutProgrammingContentCatalog.exercises, sourceExercises));
  assert('prescription content packs cover source prescriptions', sameIds(workoutProgrammingContentCatalog.prescriptionTemplates, sourcePrescriptionTemplates));
  assert('session content packs cover source sessions', sameIds(workoutProgrammingContentCatalog.sessionTemplates, sourceSessionTemplates));

  assert('taxonomy content pack composition preserves workout types', sameIds(workoutProgrammingContentCatalog.workoutTypes, sourceWorkoutTypes));
  assert('taxonomy content pack composition preserves training goals', sameIds(workoutProgrammingContentCatalog.trainingGoals, sourceTrainingGoals));
  assert('taxonomy content pack composition preserves workout formats', sameIds(workoutProgrammingContentCatalog.workoutFormats, sourceWorkoutFormats));
  assert('taxonomy content pack composition preserves movement patterns', sameIds(workoutProgrammingContentCatalog.movementPatterns, sourceMovementPatterns));
  assert('taxonomy content pack composition preserves muscle groups', sameIds(workoutProgrammingContentCatalog.muscleGroups, sourceMuscleGroups));
  assert('taxonomy content pack composition preserves equipment types', sameIds(workoutProgrammingContentCatalog.equipmentTypes, sourceEquipmentTypes));
  assert('metric content pack composition preserves tracking metrics', sameIds(workoutProgrammingContentCatalog.trackingMetrics, sourceTrackingMetrics));
  assert('metric content pack composition preserves assessment metrics', sameIds(workoutProgrammingContentCatalog.assessmentMetrics, sourceAssessmentMetrics));

  assert('intelligence content pack composition preserves progression rules', sameIds(workoutIntelligenceContentCatalog.progressionRules, sourceProgressionRules));
  assert('intelligence content pack composition preserves regression rules', sameIds(workoutIntelligenceContentCatalog.regressionRules, sourceRegressionRules));
  assert('intelligence content pack composition preserves deload rules', sameIds(workoutIntelligenceContentCatalog.deloadRules, sourceDeloadRules));
  assert('intelligence content pack composition preserves substitution rules', sameIds(workoutIntelligenceContentCatalog.substitutionRules, sourceSubstitutionRules));
  assert('intelligence content pack composition preserves safety flags', sameIds(workoutIntelligenceContentCatalog.safetyFlags, sourceSafetyFlags));
  assert('intelligence content pack composition preserves coaching cues', sameIds(workoutIntelligenceContentCatalog.coachingCueSets, sourceCoachingCueSets));
  assert('intelligence content pack composition preserves common mistakes', sameIds(workoutIntelligenceContentCatalog.commonMistakeSets, sourceCommonMistakeSets));
  assert('intelligence content pack composition preserves descriptions', sameIds(workoutIntelligenceContentCatalog.descriptionTemplates, sourceDescriptionTemplates));
  assert('intelligence content pack composition preserves validation rules', sameIds(workoutIntelligenceContentCatalog.validationRules, sourceValidationRules));

  assert('public seedData catalog still composes the same exercise shape', sameIds(workoutProgrammingCatalog.exercises, sourceExercises));
  assert('public intelligenceData catalog still composes the same rule shape', sameIds(workoutIntelligenceCatalog.progressionRules, sourceProgressionRules));
  assert('public named intelligence exports remain stable', progressionRules.length === workoutIntelligenceCatalog.progressionRules.length);

  assert('exercise content packs contain no duplicate assignments', allPackItems(exerciseContentPacks).length === workoutProgrammingContentCatalog.exercises.length);
  assert('prescription content packs contain no duplicate assignments', allPackItems(prescriptionContentPacks).length === workoutProgrammingContentCatalog.prescriptionTemplates.length);
  assert('session content packs contain no duplicate assignments', allPackItems(sessionContentPacks).length === workoutProgrammingContentCatalog.sessionTemplates.length);
  assert('intelligence content packs contain no duplicate assignments', allPackItems(intelligenceContentPacks).length === Object.values(workoutIntelligenceContentCatalog).flat().length);

  {
    const duplicatePacks = {
      ...exerciseContentPacks,
      duplicateLowerBody: [exerciseContentPacks.lowerBody[0]],
    };
    const validation = validateNoDuplicateIds({ exercisePacks: duplicatePacks });
    assert('content validation catches duplicate IDs across packs', !validation.valid);
    assert('duplicate ID error names the duplicate pack', validation.errors.some((issue) => issue.field === 'exerciseContentPacks' && issue.message.includes('duplicateLowerBody')));
  }

  {
    const catalog = clone(workoutProgrammingContentCatalog) as WorkoutProgrammingCatalog;
    catalog.exercises[0] = {
      ...catalog.exercises[0],
      movementPatternIds: ['missing_pattern'],
    };
    const validation = validateReferences({ catalog, intelligence: workoutIntelligenceContentCatalog });
    assert('content validation catches broken movement pattern references', !validation.valid);
    assert('broken reference error is actionable', validation.errors.some((issue) => issue.recordType === 'Exercise' && issue.field === 'movementPatternIds' && issue.suggestedCorrection.includes('add the referenced content record')));
  }

  {
    const intelligence = clone(workoutIntelligenceContentCatalog) as WorkoutIntelligenceCatalog;
    intelligence.descriptionTemplates[0] = {
      ...intelligence.descriptionTemplates[0],
      coachExplanation: '',
    };
    const validation = validateWorkoutProgrammingContentPacks({ catalog: workoutProgrammingContentCatalog, intelligence });
    assert('content validation catches incomplete description copy', !validation.valid);
    assert('description completeness error names the missing field', validation.errors.some((issue) => issue.recordType === 'DescriptionTemplate' && issue.field === 'coachExplanation'));
  }

  {
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'],
      experienceLevel: 'beginner',
    });
    assert('existing generator still works through public seed facade', workout.blocks.length > 0 && workout.validation?.isValid !== false);
  }

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
