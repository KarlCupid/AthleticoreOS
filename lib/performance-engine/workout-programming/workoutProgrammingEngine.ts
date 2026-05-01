import {
  workoutProgrammingCatalog,
} from './seedData.ts';
import type {
  EquipmentType,
  Exercise,
  ExerciseQuery,
  GenerateSingleWorkoutInput,
  GeneratedExercisePrescription,
  GeneratedWorkout,
  GeneratedWorkoutBlock,
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

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function intersects(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (!a?.length || !b?.length) return false;
  const bSet = new Set(b);
  return a.some((item) => bSet.has(item));
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
  return !exercise.contraindicationFlags.some((flag) => safetyFlags.includes(flag));
}

function findById<T extends { id: string }>(items: readonly T[], id: string): T | null {
  return items.find((item) => item.id === id) ?? null;
}

export function resolveWorkoutTypeForGoal(goalId: string): string | null {
  return GOAL_TO_WORKOUT_TYPE[goalId] ?? null;
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

  for (const goal of catalog.trainingGoals) {
    const type = resolveWorkoutTypeForGoal(goal.id);
    if (!type || !workoutTypeIds.has(type)) errors.push(`${goal.id} does not map to a valid workout type.`);
  }

  for (const exercise of catalog.exercises) {
    if (!exercise.name.trim()) errors.push(`${exercise.id} is missing name.`);
    if (exercise.movementPatternIds.length === 0) errors.push(`${exercise.id} is missing movement patterns.`);
    if (exercise.primaryMuscleIds.length === 0) errors.push(`${exercise.id} is missing primary muscles.`);
    if (exercise.equipmentIds.length === 0) errors.push(`${exercise.id} is missing equipment.`);
    if (!prescriptionIds.has(exercise.defaultPrescriptionTemplateId)) errors.push(`${exercise.id} references missing prescription template.`);
    for (const id of exercise.movementPatternIds) if (!patternIds.has(id)) errors.push(`${exercise.id} references missing pattern ${id}.`);
    for (const id of [...exercise.primaryMuscleIds, ...exercise.secondaryMuscleIds]) if (!muscleIds.has(id)) errors.push(`${exercise.id} references missing muscle ${id}.`);
    for (const id of exercise.equipmentIds) if (!equipmentIds.has(id)) errors.push(`${exercise.id} references missing equipment ${id}.`);
    for (const id of exercise.workoutTypeIds) if (!workoutTypeIds.has(id)) errors.push(`${exercise.id} references missing workout type ${id}.`);
    for (const id of exercise.goalIds) if (!goalIds.has(id)) errors.push(`${exercise.id} references missing goal ${id}.`);
    for (const id of exercise.trackingMetricIds) if (!trackingMetricIds.has(id)) errors.push(`${exercise.id} references missing tracking metric ${id}.`);
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

  return { valid: errors.length === 0, errors };
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
    .filter((template) => template.workoutTypeId === workoutTypeId || template.goalIds.includes(input.goalId))
    .filter((template) => template.experienceLevels.includes(input.experienceLevel))
    .filter((template) => input.durationMinutes >= template.minDurationMinutes)
    .sort((a, b) => {
      const aGoal = a.goalIds.includes(input.goalId) ? 0 : 1;
      const bGoal = b.goalIds.includes(input.goalId) ? 0 : 1;
      if (aGoal !== bGoal) return aGoal - bGoal;
      return Math.abs(a.defaultDurationMinutes - input.durationMinutes) - Math.abs(b.defaultDurationMinutes - input.durationMinutes);
    });

  return compatible[0] ?? null;
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
  return findById(catalog.prescriptionTemplates, exercise.defaultPrescriptionTemplateId)
    ?? findById(catalog.prescriptionTemplates, block.prescriptionTemplateId)
    ?? catalog.prescriptionTemplates[0]!;
}

function buildExercisePrescription(input: {
  exercise: Exercise;
  slot: SessionTemplateMovementSlot;
  block: SessionTemplateBlock;
  blockExerciseCount: number;
  blockDurationMinutes: number;
  catalog: WorkoutProgrammingCatalog;
}): GeneratedExercisePrescription {
  const template = prescriptionFor(input.exercise, input.block, input.catalog);
  const timedBlock = template.defaultDurationMinutes != null || template.defaultDurationSeconds != null;
  const durationMinutes = template.defaultDurationMinutes != null
    ? Math.max(1, Math.floor(input.blockDurationMinutes / Math.max(1, input.blockExerciseCount)))
    : null;
  const durationSeconds = template.defaultDurationSeconds ?? null;
  const sets = timedBlock && template.defaultSets == null ? null : template.defaultSets ?? 2;

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
      targetRpe: template.defaultRpe,
      restSeconds: template.restSeconds,
      tempo: template.tempo ?? null,
      intensityCue: template.intensityCue,
    },
    trackingMetricIds: input.exercise.trackingMetricIds,
    explanation: `${input.exercise.name} fills ${input.slot.movementPatternIds.join('/')} with compatible equipment and safety filters.`,
  };
}

function selectExerciseForSlot(input: {
  slot: SessionTemplateMovementSlot;
  template: SessionTemplate;
  workoutTypeId: string;
  request: GenerateSingleWorkoutInput;
  usedExerciseIds: Set<string>;
  catalog: WorkoutProgrammingCatalog;
}): Exercise | null {
  const exerciseQuery = {
    movementPatternIds: input.slot.movementPatternIds,
    equipmentIds: input.request.equipmentIds,
    excludedSafetyFlags: input.request.safetyFlags ?? [],
    experienceLevel: input.request.experienceLevel,
  };
  const candidates = queryWorkoutExercises(input.slot.blockId === 'main'
    ? {
      ...exerciseQuery,
      workoutTypeIds: [input.workoutTypeId, input.template.workoutTypeId],
      goalIds: [input.request.goalId],
    }
    : exerciseQuery, input.catalog)
    .filter((exercise) => !input.usedExerciseIds.has(exercise.id))
    .filter((exercise) => !(input.slot.avoidExerciseIds ?? []).includes(exercise.id))
    .sort((a, b) => {
      const aPreferred = input.slot.preferredExerciseIds?.includes(a.id) ? 0 : 1;
      const bPreferred = input.slot.preferredExerciseIds?.includes(b.id) ? 0 : 1;
      if (aPreferred !== bPreferred) return aPreferred - bPreferred;
      const aGoal = a.goalIds.includes(input.request.goalId) ? 0 : 1;
      const bGoal = b.goalIds.includes(input.request.goalId) ? 0 : 1;
      if (aGoal !== bGoal) return aGoal - bGoal;
      return a.intensity.localeCompare(b.intensity);
    });

  return candidates[0] ?? null;
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

  const workoutTypeId = resolveWorkoutTypeForGoal(request.goalId);
  if (!workoutTypeId) {
    throw new Error(`Unknown training goal: ${request.goalId}.`);
  }

  const template = selectSessionTemplate(request, workoutTypeId, catalog);
  if (!template) {
    throw new Error(`No session template can satisfy ${request.goalId} in ${request.durationMinutes} minutes.`);
  }

  const usedExerciseIds = new Set<string>();
  const blocks: GeneratedWorkoutBlock[] = template.blocks.map((blockTemplate) => {
    const slots = template.movementSlots
      .filter((slotItem) => slotItem.blockId === blockTemplate.id)
      .sort((a, b) => a.order - b.order);
    const duration = blockDuration(template, blockTemplate, request.durationMinutes);
    const selectedExercises = slots
      .map((slotItem) => {
        const exercise = selectExerciseForSlot({
          slot: slotItem,
          template,
          workoutTypeId,
          request,
          usedExerciseIds,
          catalog,
        });
        if (!exercise) {
          if (slotItem.optional) return null;
          throw new Error(`No safe exercise found for movement slot ${slotItem.id}.`);
        }
        if (blockTemplate.kind === 'main') {
          usedExerciseIds.add(exercise.id);
        }
        return { slot: slotItem, exercise };
      })
      .filter((item): item is { slot: SessionTemplateMovementSlot; exercise: Exercise } => item !== null);

    return {
      id: blockTemplate.id,
      kind: blockTemplate.kind,
      title: blockTemplate.title,
      estimatedDurationMinutes: duration,
      exercises: selectedExercises.map((selected) => buildExercisePrescription({
        exercise: selected.exercise,
        slot: selected.slot,
        block: blockTemplate,
        blockExerciseCount: selectedExercises.length,
        blockDurationMinutes: duration,
        catalog,
      })),
    };
  });

  const estimatedDurationMinutes = blocks.reduce((sum, blockItem) => sum + blockItem.estimatedDurationMinutes, 0);
  const trackingMetricIds = unique(blocks.flatMap((blockItem) => blockItem.exercises.flatMap((exercise) => exercise.trackingMetricIds)));
  const selectedEquipment = unique(blocks.flatMap((blockItem) => blockItem.exercises.flatMap((exercise) => exercise.equipmentIds)));
  const explanations = [
    `${template.label} was selected because it maps ${request.goalId} to ${workoutTypeId}.`,
    `Exercise selection respected available equipment: ${request.equipmentIds.length ? request.equipmentIds.join(', ') : 'bodyweight only'}.`,
    safetyFlags.length
      ? `Safety filters were applied: ${safetyFlags.join(', ')}.`
      : 'No safety flags were supplied, so the generator still used conservative MVP prescriptions.',
  ];

  return {
    schemaVersion: 'generated-workout-v1',
    workoutTypeId,
    goalId: request.goalId,
    templateId: template.id,
    formatId: template.formatId,
    requestedDurationMinutes: request.durationMinutes,
    estimatedDurationMinutes,
    equipmentIds: selectedEquipment,
    safetyFlags,
    blocks,
    trackingMetricIds,
    successCriteria: template.successCriteria,
    explanations,
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
  const errors: string[] = [];
  const exerciseIds = new Set(catalog.exercises.map((exercise) => exercise.id));
  const trackingMetricIds = new Set(catalog.trackingMetrics.map((metric) => metric.id));
  const equipmentCatalog = new Map(catalog.equipmentTypes.map((equipment): [string, EquipmentType] => [equipment.id, equipment]));

  if (workout.schemaVersion !== 'generated-workout-v1') errors.push('Invalid generated workout schema version.');
  if (!findById(catalog.workoutTypes, workout.workoutTypeId)) errors.push(`Unknown workout type ${workout.workoutTypeId}.`);
  if (!findById(catalog.trainingGoals, workout.goalId)) errors.push(`Unknown goal ${workout.goalId}.`);
  if (!findById(catalog.sessionTemplates, workout.templateId)) errors.push(`Unknown session template ${workout.templateId}.`);
  if (workout.estimatedDurationMinutes > workout.requestedDurationMinutes * 1.1) errors.push('Estimated duration exceeds 110 percent of requested time.');
  if (workout.blocks.length === 0) errors.push('Workout has no blocks.');
  for (const kind of GENERATED_WORKOUT_SCHEMA.blockKinds) {
    if (!workout.blocks.some((block) => block.kind === kind)) errors.push(`Workout is missing ${kind} block.`);
  }
  if (workout.trackingMetricIds.length === 0) errors.push('Workout is missing tracking metrics.');
  if (workout.successCriteria.length === 0) errors.push('Workout is missing success criteria.');

  for (const id of workout.equipmentIds) {
    if (!equipmentCatalog.has(id)) errors.push(`Workout references unknown equipment ${id}.`);
  }
  for (const metricId of workout.trackingMetricIds) {
    if (!trackingMetricIds.has(metricId)) errors.push(`Workout references unknown tracking metric ${metricId}.`);
  }

  for (const block of workout.blocks) {
    if (block.estimatedDurationMinutes <= 0) errors.push(`${block.id} has invalid duration.`);
    if (block.exercises.length === 0) errors.push(`${block.id} has no exercises.`);
    for (const exercise of block.exercises) {
      if (!exerciseIds.has(exercise.exerciseId)) errors.push(`${exercise.exerciseId} does not exist in exercise catalog.`);
      if (exercise.prescription.targetRpe < 1 || exercise.prescription.targetRpe > 10) errors.push(`${exercise.exerciseId} has invalid target RPE.`);
      if (exercise.prescription.restSeconds < 0) errors.push(`${exercise.exerciseId} has invalid rest seconds.`);
      if (
        exercise.prescription.sets == null
        && exercise.prescription.durationSeconds == null
        && exercise.prescription.durationMinutes == null
      ) {
        errors.push(`${exercise.exerciseId} is missing complete prescription fields.`);
      }
      if (exercise.trackingMetricIds.length === 0) errors.push(`${exercise.exerciseId} is missing tracking metrics.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
