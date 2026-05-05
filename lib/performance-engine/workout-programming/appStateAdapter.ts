import type {
  AthleteProfile,
  AthleticorePhase,
  ComposedSession,
  PerformanceState,
  ProtectedWorkoutAnchor,
  ReadinessState,
  RiskFlag,
  TrackingEntry,
  TrainingBackground,
  TrainingBlockGoal,
} from '../types/index.ts';
import type {
  DescriptionToneVariant,
  AthleteTrainingArchetype,
  CombatSportContext,
  PersonalizedWorkoutInput,
  ProgressionDecision,
  ProtectedWorkoutInput,
  ProtectedWorkoutModality,
  WorkoutCompletionLog,
  WorkoutDecisionTraceEntry,
  WorkoutExperienceLevel,
  WorkoutIntensity,
  WorkoutReadinessBand,
} from './types.ts';

export interface AppEquipmentProfileLike {
  equipment?: readonly string[] | null;
  equipmentIds?: readonly string[] | null;
  name?: string | null;
}

export interface AppUserProfileLike {
  userId?: string | null;
  fitnessLevel?: string | null;
  fitness_level?: string | null;
  trainingAge?: string | null;
  training_age?: string | null;
  trainingBackground?: string | null;
  equipment?: readonly string[] | null;
  preferredDurationMinutes?: number | null;
  preferred_duration_minutes?: number | null;
  workoutEnvironment?: PersonalizedWorkoutInput['workoutEnvironment'] | null;
  preferredToneVariant?: DescriptionToneVariant | null;
}

export interface AppReadinessLike {
  readinessBand?: string | null;
  band?: string | null;
  state?: string | null;
  level?: string | null;
  overallReadiness?: number | null;
  score?: number | null;
  value?: number | null;
}

export interface AppPainReportLike {
  id?: string | null;
  location?: string | null;
  bodyPart?: string | null;
  body_part?: string | null;
  joint?: string | null;
  region?: string | null;
  severity?: number | string | null;
  painScore?: number | null;
  pain_score?: number | null;
  value?: number | string | boolean | null;
  notes?: string | null;
  redFlagSymptoms?: boolean | null;
  red_flag_symptoms?: boolean | null;
  context?: Record<string, unknown> | null;
}

export interface AppScheduleItemLike {
  id?: string | null;
  label?: string | null;
  title?: string | null;
  dayIndex?: number | null;
  dayOfWeek?: number | null;
  day_of_week?: number | null;
  durationMinutes?: number | null;
  estimated_duration_min?: number | null;
  intensity?: WorkoutIntensity | number | null;
  intendedIntensityRpe?: number | null;
  expectedIntensity?: number | null;
  protectedAnchor?: boolean | null;
  protected_anchor?: boolean | null;
  nonNegotiable?: boolean | null;
  source?: string | null;
  family?: string | null;
  modality?: ProtectedWorkoutModality | null;
}

export interface WorkoutProgrammingAppStateAdapterInput {
  performanceState?: PerformanceState | null;
  profile?: AppUserProfileLike | null;
  equipmentProfile?: AppEquipmentProfileLike | null;
  readiness?: AppReadinessLike | null;
  recentPainReports?: readonly AppPainReportLike[];
  recentWorkoutCompletions?: readonly WorkoutCompletionLog[];
  recentProgressionDecisions?: readonly ProgressionDecision[];
  scheduleItems?: readonly AppScheduleItemLike[];
  likedExerciseIds?: readonly string[];
  dislikedExerciseIds?: readonly string[];
  request?: Partial<PersonalizedWorkoutInput>;
}

export interface ResolvedAppStateSignal<T> {
  value: T;
  trace: WorkoutDecisionTraceEntry;
}

export interface AppStatePersonalizationResult {
  input: PersonalizedWorkoutInput;
  decisionTrace: WorkoutDecisionTraceEntry[];
}

const WORKOUT_EQUIPMENT_IDS = new Set([
  'bodyweight',
  'dumbbells',
  'kettlebell',
  'barbell',
  'squat_rack',
  'bench',
  'pull_up_bar',
  'cable_machine',
  'resistance_band',
  'medicine_ball',
  'jump_rope',
  'assault_bike',
  'rowing_machine',
  'treadmill',
  'stationary_bike',
  'sled',
  'battle_rope',
  'trx',
  'foam_roller',
  'mat',
  'plyo_box',
  'leg_press',
  'lat_pulldown',
  'open_space',
  'track_or_road',
]);

const EQUIPMENT_ALIASES: Record<string, string> = {
  dumbbell: 'dumbbells',
  dumbbells: 'dumbbells',
  kettlebells: 'kettlebell',
  kettlebell: 'kettlebell',
  cables: 'cable_machine',
  cable: 'cable_machine',
  cable_machine: 'cable_machine',
  cable_crossover: 'cable_machine',
  resistance_bands: 'resistance_band',
  resistance_band: 'resistance_band',
  band: 'resistance_band',
  bands: 'resistance_band',
  medicine_balls: 'medicine_ball',
  medicine_ball: 'medicine_ball',
  battle_ropes: 'battle_rope',
  battle_rope: 'battle_rope',
  leg_press_machine: 'leg_press',
  leg_press: 'leg_press',
  lat_pulldown_machine: 'lat_pulldown',
  lat_pulldown: 'lat_pulldown',
  rowing_machine: 'rowing_machine',
  rower: 'rowing_machine',
  stationary_bike: 'stationary_bike',
  bike: 'stationary_bike',
  spin_bike: 'stationary_bike',
  assault_bike: 'assault_bike',
  fan_bike: 'assault_bike',
  squat_rack: 'squat_rack',
  rack: 'squat_rack',
  pull_up_bar: 'pull_up_bar',
  pullup_bar: 'pull_up_bar',
  jump_rope: 'jump_rope',
  plyo_box: 'plyo_box',
  foam_roller: 'foam_roller',
  track: 'track_or_road',
  road: 'track_or_road',
  track_or_road: 'track_or_road',
  open_space: 'open_space',
  mat: 'mat',
  barbell: 'barbell',
  bench: 'bench',
  sled: 'sled',
  treadmill: 'treadmill',
  trx: 'trx',
  bodyweight: 'bodyweight',
};

const GYM_EQUIPMENT_IDS = new Set([
  'barbell',
  'squat_rack',
  'cable_machine',
  'leg_press',
  'lat_pulldown',
  'assault_bike',
  'rowing_machine',
  'stationary_bike',
  'sled',
  'battle_rope',
  'treadmill',
]);

let traceCounter = 0;

function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function compactStrings(items: readonly (string | null | undefined)[]): string[] {
  return items.map((item) => item?.trim()).filter((item): item is string => Boolean(item));
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
  const entry: WorkoutDecisionTraceEntry = {
    id: `app_state_${input.step}_${traceCounter}`,
    step: input.step,
    reason: input.reason,
  };
  if (input.selectedId) entry.selectedId = input.selectedId;
  if (input.rejectedIds) entry.rejectedIds = input.rejectedIds;
  if (input.safetyFlagIds) entry.safetyFlagIds = input.safetyFlagIds;
  if (input.confidence != null) entry.confidence = input.confidence;
  if (input.metadata) entry.metadata = input.metadata;
  return entry;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeEquipmentId(value: string): string | null {
  const key = normalizeKey(value);
  const alias = EQUIPMENT_ALIASES[key] ?? key;
  return WORKOUT_EQUIPMENT_IDS.has(alias) ? alias : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function rangeTarget(range: { target: number | null; max: number | null; min: number | null } | null | undefined): number | null {
  return range?.target ?? range?.max ?? range?.min ?? null;
}

function normalizeProgramDay(day: number | null | undefined): number | null {
  if (day == null || !Number.isFinite(day)) return null;
  const rounded = Math.round(day);
  if (rounded === 0) return 7;
  if (rounded >= 1 && rounded <= 7) return rounded;
  return null;
}

function programDayFromDate(date: string | null | undefined): number | null {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return normalizeProgramDay(parsed.getUTCDay());
}

function intensityFromRpe(value: number | null | undefined): WorkoutIntensity {
  if (value == null) return 'moderate';
  if (value <= 2.5) return 'recovery';
  if (value <= 4.5) return 'low';
  if (value <= 6.5) return 'moderate';
  return 'hard';
}

function intensityFromUnknown(value: AppScheduleItemLike['intensity'] | null | undefined): WorkoutIntensity {
  if (value === 'recovery' || value === 'low' || value === 'moderate' || value === 'hard') return value;
  return intensityFromRpe(finiteNumber(value));
}

function protectedModalityFromText(value: string | null | undefined): ProtectedWorkoutModality {
  if (!value) return 'unknown';
  const key = normalizeKey(value);
  if (key.includes('sparring')) return 'sparring';
  if (key.includes('competition') || key.includes('fight') || key.includes('bout')) return 'competition';
  if (key.includes('boxing') || key.includes('skill') || key.includes('technical') || key.includes('pads') || key.includes('bag')) return 'sport_skill';
  if (key.includes('conditioning') || key.includes('hiit') || key.includes('interval')) return 'conditioning';
  if (key.includes('strength') || key.includes('lift')) return 'strength';
  if (key.includes('power') || key.includes('plyo') || key.includes('sprint')) return 'power';
  if (key.includes('roadwork') || key.includes('zone2') || key.includes('aerobic') || key.includes('run')) return 'zone2';
  if (key.includes('mobility') || key.includes('prehab')) return 'mobility';
  if (key.includes('recovery')) return 'recovery';
  return 'unknown';
}

function protectedModalityFromFamily(value: string | null | undefined): ProtectedWorkoutModality {
  switch (value) {
    case 'boxing_skill':
      return 'sport_skill';
    case 'sparring':
      return 'sparring';
    case 'strength':
      return 'strength';
    case 'conditioning':
      return 'conditioning';
    case 'roadwork':
      return 'zone2';
    case 'recovery':
      return 'recovery';
    default:
      return protectedModalityFromText(value);
  }
}

function protectedHardFromModality(modality: ProtectedWorkoutModality, intensity: WorkoutIntensity): boolean {
  return modality === 'sparring' || modality === 'competition' || intensity === 'hard';
}

export function readinessFromNumber(value: number | null | undefined): WorkoutReadinessBand | null {
  if (value == null) return null;
  const normalized = value <= 10 ? value * 10 : value;
  if (normalized < 35) return 'red';
  if (normalized < 55) return 'orange';
  if (normalized < 75) return 'yellow';
  return 'green';
}

export function readinessFromString(
  value: string | null | undefined,
  options: { cautionBand?: Extract<WorkoutReadinessBand, 'yellow' | 'orange'> } = {},
): WorkoutReadinessBand | null {
  if (!value) return null;
  const key = normalizeKey(value);
  if (key === 'green' || key === 'yellow' || key === 'orange' || key === 'red' || key === 'unknown') return key;
  if (key === 'prime' || key === 'ready' || key === 'high') return 'green';
  if (key === 'steady') return 'yellow';
  if (key === 'caution') return options.cautionBand ?? 'yellow';
  if (key === 'moderate') return 'yellow';
  if (key === 'depleted' || key === 'low') return 'red';
  return null;
}

export function readinessBandFromLevel(level: string | null | undefined): WorkoutReadinessBand {
  return readinessFromString(level, { cautionBand: 'orange' }) ?? 'unknown';
}

function mapTrainingBackground(value: TrainingBackground | string | null | undefined): WorkoutExperienceLevel {
  if (value === 'professional' || value === 'advanced' || value === 'elite') return 'advanced';
  if (value === 'competitive' || value === 'intermediate') return 'intermediate';
  return 'beginner';
}

function athleteExperience(athlete: AthleteProfile | null | undefined): WorkoutExperienceLevel {
  if (!athlete) return 'beginner';
  if (athlete.trainingBackground !== 'unknown') return mapTrainingBackground(athlete.trainingBackground);
  if (athlete.competitionLevel === 'professional') return 'advanced';
  if (athlete.competitionLevel === 'amateur') return 'intermediate';
  return 'beginner';
}

function requestedDuration(input: WorkoutProgrammingAppStateAdapterInput): number {
  const request = input.request;
  const profile = input.profile;
  const availability = input.performanceState?.trainingAvailability;
  const requested = request?.durationMinutes
    ?? request?.preferredDurationMinutes
    ?? profile?.preferredDurationMinutes
    ?? profile?.preferred_duration_minutes
    ?? rangeTarget(availability?.preferredSessionDurationMinutes)
    ?? 30;
  const range = request?.availableTimeRange;
  const min = range?.minMinutes ?? availability?.preferredSessionDurationMinutes.min ?? 15;
  const max = range?.maxMinutes ?? availability?.preferredSessionDurationMinutes.max ?? Math.max(requested, 30);
  return Math.max(min, Math.min(max, Math.round(requested)));
}

function availableTimeRange(input: WorkoutProgrammingAppStateAdapterInput): PersonalizedWorkoutInput['availableTimeRange'] {
  const requestRange = input.request?.availableTimeRange;
  if (requestRange) return requestRange;
  const availability = input.performanceState?.trainingAvailability?.preferredSessionDurationMinutes;
  if (!availability) return undefined;
  const value: PersonalizedWorkoutInput['availableTimeRange'] = {};
  if (availability.min != null) value.minMinutes = availability.min;
  if (availability.max != null) value.maxMinutes = availability.max;
  return Object.keys(value).length > 0 ? value : undefined;
}

function latestNumericTracking(entries: readonly TrackingEntry[], type: TrackingEntry['type']): number | null {
  const values = entries
    .filter((entry) => entry.type === type && typeof entry.value === 'number')
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  return finiteNumber(values[0]?.value);
}

function scoreToTen(value: number | null): number | null {
  if (value == null) return null;
  return Math.max(0, Math.min(10, value <= 10 ? value : value / 10));
}

function severityToTen(value: unknown): number | null {
  if (typeof value === 'boolean') return value ? 7 : null;
  if (typeof value === 'number' && Number.isFinite(value)) return scoreToTen(value);
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return scoreToTen(parsed);
  const key = value.toLowerCase();
  if (/severe|sharp|acute|high/.test(key)) return 8;
  if (/moderate/.test(key)) return 5;
  if (/mild|low/.test(key)) return 2;
  return null;
}

function stringValuesFromContext(context: Record<string, unknown> | null | undefined): string[] {
  if (!context) return [];
  return Object.values(context)
    .flatMap((value) => {
      if (typeof value === 'string') return [value];
      if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
      return [];
    });
}

function reportSeverity(report: AppPainReportLike): number | null {
  return severityToTen(report.severity ?? report.painScore ?? report.pain_score ?? report.value ?? report.context?.severity);
}

function reportText(report: AppPainReportLike): string {
  return compactStrings([
    report.location,
    report.bodyPart,
    report.body_part,
    report.joint,
    report.region,
    report.notes,
    ...stringValuesFromContext(report.context),
  ]).join(' ').toLowerCase();
}

function trackingPainReports(performanceState: PerformanceState | null | undefined): AppPainReportLike[] {
  return (performanceState?.trackingEntries ?? [])
    .filter((entry) => entry.type === 'pain' || entry.type === 'injury')
    .map((entry) => ({
      id: entry.id,
      value: entry.value,
      notes: entry.notes,
      context: entry.context,
    }));
}

function riskFlagsToSafetyFlags(riskFlags: readonly RiskFlag[]): string[] {
  const flags: string[] = [];
  for (const riskFlag of riskFlags) {
    if (riskFlag.code === 'poor_readiness') flags.push('poor_readiness');
    if (riskFlag.code === 'injury_conflict') flags.push('pain_increased_last_session', 'coach_review_needed');
    if (riskFlag.code === 'illness_conflict') flags.push('illness_caution');
    if (riskFlag.code === 'under_fueling_risk' || riskFlag.code === 'low_nutrition_confidence') flags.push('under_fueled');
    if (riskFlag.code === 'excessive_training_load') flags.push('high_fatigue');
    if (riskFlag.code === 'professional_review_required') flags.push('coach_review_needed');
  }
  return unique(flags);
}

export function readinessSafetyFlags(readiness: ReadinessState | null | undefined, band: WorkoutReadinessBand): string[] {
  const flags: string[] = [];
  if (band === 'unknown') flags.push('unknown_readiness');
  if (band === 'red') flags.push('poor_readiness', 'low_energy');
  if (band === 'orange') flags.push('high_fatigue', 'low_energy');
  if (band === 'yellow') flags.push('low_energy');

  const adjustment = readiness?.recommendedTrainingAdjustment;
  if (adjustment?.replaceWithMobility) flags.push('poor_readiness');
  if ((adjustment?.volumeMultiplier ?? 1) <= 0.7) flags.push('high_fatigue');
  if (adjustment?.professionalReviewRecommended) flags.push('coach_review_needed');

  const trendFlags = readiness?.trendFlags ?? [];
  if (trendFlags.includes('injury_reported')) flags.push('pain_increased_last_session', 'coach_review_needed');
  if (trendFlags.includes('illness_reported')) flags.push('illness_caution');
  if (trendFlags.includes('post_sparring_soreness')) flags.push('high_soreness');
  if (trendFlags.includes('high_training_load')) flags.push('high_fatigue');
  if (trendFlags.includes('low_nutrition_support') || trendFlags.includes('rapid_body_mass_decline')) flags.push('under_fueled');
  if (trendFlags.includes('hydration_concern')) flags.push('hydration_caution');
  if (trendFlags.includes('coach_concern')) flags.push('coach_review_needed');
  return unique(flags);
}

function sorenessLevelFromState(performanceState: PerformanceState | null | undefined): number | null {
  const sorenessScore = performanceState?.readiness.sorenessScore ?? null;
  if (sorenessScore != null) return Math.max(0, Math.min(10, 10 - sorenessScore / 10));
  return scoreToTen(latestNumericTracking(performanceState?.trackingEntries ?? [], 'soreness'));
}

function sleepQualityFromState(performanceState: PerformanceState | null | undefined): number | null {
  const sleepScore = performanceState?.readiness.sleepScore ?? null;
  return scoreToTen(sleepScore ?? latestNumericTracking(performanceState?.trackingEntries ?? [], 'sleep_quality'));
}

function energyLevelFromState(performanceState: PerformanceState | null | undefined): number | null {
  const fatigue = scoreToTen(latestNumericTracking(performanceState?.trackingEntries ?? [], 'fatigue'));
  if (fatigue != null) return Math.max(0, 10 - fatigue);
  return scoreToTen(performanceState?.readiness.overallReadiness ?? null);
}

function buildSafetyFlags(input: {
  requestSafetyFlags?: readonly string[] | undefined;
  readinessBand: WorkoutReadinessBand;
  performanceState?: PerformanceState | null | undefined;
  painFlags: readonly string[];
  equipmentIds: readonly string[];
  sorenessLevel: number | null;
  sleepQuality: number | null;
  energyLevel: number | null;
}): string[] {
  const flags = [
    ...(input.requestSafetyFlags ?? []),
    ...input.painFlags,
    ...readinessSafetyFlags(input.performanceState?.readiness, input.readinessBand),
    ...riskFlagsToSafetyFlags(input.performanceState?.riskFlags ?? []),
  ];
  if (input.equipmentIds.length <= 1) flags.push('equipment_limited');
  if ((input.sorenessLevel ?? 0) >= 7) flags.push('high_soreness');
  if ((input.sleepQuality ?? 10) <= 4) flags.push('poor_sleep');
  if ((input.energyLevel ?? 10) <= 4) flags.push('low_energy');
  if ((input.energyLevel ?? 10) <= 2) flags.push('high_fatigue');
  return unique(flags);
}

export function resolveUserEquipmentFromProfile(input: {
  performanceState?: PerformanceState | null | undefined;
  profile?: AppUserProfileLike | null | undefined;
  equipmentProfile?: AppEquipmentProfileLike | null | undefined;
  requestedEquipmentIds?: readonly string[] | null | undefined;
}): ResolvedAppStateSignal<string[]> {
  const rawEquipment = input.requestedEquipmentIds
    ?? input.equipmentProfile?.equipmentIds
    ?? input.equipmentProfile?.equipment
    ?? input.profile?.equipment
    ?? [];
  const normalized = unique([
    'bodyweight',
    ...rawEquipment.map(normalizeEquipmentId).filter((id): id is string => Boolean(id)),
  ]);
  const equipmentIds = normalized.length > 0 ? normalized : ['bodyweight'];
  const usedFallback = rawEquipment.length === 0;
  return {
    value: equipmentIds,
    trace: trace({
      step: 'resolve_equipment',
      reason: usedFallback
        ? 'No app equipment profile was available, so workout programming used bodyweight-only equipment as a conservative fallback.'
        : `Workout programming mapped ${rawEquipment.length} app equipment item(s) into ${equipmentIds.length} catalog equipment id(s).`,
      selectedId: equipmentIds.join(','),
      confidence: usedFallback ? 0.55 : 0.86,
      metadata: { rawEquipment, equipmentIds },
    }),
  };
}

export function resolveReadinessBandFromAppState(input: {
  performanceState?: PerformanceState | null | undefined;
  readiness?: AppReadinessLike | null | undefined;
  requestedReadinessBand?: WorkoutReadinessBand | null | undefined;
}): ResolvedAppStateSignal<WorkoutReadinessBand> {
  const requested = input.requestedReadinessBand ?? null;
  const fromPerformanceState = input.performanceState?.readiness.readinessBand ?? null;
  const fromReadinessObject = readinessFromString(input.readiness?.readinessBand)
    ?? readinessFromString(input.readiness?.band)
    ?? readinessFromString(input.readiness?.state)
    ?? readinessFromString(input.readiness?.level)
    ?? readinessFromNumber(input.readiness?.overallReadiness ?? null)
    ?? readinessFromNumber(input.readiness?.score ?? null)
    ?? readinessFromNumber(input.readiness?.value ?? null);
  const band = requested ?? fromPerformanceState ?? fromReadinessObject ?? 'unknown';
  const source = requested ? 'request' : fromPerformanceState ? 'PerformanceState.readiness' : fromReadinessObject ? 'app readiness object' : 'fallback';
  return {
    value: band,
    trace: trace({
      step: 'resolve_readiness',
      reason: source === 'fallback'
        ? 'Readiness was missing from app state, so the workout request was marked unknown and kept conservative.'
        : `Readiness band came from ${source}.`,
      selectedId: band,
      confidence: band === 'unknown' ? 0.6 : 0.9,
      metadata: { source, overallReadiness: input.performanceState?.readiness.overallReadiness ?? input.readiness?.overallReadiness ?? null },
    }),
  };
}

export function resolvePainFlagsFromRecentReports(input: {
  performanceState?: PerformanceState | null | undefined;
  recentPainReports?: readonly AppPainReportLike[] | undefined;
}): ResolvedAppStateSignal<string[]> {
  const reports = [...trackingPainReports(input.performanceState), ...(input.recentPainReports ?? [])];
  const flags: string[] = [];
  for (const report of reports) {
    const severity = reportSeverity(report) ?? 0;
    const text = reportText(report);
    const redFlag = report.redFlagSymptoms === true || report.red_flag_symptoms === true || /chest pain|faint|severe dizziness|numbness|neurological/.test(text);
    if (redFlag) flags.push('red_flag_symptoms');
    if (severity >= 4) flags.push('pain_increased_last_session');
    if (/knee|patellar|acl|mcl|meniscus/.test(text)) flags.push('knee_caution');
    if (/low back|lower back|lumbar|spine|back/.test(text)) flags.push('back_caution');
    if (/shoulder|rotator|scapula|overhead/.test(text)) flags.push('shoulder_caution');
    if (/wrist|hand|elbow|forearm/.test(text)) flags.push('wrist_caution');
    if (/ankle|achilles|foot|heel/.test(text)) flags.push('low_impact_required', 'no_jumping');
    if (/running|run/.test(text)) flags.push('no_running');
    if (/floor work|floor/.test(text)) flags.push('no_floor_work');
  }
  const value = unique(flags);
  return {
    value,
    trace: trace({
      step: 'resolve_pain_flags',
      reason: value.length > 0
        ? `Recent app pain or injury reports mapped to workout safety flags: ${value.join(', ')}.`
        : 'No recent app pain reports required workout-programming safety flags.',
      selectedId: value.join(',') || 'none',
      safetyFlagIds: value,
      confidence: reports.length > 0 ? 0.84 : 0.72,
      metadata: { reportCount: reports.length },
    }),
  };
}

export function resolveWorkoutPreferencesFromHistory(input: {
  recentWorkoutCompletions?: readonly WorkoutCompletionLog[] | undefined;
  recentProgressionDecisions?: readonly ProgressionDecision[] | undefined;
  likedExerciseIds?: readonly string[] | undefined;
  dislikedExerciseIds?: readonly string[] | undefined;
}): ResolvedAppStateSignal<{ likedExerciseIds: string[]; dislikedExerciseIds: string[] }> {
  const liked = new Set(input.likedExerciseIds ?? []);
  const disliked = new Set(input.dislikedExerciseIds ?? []);
  for (const completion of input.recentWorkoutCompletions ?? []) {
    const likedMatch = completion.notes?.match(/Liked:\s*([^\n]+)/i);
    const dislikedMatch = completion.notes?.match(/Disliked:\s*([^\n]+)/i);
    for (const id of likedMatch?.[1]?.split(',').map((item) => item.trim()).filter(Boolean) ?? []) liked.add(id);
    for (const id of dislikedMatch?.[1]?.split(',').map((item) => item.trim()).filter(Boolean) ?? []) disliked.add(id);
    for (const result of completion.exerciseResults) {
      const painful = (result.painScore ?? 0) >= 4;
      const missed = !result.completedAsPrescribed;
      const highEffort = (result.actualRpe ?? 0) >= 9;
      if (painful || (missed && highEffort)) disliked.add(result.exerciseId);
      if (!painful && !missed && (result.actualRpe == null || result.targetRpe == null || result.actualRpe <= result.targetRpe + 1)) {
        liked.add(result.exerciseId);
      }
    }
  }
  for (const decision of input.recentProgressionDecisions ?? []) {
    if (decision.direction === 'substitute' || decision.decision === 'substitute') {
      for (const exerciseId of decision.affectedExerciseIds ?? []) disliked.add(exerciseId);
    }
  }
  for (const exerciseId of disliked) liked.delete(exerciseId);
  const value = {
    likedExerciseIds: [...liked],
    dislikedExerciseIds: [...disliked],
  };
  return {
    value,
    trace: trace({
      step: 'resolve_preferences',
      reason: `Workout history resolved ${value.likedExerciseIds.length} liked and ${value.dislikedExerciseIds.length} avoided exercise preference(s).`,
      selectedId: `liked:${value.likedExerciseIds.length};disliked:${value.dislikedExerciseIds.length}`,
      confidence: (input.recentWorkoutCompletions?.length ?? 0) > 0 ? 0.78 : 0.58,
      metadata: value,
    }),
  };
}

function goalFromTrainingBlockGoal(goal: TrainingBlockGoal | null | undefined): string | null {
  switch (goal) {
    case 'strength':
      return 'beginner_strength';
    case 'conditioning':
      return 'zone2_cardio';
    case 'boxing_skill':
    case 'fight_camp':
      return 'boxing_support';
    case 'weight_class_prep':
      return 'low_impact_conditioning';
    case 'recovery':
      return 'recovery';
    case 'general_build':
      return 'beginner_strength';
    default:
      return null;
  }
}

function goalFromPhase(phase: AthleticorePhase | null | undefined): string | null {
  switch (phase) {
    case 'recovery':
    case 'deload':
    case 'taper':
    case 'competition_week':
      return 'recovery';
    case 'onboarding':
    case 'transition':
      return 'return_to_training';
    case 'camp':
    case 'short_notice_camp':
      return 'boxing_support';
    case 'body_recomposition':
      return 'hypertrophy';
    case 'weight_class_management':
      return 'low_impact_conditioning';
    default:
      return null;
  }
}

function goalFromJourneyGoalType(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = normalizeKey(value);
  if (key.includes('hypertrophy') || key.includes('muscle')) return 'hypertrophy';
  if (key.includes('strength')) return 'beginner_strength';
  if (key.includes('conditioning')) return 'zone2_cardio';
  if (key.includes('boxing') || key.includes('fight')) return 'boxing_support';
  if (key.includes('mobility')) return 'mobility';
  if (key.includes('recovery')) return 'recovery';
  return null;
}

export function resolveTrainingGoalFromCurrentPhase(input: {
  performanceState?: PerformanceState | null | undefined;
  requestedGoalId?: string | null | undefined;
}): ResolvedAppStateSignal<string> {
  const requested = input.requestedGoalId?.trim() || null;
  const performanceState = input.performanceState;
  const phaseGoal = goalFromPhase(performanceState?.phase.current);
  const blockGoal = goalFromTrainingBlockGoal(performanceState?.activeTrainingBlock?.goal);
  const journeyGoal = goalFromJourneyGoalType(performanceState?.journey.goals[0]?.type ?? performanceState?.journey.goals[0]?.label);
  const goalId = requested ?? phaseGoal ?? blockGoal ?? journeyGoal ?? 'beginner_strength';
  const source = requested ? 'request' : phaseGoal ? 'PerformanceState.phase' : blockGoal ? 'activeTrainingBlock.goal' : journeyGoal ? 'journey.goal' : 'fallback';
  return {
    value: goalId,
    trace: trace({
      step: 'resolve_training_goal',
      reason: source === 'fallback'
        ? 'No app-wide goal signal was available, so workout programming used beginner strength as a conservative default.'
        : `Training goal was resolved from ${source}.`,
      selectedId: goalId,
      confidence: source === 'fallback' ? 0.55 : 0.86,
      metadata: {
        phase: performanceState?.phase.current ?? null,
        activeTrainingBlockGoal: performanceState?.activeTrainingBlock?.goal ?? null,
      },
    }),
  };
}

function protectedWorkoutFromAnchor(anchor: ProtectedWorkoutAnchor): ProtectedWorkoutInput | null {
  const dayIndex = normalizeProgramDay(anchor.dayOfWeek) ?? programDayFromDate(anchor.date) ?? 1;
  const durationMinutes = Math.round(rangeTarget(anchor.expectedDurationMinutes) ?? 60);
  const intensity = intensityFromRpe(rangeTarget(anchor.expectedIntensityRpe));
  const modality = protectedModalityFromFamily(anchor.sessionFamily);
  const workout: ProtectedWorkoutInput = {
    id: anchor.id,
    label: anchor.label,
    dayIndex,
    durationMinutes,
    intensity,
    modality,
    countsAsHardDay: protectedHardFromModality(modality, intensity),
    canStackGeneratedSession: anchor.canMerge === true,
  };
  const rpe = rangeTarget(anchor.expectedIntensityRpe);
  if (rpe != null) workout.estimatedRpe = rpe;
  return workout;
}

function protectedWorkoutFromComposedSession(session: ComposedSession): ProtectedWorkoutInput | null {
  if (!session.protectedAnchor && session.source !== 'protected_anchor' && session.source !== 'user_locked') return null;
  const dayIndex = programDayFromDate(session.date) ?? 1;
  const durationMinutes = Math.round(rangeTarget(session.durationMinutes) ?? 60);
  const intensity = intensityFromRpe(rangeTarget(session.intensityRpe));
  const modality = protectedModalityFromFamily(session.family);
  const workout: ProtectedWorkoutInput = {
    id: session.anchorId ?? session.id,
    label: session.title,
    dayIndex,
    durationMinutes,
    intensity,
    modality,
    countsAsHardDay: protectedHardFromModality(modality, intensity),
    canStackGeneratedSession: session.mergeDecisionId != null,
  };
  const rpe = rangeTarget(session.intensityRpe);
  if (rpe != null) workout.estimatedRpe = rpe;
  if (session.stressScore != null) workout.loadScore = session.stressScore;
  return workout;
}

function protectedWorkoutFromScheduleItem(item: AppScheduleItemLike): ProtectedWorkoutInput | null {
  const isProtected = item.protectedAnchor === true
    || item.protected_anchor === true
    || item.nonNegotiable === true
    || item.source === 'protected_anchor'
    || item.source === 'user_locked'
    || item.source === 'coach';
  if (!isProtected) return null;
  const label = item.label ?? item.title ?? 'Protected workout';
  const dayIndex = normalizeProgramDay(item.dayIndex ?? item.dayOfWeek ?? item.day_of_week) ?? 1;
  const durationMinutes = Math.round(item.durationMinutes ?? item.estimated_duration_min ?? 60);
  const intensity = intensityFromUnknown(item.intensity ?? item.intendedIntensityRpe ?? item.expectedIntensity);
  const modality = item.modality ?? protectedModalityFromFamily(item.family) ?? protectedModalityFromText(label);
  const workout: ProtectedWorkoutInput = {
    id: item.id ?? `protected:${normalizeKey(label)}:${dayIndex}`,
    label,
    dayIndex,
    durationMinutes,
    intensity,
    modality,
    countsAsHardDay: protectedHardFromModality(modality, intensity),
  };
  const rpe = finiteNumber(item.intendedIntensityRpe ?? item.expectedIntensity);
  if (rpe != null) workout.estimatedRpe = rpe;
  return workout;
}

export function resolveProtectedWorkoutsFromSchedule(input: {
  performanceState?: PerformanceState | null | undefined;
  scheduleItems?: readonly AppScheduleItemLike[] | undefined;
}): ResolvedAppStateSignal<ProtectedWorkoutInput[]> {
  const anchors = [
    ...(input.performanceState?.journey.protectedWorkoutAnchors ?? []),
    ...(input.performanceState?.activeTrainingBlock?.protectedAnchors ?? []),
  ].map(protectedWorkoutFromAnchor);
  const sessions = (input.performanceState?.composedSessions ?? []).map(protectedWorkoutFromComposedSession);
  const schedule = (input.scheduleItems ?? []).map(protectedWorkoutFromScheduleItem);
  const byId = new Map<string, ProtectedWorkoutInput>();
  for (const workout of [...anchors, ...sessions, ...schedule]) {
    if (workout) byId.set(workout.id, workout);
  }
  const value = [...byId.values()];
  return {
    value,
    trace: trace({
      step: 'resolve_protected_workouts',
      reason: value.length > 0
        ? `Workout programming preserved ${value.length} protected app schedule anchor(s).`
        : 'No protected app schedule anchors were present.',
      selectedId: value.map((item) => item.id).join(',') || 'none',
      confidence: value.length > 0 ? 0.88 : 0.72,
      metadata: { protectedWorkoutIds: value.map((item) => item.id) },
    }),
  };
}

function archetypeFromAppState(input: {
  performanceState?: PerformanceState | null | undefined;
  goalId: string;
  protectedWorkouts: readonly ProtectedWorkoutInput[];
  requested?: CombatSportContext | undefined;
}): AthleteTrainingArchetype {
  if (input.requested?.archetype) return input.requested.archetype;
  const phase = input.performanceState?.phase.current;
  const blockGoal = input.performanceState?.activeTrainingBlock?.goal;
  const sport = input.performanceState?.athlete.sport;
  const competitionLevel = input.performanceState?.athlete.competitionLevel;
  const hasFightCampSignal = phase === 'camp'
    || phase === 'short_notice_camp'
    || phase === 'competition_week'
    || phase === 'taper'
    || blockGoal === 'fight_camp';
  if (hasFightCampSignal) return 'combat_fight_camp';
  if (competitionLevel === 'professional' || competitionLevel === 'amateur') return 'combat_competitive';
  if (competitionLevel === 'recreational') return 'combat_recreational';
  if (sport === 'boxing' || sport === 'mma' || sport === 'general_combat') return 'combat_beginner';
  if (input.goalId === 'boxing_support' || input.protectedWorkouts.some((workout) => workout.modality === 'sport_skill' || workout.modality === 'sparring')) {
    return 'combat_beginner';
  }
  return 'combat_beginner';
}

export function resolveCombatSportContextFromAppState(input: {
  performanceState?: PerformanceState | null | undefined;
  goalId: string;
  protectedWorkouts: readonly ProtectedWorkoutInput[];
  requestContext?: CombatSportContext | undefined;
}): ResolvedAppStateSignal<CombatSportContext> {
  const archetype = archetypeFromAppState({
    performanceState: input.performanceState,
    goalId: input.goalId,
    protectedWorkouts: input.protectedWorkouts,
    requested: input.requestContext,
  });
  const combatSessions = input.protectedWorkouts.filter((workout) => (
    workout.modality === 'sport_skill'
    || workout.modality === 'sparring'
    || workout.modality === 'competition'
  ));
  const sparringSessions = input.protectedWorkouts.filter((workout) => workout.modality === 'sparring');
  const technicalSessions = input.protectedWorkouts.filter((workout) => workout.modality === 'sport_skill');
  const conditioningSessions = input.protectedWorkouts.filter((workout) => workout.modality === 'conditioning');
  const value: CombatSportContext = {
    ...input.requestContext,
    archetype,
    combatSessionsPerWeek: input.requestContext?.combatSessionsPerWeek ?? combatSessions.length,
    sparringSessionsPerWeek: input.requestContext?.sparringSessionsPerWeek ?? sparringSessions.length,
    technicalSessionsPerWeek: input.requestContext?.technicalSessionsPerWeek ?? technicalSessions.length,
    conditioningSessionsPerWeek: input.requestContext?.conditioningSessionsPerWeek ?? conditioningSessions.length,
    allowSameDaySupportSessions: input.requestContext?.allowSameDaySupportSessions
      ?? input.performanceState?.trainingAvailability?.allowTwoADays
      ?? false,
  };
  return {
    value,
    trace: trace({
      step: 'resolve_combat_context',
      reason: `Workout programming resolved ${archetype} context so protected sport sessions count as load without replacing generated support work.`,
      selectedId: archetype,
      confidence: input.performanceState || input.requestContext ? 0.86 : 0.62,
      metadata: {
        combatSessionsPerWeek: value.combatSessionsPerWeek,
        sparringSessionsPerWeek: value.sparringSessionsPerWeek,
        technicalSessionsPerWeek: value.technicalSessionsPerWeek,
        allowSameDaySupportSessions: value.allowSameDaySupportSessions,
      },
    }),
  };
}

export function resolveExperienceLevelFromProfile(input: {
  performanceState?: PerformanceState | null | undefined;
  profile?: AppUserProfileLike | null | undefined;
  requestedExperienceLevel?: WorkoutExperienceLevel | null | undefined;
}): ResolvedAppStateSignal<WorkoutExperienceLevel> {
  const requested = input.requestedExperienceLevel ?? null;
  const profileLevel = input.profile?.fitnessLevel ?? input.profile?.fitness_level ?? input.profile?.trainingAge ?? input.profile?.training_age ?? input.profile?.trainingBackground ?? null;
  const value = requested ?? (profileLevel ? mapTrainingBackground(profileLevel) : athleteExperience(input.performanceState?.athlete));
  return {
    value,
    trace: trace({
      step: 'resolve_experience',
      reason: requested
        ? 'Workout experience level came from the workout-programming request.'
        : 'Workout experience level was mapped from the app athlete profile and training background.',
      selectedId: value,
      confidence: requested || profileLevel || input.performanceState?.athlete.trainingBackground !== 'unknown' ? 0.84 : 0.58,
      metadata: { profileLevel, athleteTrainingBackground: input.performanceState?.athlete.trainingBackground ?? null },
    }),
  };
}

function resolveWorkoutEnvironment(input: {
  request?: Partial<PersonalizedWorkoutInput> | undefined;
  profile?: AppUserProfileLike | null | undefined;
  equipmentIds: readonly string[];
}): PersonalizedWorkoutInput['workoutEnvironment'] {
  const requested = input.request?.workoutEnvironment ?? input.profile?.workoutEnvironment ?? null;
  if (requested) return requested;
  if (input.equipmentIds.some((id) => GYM_EQUIPMENT_IDS.has(id))) return 'gym';
  if (input.equipmentIds.some((id) => id === 'track_or_road')) return 'outdoor';
  return 'home';
}

export function buildPersonalizedWorkoutInputFromPerformanceState(
  input: WorkoutProgrammingAppStateAdapterInput,
): AppStatePersonalizationResult {
  const request = input.request ?? {};
  const readiness = resolveReadinessBandFromAppState({
    performanceState: input.performanceState,
    readiness: input.readiness,
    requestedReadinessBand: request.readinessBand ?? null,
  });
  const equipment = resolveUserEquipmentFromProfile({
    performanceState: input.performanceState,
    profile: input.profile,
    equipmentProfile: input.equipmentProfile,
    requestedEquipmentIds: request.equipmentIds ?? null,
  });
  const painFlags = resolvePainFlagsFromRecentReports({
    performanceState: input.performanceState,
    recentPainReports: input.recentPainReports,
  });
  const preferences = resolveWorkoutPreferencesFromHistory({
    recentWorkoutCompletions: input.recentWorkoutCompletions ?? request.recentWorkoutCompletions,
    recentProgressionDecisions: input.recentProgressionDecisions ?? request.recentProgressionDecisions,
    likedExerciseIds: request.likedExerciseIds ?? input.likedExerciseIds,
    dislikedExerciseIds: request.dislikedExerciseIds ?? input.dislikedExerciseIds,
  });
  const goal = resolveTrainingGoalFromCurrentPhase({
    performanceState: input.performanceState,
    requestedGoalId: request.goalId ?? null,
  });
  const protectedWorkouts = resolveProtectedWorkoutsFromSchedule({
    performanceState: input.performanceState,
    scheduleItems: input.scheduleItems,
  });
  const combatContext = resolveCombatSportContextFromAppState({
    performanceState: input.performanceState,
    goalId: goal.value,
    protectedWorkouts: protectedWorkouts.value,
    requestContext: request.combatSportContext,
  });
  const experience = resolveExperienceLevelFromProfile({
    performanceState: input.performanceState,
    profile: input.profile,
    requestedExperienceLevel: request.experienceLevel ?? null,
  });
  const sorenessLevel = request.sorenessLevel ?? sorenessLevelFromState(input.performanceState);
  const sleepQuality = request.sleepQuality ?? sleepQualityFromState(input.performanceState);
  const energyLevel = request.energyLevel ?? energyLevelFromState(input.performanceState);
  const durationMinutes = requestedDuration(input);
  const safetyFlags = buildSafetyFlags({
    requestSafetyFlags: request.safetyFlags,
    readinessBand: readiness.value,
    performanceState: input.performanceState,
    painFlags: painFlags.value,
    equipmentIds: equipment.value,
    sorenessLevel,
    sleepQuality,
    energyLevel,
  });
  const appSignalTrace = trace({
    step: 'compose_personalized_input',
    reason: 'Workout programming input was composed from app-wide PerformanceState, profile, readiness, equipment, pain, history, and schedule signals.',
    selectedId: goal.value,
    safetyFlagIds: safetyFlags,
    confidence: input.performanceState ? 0.86 : 0.62,
    metadata: {
      userId: request.userId ?? input.performanceState?.athlete.userId ?? input.profile?.userId ?? null,
      readinessBand: readiness.value,
      equipmentIds: equipment.value,
      painFlags: painFlags.value,
      protectedWorkoutCount: protectedWorkouts.value.length,
      combatArchetype: combatContext.value.archetype,
    },
  });

  const personalizedInput: PersonalizedWorkoutInput = {
    goalId: goal.value,
    durationMinutes,
    preferredDurationMinutes: request.preferredDurationMinutes ?? durationMinutes,
    equipmentIds: equipment.value,
    experienceLevel: experience.value,
    safetyFlags,
    readinessBand: readiness.value,
    painFlags: painFlags.value,
    dislikedExerciseIds: preferences.value.dislikedExerciseIds,
    likedExerciseIds: preferences.value.likedExerciseIds,
  };

  const userId = request.userId ?? input.performanceState?.athlete.userId ?? input.profile?.userId ?? null;
  if (userId) personalizedInput.userId = userId;
  const range = availableTimeRange(input);
  if (range) personalizedInput.availableTimeRange = range;
  const environment = resolveWorkoutEnvironment({ request, profile: input.profile, equipmentIds: equipment.value });
  if (environment) personalizedInput.workoutEnvironment = environment;
  const toneVariant = request.preferredToneVariant ?? input.profile?.preferredToneVariant ?? null;
  if (toneVariant) personalizedInput.preferredToneVariant = toneVariant;
  if (sorenessLevel != null) personalizedInput.sorenessLevel = sorenessLevel;
  if (sleepQuality != null) personalizedInput.sleepQuality = sleepQuality;
  if (energyLevel != null) personalizedInput.energyLevel = energyLevel;
  const completions = input.recentWorkoutCompletions ?? request.recentWorkoutCompletions;
  if (completions && completions.length > 0) personalizedInput.recentWorkoutCompletions = [...completions];
  const progressionDecisions = input.recentProgressionDecisions ?? request.recentProgressionDecisions;
  if (progressionDecisions && progressionDecisions.length > 0) personalizedInput.recentProgressionDecisions = [...progressionDecisions];
  if (protectedWorkouts.value.length > 0) personalizedInput.protectedWorkouts = protectedWorkouts.value;
  personalizedInput.combatSportContext = combatContext.value;
  if (request.generatedSessionsPerWeek != null) personalizedInput.generatedSessionsPerWeek = request.generatedSessionsPerWeek;
  if (request.totalExposureTarget != null) personalizedInput.totalExposureTarget = request.totalExposureTarget;
  if (request.recentCompletedWorkoutIds) personalizedInput.recentCompletedWorkoutIds = request.recentCompletedWorkoutIds;
  if (request.priorExerciseOutcomes) personalizedInput.priorExerciseOutcomes = request.priorExerciseOutcomes;

  return {
    input: personalizedInput,
    decisionTrace: [
      readiness.trace,
      equipment.trace,
      painFlags.trace,
      preferences.trace,
      goal.trace,
      protectedWorkouts.trace,
      combatContext.trace,
      experience.trace,
      appSignalTrace,
    ],
  };
}
