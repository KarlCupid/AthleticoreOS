import { todayLocalDate } from '../../lib/utils/date';
import type {
  AthleteGoalMode,
  ExerciseLibraryRow,
  FitnessLevel,
  FoodSearchResult,
  MealType,
  Phase,
  ReadinessState,
  WorkoutFocus,
} from '../../lib/engine/types';
import type {
  FuelStackParamList,
  TrainStackParamList,
  WeeklyPlanSetupParams,
} from './types';

type UnknownParams = Record<string, unknown> | null | undefined;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const READINESS_STATES = new Set<ReadinessState>(['Prime', 'Caution', 'Depleted']);
const PHASES = new Set<Phase>([
  'off-season',
  'pre-camp',
  'fight-camp',
  'camp-base',
  'camp-build',
  'camp-peak',
  'camp-taper',
]);
const FITNESS_LEVELS = new Set<FitnessLevel>(['beginner', 'intermediate', 'advanced', 'elite']);
const WORKOUT_FOCUSES = new Set<WorkoutFocus>([
  'upper_push',
  'upper_pull',
  'lower',
  'full_body',
  'sport_specific',
  'recovery',
  'conditioning',
]);
const MEAL_TYPES = new Set<MealType>(['breakfast', 'lunch', 'dinner', 'snacks']);
const ATHLETE_GOAL_MODES = new Set<AthleteGoalMode>(['fight_camp', 'build_phase']);
const WEEKLY_SETUP_PHASES = new Set(['objective', 'availability', 'commitments']);
const WEEKLY_SETUP_SOURCES = new Set(['dashboard', 'plan']);
const GUIDED_ENTRY_SOURCES = new Set(['dashboard', 'train', 'day-detail', 'plan']);

function asRecord(params: UnknownParams): Record<string, unknown> {
  return params && typeof params === 'object' ? params : {};
}

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function finiteNumberParam(value: unknown): number | undefined {
  const nextValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(nextValue) ? nextValue : undefined;
}

function positiveNumberParam(value: unknown): number | undefined {
  const nextValue = finiteNumberParam(value);
  return nextValue != null && nextValue > 0 ? nextValue : undefined;
}

function booleanParam(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

export function isValidLocalDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !LOCAL_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function sanitizeOptionalLocalDateParam(value: unknown): string | undefined {
  return isValidLocalDateString(value) ? value : undefined;
}

export function sanitizeRequiredLocalDateParam(
  value: unknown,
  fallback: string = todayLocalDate(),
): string {
  return sanitizeOptionalLocalDateParam(value) ?? fallback;
}

export function sanitizeOptionalIdParam(value: unknown): string | undefined {
  return stringParam(value);
}

export function sanitizeReadinessStateParam(value: unknown): ReadinessState {
  return typeof value === 'string' && READINESS_STATES.has(value as ReadinessState)
    ? value as ReadinessState
    : 'Prime';
}

export function sanitizePhaseParam(value: unknown): Phase {
  return typeof value === 'string' && PHASES.has(value as Phase)
    ? value as Phase
    : 'off-season';
}

export function sanitizeFitnessLevelParam(value: unknown): FitnessLevel {
  return typeof value === 'string' && FITNESS_LEVELS.has(value as FitnessLevel)
    ? value as FitnessLevel
    : 'intermediate';
}

export function sanitizeOptionalWorkoutFocusParam(value: unknown): WorkoutFocus | undefined {
  return typeof value === 'string' && WORKOUT_FOCUSES.has(value as WorkoutFocus)
    ? value as WorkoutFocus
    : undefined;
}

export function sanitizeMealTypeParam(value: unknown, fallback: MealType = 'snacks'): MealType {
  return typeof value === 'string' && MEAL_TYPES.has(value as MealType)
    ? value as MealType
    : fallback;
}

export function sanitizeOptionalDurationMinutesParam(value: unknown): number | undefined {
  const nextValue = finiteNumberParam(value);
  if (nextValue == null) return undefined;
  return nextValue >= 5 && nextValue <= 240 ? Math.round(nextValue) : undefined;
}

export function sanitizeOptionalBooleanParam(value: unknown): boolean | undefined {
  return booleanParam(value);
}

export function resolveWeeklyPlanSetupParams(params: WeeklyPlanSetupParams): WeeklyPlanSetupParams {
  const raw = asRecord(params);
  const initialGoalMode = typeof raw.initialGoalMode === 'string' && ATHLETE_GOAL_MODES.has(raw.initialGoalMode as AthleteGoalMode)
    ? raw.initialGoalMode as AthleteGoalMode
    : undefined;
  const initialPhaseKey = typeof raw.initialPhaseKey === 'string' && WEEKLY_SETUP_PHASES.has(raw.initialPhaseKey)
    ? raw.initialPhaseKey as 'objective' | 'availability' | 'commitments'
    : undefined;
  const source = typeof raw.source === 'string' && WEEKLY_SETUP_SOURCES.has(raw.source)
    ? raw.source as 'dashboard' | 'plan'
    : undefined;

  const result: NonNullable<WeeklyPlanSetupParams> = {};
  if (initialGoalMode) result.initialGoalMode = initialGoalMode;
  if (initialPhaseKey) result.initialPhaseKey = initialPhaseKey;
  if (source) result.source = source;

  return Object.keys(result).length > 0 ? result : undefined;
}

export function resolveDayDetailParams(params: UnknownParams): { date: string } {
  return { date: sanitizeRequiredLocalDateParam(asRecord(params).date) };
}

export function resolveActivityLogParams(params: UnknownParams): { activityId: string; date: string } | null {
  const raw = asRecord(params);
  const activityId = sanitizeOptionalIdParam(raw.activityId);
  if (!activityId) return null;

  return {
    activityId,
    date: sanitizeRequiredLocalDateParam(raw.date),
  };
}

export function resolveGuidedWorkoutParams(
  params: Partial<TrainStackParamList['GuidedWorkout']> | undefined,
): TrainStackParamList['GuidedWorkout'] {
  const raw = asRecord(params);
  const entrySource = typeof raw.entrySource === 'string' && GUIDED_ENTRY_SOURCES.has(raw.entrySource)
    ? raw.entrySource as TrainStackParamList['GuidedWorkout']['entrySource']
    : undefined;

  return {
    weeklyPlanEntryId: sanitizeOptionalIdParam(raw.weeklyPlanEntryId),
    scheduledActivityId: sanitizeOptionalIdParam(raw.scheduledActivityId),
    focus: sanitizeOptionalWorkoutFocusParam(raw.focus) ?? stringParam(raw.focus),
    availableMinutes: sanitizeOptionalDurationMinutesParam(raw.availableMinutes),
    readinessState: sanitizeReadinessStateParam(raw.readinessState),
    phase: sanitizePhaseParam(raw.phase),
    fitnessLevel: sanitizeFitnessLevelParam(raw.fitnessLevel),
    trainingDate: sanitizeOptionalLocalDateParam(raw.trainingDate),
    isDeloadWeek: booleanParam(raw.isDeloadWeek),
    autoStart: raw.autoStart === true && entrySource != null,
    entrySource,
  };
}

export function resolveWorkoutDetailParams(
  params: Partial<TrainStackParamList['WorkoutDetail']> | undefined,
): TrainStackParamList['WorkoutDetail'] | null {
  const raw = asRecord(params);
  const weeklyPlanEntryId = sanitizeOptionalIdParam(raw.weeklyPlanEntryId);
  const date = sanitizeOptionalLocalDateParam(raw.date);
  const isDeloadWeek = booleanParam(raw.isDeloadWeek);
  if (!weeklyPlanEntryId || !date) return null;

  return {
    weeklyPlanEntryId,
    date,
    readinessState: sanitizeReadinessStateParam(raw.readinessState),
    phase: sanitizePhaseParam(raw.phase),
    fitnessLevel: sanitizeFitnessLevelParam(raw.fitnessLevel),
    ...(isDeloadWeek !== undefined ? { isDeloadWeek } : {}),
  };
}

function isExerciseLibraryRow(value: unknown): value is ExerciseLibraryRow {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExerciseLibraryRow>;
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.type === 'string'
    && typeof candidate.muscle_group === 'string'
    && typeof candidate.equipment === 'string'
    && typeof candidate.cns_load === 'number'
    && Number.isFinite(candidate.cns_load)
    && Array.isArray(candidate.sport_tags);
}

export function resolveExerciseDetailParams(params: UnknownParams): { exercise: ExerciseLibraryRow } | null {
  const raw = asRecord(params);
  return isExerciseLibraryRow(raw.exercise) ? { exercise: raw.exercise } : null;
}

export function resolveWorkoutSummaryParams(
  params: Partial<TrainStackParamList['WorkoutSummary']> | undefined,
): TrainStackParamList['WorkoutSummary'] {
  const raw = asRecord(params);
  const workoutLogId = sanitizeOptionalIdParam(raw.workoutLogId);
  const exercisesCompleted = finiteNumberParam(raw.exercisesCompleted);
  const hadPR = booleanParam(raw.hadPR);
  const prExerciseName = stringParam(raw.prExerciseName);

  return {
    durationMin: finiteNumberParam(raw.durationMin) ?? 0,
    totalSets: finiteNumberParam(raw.totalSets) ?? 0,
    totalVolume: finiteNumberParam(raw.totalVolume) ?? 0,
    avgRPE: finiteNumberParam(raw.avgRPE) ?? null,
    ...(workoutLogId ? { workoutLogId } : {}),
    ...(exercisesCompleted !== undefined ? { exercisesCompleted } : {}),
    ...(hadPR !== undefined ? { hadPR } : {}),
    ...(prExerciseName ? { prExerciseName } : {}),
  };
}

export function resolveFoodSearchParams(params: UnknownParams): FuelStackParamList['FoodSearch'] {
  const raw = asRecord(params);
  const date = sanitizeOptionalLocalDateParam(raw.date);
  return {
    mealType: sanitizeMealTypeParam(raw.mealType),
    ...(date ? { date } : {}),
  };
}

function isFoodSearchResult(value: unknown): value is FoodSearchResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FoodSearchResult>;
  return typeof candidate.key === 'string'
    && typeof candidate.name === 'string'
    && Array.isArray(candidate.portionOptions)
    && candidate.portionOptions.length > 0
    && typeof candidate.serving_size_g === 'number'
    && Number.isFinite(candidate.serving_size_g);
}

export function resolveFoodDetailParams(params: UnknownParams): FuelStackParamList['FoodDetail'] | null {
  const raw = asRecord(params);
  if (!isFoodSearchResult(raw.foodItem)) return null;
  const date = sanitizeOptionalLocalDateParam(raw.date);
  const foodLogId = sanitizeOptionalIdParam(raw.foodLogId);
  const initialAmountValue = positiveNumberParam(raw.initialAmountValue);
  const initialAmountUnit = stringParam(raw.initialAmountUnit);
  const initialGrams = raw.initialGrams === null ? null : positiveNumberParam(raw.initialGrams);

  return {
    foodItem: raw.foodItem,
    mealType: sanitizeMealTypeParam(raw.mealType),
    ...(date ? { date } : {}),
    ...(foodLogId ? { foodLogId } : {}),
    ...(initialAmountValue !== undefined ? { initialAmountValue } : {}),
    ...(initialAmountUnit ? { initialAmountUnit } : {}),
    ...(initialGrams !== undefined ? { initialGrams } : {}),
  };
}

export function resolveBarcodeScanParams(params: UnknownParams): FuelStackParamList['BarcodeScan'] {
  const raw = asRecord(params);
  const date = sanitizeOptionalLocalDateParam(raw.date);
  return {
    mealType: sanitizeMealTypeParam(raw.mealType),
    ...(date ? { date } : {}),
  };
}

export function resolveCustomFoodParams(params: UnknownParams): FuelStackParamList['CustomFood'] {
  const raw = asRecord(params);
  const mealType = raw.mealType == null ? undefined : sanitizeMealTypeParam(raw.mealType);
  const date = sanitizeOptionalLocalDateParam(raw.date);
  if (!mealType && !date) return undefined;
  return {
    ...(mealType ? { mealType } : {}),
    ...(date ? { date } : {}),
  };
}

export function resolvePostWeighInRecoveryParams(
  params: Partial<FuelStackParamList['PostWeighInRecovery']> | undefined,
): FuelStackParamList['PostWeighInRecovery'] | null {
  const raw = asRecord(params);
  const weighInWeightLbs = positiveNumberParam(raw.weighInWeightLbs);
  const hoursToFight = positiveNumberParam(raw.hoursToFight);
  if (weighInWeightLbs == null || hoursToFight == null || hoursToFight > 72) return null;

  const targetWeightLbs = positiveNumberParam(raw.targetWeightLbs);
  return {
    weighInWeightLbs,
    hoursToFight,
    ...(targetWeightLbs !== undefined ? { targetWeightLbs } : {}),
  };
}
