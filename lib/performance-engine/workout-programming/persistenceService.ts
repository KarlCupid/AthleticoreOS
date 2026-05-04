import { workoutProgrammingCatalog } from './seedData.ts';
import {
  WorkoutProgrammingCatalogValidationError,
  assertValidGeneratedWorkout,
  assertValidWorkoutProgrammingCatalog,
  formatRuntimeValidationIssues,
} from './catalogValidation.ts';
import { validateGeneratedProgram as validateProgramDomain } from './programBuilder.ts';
import type {
  ExerciseCompletionResult,
  GeneratedProgram,
  GeneratedProgramSession,
  GeneratedWorkout,
  GeneratedWorkoutSessionCompletionStatus,
  GeneratedWorkoutSessionLifecycle,
  GeneratedWorkoutSessionLifecycleStatus,
  PersonalizedWorkoutInput,
  ProgressionDecision,
  RecommendationEvent,
  RecommendationEventInput,
  ReviewableContentFields,
  UserWorkoutProfile,
  WorkoutCompletionLog,
  WorkoutProgrammingCatalog,
  WorkoutReadinessBand,
} from './types.ts';

type QueryResult<T> = Promise<{ data: T | null; error: unknown | null }>;
type SupabaseQueryBuilder = {
  select?: (...args: unknown[]) => unknown;
  insert?: (...args: unknown[]) => unknown;
  upsert?: (...args: unknown[]) => unknown;
  delete?: (...args: unknown[]) => unknown;
  eq?: (...args: unknown[]) => unknown;
  in?: (...args: unknown[]) => unknown;
  order?: (...args: unknown[]) => unknown;
  limit?: (...args: unknown[]) => unknown;
  maybeSingle?: () => unknown;
  single?: () => unknown;
};

export interface WorkoutProgrammingSupabaseClient {
  from(table: string): SupabaseQueryBuilder;
  rpc?: (...args: unknown[]) => unknown;
}

export interface WorkoutProgrammingPersistenceOptions {
  client?: WorkoutProgrammingSupabaseClient;
  useSupabase?: boolean;
  catalogFallback?: 'safe' | 'always' | 'never';
  allowClientWriteFallback?: boolean;
}

export type WorkoutProgrammingPersistenceErrorCode =
  | 'persistence_error'
  | 'not_found'
  | 'unauthorized'
  | 'validation_error'
  | 'conflict'
  | 'database_unavailable';

export interface WorkoutProgrammingPersistenceErrorDetails {
  code?: WorkoutProgrammingPersistenceErrorCode;
  context?: string;
  table?: string;
  cause?: unknown;
  recoverable?: boolean;
}

export class WorkoutProgrammingPersistenceError extends Error {
  code: WorkoutProgrammingPersistenceErrorCode;
  context: string | undefined;
  table: string | undefined;
  cause: unknown;
  recoverable: boolean;

  constructor(message: string, details: WorkoutProgrammingPersistenceErrorDetails = {}) {
    super(message);
    this.name = 'WorkoutProgrammingPersistenceError';
    this.code = details.code ?? 'persistence_error';
    this.context = details.context;
    this.table = details.table;
    this.cause = details.cause;
    this.recoverable = details.recoverable ?? false;
  }
}

export class NotFoundError extends WorkoutProgrammingPersistenceError {
  constructor(message: string, details: WorkoutProgrammingPersistenceErrorDetails = {}) {
    super(message, { ...details, code: 'not_found' });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends WorkoutProgrammingPersistenceError {
  constructor(message: string, details: WorkoutProgrammingPersistenceErrorDetails = {}) {
    super(message, { ...details, code: 'unauthorized' });
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends WorkoutProgrammingPersistenceError {
  constructor(message: string, details: WorkoutProgrammingPersistenceErrorDetails = {}) {
    super(message, { ...details, code: 'validation_error' });
    this.name = 'ValidationError';
  }
}

export class ConflictError extends WorkoutProgrammingPersistenceError {
  constructor(message: string, details: WorkoutProgrammingPersistenceErrorDetails = {}) {
    super(message, { ...details, code: 'conflict' });
    this.name = 'ConflictError';
  }
}

export class DatabaseUnavailableError extends WorkoutProgrammingPersistenceError {
  constructor(message: string, details: WorkoutProgrammingPersistenceErrorDetails = {}) {
    super(message, { ...details, code: 'database_unavailable', recoverable: details.recoverable ?? true });
    this.name = 'DatabaseUnavailableError';
  }
}

export interface WorkoutReadinessLogInput {
  readinessBand: WorkoutReadinessBand;
  notes?: string | null;
  createdAt?: string;
}

export interface WorkoutReadinessLog extends WorkoutReadinessLogInput {
  id: string;
  userId: string;
  createdAt: string;
}

export interface RecommendationFeedbackInput {
  generatedWorkoutId?: string | null;
  rating?: number | null;
  notes?: string | null;
}

export interface RecommendationEventListOptions extends ListPersistenceOptions {
  generatedWorkoutId?: string | null;
  eventKinds?: string[];
}

export type ExercisePreference = 'like' | 'neutral' | 'dislike';

export interface ExercisePreferenceInput {
  exerciseId: string;
  preference: ExercisePreference;
}

export interface ListPersistenceOptions extends WorkoutProgrammingPersistenceOptions {
  limit?: number;
}

export interface GeneratedWorkoutPersistenceOptions extends WorkoutProgrammingPersistenceOptions {
  generatedWorkoutId?: string | null;
}

export interface WorkoutCompletionPersistenceOptions extends WorkoutProgrammingPersistenceOptions {
  generatedWorkoutId?: string | null;
}

export interface GeneratedWorkoutSessionLifecycleOptions extends WorkoutProgrammingPersistenceOptions {
  activeBlockId?: string | null;
  activeExerciseId?: string | null;
  notes?: string | null;
  occurredAt?: string;
  completionStatus?: GeneratedWorkoutSessionCompletionStatus | null;
}

export interface ActiveGeneratedWorkoutSessionListOptions extends ListPersistenceOptions {
  generatedWorkoutId?: string | null;
}

export interface GeneratedProgramPersistenceOptions extends WorkoutProgrammingPersistenceOptions {
  userProgramId?: string | null;
}

export interface ProgramSessionUpdate {
  scheduledDate?: string;
  dayIndex?: number;
  status?: GeneratedProgramSession['status'];
  startedAt?: string | null;
  completedAt?: string | null;
  generatedWorkoutId?: string | null;
  workoutCompletionId?: string | null;
  calendarEventId?: string | null;
  workout?: GeneratedWorkout | null;
  validationWarning?: string;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function errorField(error: unknown, field: string): unknown {
  return isRecord(error) ? error[field] : undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = errorField(error, 'message');
  if (typeof message === 'string') return message;
  return String(error);
}

function errorCode(error: unknown): string {
  const code = errorField(error, 'code');
  return typeof code === 'string' ? code : '';
}

function errorStatus(error: unknown): number | null {
  const status = errorField(error, 'status') ?? errorField(error, 'statusCode');
  return typeof status === 'number' ? status : null;
}

function toPersistenceError(error: unknown, context: string, tableName?: string): WorkoutProgrammingPersistenceError {
  if (error instanceof WorkoutProgrammingPersistenceError) return error;
  const code = errorCode(error);
  const status = errorStatus(error);
  const message = errorMessage(error);
  const details: WorkoutProgrammingPersistenceErrorDetails = { context, cause: error };
  if (tableName) details.table = tableName;
  if (status === 401 || status === 403 || code === '42501' || code === 'PGRST301') {
    return new UnauthorizedError(`${context}: unauthorized access to workout-programming data.`, details);
  }
  if (status === 404 || code === 'PGRST116' || code === 'P0002') {
    return new NotFoundError(`${context}: record not found.`, details);
  }
  if (status === 409 || code === '23505') {
    return new ConflictError(`${context}: conflicting workout-programming row.`, details);
  }
  if (code === '23502' || code === '23503' || code === '23514' || code === '22007' || code === '22023' || code === '22P02') {
    return new ValidationError(`${context}: invalid persistence payload. ${message}`, details);
  }
  if (code === 'PGRST202' || /function.*not found|could not find.*function|schema cache/i.test(message)) {
    return new DatabaseUnavailableError(`${context}: atomic persistence RPC is unavailable. Apply the latest workout-programming migrations. ${message}`, details);
  }
  if ((status != null && status >= 500) || /network|fetch|timeout|unavailable|ECONN|ENOTFOUND/i.test(message)) {
    return new DatabaseUnavailableError(`${context}: database unavailable. ${message}`, details);
  }
  return new WorkoutProgrammingPersistenceError(`${context}: ${message}`, details);
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

function hasRpc(client: WorkoutProgrammingSupabaseClient): client is WorkoutProgrammingSupabaseClient & { rpc: (functionName: string, args: Record<string, unknown>) => unknown } {
  return typeof client.rpc === 'function';
}

function allowClientWriteFallback(options?: WorkoutProgrammingPersistenceOptions): boolean {
  if (options?.allowClientWriteFallback) return true;
  if (process.env.WORKOUT_PROGRAMMING_ALLOW_CLIENT_WRITE_FALLBACK === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

function assertClientWriteFallbackAllowed(options: WorkoutProgrammingPersistenceOptions | undefined, context: string): void {
  if (allowClientWriteFallback(options)) return;
  throw new DatabaseUnavailableError(
    `${context}: atomic workout-programming RPC is unavailable and client-orchestrated parent/child writes are disabled in production.`,
    { context, recoverable: false },
  );
}

async function rpcReturningId(
  client: WorkoutProgrammingSupabaseClient & { rpc: (functionName: string, args: Record<string, unknown>) => unknown },
  functionName: string,
  args: Record<string, unknown>,
  context: string,
): Promise<string> {
  const result = await asPromise<unknown>(client.rpc(functionName, args));
  ensureNoError(result, context, functionName);
  const data = result.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (isRecord(data)) {
    const id = rowString(data, 'id')
      || rowString(data, `${functionName}_id`)
      || rowString(data, 'generated_workout_id')
      || rowString(data, 'workout_completion_id')
      || rowString(data, 'user_program_id');
    if (id) return id;
  }
  throw new WorkoutProgrammingPersistenceError(`${context}: atomic persistence RPC did not return an id.`, { context, table: functionName });
}

function ensureNoError(result: { error: unknown | null }, context: string, tableName?: string): void {
  if (result.error) {
    throw toPersistenceError(result.error, context, tableName);
  }
}

function table(client: WorkoutProgrammingSupabaseClient, name: string) {
  return client.from(name);
}

async function selectRows<T>(client: WorkoutProgrammingSupabaseClient, name: string, columns = '*'): Promise<T[]> {
  const builder = table(client, name);
  if (!builder.select) return [];
  const result = await asPromise<T[]>(builder.select(columns));
  ensureNoError(result, `Failed to load ${name}`, name);
  return result.data ?? [];
}

function chain(value: unknown): SupabaseQueryBuilder {
  return value as SupabaseQueryBuilder;
}

function requireBuilder(value: unknown, context: string, tableName: string, operation: string): SupabaseQueryBuilder {
  if (!value) {
    throw new DatabaseUnavailableError(`${context}: Supabase ${operation} is unavailable.`, { context, table: tableName });
  }
  return chain(value);
}

async function insertReturningId(
  client: WorkoutProgrammingSupabaseClient,
  tableName: string,
  payload: unknown,
  context: string,
): Promise<string> {
  const insertBuilder = table(client, tableName).insert?.(payload);
  if (!insertBuilder) throw new DatabaseUnavailableError(`${context}: Supabase insert is unavailable.`, { context, table: tableName });
  const selectBuilder = chain(insertBuilder).select?.('id');
  const singleBuilder = selectBuilder ? chain(selectBuilder).single?.() : undefined;
  const result = await asPromise<Record<string, unknown>>(singleBuilder ?? selectBuilder ?? insertBuilder);
  ensureNoError(result, context, tableName);
  const id = rowString(result.data ?? {}, 'id');
  if (!id) {
    throw new WorkoutProgrammingPersistenceError(`${context}: Supabase did not return an id.`, { context, table: tableName });
  }
  return id;
}

async function insertRows(
  client: WorkoutProgrammingSupabaseClient,
  tableName: string,
  rows: Record<string, unknown>[],
  context: string,
): Promise<void> {
  if (rows.length === 0) return;
  const result = await asPromise<null>(table(client, tableName).insert?.(rows));
  ensureNoError(result, context, tableName);
}

async function upsertRows(
  client: WorkoutProgrammingSupabaseClient,
  tableName: string,
  rows: Record<string, unknown>[],
  context: string,
  onConflict?: string,
): Promise<void> {
  if (rows.length === 0) return;
  const result = await asPromise<null>(table(client, tableName).upsert?.(rows, onConflict ? { onConflict } : undefined));
  ensureNoError(result, context, tableName);
}

async function deleteWhereEq(
  client: WorkoutProgrammingSupabaseClient,
  tableName: string,
  column: string,
  value: string,
  context: string,
): Promise<void> {
  const deleteBuilder = table(client, tableName).delete?.();
  if (!deleteBuilder) throw new DatabaseUnavailableError(`${context}: Supabase delete is unavailable.`, { context, table: tableName });
  const result = await asPromise<null>(chain(deleteBuilder).eq?.(column, value));
  ensureNoError(result, context, tableName);
}

async function selectMaybeSingleRow(
  tableName: string,
  query: SupabaseQueryBuilder,
  context: string,
): Promise<Record<string, unknown> | null> {
  const maybeSingle = query.maybeSingle?.();
  const result = await asPromise<Record<string, unknown>>(maybeSingle ?? query);
  ensureNoError(result, context, tableName);
  return result.data ?? null;
}

async function bestEffortDeleteById(client: WorkoutProgrammingSupabaseClient, tableName: string, id: string): Promise<void> {
  try {
    await deleteWhereEq(client, tableName, 'id', id, `Rollback ${tableName}`);
  } catch {
    // The original write error is more actionable than rollback failure here.
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function uniqueStrings(items: string[]): string[] {
  return unique(items.map((item) => item.trim()).filter(Boolean));
}

function rowString(row: Record<string, unknown>, key: string, fallback = ''): string {
  const value = row[key];
  return typeof value === 'string' ? value : fallback;
}

function dateOnly(value: string | null | undefined): string | undefined {
  const candidate = value?.slice(0, 10);
  return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : undefined;
}

function rowNumber(row: Record<string, unknown>, key: string, fallback: number): number {
  const value = row[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function rowOptionalNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
  ensureNoError(profileResult, 'Failed to load user workout profile', 'user_training_profiles');

  const equipmentResult = await asPromise<Record<string, unknown>[]>(
    (table(client, 'user_equipment').select?.('equipment_type_id') as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId),
  );
  ensureNoError(equipmentResult, 'Failed to load user equipment', 'user_equipment');

  const safetyResult = await asPromise<Record<string, unknown>[]>(
    (table(client, 'user_safety_flags').select?.('safety_flag_id') as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId),
  );
  ensureNoError(safetyResult, 'Failed to load user safety flags', 'user_safety_flags');

  const preferenceResult = await asPromise<Record<string, unknown>[]>(
    (table(client, 'user_exercise_preferences').select?.('exercise_id,preference') as { eq: (...args: unknown[]) => unknown }).eq('user_id', userId),
  );
  ensureNoError(preferenceResult, 'Failed to load user exercise preferences', 'user_exercise_preferences');

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

function assertUserId(userId: string, context: string): void {
  if (!userId.trim()) throw new ValidationError(`${context}: userId is required.`, { context });
}

function validateGeneratedWorkoutForPersistence(workout: GeneratedWorkout, context: string): void {
  try {
    assertValidGeneratedWorkout(workout, undefined, context);
  } catch (error) {
    if (error instanceof WorkoutProgrammingCatalogValidationError) {
      throw new ValidationError(`${context}: invalid generated workout.\n${formatRuntimeValidationIssues(error.issues)}`, { context, cause: error });
    }
    throw error;
  }
}

function validateCompletionLog(completion: WorkoutCompletionLog, context: string): void {
  if (!completion.workoutId.trim()) throw new ValidationError(`${context}: workoutId is required.`, { context });
  if (!completion.completedAt.trim()) throw new ValidationError(`${context}: completedAt is required.`, { context });
  if (completion.source && completion.source !== 'workout_programming' && completion.source !== 'generated_workout') {
    throw new ValidationError(`${context}: completion source is invalid.`, { context });
  }
  if (
    completion.completionStatus
    && completion.completionStatus !== 'completed'
    && completion.completionStatus !== 'partial'
    && completion.completionStatus !== 'stopped'
    && completion.completionStatus !== 'abandoned'
    && completion.completionStatus !== 'expired'
  ) {
    throw new ValidationError(`${context}: completionStatus is invalid.`, { context });
  }
  if (completion.plannedDurationMinutes <= 0 || completion.actualDurationMinutes < 0) {
    throw new ValidationError(`${context}: completion duration values are invalid.`, { context });
  }
  if (completion.sessionRpe < 1 || completion.sessionRpe > 10) {
    throw new ValidationError(`${context}: sessionRpe must be between 1 and 10.`, { context });
  }
  if (!Array.isArray(completion.exerciseResults)) {
    throw new ValidationError(`${context}: exerciseResults must be an array.`, { context });
  }
  for (const result of completion.exerciseResults) {
    if (!result.exerciseId.trim()) throw new ValidationError(`${context}: every exercise result needs exerciseId.`, { context });
    if (result.setsCompleted < 0) throw new ValidationError(`${context}: setsCompleted cannot be negative.`, { context });
    if (result.actualRpe != null && (result.actualRpe < 1 || result.actualRpe > 10)) {
      throw new ValidationError(`${context}: actualRpe must be between 1 and 10 when provided.`, { context });
    }
  }
}

function validateProgressionDecision(decision: ProgressionDecision, context: string): void {
  if (!decision.direction) throw new ValidationError(`${context}: direction is required.`, { context });
  if (!decision.reason.trim()) throw new ValidationError(`${context}: reason is required.`, { context });
  if (!decision.nextAdjustment.trim()) throw new ValidationError(`${context}: nextAdjustment is required.`, { context });
  if (!Array.isArray(decision.safetyFlags)) throw new ValidationError(`${context}: safetyFlags must be an array.`, { context });
}

function validateFeedback(feedback: RecommendationFeedbackInput, context: string): void {
  if (feedback.rating != null && (feedback.rating < 1 || feedback.rating > 5)) {
    throw new ValidationError(`${context}: rating must be between 1 and 5.`, { context });
  }
}

function validateRecommendationEvent(event: RecommendationEventInput, context: string): void {
  if (!event.eventKind.trim()) throw new ValidationError(`${context}: eventKind is required.`, { context });
  if (event.timestamp != null && !event.timestamp.trim()) throw new ValidationError(`${context}: timestamp is invalid.`, { context });
  if (event.decisionTrace != null && !Array.isArray(event.decisionTrace)) {
    throw new ValidationError(`${context}: decisionTrace must be an array.`, { context });
  }
  if (event.payload != null && !isRecord(event.payload)) {
    throw new ValidationError(`${context}: payload must be an object.`, { context });
  }
}

function validateGeneratedProgram(program: GeneratedProgram, context: string): void {
  if (!program.id.trim()) throw new ValidationError(`${context}: program id is required.`, { context });
  if (!program.goalId.trim()) throw new ValidationError(`${context}: goalId is required.`, { context });
  if (!Array.isArray(program.weeks) || program.weeks.length === 0) throw new ValidationError(`${context}: weeks are required.`, { context });
  if (!Array.isArray(program.sessions)) throw new ValidationError(`${context}: sessions must be an array.`, { context });
  const validation = validateProgramDomain(program);
  if (!validation.valid) {
    throw new ValidationError(`${context}: generated program failed validation. ${validation.errors.join(' | ')}`, { context });
  }
  for (const session of program.sessions) {
    if (!session.id.trim()) throw new ValidationError(`${context}: every program session requires an id.`, { context });
    if (session.dayIndex < 1 || session.dayIndex > 7) throw new ValidationError(`${context}: session ${session.id} has invalid dayIndex.`, { context });
    if (session.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(session.scheduledDate)) {
      throw new ValidationError(`${context}: session ${session.id} has invalid scheduledDate.`, { context });
    }
  }
}

function programPayloadWithPersistence(program: GeneratedProgram, userProgramId: string): GeneratedProgram {
  const sessions = program.sessions.map((session) => ({
    ...session,
    persistenceId: session.persistenceId ?? `${userProgramId}:${session.id}`,
    userProgramId,
  }));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const weeks = program.weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => sessionById.get(session.id) ?? session),
  }));
  return {
    ...program,
    persistenceId: userProgramId,
    weeks,
    sessions,
  };
}

function programRowPayload(userId: string, program: GeneratedProgram, userProgramId?: string | null) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    goal_id: program.goalId,
    status: program.status ?? 'active',
    payload: program,
  };
  if (userProgramId) payload.id = userProgramId;
  const startedAt = dateOnly(program.startedAt ?? program.scheduleStartDate);
  if (startedAt) payload.started_at = startedAt;
  return payload;
}

function programFromRow(row: Record<string, unknown>): GeneratedProgram {
  const id = rowString(row, 'id');
  const payload = row.payload as GeneratedProgram;
  return programPayloadWithPersistence({
    ...payload,
    status: (rowString(row, 'status') as GeneratedProgram['status']) || payload.status || 'active',
  }, id);
}

function updateProgramSessionInMemory(
  program: GeneratedProgram,
  sessionId: string,
  update: ProgramSessionUpdate | ((session: GeneratedProgramSession) => GeneratedProgramSession),
): GeneratedProgram {
  let found = false;
  let targetWeekIndex: number | null = null;
  const warning = typeof update === 'function' ? undefined : update.validationWarning;
  const applyUpdate = (session: GeneratedProgramSession): GeneratedProgramSession => {
    if (session.id !== sessionId) return session;
    found = true;
    targetWeekIndex = session.weekIndex;
    if (typeof update === 'function') return update(session);
    const next: GeneratedProgramSession = { ...session };
    if (update.scheduledDate) next.scheduledDate = update.scheduledDate;
    if (update.dayIndex != null) next.dayIndex = update.dayIndex;
    if (update.status) next.status = update.status;
    if (update.startedAt !== undefined) next.startedAt = update.startedAt;
    if (update.completedAt !== undefined) next.completedAt = update.completedAt;
    if (update.generatedWorkoutId !== undefined) next.generatedWorkoutId = update.generatedWorkoutId;
    if (update.workoutCompletionId !== undefined) next.workoutCompletionId = update.workoutCompletionId;
    if (update.calendarEventId !== undefined) next.calendarEventId = update.calendarEventId;
    if (update.workout !== undefined) next.workout = update.workout;
    return next;
  };
  const weeks = program.weeks.map((week) => {
    const sessions = week.sessions.map(applyUpdate);
    return {
      ...week,
      sessions,
      validationWarnings: warning && week.weekIndex === targetWeekIndex
        ? unique([...week.validationWarnings, warning])
        : week.validationWarnings,
    };
  });
  const sessions = program.sessions.map(applyUpdate);
  if (!found) throw new NotFoundError(`Program session ${sessionId} was not found.`, { context: 'Update generated program session' });
  return {
    ...program,
    weeks,
    sessions,
    validationWarnings: warning
      ? unique([...program.validationWarnings, warning])
      : program.validationWarnings,
  };
}

function generatedWorkoutPayload(userId: string, workout: GeneratedWorkout) {
  return {
    user_id: userId,
    goal_id: workout.goalId,
    template_id: workout.templateId,
    requested_duration_minutes: workout.requestedDurationMinutes,
    estimated_duration_minutes: workout.estimatedDurationMinutes,
    safety_flags: workout.safetyFlags,
    payload: workout,
    blocked: workout.blocked ?? false,
  };
}

function generatedWorkoutExerciseRows(generatedWorkoutId: string, workout: GeneratedWorkout): Record<string, unknown>[] {
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const block of workout.blocks) {
    block.exercises.forEach((exercise, index) => {
      const key = `${block.id}:${exercise.exerciseId}:${index}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        generated_workout_id: generatedWorkoutId,
        exercise_id: exercise.exerciseId,
        block_id: exercise.blockId,
        prescription: exercise.prescription,
        substitutions: exercise.substitutions ?? [],
        sort_order: rows.length,
      });
    });
  }
  return rows;
}

async function saveGeneratedWorkoutWithExercisesDirect(
  userId: string,
  workout: GeneratedWorkout,
  client: WorkoutProgrammingSupabaseClient,
  context: string,
  options?: GeneratedWorkoutPersistenceOptions,
): Promise<string | null> {
  const existingId = options?.generatedWorkoutId ?? null;
  let generatedWorkoutId = existingId;
  let parentCreated = false;
  try {
    if (generatedWorkoutId) {
      await upsertRows(client, 'generated_workouts', [{ id: generatedWorkoutId, ...generatedWorkoutPayload(userId, workout) }], context, 'id');
      await deleteWhereEq(client, 'generated_workout_exercises', 'generated_workout_id', generatedWorkoutId, 'Replace generated workout exercise rows');
    } else {
      generatedWorkoutId = await insertReturningId(client, 'generated_workouts', generatedWorkoutPayload(userId, workout), context);
      parentCreated = true;
    }
    await insertRows(client, 'generated_workout_exercises', generatedWorkoutExerciseRows(generatedWorkoutId, workout), 'Failed to save generated workout exercises');
    return generatedWorkoutId;
  } catch (error) {
    if (generatedWorkoutId && parentCreated) {
      await bestEffortDeleteById(client, 'generated_workouts', generatedWorkoutId);
    }
    throw toPersistenceError(error, parentCreated
      ? 'Generated workout child persistence failed and parent rollback was attempted'
      : 'Generated workout persistence failed', parentCreated ? 'generated_workout_exercises' : 'generated_workouts');
  }
}

export async function saveGeneratedWorkoutWithExercises(
  userId: string,
  workout: GeneratedWorkout,
  options?: GeneratedWorkoutPersistenceOptions,
): Promise<string | null> {
  const context = 'Failed to save generated workout';
  assertUserId(userId, context);
  validateGeneratedWorkoutForPersistence(workout, 'Generated workout persistence payload');
  const client = await resolveClient(options);
  if (!client) return null;

  if (hasRpc(client)) {
    const generatedWorkoutId = await rpcReturningId(client, 'save_generated_workout_with_exercises', {
      p_user_id: userId,
      p_generated_workout_id: options?.generatedWorkoutId ?? null,
      p_workout: generatedWorkoutPayload(userId, workout),
      p_exercises: generatedWorkoutExerciseRows(options?.generatedWorkoutId ?? '00000000-0000-0000-0000-000000000000', workout),
    }, context);
    const loaded = await loadGeneratedWorkout(userId, generatedWorkoutId, { ...options, client });
    if (!loaded) throw new NotFoundError(`${context}: generated workout ${generatedWorkoutId} was not readable after RPC persistence.`, { context, table: 'generated_workouts' });
    validateGeneratedWorkoutForPersistence(loaded, 'Persisted generated workout payload');
    return generatedWorkoutId;
  }

  assertClientWriteFallbackAllowed(options, context);
  return saveGeneratedWorkoutWithExercisesDirect(userId, workout, client, context, options);
}

export async function saveGeneratedWorkout(
  userId: string,
  workout: GeneratedWorkout,
  options?: GeneratedWorkoutPersistenceOptions,
): Promise<string | null> {
  return saveGeneratedWorkoutWithExercises(userId, workout, options);
}

export async function loadGeneratedWorkout(
  userId: string,
  generatedWorkoutId: string,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedWorkout | null> {
  const context = 'Failed to load generated workout';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return null;
  let query = requireBuilder(table(client, 'generated_workouts').select?.('*'), context, 'generated_workouts', 'select');
  query = requireBuilder(query.eq?.('id', generatedWorkoutId), context, 'generated_workouts', 'filter');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'generated_workouts', 'filter');
  const row = await selectMaybeSingleRow('generated_workouts', query, context);
  if (!row) throw new NotFoundError(`${context}: generated workout ${generatedWorkoutId} was not found for this user.`, { context, table: 'generated_workouts' });
  const payload = row.payload;
  validateGeneratedWorkoutForPersistence(payload as GeneratedWorkout, 'Loaded generated workout payload');
  return payload as GeneratedWorkout;
}

export async function listGeneratedWorkoutsForUser(
  userId: string,
  options?: ListPersistenceOptions,
): Promise<GeneratedWorkout[]> {
  const context = 'Failed to list generated workouts';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return [];
  let query = requireBuilder(table(client, 'generated_workouts').select?.('*'), context, 'generated_workouts', 'select');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'generated_workouts', 'filter');
  if (query.order) query = requireBuilder(query.order('created_at', { ascending: false }), context, 'generated_workouts', 'order');
  if (options?.limit != null && query.limit) query = requireBuilder(query.limit(options.limit), context, 'generated_workouts', 'limit');
  const result = await asPromise<Record<string, unknown>[]>(query);
  ensureNoError(result, context, 'generated_workouts');
  return (result.data ?? []).map((row) => {
    const payload = row.payload;
    validateGeneratedWorkoutForPersistence(payload as GeneratedWorkout, 'Loaded generated workout payload');
    return payload as GeneratedWorkout;
  });
}

const activeGeneratedWorkoutLifecycleStatuses: GeneratedWorkoutSessionLifecycleStatus[] = [
  'generated',
  'inspected',
  'started',
  'paused',
  'resumed',
];

function assertGeneratedWorkoutId(generatedWorkoutId: string, context: string): void {
  if (!generatedWorkoutId.trim()) throw new ValidationError(`${context}: generatedWorkoutId is required.`, { context });
}

function lifecycleTimestamp(options?: GeneratedWorkoutSessionLifecycleOptions): string {
  return options?.occurredAt ?? new Date().toISOString();
}

function lifecycleFromRow(row: Record<string, unknown>): GeneratedWorkoutSessionLifecycle {
  const lifecycle: GeneratedWorkoutSessionLifecycle = {
    generatedWorkoutId: rowString(row, 'generated_workout_id'),
    userId: rowString(row, 'user_id'),
    status: rowString(row, 'status', 'generated') as GeneratedWorkoutSessionLifecycleStatus,
    lastActiveAt: rowString(row, 'last_active_at') || new Date().toISOString(),
  };
  const id = rowString(row, 'id');
  const inspectedAt = rowString(row, 'inspected_at');
  const startedAt = rowString(row, 'started_at');
  const pausedAt = rowString(row, 'paused_at');
  const resumedAt = rowString(row, 'resumed_at');
  const completedAt = rowString(row, 'completed_at');
  const abandonedAt = rowString(row, 'abandoned_at');
  const stoppedAt = rowString(row, 'stopped_at');
  const completionStatus = rowString(row, 'completion_status');
  const activeBlockId = rowString(row, 'active_block_id');
  const activeExerciseId = rowString(row, 'active_exercise_id');
  const notes = rowString(row, 'notes');
  if (id) lifecycle.id = id;
  if (inspectedAt) lifecycle.inspectedAt = inspectedAt;
  if (startedAt) lifecycle.startedAt = startedAt;
  if (pausedAt) lifecycle.pausedAt = pausedAt;
  if (resumedAt) lifecycle.resumedAt = resumedAt;
  if (completedAt) lifecycle.completedAt = completedAt;
  if (abandonedAt) lifecycle.abandonedAt = abandonedAt;
  if (stoppedAt) lifecycle.stoppedAt = stoppedAt;
  if (completionStatus) lifecycle.completionStatus = completionStatus as GeneratedWorkoutSessionCompletionStatus;
  if (activeBlockId) lifecycle.activeBlockId = activeBlockId;
  if (activeExerciseId) lifecycle.activeExerciseId = activeExerciseId;
  if (notes) lifecycle.notes = notes;
  return lifecycle;
}

async function assertGeneratedWorkoutLifecycleParent(
  userId: string,
  generatedWorkoutId: string,
  client: WorkoutProgrammingSupabaseClient,
  context: string,
): Promise<void> {
  let query = requireBuilder(table(client, 'generated_workouts').select?.('id'), context, 'generated_workouts', 'select');
  query = requireBuilder(query.eq?.('id', generatedWorkoutId), context, 'generated_workouts', 'filter');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'generated_workouts', 'filter');
  const row = await selectMaybeSingleRow('generated_workouts', query, context);
  if (!row) {
    throw new NotFoundError(`${context}: generated workout ${generatedWorkoutId} was not found for this user.`, {
      context,
      table: 'generated_workouts',
    });
  }
}

function lifecyclePatchPayload(
  userId: string,
  generatedWorkoutId: string,
  status: GeneratedWorkoutSessionLifecycleStatus,
  timestampColumn: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Record<string, unknown> {
  const timestamp = lifecycleTimestamp(options);
  const payload: Record<string, unknown> = {
    generated_workout_id: generatedWorkoutId,
    user_id: userId,
    status,
    [timestampColumn]: timestamp,
    last_active_at: timestamp,
  };
  if (options?.activeBlockId !== undefined) payload.active_block_id = options.activeBlockId;
  if (options?.activeExerciseId !== undefined) payload.active_exercise_id = options.activeExerciseId;
  if (options?.notes !== undefined) payload.notes = options.notes;
  if (options?.completionStatus !== undefined) payload.completion_status = options.completionStatus;
  return payload;
}

async function upsertGeneratedWorkoutLifecycle(
  userId: string,
  generatedWorkoutId: string,
  status: GeneratedWorkoutSessionLifecycleStatus,
  timestampColumn: string,
  context: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  assertUserId(userId, context);
  assertGeneratedWorkoutId(generatedWorkoutId, context);
  const client = await resolveClient(options);
  if (!client) return null;
  await assertGeneratedWorkoutLifecycleParent(userId, generatedWorkoutId, client, context);
  await upsertRows(
    client,
    'generated_workout_session_lifecycle',
    [lifecyclePatchPayload(userId, generatedWorkoutId, status, timestampColumn, options)],
    context,
    'generated_workout_id',
  );
  return loadGeneratedWorkoutSessionLifecycleForWorkout(userId, generatedWorkoutId, { ...options, client });
}

async function loadGeneratedWorkoutSessionLifecycleForWorkout(
  userId: string,
  generatedWorkoutId: string,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  const context = 'Failed to load generated workout session lifecycle';
  assertUserId(userId, context);
  assertGeneratedWorkoutId(generatedWorkoutId, context);
  const client = await resolveClient(options);
  if (!client) return null;
  let query = requireBuilder(table(client, 'generated_workout_session_lifecycle').select?.('*'), context, 'generated_workout_session_lifecycle', 'select');
  query = requireBuilder(query.eq?.('generated_workout_id', generatedWorkoutId), context, 'generated_workout_session_lifecycle', 'filter');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'generated_workout_session_lifecycle', 'filter');
  const row = await selectMaybeSingleRow('generated_workout_session_lifecycle', query, context);
  return row ? lifecycleFromRow(row) : null;
}

export async function markGeneratedWorkoutInspected(
  userId: string,
  generatedWorkoutId: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return upsertGeneratedWorkoutLifecycle(userId, generatedWorkoutId, 'inspected', 'inspected_at', 'Failed to mark generated workout inspected', options);
}

export async function startGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return upsertGeneratedWorkoutLifecycle(userId, generatedWorkoutId, 'started', 'started_at', 'Failed to start generated workout session', options);
}

export async function pauseGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return upsertGeneratedWorkoutLifecycle(userId, generatedWorkoutId, 'paused', 'paused_at', 'Failed to pause generated workout session', options);
}

export async function resumeGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return upsertGeneratedWorkoutLifecycle(userId, generatedWorkoutId, 'resumed', 'resumed_at', 'Failed to resume generated workout session', options);
}

export async function abandonGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return upsertGeneratedWorkoutLifecycle(userId, generatedWorkoutId, 'abandoned', 'abandoned_at', 'Failed to abandon generated workout session', {
    ...options,
    completionStatus: options?.completionStatus ?? 'abandoned',
  });
}

export async function stopGeneratedWorkoutSession(
  userId: string,
  generatedWorkoutId: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return upsertGeneratedWorkoutLifecycle(userId, generatedWorkoutId, 'stopped', 'stopped_at', 'Failed to stop generated workout session', {
    ...options,
    completionStatus: options?.completionStatus ?? 'stopped',
  });
}

export async function completeGeneratedWorkoutSessionLifecycle(
  userId: string,
  generatedWorkoutId: string,
  options?: GeneratedWorkoutSessionLifecycleOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  return upsertGeneratedWorkoutLifecycle(userId, generatedWorkoutId, 'completed', 'completed_at', 'Failed to complete generated workout session lifecycle', {
    ...options,
    activeBlockId: options?.activeBlockId ?? null,
    activeExerciseId: options?.activeExerciseId ?? null,
    completionStatus: options?.completionStatus ?? 'completed',
  });
}

export async function loadActiveGeneratedWorkoutSession(
  userId: string,
  options?: ActiveGeneratedWorkoutSessionListOptions,
): Promise<GeneratedWorkoutSessionLifecycle | null> {
  const sessions = await listActiveGeneratedWorkoutSessions(userId, { ...options, limit: 1 });
  return sessions[0] ?? null;
}

export async function listActiveGeneratedWorkoutSessions(
  userId: string,
  options?: ActiveGeneratedWorkoutSessionListOptions,
): Promise<GeneratedWorkoutSessionLifecycle[]> {
  const context = 'Failed to list active generated workout sessions';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return [];
  let query = requireBuilder(table(client, 'generated_workout_session_lifecycle').select?.('*'), context, 'generated_workout_session_lifecycle', 'select');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'generated_workout_session_lifecycle', 'filter');
  if (options?.generatedWorkoutId) {
    query = requireBuilder(query.eq?.('generated_workout_id', options.generatedWorkoutId), context, 'generated_workout_session_lifecycle', 'filter');
  }
  if (query.in) query = requireBuilder(query.in('status', activeGeneratedWorkoutLifecycleStatuses), context, 'generated_workout_session_lifecycle', 'filter');
  if (query.order) query = requireBuilder(query.order('last_active_at', { ascending: false }), context, 'generated_workout_session_lifecycle', 'order');
  if (options?.limit != null && query.limit) query = requireBuilder(query.limit(options.limit), context, 'generated_workout_session_lifecycle', 'limit');
  const result = await asPromise<Record<string, unknown>[]>(query);
  ensureNoError(result, context, 'generated_workout_session_lifecycle');
  return (result.data ?? [])
    .map(lifecycleFromRow)
    .filter((session) => activeGeneratedWorkoutLifecycleStatuses.includes(session.status));
}

function completionPayload(userId: string, completion: WorkoutCompletionLog, generatedWorkoutId?: string | null) {
  const resolvedGeneratedWorkoutId = generatedWorkoutId ?? completion.generatedWorkoutId ?? null;
  return {
    user_id: userId,
    generated_workout_id: resolvedGeneratedWorkoutId,
    source: completion.source ?? (resolvedGeneratedWorkoutId ? 'generated_workout' : 'workout_programming'),
    workout_type_id: completion.workoutTypeId ?? null,
    goal_id: completion.goalId ?? null,
    prescription_template_id: completion.prescriptionTemplateId ?? null,
    completion_status: completion.completionStatus ?? null,
    substitutions_used: uniqueStrings(completion.substitutionsUsed ?? []),
    completed_at: completion.completedAt,
    planned_duration_minutes: completion.plannedDurationMinutes,
    actual_duration_minutes: completion.actualDurationMinutes,
    session_rpe: completion.sessionRpe,
    readiness_before: completion.readinessBefore ?? null,
    readiness_after: completion.readinessAfter ?? null,
    heart_rate_zone_compliance: completion.heartRateZoneCompliance ?? null,
    density_score: completion.densityScore ?? null,
    movement_quality: completion.movementQuality ?? null,
    range_control_score: completion.rangeControlScore ?? null,
    power_quality_score: completion.powerQualityScore ?? null,
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
    sets_prescribed: result.setsPrescribed ?? null,
    reps_completed: result.repsCompleted ?? null,
    reps_prescribed: result.repsPrescribed ?? null,
    rep_range_min: result.repRangeMin ?? null,
    rep_range_max: result.repRangeMax ?? null,
    duration_seconds_completed: result.durationSecondsCompleted
      ?? (result.durationMinutesCompleted != null ? Math.round(result.durationMinutesCompleted * 60) : null),
    duration_seconds_prescribed: result.durationSecondsPrescribed
      ?? (result.durationMinutesPrescribed != null ? Math.round(result.durationMinutesPrescribed * 60) : null),
    duration_minutes_completed: result.durationMinutesCompleted ?? null,
    duration_minutes_prescribed: result.durationMinutesPrescribed ?? null,
    load_used: result.loadUsed ?? null,
    prescribed_load: result.prescribedLoad ?? null,
    actual_rpe: result.actualRpe ?? null,
    target_rpe: result.targetRpe ?? null,
    actual_rir: result.actualRir ?? null,
    target_rir: result.targetRir ?? null,
    heart_rate_zone_compliance: result.heartRateZoneCompliance ?? null,
    movement_quality: result.movementQuality ?? null,
    range_control_score: result.rangeControlScore ?? null,
    power_quality_score: result.powerQualityScore ?? null,
    pain_score: result.painScore ?? null,
    completed_as_prescribed: result.completedAsPrescribed,
  };
}

async function loadWorkoutCompletionById(
  userId: string,
  workoutCompletionId: string,
  client: WorkoutProgrammingSupabaseClient,
  context: string,
  fallbackWorkoutId?: string,
): Promise<WorkoutCompletionLog> {
  let query = requireBuilder(table(client, 'workout_completions').select?.('*'), context, 'workout_completions', 'select');
  query = requireBuilder(query.eq?.('id', workoutCompletionId), context, 'workout_completions', 'filter');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'workout_completions', 'filter');
  const row = await selectMaybeSingleRow('workout_completions', query, context);
  if (!row) throw new NotFoundError(`${context}: workout completion ${workoutCompletionId} was not readable after persistence.`, { context, table: 'workout_completions' });

  let childQuery = requireBuilder(table(client, 'exercise_completion_results').select?.('*'), context, 'exercise_completion_results', 'select');
  childQuery = requireBuilder(childQuery.eq?.('workout_completion_id', workoutCompletionId), context, 'exercise_completion_results', 'filter');
  const childResult = await asPromise<Record<string, unknown>[]>(childQuery);
  ensureNoError(childResult, context, 'exercise_completion_results');
  const completion = {
    ...completionFromRow(row, (childResult.data ?? []).map(exerciseCompletionFromRow)),
    workoutId: rowString(row, 'generated_workout_id') || fallbackWorkoutId || '',
  };
  validateCompletionLog(completion, 'Persisted workout completion payload');
  return completion;
}

export async function logWorkoutCompletion(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: WorkoutCompletionPersistenceOptions,
): Promise<string | null> {
  return logWorkoutCompletionWithExerciseResults(userId, completion, options);
}

async function logWorkoutCompletionWithExerciseResultsDirect(
  userId: string,
  completion: WorkoutCompletionLog,
  client: WorkoutProgrammingSupabaseClient,
  context: string,
  options?: WorkoutCompletionPersistenceOptions,
): Promise<string | null> {
  let workoutCompletionId: string | null = null;
  try {
    workoutCompletionId = await insertReturningId(client, 'workout_completions', completionPayload(userId, completion, options?.generatedWorkoutId), context);
    await insertRows(
      client,
      'exercise_completion_results',
      completion.exerciseResults.map((result) => exerciseCompletionPayload(workoutCompletionId!, result)),
      'Failed to log exercise completion results',
    );
    return workoutCompletionId;
  } catch (error) {
    if (workoutCompletionId) await bestEffortDeleteById(client, 'workout_completions', workoutCompletionId);
    throw toPersistenceError(error, 'Workout completion persistence failed and parent rollback was attempted', workoutCompletionId ? 'exercise_completion_results' : 'workout_completions');
  }
}

export async function logWorkoutCompletionWithExerciseResults(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: WorkoutCompletionPersistenceOptions,
): Promise<string | null> {
  const context = 'Failed to log workout completion';
  assertUserId(userId, context);
  validateCompletionLog(completion, 'Workout completion persistence payload');
  const client = await resolveClient(options);
  if (!client) return null;

  if (hasRpc(client)) {
    const workoutCompletionId = await rpcReturningId(client, 'log_workout_completion_with_results', {
      p_user_id: userId,
      p_generated_workout_id: options?.generatedWorkoutId ?? null,
      p_completion: completionPayload(userId, completion, options?.generatedWorkoutId),
      p_results: completion.exerciseResults.map((result) => exerciseCompletionPayload('00000000-0000-0000-0000-000000000000', result)),
    }, context);
    await loadWorkoutCompletionById(userId, workoutCompletionId, client, context, completion.workoutId);
    return workoutCompletionId;
  }

  assertClientWriteFallbackAllowed(options, context);
  return logWorkoutCompletionWithExerciseResultsDirect(userId, completion, client, context, options);
}

function dbProgressionDirection(decision: ProgressionDecision): 'progress' | 'repeat' | 'regress' | 'recover' {
  if (decision.direction === 'progress' || decision.direction === 'repeat' || decision.direction === 'regress' || decision.direction === 'recover') {
    return decision.direction;
  }
  if (decision.direction === 'deload' || decision.direction === 'reduceVolume' || decision.direction === 'reduceIntensity') return 'recover';
  return 'regress';
}

function progressionDecisionFromRow(row: Record<string, unknown>): ProgressionDecision {
  const payload = row.payload;
  if (isRecord(payload)
    && typeof payload.direction === 'string'
    && typeof payload.reason === 'string'
    && typeof payload.nextAdjustment === 'string'
    && Array.isArray(payload.safetyFlags)
  ) {
    return payload as unknown as ProgressionDecision;
  }
  return {
    direction: rowString(row, 'direction', 'repeat') as ProgressionDecision['direction'],
    decision: rowString(row, 'direction', 'repeat') as ProgressionDecision['direction'],
    reason: rowString(row, 'reason'),
    nextAdjustment: rowString(row, 'next_adjustment'),
    safetyFlags: rowStringArray(row, 'safety_flags'),
  };
}

export async function saveProgressionDecision(
  userId: string,
  decision: ProgressionDecision,
  options?: WorkoutProgrammingPersistenceOptions & { workoutCompletionId?: string | null },
): Promise<string | null> {
  const context = 'Failed to save progression decision';
  assertUserId(userId, context);
  validateProgressionDecision(decision, 'Progression decision persistence payload');
  const client = await resolveClient(options);
  if (!client) return null;
  const dbDirection = dbProgressionDirection(decision);

  if (options?.workoutCompletionId) {
    return insertReturningId(client, 'progression_decisions', {
        workout_completion_id: options.workoutCompletionId,
        direction: dbDirection,
        reason: decision.reason,
        next_adjustment: decision.nextAdjustment,
        safety_flags: decision.safetyFlags,
        payload: decision,
      }, context);
  }

  return insertReturningId(client, 'performance_observations', {
      user_id: userId,
      observation_kind: 'progression_decision',
      payload: decision,
    }, 'Failed to save progression decision observation');
}

export async function loadProgressionDecisionsForCompletion(
  workoutCompletionId: string,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<ProgressionDecision[]> {
  const context = 'Failed to load progression decisions';
  if (!workoutCompletionId.trim()) throw new ValidationError(`${context}: workoutCompletionId is required.`, { context });
  const client = await resolveClient(options);
  if (!client) return [];
  let query = requireBuilder(table(client, 'progression_decisions').select?.('*'), context, 'progression_decisions', 'select');
  query = requireBuilder(query.eq?.('workout_completion_id', workoutCompletionId), context, 'progression_decisions', 'filter');
  const result = await asPromise<Record<string, unknown>[]>(query);
  ensureNoError(result, context, 'progression_decisions');
  return (result.data ?? []).map(progressionDecisionFromRow);
}

export async function loadRecentProgressionDecisionsForUser(
  userId: string,
  options?: ListPersistenceOptions,
): Promise<ProgressionDecision[]> {
  const context = 'Failed to load recent progression decisions';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return [];
  const completions = await loadRecentCompletions(userId, { ...options, limit: options?.limit ?? 10 });
  const decisions: ProgressionDecision[] = [];
  for (const completion of completions) {
    if (!completion.id) continue;
    decisions.push(...await loadProgressionDecisionsForCompletion(completion.id, options));
    if (options?.limit != null && decisions.length >= options.limit) break;
  }
  return options?.limit != null ? decisions.slice(0, options.limit) : decisions;
}

export async function upsertUserEquipment(
  userId: string,
  equipmentIds: string[],
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const context = 'Failed to update user equipment';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return;
  await deleteWhereEq(client, 'user_equipment', 'user_id', userId, 'Failed to clear user equipment');
  const rows = uniqueStrings(equipmentIds).map((equipmentId) => ({ user_id: userId, equipment_type_id: equipmentId }));
  await upsertRows(client, 'user_equipment', rows, context, 'user_id,equipment_type_id');
}

export async function updateUserEquipment(
  userId: string,
  equipmentIds: string[],
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  return upsertUserEquipment(userId, equipmentIds, options);
}

export async function upsertUserSafetyFlags(
  userId: string,
  flags: string[],
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const context = 'Failed to update user safety flags';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return;
  await deleteWhereEq(client, 'user_safety_flags', 'user_id', userId, 'Failed to clear user safety flags');
  const rows = uniqueStrings(flags).map((flag) => ({ user_id: userId, safety_flag_id: flag, source: 'user' }));
  await upsertRows(client, 'user_safety_flags', rows, context, 'user_id,safety_flag_id');
}

export async function updateUserSafetyFlags(
  userId: string,
  flags: string[],
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  return upsertUserSafetyFlags(userId, flags, options);
}

export async function upsertExercisePreferences(
  userId: string,
  preferences: ExercisePreferenceInput[],
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const context = 'Failed to update exercise preferences';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return;
  const byExercise = new Map<string, ExercisePreference>();
  for (const item of preferences) {
    if (!item.exerciseId.trim()) throw new ValidationError(`${context}: exerciseId is required.`, { context });
    byExercise.set(item.exerciseId, item.preference);
  }
  const rows = Array.from(byExercise.entries()).map(([exerciseId, preference]) => ({
    user_id: userId,
    exercise_id: exerciseId,
    preference,
    updated_at: new Date().toISOString(),
  }));
  await upsertRows(client, 'user_exercise_preferences', rows, context, 'user_id,exercise_id');
}

export async function updateExercisePreference(
  userId: string,
  exerciseId: string,
  preference: ExercisePreference,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  return upsertExercisePreferences(userId, [{ exerciseId, preference }], options);
}

export async function logReadiness(
  userId: string,
  readinessLog: WorkoutReadinessLogInput,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<string | null> {
  const context = 'Failed to log readiness';
  assertUserId(userId, context);
  if (!readinessLog.readinessBand) throw new ValidationError(`${context}: readinessBand is required.`, { context });
  const client = await resolveClient(options);
  if (!client) return null;
  return insertReturningId(client, 'user_readiness_logs', {
      user_id: userId,
      readiness_band: readinessLog.readinessBand,
      notes: readinessLog.notes ?? null,
      created_at: readinessLog.createdAt ?? new Date().toISOString(),
    }, context);
}

export async function loadRecentReadiness(
  userId: string,
  options?: ListPersistenceOptions,
): Promise<WorkoutReadinessLog[]> {
  const context = 'Failed to load recent readiness';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return [];
  let query = requireBuilder(table(client, 'user_readiness_logs').select?.('*'), context, 'user_readiness_logs', 'select');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'user_readiness_logs', 'filter');
  if (query.order) query = requireBuilder(query.order('created_at', { ascending: false }), context, 'user_readiness_logs', 'order');
  if (options?.limit != null && query.limit) query = requireBuilder(query.limit(options.limit), context, 'user_readiness_logs', 'limit');
  const result = await asPromise<Record<string, unknown>[]>(query);
  ensureNoError(result, context, 'user_readiness_logs');
  return (result.data ?? []).map((row) => ({
    id: rowString(row, 'id'),
    userId,
    readinessBand: rowString(row, 'readiness_band', 'unknown') as WorkoutReadinessBand,
    notes: rowString(row, 'notes') || null,
    createdAt: rowString(row, 'created_at'),
  }));
}

export async function saveRecommendationFeedback(
  userId: string,
  feedback: RecommendationFeedbackInput,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<string | null> {
  const context = 'Failed to save recommendation feedback';
  assertUserId(userId, context);
  validateFeedback(feedback, 'Recommendation feedback persistence payload');
  const client = await resolveClient(options);
  if (!client) return null;
  return insertReturningId(client, 'recommendation_feedback', {
      user_id: userId,
      generated_workout_id: feedback.generatedWorkoutId ?? null,
      rating: feedback.rating ?? null,
      notes: feedback.notes ?? null,
    }, context);
}

function recommendationEventPayload(userId: string, event: RecommendationEventInput): Record<string, unknown> {
  return {
    user_id: userId,
    generated_workout_id: event.generatedWorkoutId ?? null,
    event_kind: event.eventKind,
    decision_trace: event.decisionTrace ?? [],
    payload: event.payload ?? {},
    app_context_version: event.appContextVersion ?? null,
    engine_version: event.engineVersion ?? null,
    content_version: event.contentVersion ?? null,
    created_at: event.timestamp ?? new Date().toISOString(),
  };
}

function recommendationEventFromRow(row: Record<string, unknown>, userId: string): RecommendationEvent {
  const generatedWorkoutId = rowString(row, 'generated_workout_id');
  const decisionTrace = Array.isArray(row.decision_trace) ? row.decision_trace : [];
  const payload = isRecord(row.payload) ? row.payload : {};
  const event: RecommendationEvent = {
    userId,
    generatedWorkoutId: generatedWorkoutId || null,
    eventKind: rowString(row, 'event_kind') as RecommendationEvent['eventKind'],
    timestamp: rowString(row, 'created_at'),
    decisionTrace: decisionTrace as RecommendationEvent['decisionTrace'],
    payload,
    appContextVersion: rowString(row, 'app_context_version') || null,
    engineVersion: rowString(row, 'engine_version') || null,
    contentVersion: rowString(row, 'content_version') || null,
  };
  const id = rowString(row, 'id');
  if (id) event.id = id;
  return event;
}

export async function saveRecommendationEvent(
  userId: string,
  event: RecommendationEventInput,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<string | null> {
  const context = 'Failed to save recommendation event';
  assertUserId(userId, context);
  validateRecommendationEvent(event, 'Recommendation event persistence payload');
  const client = await resolveClient(options);
  if (!client) return null;
  return insertReturningId(client, 'recommendation_events', recommendationEventPayload(userId, event), context);
}

export async function loadRecommendationEvents(
  userId: string,
  options?: RecommendationEventListOptions,
): Promise<RecommendationEvent[]> {
  const context = 'Failed to load recommendation events';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return [];
  let query = requireBuilder(table(client, 'recommendation_events').select?.('*'), context, 'recommendation_events', 'select');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'recommendation_events', 'filter');
  if (options?.generatedWorkoutId) {
    query = requireBuilder(query.eq?.('generated_workout_id', options.generatedWorkoutId), context, 'recommendation_events', 'filter');
  }
  if (options?.eventKinds && options.eventKinds.length > 0 && query.in) {
    query = requireBuilder(query.in('event_kind', uniqueStrings(options.eventKinds)), context, 'recommendation_events', 'filter');
  }
  if (query.order) query = requireBuilder(query.order('created_at', { ascending: false }), context, 'recommendation_events', 'order');
  if (options?.limit != null && query.limit) query = requireBuilder(query.limit(options.limit), context, 'recommendation_events', 'limit');
  const result = await asPromise<Record<string, unknown>[]>(query);
  ensureNoError(result, context, 'recommendation_events');
  return (result.data ?? []).map((row) => recommendationEventFromRow(row, userId));
}

export async function upsertUserWorkoutProfile(
  userId: string,
  input: Pick<PersonalizedWorkoutInput, 'experienceLevel' | 'preferredDurationMinutes' | 'readinessBand'>,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  const context = 'Failed to save user workout profile';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return;
  await upsertRows(client, 'user_training_profiles', [{
    user_id: userId,
    experience_level: input.experienceLevel,
    preferred_duration_minutes: input.preferredDurationMinutes ?? 35,
    readiness_band: input.readinessBand ?? 'unknown',
    updated_at: new Date().toISOString(),
  }], context, 'user_id');
}

export async function saveUserWorkoutProfile(
  userId: string,
  input: Pick<PersonalizedWorkoutInput, 'experienceLevel' | 'preferredDurationMinutes' | 'readinessBand'>,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<void> {
  return upsertUserWorkoutProfile(userId, input, options);
}

function completionFromRow(row: Record<string, unknown>, exerciseResults: ExerciseCompletionResult[]): WorkoutCompletionLog {
  const generatedWorkoutId = rowString(row, 'generated_workout_id');
  const completionSource = rowString(row, 'source') === 'generated_workout' || generatedWorkoutId
    ? 'generated_workout'
    : 'workout_programming';
  const completion: WorkoutCompletionLog = {
    id: rowString(row, 'id'),
    workoutId: generatedWorkoutId || rowString(row, 'id'),
    generatedWorkoutId: generatedWorkoutId || null,
    source: completionSource,
    completedAt: rowString(row, 'completed_at'),
    plannedDurationMinutes: rowNumber(row, 'planned_duration_minutes', 0),
    actualDurationMinutes: rowNumber(row, 'actual_duration_minutes', 0),
    sessionRpe: rowNumber(row, 'session_rpe', 1),
    notes: rowString(row, 'notes') || null,
    exerciseResults,
  };
  const workoutTypeId = rowString(row, 'workout_type_id');
  const goalId = rowString(row, 'goal_id');
  const prescriptionTemplateId = rowString(row, 'prescription_template_id');
  const completionStatus = rowString(row, 'completion_status') as GeneratedWorkoutSessionCompletionStatus;
  const substitutionsUsed = rowStringArray(row, 'substitutions_used');
  const readinessBefore = rowString(row, 'readiness_before') as WorkoutReadinessBand;
  const readinessAfter = rowString(row, 'readiness_after') as WorkoutReadinessBand;
  const heartRateZoneCompliance = rowOptionalNumber(row, 'heart_rate_zone_compliance');
  const densityScore = rowOptionalNumber(row, 'density_score');
  const movementQuality = rowOptionalNumber(row, 'movement_quality');
  const rangeControlScore = rowOptionalNumber(row, 'range_control_score');
  const powerQualityScore = rowOptionalNumber(row, 'power_quality_score');
  const painScoreBefore = rowOptionalNumber(row, 'pain_score_before');
  const painScoreAfter = rowOptionalNumber(row, 'pain_score_after');
  if (workoutTypeId) completion.workoutTypeId = workoutTypeId;
  if (goalId) completion.goalId = goalId;
  if (prescriptionTemplateId) completion.prescriptionTemplateId = prescriptionTemplateId;
  if (completionStatus) completion.completionStatus = completionStatus;
  if (substitutionsUsed.length > 0) completion.substitutionsUsed = substitutionsUsed;
  if (readinessBefore) completion.readinessBefore = readinessBefore;
  if (readinessAfter) completion.readinessAfter = readinessAfter;
  if (heartRateZoneCompliance != null) completion.heartRateZoneCompliance = heartRateZoneCompliance;
  if (densityScore != null) completion.densityScore = densityScore;
  if (movementQuality != null) completion.movementQuality = movementQuality;
  if (rangeControlScore != null) completion.rangeControlScore = rangeControlScore;
  if (powerQualityScore != null) completion.powerQualityScore = powerQualityScore;
  if (painScoreBefore != null) completion.painScoreBefore = painScoreBefore;
  if (painScoreAfter != null) completion.painScoreAfter = painScoreAfter;
  return completion;
}

function exerciseCompletionFromRow(row: Record<string, unknown>): ExerciseCompletionResult {
  const result: ExerciseCompletionResult = {
    exerciseId: rowString(row, 'exercise_id'),
    setsCompleted: rowNumber(row, 'sets_completed', 0),
    completedAsPrescribed: rowBoolean(row, 'completed_as_prescribed') ?? false,
  };
  const setsPrescribed = rowOptionalNumber(row, 'sets_prescribed');
  const repsCompleted = rowOptionalNumber(row, 'reps_completed');
  const repsPrescribed = rowOptionalNumber(row, 'reps_prescribed');
  const repRangeMin = rowOptionalNumber(row, 'rep_range_min');
  const repRangeMax = rowOptionalNumber(row, 'rep_range_max');
  const durationSecondsCompleted = rowOptionalNumber(row, 'duration_seconds_completed');
  const durationSecondsPrescribed = rowOptionalNumber(row, 'duration_seconds_prescribed');
  const durationMinutesCompleted = rowOptionalNumber(row, 'duration_minutes_completed');
  const durationMinutesPrescribed = rowOptionalNumber(row, 'duration_minutes_prescribed');
  const loadUsed = rowOptionalNumber(row, 'load_used');
  const prescribedLoad = rowOptionalNumber(row, 'prescribed_load');
  const actualRpe = rowOptionalNumber(row, 'actual_rpe');
  const targetRpe = rowOptionalNumber(row, 'target_rpe');
  const actualRir = rowOptionalNumber(row, 'actual_rir');
  const targetRir = rowOptionalNumber(row, 'target_rir');
  const heartRateZoneCompliance = rowOptionalNumber(row, 'heart_rate_zone_compliance');
  const movementQuality = rowOptionalNumber(row, 'movement_quality');
  const rangeControlScore = rowOptionalNumber(row, 'range_control_score');
  const powerQualityScore = rowOptionalNumber(row, 'power_quality_score');
  const painScore = rowOptionalNumber(row, 'pain_score');
  if (setsPrescribed != null) result.setsPrescribed = setsPrescribed;
  if (repsCompleted != null) result.repsCompleted = repsCompleted;
  if (repsPrescribed != null) result.repsPrescribed = repsPrescribed;
  if (repRangeMin != null) result.repRangeMin = repRangeMin;
  if (repRangeMax != null) result.repRangeMax = repRangeMax;
  if (durationSecondsCompleted != null) result.durationSecondsCompleted = durationSecondsCompleted;
  if (durationSecondsPrescribed != null) result.durationSecondsPrescribed = durationSecondsPrescribed;
  if (durationMinutesCompleted != null) result.durationMinutesCompleted = durationMinutesCompleted;
  if (durationMinutesPrescribed != null) result.durationMinutesPrescribed = durationMinutesPrescribed;
  if (loadUsed != null) result.loadUsed = loadUsed;
  if (prescribedLoad != null) result.prescribedLoad = prescribedLoad;
  if (actualRpe != null) result.actualRpe = actualRpe;
  if (targetRpe != null) result.targetRpe = targetRpe;
  if (actualRir != null) result.actualRir = actualRir;
  if (targetRir != null) result.targetRir = targetRir;
  if (heartRateZoneCompliance != null) result.heartRateZoneCompliance = heartRateZoneCompliance;
  if (movementQuality != null) result.movementQuality = movementQuality;
  if (rangeControlScore != null) result.rangeControlScore = rangeControlScore;
  if (powerQualityScore != null) result.powerQualityScore = powerQualityScore;
  if (painScore != null) result.painScore = painScore;
  return result;
}

export async function loadRecentCompletions(
  userId: string,
  options?: ListPersistenceOptions,
): Promise<WorkoutCompletionLog[]> {
  const context = 'Failed to load recent completions';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return [];
  let query = requireBuilder(table(client, 'workout_completions').select?.('*'), context, 'workout_completions', 'select');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'workout_completions', 'filter');
  if (query.order) query = requireBuilder(query.order('completed_at', { ascending: false }), context, 'workout_completions', 'order');
  if (options?.limit != null && query.limit) query = requireBuilder(query.limit(options.limit), context, 'workout_completions', 'limit');
  const result = await asPromise<Record<string, unknown>[]>(query);
  ensureNoError(result, context, 'workout_completions');
  const completions = result.data ?? [];
  const output: WorkoutCompletionLog[] = [];
  for (const row of completions) {
    const completionId = rowString(row, 'id');
    let childQuery = requireBuilder(table(client, 'exercise_completion_results').select?.('*'), context, 'exercise_completion_results', 'select');
    childQuery = requireBuilder(childQuery.eq?.('workout_completion_id', completionId), context, 'exercise_completion_results', 'filter');
    const childResult = await asPromise<Record<string, unknown>[]>(childQuery);
    ensureNoError(childResult, context, 'exercise_completion_results');
    output.push(completionFromRow(row, (childResult.data ?? []).map(exerciseCompletionFromRow)));
  }
  return output;
}

export async function loadRecentExerciseResults(
  userId: string,
  options?: ListPersistenceOptions,
): Promise<ExerciseCompletionResult[]> {
  const completions = await loadRecentCompletions(userId, options);
  return completions.flatMap((completion) => completion.exerciseResults);
}

async function saveGeneratedProgramDirect(
  userId: string,
  preparedProgram: GeneratedProgram,
  existingId: string | null,
  client: WorkoutProgrammingSupabaseClient,
  context: string,
): Promise<string | null> {
  if (existingId) {
    await upsertRows(client, 'user_programs', [programRowPayload(userId, preparedProgram, existingId)], context, 'id');
    return existingId;
  }
  const id = await insertReturningId(client, 'user_programs', programRowPayload(userId, preparedProgram), context);
  const persistedProgram = programPayloadWithPersistence(preparedProgram, id);
  validateGeneratedProgram(persistedProgram, 'Persisted generated program payload');
  await upsertRows(client, 'user_programs', [programRowPayload(userId, persistedProgram, id)], `${context}: attach persistence ids`, 'id');
  return id;
}

export async function saveGeneratedProgram(
  userId: string,
  program: GeneratedProgram,
  options?: GeneratedProgramPersistenceOptions,
): Promise<string | null> {
  const context = 'Failed to save generated program';
  assertUserId(userId, context);
  const existingId = options?.userProgramId ?? program.persistenceId ?? null;
  const programForSave: GeneratedProgram = {
    ...program,
    status: program.status ?? 'active',
  };
  const preparedProgram = existingId ? programPayloadWithPersistence(programForSave, existingId) : programForSave;
  validateGeneratedProgram(preparedProgram, 'Generated program persistence payload');
  const client = await resolveClient(options);
  if (!client) return null;

  if (hasRpc(client)) {
    const userProgramId = await rpcReturningId(client, 'save_generated_program_with_sessions', {
      p_user_id: userId,
      p_user_program_id: existingId,
      p_program: preparedProgram,
    }, context);
    const loaded = await loadGeneratedProgram(userId, userProgramId, { ...options, client });
    if (!loaded) throw new NotFoundError(`${context}: program ${userProgramId} was not readable after RPC persistence.`, { context, table: 'user_programs' });
    validateGeneratedProgram(loaded, 'Persisted generated program payload');
    return userProgramId;
  }

  assertClientWriteFallbackAllowed(options, context);
  return saveGeneratedProgramDirect(userId, preparedProgram, existingId, client, context);
}

export async function loadGeneratedProgram(
  userId: string,
  userProgramId: string,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedProgram | null> {
  const context = 'Failed to load generated program';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return null;
  let query = requireBuilder(table(client, 'user_programs').select?.('*'), context, 'user_programs', 'select');
  query = requireBuilder(query.eq?.('id', userProgramId), context, 'user_programs', 'filter');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'user_programs', 'filter');
  const row = await selectMaybeSingleRow('user_programs', query, context);
  if (!row) throw new NotFoundError(`${context}: program ${userProgramId} was not found for this user.`, { context, table: 'user_programs' });
  const program = programFromRow(row);
  validateGeneratedProgram(program, 'Loaded generated program payload');
  return program;
}

export async function loadUserProgram(
  userId: string,
  userProgramId: string,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedProgram | null> {
  return loadGeneratedProgram(userId, userProgramId, options);
}

export async function listUserPrograms(
  userId: string,
  options?: ListPersistenceOptions & { status?: GeneratedProgram['status'] },
): Promise<GeneratedProgram[]> {
  const context = 'Failed to list generated programs';
  assertUserId(userId, context);
  const client = await resolveClient(options);
  if (!client) return [];
  let query = requireBuilder(table(client, 'user_programs').select?.('*'), context, 'user_programs', 'select');
  query = requireBuilder(query.eq?.('user_id', userId), context, 'user_programs', 'filter');
  if (options?.status) query = requireBuilder(query.eq?.('status', options.status), context, 'user_programs', 'filter');
  if (query.order) query = requireBuilder(query.order('started_at', { ascending: false }), context, 'user_programs', 'order');
  if (options?.limit != null && query.limit) query = requireBuilder(query.limit(options.limit), context, 'user_programs', 'limit');
  const result = await asPromise<Record<string, unknown>[]>(query);
  ensureNoError(result, context, 'user_programs');
  return (result.data ?? []).map((row) => {
    const program = programFromRow(row);
    validateGeneratedProgram(program, 'Listed generated program payload');
    return program;
  });
}

export async function updateProgramSession(
  userId: string,
  userProgramId: string,
  sessionId: string,
  update: ProgramSessionUpdate,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedProgram> {
  const context = 'Failed to update generated program session';
  assertUserId(userId, context);
  const program = await loadGeneratedProgram(userId, userProgramId, options);
  if (!program) throw new NotFoundError(`${context}: program ${userProgramId} was not found.`, { context, table: 'user_programs' });
  const currentSession = program.sessions.find((session) => session.id === sessionId);
  if (!currentSession) throw new NotFoundError(`${context}: session ${sessionId} was not found.`, { context });
  const changesProtectedSchedule = update.scheduledDate !== undefined
    || update.dayIndex !== undefined
    || update.generatedWorkoutId !== undefined
    || update.workout !== undefined
    || update.status === 'rescheduled';
  if (currentSession.protectedAnchor && changesProtectedSchedule) {
    throw new ValidationError(`${context}: protected workouts cannot be moved or replaced from program persistence.`, { context });
  }
  const updatedProgram = programPayloadWithPersistence(updateProgramSessionInMemory(program, sessionId, update), userProgramId);
  validateGeneratedProgram(updatedProgram, 'Updated generated program payload');
  await saveGeneratedProgram(userId, updatedProgram, { ...options, userProgramId });
  return updatedProgram;
}

export async function attachGeneratedWorkoutToProgramSession(
  userId: string,
  userProgramId: string,
  sessionId: string,
  workout: GeneratedWorkout,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedProgram> {
  const context = 'Failed to attach generated workout to program session';
  assertUserId(userId, context);
  validateGeneratedWorkoutForPersistence(workout, `${context}: workout payload`);
  const generatedWorkoutId = await saveGeneratedWorkoutWithExercises(userId, workout, options);
  return updateProgramSession(userId, userProgramId, sessionId, {
    generatedWorkoutId,
    workout,
    status: 'scheduled',
  }, options);
}

export async function markProgramSessionCompleted(
  userId: string,
  userProgramId: string,
  sessionId: string,
  completion: { completedAt?: string; workoutCompletionId?: string | null } = {},
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedProgram> {
  const context = 'Failed to complete generated program session';
  assertUserId(userId, context);
  const program = await loadGeneratedProgram(userId, userProgramId, options);
  if (!program) throw new NotFoundError(`${context}: program ${userProgramId} was not found.`, { context, table: 'user_programs' });
  const updatedProgram = programPayloadWithPersistence(updateProgramSessionInMemory(program, sessionId, {
    status: 'completed',
    completedAt: completion.completedAt ?? new Date().toISOString(),
    workoutCompletionId: completion.workoutCompletionId ?? null,
  }), userProgramId);
  validateGeneratedProgram(updatedProgram, 'Completed generated program payload');
  const client = await resolveClient(options);
  if (!client) return updatedProgram;

  if (hasRpc(client)) {
    const persistedId = await rpcReturningId(client, 'complete_program_session', {
      p_user_id: userId,
      p_user_program_id: userProgramId,
      p_session_id: sessionId,
      p_program: updatedProgram,
    }, context);
    const loaded = await loadGeneratedProgram(userId, persistedId, { ...options, client });
    if (!loaded) throw new NotFoundError(`${context}: program ${persistedId} was not readable after RPC persistence.`, { context, table: 'user_programs' });
    validateGeneratedProgram(loaded, 'Persisted completed program payload');
    return loaded;
  }

  assertClientWriteFallbackAllowed(options, context);
  await saveGeneratedProgramDirect(userId, updatedProgram, userProgramId, client, context);
  return updatedProgram;
}

export async function archiveProgram(
  userId: string,
  userProgramId: string,
  options?: WorkoutProgrammingPersistenceOptions,
): Promise<GeneratedProgram> {
  const context = 'Failed to archive generated program';
  assertUserId(userId, context);
  const program = await loadGeneratedProgram(userId, userProgramId, options);
  if (!program) throw new NotFoundError(`${context}: program ${userProgramId} was not found.`, { context, table: 'user_programs' });
  const archivedProgram = programPayloadWithPersistence({
    ...program,
    status: 'archived',
    archivedAt: new Date().toISOString(),
  }, userProgramId);
  validateGeneratedProgram(archivedProgram, 'Archived generated program payload');
  await saveGeneratedProgram(userId, archivedProgram, { ...options, userProgramId });
  return archivedProgram;
}
