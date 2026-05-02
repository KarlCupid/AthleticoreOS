import { workoutProgrammingCatalog } from './seedData.ts';
import {
  WorkoutProgrammingCatalogValidationError,
  assertValidGeneratedWorkout,
  assertValidWorkoutProgrammingCatalog,
  formatRuntimeValidationIssues,
} from './catalogValidation.ts';
import type {
  ExerciseCompletionResult,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  ProgressionDecision,
  ReviewableContentFields,
  UserWorkoutProfile,
  WorkoutCompletionLog,
  WorkoutProgrammingCatalog,
  WorkoutReadinessBand,
} from './types.ts';

type QueryResult<T> = Promise<{ data: T | null; error: unknown | null }>;

export interface WorkoutProgrammingSupabaseClient {
  from(table: string): {
    select?: (...args: unknown[]) => unknown;
    insert?: (...args: unknown[]) => unknown;
    upsert?: (...args: unknown[]) => unknown;
    delete?: (...args: unknown[]) => unknown;
  };
}

export interface WorkoutProgrammingPersistenceOptions {
  client?: WorkoutProgrammingSupabaseClient;
  useSupabase?: boolean;
  catalogFallback?: 'safe' | 'always' | 'never';
}

export interface WorkoutReadinessLogInput {
  readinessBand: WorkoutReadinessBand;
  notes?: string | null;
  createdAt?: string;
}

export interface RecommendationFeedbackInput {
  generatedWorkoutId?: string | null;
  rating?: number | null;
  notes?: string | null;
}

export type ExercisePreference = 'like' | 'neutral' | 'dislike';

const staticCatalogTables = [
  'workout_types',
  'training_goals',
  'workout_formats',
  'movement_patterns',
  'muscle_groups',
  'equipment_types',
  'programming_exercises',
  'prescription_templates',
  'session_templates',
  'tracking_metrics',
  'assessment_metrics',
] as const;

function asPromise<T>(value: unknown): QueryResult<T> {
  return value as QueryResult<T>;
}

async function getDefaultClient(): Promise<WorkoutProgrammingSupabaseClient> {
  const module = await import('../../supabase');
  return module.supabase as WorkoutProgrammingSupabaseClient;
}

async function resolveClient(options?: WorkoutProgrammingPersistenceOptions): Promise<WorkoutProgrammingSupabaseClient | null> {
  if (options?.client) return options.client;
  if (options?.useSupabase) return getDefaultClient();
  return null;
}

function ensureNoError(result: { error: unknown | null }, context: string): void {
  if (result.error) {
    if (result.error instanceof Error) throw result.error;
    throw new Error(`${context}: ${String(result.error)}`);
  }
}

function table(client: WorkoutProgrammingSupabaseClient, name: string) {
  return client.from(name);
}

async function selectRows<T>(client: WorkoutProgrammingSupabaseClient, name: string, columns = '*'): Promise<T[]> {
  const builder = table(client, name);
  if (!builder.select) return [];
  const result = await asPromise<T[]>(builder.select(columns));
  ensureNoError(result, `Failed to load ${name}`);
  return result.data ?? [];
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function rowString(row: Record<string, unknown>, key: string, fallback = ''): string {
  const value = row[key];
  return typeof value === 'string' ? value : fallback;
}

function rowNumber(row: Record<string, unknown>, key: string, fallback: number): number {
  const value = row[key];
  return typeof value === 'number' ? value : fallback;
}

function rowBoolean(row: Record<string, unknown>, key: string): boolean | undefined {
  const value = row[key];
  return typeof value === 'boolean' ? value : undefined;
}

function rowStringArray(row: Record<string, unknown>, key: string): string[] {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function rowReviewFields(row: Record<string, unknown>): ReviewableContentFields {
  const reviewFields: ReviewableContentFields = {};
  const reviewStatus = rowString(row, 'review_status');
  const reviewedBy = rowString(row, 'reviewed_by');
  const reviewedAt = rowString(row, 'reviewed_at');
  const safetyReviewStatus = rowString(row, 'safety_review_status');
  const contentVersion = rowString(row, 'content_version');
  const lastUpdatedAt = rowString(row, 'last_updated_at');
  const riskLevel = rowString(row, 'risk_level');
  const rolloutEligibility = rowString(row, 'rollout_eligibility');
  const reviewNotes = rowStringArray(row, 'review_notes');
  if (reviewStatus) reviewFields.reviewStatus = reviewStatus as never;
  if (reviewedBy) reviewFields.reviewedBy = reviewedBy;
  if (reviewedAt) reviewFields.reviewedAt = reviewedAt;
  if (reviewNotes.length > 0) reviewFields.reviewNotes = reviewNotes;
  if (safetyReviewStatus) reviewFields.safetyReviewStatus = safetyReviewStatus as never;
  if (contentVersion) reviewFields.contentVersion = contentVersion;
  if (lastUpdatedAt) reviewFields.lastUpdatedAt = lastUpdatedAt;
  if (riskLevel) reviewFields.riskLevel = riskLevel as never;
  if (rolloutEligibility) reviewFields.rolloutEligibility = rolloutEligibility as never;
  return reviewFields;
}

function idMap(rows: Record<string, unknown>[], leftKey: string, rightKey: string): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  for (const row of rows) {
    const left = rowString(row, leftKey);
    const right = rowString(row, rightKey);
    if (!left || !right) continue;
    output[left] = [...(output[left] ?? []), right];
  }
  return output;
}

function groupedRows(rows: Record<string, unknown>[], key: string): Record<string, Record<string, unknown>[]> {
  const output: Record<string, Record<string, unknown>[]> = {};
  for (const row of rows) {
    const id = rowString(row, key);
    if (!id) continue;
    output[id] = [...(output[id] ?? []), row];
  }
  return output;
}

function taxonomy(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    id: rowString(row, 'id'),
    label: rowString(row, 'label'),
    summary: rowString(row, 'summary'),
  })).filter((item) => item.id);
}

function buildCatalogFromRows(rows: Record<string, Record<string, unknown>[]>): WorkoutProgrammingCatalog | null {
  const workoutTypes = taxonomy(rows.workout_types ?? []);
  const trainingGoals = (rows.training_goals ?? []).map((row) => ({
    id: rowString(row, 'id'),
    label: rowString(row, 'label'),
    summary: rowString(row, 'summary'),
    defaultWorkoutTypeId: rowString(row, 'default_workout_type_id'),
  })).filter((item) => item.id);
  const sessionGoals = idMap(rows.session_template_goals ?? [], 'session_template_id', 'training_goal_id');
  const blocksBySession = groupedRows(rows.session_template_blocks ?? [], 'session_template_id');
  const slotsBySession = groupedRows(rows.session_template_movement_slots ?? [], 'session_template_id');
  const prescriptionTemplates = (rows.prescription_templates ?? []).map((row) => {
    const template: WorkoutProgrammingCatalog['prescriptionTemplates'][number] = {
      id: rowString(row, 'id'),
      label: rowString(row, 'label'),
      kind: rowString(row, 'kind', 'resistance') as never,
      payload: (row.prescription_payload && typeof row.prescription_payload === 'object' ? row.prescription_payload : { kind: rowString(row, 'kind', 'resistance') }) as never,
      appliesToWorkoutTypeIds: rowStringArray(row, 'applies_to_workout_type_ids'),
      appliesToGoalIds: rowStringArray(row, 'applies_to_goal_ids'),
      defaultSets: rowNumber(row, 'default_sets', 2),
      defaultReps: rowString(row, 'default_reps', ''),
      defaultRpe: rowNumber(row, 'default_rpe', 5),
      restSeconds: rowNumber(row, 'rest_seconds', 60),
      intensityCue: rowString(row, 'intensity_cue', 'Stay within the target effort.'),
      ...rowReviewFields(row),
    };
    const defaultDurationSeconds = rowNumber(row, 'default_duration_seconds', 0);
    const defaultDurationMinutes = rowNumber(row, 'default_duration_minutes', 0);
    const tempo = rowString(row, 'tempo', '');
    if (defaultDurationSeconds > 0) template.defaultDurationSeconds = defaultDurationSeconds;
    if (defaultDurationMinutes > 0) template.defaultDurationMinutes = defaultDurationMinutes;
    if (tempo) template.tempo = tempo;
    return template;
  }).filter((item) => item.id);

  if (workoutTypes.length === 0 || trainingGoals.length === 0 || prescriptionTemplates.length === 0) {
    return null;
  }

  const movementByExercise = idMap(rows.exercise_movement_patterns ?? [], 'exercise_id', 'movement_pattern_id');
  const primaryByExercise = idMap(rows.exercise_primary_muscles ?? [], 'exercise_id', 'muscle_group_id');
  const secondaryByExercise = idMap(rows.exercise_secondary_muscles ?? [], 'exercise_id', 'muscle_group_id');
  const equipmentByExercise = idMap(rows.exercise_equipment ?? [], 'exercise_id', 'equipment_type_id');
  const workoutTypeByExercise = idMap(rows.exercise_workout_types ?? [], 'exercise_id', 'workout_type_id');
  const goalByExercise = idMap(rows.exercise_training_goals ?? [], 'exercise_id', 'training_goal_id');
  const trackingByExercise = idMap(rows.exercise_tracking_metrics ?? [], 'exercise_id', 'tracking_metric_id');

  const exercises = (rows.programming_exercises ?? []).map((row) => {
    const id = rowString(row, 'id');
    const exercise: WorkoutProgrammingCatalog['exercises'][number] = {
      id,
      name: rowString(row, 'name'),
      summary: rowString(row, 'summary'),
      coachingSummary: rowString(row, 'coaching_summary'),
      movementPatternIds: movementByExercise[id] ?? [],
      primaryMuscleIds: primaryByExercise[id] ?? [],
      secondaryMuscleIds: secondaryByExercise[id] ?? [],
      equipmentIds: equipmentByExercise[id] ?? [],
      workoutTypeIds: workoutTypeByExercise[id] ?? [],
      goalIds: goalByExercise[id] ?? [],
      minExperience: rowString(row, 'min_experience', 'beginner') as never,
      intensity: rowString(row, 'intensity', 'low') as never,
      impact: rowString(row, 'impact', 'low') as never,
      contraindicationFlags: rowStringArray(row, 'contraindication_flags'),
      trackingMetricIds: trackingByExercise[id] ?? [],
      defaultPrescriptionTemplateId: rowString(row, 'default_prescription_template_id'),
      ...rowReviewFields(row),
    };
    const optionalStringFields = [
      ['shortName', 'short_name'],
      ['category', 'category'],
      ['setupType', 'setup_type'],
      ['technicalComplexity', 'technical_complexity'],
      ['loadability', 'loadability'],
      ['fatigueCost', 'fatigue_cost'],
      ['spineLoading', 'spine_loading'],
      ['kneeDemand', 'knee_demand'],
      ['hipDemand', 'hip_demand'],
      ['shoulderDemand', 'shoulder_demand'],
      ['wristDemand', 'wrist_demand'],
      ['ankleDemand', 'ankle_demand'],
      ['balanceDemand', 'balance_demand'],
      ['cardioDemand', 'cardio_demand'],
    ] as const;
    for (const [targetKey, sourceKey] of optionalStringFields) {
      const value = rowString(row, sourceKey);
      if (value) (exercise as unknown as Record<string, unknown>)[targetKey] = value;
    }
    for (const [targetKey, sourceKey] of [
      ['subPatternIds', 'sub_pattern_ids'],
      ['jointsInvolved', 'joints_involved'],
      ['equipmentRequiredIds', 'equipment_required_ids'],
      ['equipmentOptionalIds', 'equipment_optional_ids'],
      ['spaceRequired', 'space_required'],
      ['setupInstructions', 'setup_instructions'],
      ['executionInstructions', 'execution_instructions'],
      ['breathingInstructions', 'breathing_instructions'],
      ['safetyNotes', 'safety_notes'],
    ] as const) {
      const value = rowStringArray(row, sourceKey);
      if (value.length > 0) (exercise as unknown as Record<string, unknown>)[targetKey] = value;
    }
    const homeFriendly = rowBoolean(row, 'home_friendly');
    const gymFriendly = rowBoolean(row, 'gym_friendly');
    const beginnerFriendly = rowBoolean(row, 'beginner_friendly');
    if (homeFriendly != null) exercise.homeFriendly = homeFriendly;
    if (gymFriendly != null) exercise.gymFriendly = gymFriendly;
    if (beginnerFriendly != null) exercise.beginnerFriendly = beginnerFriendly;
    if (row.default_prescription_ranges && typeof row.default_prescription_ranges === 'object') exercise.defaultPrescriptionRanges = row.default_prescription_ranges as never;
    if (row.media && typeof row.media === 'object') exercise.media = row.media as never;
    return exercise;
  }).filter((item) => item.id);

  if (exercises.length === 0) return null;

  const sessionTemplates = (rows.session_templates ?? []).map((row) => {
    const id = rowString(row, 'id');
    const blocks = (blocksBySession[id] ?? []).map((block) => ({
      id: rowString(block, 'id'),
      kind: rowString(block, 'kind', 'main') as never,
      title: rowString(block, 'title'),
      durationMinutes: rowNumber(block, 'duration_minutes', 1),
      prescriptionTemplateId: rowString(block, 'prescription_template_id'),
    })).filter((block) => block.id);
    const movementSlots = (slotsBySession[id] ?? []).map((slot) => ({
      id: rowString(slot, 'id'),
      blockId: rowString(slot, 'block_id'),
      movementPatternIds: rowStringArray(slot, 'movement_pattern_ids'),
      optional: typeof slot.optional === 'boolean' ? slot.optional : false,
      order: rowNumber(slot, 'sort_order', 0),
      preferredExerciseIds: rowStringArray(slot, 'preferred_exercise_ids'),
      avoidExerciseIds: rowStringArray(slot, 'avoid_exercise_ids'),
    })).filter((slot) => slot.id);
    return {
      id,
      label: rowString(row, 'label'),
      summary: rowString(row, 'summary'),
      workoutTypeId: rowString(row, 'workout_type_id'),
      goalIds: sessionGoals[id] ?? [],
      formatId: rowString(row, 'format_id'),
      minDurationMinutes: rowNumber(row, 'min_duration_minutes', 1),
      defaultDurationMinutes: rowNumber(row, 'default_duration_minutes', 1),
      maxDurationMinutes: rowNumber(row, 'max_duration_minutes', 1),
      experienceLevels: rowStringArray(row, 'experience_levels') as never,
      blocks,
      movementSlots,
      successCriteria: rowStringArray(row, 'success_criteria'),
    };
  }).filter((item) => item.id);

  return {
    workoutTypes,
    trainingGoals,
    workoutFormats: taxonomy(rows.workout_formats ?? []),
    movementPatterns: taxonomy(rows.movement_patterns ?? []),
    muscleGroups: (rows.muscle_groups ?? []).map((row) => ({
      id: rowString(row, 'id'),
      label: rowString(row, 'label'),
      summary: rowString(row, 'summary'),
      region: rowString(row, 'region', 'full_body') as never,
    })).filter((item) => item.id),
    equipmentTypes: (rows.equipment_types ?? []).map((row) => ({
      id: rowString(row, 'id'),
      label: rowString(row, 'label'),
      summary: rowString(row, 'summary'),
      category: rowString(row, 'category', 'bodyweight') as never,
    })).filter((item) => item.id),
    exercises,
    prescriptionTemplates,
    sessionTemplates,
    trackingMetrics: taxonomy(rows.tracking_metrics ?? []),
    assessmentMetrics: taxonomy(rows.assessment_metrics ?? []),
  };
}

function hasAnyExternalCatalogRows(rows: Record<string, Record<string, unknown>[]>): boolean {
  return staticCatalogTables.some((tableName) => (rows[tableName]?.length ?? 0) > 0);
}

function shouldFallbackToSeed(
  options: WorkoutProgrammingPersistenceOptions | undefined,
  reason: 'empty' | 'error' | 'invalid',
): boolean {
  if (options?.catalogFallback === 'always') return true;
  if (options?.catalogFallback === 'never') return false;
  return reason === 'empty';
}

export async function loadWorkoutProgrammingCatalog(
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<WorkoutProgrammingCatalog> {
  const client = await resolveClient(options);
  if (!client) {
    assertValidWorkoutProgrammingCatalog(workoutProgrammingCatalog, 'In-code workout programming catalog');
    return workoutProgrammingCatalog;
  }

  try {
    const rows: Record<string, Record<string, unknown>[]> = {};
    for (const tableName of staticCatalogTables) {
      rows[tableName] = await selectRows<Record<string, unknown>>(client, tableName);
    }
    for (const tableName of [
      'exercise_movement_patterns',
      'exercise_primary_muscles',
      'exercise_secondary_muscles',
      'exercise_equipment',
      'exercise_workout_types',
      'exercise_training_goals',
      'exercise_tracking_metrics',
      'session_template_goals',
      'session_template_blocks',
      'session_template_movement_slots',
    ]) {
      rows[tableName] = await selectRows<Record<string, unknown>>(client, tableName);
    }
    if (!hasAnyExternalCatalogRows(rows) && shouldFallbackToSeed(options, 'empty')) {
      assertValidWorkoutProgrammingCatalog(workoutProgrammingCatalog, 'In-code workout programming catalog');
      return workoutProgrammingCatalog;
    }

    const catalog = buildCatalogFromRows(rows);
    if (!catalog) {
      const error = new WorkoutProgrammingCatalogValidationError('Supabase workout programming catalog is incomplete.', [{
        recordType: 'WorkoutProgrammingCatalog',
        field: '$catalog',
        severity: 'error',
        message: 'Supabase returned partial workout-programming catalog rows but not enough data to build a catalog.',
        suggestedCorrection: 'Seed the required static taxonomy, exercises, prescription templates, and session templates or use catalogFallback: "always" for development fallback.',
      }]);
      if (shouldFallbackToSeed(options, 'invalid')) return workoutProgrammingCatalog;
      throw error;
    }

    assertValidWorkoutProgrammingCatalog(catalog, 'Supabase workout programming catalog');
    return catalog;
  } catch (error) {
    if (shouldFallbackToSeed(options, error instanceof WorkoutProgrammingCatalogValidationError ? 'invalid' : 'error')) {
      assertValidWorkoutProgrammingCatalog(workoutProgrammingCatalog, 'In-code workout programming catalog');
      return workoutProgrammingCatalog;
    }
    if (error instanceof WorkoutProgrammingCatalogValidationError) {
      throw new Error(`${error.message}\n${formatRuntimeValidationIssues(error.issues)}`);
    }
    throw error;
  }
}

export async function loadUserWorkoutProfile(
  userId: string,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<UserWorkoutProfile> {
  const client = await resolveClient(options);
  if (!client) {
    return {
      userId,
      equipmentIds: ['bodyweight'],
      experienceLevel: 'beginner',
      safetyFlags: [],
      dislikedExerciseIds: [],
      likedExerciseIds: [],
      preferredDurationMinutes: 35,
      readinessBand: 'unknown',
      painFlags: [],
      workoutEnvironment: 'unknown',
    };
  }

  const profileResult = await asPromise<Record<string, unknown>>(
    (table(client, 'user_training_profiles').select?.('*') as { eq: (...args: unknown[]) => { maybeSingle: () => unknown } })
      .eq('user_id', userId)
      .maybeSingle(),
  );
  ensureNoError(profileResult, 'Failed to load user workout profile');

  const equipmentResult = await asPromise<Record<string, unknown>[]>(
    (table(client, 'user_equipment').select?.('equipment_type_id') as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId),
  );
  ensureNoError(equipmentResult, 'Failed to load user equipment');

  const safetyResult = await asPromise<Record<string, unknown>[]>(
    (table(client, 'user_safety_flags').select?.('safety_flag_id') as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId),
  );
  ensureNoError(safetyResult, 'Failed to load user safety flags');

  const preferenceResult = await asPromise<Record<string, unknown>[]>(
    (table(client, 'user_exercise_preferences').select?.('exercise_id,preference') as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId),
  );
  ensureNoError(preferenceResult, 'Failed to load user exercise preferences');

  const row = profileResult.data ?? {};
  const preferences = preferenceResult.data ?? [];
  return {
    userId,
    equipmentIds: (equipmentResult.data ?? []).map((item) => rowString(item, 'equipment_type_id')).filter(Boolean),
    experienceLevel: rowString(row, 'experience_level', 'beginner') as never,
    safetyFlags: (safetyResult.data ?? []).map((item) => rowString(item, 'safety_flag_id')).filter(Boolean),
    dislikedExerciseIds: preferences.filter((item) => item.preference === 'dislike').map((item) => rowString(item, 'exercise_id')),
    likedExerciseIds: preferences.filter((item) => item.preference === 'like').map((item) => rowString(item, 'exercise_id')),
    preferredDurationMinutes: rowNumber(row, 'preferred_duration_minutes', 35),
    readinessBand: rowString(row, 'readiness_band', 'unknown') as never,
    painFlags: [],
    workoutEnvironment: 'unknown',
  };
}

export async function saveGeneratedWorkout(
  userId: string,
  workout: GeneratedWorkout,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<string | null> {
  const client = await resolveClient(options);
  if (!client) return null;
  assertValidGeneratedWorkout(workout, undefined, 'Generated workout persistence payload');
  const payload = {
    user_id: userId,
    goal_id: workout.goalId,
    template_id: workout.templateId,
    requested_duration_minutes: workout.requestedDurationMinutes,
    estimated_duration_minutes: workout.estimatedDurationMinutes,
    safety_flags: workout.safetyFlags,
    payload: workout,
    blocked: workout.blocked ?? false,
  };
  const workoutResult = await asPromise<Record<string, unknown>>(
    (table(client, 'generated_workouts').insert?.(payload) as { select: (...args: unknown[]) => { single: () => unknown } })
      .select('id')
      .single(),
  );
  ensureNoError(workoutResult, 'Failed to save generated workout');
  const generatedWorkoutId = rowString(workoutResult.data ?? {}, 'id') || null;
  if (!generatedWorkoutId) return null;

  const exercises = workout.blocks.flatMap((block) => block.exercises.map((exercise, index) => ({
    generated_workout_id: generatedWorkoutId,
    exercise_id: exercise.exerciseId,
    block_id: exercise.blockId,
    prescription: exercise.prescription,
    substitutions: exercise.substitutions ?? [],
    sort_order: index,
  })));
  if (exercises.length > 0) {
    const exerciseResult = await asPromise<null>(table(client, 'generated_workout_exercises').insert?.(exercises));
    ensureNoError(exerciseResult, 'Failed to save generated workout exercises');
  }
  return generatedWorkoutId;
}

function completionPayload(userId: string, completion: WorkoutCompletionLog, generatedWorkoutId?: string | null) {
  return {
    user_id: userId,
    generated_workout_id: generatedWorkoutId ?? null,
    completed_at: completion.completedAt,
    planned_duration_minutes: completion.plannedDurationMinutes,
    actual_duration_minutes: completion.actualDurationMinutes,
    session_rpe: completion.sessionRpe,
    pain_score_before: completion.painScoreBefore ?? null,
    pain_score_after: completion.painScoreAfter ?? null,
    notes: completion.notes ?? null,
  };
}

function exerciseCompletionPayload(workoutCompletionId: string, result: ExerciseCompletionResult) {
  return {
    workout_completion_id: workoutCompletionId,
    exercise_id: result.exerciseId,
    sets_completed: result.setsCompleted,
    reps_completed: result.repsCompleted ?? null,
    duration_seconds_completed: result.durationSecondsCompleted
      ?? (result.durationMinutesCompleted != null ? Math.round(result.durationMinutesCompleted * 60) : null),
    load_used: result.loadUsed ?? null,
    actual_rpe: result.actualRpe ?? null,
    pain_score: result.painScore ?? null,
    completed_as_prescribed: result.completedAsPrescribed,
  };
}

export async function logWorkoutCompletion(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: WorkoutProgrammingPersistenceOptions & { generatedWorkoutId?: string | null },
): Promise<string | null> {
  const client = await resolveClient(options);
  if (!client) return null;
  const completionResult = await asPromise<Record<string, unknown>>(
    (table(client, 'workout_completions').insert?.(completionPayload(userId, completion, options?.generatedWorkoutId)) as { select: (...args: unknown[]) => { single: () => unknown } })
      .select('id')
      .single(),
  );
  ensureNoError(completionResult, 'Failed to log workout completion');
  const workoutCompletionId = rowString(completionResult.data ?? {}, 'id') || null;
  if (!workoutCompletionId) return null;

  const results = completion.exerciseResults.map((result) => exerciseCompletionPayload(workoutCompletionId, result));
  if (results.length > 0) {
    const resultInsert = await asPromise<null>(table(client, 'exercise_completion_results').insert?.(results));
    ensureNoError(resultInsert, 'Failed to log exercise completion results');
  }
  return workoutCompletionId;
}

export async function saveProgressionDecision(
  userId: string,
  decision: ProgressionDecision,
  options?: WorkoutProgrammingPersistenceOptions & { workoutCompletionId?: string | null },
): Promise<string | null> {
  const client = await resolveClient(options);
  if (!client) return null;
  const dbDirection = ['progress', 'repeat', 'regress', 'recover'].includes(decision.direction)
    ? decision.direction
    : 'regress';

  if (options?.workoutCompletionId) {
    const result = await asPromise<Record<string, unknown>>(
      (table(client, 'progression_decisions').insert?.({
        workout_completion_id: options.workoutCompletionId,
        direction: dbDirection,
        reason: decision.reason,
        next_adjustment: decision.nextAdjustment,
        safety_flags: decision.safetyFlags,
      }) as { select: (...args: unknown[]) => { single: () => unknown } })
        .select('id')
        .single(),
    );
    ensureNoError(result, 'Failed to save progression decision');
    return rowString(result.data ?? {}, 'id') || null;
  }

  const observation = await asPromise<Record<string, unknown>>(
    (table(client, 'performance_observations').insert?.({
      user_id: userId,
      observation_kind: 'progression_decision',
      payload: decision,
    }) as { select: (...args: unknown[]) => { single: () => unknown } })
      .select('id')
      .single(),
  );
  ensureNoError(observation, 'Failed to save progression decision observation');
  return rowString(observation.data ?? {}, 'id') || null;
}

export async function updateUserEquipment(
  userId: string,
  equipmentIds: string[],
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const client = await resolveClient(options);
  if (!client) return;
  ensureNoError(await asPromise<null>((table(client, 'user_equipment').delete?.() as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId)), 'Failed to clear user equipment');
  const rows = unique(equipmentIds).map((equipmentId) => ({ user_id: userId, equipment_type_id: equipmentId }));
  if (rows.length > 0) ensureNoError(await asPromise<null>(table(client, 'user_equipment').insert?.(rows)), 'Failed to update user equipment');
}

export async function updateUserSafetyFlags(
  userId: string,
  flags: string[],
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const client = await resolveClient(options);
  if (!client) return;
  ensureNoError(await asPromise<null>((table(client, 'user_safety_flags').delete?.() as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId)), 'Failed to clear user safety flags');
  const rows = unique(flags).map((flag) => ({ user_id: userId, safety_flag_id: flag, source: 'user' }));
  if (rows.length > 0) ensureNoError(await asPromise<null>(table(client, 'user_safety_flags').insert?.(rows)), 'Failed to update user safety flags');
}

export async function updateExercisePreference(
  userId: string,
  exerciseId: string,
  preference: ExercisePreference,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const client = await resolveClient(options);
  if (!client) return;
  const result = await asPromise<null>(table(client, 'user_exercise_preferences').upsert?.({
    user_id: userId,
    exercise_id: exerciseId,
    preference,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,exercise_id' }));
  ensureNoError(result, 'Failed to update exercise preference');
}

export async function logReadiness(
  userId: string,
  readinessLog: WorkoutReadinessLogInput,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<string | null> {
  const client = await resolveClient(options);
  if (!client) return null;
  const result = await asPromise<Record<string, unknown>>(
    (table(client, 'user_readiness_logs').insert?.({
      user_id: userId,
      readiness_band: readinessLog.readinessBand,
      notes: readinessLog.notes ?? null,
      created_at: readinessLog.createdAt ?? new Date().toISOString(),
    }) as { select: (...args: unknown[]) => { single: () => unknown } })
      .select('id')
      .single(),
  );
  ensureNoError(result, 'Failed to log readiness');
  return rowString(result.data ?? {}, 'id') || null;
}

export async function saveRecommendationFeedback(
  userId: string,
  feedback: RecommendationFeedbackInput,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<string | null> {
  const client = await resolveClient(options);
  if (!client) return null;
  const result = await asPromise<Record<string, unknown>>(
    (table(client, 'recommendation_feedback').insert?.({
      user_id: userId,
      generated_workout_id: feedback.generatedWorkoutId ?? null,
      rating: feedback.rating ?? null,
      notes: feedback.notes ?? null,
    }) as { select: (...args: unknown[]) => { single: () => unknown } })
      .select('id')
      .single(),
  );
  ensureNoError(result, 'Failed to save recommendation feedback');
  return rowString(result.data ?? {}, 'id') || null;
}

export async function saveUserWorkoutProfile(
  userId: string,
  input: Pick<PersonalizedWorkoutInput, 'experienceLevel' | 'preferredDurationMinutes' | 'readinessBand'>,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const client = await resolveClient(options);
  if (!client) return;
  const result = await asPromise<null>(table(client, 'user_training_profiles').upsert?.({
    user_id: userId,
    experience_level: input.experienceLevel,
    preferred_duration_minutes: input.preferredDurationMinutes ?? 35,
    readiness_band: input.readinessBand ?? 'unknown',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }));
  ensureNoError(result, 'Failed to save user workout profile');
}
