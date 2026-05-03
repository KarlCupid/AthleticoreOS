import {
  validateDescriptionTemplateRecord,
  validatePrescriptionTemplateRecord,
  validateWorkoutProgrammingCatalogRuntime,
} from '../catalogValidation.ts';
import {
  applyDefaultContentReviewMetadataToCatalog,
  applyDefaultContentReviewMetadataToIntelligence,
} from '../contentReview.ts';
import type {
  DescriptionTemplate,
  RuntimeValidationIssue,
  RuntimeValidationRecordType,
  RuntimeValidationResult,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
} from '../types.ts';
import {
  exerciseContentPacks,
  prescriptionContentPacks,
  sessionContentPacks,
  workoutIntelligenceContentCatalog,
  workoutProgrammingContentCatalog,
} from './index.ts';
import { intelligenceContentPacks } from './intelligence/index.ts';

type ContentItem = { id?: unknown };
type ContentPackMap = Record<string, ContentItem[]>;

export interface ContentPackValidationOptions {
  catalog?: WorkoutProgrammingCatalog;
  intelligence?: WorkoutIntelligenceCatalog;
  exercisePacks?: ContentPackMap;
  prescriptionPacks?: ContentPackMap;
  sessionPacks?: ContentPackMap;
  intelligencePacks?: ContentPackMap;
}

const emptyResult: RuntimeValidationResult = {
  valid: true,
  errors: [],
  warnings: [],
};

const reviewStatuses = new Set(['draft', 'needs_review', 'approved', 'rejected']);
const safetyReviewStatuses = new Set(['not_required', 'needs_review', 'approved', 'rejected']);
const riskLevels = new Set(['low', 'moderate', 'high']);
const rolloutEligibilities = new Set(['dev_only', 'preview', 'production', 'blocked']);
const externalSignalMetricIds = new Set([
  'completion_tolerance',
  'pain_location',
  'session_rpe',
  'sleep_quality',
  'soreness',
  'technical_quality',
]);
const externalSafetySignalIds = new Set([
  'balance_concern',
  'balance_fall_risk',
  'fall_risk',
]);

function issue(
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  severity: RuntimeValidationIssue['severity'],
  message: string,
  suggestedCorrection: string,
): RuntimeValidationIssue {
  const validationIssue: RuntimeValidationIssue = {
    recordType,
    field,
    severity,
    message,
    suggestedCorrection,
  };
  if (id !== undefined) {
    validationIssue.id = id;
  }
  return validationIssue;
}

function resultFromIssues(issues: RuntimeValidationIssue[]): RuntimeValidationResult {
  return {
    valid: issues.every((candidate) => candidate.severity !== 'error'),
    errors: issues.filter((candidate) => candidate.severity === 'error'),
    warnings: issues.filter((candidate) => candidate.severity === 'warning'),
  };
}

function mergeResults(results: RuntimeValidationResult[]): RuntimeValidationResult {
  const issues = results.flatMap((result) => [...result.errors, ...result.warnings]);
  return issues.length === 0 ? { ...emptyResult } : resultFromIssues(issues);
}

function itemId(item: ContentItem): string | undefined {
  return typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : undefined;
}

function entriesFromCatalog(catalog: WorkoutProgrammingCatalog, intelligence: WorkoutIntelligenceCatalog): {
  recordType: RuntimeValidationRecordType;
  collectionName: string;
  items: ContentItem[];
}[] {
  return [
    { recordType: 'WorkoutTaxonomyItem', collectionName: 'workoutTypes', items: catalog.workoutTypes },
    { recordType: 'WorkoutTaxonomyItem', collectionName: 'trainingGoals', items: catalog.trainingGoals },
    { recordType: 'WorkoutTaxonomyItem', collectionName: 'workoutFormats', items: catalog.workoutFormats },
    { recordType: 'WorkoutTaxonomyItem', collectionName: 'movementPatterns', items: catalog.movementPatterns },
    { recordType: 'MuscleGroup', collectionName: 'muscleGroups', items: catalog.muscleGroups },
    { recordType: 'EquipmentType', collectionName: 'equipmentTypes', items: catalog.equipmentTypes },
    { recordType: 'WorkoutTaxonomyItem', collectionName: 'trackingMetrics', items: catalog.trackingMetrics },
    { recordType: 'WorkoutTaxonomyItem', collectionName: 'assessmentMetrics', items: catalog.assessmentMetrics },
    { recordType: 'Exercise', collectionName: 'exercises', items: catalog.exercises },
    { recordType: 'PrescriptionTemplate', collectionName: 'prescriptionTemplates', items: catalog.prescriptionTemplates },
    { recordType: 'SessionTemplate', collectionName: 'sessionTemplates', items: catalog.sessionTemplates },
    { recordType: 'ProgressionRule', collectionName: 'progressionRules', items: intelligence.progressionRules },
    { recordType: 'RegressionRule', collectionName: 'regressionRules', items: intelligence.regressionRules },
    { recordType: 'DeloadRule', collectionName: 'deloadRules', items: intelligence.deloadRules },
    { recordType: 'SubstitutionRule', collectionName: 'substitutionRules', items: intelligence.substitutionRules },
    { recordType: 'WorkoutSafetyFlag', collectionName: 'safetyFlags', items: intelligence.safetyFlags },
    { recordType: 'CoachingCueSet', collectionName: 'coachingCueSets', items: intelligence.coachingCueSets },
    { recordType: 'CommonMistakeSet', collectionName: 'commonMistakeSets', items: intelligence.commonMistakeSets },
    { recordType: 'DescriptionTemplate', collectionName: 'descriptionTemplates', items: intelligence.descriptionTemplates },
    { recordType: 'ValidationRule', collectionName: 'validationRules', items: intelligence.validationRules },
  ];
}

function defaultOptions(options: ContentPackValidationOptions = {}): Required<ContentPackValidationOptions> {
  return {
    catalog: options.catalog ?? workoutProgrammingContentCatalog,
    intelligence: options.intelligence ?? workoutIntelligenceContentCatalog,
    exercisePacks: options.exercisePacks ?? exerciseContentPacks,
    prescriptionPacks: options.prescriptionPacks ?? prescriptionContentPacks,
    sessionPacks: options.sessionPacks ?? sessionContentPacks,
    intelligencePacks: options.intelligencePacks ?? intelligenceContentPacks,
  };
}

function setFrom(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

function expectKnownIds(
  issues: RuntimeValidationIssue[],
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  values: string[] | undefined,
  known: Set<string>,
  targetLabel: string,
): void {
  for (const value of values ?? []) {
    if (!known.has(value)) {
      issues.push(issue(
        recordType,
        id,
        field,
        'error',
        `${field} references unknown ${targetLabel} "${value}".`,
        `Use an existing ${targetLabel} ID or add the referenced content record before composing the pack.`,
      ));
    }
  }
}

export function validateContentPackIds(options: ContentPackValidationOptions = {}): RuntimeValidationResult {
  const resolved = defaultOptions(options);
  const issues: RuntimeValidationIssue[] = [];

  for (const collection of entriesFromCatalog(resolved.catalog, resolved.intelligence)) {
    collection.items.forEach((item, index) => {
      if (!itemId(item)) {
        issues.push(issue(
          collection.recordType,
          undefined,
          `${collection.collectionName}[${index}].id`,
          'error',
          `${collection.collectionName} contains a record without a non-empty ID.`,
          'Give every content record a stable, non-empty ID before publishing the pack.',
        ));
      }
    });
  }

  return mergeResults([resultFromIssues(issues), validateNoDuplicateIds(resolved)]);
}

export function validateNoDuplicateIds(options: ContentPackValidationOptions = {}): RuntimeValidationResult {
  const resolved = defaultOptions(options);
  const issues: RuntimeValidationIssue[] = [];
  const packGroups: {
    recordType: RuntimeValidationRecordType;
    groupName: string;
    packs: ContentPackMap;
  }[] = [
    { recordType: 'Exercise', groupName: 'exerciseContentPacks', packs: resolved.exercisePacks },
    { recordType: 'PrescriptionTemplate', groupName: 'prescriptionContentPacks', packs: resolved.prescriptionPacks },
    { recordType: 'SessionTemplate', groupName: 'sessionContentPacks', packs: resolved.sessionPacks },
    { recordType: 'WorkoutIntelligenceCatalog', groupName: 'intelligenceContentPacks', packs: resolved.intelligencePacks },
  ];

  for (const group of packGroups) {
    const seen = new Map<string, string>();
    for (const [packName, items] of Object.entries(group.packs)) {
      for (const item of items) {
        const id = itemId(item);
        if (!id) continue;
        const firstPack = seen.get(id);
        if (firstPack && firstPack !== packName) {
          issues.push(issue(
            group.recordType,
            id,
            group.groupName,
            'error',
            `${id} appears in both ${firstPack} and ${packName}.`,
            'Keep each record in exactly one content pack for its content namespace.',
          ));
        } else {
          seen.set(id, packName);
        }
      }
    }
  }

  for (const collection of entriesFromCatalog(resolved.catalog, resolved.intelligence)) {
    const seen = new Set<string>();
    for (const item of collection.items) {
      const id = itemId(item);
      if (!id) continue;
      if (seen.has(id)) {
        issues.push(issue(
          collection.recordType,
          id,
          collection.collectionName,
          'error',
          `${collection.collectionName} contains duplicate ID ${id}.`,
          'Remove or rename the duplicate content record.',
        ));
      }
      seen.add(id);
    }
  }

  return resultFromIssues(issues);
}

export function validateReferences(options: ContentPackValidationOptions = {}): RuntimeValidationResult {
  const { catalog, intelligence } = defaultOptions(options);
  const issues: RuntimeValidationIssue[] = [];
  const workoutTypeIds = setFrom(catalog.workoutTypes);
  const goalIds = setFrom(catalog.trainingGoals);
  const formatIds = setFrom(catalog.workoutFormats);
  const movementPatternIds = setFrom(catalog.movementPatterns);
  const muscleGroupIds = setFrom(catalog.muscleGroups);
  const equipmentIds = setFrom(catalog.equipmentTypes);
  const trackingMetricIds = setFrom(catalog.trackingMetrics);
  const trackingOrAppSignalMetricIds = new Set([...trackingMetricIds, ...externalSignalMetricIds]);
  const exerciseIds = setFrom(catalog.exercises);
  const prescriptionTemplateIds = setFrom(catalog.prescriptionTemplates);
  const sessionTemplateIds = setFrom(catalog.sessionTemplates);
  const progressionRuleIds = setFrom(intelligence.progressionRules);
  const regressionRuleIds = setFrom(intelligence.regressionRules);
  const deloadRuleIds = setFrom(intelligence.deloadRules);
  const safetyFlagIds = setFrom(intelligence.safetyFlags);
  const safetyOrAppSignalFlagIds = new Set([...safetyFlagIds, ...externalSafetySignalIds]);

  for (const exercise of catalog.exercises) {
    expectKnownIds(issues, 'Exercise', exercise.id, 'movementPatternIds', exercise.movementPatternIds, movementPatternIds, 'movement pattern');
    expectKnownIds(issues, 'Exercise', exercise.id, 'primaryMuscleIds', exercise.primaryMuscleIds, muscleGroupIds, 'muscle group');
    expectKnownIds(issues, 'Exercise', exercise.id, 'secondaryMuscleIds', exercise.secondaryMuscleIds, muscleGroupIds, 'muscle group');
    expectKnownIds(issues, 'Exercise', exercise.id, 'equipmentIds', exercise.equipmentIds, equipmentIds, 'equipment');
    expectKnownIds(issues, 'Exercise', exercise.id, 'equipmentRequiredIds', exercise.equipmentRequiredIds, equipmentIds, 'equipment');
    expectKnownIds(issues, 'Exercise', exercise.id, 'equipmentOptionalIds', exercise.equipmentOptionalIds, equipmentIds, 'equipment');
    expectKnownIds(issues, 'Exercise', exercise.id, 'workoutTypeIds', exercise.workoutTypeIds, workoutTypeIds, 'workout type');
    expectKnownIds(issues, 'Exercise', exercise.id, 'goalIds', exercise.goalIds, goalIds, 'training goal');
    expectKnownIds(issues, 'Exercise', exercise.id, 'trackingMetricIds', exercise.trackingMetricIds, trackingMetricIds, 'tracking metric');
    expectKnownIds(issues, 'Exercise', exercise.id, 'regressionExerciseIds', exercise.regressionExerciseIds, exerciseIds, 'exercise');
    expectKnownIds(issues, 'Exercise', exercise.id, 'progressionExerciseIds', exercise.progressionExerciseIds, exerciseIds, 'exercise');
    expectKnownIds(issues, 'Exercise', exercise.id, 'substitutionExerciseIds', exercise.substitutionExerciseIds, exerciseIds, 'exercise');
    expectKnownIds(issues, 'Exercise', exercise.id, 'contraindicationFlags', exercise.contraindicationFlags, safetyFlagIds, 'safety flag');
    expectKnownIds(issues, 'Exercise', exercise.id, 'coachingCueIds', exercise.coachingCueIds, new Set(intelligence.coachingCueSets.map((set) => set.id)), 'coaching cue set');
    expectKnownIds(issues, 'Exercise', exercise.id, 'commonMistakeIds', exercise.commonMistakeIds, new Set(intelligence.commonMistakeSets.map((set) => set.id)), 'common mistake set');
    expectKnownIds(issues, 'Exercise', exercise.id, 'defaultPrescriptionTemplateId', [exercise.defaultPrescriptionTemplateId], prescriptionTemplateIds, 'prescription template');
  }

  for (const template of catalog.prescriptionTemplates) {
    expectKnownIds(issues, 'PrescriptionTemplate', template.id, 'appliesToWorkoutTypeIds', template.appliesToWorkoutTypeIds, workoutTypeIds, 'workout type');
    expectKnownIds(issues, 'PrescriptionTemplate', template.id, 'appliesToGoalIds', template.appliesToGoalIds, goalIds, 'training goal');
    expectKnownIds(issues, 'PrescriptionTemplate', template.id, 'progressionRuleIds', template.progressionRuleIds, progressionRuleIds, 'progression rule');
    expectKnownIds(issues, 'PrescriptionTemplate', template.id, 'regressionRuleIds', template.regressionRuleIds, regressionRuleIds, 'regression rule');
    expectKnownIds(issues, 'PrescriptionTemplate', template.id, 'deloadRuleIds', template.deloadRuleIds, deloadRuleIds, 'deload rule');
    expectKnownIds(issues, 'PrescriptionTemplate', template.id, 'payload.progressionRuleIds', 'progressionRuleIds' in template.payload ? template.payload.progressionRuleIds : undefined, progressionRuleIds, 'progression rule');
  }

  for (const session of catalog.sessionTemplates) {
    expectKnownIds(issues, 'SessionTemplate', session.id, 'workoutTypeId', [session.workoutTypeId], workoutTypeIds, 'workout type');
    expectKnownIds(issues, 'SessionTemplate', session.id, 'goalIds', session.goalIds, goalIds, 'training goal');
    expectKnownIds(issues, 'SessionTemplate', session.id, 'formatId', [session.formatId], formatIds, 'workout format');
    const blockIds = new Set(session.blocks.map((block) => block.id));
    for (const block of session.blocks) {
      expectKnownIds(issues, 'SessionTemplateBlock', block.id, 'prescriptionTemplateId', [block.prescriptionTemplateId], prescriptionTemplateIds, 'prescription template');
    }
    for (const slot of session.movementSlots) {
      expectKnownIds(issues, 'SessionTemplateMovementSlot', slot.id, 'blockId', [slot.blockId], blockIds, 'session block');
      expectKnownIds(issues, 'SessionTemplateMovementSlot', slot.id, 'movementPatternIds', slot.movementPatternIds, movementPatternIds, 'movement pattern');
      expectKnownIds(issues, 'SessionTemplateMovementSlot', slot.id, 'preferredExerciseIds', slot.preferredExerciseIds, exerciseIds, 'exercise');
      expectKnownIds(issues, 'SessionTemplateMovementSlot', slot.id, 'avoidExerciseIds', slot.avoidExerciseIds, exerciseIds, 'exercise');
    }
  }

  for (const rule of [...intelligence.progressionRules, ...intelligence.regressionRules, ...intelligence.deloadRules]) {
    expectKnownIds(issues, rule.ruleType === 'regression' ? 'RegressionRule' : rule.ruleType === 'deload' ? 'DeloadRule' : 'ProgressionRule', rule.id, 'appliesToWorkoutTypeIds', rule.appliesToWorkoutTypeIds, workoutTypeIds, 'workout type');
    expectKnownIds(issues, rule.ruleType === 'regression' ? 'RegressionRule' : rule.ruleType === 'deload' ? 'DeloadRule' : 'ProgressionRule', rule.id, 'appliesToGoalIds', rule.appliesToGoalIds, goalIds, 'training goal');
    expectKnownIds(issues, rule.ruleType === 'regression' ? 'RegressionRule' : rule.ruleType === 'deload' ? 'DeloadRule' : 'ProgressionRule', rule.id, 'requiredTrackingMetricIds', rule.requiredTrackingMetricIds, trackingOrAppSignalMetricIds, 'tracking metric or app signal');
    expectKnownIds(issues, rule.ruleType === 'regression' ? 'RegressionRule' : rule.ruleType === 'deload' ? 'DeloadRule' : 'ProgressionRule', rule.id, 'safetyOverride.blockingFlagIds', rule.safetyOverride?.blockingFlagIds, safetyOrAppSignalFlagIds, 'safety flag or app signal');
    expectKnownIds(issues, rule.ruleType === 'regression' ? 'RegressionRule' : rule.ruleType === 'deload' ? 'DeloadRule' : 'ProgressionRule', rule.id, 'safetyOverride.restrictionFlagIds', rule.safetyOverride?.restrictionFlagIds, safetyOrAppSignalFlagIds, 'safety flag or app signal');
  }

  for (const rule of intelligence.substitutionRules) {
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'sourceExerciseId', [rule.sourceExerciseId], exerciseIds, 'exercise');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'sourceMovementPatternIds', rule.sourceMovementPatternIds, movementPatternIds, 'movement pattern');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'acceptableReplacementIds', rule.acceptableReplacementIds, exerciseIds, 'exercise');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'replacementPriority', rule.replacementPriority, exerciseIds, 'exercise');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'requiredEquipmentIds', rule.requiredEquipmentIds, equipmentIds, 'equipment');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'excludedEquipmentIds', rule.excludedEquipmentIds, equipmentIds, 'equipment');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'supportedSafetyFlags', rule.supportedSafetyFlags, safetyOrAppSignalFlagIds, 'safety flag or app signal');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'excludedSafetyFlags', rule.excludedSafetyFlags, safetyOrAppSignalFlagIds, 'safety flag or app signal');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'substituteExerciseIds', rule.substituteExerciseIds, exerciseIds, 'exercise');
    expectKnownIds(issues, 'SubstitutionRule', rule.id, 'conditionFlags', rule.conditionFlags, safetyOrAppSignalFlagIds, 'safety flag or app signal');
  }

  for (const flag of intelligence.safetyFlags) {
    expectKnownIds(issues, 'WorkoutSafetyFlag', flag.id, 'appliesToWorkoutTypeIds', flag.appliesToWorkoutTypeIds, workoutTypeIds, 'workout type');
    expectKnownIds(issues, 'WorkoutSafetyFlag', flag.id, 'appliesToGoalIds', flag.appliesToGoalIds, goalIds, 'training goal');
    expectKnownIds(issues, 'WorkoutSafetyFlag', flag.id, 'appliesToExerciseIds', flag.appliesToExerciseIds, exerciseIds, 'exercise');
    expectKnownIds(issues, 'WorkoutSafetyFlag', flag.id, 'affectedMovementPatternIds', flag.affectedMovementPatternIds, movementPatternIds, 'movement pattern');
  }

  for (const set of intelligence.coachingCueSets) {
    expectKnownIds(issues, 'CoachingCueSet', set.id, 'exerciseId', [set.exerciseId], exerciseIds, 'exercise');
  }

  for (const set of intelligence.commonMistakeSets) {
    expectKnownIds(issues, 'CommonMistakeSet', set.id, 'exerciseId', [set.exerciseId], exerciseIds, 'exercise');
  }

  for (const template of intelligence.descriptionTemplates) {
    if (template.appliesToEntityType === 'workout_type') expectKnownIds(issues, 'DescriptionTemplate', template.id, 'appliesToEntityId', template.appliesToEntityId ? [template.appliesToEntityId] : undefined, workoutTypeIds, 'workout type');
    if (template.appliesToEntityType === 'goal') expectKnownIds(issues, 'DescriptionTemplate', template.id, 'appliesToEntityId', template.appliesToEntityId ? [template.appliesToEntityId] : undefined, goalIds, 'training goal');
    if (template.appliesToEntityType === 'session_template') expectKnownIds(issues, 'DescriptionTemplate', template.id, 'appliesToEntityId', template.appliesToEntityId ? [template.appliesToEntityId] : undefined, sessionTemplateIds, 'session template');
    if (template.appliesToEntityType === 'exercise') expectKnownIds(issues, 'DescriptionTemplate', template.id, 'appliesToEntityId', template.appliesToEntityId ? [template.appliesToEntityId] : undefined, exerciseIds, 'exercise');
    expectKnownIds(issues, 'DescriptionTemplate', template.id, 'appliesToGoalIds', template.appliesToGoalIds, goalIds, 'training goal');
  }

  for (const rule of intelligence.validationRules) {
    expectKnownIds(issues, 'ValidationRule', rule.id, 'appliesToWorkoutTypeIds', rule.appliesToWorkoutTypeIds, workoutTypeIds, 'workout type');
    expectKnownIds(issues, 'ValidationRule', rule.id, 'appliesToGoalIds', rule.appliesToGoalIds, goalIds, 'training goal');
  }

  return resultFromIssues(issues);
}

export function validateReviewStatuses(options: ContentPackValidationOptions = {}): RuntimeValidationResult {
  const { catalog, intelligence } = defaultOptions(options);
  const reviewedCatalog = applyDefaultContentReviewMetadataToCatalog(catalog);
  const reviewedIntelligence = applyDefaultContentReviewMetadataToIntelligence(intelligence);
  const issues: RuntimeValidationIssue[] = [];

  const reviewable = [
    ...reviewedCatalog.exercises.map((item) => ({ recordType: 'Exercise' as const, item })),
    ...reviewedCatalog.prescriptionTemplates.map((item) => ({ recordType: 'PrescriptionTemplate' as const, item })),
    ...reviewedIntelligence.descriptionTemplates.map((item) => ({ recordType: 'DescriptionTemplate' as const, item })),
    ...reviewedIntelligence.progressionRules.map((item) => ({ recordType: 'ProgressionRule' as const, item })),
    ...reviewedIntelligence.regressionRules.map((item) => ({ recordType: 'RegressionRule' as const, item })),
    ...reviewedIntelligence.deloadRules.map((item) => ({ recordType: 'DeloadRule' as const, item })),
    ...reviewedIntelligence.substitutionRules.map((item) => ({ recordType: 'SubstitutionRule' as const, item })),
    ...reviewedIntelligence.safetyFlags.map((item) => ({ recordType: 'WorkoutSafetyFlag' as const, item })),
    ...reviewedIntelligence.validationRules.map((item) => ({ recordType: 'ValidationRule' as const, item })),
  ];

  for (const { recordType, item } of reviewable) {
    if (!reviewStatuses.has(String(item.reviewStatus))) {
      issues.push(issue(recordType, item.id, 'reviewStatus', 'error', `${item.id} has invalid reviewStatus ${String(item.reviewStatus)}.`, 'Use draft, needs_review, approved, or rejected.'));
    }
    if (!safetyReviewStatuses.has(String(item.safetyReviewStatus))) {
      issues.push(issue(recordType, item.id, 'safetyReviewStatus', 'error', `${item.id} has invalid safetyReviewStatus ${String(item.safetyReviewStatus)}.`, 'Use not_required, needs_review, approved, or rejected.'));
    }
    if (!riskLevels.has(String(item.riskLevel))) {
      issues.push(issue(recordType, item.id, 'riskLevel', 'error', `${item.id} has invalid riskLevel ${String(item.riskLevel)}.`, 'Use low, moderate, or high.'));
    }
    if (!rolloutEligibilities.has(String(item.rolloutEligibility))) {
      issues.push(issue(recordType, item.id, 'rolloutEligibility', 'error', `${item.id} has invalid rolloutEligibility ${String(item.rolloutEligibility)}.`, 'Use dev_only, preview, production, or blocked.'));
    }
    if (item.riskLevel === 'high' && item.safetyReviewStatus !== 'approved') {
      issues.push(issue(recordType, item.id, 'safetyReviewStatus', 'error', `${item.id} is high risk without approved safety review.`, 'Approve safety review before using high-risk content in production.'));
    }
  }

  return resultFromIssues(issues);
}

export function validatePrescriptionPayloads(options: ContentPackValidationOptions = {}): RuntimeValidationResult {
  const { catalog } = defaultOptions(options);
  return mergeResults([
    ...catalog.prescriptionTemplates.map((template) => validatePrescriptionTemplateRecord(template, catalog)),
  ]);
}

function hasCompleteString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCompleteArray(value: unknown): boolean {
  return Array.isArray(value) && value.some((entry) => hasCompleteString(entry));
}

function requireDescriptionField(
  issues: RuntimeValidationIssue[],
  template: DescriptionTemplate,
  field: keyof DescriptionTemplate,
  mode: 'string' | 'array',
): void {
  const value = template[field];
  const complete = mode === 'array' ? hasCompleteArray(value) : hasCompleteString(value);
  if (!complete) {
    issues.push(issue(
      'DescriptionTemplate',
      template.id,
      String(field),
      'error',
      `${template.id} is missing complete ${String(field)} copy.`,
      'Author specific, display-ready coaching language for this description field.',
    ));
  }
}

export function validateDescriptionCompleteness(options: ContentPackValidationOptions = {}): RuntimeValidationResult {
  const { intelligence } = defaultOptions(options);
  const issues: RuntimeValidationIssue[] = [];

  for (const template of intelligence.descriptionTemplates) {
    const baseValidation = validateDescriptionTemplateRecord(template);
    issues.push(...baseValidation.errors, ...baseValidation.warnings);
    requireDescriptionField(issues, template, 'descriptionTemplateId', 'string');
    requireDescriptionField(issues, template, 'summaryTemplate', 'string');
    requireDescriptionField(issues, template, 'sessionIntent', 'string');
    requireDescriptionField(issues, template, 'plainLanguageSummary', 'string');
    requireDescriptionField(issues, template, 'coachExplanation', 'string');
    requireDescriptionField(issues, template, 'effortExplanation', 'string');
    requireDescriptionField(issues, template, 'whyThisMatters', 'string');
    requireDescriptionField(issues, template, 'howItShouldFeel', 'string');
    requireDescriptionField(issues, template, 'successCriteria', 'array');
    requireDescriptionField(issues, template, 'scalingDown', 'string');
    requireDescriptionField(issues, template, 'scalingUp', 'string');
    requireDescriptionField(issues, template, 'formFocus', 'array');
    requireDescriptionField(issues, template, 'breathingFocus', 'string');
    requireDescriptionField(issues, template, 'commonMistakes', 'array');
    requireDescriptionField(issues, template, 'safetyNotes', 'array');
    requireDescriptionField(issues, template, 'recoveryExpectation', 'string');
    requireDescriptionField(issues, template, 'completionMessage', 'string');
    requireDescriptionField(issues, template, 'nextSessionNote', 'string');
  }

  return resultFromIssues(issues);
}

export function validateWorkoutProgrammingContentPacks(options: ContentPackValidationOptions = {}): RuntimeValidationResult {
  const resolved = defaultOptions(options);
  return mergeResults([
    validateWorkoutProgrammingCatalogRuntime(resolved.catalog),
    validateContentPackIds(resolved),
    validateReferences(resolved),
    validateReviewStatuses(resolved),
    validatePrescriptionPayloads(resolved),
    validateDescriptionCompleteness(resolved),
  ]);
}
