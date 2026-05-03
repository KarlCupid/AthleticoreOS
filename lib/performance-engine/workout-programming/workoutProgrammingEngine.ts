import {
  workoutProgrammingCatalog,
} from './seedData.ts';
import { rankExerciseSubstitutions } from './substitutionEngine.ts';
import { createWorkoutValidationResult, validateWorkoutDomain } from './validationEngine.ts';
import { generateWorkoutDescription } from './workoutDescriptionService.ts';
import type {
  Exercise,
  ExerciseSelectionScoreTrace,
  ExerciseQuery,
  GenerateSingleWorkoutInput,
  GeneratedExercisePrescription,
  GeneratedWorkout,
  GeneratedWorkoutBlock,
  WorkoutDecisionTraceEntry,
  PrescriptionPayload,
  PrescriptionTemplate,
  SessionTemplate,
  SessionTemplateBlock,
  SessionTemplateMovementSlot,
  WorkoutExperienceLevel,
  WorkoutProgrammingCatalog,
  WorkoutValidationResult,
} from './types.ts';

const EXPERIENCE_RANK: Record<WorkoutExperienceLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const GOAL_TO_WORKOUT_TYPE: Record<string, string> = {
  beginner_strength: 'strength',
  hypertrophy: 'hypertrophy',
  zone2_cardio: 'zone2_cardio',
  mobility: 'mobility',
  recovery: 'recovery',
  limited_equipment: 'strength',
  no_equipment: 'bodyweight_strength',
  full_gym_strength: 'full_body_strength',
  dumbbell_hypertrophy: 'hypertrophy',
  low_impact_conditioning: 'low_impact_conditioning',
  core_durability: 'core_durability',
  upper_body_strength: 'upper_strength',
  lower_body_strength: 'lower_strength',
  boxing_support: 'boxing_support',
  return_to_training: 'recovery',
};

const SEVERE_SAFETY_FLAGS = new Set([
  'red_flag_symptoms',
  'acute_chest_pain',
  'fainting',
  'severe_dizziness',
  'acute_neurological_symptoms',
]);

const LOAD_EQUIPMENT_IDS = new Set([
  'dumbbells',
  'kettlebell',
  'barbell',
  'cable_machine',
  'resistance_band',
  'medicine_ball',
  'sled',
  'battle_rope',
  'leg_press',
  'lat_pulldown',
  'assault_bike',
  'rowing_machine',
  'stationary_bike',
  'treadmill',
  'jump_rope',
  'trx',
  'pull_up_bar',
]);

const OPTIONAL_EQUIPMENT_IDS = new Set(['bodyweight', 'mat', 'open_space', 'track_or_road']);

const DEMAND_RANK = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  axial: 3,
  shear: 3,
  light: 1,
  heavy: 3,
  maximal: 4,
  variable: 2,
} as const;

const IMPACT_RANK: Record<Exercise['impact'], number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

const RECOVERY_REQUIRED_FLAGS = new Set([
  'poor_readiness',
  'illness_caution',
  'under_fueled',
  'post_competition_recovery',
]);

const CONSERVATIVE_VOLUME_FLAGS = new Set([
  'poor_readiness',
  'unknown_readiness',
  'high_fatigue',
  'high_soreness',
  'pain_increased_last_session',
]);

const CONSERVATIVE_INTENSITY_FLAGS = new Set([
  'poor_readiness',
  'unknown_readiness',
  'high_fatigue',
  'low_energy',
  'poor_sleep',
  'high_soreness',
  'pain_increased_last_session',
]);

export const EXERCISE_SELECTION_SCORE_WEIGHTS = {
  movementPatternPerMatch: 45,
  fallbackPatternPenalty: -25,
  slotPreferredExercise: 25,
  goalMatch: 28,
  workoutTypeMatch: 30,
  templateWorkoutTypeMatch: 12,
  equipmentMatch: 14,
  experienceMatch: 14,
  beginnerFriendly: 8,
  preferredExercise: 10,
  dislikedExerciseHardExclude: -1000,
  environmentFit: 5,
  experienceMismatchHardExclude: -1000,
  recoveryIntensityPenalty: -8,
  normalIntensityPenalty: -2,
  readinessFatiguePenalty: -10,
  normalFatiguePenalty: -2,
  beginnerHighComplexityPenalty: -28,
  highComplexityPenalty: -6,
  jointDemandPenalty: -14,
  lowImpactPenalty: -10,
  strengthLoadability: 4,
  recoveryFit: 12,
} as const;

let traceCounter = 0;

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function intersects(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (!a?.length || !b?.length) return false;
  const bSet = new Set(b);
  return a.some((item) => bSet.has(item));
}

function overlapCount(a: readonly string[] | undefined, b: readonly string[] | undefined): number {
  if (!a?.length || !b?.length) return 0;
  const bSet = new Set(b);
  return a.filter((item) => bSet.has(item)).length;
}

function equipmentCompatible(exercise: Exercise, availableEquipmentIds: readonly string[]): boolean {
  const available = new Set(['bodyweight', ...availableEquipmentIds]);
  if (exercise.equipmentIds.length === 0) return false;
  if (exercise.equipmentIds.includes('bodyweight')) return true;
  if (exercise.equipmentIds.every((id) => OPTIONAL_EQUIPMENT_IDS.has(id))) return true;

  const loadOptions = exercise.equipmentIds.filter((id) => LOAD_EQUIPMENT_IDS.has(id));
  const requiredSupport = exercise.equipmentIds.filter((id) => !LOAD_EQUIPMENT_IDS.has(id) && !OPTIONAL_EQUIPMENT_IDS.has(id));
  const hasLoadOption = loadOptions.length === 0 || loadOptions.some((id) => available.has(id));
  const hasSupport = requiredSupport.every((id) => available.has(id));

  return hasLoadOption && hasSupport;
}

function safetyCompatible(exercise: Exercise, safetyFlags: readonly string[]): boolean {
  if (safetyFlags.includes('no_jumping') && exercise.impact !== 'none' && exercise.movementPatternIds.includes('jump_land')) {
    return false;
  }
  if (safetyFlags.includes('no_running') && exercise.equipmentIds.includes('track_or_road') && exercise.intensity !== 'recovery') {
    return false;
  }
  if (safetyFlags.includes('no_overhead_pressing') && exercise.movementPatternIds.includes('vertical_push')) {
    return false;
  }
  if (safetyFlags.includes('shoulder_caution') && exercise.shoulderDemand === 'high') {
    return false;
  }
  if (safetyFlags.includes('no_floor_work') && exercise.setupType === 'floor') {
    return false;
  }
  if (safetyFlags.includes('limited_space') && exercise.spaceRequired?.some((space) => ['lane', 'open_space', 'outdoor'].includes(space))) {
    return false;
  }
  if (safetyFlags.includes('low_impact_required') && IMPACT_RANK[exercise.impact] > 1) {
    return false;
  }
  return !exercise.contraindicationFlags.some((flag) => safetyFlags.includes(flag));
}

function scoringSafetyFlags(request: GenerateSingleWorkoutInput): string[] {
  const flags = [...(request.safetyFlags ?? [])];
  if (request.readinessBand === 'red' || request.readinessBand === 'orange') flags.push('poor_readiness');
  if (request.readinessBand === 'yellow' || request.readinessBand === 'unknown') flags.push('unknown_readiness');
  return unique(flags);
}

function jointDemandForFlag(exercise: Exercise, safetyFlag: string): number {
  if (safetyFlag === 'knee_caution') return DEMAND_RANK[exercise.kneeDemand ?? 'low'];
  if (safetyFlag === 'back_caution') return DEMAND_RANK[exercise.spineLoading ?? 'low'];
  if (safetyFlag === 'shoulder_caution') return DEMAND_RANK[exercise.shoulderDemand ?? 'low'];
  if (safetyFlag === 'wrist_caution') return DEMAND_RANK[exercise.wristDemand ?? 'low'];
  return 0;
}

function intensityRank(intensity: Exercise['intensity']): number {
  if (intensity === 'recovery') return 0;
  if (intensity === 'low') return 1;
  if (intensity === 'moderate') return 2;
  return 3;
}

function trace(input: {
  step: string;
  reason: string;
  selectedId?: string;
  rejectedIds?: string[];
  safetyFlagIds?: string[];
  confidence?: number;
  metadata?: Record<string, unknown>;
}): WorkoutDecisionTraceEntry {
  traceCounter += 1;
  const id = `generation_${input.step}_${traceCounter}`;
  return { id, ...input };
}

function findById<T extends { id: string }>(items: readonly T[], id: string): T | null {
  return items.find((item) => item.id === id) ?? null;
}

function validatePrescriptionTemplatePayload(template: PrescriptionTemplate): string[] {
  const errors: string[] = [];
  const payload = template.payload;
  if (!payload) return [`${template.id} is missing typed prescription payload.`];
  if (template.kind !== payload.kind) errors.push(`${template.id} kind does not match payload kind.`);

  switch (payload.kind) {
    case 'resistance':
      if (!payload.sets || !payload.repRange) errors.push(`${template.id} resistance payload is missing sets or rep range.`);
      if (!payload.loadGuidance.trim()) errors.push(`${template.id} resistance payload is missing load guidance.`);
      if (!payload.restSecondsRange || numericTarget(payload.restSecondsRange, 0) <= 0) errors.push(`${template.id} resistance payload is missing rest guidance.`);
      if (!payload.effortGuidance.trim()) errors.push(`${template.id} resistance payload is missing effort guidance.`);
      if (template.appliesToWorkoutTypeIds.includes('hypertrophy') && (!payload.RIR || !payload.progressionRuleIds.some((id) => id.includes('double')))) {
        errors.push(`${template.id} hypertrophy payload is missing RIR or double progression.`);
      }
      break;
    case 'cardio':
      if (!payload.durationMinutes || !payload.heartRateZone || !payload.RPE || !payload.talkTest.trim()) errors.push(`${template.id} cardio payload is missing duration or intensity target.`);
      if (!payload.progressionRuleIds.length) errors.push(`${template.id} cardio payload is missing duration/frequency progression.`);
      break;
    case 'interval':
      if (!payload.workIntervalSeconds || !payload.restIntervalSeconds || !payload.rounds || !payload.targetIntensity.RPE) errors.push(`${template.id} interval payload is missing work/rest/rounds/intensity.`);
      break;
    case 'conditioning':
      if (!payload.workIntervalSeconds || !payload.restIntervalSeconds || !payload.rounds || !payload.targetIntensity.RPE) errors.push(`${template.id} conditioning payload is missing work/rest/rounds/intensity.`);
      break;
    case 'mobility':
      if (!payload.targetJoints.length || !payload.rangeOfMotionIntent.trim()) errors.push(`${template.id} mobility payload is missing target joints or ROM intent.`);
      if (!payload.painFreeRange || !payload.endRangeControl.trim()) errors.push(`${template.id} mobility payload must preserve pain-free end-range control.`);
      break;
    case 'flexibility':
      if (!payload.targetJoints.length || !payload.targetTissues.length || !payload.rangeOfMotionIntent.trim()) errors.push(`${template.id} flexibility payload is missing target joints, tissues, or ROM intent.`);
      if (!payload.painFreeRange) errors.push(`${template.id} flexibility payload must require pain-free range.`);
      break;
    case 'balance':
      if (!payload.baseOfSupport || !payload.surface || !payload.visualInput || !payload.mode || !payload.durationSeconds) errors.push(`${template.id} balance payload is missing stance, surface, visual, mode, or duration.`);
      if (!payload.complexityProgression.length || !payload.fallRiskRules.length) errors.push(`${template.id} balance payload is missing progression or fall-risk rules.`);
      break;
    case 'recovery':
      if (!payload.durationMinutes || numericTarget(payload.intensityCap, 10) > 3) errors.push(`${template.id} recovery payload cannot exceed easy intensity.`);
      if (!payload.breathingStrategy.trim() || !payload.circulationGoal.trim() || !payload.readinessAdjustment.trim()) errors.push(`${template.id} recovery payload is missing breathing, circulation, or readiness guidance.`);
      break;
    case 'power':
      if (!payload.lowFatigue || numericTarget(payload.fullRecoverySeconds, 0) < 90) errors.push(`${template.id} power payload needs low fatigue and full recovery.`);
      if (!payload.technicalQuality.trim() || !payload.explosiveIntent.trim() || !payload.eligibilityRestrictions.length) errors.push(`${template.id} power payload is missing quality or eligibility restrictions.`);
      break;
  }

  return errors;
}

export function resolveWorkoutTypeForGoal(goalId: string): string | null {
  return GOAL_TO_WORKOUT_TYPE[goalId] ?? null;
}

function resolveWorkoutTypeForRequest(request: GenerateSingleWorkoutInput): string | null {
  const mapped = resolveWorkoutTypeForGoal(request.goalId);
  const bodyweightOnly = request.equipmentIds.every((id) => ['bodyweight', 'mat', 'open_space'].includes(id));
  if ((request.safetyFlags ?? []).some((flag) => RECOVERY_REQUIRED_FLAGS.has(flag))) return 'recovery';
  if (request.goalId === 'beginner_strength' && bodyweightOnly) return 'bodyweight_strength';
  return mapped;
}

export function validateWorkoutProgrammingCatalog(
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): WorkoutValidationResult {
  const errors: string[] = [];
  const expectedCounts: Record<keyof Pick<WorkoutProgrammingCatalog,
    'workoutTypes' |
    'trainingGoals' |
    'workoutFormats' |
    'movementPatterns' |
    'muscleGroups' |
    'equipmentTypes' |
    'exercises' |
    'prescriptionTemplates' |
    'sessionTemplates' |
    'trackingMetrics' |
    'assessmentMetrics'
  >, number> = {
    workoutTypes: 15,
    trainingGoals: 15,
    workoutFormats: 15,
    movementPatterns: 20,
    muscleGroups: 25,
    equipmentTypes: 25,
    exercises: 50,
    prescriptionTemplates: 12,
    sessionTemplates: 12,
    trackingMetrics: 25,
    assessmentMetrics: 15,
  };

  for (const [key, count] of Object.entries(expectedCounts)) {
    const actual = catalog[key as keyof typeof expectedCounts].length;
    if (actual < count) errors.push(`${key} has ${actual}; expected at least ${count}.`);
  }

  const workoutTypeIds = new Set(catalog.workoutTypes.map((item) => item.id));
  const goalIds = new Set(catalog.trainingGoals.map((item) => item.id));
  const formatIds = new Set(catalog.workoutFormats.map((item) => item.id));
  const patternIds = new Set(catalog.movementPatterns.map((item) => item.id));
  const muscleIds = new Set(catalog.muscleGroups.map((item) => item.id));
  const equipmentIds = new Set(catalog.equipmentTypes.map((item) => item.id));
  const prescriptionIds = new Set(catalog.prescriptionTemplates.map((item) => item.id));
  const exerciseIds = new Set(catalog.exercises.map((item) => item.id));
  const trackingMetricIds = new Set(catalog.trackingMetrics.map((item) => item.id));
  const genericInstructionFragments = ['adjust as needed', 'use good form', 'do what feels right'];

  for (const goal of catalog.trainingGoals) {
    const type = resolveWorkoutTypeForGoal(goal.id);
    if (!type || !workoutTypeIds.has(type)) errors.push(`${goal.id} does not map to a valid workout type.`);
  }

  const requiredPayloadKinds: PrescriptionPayload['kind'][] = ['resistance', 'cardio', 'interval', 'mobility', 'flexibility', 'balance', 'recovery', 'power', 'conditioning'];
  for (const kind of requiredPayloadKinds) {
    if (!catalog.prescriptionTemplates.some((template) => template.payload.kind === kind)) errors.push(`Prescription payload kind ${kind} is not seeded.`);
  }
  for (const template of catalog.prescriptionTemplates) {
    if (!template.label.trim()) errors.push(`${template.id} is missing label.`);
    if (template.defaultRpe < 1 || template.defaultRpe > 10) errors.push(`${template.id} has invalid default RPE.`);
    for (const id of template.appliesToWorkoutTypeIds) if (!workoutTypeIds.has(id)) errors.push(`${template.id} references missing workout type ${id}.`);
    errors.push(...validatePrescriptionTemplatePayload(template));
  }

  for (const exercise of catalog.exercises) {
    if (!exercise.name.trim()) errors.push(`${exercise.id} is missing name.`);
    if (!exercise.shortName?.trim()) errors.push(`${exercise.id} is missing short name.`);
    if (!exercise.category) errors.push(`${exercise.id} is missing category.`);
    if (exercise.movementPatternIds.length === 0) errors.push(`${exercise.id} is missing movement patterns.`);
    if (exercise.primaryMuscleIds.length === 0) errors.push(`${exercise.id} is missing primary muscles.`);
    if (exercise.equipmentIds.length === 0) errors.push(`${exercise.id} is missing equipment.`);
    if (!exercise.equipmentRequiredIds?.length && !exercise.equipmentOptionalIds?.length) errors.push(`${exercise.id} is missing an equipment compatibility path.`);
    if (!exercise.subPatternIds?.length) errors.push(`${exercise.id} is missing sub-pattern ontology.`);
    if (!exercise.jointsInvolved?.length) errors.push(`${exercise.id} is missing joint ontology.`);
    if (!exercise.planeOfMotion || (Array.isArray(exercise.planeOfMotion) && exercise.planeOfMotion.length === 0)) errors.push(`${exercise.id} is missing plane of motion.`);
    if (!exercise.setupType) errors.push(`${exercise.id} is missing setup type.`);
    if (!exercise.technicalComplexity) errors.push(`${exercise.id} is missing technical complexity.`);
    if (!exercise.loadability) errors.push(`${exercise.id} is missing loadability.`);
    if (!exercise.fatigueCost) errors.push(`${exercise.id} is missing fatigue cost.`);
    if (!exercise.spineLoading) errors.push(`${exercise.id} is missing spine loading.`);
    for (const field of ['kneeDemand', 'hipDemand', 'shoulderDemand', 'wristDemand', 'ankleDemand', 'balanceDemand', 'cardioDemand'] as const) {
      if (!exercise[field]) errors.push(`${exercise.id} is missing ${field}.`);
    }
    if (!exercise.spaceRequired?.length) errors.push(`${exercise.id} is missing space requirement.`);
    if (exercise.homeFriendly == null) errors.push(`${exercise.id} is missing home-friendly flag.`);
    if (exercise.gymFriendly == null) errors.push(`${exercise.id} is missing gym-friendly flag.`);
    if (exercise.beginnerFriendly == null) errors.push(`${exercise.id} is missing beginner-friendly flag.`);
    if (!exercise.defaultPrescriptionRanges || Object.keys(exercise.defaultPrescriptionRanges).length === 0) errors.push(`${exercise.id} is missing default prescription ranges.`);
    if (!exercise.setupInstructions?.length) errors.push(`${exercise.id} is missing setup instructions.`);
    if (!exercise.executionInstructions?.length) errors.push(`${exercise.id} is missing execution instructions.`);
    if (!exercise.breathingInstructions?.length) errors.push(`${exercise.id} is missing breathing instructions.`);
    if (!exercise.safetyNotes?.length) errors.push(`${exercise.id} is missing safety notes.`);
    const instructionText = [
      ...(exercise.setupInstructions ?? []),
      ...(exercise.executionInstructions ?? []),
      ...(exercise.breathingInstructions ?? []),
      ...(exercise.safetyNotes ?? []),
    ].join(' ').toLowerCase();
    if (genericInstructionFragments.some((fragment) => instructionText.includes(fragment))) errors.push(`${exercise.id} contains generic exercise ontology language.`);
    if (!prescriptionIds.has(exercise.defaultPrescriptionTemplateId)) errors.push(`${exercise.id} references missing prescription template.`);
    for (const id of exercise.movementPatternIds) if (!patternIds.has(id)) errors.push(`${exercise.id} references missing pattern ${id}.`);
    for (const id of [...exercise.primaryMuscleIds, ...exercise.secondaryMuscleIds]) if (!muscleIds.has(id)) errors.push(`${exercise.id} references missing muscle ${id}.`);
    for (const id of exercise.equipmentIds) if (!equipmentIds.has(id)) errors.push(`${exercise.id} references missing equipment ${id}.`);
    for (const id of [...(exercise.equipmentRequiredIds ?? []), ...(exercise.equipmentOptionalIds ?? [])]) if (!equipmentIds.has(id)) errors.push(`${exercise.id} references missing enriched equipment ${id}.`);
    for (const id of exercise.workoutTypeIds) if (!workoutTypeIds.has(id)) errors.push(`${exercise.id} references missing workout type ${id}.`);
    for (const id of exercise.goalIds) if (!goalIds.has(id)) errors.push(`${exercise.id} references missing goal ${id}.`);
    for (const id of exercise.trackingMetricIds) if (!trackingMetricIds.has(id)) errors.push(`${exercise.id} references missing tracking metric ${id}.`);
    for (const id of exercise.regressionExerciseIds ?? []) if (!exerciseIds.has(id)) errors.push(`${exercise.id} references missing regression ${id}.`);
    for (const id of exercise.progressionExerciseIds ?? []) if (!exerciseIds.has(id)) errors.push(`${exercise.id} references missing progression ${id}.`);
    for (const id of exercise.substitutionExerciseIds ?? []) if (!exerciseIds.has(id)) errors.push(`${exercise.id} references missing substitution ${id}.`);
  }

  for (const template of catalog.sessionTemplates) {
    if (!workoutTypeIds.has(template.workoutTypeId)) errors.push(`${template.id} references missing workout type.`);
    if (!formatIds.has(template.formatId)) errors.push(`${template.id} references missing workout format.`);
    if (template.blocks.length === 0) errors.push(`${template.id} has no blocks.`);
    if (!template.blocks.some((block) => block.kind === 'warmup')) errors.push(`${template.id} is missing warm-up.`);
    if (!template.blocks.some((block) => block.kind === 'main')) errors.push(`${template.id} is missing main block.`);
    if (!template.blocks.some((block) => block.kind === 'cooldown')) errors.push(`${template.id} is missing cooldown.`);
    for (const goalId of template.goalIds) if (!goalIds.has(goalId)) errors.push(`${template.id} references missing goal ${goalId}.`);
    for (const block of template.blocks) {
      if (!prescriptionIds.has(block.prescriptionTemplateId)) errors.push(`${template.id}.${block.id} references missing prescription template.`);
    }
    for (const slot of template.movementSlots) {
      if (!template.blocks.some((block) => block.id === slot.blockId)) errors.push(`${template.id}.${slot.id} references missing block.`);
      for (const patternId of slot.movementPatternIds) if (!patternIds.has(patternId)) errors.push(`${template.id}.${slot.id} references missing pattern ${patternId}.`);
      for (const exerciseId of slot.preferredExerciseIds ?? []) if (!exerciseIds.has(exerciseId)) errors.push(`${template.id}.${slot.id} references missing preferred exercise ${exerciseId}.`);
    }
  }

  return createWorkoutValidationResult({ errors, failedRuleIds: errors.length ? ['catalog_integrity'] : [] });
}

export function queryWorkoutExercises(
  query: ExerciseQuery,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): Exercise[] {
  const safetyFlags = query.excludedSafetyFlags ?? [];
  const equipmentIds = query.equipmentIds ?? ['bodyweight'];
  const experienceRank = EXPERIENCE_RANK[query.experienceLevel ?? 'advanced'];

  return catalog.exercises
    .filter((exercise) => EXPERIENCE_RANK[exercise.minExperience] <= experienceRank)
    .filter((exercise) => !query.movementPatternIds?.length || intersects(exercise.movementPatternIds, query.movementPatternIds))
    .filter((exercise) => !query.workoutTypeIds?.length || intersects(exercise.workoutTypeIds, query.workoutTypeIds))
    .filter((exercise) => !query.goalIds?.length || intersects(exercise.goalIds, query.goalIds))
    .filter((exercise) => equipmentCompatible(exercise, equipmentIds))
    .filter((exercise) => safetyCompatible(exercise, safetyFlags))
    .slice(0, query.limit ?? catalog.exercises.length);
}

function selectSessionTemplate(input: GenerateSingleWorkoutInput, workoutTypeId: string, catalog: WorkoutProgrammingCatalog): SessionTemplate | null {
  const compatible = catalog.sessionTemplates
    .filter((template) => template.experienceLevels.includes(input.experienceLevel))
    .map((template) => {
      let score = 0;
      if (template.workoutTypeId === workoutTypeId) score += 60;
      if (template.goalIds.includes(input.goalId)) score += 30;
      if (input.durationMinutes >= template.minDurationMinutes) score += 12;
      if (input.durationMinutes <= template.maxDurationMinutes) score += 8;
      score -= Math.abs(template.defaultDurationMinutes - input.durationMinutes) / 2;
      if ((input.safetyFlags ?? []).includes('no_jumping') && template.formatId !== 'intervals') score += 3;
      if ((input.safetyFlags ?? []).some((flag) => RECOVERY_REQUIRED_FLAGS.has(flag)) && template.workoutTypeId === 'recovery') score += 40;
      return { template, score };
    })
    .filter((item) => item.template.workoutTypeId === workoutTypeId || item.template.goalIds.includes(input.goalId) || item.score >= 40)
    .sort((a, b) => b.score - a.score);

  return compatible[0]?.template ?? null;
}

function blockDuration(template: SessionTemplate, block: SessionTemplateBlock, requestedDurationMinutes: number): number {
  const defaultTotal = template.blocks.reduce((sum, item) => sum + item.durationMinutes, 0);
  const scale = requestedDurationMinutes / defaultTotal;
  const scaled = Math.round(block.durationMinutes * scale);
  if (block.kind === 'warmup') return Math.max(3, scaled);
  if (block.kind === 'cooldown') return Math.max(3, scaled);
  return Math.max(8, scaled);
}

function prescriptionFor(
  exercise: Exercise,
  block: SessionTemplateBlock,
  catalog: WorkoutProgrammingCatalog,
): PrescriptionTemplate {
  const exerciseDefault = findById(catalog.prescriptionTemplates, exercise.defaultPrescriptionTemplateId);
  const blockDefault = findById(catalog.prescriptionTemplates, block.prescriptionTemplateId);
  if (block.kind === 'main') return blockDefault ?? exerciseDefault ?? catalog.prescriptionTemplates[0]!;
  return exerciseDefault ?? blockDefault ?? catalog.prescriptionTemplates[0]!;
}

function withNumericTarget(range: { target?: number; min?: number; max?: number; unit?: string }, target: number | null): typeof range {
  return target == null ? range : { ...range, target };
}

function numericTarget(range: { target?: number; min?: number; max?: number } | undefined, fallback: number): number {
  return range?.target ?? range?.min ?? range?.max ?? fallback;
}

function payloadForExercise(
  template: PrescriptionTemplate,
  exercise: Exercise,
  durationMinutes: number | null,
  durationSeconds: number | null,
): PrescriptionPayload {
  const payload = template.payload;
  if (payload.kind === 'cardio') {
    return {
      ...payload,
      modality: exercise.equipmentIds.includes('stationary_bike') || exercise.equipmentIds.includes('assault_bike')
        ? 'bike'
        : exercise.equipmentIds.includes('rowing_machine') ? 'rower' : 'walk',
      durationMinutes: withNumericTarget(payload.durationMinutes, durationMinutes),
    };
  }
  if (payload.kind === 'recovery') {
    return {
      ...payload,
      durationMinutes: withNumericTarget(payload.durationMinutes, durationMinutes),
    };
  }
  if (payload.kind === 'mobility') {
    return {
      ...payload,
      targetJoints: exercise.defaultPrescriptionRanges?.targetJoints ?? exercise.jointsInvolved ?? payload.targetJoints,
      rangeOfMotionIntent: exercise.defaultPrescriptionRanges?.rangeOfMotionIntent ?? payload.rangeOfMotionIntent,
    };
  }
  if (payload.kind === 'flexibility') {
    return {
      ...payload,
      targetJoints: exercise.defaultPrescriptionRanges?.targetJoints ?? exercise.jointsInvolved ?? payload.targetJoints,
      targetTissues: exercise.defaultPrescriptionRanges?.targetTissues ?? exercise.primaryMuscleIds,
      rangeOfMotionIntent: exercise.defaultPrescriptionRanges?.rangeOfMotionIntent ?? payload.rangeOfMotionIntent,
    };
  }
  if (payload.kind === 'balance') {
    return {
      ...payload,
      baseOfSupport: exercise.movementPatternIds.includes('balance') ? 'single_leg' : payload.baseOfSupport,
      mode: exercise.movementPatternIds.includes('crawl') || exercise.movementPatternIds.includes('carry') ? 'dynamic' : payload.mode,
      durationSeconds: withNumericTarget(payload.durationSeconds, durationSeconds),
    };
  }
  return payload;
}

function buildExercisePrescription(input: {
  exercise: Exercise;
  slot: SessionTemplateMovementSlot;
  block: SessionTemplateBlock;
  blockExerciseCount: number;
  blockDurationMinutes: number;
  workoutTypeId: string;
  goalId: string;
  request: GenerateSingleWorkoutInput;
  catalog: WorkoutProgrammingCatalog;
  scoreTrace: ExerciseSelectionScoreTrace;
}): GeneratedExercisePrescription {
  const template = prescriptionFor(input.exercise, input.block, input.catalog);
  const timedBlock = template.defaultDurationMinutes != null || template.defaultDurationSeconds != null;
  const durationMinutes = template.defaultDurationMinutes != null
    ? Math.max(1, Math.floor(input.blockDurationMinutes / Math.max(1, input.blockExerciseCount)))
    : null;
  const durationSeconds = template.defaultDurationSeconds ?? null;
  const safetyFlags = input.request.safetyFlags ?? [];
  const shouldReduceVolume = input.request.experienceLevel === 'beginner'
    || safetyFlags.some((flag) => CONSERVATIVE_VOLUME_FLAGS.has(flag));
  const shouldReduceIntensity = safetyFlags.some((flag) => CONSERVATIVE_INTENSITY_FLAGS.has(flag));
  const baseSets = timedBlock && template.defaultSets == null ? null : template.defaultSets ?? 2;
  const sets = baseSets == null ? null : Math.max(1, baseSets - (shouldReduceVolume && input.block.kind === 'main' && baseSets > 2 ? 1 : 0));
  const payload = payloadForExercise(template, input.exercise, durationMinutes, durationSeconds);
  const targetRpe = Math.max(1, Math.min(9, template.defaultRpe - (shouldReduceIntensity && template.defaultRpe > 4 ? 1 : 0)));
  const substitutions = rankExerciseSubstitutions({
    sourceExerciseId: input.exercise.id,
    movementPatternIds: input.exercise.movementPatternIds,
    primaryMuscleIds: input.exercise.primaryMuscleIds,
    workoutTypeId: input.workoutTypeId,
    goalId: input.goalId,
    equipmentIds: input.request.equipmentIds,
    safetyFlagIds: safetyFlags,
    experienceLevel: input.request.experienceLevel,
    catalog: input.catalog,
    limit: 3,
    ...(input.request.dislikedExerciseIds ? { dislikedExerciseIds: input.request.dislikedExerciseIds } : {}),
  });

  return {
    exerciseId: input.exercise.id,
    name: input.exercise.name,
    blockId: input.block.id,
    movementPatternIds: input.exercise.movementPatternIds,
    primaryMuscleIds: input.exercise.primaryMuscleIds,
    equipmentIds: input.exercise.equipmentIds,
    prescription: {
      sets,
      reps: template.defaultReps ?? null,
      durationSeconds,
      durationMinutes,
      targetRpe,
      restSeconds: template.restSeconds,
      tempo: template.tempo ?? null,
      intensityCue: template.intensityCue,
      kind: template.kind,
      payload,
    },
    trackingMetricIds: input.exercise.trackingMetricIds,
    explanation: `${input.exercise.name} scored for ${input.slot.movementPatternIds.join('/')} with compatible equipment, experience, and safety filters.`,
    prescriptionTemplateId: template.id,
    scoreTrace: input.scoreTrace,
    substitutions,
  };
}

function scoreExerciseForSlot(input: {
  exercise: Exercise;
  slot: SessionTemplateMovementSlot;
  block: SessionTemplateBlock;
  template: SessionTemplate;
  workoutTypeId: string;
  request: GenerateSingleWorkoutInput;
  usedExerciseIds: Set<string>;
  relaxedPattern: boolean;
}): ExerciseSelectionScoreTrace {
  const exercise = input.exercise;
  const hardSafetyFlags = input.request.safetyFlags ?? [];
  const safetyFlags = scoringSafetyFlags(input.request);
  const scoreBreakdown: Record<string, number> = {};
  const includedReasons: string[] = [];
  const excludedReasons: string[] = [];
  const add = (key: string, value: number, reason?: string) => {
    if (value === 0) return;
    scoreBreakdown[key] = (scoreBreakdown[key] ?? 0) + value;
    if (reason && value > 0) includedReasons.push(reason);
  };

  const patternOverlap = overlapCount(exercise.movementPatternIds, input.slot.movementPatternIds);
  const movementPatternMatch = patternOverlap > 0;
  add('movementPatternMatch', patternOverlap * EXERCISE_SELECTION_SCORE_WEIGHTS.movementPatternPerMatch, `Matches ${patternOverlap} requested movement pattern(s).`);
  if (input.relaxedPattern && patternOverlap === 0) add('fallbackPatternPenalty', EXERCISE_SELECTION_SCORE_WEIGHTS.fallbackPatternPenalty);
  if (input.slot.preferredExerciseIds?.includes(exercise.id)) add('slotPreferredExercise', EXERCISE_SELECTION_SCORE_WEIGHTS.slotPreferredExercise, 'Listed as a preferred exercise for this movement slot.');

  const goalMatch = exercise.goalIds.includes(input.request.goalId);
  const workoutTypeMatch = exercise.workoutTypeIds.includes(input.workoutTypeId);
  const templateWorkoutTypeMatch = exercise.workoutTypeIds.includes(input.template.workoutTypeId);
  if (goalMatch) add('goalMatch', EXERCISE_SELECTION_SCORE_WEIGHTS.goalMatch, 'Matches the requested training goal.');
  if (workoutTypeMatch) add('workoutTypeMatch', EXERCISE_SELECTION_SCORE_WEIGHTS.workoutTypeMatch, 'Matches the resolved workout type.');
  if (templateWorkoutTypeMatch) add('templateWorkoutTypeMatch', EXERCISE_SELECTION_SCORE_WEIGHTS.templateWorkoutTypeMatch, 'Matches the selected session template type.');

  const equipmentMatch = equipmentCompatible(exercise, input.request.equipmentIds);
  if (equipmentMatch) add('equipmentMatch', EXERCISE_SELECTION_SCORE_WEIGHTS.equipmentMatch, 'Compatible with available equipment.');
  else excludedReasons.push('Equipment hard mismatch: required equipment is not available.');

  const experienceMatch = EXPERIENCE_RANK[exercise.minExperience] <= EXPERIENCE_RANK[input.request.experienceLevel];
  if (experienceMatch) add('experienceMatch', EXERCISE_SELECTION_SCORE_WEIGHTS.experienceMatch, 'Compatible with the user experience level.');
  else excludedReasons.push(`Experience hard mismatch: ${exercise.minExperience} exercise for ${input.request.experienceLevel} user.`);
  if (input.request.experienceLevel === 'beginner' && exercise.beginnerFriendly) add('beginnerFriendly', EXERCISE_SELECTION_SCORE_WEIGHTS.beginnerFriendly, 'Beginner-friendly setup and execution.');

  let preferenceAdjustment = 0;
  if (input.request.preferredExerciseIds?.includes(exercise.id)) {
    preferenceAdjustment += EXERCISE_SELECTION_SCORE_WEIGHTS.preferredExercise;
    includedReasons.push('User preference nudged this exercise upward.');
  }
  if (input.request.dislikedExerciseIds?.includes(exercise.id)) {
    preferenceAdjustment += EXERCISE_SELECTION_SCORE_WEIGHTS.dislikedExerciseHardExclude;
    excludedReasons.push('User disliked this exercise, so it was excluded from automatic selection.');
  }
  if (preferenceAdjustment !== 0) scoreBreakdown.preferenceAdjustment = preferenceAdjustment;

  const environment = input.request.workoutEnvironment ?? 'unknown';
  if (exercise.homeFriendly && (environment === 'home' || environment === 'travel' || input.request.equipmentIds.every((id) => ['bodyweight', 'dumbbells', 'kettlebell', 'resistance_band', 'mat', 'bench', 'plyo_box', 'open_space'].includes(id)))) add('environmentFit', EXERCISE_SELECTION_SCORE_WEIGHTS.environmentFit, 'Fits the requested training environment.');
  if (exercise.gymFriendly && (environment === 'gym' || input.request.equipmentIds.some((id) => ['barbell', 'squat_rack', 'cable_machine', 'leg_press', 'lat_pulldown', 'stationary_bike', 'treadmill', 'rowing_machine'].includes(id)))) add('environmentFit', EXERCISE_SELECTION_SCORE_WEIGHTS.environmentFit, 'Fits the requested training environment.');

  if (input.block.kind === 'main' && input.usedExerciseIds.has(exercise.id)) excludedReasons.push('Already used in a main-work slot.');
  if ((input.slot.avoidExerciseIds ?? []).includes(exercise.id)) excludedReasons.push('Movement slot explicitly avoids this exercise.');
  if (!safetyCompatible(exercise, hardSafetyFlags)) excludedReasons.push('Safety hard mismatch: exercise violates an active safety restriction.');

  const mainTypeEligible = input.block.kind !== 'main'
    || workoutTypeMatch
    || templateWorkoutTypeMatch
    || goalMatch;
  if (!mainTypeEligible) excludedReasons.push('Main slot mismatch: exercise does not support the resolved goal or workout type.');

  const intensityPenalty = intensityRank(exercise.intensity) * (safetyFlags.some((flag) => RECOVERY_REQUIRED_FLAGS.has(flag))
    ? EXERCISE_SELECTION_SCORE_WEIGHTS.recoveryIntensityPenalty
    : EXERCISE_SELECTION_SCORE_WEIGHTS.normalIntensityPenalty);
  add('intensityPenalty', intensityPenalty);

  const fatigueCostPenalty = DEMAND_RANK[exercise.fatigueCost ?? 'low'] * (safetyFlags.includes('high_fatigue') || safetyFlags.includes('poor_readiness')
    ? EXERCISE_SELECTION_SCORE_WEIGHTS.readinessFatiguePenalty
    : EXERCISE_SELECTION_SCORE_WEIGHTS.normalFatiguePenalty);
  add('fatigueCostPenalty', fatigueCostPenalty);

  const highComplexity = exercise.technicalComplexity === 'high' || exercise.technicalComplexity === 'coach_required';
  const technicalComplexityPenalty = highComplexity
    ? (input.request.experienceLevel === 'beginner'
      ? EXERCISE_SELECTION_SCORE_WEIGHTS.beginnerHighComplexityPenalty
      : EXERCISE_SELECTION_SCORE_WEIGHTS.highComplexityPenalty)
    : 0;
  add('technicalComplexityPenalty', technicalComplexityPenalty);

  let jointDemandPenalty = 0;
  for (const flag of safetyFlags) jointDemandPenalty += jointDemandForFlag(exercise, flag) * EXERCISE_SELECTION_SCORE_WEIGHTS.jointDemandPenalty;
  add('jointDemandPenalty', jointDemandPenalty);

  const impactPenalty = safetyFlags.includes('low_impact_required') ? IMPACT_RANK[exercise.impact] * EXERCISE_SELECTION_SCORE_WEIGHTS.lowImpactPenalty : 0;
  add('lowImpactPenalty', impactPenalty);
  if (input.workoutTypeId.includes('strength') && exercise.loadability === 'high') add('strengthLoadability', EXERCISE_SELECTION_SCORE_WEIGHTS.strengthLoadability, 'Highly loadable for strength progression.');
  if (input.workoutTypeId === 'recovery' && exercise.intensity === 'recovery') add('recoveryFit', EXERCISE_SELECTION_SCORE_WEIGHTS.recoveryFit, 'Recovery intensity matches the fallback session intent.');

  const totalScore = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  return {
    exerciseId: exercise.id,
    slotId: input.slot.id,
    totalScore,
    scoreBreakdown,
    includedReasons: unique(includedReasons),
    excludedReasons: unique(excludedReasons),
    safetyFlagsApplied: safetyFlags,
    equipmentMatch,
    movementPatternMatch,
    goalMatch,
    workoutTypeMatch: workoutTypeMatch || templateWorkoutTypeMatch,
    experienceMatch,
    fatigueCostPenalty,
    technicalComplexityPenalty,
    jointDemandPenalty,
    preferenceAdjustment,
    substitutionAdjustment: 0,
    finalDecision: excludedReasons.length ? 'excluded' : 'candidate',
  };
}

function fallbackPatternsForBlock(blockKind: GeneratedWorkoutBlock['kind'], workoutTypeId: string): string[] {
  if (blockKind === 'warmup') return ['breathing', 'hip_mobility', 'thoracic_mobility', 'shoulder_prehab', 'locomotion'];
  if (blockKind === 'cooldown') return ['breathing', 'thoracic_mobility', 'hip_mobility', 'locomotion'];
  if (workoutTypeId === 'recovery') return ['breathing', 'locomotion', 'hip_mobility', 'thoracic_mobility', 'balance'];
  if (workoutTypeId === 'mobility') return ['hip_mobility', 'thoracic_mobility', 'ankle_mobility', 'shoulder_prehab'];
  if (workoutTypeId === 'low_impact_conditioning') return ['locomotion', 'horizontal_push', 'squat', 'carry'];
  return [];
}

function selectExerciseForSlot(input: {
  slot: SessionTemplateMovementSlot;
  block: SessionTemplateBlock;
  template: SessionTemplate;
  workoutTypeId: string;
  request: GenerateSingleWorkoutInput;
  usedExerciseIds: Set<string>;
  catalog: WorkoutProgrammingCatalog;
}): { exercise: Exercise; score: number; scoreTrace: ExerciseSelectionScoreTrace; relaxedPattern: boolean; rejectedIds: string[]; traces: ExerciseSelectionScoreTrace[] } | null {
  const initialTraces = input.catalog.exercises.map((exercise) => scoreExerciseForSlot({
    exercise,
    slot: input.slot,
    block: input.block,
    template: input.template,
    workoutTypeId: input.workoutTypeId,
    request: input.request,
    usedExerciseIds: input.usedExerciseIds,
    relaxedPattern: false,
  }));
  const exerciseByTraceId = new Map(input.catalog.exercises.map((exercise) => [exercise.id, exercise]));
  const baseTraces = initialTraces.filter((item) => item.finalDecision !== 'excluded');
  const matchingPattern = baseTraces
    .filter((traceItem) => traceItem.movementPatternMatch);
  const fallbackPatterns = fallbackPatternsForBlock(input.block.kind, input.workoutTypeId);
  const relaxedPattern = matchingPattern.length === 0;
  const candidateTraces = (relaxedPattern
    ? baseTraces
      .map((traceItem) => {
        const exercise = exerciseByTraceId.get(traceItem.exerciseId)!;
        const fallbackEligible = fallbackPatterns.length === 0 || intersects(exercise.movementPatternIds, fallbackPatterns);
        const mainFallbackEligible = input.block.kind !== 'main'
          || exercise.workoutTypeIds.includes(input.workoutTypeId)
          || exercise.goalIds.includes(input.request.goalId)
          || exercise.workoutTypeIds.includes('recovery')
          || exercise.workoutTypeIds.includes('mobility');
        if (!fallbackEligible || !mainFallbackEligible) return null;
        return scoreExerciseForSlot({
          exercise,
          slot: input.slot,
          block: input.block,
          template: input.template,
          workoutTypeId: input.workoutTypeId,
          request: input.request,
          usedExerciseIds: input.usedExerciseIds,
          relaxedPattern: true,
        });
      })
      .filter((traceItem): traceItem is ExerciseSelectionScoreTrace => traceItem !== null)
    : matchingPattern)
    .filter((traceItem) => traceItem.finalDecision !== 'excluded');
  const candidates = candidateTraces
    .map((scoreTrace) => ({
      exercise: exerciseByTraceId.get(scoreTrace.exerciseId)!,
      relaxedPattern,
      scoreTrace,
      score: scoreTrace.totalScore,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.exercise.name.localeCompare(b.exercise.name);
    });

  const selected = candidates[0];
  const candidateIds = new Set(candidates.map((candidate) => candidate.exercise.id));
  const traces = initialTraces.map((traceItem) => {
    const candidate = candidates.find((item) => item.exercise.id === traceItem.exerciseId);
    if (candidate) return candidate.scoreTrace;
    if (candidateIds.has(traceItem.exerciseId)) return traceItem;
    if (traceItem.finalDecision === 'excluded') return traceItem;
    return {
      ...traceItem,
      excludedReasons: unique([...traceItem.excludedReasons, relaxedPattern ? 'Not eligible for fallback movement pattern.' : 'Does not match the movement slot pattern.']),
      finalDecision: 'excluded' as const,
    };
  });
  if (!selected) return null;
  const selectedTrace: ExerciseSelectionScoreTrace = {
    ...selected.scoreTrace,
    finalDecision: 'selected',
  };
  const selectedTraceById = new Map<string, ExerciseSelectionScoreTrace>([[selected.exercise.id, selectedTrace]]);
  for (const candidate of candidates.slice(1, 6)) {
    selectedTraceById.set(candidate.exercise.id, {
      ...candidate.scoreTrace,
      finalDecision: 'rejected',
    });
  }
  return {
    ...selected,
    scoreTrace: selectedTrace,
    rejectedIds: candidates.slice(1, 6).map((candidate) => candidate.exercise.id),
    traces: traces.map((traceItem) => selectedTraceById.get(traceItem.exerciseId) ?? traceItem),
  };
}

export function generateSingleSessionWorkout(
  request: GenerateSingleWorkoutInput,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): GeneratedWorkout {
  const safetyFlags = request.safetyFlags ?? [];
  const severeFlag = safetyFlags.find((flag) => SEVERE_SAFETY_FLAGS.has(flag));
  if (severeFlag) {
    throw new Error(`Unsafe workout request blocked by severe safety flag: ${severeFlag}.`);
  }
  const decisionTrace: WorkoutDecisionTraceEntry[] = [];
  const safetyRequiresRecovery = safetyFlags.some((flag) => RECOVERY_REQUIRED_FLAGS.has(flag));
  const effectiveRequest: GenerateSingleWorkoutInput = safetyRequiresRecovery && !['recovery', 'return_to_training'].includes(request.goalId)
    ? { ...request, goalId: 'recovery' }
    : request;
  if (effectiveRequest.goalId !== request.goalId) {
    decisionTrace.push(trace({
      step: 'safety_goal_fallback',
      reason: `Safety flags ${safetyFlags.join(', ')} require a recovery-first session instead of ${request.goalId}.`,
      selectedId: effectiveRequest.goalId,
      safetyFlagIds: safetyFlags,
      confidence: 0.92,
    }));
  }

  const workoutTypeId = resolveWorkoutTypeForRequest(effectiveRequest);
  if (!workoutTypeId) {
    throw new Error(`Unknown training goal: ${effectiveRequest.goalId}.`);
  }
  const trainingGoal = findById(catalog.trainingGoals, effectiveRequest.goalId);
  const workoutType = findById(catalog.workoutTypes, workoutTypeId);
  decisionTrace.push(trace({
    step: 'resolve_goal_type',
    reason: `${trainingGoal?.label ?? effectiveRequest.goalId} resolved to ${workoutType?.label ?? workoutTypeId}.`,
    selectedId: workoutTypeId,
    confidence: workoutType ? 0.96 : 0.65,
    metadata: { requestedGoalId: request.goalId, effectiveGoalId: effectiveRequest.goalId },
  }));

  const template = selectSessionTemplate(effectiveRequest, workoutTypeId, catalog);
  if (!template) {
    throw new Error(`No session template can satisfy ${effectiveRequest.goalId} in ${effectiveRequest.durationMinutes} minutes.`);
  }
  const selectedTemplateTrace = trace({
    step: 'select_session_template',
    reason: `${template.label} best matches goal, workout type, experience, and requested duration.`,
    selectedId: template.id,
    confidence: effectiveRequest.durationMinutes >= template.minDurationMinutes ? 0.9 : 0.72,
    metadata: {
      formatId: template.formatId,
      requestedDurationMinutes: effectiveRequest.durationMinutes,
      defaultDurationMinutes: template.defaultDurationMinutes,
    },
  });
  decisionTrace.push(selectedTemplateTrace);

  const usedExerciseIds = new Set<string>();
  const movementSlotTrace: WorkoutDecisionTraceEntry[] = [];
  const exerciseSelectionTrace: ExerciseSelectionScoreTrace[] = [];
  const selectedPrescriptionTrace: WorkoutDecisionTraceEntry[] = [];
  const blocks: GeneratedWorkoutBlock[] = template.blocks.map((blockTemplate) => {
    const slots = template.movementSlots
      .filter((slotItem) => slotItem.blockId === blockTemplate.id)
      .sort((a, b) => a.order - b.order);
    const duration = blockDuration(template, blockTemplate, request.durationMinutes);
    const selectedExercises = slots
      .map((slotItem) => {
        const exercise = selectExerciseForSlot({
          slot: slotItem,
          block: blockTemplate,
          template,
          workoutTypeId,
          request: effectiveRequest,
          usedExerciseIds,
          catalog,
        });
        if (!exercise) {
          decisionTrace.push(trace({
            step: slotItem.optional ? 'reduce_optional_slot' : 'missing_required_slot',
            reason: `${slotItem.id} could not be filled after equipment and safety constraints.`,
            rejectedIds: [],
            safetyFlagIds: safetyFlags,
            confidence: slotItem.optional ? 0.8 : 0.35,
          }));
          return null;
        }
        if (blockTemplate.kind === 'main') {
          usedExerciseIds.add(exercise.exercise.id);
        }
        exerciseSelectionTrace.push(...exercise.traces);
        const slotTrace = trace({
          step: 'score_movement_slot',
          reason: `${exercise.exercise.name} scored ${Math.round(exercise.score)} for ${slotItem.id}${exercise.relaxedPattern ? ' after fallback pattern relaxation' : ''}.`,
          selectedId: exercise.exercise.id,
          rejectedIds: exercise.rejectedIds,
          safetyFlagIds: safetyFlags,
          confidence: Math.min(0.98, Math.max(0.45, exercise.score / 120)),
          metadata: {
            movementPatternIds: slotItem.movementPatternIds,
            relaxedPattern: exercise.relaxedPattern,
            scoreBreakdown: exercise.scoreTrace.scoreBreakdown,
            includedReasons: exercise.scoreTrace.includedReasons,
            excludedReasons: exercise.scoreTrace.excludedReasons,
          },
        });
        movementSlotTrace.push(slotTrace);
        decisionTrace.push(slotTrace);
        return { slot: slotItem, exercise: exercise.exercise, scoreTrace: exercise.scoreTrace };
      })
      .filter((item): item is { slot: SessionTemplateMovementSlot; exercise: Exercise; scoreTrace: ExerciseSelectionScoreTrace } => item !== null);

    return {
      id: blockTemplate.id,
      kind: blockTemplate.kind,
      title: blockTemplate.title,
      estimatedDurationMinutes: duration,
      exercises: selectedExercises.map((selected) => {
        const generatedExercise = buildExercisePrescription({
          exercise: selected.exercise,
          slot: selected.slot,
          block: blockTemplate,
          blockExerciseCount: selectedExercises.length,
          blockDurationMinutes: duration,
          workoutTypeId,
          goalId: effectiveRequest.goalId,
          request: effectiveRequest,
          catalog,
          scoreTrace: selected.scoreTrace,
        });
        const prescriptionTrace = trace({
          step: 'select_prescription_template',
          reason: `${generatedExercise.prescriptionTemplateId ?? 'default'} prescription was selected for ${generatedExercise.name} in ${blockTemplate.kind}.`,
          ...(generatedExercise.prescriptionTemplateId ? { selectedId: generatedExercise.prescriptionTemplateId } : {}),
          confidence: 0.9,
          metadata: {
            exerciseId: generatedExercise.exerciseId,
            blockId: blockTemplate.id,
            prescriptionKind: generatedExercise.prescription.kind,
          },
        });
        selectedPrescriptionTrace.push(prescriptionTrace);
        decisionTrace.push(prescriptionTrace);
        return generatedExercise;
      }),
    };
  });

  const estimatedDurationMinutes = blocks.reduce((sum, blockItem) => sum + blockItem.estimatedDurationMinutes, 0);
  const trackingMetricIds = unique(blocks.flatMap((blockItem) => blockItem.exercises.flatMap((exercise) => exercise.trackingMetricIds)));
  const trackingMetrics = trackingMetricIds
    .map((metricId) => findById(catalog.trackingMetrics, metricId)?.label ?? metricId);
  const selectedEquipment = unique(blocks.flatMap((blockItem) => blockItem.exercises.flatMap((exercise) => exercise.equipmentIds)));
  const prescriptions = blocks.flatMap((blockItem) => blockItem.exercises.map((exercise) => exercise.prescription));
  const substitutions = blocks.flatMap((blockItem) => blockItem.exercises.flatMap((exercise) => exercise.substitutions ?? []));
  const substitutionTrace = substitutions.flatMap((option) => option.scoreTrace ? [option.scoreTrace] : []);
  const explanations = [
    `${template.label} was selected because it maps ${effectiveRequest.goalId} to ${workoutTypeId}.`,
    `Exercise selection scored movement pattern, goal, workout type, equipment, experience, safety, fatigue, technical complexity, joint demand, loadability, and setting fit.`,
    `Exercise selection respected available equipment: ${effectiveRequest.equipmentIds.length ? effectiveRequest.equipmentIds.join(', ') : 'bodyweight only'}.`,
    safetyFlags.length
      ? `Safety filters were applied: ${safetyFlags.join(', ')}.`
      : 'No safety flags were supplied, so the generator still used conservative prescriptions.',
  ];

  const generated: GeneratedWorkout = {
    schemaVersion: 'generated-workout-v1',
    workoutTypeId,
    goalId: effectiveRequest.goalId,
    trainingGoalLabel: trainingGoal?.label ?? effectiveRequest.goalId,
    templateId: template.id,
    formatId: template.formatId,
    experienceLevel: effectiveRequest.experienceLevel,
    requestedDurationMinutes: effectiveRequest.durationMinutes,
    estimatedDurationMinutes,
    equipmentIds: selectedEquipment,
    safetyFlags,
    blocks,
    prescriptions,
    substitutions,
    trackingMetricIds,
    trackingMetrics,
    successCriteria: template.successCriteria,
    scalingOptions: {
      down: 'Use the listed substitutions first, then remove optional slots, lower target RPE by one, and reduce one set or interval round.',
      up: 'Add volume only after pain, readiness, and movement quality stay stable across the session.',
      substitutions: substitutions.slice(0, 5).map((option) => `${option.name}: ${option.rationale}`),
      recoveryAlternative: safetyRequiresRecovery ? 'Recovery was already selected because safety flags required it.' : 'Switch to recovery reset if symptoms, readiness, or pain worsen.',
    },
    explanations,
    decisionTrace,
    generationTrace: {
      selectedTemplateTrace,
      selectedPrescriptionTrace,
      movementSlotTrace,
      exerciseSelectionTrace,
      substitutionTrace,
      fallbackTrace: [],
    },
    exerciseSelectionTrace,
    substitutionTrace,
  };
  const description = generateWorkoutDescription(
    generated,
    effectiveRequest.preferredToneVariant ? { toneVariant: effectiveRequest.preferredToneVariant } : {},
  );

  const workoutWithDescription: GeneratedWorkout = {
    ...generated,
    sessionIntent: description.sessionIntent,
    userFacingSummary: description.plainLanguageSummary,
    description,
    descriptions: [description],
    coachingNotes: [description.coachExplanation, description.effortExplanation],
    safetyNotes: description.safetyNotes,
  };
  const validation = validateWorkoutDomain(workoutWithDescription, catalog);
  if (!validation.isValid) {
    if (!safetyRequiresRecovery && effectiveRequest.goalId !== 'recovery') {
      const fallback = generateSingleSessionWorkout({
        ...request,
        goalId: 'recovery',
        durationMinutes: Math.max(15, Math.min(request.durationMinutes, 30)),
        equipmentIds: request.equipmentIds.length ? request.equipmentIds : ['bodyweight'],
        safetyFlags: unique([...safetyFlags, 'poor_readiness']),
      }, catalog);
      return {
        ...fallback,
        explanations: [
          ...fallback.explanations,
          `Original ${request.goalId} generation failed validation and safely fell back to recovery: ${validation.errors.join(' | ')}`,
        ],
        decisionTrace: [
          ...decisionTrace,
          trace({
            step: 'validation_recovery_fallback',
            reason: `Validation failed, so the generator switched to recovery instead of returning an unsafe workout.`,
            selectedId: fallback.templateId,
            rejectedIds: validation.failedRuleIds,
            safetyFlagIds: safetyFlags,
            confidence: 0.86,
          }),
          ...(fallback.decisionTrace ?? []),
        ],
        generationTrace: {
          ...(fallback.generationTrace ?? {}),
          fallbackTrace: [
            ...(fallback.generationTrace?.fallbackTrace ?? []),
            trace({
              step: 'validation_recovery_fallback',
              reason: `Validation failed, so the generator switched to recovery instead of returning an unsafe workout.`,
              selectedId: fallback.templateId,
              rejectedIds: validation.failedRuleIds,
              safetyFlagIds: safetyFlags,
              confidence: 0.86,
            }),
          ],
        },
      };
    }
    throw new Error(`Generated workout failed domain validation: ${validation.errors.join(' | ')}`);
  }

  return {
    ...workoutWithDescription,
    validation,
    validationWarnings: validation.warnings,
    validationErrors: validation.errors,
    generationTrace: {
      ...(workoutWithDescription.generationTrace ?? {}),
      validationTrace: validation.decisionTrace,
    },
    ...(workoutWithDescription.exerciseSelectionTrace ? { exerciseSelectionTrace: workoutWithDescription.exerciseSelectionTrace } : {}),
    ...(workoutWithDescription.substitutionTrace ? { substitutionTrace: workoutWithDescription.substitutionTrace } : {}),
    decisionTrace: [
      ...(workoutWithDescription.decisionTrace ?? []),
      trace({
        step: 'validate_output',
        reason: 'Generated workout passed domain validation before return.',
        selectedId: workoutWithDescription.templateId,
        confidence: 0.97,
        metadata: { failedRuleIds: validation.failedRuleIds },
      }),
    ],
  };
}

export const GENERATED_WORKOUT_SCHEMA = {
  type: 'object',
  required: [
    'schemaVersion',
    'workoutTypeId',
    'goalId',
    'templateId',
    'formatId',
    'requestedDurationMinutes',
    'estimatedDurationMinutes',
    'equipmentIds',
    'safetyFlags',
    'blocks',
    'trackingMetricIds',
    'successCriteria',
    'explanations',
  ],
  blockKinds: ['warmup', 'main', 'cooldown'],
} as const;

export function validateGeneratedWorkout(
  workout: GeneratedWorkout,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): WorkoutValidationResult {
  return validateWorkoutDomain(workout, catalog);
}
