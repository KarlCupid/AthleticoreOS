import type {
  GeneratedWorkout,
  PrescriptionKind,
  RuntimeValidationIssue,
  RuntimeValidationRecordType,
  RuntimeValidationResult,
  WorkoutProgrammingCatalog,
  WorkoutRule,
} from './types.ts';

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const WORKOUT_INTENSITIES = ['recovery', 'low', 'moderate', 'hard'] as const;
const BLOCK_KINDS = ['warmup', 'main', 'cooldown'] as const;
const EXERCISE_CATEGORIES = [
  'strength',
  'hypertrophy',
  'power',
  'conditioning',
  'cardio',
  'mobility',
  'flexibility',
  'balance',
  'recovery',
  'skill',
  'assessment',
  'prehab',
] as const;
const MOVEMENT_PLANES = ['sagittal', 'frontal', 'transverse', 'multi_planar', 'static'] as const;
const SETUP_TYPES = ['floor', 'standing', 'seated', 'bench', 'machine', 'rack', 'supported', 'locomotion'] as const;
const TECHNICAL_COMPLEXITIES = ['low', 'moderate', 'high', 'coach_required'] as const;
const LOADABILITIES = ['none', 'light', 'low', 'moderate', 'high', 'heavy', 'maximal', 'variable'] as const;
const DEMAND_LEVELS = ['none', 'low', 'moderate', 'high'] as const;
const SPINE_LOADINGS = ['none', 'low', 'moderate', 'high', 'axial', 'shear'] as const;
const IMPACT_LEVELS = ['none', 'low', 'moderate', 'high'] as const;
const SPACE_REQUIREMENTS = ['mat', 'small_space', 'lane', 'open_space', 'machine_station', 'outdoor'] as const;
const PRESCRIPTION_KINDS = [
  'resistance',
  'cardio',
  'interval',
  'mobility',
  'flexibility',
  'balance',
  'recovery',
  'power',
  'conditioning',
] as const;
const INTENSITY_MODELS = ['rpe', 'rir', 'percent_1rm', 'heart_rate_zone', 'pace', 'watts', 'talk_test', 'quality'] as const;
const VOLUME_MODELS = ['sets_reps', 'duration', 'distance', 'rounds', 'contacts', 'density', 'holds'] as const;
const REST_MODELS = ['fixed', 'range', 'as_needed', 'heart_rate_recovery', 'quality_recovery', 'none'] as const;
const RULE_TYPES = ['progression', 'regression', 'deload'] as const;
const DESCRIPTION_TONES = [
  'beginner_friendly',
  'coach_like',
  'clinical',
  'motivational',
  'minimal',
  'detailed',
  'athletic',
  'rehab_informed',
  'data_driven',
] as const;
const DESCRIPTION_ENTITIES = ['goal', 'workout_type', 'session_template', 'exercise', 'program'] as const;
const MUSCLE_REGIONS = ['upper', 'lower', 'core', 'full_body'] as const;
const EQUIPMENT_CATEGORIES = ['bodyweight', 'free_weight', 'machine', 'cardio', 'accessory', 'space'] as const;
const BALANCE_BASES = ['bilateral', 'split_stance', 'single_leg', 'moving'] as const;
const BALANCE_SURFACES = ['floor', 'soft_surface', 'line', 'unstable'] as const;
const BALANCE_VISUAL_INPUTS = ['eyes_open', 'eyes_closed', 'head_turns'] as const;
const BALANCE_MODES = ['static', 'dynamic'] as const;
const CARDIO_MODALITIES = ['bike', 'rower', 'walk', 'run', 'mixed_low_impact'] as const;
const CARDIO_PROGRESSIONS = ['duration', 'frequency', 'duration_then_frequency'] as const;
const RESISTANCE_INTENSITY_MODELS = ['rpe', 'rir', 'percent_1rm'] as const;
const MAIN_LIFT_KINDS = ['main_lift', 'accessory', 'hypertrophy_accessory', 'core_accessory'] as const;
const SUBSTITUTION_SKILL_MATCHES = ['same_or_lower', 'same', 'any'] as const;
const SUBSTITUTION_GOAL_MATCHES = ['same_goal', 'same_workout_type', 'same_pattern', 'any'] as const;
const RULE_OPERATORS = ['<', '<=', '=', '>=', '>', 'includes', 'excludes', 'missing', 'present'] as const;
const MEDIA_REVIEW_STATUSES = ['draft', 'needs_review', 'approved', 'rejected'] as const;
const MEDIA_PRIORITIES = ['low', 'medium', 'high'] as const;
const RULE_ACTION_KINDS = [
  'add_volume',
  'reduce_volume',
  'increase_load',
  'decrease_load',
  'swap_exercise',
  'change_intensity',
  'deload',
  'repeat',
] as const;

export class WorkoutProgrammingCatalogValidationError extends Error {
  issues: RuntimeValidationIssue[];

  constructor(message: string, issues: RuntimeValidationIssue[]) {
    super(message);
    this.name = 'WorkoutProgrammingCatalogValidationError';
    this.issues = issues;
  }
}

interface IssueSink {
  issues: RuntimeValidationIssue[];
  add: (input: RuntimeValidationIssue) => void;
}

interface CatalogRefs {
  workoutTypeIds: Set<string>;
  goalIds: Set<string>;
  formatIds: Set<string>;
  movementPatternIds: Set<string>;
  muscleGroupIds: Set<string>;
  equipmentTypeIds: Set<string>;
  exerciseIds: Set<string>;
  prescriptionTemplateIds: Set<string>;
  trackingMetricIds: Set<string>;
  assessmentMetricIds: Set<string>;
  sessionTemplateIds: Set<string>;
}

function createSink(): IssueSink {
  const issues: RuntimeValidationIssue[] = [];
  return {
    issues,
    add(input) {
      issues.push(input);
    },
  };
}

function resultFromIssues(issues: RuntimeValidationIssue[]): RuntimeValidationResult {
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function idOf(record: unknown): string | undefined {
  if (!isRecord(record)) return undefined;
  const id = record.id ?? record.exerciseId ?? record.descriptionTemplateId;
  return typeof id === 'string' && id.trim() ? id : undefined;
}

function addIssue(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  message: string,
  suggestedCorrection: string,
  severity: RuntimeValidationIssue['severity'] = 'error',
): void {
  const issue: RuntimeValidationIssue = id
    ? { recordType, id, field, severity, message, suggestedCorrection }
    : { recordType, field, severity, message, suggestedCorrection };
  sink.add(issue);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalText(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (value == null) return;
  if (!hasText(value)) {
    addIssue(sink, recordType, id, field, `${field} must be a non-empty string when provided.`, `Remove ${field} or provide useful copy.`);
  }
}

function requireText(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (!hasText(value)) {
    addIssue(sink, recordType, id, field, `${field} is required.`, `Provide a non-empty ${field}.`);
  }
}

function requireNumber(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
  options: { min?: number; integer?: boolean } = {},
): void {
  const valid = typeof value === 'number'
    && Number.isFinite(value)
    && (options.min == null || value >= options.min)
    && (!options.integer || Number.isInteger(value));
  if (!valid) {
    const qualifier = options.min == null ? 'finite number' : `number >= ${options.min}`;
    addIssue(sink, recordType, id, field, `${field} must be a ${qualifier}.`, `Store ${field} as a valid ${qualifier}.`);
  }
}

function requireBoolean(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (typeof value !== 'boolean') {
    addIssue(sink, recordType, id, field, `${field} must be a boolean.`, `Store ${field} as true or false.`);
  }
}

function requireArray(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
  options: { nonEmpty?: boolean } = {},
): unknown[] {
  if (!Array.isArray(value)) {
    addIssue(sink, recordType, id, field, `${field} must be an array.`, `Store ${field} as an array.`);
    return [];
  }
  if (options.nonEmpty && value.length === 0) {
    addIssue(sink, recordType, id, field, `${field} cannot be empty.`, `Add at least one value to ${field}.`);
  }
  return value;
}

function requireStringArray(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
  options: { nonEmpty?: boolean } = {},
): string[] {
  const array = requireArray(sink, recordType, id, field, value, options);
  const strings = array.filter((item): item is string => hasText(item));
  if (strings.length !== array.length) {
    addIssue(sink, recordType, id, field, `${field} must contain only non-empty strings.`, `Remove empty or non-string values from ${field}.`);
  }
  return strings;
}

function optionalStringArray(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): string[] {
  if (value == null) return [];
  return requireStringArray(sink, recordType, id, field, value);
}

function requireOneOf<T extends readonly string[]>(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
  allowed: T,
): void {
  if (!hasText(value) || !allowed.includes(value)) {
    addIssue(
      sink,
      recordType,
      id,
      field,
      `${field} has invalid value ${String(value)}.`,
      `Use one of: ${allowed.join(', ')}.`,
    );
  }
}

function optionalOneOf<T extends readonly string[]>(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
  allowed: T,
): void {
  if (value == null) return;
  requireOneOf(sink, recordType, id, field, value, allowed);
}

function requireKnownIds(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  values: readonly string[],
  known: Set<string>,
  target: string,
): void {
  for (const value of values) {
    if (!known.has(value)) {
      addIssue(
        sink,
        recordType,
        id,
        field,
        `${field} references unknown ${target} ${value}.`,
        `Add ${value} to ${target} taxonomy or remove the reference.`,
      );
    }
  }
}

function validateTaxonomyItem(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  record: unknown,
  index: number,
): void {
  const id = idOf(record) ?? `index:${index}`;
  if (!isRecord(record)) {
    addIssue(sink, recordType, id, '$record', `${recordType} must be an object.`, 'Store records as JSON objects.');
    return;
  }
  requireText(sink, recordType, id, 'id', record.id);
  requireText(sink, recordType, id, 'label', record.label);
  requireText(sink, recordType, id, 'summary', record.summary);
}

function validateNumericRange(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (!isRecord(value)) {
    addIssue(sink, recordType, id, field, `${field} must be a numeric range object.`, `Store ${field} as { min, max, target, unit }.`);
    return;
  }
  const numericKeys = ['min', 'max', 'target'] as const;
  const hasNumericValue = numericKeys.some((key) => typeof value[key] === 'number' && Number.isFinite(value[key]));
  if (!hasNumericValue) {
    addIssue(sink, recordType, id, field, `${field} must include min, max, or target.`, `Add a numeric min, max, or target to ${field}.`);
  }
  for (const key of numericKeys) {
    const next = value[key];
    if (next != null && (typeof next !== 'number' || !Number.isFinite(next))) {
      addIssue(sink, recordType, id, `${field}.${key}`, `${field}.${key} must be finite.`, `Store ${field}.${key} as a number.`);
    }
  }
  if (typeof value.min === 'number' && typeof value.max === 'number' && value.min > value.max) {
    addIssue(sink, recordType, id, field, `${field}.min cannot be greater than max.`, `Swap or correct the min/max values for ${field}.`);
  }
}

function validateTextOrNumericRange(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (!isRecord(value)) {
    addIssue(sink, recordType, id, field, `${field} must be a range object.`, `Store ${field} as a numeric or text range object.`);
    return;
  }
  const hasNumericValue = ['min', 'max', 'target'].some((key) => typeof value[key] === 'number' && Number.isFinite(value[key]));
  const hasTextValue = ['min', 'max', 'target'].some((key) => hasText(value[key]));
  if (!hasNumericValue && !hasTextValue) {
    addIssue(sink, recordType, id, field, `${field} must include a min, max, or target.`, `Add a useful min, max, or target to ${field}.`);
  }
}

function validatePrescriptionIntensityTarget(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (!isRecord(value)) {
    addIssue(sink, recordType, id, field, `${field} must be an intensity target object.`, `Store ${field} with RPE, RIR, heartRateZone, talkTest, pace, watts, or quality.`);
    return;
  }
  const keys = ['RPE', 'RIR', 'percent1RM', 'heartRateZone', 'pace', 'watts', 'talkTest', 'quality'];
  if (!keys.some((key) => value[key] != null)) {
    addIssue(sink, recordType, id, field, `${field} must define at least one target.`, `Add RPE, RIR, heartRateZone, talkTest, pace, watts, or quality to ${field}.`);
  }
  for (const key of ['RPE', 'RIR', 'percent1RM', 'watts'] as const) {
    if (value[key] != null) validateNumericRange(sink, recordType, id, `${field}.${key}`, value[key]);
  }
  for (const key of ['heartRateZone', 'pace'] as const) {
    if (value[key] != null) validateTextOrNumericRange(sink, recordType, id, `${field}.${key}`, value[key]);
  }
}

function validatePayload(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
  expectedKind?: PrescriptionKind,
): void {
  if (!isRecord(value)) {
    addIssue(sink, recordType, id, field, `${field} must be an object.`, `Store ${field} as a structured prescription payload.`);
    return;
  }

  requireOneOf(sink, recordType, id, `${field}.kind`, value.kind, PRESCRIPTION_KINDS);
  if (expectedKind && value.kind !== expectedKind) {
    addIssue(
      sink,
      recordType,
      id,
      `${field}.kind`,
      `${field}.kind must match template kind ${expectedKind}.`,
      `Set ${field}.kind to ${expectedKind} or use the matching prescription template kind.`,
    );
  }

  switch (value.kind) {
    case 'resistance':
      validateNumericRange(sink, recordType, id, `${field}.sets`, value.sets);
      validateTextOrNumericRange(sink, recordType, id, `${field}.repRange`, value.repRange);
      requireText(sink, recordType, id, `${field}.loadGuidance`, value.loadGuidance);
      requireOneOf(sink, recordType, id, `${field}.intensityModel`, value.intensityModel, RESISTANCE_INTENSITY_MODELS);
      validateNumericRange(sink, recordType, id, `${field}.RPE`, value.RPE);
      validateNumericRange(sink, recordType, id, `${field}.restSecondsRange`, value.restSecondsRange);
      requireText(sink, recordType, id, `${field}.tempo`, value.tempo);
      requireText(sink, recordType, id, `${field}.effortGuidance`, value.effortGuidance);
      requireOneOf(sink, recordType, id, `${field}.mainLiftVsAccessory`, value.mainLiftVsAccessory, MAIN_LIFT_KINDS);
      requireStringArray(sink, recordType, id, `${field}.progressionRuleIds`, value.progressionRuleIds);
      if (value.RIR != null) validateNumericRange(sink, recordType, id, `${field}.RIR`, value.RIR);
      if (value.percent1RM != null) validateNumericRange(sink, recordType, id, `${field}.percent1RM`, value.percent1RM);
      break;
    case 'cardio':
      validateNumericRange(sink, recordType, id, `${field}.durationMinutes`, value.durationMinutes);
      requireOneOf(sink, recordType, id, `${field}.modality`, value.modality, CARDIO_MODALITIES);
      validateTextOrNumericRange(sink, recordType, id, `${field}.heartRateZone`, value.heartRateZone);
      validateNumericRange(sink, recordType, id, `${field}.RPE`, value.RPE);
      requireText(sink, recordType, id, `${field}.talkTest`, value.talkTest);
      requireOneOf(sink, recordType, id, `${field}.progression`, value.progression, CARDIO_PROGRESSIONS);
      requireStringArray(sink, recordType, id, `${field}.progressionRuleIds`, value.progressionRuleIds);
      break;
    case 'interval':
    case 'conditioning':
      validateNumericRange(sink, recordType, id, `${field}.workIntervalSeconds`, value.workIntervalSeconds);
      validateNumericRange(sink, recordType, id, `${field}.restIntervalSeconds`, value.restIntervalSeconds);
      validateNumericRange(sink, recordType, id, `${field}.rounds`, value.rounds);
      validatePrescriptionIntensityTarget(sink, recordType, id, `${field}.targetIntensity`, value.targetIntensity);
      requireOneOf(sink, recordType, id, `${field}.impactLevel`, value.impactLevel, IMPACT_LEVELS);
      requireOneOf(sink, recordType, id, `${field}.fatigueRisk`, value.fatigueRisk, DEMAND_LEVELS);
      if (!isRecord(value.scalingOptions)) {
        addIssue(sink, recordType, id, `${field}.scalingOptions`, 'scalingOptions is required.', 'Add scalingOptions.down and scalingOptions.up.');
      } else {
        requireText(sink, recordType, id, `${field}.scalingOptions.down`, value.scalingOptions.down);
        requireText(sink, recordType, id, `${field}.scalingOptions.up`, value.scalingOptions.up);
      }
      break;
    case 'mobility':
      requireStringArray(sink, recordType, id, `${field}.targetJoints`, value.targetJoints, { nonEmpty: true });
      requireText(sink, recordType, id, `${field}.rangeOfMotionIntent`, value.rangeOfMotionIntent);
      validateTextOrNumericRange(sink, recordType, id, `${field}.reps`, value.reps);
      requireText(sink, recordType, id, `${field}.breathing`, value.breathing);
      requireBoolean(sink, recordType, id, `${field}.painFreeRange`, value.painFreeRange);
      requireText(sink, recordType, id, `${field}.endRangeControl`, value.endRangeControl);
      if (value.holdTimeSeconds != null) validateNumericRange(sink, recordType, id, `${field}.holdTimeSeconds`, value.holdTimeSeconds);
      break;
    case 'flexibility':
      requireStringArray(sink, recordType, id, `${field}.targetTissues`, value.targetTissues, { nonEmpty: true });
      requireStringArray(sink, recordType, id, `${field}.targetJoints`, value.targetJoints, { nonEmpty: true });
      validateNumericRange(sink, recordType, id, `${field}.holdTimeSeconds`, value.holdTimeSeconds);
      requireText(sink, recordType, id, `${field}.breathing`, value.breathing);
      requireBoolean(sink, recordType, id, `${field}.painFreeRange`, value.painFreeRange);
      requireText(sink, recordType, id, `${field}.rangeOfMotionIntent`, value.rangeOfMotionIntent);
      break;
    case 'balance':
      requireOneOf(sink, recordType, id, `${field}.baseOfSupport`, value.baseOfSupport, BALANCE_BASES);
      requireOneOf(sink, recordType, id, `${field}.surface`, value.surface, BALANCE_SURFACES);
      requireOneOf(sink, recordType, id, `${field}.visualInput`, value.visualInput, BALANCE_VISUAL_INPUTS);
      requireOneOf(sink, recordType, id, `${field}.mode`, value.mode, BALANCE_MODES);
      validateNumericRange(sink, recordType, id, `${field}.durationSeconds`, value.durationSeconds);
      requireStringArray(sink, recordType, id, `${field}.complexityProgression`, value.complexityProgression, { nonEmpty: true });
      requireStringArray(sink, recordType, id, `${field}.fallRiskRules`, value.fallRiskRules, { nonEmpty: true });
      break;
    case 'recovery':
      validateNumericRange(sink, recordType, id, `${field}.intensityCap`, value.intensityCap);
      validateNumericRange(sink, recordType, id, `${field}.durationMinutes`, value.durationMinutes);
      requireText(sink, recordType, id, `${field}.breathingStrategy`, value.breathingStrategy);
      requireText(sink, recordType, id, `${field}.circulationGoal`, value.circulationGoal);
      requireText(sink, recordType, id, `${field}.readinessAdjustment`, value.readinessAdjustment);
      break;
    case 'power':
      validateNumericRange(sink, recordType, id, `${field}.sets`, value.sets);
      validateTextOrNumericRange(sink, recordType, id, `${field}.reps`, value.reps);
      requireText(sink, recordType, id, `${field}.explosiveIntent`, value.explosiveIntent);
      validateNumericRange(sink, recordType, id, `${field}.fullRecoverySeconds`, value.fullRecoverySeconds);
      requireText(sink, recordType, id, `${field}.technicalQuality`, value.technicalQuality);
      requireBoolean(sink, recordType, id, `${field}.lowFatigue`, value.lowFatigue);
      requireText(sink, recordType, id, `${field}.movementSpeed`, value.movementSpeed);
      requireStringArray(sink, recordType, id, `${field}.eligibilityRestrictions`, value.eligibilityRestrictions);
      break;
    default:
      break;
  }
}

function validateExerciseMedia(sink: IssueSink, exerciseId: string | undefined, media: unknown): void {
  if (media == null) return;
  if (!isRecord(media)) {
    addIssue(sink, 'Exercise', exerciseId, 'media', 'media must be an object when provided.', 'Store media as a structured object with URLs, alt text, review status, and priority.');
    return;
  }

  const assetFields = ['thumbnailUrl', 'videoUrl', 'imageUrl', 'animationUrl'] as const;
  for (const field of assetFields) {
    if (media[field] != null && !hasText(media[field])) {
      addIssue(sink, 'Exercise', exerciseId, `media.${field}`, `media.${field} must be a non-empty string or null.`, `Remove media.${field}, set it to null, or provide a reviewed asset URL.`);
    }
  }
  optionalText(sink, 'Exercise', exerciseId, 'media.altText', media.altText);
  optionalText(sink, 'Exercise', exerciseId, 'media.attribution', media.attribution);
  optionalText(sink, 'Exercise', exerciseId, 'media.missingReason', media.missingReason);
  optionalOneOf(sink, 'Exercise', exerciseId, 'media.reviewStatus', media.reviewStatus, MEDIA_REVIEW_STATUSES);
  optionalOneOf(sink, 'Exercise', exerciseId, 'media.priority', media.priority, MEDIA_PRIORITIES);

  const hasAsset = assetFields.some((field) => hasText(media[field]));
  if (hasAsset && !hasText(media.altText)) {
    addIssue(sink, 'Exercise', exerciseId, 'media.altText', 'media.altText is required when an exercise media asset is present.', 'Add concise alt text that describes the visible exercise setup and action.');
  }
  if (!hasAsset && media.reviewStatus === 'approved') {
    addIssue(sink, 'Exercise', exerciseId, 'media.reviewStatus', 'media.reviewStatus cannot be approved without a linked media asset.', 'Attach a reviewed media asset before marking exercise media approved.');
  }
}

function validateGeneratedPrescriptionPayload(
  sink: IssueSink,
  id: string | undefined,
  field: string,
  value: unknown,
  expectedKind?: PrescriptionKind,
): void {
  if (!isRecord(value)) {
    addIssue(sink, 'GeneratedExercisePrescription', id, field, `${field} must be an object.`, `Store ${field} as a structured prescription payload.`);
    return;
  }
  requireOneOf(sink, 'GeneratedExercisePrescription', id, `${field}.kind`, value.kind, PRESCRIPTION_KINDS);
  if (expectedKind && value.kind !== expectedKind) {
    addIssue(
      sink,
      'GeneratedExercisePrescription',
      id,
      `${field}.kind`,
      `${field}.kind must match prescription kind ${expectedKind}.`,
      `Set ${field}.kind to ${expectedKind} or rebuild the generated prescription.`,
    );
  }
  if (Object.keys(value).filter((key) => key !== 'kind').length === 0) {
    addIssue(
      sink,
      'GeneratedExercisePrescription',
      id,
      field,
      `${field} is missing modality-specific fields.`,
      'Regenerate the prescription from a validated prescription template payload.',
    );
  }
}

function createCatalogRefs(catalog: WorkoutProgrammingCatalog): CatalogRefs {
  return {
    workoutTypeIds: new Set(catalog.workoutTypes.map((item) => item.id)),
    goalIds: new Set(catalog.trainingGoals.map((item) => item.id)),
    formatIds: new Set(catalog.workoutFormats.map((item) => item.id)),
    movementPatternIds: new Set(catalog.movementPatterns.map((item) => item.id)),
    muscleGroupIds: new Set(catalog.muscleGroups.map((item) => item.id)),
    equipmentTypeIds: new Set(catalog.equipmentTypes.map((item) => item.id)),
    exerciseIds: new Set(catalog.exercises.map((item) => item.id)),
    prescriptionTemplateIds: new Set(catalog.prescriptionTemplates.map((item) => item.id)),
    trackingMetricIds: new Set(catalog.trackingMetrics.map((item) => item.id)),
    assessmentMetricIds: new Set(catalog.assessmentMetrics.map((item) => item.id)),
    sessionTemplateIds: new Set(catalog.sessionTemplates.map((item) => item.id)),
  };
}

export function validateExerciseRecord(exercise: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validateExerciseInto(sink, exercise, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validateExerciseInto(sink: IssueSink, exercise: unknown, refs?: CatalogRefs): void {
  const id = idOf(exercise);
  if (!isRecord(exercise)) {
    addIssue(sink, 'Exercise', id, '$record', 'Exercise must be an object.', 'Store each exercise as a structured object.');
    return;
  }

  requireText(sink, 'Exercise', id, 'id', exercise.id);
  requireText(sink, 'Exercise', id, 'name', exercise.name);
  optionalText(sink, 'Exercise', id, 'shortName', exercise.shortName);
  optionalOneOf(sink, 'Exercise', id, 'category', exercise.category, EXERCISE_CATEGORIES);
  requireText(sink, 'Exercise', id, 'summary', exercise.summary);
  requireText(sink, 'Exercise', id, 'coachingSummary', exercise.coachingSummary);
  const movementPatternIds = requireStringArray(sink, 'Exercise', id, 'movementPatternIds', exercise.movementPatternIds, { nonEmpty: true });
  const primaryMuscleIds = requireStringArray(sink, 'Exercise', id, 'primaryMuscleIds', exercise.primaryMuscleIds);
  const secondaryMuscleIds = requireStringArray(sink, 'Exercise', id, 'secondaryMuscleIds', exercise.secondaryMuscleIds);
  const trackingMetricIds = requireStringArray(sink, 'Exercise', id, 'trackingMetricIds', exercise.trackingMetricIds, { nonEmpty: true });
  const equipmentIds = requireStringArray(sink, 'Exercise', id, 'equipmentIds', exercise.equipmentIds);
  const equipmentRequiredIds = optionalStringArray(sink, 'Exercise', id, 'equipmentRequiredIds', exercise.equipmentRequiredIds);
  const equipmentOptionalIds = optionalStringArray(sink, 'Exercise', id, 'equipmentOptionalIds', exercise.equipmentOptionalIds);
  const workoutTypeIds = requireStringArray(sink, 'Exercise', id, 'workoutTypeIds', exercise.workoutTypeIds, { nonEmpty: true });
  const goalIds = requireStringArray(sink, 'Exercise', id, 'goalIds', exercise.goalIds, { nonEmpty: true });
  const contraindicationFlags = requireStringArray(sink, 'Exercise', id, 'contraindicationFlags', exercise.contraindicationFlags);
  requireOneOf(sink, 'Exercise', id, 'minExperience', exercise.minExperience, EXPERIENCE_LEVELS);
  requireOneOf(sink, 'Exercise', id, 'intensity', exercise.intensity, WORKOUT_INTENSITIES);
  requireOneOf(sink, 'Exercise', id, 'impact', exercise.impact, IMPACT_LEVELS);
  optionalOneOf(sink, 'Exercise', id, 'setupType', exercise.setupType, SETUP_TYPES);
  optionalOneOf(sink, 'Exercise', id, 'technicalComplexity', exercise.technicalComplexity, TECHNICAL_COMPLEXITIES);
  optionalOneOf(sink, 'Exercise', id, 'loadability', exercise.loadability, LOADABILITIES);
  optionalOneOf(sink, 'Exercise', id, 'fatigueCost', exercise.fatigueCost, DEMAND_LEVELS);
  optionalOneOf(sink, 'Exercise', id, 'spineLoading', exercise.spineLoading, SPINE_LOADINGS);
  for (const field of ['kneeDemand', 'hipDemand', 'shoulderDemand', 'wristDemand', 'ankleDemand', 'balanceDemand', 'cardioDemand']) {
    optionalOneOf(sink, 'Exercise', id, field, exercise[field], DEMAND_LEVELS);
  }
  if (exercise.planeOfMotion != null) {
    const planes = Array.isArray(exercise.planeOfMotion) ? exercise.planeOfMotion : [exercise.planeOfMotion];
    for (const plane of planes) optionalOneOf(sink, 'Exercise', id, 'planeOfMotion', plane, MOVEMENT_PLANES);
  }
  const setupInstructions = optionalStringArray(sink, 'Exercise', id, 'setupInstructions', exercise.setupInstructions);
  const executionInstructions = optionalStringArray(sink, 'Exercise', id, 'executionInstructions', exercise.executionInstructions);
  const safetyNotes = optionalStringArray(sink, 'Exercise', id, 'safetyNotes', exercise.safetyNotes);
  validateExerciseMedia(sink, id, exercise.media);
  optionalStringArray(sink, 'Exercise', id, 'breathingInstructions', exercise.breathingInstructions);
  optionalStringArray(sink, 'Exercise', id, 'spaceRequired', exercise.spaceRequired)
    .forEach((space) => requireOneOf(sink, 'Exercise', id, 'spaceRequired', space, SPACE_REQUIREMENTS));
  optionalStringArray(sink, 'Exercise', id, 'subPatternIds', exercise.subPatternIds);
  const jointsInvolved = optionalStringArray(sink, 'Exercise', id, 'jointsInvolved', exercise.jointsInvolved);
  optionalStringArray(sink, 'Exercise', id, 'coachingCueIds', exercise.coachingCueIds);
  optionalStringArray(sink, 'Exercise', id, 'commonMistakeIds', exercise.commonMistakeIds);
  const regressionExerciseIds = optionalStringArray(sink, 'Exercise', id, 'regressionExerciseIds', exercise.regressionExerciseIds);
  const progressionExerciseIds = optionalStringArray(sink, 'Exercise', id, 'progressionExerciseIds', exercise.progressionExerciseIds);
  const substitutionExerciseIds = optionalStringArray(sink, 'Exercise', id, 'substitutionExerciseIds', exercise.substitutionExerciseIds);
  requireText(sink, 'Exercise', id, 'defaultPrescriptionTemplateId', exercise.defaultPrescriptionTemplateId);

  const hasEquipmentPath = equipmentIds.length > 0 || equipmentRequiredIds.length > 0 || equipmentOptionalIds.length > 0;
  if (!hasEquipmentPath) {
    addIssue(sink, 'Exercise', id, 'equipmentIds', 'Exercise must have at least one equipment compatibility path.', 'Add bodyweight, required, or optional equipment IDs.');
  }
  if (primaryMuscleIds.length === 0 && jointsInvolved.length === 0 && contraindicationFlags.includes('system_target') === false) {
    addIssue(sink, 'Exercise', id, 'primaryMuscleIds', 'Exercise must have at least one muscle or system target.', 'Add primaryMuscleIds for strength work or a clear system target for cardio/recovery work.');
  }
  if (setupInstructions.length === 0) {
    addIssue(sink, 'Exercise', id, 'setupInstructions', 'Exercise needs setup instructions.', 'Add concise setupInstructions.');
  }
  if (executionInstructions.length === 0) {
    addIssue(sink, 'Exercise', id, 'executionInstructions', 'Exercise needs execution instructions.', 'Add concise executionInstructions.');
  }
  if (safetyNotes.length === 0) {
    addIssue(sink, 'Exercise', id, 'safetyNotes', 'Exercise needs safety notes.', 'Add at least one safety note.');
  }
  if (!isRecord(exercise.defaultPrescriptionRanges) || Object.keys(exercise.defaultPrescriptionRanges).length === 0) {
    addIssue(sink, 'Exercise', id, 'defaultPrescriptionRanges', 'Exercise needs default prescription ranges.', 'Add ranges for sets, reps, duration, effort, or modality-specific tracking.');
  }

  if (refs) {
    requireKnownIds(sink, 'Exercise', id, 'movementPatternIds', movementPatternIds, refs.movementPatternIds, 'movement_patterns');
    requireKnownIds(sink, 'Exercise', id, 'primaryMuscleIds', primaryMuscleIds, refs.muscleGroupIds, 'muscle_groups');
    requireKnownIds(sink, 'Exercise', id, 'secondaryMuscleIds', secondaryMuscleIds, refs.muscleGroupIds, 'muscle_groups');
    requireKnownIds(sink, 'Exercise', id, 'equipmentIds', equipmentIds, refs.equipmentTypeIds, 'equipment_types');
    requireKnownIds(sink, 'Exercise', id, 'equipmentRequiredIds', equipmentRequiredIds, refs.equipmentTypeIds, 'equipment_types');
    requireKnownIds(sink, 'Exercise', id, 'equipmentOptionalIds', equipmentOptionalIds, refs.equipmentTypeIds, 'equipment_types');
    requireKnownIds(sink, 'Exercise', id, 'workoutTypeIds', workoutTypeIds, refs.workoutTypeIds, 'workout_types');
    requireKnownIds(sink, 'Exercise', id, 'goalIds', goalIds, refs.goalIds, 'training_goals');
    requireKnownIds(sink, 'Exercise', id, 'trackingMetricIds', trackingMetricIds, refs.trackingMetricIds, 'tracking_metrics');
    requireKnownIds(sink, 'Exercise', id, 'regressionExerciseIds', regressionExerciseIds, refs.exerciseIds, 'programming_exercises');
    requireKnownIds(sink, 'Exercise', id, 'progressionExerciseIds', progressionExerciseIds, refs.exerciseIds, 'programming_exercises');
    requireKnownIds(sink, 'Exercise', id, 'substitutionExerciseIds', substitutionExerciseIds, refs.exerciseIds, 'programming_exercises');
    if (hasText(exercise.defaultPrescriptionTemplateId) && !refs.prescriptionTemplateIds.has(exercise.defaultPrescriptionTemplateId)) {
      addIssue(sink, 'Exercise', id, 'defaultPrescriptionTemplateId', `Unknown prescription template ${exercise.defaultPrescriptionTemplateId}.`, 'Use an existing prescription template ID.');
    }
  }
}

export function validatePrescriptionTemplateRecord(template: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validatePrescriptionTemplateInto(sink, template, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validatePrescriptionTemplateInto(sink: IssueSink, template: unknown, refs?: CatalogRefs): void {
  const id = idOf(template);
  if (!isRecord(template)) {
    addIssue(sink, 'PrescriptionTemplate', id, '$record', 'PrescriptionTemplate must be an object.', 'Store each prescription template as a structured object.');
    return;
  }
  requireText(sink, 'PrescriptionTemplate', id, 'id', template.id);
  requireText(sink, 'PrescriptionTemplate', id, 'label', template.label);
  requireOneOf(sink, 'PrescriptionTemplate', id, 'kind', template.kind, PRESCRIPTION_KINDS);
  validatePayload(sink, 'PrescriptionTemplate', id, 'payload', template.payload, template.kind as PrescriptionKind);
  const workoutTypeIds = requireStringArray(sink, 'PrescriptionTemplate', id, 'appliesToWorkoutTypeIds', template.appliesToWorkoutTypeIds, { nonEmpty: true });
  const goalIds = optionalStringArray(sink, 'PrescriptionTemplate', id, 'appliesToGoalIds', template.appliesToGoalIds);
  optionalStringArray(sink, 'PrescriptionTemplate', id, 'appliesToExerciseCategory', template.appliesToExerciseCategory)
    .forEach((category) => requireOneOf(sink, 'PrescriptionTemplate', id, 'appliesToExerciseCategory', category, EXERCISE_CATEGORIES));
  if (template.defaultSets != null) requireNumber(sink, 'PrescriptionTemplate', id, 'defaultSets', template.defaultSets, { min: 1, integer: true });
  if (template.defaultDurationSeconds != null) requireNumber(sink, 'PrescriptionTemplate', id, 'defaultDurationSeconds', template.defaultDurationSeconds, { min: 1, integer: true });
  if (template.defaultDurationMinutes != null) requireNumber(sink, 'PrescriptionTemplate', id, 'defaultDurationMinutes', template.defaultDurationMinutes, { min: 1, integer: true });
  requireNumber(sink, 'PrescriptionTemplate', id, 'defaultRpe', template.defaultRpe, { min: 1 });
  requireNumber(sink, 'PrescriptionTemplate', id, 'restSeconds', template.restSeconds, { min: 0, integer: true });
  requireText(sink, 'PrescriptionTemplate', id, 'intensityCue', template.intensityCue);
  optionalOneOf(sink, 'PrescriptionTemplate', id, 'intensityModel', template.intensityModel, INTENSITY_MODELS);
  optionalOneOf(sink, 'PrescriptionTemplate', id, 'volumeModel', template.volumeModel, VOLUME_MODELS);
  optionalOneOf(sink, 'PrescriptionTemplate', id, 'restModel', template.restModel, REST_MODELS);
  optionalStringArray(sink, 'PrescriptionTemplate', id, 'progressionRuleIds', template.progressionRuleIds);
  optionalStringArray(sink, 'PrescriptionTemplate', id, 'regressionRuleIds', template.regressionRuleIds);
  optionalStringArray(sink, 'PrescriptionTemplate', id, 'deloadRuleIds', template.deloadRuleIds);
  optionalStringArray(sink, 'PrescriptionTemplate', id, 'successCriteria', template.successCriteria);
  optionalStringArray(sink, 'PrescriptionTemplate', id, 'coachNotes', template.coachNotes);
  if (refs) {
    requireKnownIds(sink, 'PrescriptionTemplate', id, 'appliesToWorkoutTypeIds', workoutTypeIds, refs.workoutTypeIds, 'workout_types');
    requireKnownIds(sink, 'PrescriptionTemplate', id, 'appliesToGoalIds', goalIds, refs.goalIds, 'training_goals');
  }
}

export function validateSessionTemplateBlockRecord(block: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validateSessionTemplateBlockInto(sink, block, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validateSessionTemplateBlockInto(sink: IssueSink, block: unknown, refs?: CatalogRefs): void {
  const id = idOf(block);
  if (!isRecord(block)) {
    addIssue(sink, 'SessionTemplateBlock', id, '$record', 'SessionTemplateBlock must be an object.', 'Store each block as a structured object.');
    return;
  }
  requireText(sink, 'SessionTemplateBlock', id, 'id', block.id);
  requireOneOf(sink, 'SessionTemplateBlock', id, 'kind', block.kind, BLOCK_KINDS);
  requireText(sink, 'SessionTemplateBlock', id, 'title', block.title);
  requireNumber(sink, 'SessionTemplateBlock', id, 'durationMinutes', block.durationMinutes, { min: 1, integer: true });
  requireText(sink, 'SessionTemplateBlock', id, 'prescriptionTemplateId', block.prescriptionTemplateId);
  if (refs && hasText(block.prescriptionTemplateId) && !refs.prescriptionTemplateIds.has(block.prescriptionTemplateId)) {
    addIssue(sink, 'SessionTemplateBlock', id, 'prescriptionTemplateId', `Unknown prescription template ${block.prescriptionTemplateId}.`, 'Use an existing prescription template ID.');
  }
}

export function validateSessionTemplateMovementSlotRecord(slot: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validateSessionTemplateMovementSlotInto(sink, slot, catalog ? createCatalogRefs(catalog) : undefined, undefined);
  return resultFromIssues(sink.issues);
}

function validateSessionTemplateMovementSlotInto(
  sink: IssueSink,
  slot: unknown,
  refs: CatalogRefs | undefined,
  blockIds: Set<string> | undefined,
): void {
  const id = idOf(slot);
  if (!isRecord(slot)) {
    addIssue(sink, 'SessionTemplateMovementSlot', id, '$record', 'SessionTemplateMovementSlot must be an object.', 'Store each movement slot as a structured object.');
    return;
  }
  requireText(sink, 'SessionTemplateMovementSlot', id, 'id', slot.id);
  requireText(sink, 'SessionTemplateMovementSlot', id, 'blockId', slot.blockId);
  const movementPatternIds = requireStringArray(sink, 'SessionTemplateMovementSlot', id, 'movementPatternIds', slot.movementPatternIds, { nonEmpty: true });
  requireBoolean(sink, 'SessionTemplateMovementSlot', id, 'optional', slot.optional);
  requireNumber(sink, 'SessionTemplateMovementSlot', id, 'order', slot.order, { min: 0, integer: true });
  const preferredExerciseIds = optionalStringArray(sink, 'SessionTemplateMovementSlot', id, 'preferredExerciseIds', slot.preferredExerciseIds);
  const avoidExerciseIds = optionalStringArray(sink, 'SessionTemplateMovementSlot', id, 'avoidExerciseIds', slot.avoidExerciseIds);
  if (blockIds && hasText(slot.blockId) && !blockIds.has(slot.blockId)) {
    addIssue(sink, 'SessionTemplateMovementSlot', id, 'blockId', `Unknown block ${slot.blockId}.`, 'Point the movement slot at a block in the same session template.');
  }
  if (refs) {
    requireKnownIds(sink, 'SessionTemplateMovementSlot', id, 'movementPatternIds', movementPatternIds, refs.movementPatternIds, 'movement_patterns');
    requireKnownIds(sink, 'SessionTemplateMovementSlot', id, 'preferredExerciseIds', preferredExerciseIds, refs.exerciseIds, 'programming_exercises');
    requireKnownIds(sink, 'SessionTemplateMovementSlot', id, 'avoidExerciseIds', avoidExerciseIds, refs.exerciseIds, 'programming_exercises');
  }
}

export function validateSessionTemplateRecord(template: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validateSessionTemplateInto(sink, template, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validateSessionTemplateInto(sink: IssueSink, template: unknown, refs?: CatalogRefs): void {
  const id = idOf(template);
  if (!isRecord(template)) {
    addIssue(sink, 'SessionTemplate', id, '$record', 'SessionTemplate must be an object.', 'Store each session template as a structured object.');
    return;
  }
  requireText(sink, 'SessionTemplate', id, 'id', template.id);
  requireText(sink, 'SessionTemplate', id, 'label', template.label);
  requireText(sink, 'SessionTemplate', id, 'summary', template.summary);
  requireText(sink, 'SessionTemplate', id, 'workoutTypeId', template.workoutTypeId);
  const goalIds = requireStringArray(sink, 'SessionTemplate', id, 'goalIds', template.goalIds, { nonEmpty: true });
  requireText(sink, 'SessionTemplate', id, 'formatId', template.formatId);
  requireNumber(sink, 'SessionTemplate', id, 'minDurationMinutes', template.minDurationMinutes, { min: 1, integer: true });
  requireNumber(sink, 'SessionTemplate', id, 'defaultDurationMinutes', template.defaultDurationMinutes, { min: 1, integer: true });
  requireNumber(sink, 'SessionTemplate', id, 'maxDurationMinutes', template.maxDurationMinutes, { min: 1, integer: true });
  requireStringArray(sink, 'SessionTemplate', id, 'experienceLevels', template.experienceLevels, { nonEmpty: true })
    .forEach((level) => requireOneOf(sink, 'SessionTemplate', id, 'experienceLevels', level, EXPERIENCE_LEVELS));
  requireStringArray(sink, 'SessionTemplate', id, 'successCriteria', template.successCriteria, { nonEmpty: true });
  const blocks = requireArray(sink, 'SessionTemplate', id, 'blocks', template.blocks, { nonEmpty: true });
  const movementSlots = requireArray(sink, 'SessionTemplate', id, 'movementSlots', template.movementSlots, { nonEmpty: true });
  const blockIds = new Set<string>();
  for (const block of blocks) {
    if (isRecord(block) && hasText(block.id)) blockIds.add(block.id);
    validateSessionTemplateBlockInto(sink, block, refs);
  }
  for (const slot of movementSlots) {
    validateSessionTemplateMovementSlotInto(sink, slot, refs, blockIds);
  }
  const blockKinds = new Set(blocks.filter(isRecord).map((block) => block.kind));
  for (const requiredKind of BLOCK_KINDS) {
    if (!blockKinds.has(requiredKind)) {
      addIssue(sink, 'SessionTemplate', id, 'blocks', `Session template is missing ${requiredKind} block.`, `Add a ${requiredKind} block or mark this template as non-production.`);
    }
  }
  if (refs) {
    if (hasText(template.workoutTypeId) && !refs.workoutTypeIds.has(template.workoutTypeId)) {
      addIssue(sink, 'SessionTemplate', id, 'workoutTypeId', `Unknown workout type ${template.workoutTypeId}.`, 'Use an existing workout type ID.');
    }
    if (hasText(template.formatId) && !refs.formatIds.has(template.formatId)) {
      addIssue(sink, 'SessionTemplate', id, 'formatId', `Unknown workout format ${template.formatId}.`, 'Use an existing workout format ID.');
    }
    requireKnownIds(sink, 'SessionTemplate', id, 'goalIds', goalIds, refs.goalIds, 'training_goals');
  }
}

export function validateDescriptionTemplateRecord(template: unknown): RuntimeValidationResult {
  const sink = createSink();
  validateDescriptionTemplateInto(sink, template);
  return resultFromIssues(sink.issues);
}

function validateDescriptionTemplateInto(sink: IssueSink, template: unknown): void {
  const id = idOf(template);
  if (!isRecord(template)) {
    addIssue(sink, 'DescriptionTemplate', id, '$record', 'DescriptionTemplate must be an object.', 'Store each description template as a structured object.');
    return;
  }
  requireText(sink, 'DescriptionTemplate', id, 'id', template.id);
  requireText(sink, 'DescriptionTemplate', id, 'summaryTemplate', template.summaryTemplate);
  optionalOneOf(sink, 'DescriptionTemplate', id, 'appliesToEntityType', template.appliesToEntityType, DESCRIPTION_ENTITIES);
  optionalText(sink, 'DescriptionTemplate', id, 'appliesToEntityId', template.appliesToEntityId);
  optionalOneOf(sink, 'DescriptionTemplate', id, 'toneVariant', template.toneVariant, DESCRIPTION_TONES);
  for (const field of [
    'sessionIntent',
    'plainLanguageSummary',
    'coachExplanation',
    'effortExplanation',
    'whyThisMatters',
    'howItShouldFeel',
    'scalingDown',
    'scalingUp',
    'breathingFocus',
    'recoveryExpectation',
    'completionMessage',
    'nextSessionNote',
  ]) {
    requireText(sink, 'DescriptionTemplate', id, field, template[field]);
  }
  requireStringArray(sink, 'DescriptionTemplate', id, 'successCriteria', template.successCriteria, { nonEmpty: true });
  requireStringArray(sink, 'DescriptionTemplate', id, 'formFocus', template.formFocus, { nonEmpty: true });
  requireStringArray(sink, 'DescriptionTemplate', id, 'commonMistakes', template.commonMistakes, { nonEmpty: true });
  requireStringArray(sink, 'DescriptionTemplate', id, 'safetyNotes', template.safetyNotes, { nonEmpty: true });
}

export function validateValidationRuleRecord(rule: unknown): RuntimeValidationResult {
  const sink = createSink();
  validateValidationRuleInto(sink, rule);
  return resultFromIssues(sink.issues);
}

function validateValidationRuleInto(sink: IssueSink, rule: unknown): void {
  const id = idOf(rule);
  if (!isRecord(rule)) {
    addIssue(sink, 'ValidationRule', id, '$record', 'ValidationRule must be an object.', 'Store each validation rule as a structured object.');
    return;
  }
  requireText(sink, 'ValidationRule', id, 'id', rule.id);
  requireText(sink, 'ValidationRule', id, 'label', rule.label);
  requireOneOf(sink, 'ValidationRule', id, 'severity', rule.severity, ['warning', 'error'] as const);
  requireText(sink, 'ValidationRule', id, 'explanation', rule.explanation);
  optionalStringArray(sink, 'ValidationRule', id, 'appliesToWorkoutTypeIds', rule.appliesToWorkoutTypeIds);
  optionalStringArray(sink, 'ValidationRule', id, 'appliesToGoalIds', rule.appliesToGoalIds);
  if (rule.testCases != null) requireArray(sink, 'ValidationRule', id, 'testCases', rule.testCases);
}

export function validateSubstitutionRuleRecord(rule: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validateSubstitutionRuleInto(sink, rule, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validateSubstitutionRuleInto(sink: IssueSink, rule: unknown, refs?: CatalogRefs): void {
  const id = idOf(rule);
  if (!isRecord(rule)) {
    addIssue(sink, 'SubstitutionRule', id, '$record', 'SubstitutionRule must be an object.', 'Store each substitution rule as a structured object.');
    return;
  }
  requireText(sink, 'SubstitutionRule', id, 'id', rule.id);
  requireText(sink, 'SubstitutionRule', id, 'sourceExerciseId', rule.sourceExerciseId);
  const acceptableReplacementIds = optionalStringArray(sink, 'SubstitutionRule', id, 'acceptableReplacementIds', rule.acceptableReplacementIds);
  const substituteExerciseIds = optionalStringArray(sink, 'SubstitutionRule', id, 'substituteExerciseIds', rule.substituteExerciseIds);
  const replacementPriority = optionalStringArray(sink, 'SubstitutionRule', id, 'replacementPriority', rule.replacementPriority);
  const replacements = [...acceptableReplacementIds, ...substituteExerciseIds, ...replacementPriority];
  if (replacements.length === 0) {
    addIssue(sink, 'SubstitutionRule', id, 'acceptableReplacementIds', 'Substitution rule needs replacement exercise IDs.', 'Add acceptableReplacementIds, substituteExerciseIds, or replacementPriority.');
  }
  if (!hasText(rule.reason) && !hasText(rule.rationale)) {
    addIssue(sink, 'SubstitutionRule', id, 'reason', 'Substitution rule needs a reason or rationale.', 'Add a clear reason explaining why the substitution is safe.');
  }
  optionalStringArray(sink, 'SubstitutionRule', id, 'sourceMovementPatternIds', rule.sourceMovementPatternIds);
  optionalStringArray(sink, 'SubstitutionRule', id, 'requiredEquipmentIds', rule.requiredEquipmentIds);
  optionalStringArray(sink, 'SubstitutionRule', id, 'excludedEquipmentIds', rule.excludedEquipmentIds);
  optionalStringArray(sink, 'SubstitutionRule', id, 'supportedSafetyFlags', rule.supportedSafetyFlags);
  optionalStringArray(sink, 'SubstitutionRule', id, 'excludedSafetyFlags', rule.excludedSafetyFlags);
  optionalOneOf(sink, 'SubstitutionRule', id, 'skillLevelMatch', rule.skillLevelMatch, SUBSTITUTION_SKILL_MATCHES);
  optionalOneOf(sink, 'SubstitutionRule', id, 'goalMatch', rule.goalMatch, SUBSTITUTION_GOAL_MATCHES);
  if (refs) {
    if (hasText(rule.sourceExerciseId) && !refs.exerciseIds.has(rule.sourceExerciseId)) {
      addIssue(sink, 'SubstitutionRule', id, 'sourceExerciseId', `Unknown exercise ${rule.sourceExerciseId}.`, 'Use an existing source exercise ID.');
    }
    requireKnownIds(sink, 'SubstitutionRule', id, 'replacementIds', replacements, refs.exerciseIds, 'programming_exercises');
  }
}

export function validateProgressionRuleRecord(rule: unknown): RuntimeValidationResult {
  const sink = createSink();
  validateWorkoutRuleInto(sink, rule, 'ProgressionRule', 'progression');
  return resultFromIssues(sink.issues);
}

export function validateRegressionRuleRecord(rule: unknown): RuntimeValidationResult {
  const sink = createSink();
  validateWorkoutRuleInto(sink, rule, 'RegressionRule', 'regression');
  return resultFromIssues(sink.issues);
}

export function validateDeloadRuleRecord(rule: unknown): RuntimeValidationResult {
  const sink = createSink();
  validateWorkoutRuleInto(sink, rule, 'DeloadRule', 'deload');
  return resultFromIssues(sink.issues);
}

function validateRuleCondition(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (!isRecord(value)) {
    addIssue(sink, recordType, id, field, `${field} must be a rule condition object.`, `Store ${field} as a structured condition object.`);
    return;
  }
  optionalText(sink, recordType, id, `${field}.metricId`, value.metricId);
  optionalOneOf(sink, recordType, id, `${field}.operator`, value.operator, RULE_OPERATORS);
  if (value.windowDays != null) requireNumber(sink, recordType, id, `${field}.windowDays`, value.windowDays, { min: 1, integer: true });
}

function validateRuleAction(
  sink: IssueSink,
  recordType: RuntimeValidationRecordType,
  id: string | undefined,
  field: string,
  value: unknown,
): void {
  if (value == null) return;
  if (!isRecord(value)) {
    addIssue(sink, recordType, id, field, `${field} must be a rule action object.`, `Store ${field} as a structured action object.`);
    return;
  }
  optionalOneOf(sink, recordType, id, `${field}.kind`, value.kind, RULE_ACTION_KINDS);
  if (value.amount != null) requireNumber(sink, recordType, id, `${field}.amount`, value.amount);
  optionalText(sink, recordType, id, `${field}.explanation`, value.explanation);
}

function validateWorkoutRuleInto(
  sink: IssueSink,
  rule: unknown,
  recordType: 'ProgressionRule' | 'RegressionRule' | 'DeloadRule',
  expectedRuleType: WorkoutRule['ruleType'],
): void {
  const id = idOf(rule);
  if (!isRecord(rule)) {
    addIssue(sink, recordType, id, '$record', `${recordType} must be an object.`, `Store each ${recordType} as a structured object.`);
    return;
  }
  requireText(sink, recordType, id, 'id', rule.id);
  requireText(sink, recordType, id, 'label', rule.label);
  optionalOneOf(sink, recordType, id, 'ruleType', rule.ruleType, RULE_TYPES);
  if (rule.ruleType != null && rule.ruleType !== expectedRuleType) {
    addIssue(sink, recordType, id, 'ruleType', `${recordType} must have ruleType ${expectedRuleType}.`, `Set ruleType to ${expectedRuleType}.`);
  }
  requireStringArray(sink, recordType, id, 'appliesToGoalIds', rule.appliesToGoalIds, { nonEmpty: true });
  optionalStringArray(sink, recordType, id, 'appliesToWorkoutTypeIds', rule.appliesToWorkoutTypeIds);
  optionalStringArray(sink, recordType, id, 'appliesToExperienceLevels', rule.appliesToExperienceLevels)
    .forEach((level) => requireOneOf(sink, recordType, id, 'appliesToExperienceLevels', level, EXPERIENCE_LEVELS));
  requireText(sink, recordType, id, 'trigger', rule.trigger);
  requireText(sink, recordType, id, 'action', rule.action);
  requireText(sink, recordType, id, 'explanation', rule.explanation);
  const triggerConditions = optionalArray(rule.triggerConditions);
  if (triggerConditions.length === 0) {
    addIssue(sink, recordType, id, 'triggerConditions', `${recordType} needs structured trigger conditions.`, 'Add triggerConditions so the decision engine can evaluate this rule.');
  }
  triggerConditions.forEach((condition, index) => validateRuleCondition(sink, recordType, id, `triggerConditions.${index}`, condition));
  for (const [field, value] of [['advanceWhen', rule.advanceWhen], ['regressWhen', rule.regressWhen], ['deloadTrigger', rule.deloadTrigger]] as const) {
    optionalArray(value).forEach((condition, index) => validateRuleCondition(sink, recordType, id, `${field}.${index}`, condition));
  }
  validateRuleAction(sink, recordType, id, 'progressionAction', rule.progressionAction);
  validateRuleAction(sink, recordType, id, 'regressionAction', rule.regressionAction);
  if (rule.maxProgressionRate != null) validateNumericRange(sink, recordType, id, 'maxProgressionRate', rule.maxProgressionRate);
  optionalStringArray(sink, recordType, id, 'requiredTrackingMetricIds', rule.requiredTrackingMetricIds);
  requireText(sink, recordType, id, 'userMessage', rule.userMessage);
  requireStringArray(sink, recordType, id, 'coachNotes', rule.coachNotes, { nonEmpty: true });
}

function optionalArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function validateGeneratedExercisePrescriptionRecord(
  exercise: unknown,
  catalog?: WorkoutProgrammingCatalog,
): RuntimeValidationResult {
  const sink = createSink();
  validateGeneratedExerciseInto(sink, exercise, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validateGeneratedExerciseInto(
  sink: IssueSink,
  exercise: unknown,
  refs?: CatalogRefs,
  expectedBlockId?: string,
): void {
  const id = idOf(exercise);
  if (!isRecord(exercise)) {
    addIssue(sink, 'GeneratedExercisePrescription', id, '$record', 'Generated exercise prescription must be an object.', 'Store generated exercises as structured objects.');
    return;
  }
  requireText(sink, 'GeneratedExercisePrescription', id, 'exerciseId', exercise.exerciseId);
  requireText(sink, 'GeneratedExercisePrescription', id, 'name', exercise.name);
  requireText(sink, 'GeneratedExercisePrescription', id, 'blockId', exercise.blockId);
  if (expectedBlockId && exercise.blockId !== expectedBlockId) {
    addIssue(sink, 'GeneratedExercisePrescription', id, 'blockId', `Exercise blockId must match parent block ${expectedBlockId}.`, 'Set exercise.blockId to the containing block ID.');
  }
  const movementPatternIds = requireStringArray(sink, 'GeneratedExercisePrescription', id, 'movementPatternIds', exercise.movementPatternIds, { nonEmpty: true });
  const primaryMuscleIds = requireStringArray(sink, 'GeneratedExercisePrescription', id, 'primaryMuscleIds', exercise.primaryMuscleIds);
  const equipmentIds = requireStringArray(sink, 'GeneratedExercisePrescription', id, 'equipmentIds', exercise.equipmentIds);
  const trackingMetricIds = requireStringArray(sink, 'GeneratedExercisePrescription', id, 'trackingMetricIds', exercise.trackingMetricIds);
  requireText(sink, 'GeneratedExercisePrescription', id, 'explanation', exercise.explanation);
  if (!isRecord(exercise.prescription)) {
    addIssue(sink, 'GeneratedExercisePrescription', id, 'prescription', 'prescription must be an object.', 'Store a complete generated prescription object.');
  } else {
    const prescription = exercise.prescription;
    requireNumber(sink, 'GeneratedExercisePrescription', id, 'prescription.targetRpe', prescription.targetRpe, { min: 1 });
    requireNumber(sink, 'GeneratedExercisePrescription', id, 'prescription.restSeconds', prescription.restSeconds, { min: 0, integer: true });
    requireText(sink, 'GeneratedExercisePrescription', id, 'prescription.intensityCue', prescription.intensityCue);
    requireOneOf(sink, 'GeneratedExercisePrescription', id, 'prescription.kind', prescription.kind, PRESCRIPTION_KINDS);
    validateGeneratedPrescriptionPayload(sink, id, 'prescription.payload', prescription.payload, prescription.kind as PrescriptionKind);
    if (prescription.sets != null) requireNumber(sink, 'GeneratedExercisePrescription', id, 'prescription.sets', prescription.sets, { min: 1, integer: true });
    if (prescription.durationSeconds != null) requireNumber(sink, 'GeneratedExercisePrescription', id, 'prescription.durationSeconds', prescription.durationSeconds, { min: 1, integer: true });
    if (prescription.durationMinutes != null) requireNumber(sink, 'GeneratedExercisePrescription', id, 'prescription.durationMinutes', prescription.durationMinutes, { min: 1, integer: true });
  }
  if (refs) {
    if (hasText(exercise.exerciseId) && !refs.exerciseIds.has(exercise.exerciseId)) {
      addIssue(sink, 'GeneratedExercisePrescription', id, 'exerciseId', `Unknown exercise ${exercise.exerciseId}.`, 'Use an exercise ID from the validated catalog.');
    }
    requireKnownIds(sink, 'GeneratedExercisePrescription', id, 'movementPatternIds', movementPatternIds, refs.movementPatternIds, 'movement_patterns');
    requireKnownIds(sink, 'GeneratedExercisePrescription', id, 'primaryMuscleIds', primaryMuscleIds, refs.muscleGroupIds, 'muscle_groups');
    requireKnownIds(sink, 'GeneratedExercisePrescription', id, 'equipmentIds', equipmentIds, refs.equipmentTypeIds, 'equipment_types');
    requireKnownIds(sink, 'GeneratedExercisePrescription', id, 'trackingMetricIds', trackingMetricIds, refs.trackingMetricIds, 'tracking_metrics');
  }
}

export function validateGeneratedWorkoutBlockRecord(block: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validateGeneratedWorkoutBlockInto(sink, block, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validateGeneratedWorkoutBlockInto(sink: IssueSink, block: unknown, refs?: CatalogRefs): void {
  const id = idOf(block);
  if (!isRecord(block)) {
    addIssue(sink, 'GeneratedWorkoutBlock', id, '$record', 'Generated workout block must be an object.', 'Store generated blocks as structured objects.');
    return;
  }
  requireText(sink, 'GeneratedWorkoutBlock', id, 'id', block.id);
  requireOneOf(sink, 'GeneratedWorkoutBlock', id, 'kind', block.kind, BLOCK_KINDS);
  requireText(sink, 'GeneratedWorkoutBlock', id, 'title', block.title);
  requireNumber(sink, 'GeneratedWorkoutBlock', id, 'estimatedDurationMinutes', block.estimatedDurationMinutes, { min: 1, integer: true });
  const exercises = requireArray(sink, 'GeneratedWorkoutBlock', id, 'exercises', block.exercises);
  exercises.forEach((exercise) => validateGeneratedExerciseInto(sink, exercise, refs, hasText(block.id) ? block.id : undefined));
}

export function validateGeneratedWorkoutRuntime(workout: unknown, catalog?: WorkoutProgrammingCatalog): RuntimeValidationResult {
  const sink = createSink();
  validateGeneratedWorkoutInto(sink, workout, catalog ? createCatalogRefs(catalog) : undefined);
  return resultFromIssues(sink.issues);
}

function validateGeneratedWorkoutInto(sink: IssueSink, workout: unknown, refs?: CatalogRefs): void {
  const id = idOf(workout);
  if (!isRecord(workout)) {
    addIssue(sink, 'GeneratedWorkout', id, '$record', 'GeneratedWorkout must be an object.', 'Store generated workouts as structured objects.');
    return;
  }
  if (workout.schemaVersion !== 'generated-workout-v1') {
    addIssue(sink, 'GeneratedWorkout', id, 'schemaVersion', 'Generated workout schemaVersion is invalid.', 'Use schemaVersion generated-workout-v1.');
  }
  requireText(sink, 'GeneratedWorkout', id, 'workoutTypeId', workout.workoutTypeId);
  requireText(sink, 'GeneratedWorkout', id, 'goalId', workout.goalId);
  requireText(sink, 'GeneratedWorkout', id, 'templateId', workout.templateId);
  requireText(sink, 'GeneratedWorkout', id, 'formatId', workout.formatId);
  optionalOneOf(sink, 'GeneratedWorkout', id, 'experienceLevel', workout.experienceLevel, EXPERIENCE_LEVELS);
  requireNumber(sink, 'GeneratedWorkout', id, 'requestedDurationMinutes', workout.requestedDurationMinutes, { min: 1, integer: true });
  requireNumber(sink, 'GeneratedWorkout', id, 'estimatedDurationMinutes', workout.estimatedDurationMinutes, { min: 1, integer: true });
  requireStringArray(sink, 'GeneratedWorkout', id, 'equipmentIds', workout.equipmentIds, { nonEmpty: true });
  requireStringArray(sink, 'GeneratedWorkout', id, 'safetyFlags', workout.safetyFlags);
  const trackingMetricIds = requireStringArray(sink, 'GeneratedWorkout', id, 'trackingMetricIds', workout.trackingMetricIds);
  requireStringArray(sink, 'GeneratedWorkout', id, 'successCriteria', workout.successCriteria);
  requireStringArray(sink, 'GeneratedWorkout', id, 'explanations', workout.explanations);
  const blocks = requireArray(sink, 'GeneratedWorkout', id, 'blocks', workout.blocks, { nonEmpty: true });
  blocks.forEach((block) => validateGeneratedWorkoutBlockInto(sink, block, refs));
  const blockKinds = new Set(blocks.filter(isRecord).map((block) => block.kind));
  for (const requiredKind of BLOCK_KINDS) {
    if (!blockKinds.has(requiredKind)) {
      addIssue(sink, 'GeneratedWorkout', id, 'blocks', `Generated workout is missing ${requiredKind} block.`, `Add a ${requiredKind} block before returning the workout.`);
    }
  }
  if (refs) {
    if (hasText(workout.workoutTypeId) && !refs.workoutTypeIds.has(workout.workoutTypeId)) {
      addIssue(sink, 'GeneratedWorkout', id, 'workoutTypeId', `Unknown workout type ${workout.workoutTypeId}.`, 'Use a workout type from the validated catalog.');
    }
    if (hasText(workout.goalId) && !refs.goalIds.has(workout.goalId)) {
      addIssue(sink, 'GeneratedWorkout', id, 'goalId', `Unknown goal ${workout.goalId}.`, 'Use a goal from the validated catalog.');
    }
    if (hasText(workout.templateId) && !refs.sessionTemplateIds.has(workout.templateId)) {
      addIssue(sink, 'GeneratedWorkout', id, 'templateId', `Unknown session template ${workout.templateId}.`, 'Use a session template from the validated catalog.');
    }
    if (hasText(workout.formatId) && !refs.formatIds.has(workout.formatId)) {
      addIssue(sink, 'GeneratedWorkout', id, 'formatId', `Unknown workout format ${workout.formatId}.`, 'Use a workout format from the validated catalog.');
    }
    requireKnownIds(sink, 'GeneratedWorkout', id, 'trackingMetricIds', trackingMetricIds, refs.trackingMetricIds, 'tracking_metrics');
  }
}

export function validateWorkoutProgrammingCatalogRuntime(catalog: unknown): RuntimeValidationResult {
  const sink = createSink();
  if (!isRecord(catalog)) {
    addIssue(sink, 'WorkoutProgrammingCatalog', undefined, '$record', 'WorkoutProgrammingCatalog must be an object.', 'Return a structured catalog object before entering the generator.');
    return resultFromIssues(sink.issues);
  }

  const catalogRecord = catalog as unknown as WorkoutProgrammingCatalog;
  for (const [field, recordType] of [
    ['workoutTypes', 'WorkoutProgrammingCatalog'],
    ['trainingGoals', 'WorkoutProgrammingCatalog'],
    ['workoutFormats', 'WorkoutProgrammingCatalog'],
    ['movementPatterns', 'WorkoutProgrammingCatalog'],
    ['muscleGroups', 'WorkoutProgrammingCatalog'],
    ['equipmentTypes', 'WorkoutProgrammingCatalog'],
    ['exercises', 'WorkoutProgrammingCatalog'],
    ['prescriptionTemplates', 'WorkoutProgrammingCatalog'],
    ['sessionTemplates', 'WorkoutProgrammingCatalog'],
    ['trackingMetrics', 'WorkoutProgrammingCatalog'],
    ['assessmentMetrics', 'WorkoutProgrammingCatalog'],
  ] as const) {
    requireArray(sink, recordType, undefined, field, catalog[field], { nonEmpty: field !== 'assessmentMetrics' });
  }

  for (const [index, item] of optionalArray(catalog.workoutTypes).entries()) validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);
  for (const [index, item] of optionalArray(catalog.trainingGoals).entries()) validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);
  for (const [index, item] of optionalArray(catalog.workoutFormats).entries()) validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);
  for (const [index, item] of optionalArray(catalog.movementPatterns).entries()) validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);
  for (const [index, item] of optionalArray(catalog.trackingMetrics).entries()) validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);
  for (const [index, item] of optionalArray(catalog.assessmentMetrics).entries()) validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);

  optionalArray(catalog.muscleGroups).forEach((item, index) => {
    validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);
    if (isRecord(item)) requireOneOf(sink, 'WorkoutProgrammingCatalog', idOf(item), 'muscleGroups.region', item.region, MUSCLE_REGIONS);
  });
  optionalArray(catalog.equipmentTypes).forEach((item, index) => {
    validateTaxonomyItem(sink, 'WorkoutProgrammingCatalog', item, index);
    if (isRecord(item)) requireOneOf(sink, 'WorkoutProgrammingCatalog', idOf(item), 'equipmentTypes.category', item.category, EQUIPMENT_CATEGORIES);
  });

  if (!Array.isArray(catalog.exercises) || !Array.isArray(catalog.prescriptionTemplates) || !Array.isArray(catalog.sessionTemplates)) {
    return resultFromIssues(sink.issues);
  }

  const refs = createCatalogRefs(catalogRecord);
  for (const exercise of catalogRecord.exercises) validateExerciseInto(sink, exercise, refs);
  for (const template of catalogRecord.prescriptionTemplates) validatePrescriptionTemplateInto(sink, template, refs);
  for (const template of catalogRecord.sessionTemplates) validateSessionTemplateInto(sink, template, refs);

  return resultFromIssues(sink.issues);
}

export function assertValidWorkoutProgrammingCatalog(catalog: unknown, context = 'Workout programming catalog'): asserts catalog is WorkoutProgrammingCatalog {
  const validation = validateWorkoutProgrammingCatalogRuntime(catalog);
  if (!validation.valid) {
    throw new WorkoutProgrammingCatalogValidationError(`${context} failed runtime validation.`, validation.errors);
  }
}

export function assertValidGeneratedWorkout(workout: unknown, catalog?: WorkoutProgrammingCatalog, context = 'Generated workout'): asserts workout is GeneratedWorkout {
  const validation = validateGeneratedWorkoutRuntime(workout, catalog);
  if (!validation.valid) {
    throw new WorkoutProgrammingCatalogValidationError(`${context} failed runtime validation.`, validation.errors);
  }
}

export function formatRuntimeValidationIssues(issues: RuntimeValidationIssue[]): string {
  return issues.map((issue) => {
    const id = issue.id ? ` ${issue.id}` : '';
    return `${issue.severity.toUpperCase()} ${issue.recordType}${id}.${issue.field}: ${issue.message} Correction: ${issue.suggestedCorrection}`;
  }).join('\n');
}
