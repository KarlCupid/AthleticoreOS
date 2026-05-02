import { workoutProgrammingCatalog } from './seedData.ts';
import { validateGeneratedWorkoutRuntime } from './catalogValidation.ts';
import type {
  BalancePrescriptionPayload,
  Exercise,
  GeneratedExercisePrescription,
  GeneratedWorkout,
  PrescriptionPayload,
  WorkoutExperienceLevel,
  WorkoutProgrammingCatalog,
  WorkoutValidationResult,
} from './types.ts';

const EXPERIENCE_RANK: Record<WorkoutExperienceLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const REQUIRED_DOMAIN_RULE_IDS = [
  'workout_type_consistency',
  'training_goal_consistency',
  'workout_format_consistency',
  'intensity_model_consistency',
  'volume_consistency',
  'rest_guidance_completeness',
  'exercise_eligibility',
  'equipment_compatibility',
  'experience_level_compatibility',
  'safety_flag_compatibility',
  'pain_flag_compatibility',
  'movement_pattern_balance',
  'fatigue_management',
  'progression_logic',
  'tracking_metric_availability',
  'description_completeness',
  'warmup_requirements',
  'cooldown_requirements',
  'recovery_session_constraints',
  'power_session_constraints',
  'hiit_constraints',
  'mobility_constraints',
  'strength_training_constraints',
  'cardio_constraints',
  'balance_training_constraints',
] as const;

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

const OPTIONAL_EQUIPMENT_IDS = new Set(['bodyweight', 'mat', 'open_space', 'track_or_road', 'bench', 'plyo_box']);

interface IssueInput {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  correction: string;
  userMessage: string;
  metadata?: Record<string, unknown>;
}

export function createWorkoutValidationResult(input?: {
  errors?: string[];
  warnings?: string[];
  suggestedCorrections?: string[];
  userFacingMessages?: string[];
  failedRuleIds?: string[];
  decisionTrace?: WorkoutValidationResult['decisionTrace'];
}): WorkoutValidationResult {
  const errors = input?.errors ?? [];
  const warnings = input?.warnings ?? [];
  const failedRuleIds = Array.from(new Set(input?.failedRuleIds ?? []));
  return {
    valid: errors.length === 0,
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestedCorrections: input?.suggestedCorrections ?? [],
    userFacingMessages: input?.userFacingMessages ?? [],
    failedRuleIds,
    decisionTrace: input?.decisionTrace ?? [],
  };
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function exerciseMap(catalog: WorkoutProgrammingCatalog): Map<string, Exercise> {
  return new Map(catalog.exercises.map((exercise) => [exercise.id, exercise]));
}

function allExercises(workout: GeneratedWorkout): GeneratedExercisePrescription[] {
  return workout.blocks.flatMap((block) => block.exercises);
}

function mainExercises(workout: GeneratedWorkout): GeneratedExercisePrescription[] {
  return workout.blocks.filter((block) => block.kind === 'main').flatMap((block) => block.exercises);
}

function equipmentCompatible(
  source: Exercise | undefined,
  generated: GeneratedExercisePrescription,
  workoutEquipmentIds: readonly string[],
): boolean {
  const available = new Set(['bodyweight', ...workoutEquipmentIds]);
  const equipmentIds = source?.equipmentRequiredIds?.length
    ? source.equipmentRequiredIds
    : source?.equipmentIds ?? generated.equipmentIds;
  if (equipmentIds.length === 0) return false;
  if (equipmentIds.includes('bodyweight')) return true;
  if (equipmentIds.every((id) => OPTIONAL_EQUIPMENT_IDS.has(id))) return true;

  const loadOptions = equipmentIds.filter((id) => LOAD_EQUIPMENT_IDS.has(id));
  const requiredSupport = equipmentIds.filter((id) => !LOAD_EQUIPMENT_IDS.has(id) && !OPTIONAL_EQUIPMENT_IDS.has(id));
  const hasLoadOption = loadOptions.length === 0 || loadOptions.some((id) => available.has(id));
  const hasSupport = requiredSupport.every((id) => available.has(id));
  return hasLoadOption && hasSupport;
}

function isRunningExposure(source: Exercise | undefined, exercise: GeneratedExercisePrescription): boolean {
  const text = `${exercise.exerciseId} ${exercise.name}`.toLowerCase();
  return text.includes('run')
    || text.includes('sprint')
    || Boolean(source?.equipmentIds.includes('track_or_road') && exercise.prescription.targetRpe > 3);
}

function isOlympicLift(source: Exercise | undefined, exercise: GeneratedExercisePrescription): boolean {
  const text = `${exercise.exerciseId} ${exercise.name} ${source?.summary ?? ''}`.toLowerCase();
  return ['olympic', 'clean', 'snatch', 'jerk'].some((term) => text.includes(term));
}

function isHighSpineLoad(source: Exercise | undefined): boolean {
  return Boolean(source && (
    source.spineLoading === 'high'
    || source.spineLoading === 'axial'
    || source.spineLoading === 'shear'
    || source.contraindicationFlags.includes('back_caution')
  ));
}

function isAggressiveOverhead(source: Exercise | undefined, exercise: GeneratedExercisePrescription): boolean {
  const text = `${exercise.exerciseId} ${exercise.name}`.toLowerCase();
  return Boolean(
    text.includes('overhead')
    || source?.movementPatternIds.includes('vertical_push')
    || source?.contraindicationFlags.includes('shoulder_caution'),
  ) && exercise.prescription.targetRpe >= 5;
}

function isLoadedWristFloorWork(source: Exercise | undefined, exercise: GeneratedExercisePrescription): boolean {
  return Boolean(
    source?.contraindicationFlags.includes('wrist_caution')
    || (source?.setupType === 'floor' && (source.wristDemand === 'moderate' || source.wristDemand === 'high') && exercise.prescription.targetRpe >= 4),
  );
}

function allowedMainPayloadKinds(workoutTypeId: string): PrescriptionPayload['kind'][] {
  if (['strength', 'full_body_strength', 'upper_strength', 'lower_strength', 'bodyweight_strength', 'hypertrophy'].includes(workoutTypeId)) {
    return ['resistance'];
  }
  if (workoutTypeId === 'zone2_cardio') return ['cardio'];
  if (workoutTypeId === 'mobility') return ['mobility', 'flexibility'];
  if (workoutTypeId === 'recovery') return ['recovery', 'mobility', 'flexibility', 'balance'];
  if (workoutTypeId === 'low_impact_conditioning') return ['conditioning', 'interval', 'cardio'];
  if (workoutTypeId === 'conditioning') return ['conditioning', 'interval'];
  if (workoutTypeId === 'core_durability') return ['balance', 'resistance'];
  if (workoutTypeId === 'boxing_support') return ['power', 'conditioning', 'balance', 'resistance'];
  if (workoutTypeId === 'power') return ['power'];
  return ['resistance', 'cardio', 'interval', 'mobility', 'flexibility', 'balance', 'recovery', 'power', 'conditioning'];
}

function isHighFatiguePayload(payload: PrescriptionPayload): boolean {
  if ((payload.kind === 'conditioning' || payload.kind === 'interval') && payload.fatigueRisk === 'high') return true;
  if (payload.kind === 'power' && !payload.lowFatigue) return true;
  return false;
}

export function validateWorkoutDomain(
  workout: GeneratedWorkout,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): WorkoutValidationResult {
  const runtimeValidation = validateGeneratedWorkoutRuntime(workout, catalog);
  if (!runtimeValidation.valid) {
    return createWorkoutValidationResult({
      errors: runtimeValidation.errors.map((issue) => `${issue.recordType}${issue.id ? ` ${issue.id}` : ''}.${issue.field}: ${issue.message}`),
      warnings: runtimeValidation.warnings.map((issue) => `${issue.recordType}${issue.id ? ` ${issue.id}` : ''}.${issue.field}: ${issue.message}`),
      suggestedCorrections: runtimeValidation.errors.map((issue) => issue.suggestedCorrection),
      userFacingMessages: ['This workout payload is incomplete or malformed and needs to be regenerated before use.'],
      failedRuleIds: ['runtime_schema_validation'],
      decisionTrace: runtimeValidation.errors.map((issue) => ({
        ruleId: 'runtime_schema_validation',
        status: 'failed',
        message: `${issue.recordType}.${issue.field}: ${issue.message}`,
        metadata: issue as unknown as Record<string, unknown>,
      })),
    });
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestedCorrections: string[] = [];
  const userFacingMessages: string[] = [];
  const failedRuleIds: string[] = [];
  const decisionTrace: WorkoutValidationResult['decisionTrace'] = [];
  const sources = exerciseMap(catalog);
  const trackingMetricIds = new Set(catalog.trackingMetrics.map((metric) => metric.id));
  const workoutTypeIds = new Set(catalog.workoutTypes.map((type) => type.id));
  const goalIds = new Set(catalog.trainingGoals.map((goal) => goal.id));
  const formatIds = new Set(catalog.workoutFormats.map((format) => format.id));
  const template = catalog.sessionTemplates.find((item) => item.id === workout.templateId);
  const selected = allExercises(workout);
  const main = mainExercises(workout);

  function recordIssue(input: IssueInput): void {
    if (input.severity === 'error') {
      errors.push(input.message);
      failedRuleIds.push(input.ruleId);
    } else {
      warnings.push(input.message);
    }
    suggestedCorrections.push(input.correction);
    userFacingMessages.push(input.userMessage);
    decisionTrace.push({
      ruleId: input.ruleId,
      status: input.severity === 'error' ? 'failed' : 'warning',
      message: input.message,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }

  function runRule(ruleId: string, check: () => void): void {
    const traceCount = decisionTrace.length;
    check();
    if (decisionTrace.length === traceCount) {
      decisionTrace.push({ ruleId, status: 'passed', message: `${ruleId} passed.` });
    }
  }

  runRule('workout_type_consistency', () => {
    if (!workoutTypeIds.has(workout.workoutTypeId)) {
      recordIssue({
        ruleId: 'workout_type_consistency',
        severity: 'error',
        message: `Unknown workout type ${workout.workoutTypeId}.`,
        correction: 'Use a workoutTypeId from the workout type taxonomy.',
        userMessage: 'This workout needs a valid training category before it can be shown.',
      });
    }
    if (template && template.workoutTypeId !== workout.workoutTypeId) {
      recordIssue({
        ruleId: 'workout_type_consistency',
        severity: 'error',
        message: `${workout.templateId} is a ${template.workoutTypeId} template but workout is labeled ${workout.workoutTypeId}.`,
        correction: `Set workoutTypeId to ${template.workoutTypeId} or select a matching session template.`,
        userMessage: 'The session label and template do not match yet, so the plan needs a quick correction.',
      });
    }
  });

  runRule('training_goal_consistency', () => {
    if (!goalIds.has(workout.goalId)) {
      recordIssue({
        ruleId: 'training_goal_consistency',
        severity: 'error',
        message: `Unknown training goal ${workout.goalId}.`,
        correction: 'Use a goalId from the training goal taxonomy.',
        userMessage: 'This workout needs a valid goal before it can be recommended.',
      });
    }
    if (template && !template.goalIds.includes(workout.goalId)) {
      recordIssue({
        ruleId: 'training_goal_consistency',
        severity: 'error',
        message: `${workout.templateId} does not support goal ${workout.goalId}.`,
        correction: 'Choose a session template whose goalIds include the workout goal.',
        userMessage: 'The workout structure does not match the selected goal yet.',
      });
    }
  });

  runRule('workout_format_consistency', () => {
    if (!formatIds.has(workout.formatId)) {
      recordIssue({
        ruleId: 'workout_format_consistency',
        severity: 'error',
        message: `Unknown workout format ${workout.formatId}.`,
        correction: 'Use a formatId from the workout format taxonomy.',
        userMessage: 'This workout needs a valid format before it can be shown.',
      });
    }
    if (template && template.formatId !== workout.formatId) {
      recordIssue({
        ruleId: 'workout_format_consistency',
        severity: 'error',
        message: `${workout.templateId} expects ${template.formatId} format but workout is ${workout.formatId}.`,
        correction: `Set formatId to ${template.formatId} or choose a matching template.`,
        userMessage: 'The workout format and template are out of sync.',
      });
    }
  });

  runRule('intensity_model_consistency', () => {
    const allowed = allowedMainPayloadKinds(workout.workoutTypeId);
    for (const exercise of main) {
      if (exercise.prescription.kind !== exercise.prescription.payload.kind) {
        recordIssue({
          ruleId: 'intensity_model_consistency',
          severity: 'error',
          message: `${exercise.exerciseId} prescription kind does not match payload kind.`,
          correction: 'Regenerate the prescription from a template whose kind matches its payload.',
          userMessage: 'One exercise has mismatched intensity details and needs to be rebuilt.',
        });
      }
      if (!allowed.includes(exercise.prescription.payload.kind)) {
        recordIssue({
          ruleId: 'intensity_model_consistency',
          severity: 'error',
          message: `${workout.workoutTypeId} main work cannot use ${exercise.prescription.payload.kind} prescription for ${exercise.exerciseId}.`,
          correction: `Use one of these payload kinds for ${workout.workoutTypeId}: ${allowed.join(', ')}.`,
          userMessage: 'The main work does not match the intended session type yet.',
        });
      }
    }
  });

  runRule('volume_consistency', () => {
    for (const exercise of selected) {
      if (exercise.prescription.sets == null && exercise.prescription.durationSeconds == null && exercise.prescription.durationMinutes == null) {
        recordIssue({
          ruleId: 'volume_consistency',
          severity: 'error',
          message: `${exercise.exerciseId} is missing sets or duration.`,
          correction: 'Add sets, durationSeconds, or durationMinutes based on the prescription kind.',
          userMessage: 'One exercise is missing the amount of work to do.',
        });
      }
      if (exercise.prescription.sets != null && exercise.prescription.sets <= 0) {
        recordIssue({
          ruleId: 'volume_consistency',
          severity: 'error',
          message: `${exercise.exerciseId} has non-positive sets.`,
          correction: 'Use at least one set or switch to a timed prescription.',
          userMessage: 'One exercise has an invalid work amount.',
        });
      }
    }
  });

  runRule('rest_guidance_completeness', () => {
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (payload.kind === 'resistance' && (!payload.restSecondsRange || exercise.prescription.restSeconds <= 0)) {
        recordIssue({
          ruleId: 'rest_guidance_completeness',
          severity: 'error',
          message: `${exercise.exerciseId} resistance work is missing rest guidance.`,
          correction: 'Add a restSecondsRange and positive restSeconds for strength or hypertrophy work.',
          userMessage: 'Strength work needs rest guidance so the next set is strong, not rushed.',
        });
      }
      if (payload.kind === 'power' && exercise.prescription.restSeconds < 90) {
        recordIssue({
          ruleId: 'rest_guidance_completeness',
          severity: 'error',
          message: `${exercise.exerciseId} power work has rest below 90 seconds.`,
          correction: 'Use at least 90 seconds, and usually full recovery, for power work.',
          userMessage: 'Power work needs more rest so speed and technique stay crisp.',
        });
      }
    }
  });

  runRule('exercise_eligibility', () => {
    for (const exercise of selected) {
      const source = sources.get(exercise.exerciseId);
      if (!source) {
        recordIssue({
          ruleId: 'exercise_eligibility',
          severity: 'error',
          message: `${exercise.exerciseId} does not exist in the exercise catalog.`,
          correction: 'Select an exercise from programming_exercises or add the missing exercise ontology first.',
          userMessage: 'One exercise is not available in the exercise library yet.',
        });
        continue;
      }
      if (exercise.blockId === 'main' && !source.workoutTypeIds.includes(workout.workoutTypeId) && !source.goalIds.includes(workout.goalId)) {
        recordIssue({
          ruleId: 'exercise_eligibility',
          severity: 'error',
          message: `${exercise.exerciseId} is not eligible for ${workout.workoutTypeId}/${workout.goalId}.`,
          correction: 'Swap to an exercise whose workoutTypeIds or goalIds match the session.',
          userMessage: 'One exercise does not fit this workout goal.',
        });
      }
    }
  });

  runRule('equipment_compatibility', () => {
    for (const exercise of selected) {
      const source = sources.get(exercise.exerciseId);
      if (!equipmentCompatible(source, exercise, workout.equipmentIds)) {
        recordIssue({
          ruleId: 'equipment_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} requires equipment not present in this workout.`,
          correction: 'Swap to a bodyweight or available-equipment substitute with the same movement intent.',
          userMessage: 'One exercise needs equipment that is not available for this session.',
        });
      }
    }
  });

  runRule('experience_level_compatibility', () => {
    if (!workout.experienceLevel) return;
    const rank = EXPERIENCE_RANK[workout.experienceLevel];
    for (const exercise of selected) {
      const source = sources.get(exercise.exerciseId);
      if (!source) continue;
      if (EXPERIENCE_RANK[source.minExperience] > rank || (workout.experienceLevel === 'beginner' && source.movementPatternIds.includes('jump_land') && source.technicalComplexity !== 'low')) {
        recordIssue({
          ruleId: 'experience_level_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} requires ${source.minExperience} experience but workout is for ${workout.experienceLevel}.`,
          correction: 'Use a regression with beginner-friendly complexity before progressing to this exercise.',
          userMessage: 'One exercise is too advanced for this athlete right now.',
        });
      }
    }
  });

  runRule('safety_flag_compatibility', () => {
    for (const exercise of selected) {
      const source = sources.get(exercise.exerciseId);
      if (!source) continue;
      const contraindications = source.contraindicationFlags.filter((flag) => workout.safetyFlags.includes(flag));
      if (contraindications.length > 0) {
        recordIssue({
          ruleId: 'safety_flag_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} conflicts with safety flags: ${contraindications.join(', ')}.`,
          correction: 'Use a substitution that removes the flagged joint, impact, or loading constraint.',
          userMessage: 'One exercise conflicts with a current safety restriction and should be swapped.',
          metadata: { exerciseId: exercise.exerciseId, contraindications },
        });
      }
      if (workout.safetyFlags.includes('no_jumping') && source.movementPatternIds.includes('jump_land')) {
        recordIssue({
          ruleId: 'safety_flag_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} uses jump/land mechanics while no_jumping is active.`,
          correction: 'Replace jump/land work with sled, bike, step-up, or low-impact power alternatives.',
          userMessage: 'Jumping is restricted today, so this exercise needs a low-impact substitute.',
        });
      }
      if (workout.safetyFlags.includes('no_running') && isRunningExposure(source, exercise)) {
        recordIssue({
          ruleId: 'safety_flag_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} includes running exposure while no_running is active.`,
          correction: 'Use bike, rower, sled, or walking-only recovery work instead of running.',
          userMessage: 'Running is restricted today, so this needs a non-running option.',
        });
      }
    }
  });

  runRule('pain_flag_compatibility', () => {
    for (const exercise of selected) {
      const source = sources.get(exercise.exerciseId);
      if (workout.safetyFlags.includes('back_caution') && isHighSpineLoad(source) && exercise.prescription.targetRpe >= 5) {
        recordIssue({
          ruleId: 'pain_flag_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} uses heavy spinal loading with back_caution active.`,
          correction: 'Swap to glute bridge, supported squat, machine work, or unloaded hinge patterning.',
          userMessage: 'Back caution is active, so heavy spine-loaded work should be replaced today.',
        });
      }
      if (workout.safetyFlags.includes('shoulder_caution') && isAggressiveOverhead(source, exercise)) {
        recordIssue({
          ruleId: 'pain_flag_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} is aggressive overhead or shoulder-loaded work with shoulder_caution active.`,
          correction: 'Use landmine-angle pressing, rowing, band pull-aparts, or cuff work instead.',
          userMessage: 'Shoulder caution is active, so this pressing angle should be changed.',
        });
      }
      if (workout.safetyFlags.includes('wrist_caution') && isLoadedWristFloorWork(source, exercise) && (exercise.substitutions?.length ?? 0) === 0) {
        recordIssue({
          ruleId: 'pain_flag_compatibility',
          severity: 'error',
          message: `${exercise.exerciseId} loads the wrist without a listed alternative while wrist_caution is active.`,
          correction: 'Add a neutral-wrist or non-floor substitute such as dead bug, pressdown, or incline variation.',
          userMessage: 'Wrist caution is active, so this needs a friendlier option or a substitute.',
        });
      }
    }
  });

  runRule('movement_pattern_balance', () => {
    const patterns = new Set(main.flatMap((exercise) => exercise.movementPatternIds));
    const hasLower = ['squat', 'hinge', 'lunge'].some((pattern) => patterns.has(pattern));
    const hasUpper = ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull'].some((pattern) => patterns.has(pattern));
    const hasCore = ['anti_extension', 'anti_rotation', 'carry', 'balance'].some((pattern) => patterns.has(pattern));
    if (['strength', 'full_body_strength', 'bodyweight_strength'].includes(workout.workoutTypeId) && (!hasLower || !hasUpper || !hasCore)) {
      recordIssue({
        ruleId: 'movement_pattern_balance',
        severity: 'warning',
        message: `${workout.workoutTypeId} is missing lower, upper, or trunk pattern balance.`,
        correction: 'Add one compatible lower-body, upper-body, and trunk/control slot when building full-body strength.',
        userMessage: 'This strength session may be more balanced with one lower, one upper, and one trunk pattern.',
      });
    }
  });

  runRule('fatigue_management', () => {
    for (const exercise of main) {
      const source = sources.get(exercise.exerciseId);
      if (workout.formatId === 'amrap' && (isOlympicLift(source, exercise) || source?.technicalComplexity === 'coach_required' || source?.technicalComplexity === 'high')) {
        recordIssue({
          ruleId: 'fatigue_management',
          severity: 'error',
          message: `${exercise.exerciseId} is too technical for fatigue-based AMRAP work.`,
          correction: 'Use AMRAP only with low-complexity, repeatable movements or change the format to quality sets.',
          userMessage: 'This exercise is too technical for fatigue-based AMRAP work.',
        });
      }
      if (workout.workoutTypeId === 'recovery' && isHighFatiguePayload(exercise.prescription.payload)) {
        recordIssue({
          ruleId: 'fatigue_management',
          severity: 'error',
          message: `${exercise.exerciseId} adds high fatigue inside a recovery session.`,
          correction: 'Replace high-fatigue intervals with easy mobility, breathwork, or Zone 1-2 circulation.',
          userMessage: 'Recovery work should reduce stress, so this hard element needs to come out.',
        });
      }
    }
  });

  runRule('progression_logic', () => {
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (payload.kind === 'resistance' && payload.progressionRuleIds.length === 0) {
        recordIssue({
          ruleId: 'progression_logic',
          severity: 'error',
          message: `${exercise.exerciseId} resistance prescription has no progression rule.`,
          correction: 'Attach a progression rule such as linear load, double progression, or autoregulated RPE/RIR progression.',
          userMessage: 'This strength prescription needs a clear next-step rule.',
        });
      }
      if (payload.kind === 'cardio' && payload.progressionRuleIds.length === 0) {
        recordIssue({
          ruleId: 'progression_logic',
          severity: 'error',
          message: `${exercise.exerciseId} cardio prescription has no duration or frequency progression.`,
          correction: 'Attach a duration or frequency progression rule for aerobic work.',
          userMessage: 'This cardio prescription needs a safe progression path.',
        });
      }
    }
  });

  runRule('tracking_metric_availability', () => {
    const exerciseMetricIds = selected.flatMap((exercise) => exercise.trackingMetricIds);
    for (const metricId of unique([...workout.trackingMetricIds, ...exerciseMetricIds])) {
      if (!trackingMetricIds.has(metricId)) {
        recordIssue({
          ruleId: 'tracking_metric_availability',
          severity: 'error',
          message: `Unknown tracking metric ${metricId}.`,
          correction: 'Use a tracking metric from the workout programming taxonomy.',
          userMessage: 'One tracking field is not available yet.',
        });
      }
    }
    for (const exercise of selected) {
      if (exercise.trackingMetricIds.length === 0) {
        recordIssue({
          ruleId: 'tracking_metric_availability',
          severity: 'error',
          message: `${exercise.exerciseId} has no tracking metrics.`,
          correction: 'Attach at least one metric that proves completion, effort, quality, or symptoms.',
          userMessage: 'One exercise needs a tracking field so progress can be explained.',
        });
      }
    }
  });

  runRule('description_completeness', () => {
    const description = workout.description;
    if (!description
      || !hasText(description.intro)
      || !hasText(description.effortExplanation)
      || !hasText(description.scalingDown)
      || !hasText(description.scalingUp)
      || !hasText(description.completionMessage)
      || !hasText(description.nextSessionNote)
      || description.safetyNotes.length === 0
      || description.successCriteria.length === 0
    ) {
      recordIssue({
        ruleId: 'description_completeness',
        severity: 'error',
        message: 'Workout is missing complete display-ready coaching language.',
        correction: 'Generate the workout description before returning the workout.',
        userMessage: 'The workout needs complete coaching notes before it is shown.',
      });
    }
  });

  runRule('warmup_requirements', () => {
    const warmup = workout.blocks.find((block) => block.kind === 'warmup');
    if (!warmup || warmup.exercises.length === 0 || warmup.estimatedDurationMinutes < 3) {
      recordIssue({
        ruleId: 'warmup_requirements',
        severity: 'error',
        message: 'Workout is missing a sufficient warm-up.',
        correction: 'Add a warm-up block with at least one prep exercise and three minutes.',
        userMessage: 'This workout needs a short warm-up before the main work.',
      });
    }
  });

  runRule('cooldown_requirements', () => {
    const cooldown = workout.blocks.find((block) => block.kind === 'cooldown');
    if (!cooldown || cooldown.exercises.length === 0 || cooldown.estimatedDurationMinutes < 3) {
      recordIssue({
        ruleId: 'cooldown_requirements',
        severity: 'error',
        message: 'Workout is missing a sufficient cooldown.',
        correction: 'Add a cooldown block with breathing, easy mobility, or easy circulation.',
        userMessage: 'This workout needs a short cooldown to downshift safely.',
      });
    }
  });

  runRule('recovery_session_constraints', () => {
    if (workout.workoutTypeId !== 'recovery') return;
    for (const exercise of main) {
      if (exercise.prescription.targetRpe > 3 || ['interval', 'conditioning', 'power'].includes(exercise.prescription.payload.kind)) {
        recordIssue({
          ruleId: 'recovery_session_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} is too intense for recovery.`,
          correction: 'Use recovery, mobility, flexibility, balance, or easy aerobic prescriptions capped at RPE 3.',
          userMessage: 'Recovery sessions should stay easy and restorative.',
        });
      }
    }
  });

  runRule('power_session_constraints', () => {
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (payload.kind === 'power' && (!payload.lowFatigue || payload.fullRecoverySeconds.min == null || payload.fullRecoverySeconds.min < 90 || exercise.prescription.restSeconds < 90)) {
        recordIssue({
          ruleId: 'power_session_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} power work lacks low-fatigue full-recovery constraints.`,
          correction: 'Use low reps, low fatigue, explosive intent, and at least 90 seconds rest.',
          userMessage: 'Power work needs more recovery and a quality gate.',
        });
      }
    }
  });

  runRule('hiit_constraints', () => {
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (payload.kind !== 'interval' && payload.kind !== 'conditioning') continue;
      const validIntervals = Boolean(payload.workIntervalSeconds && payload.restIntervalSeconds && payload.rounds && payload.targetIntensity.RPE);
      if (!validIntervals || workout.workoutTypeId === 'recovery') {
        recordIssue({
          ruleId: 'hiit_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} HIIT/conditioning prescription is missing work, rest, rounds, intensity, or is mislabeled as recovery.`,
          correction: 'Add work/rest/rounds/intensity and use a conditioning workout type, not recovery.',
          userMessage: 'Intervals need clear work, rest, rounds, and a matching session label.',
        });
      }
    }
  });

  runRule('mobility_constraints', () => {
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (payload.kind === 'mobility' && (payload.targetJoints.length === 0 || !payload.rangeOfMotionIntent.trim() || !payload.painFreeRange)) {
        recordIssue({
          ruleId: 'mobility_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} mobility work is missing target joint, ROM intent, or pain-free range.`,
          correction: 'Add targetJoints, rangeOfMotionIntent, and painFreeRange=true.',
          userMessage: 'Mobility work needs a target area and a pain-free range.',
        });
      }
    }
  });

  runRule('strength_training_constraints', () => {
    if (!['strength', 'full_body_strength', 'upper_strength', 'lower_strength', 'bodyweight_strength', 'hypertrophy'].includes(workout.workoutTypeId)) return;
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (payload.kind !== 'resistance') continue;
      if (!payload.restSecondsRange || !payload.loadGuidance.trim() || !payload.effortGuidance.trim()) {
        recordIssue({
          ruleId: 'strength_training_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} strength work lacks rest, load, or effort guidance.`,
          correction: 'Add restSecondsRange, loadGuidance, and effortGuidance.',
          userMessage: 'Strength work needs clear load, effort, and rest guidance.',
        });
      }
      if (workout.workoutTypeId === 'hypertrophy' && !payload.RIR && !payload.RPE && !payload.effortGuidance.toLowerCase().includes('failure')) {
        recordIssue({
          ruleId: 'strength_training_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} hypertrophy work lacks RIR/RPE/proximity-to-failure guidance.`,
          correction: 'Add RIR, RPE, or proximity-to-failure guidance for hypertrophy.',
          userMessage: 'Hypertrophy work needs clear effort guidance so sets are hard but not reckless.',
        });
      }
    }
  });

  runRule('cardio_constraints', () => {
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (workout.workoutTypeId === 'zone2_cardio' && payload.kind !== 'cardio') {
        recordIssue({
          ruleId: 'cardio_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} is not a cardio prescription inside Zone 2.`,
          correction: 'Use a cardio payload with duration, heart-rate zone, RPE, and talk-test targets.',
          userMessage: 'Zone 2 needs a cardio prescription.',
        });
      }
      if (payload.kind === 'cardio' && (!payload.durationMinutes || !payload.heartRateZone || !payload.RPE || !payload.talkTest.trim())) {
        recordIssue({
          ruleId: 'cardio_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} cardio work lacks duration or intensity target.`,
          correction: 'Add durationMinutes, heartRateZone or RPE, and talk-test guidance.',
          userMessage: 'Cardio work needs duration and intensity targets.',
        });
      }
    }
  });

  runRule('balance_training_constraints', () => {
    const fallRisk = workout.safetyFlags.includes('balance_concern') || workout.safetyFlags.includes('fall_risk');
    for (const exercise of main) {
      const payload = exercise.prescription.payload;
      if (payload.kind !== 'balance') continue;
      if (!payload.fallRiskRules.length || !payload.complexityProgression.length) {
        recordIssue({
          ruleId: 'balance_training_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} balance work lacks fall-risk or progression rules.`,
          correction: 'Add fallRiskRules and simple complexity progression steps.',
          userMessage: 'Balance work needs clear safety rules and progression steps.',
        });
      }
      if (fallRisk && isTooUnstableForFallRisk(payload, workout.experienceLevel)) {
        recordIssue({
          ruleId: 'balance_training_constraints',
          severity: 'error',
          message: `${exercise.exerciseId} uses unstable balance settings too early for fall-risk context.`,
          correction: 'Use floor surface, eyes open, bilateral or split stance, and external support before unstable surfaces.',
          userMessage: 'Balance work should start supported and stable before adding unstable surfaces.',
        });
      }
    }
  });

  return createWorkoutValidationResult({
    errors,
    warnings,
    suggestedCorrections: unique(suggestedCorrections),
    userFacingMessages: unique(userFacingMessages),
    failedRuleIds,
    decisionTrace,
  });
}

function isTooUnstableForFallRisk(payload: BalancePrescriptionPayload, experienceLevel: WorkoutExperienceLevel | undefined): boolean {
  return payload.surface === 'unstable'
    || payload.visualInput === 'eyes_closed'
    || (experienceLevel === 'beginner' && (payload.baseOfSupport === 'single_leg' || payload.mode === 'dynamic'));
}

export function workoutValidationRuleIds(): string[] {
  return [...REQUIRED_DOMAIN_RULE_IDS];
}
