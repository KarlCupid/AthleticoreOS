import type { BodyMassUnit } from '../utils/bodyMassUnits.ts';
import { normalizeBodyMass } from '../utils/bodyMassUnits.ts';
import type {
  BodyMassTrend,
  ComposedSession,
  ConfidenceValue,
  ISODateString,
  ISODateTimeString,
  PerformanceState,
  ReadinessBand,
  ReadinessNutritionAdjustment,
  ReadinessState,
  ReadinessTrainingAdjustment,
  ReadinessTrendFlag,
  RiskFlag,
  TrackingAnomaly,
  TrackingEntry,
  TrackingEntrySource,
  TrackingEntryType,
  TrackingEntryValue,
  UnknownField,
} from '../types/index.ts';
import { UNKNOWN_CONFIDENCE, createNoNutritionAdjustment, createNoTrainingAdjustment } from '../types/index.ts';
import { createExplanation, explainMissingData } from '../explanation-engine/explanationEngine.ts';
import { createMissingDataRisk, createRiskFlag, dedupeRiskFlags, sortRiskFlagsBySeverity } from '../risk-safety/riskSafetyEngine.ts';
import { deriveRecentBodyMassTrend, type BodyMassLogEntry } from '../body-mass-weight-class/bodyMassWeightClassEngine.ts';
import { confidenceFromKnownPoints, confidenceFromLevel, normalizeConfidence } from '../utils/confidence.ts';
import { addDays, daysBetween, normalizeISODate } from '../utils/dates.ts';
import { toFiniteNumberOrNull } from '../utils/numbers.ts';
import { normalizeTimeZone } from '../utils/timezones.ts';

export interface CreateTrackingEntryInput {
  id: string;
  athleteId: string;
  timestamp?: ISODateTimeString | null | undefined;
  timezone?: string | null | undefined;
  type: TrackingEntryType;
  source?: TrackingEntrySource | undefined;
  value?: unknown | undefined;
  unit?: string | null | undefined;
  confidence?: ConfidenceValue | undefined;
  context?: Record<string, unknown> | undefined;
  notes?: string | null | undefined;
}

export interface ResolveReadinessInput {
  athleteId: string;
  date: ISODateString;
  timezone?: string | null | undefined;
  entries?: TrackingEntry[] | undefined;
  completedSessions?: ComposedSession[] | undefined;
  plannedSessions?: ComposedSession[] | undefined;
  acuteChronicWorkloadRatio?: number | null | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}

export interface TrackingReadinessResult {
  readiness: ReadinessState;
  riskFlags: RiskFlag[];
  anomalies: TrackingAnomaly[];
  bodyMassTrend: BodyMassTrend;
  bodyMassHistory: BodyMassLogEntry[];
}

const CORE_READINESS_FIELDS: TrackingEntryType[] = [
  'readiness',
  'sleep_duration',
  'sleep_quality',
  'soreness',
  'stress',
  'nutrition_adherence',
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 1): number {
  return Math.round(value / precision) * precision;
}

function dateFromTimestamp(timestamp: ISODateTimeString | null | undefined): ISODateString | null {
  if (!timestamp) return null;
  return normalizeISODate(timestamp.slice(0, 10)) ?? normalizeISODate(timestamp);
}

function sourceConfidence(source: TrackingEntrySource): ConfidenceValue {
  switch (source) {
    case 'coach':
      return confidenceFromLevel('high', ['Coach-entered tracking data is source identifiable.']);
    case 'device':
      return confidenceFromLevel('medium', ['Device data is useful but does not override athlete-reported concerns.']);
    case 'imported':
    case 'manual_admin':
      return confidenceFromLevel('medium', ['Imported or admin-entered tracking data is usable with context.']);
    case 'system_inferred':
      return confidenceFromLevel('low', ['System-inferred tracking data needs confirmation.']);
    case 'user_reported':
    default:
      return confidenceFromLevel('medium', ['User-reported tracking data is accepted as athlete context.']);
  }
}

function normalizeScoreToPercent(value: unknown, unit?: string | null): number | null {
  const numeric = toFiniteNumberOrNull(value);
  if (numeric === null) return null;
  const normalizedUnit = (unit ?? '').toLowerCase();

  if (normalizedUnit === 'percent' || normalizedUnit === '%' || numeric > 10) {
    return clamp(Math.round(numeric), 0, 100);
  }

  if (normalizedUnit === 'score_1_10' || normalizedUnit === 'rpe' || numeric > 5) {
    return clamp(Math.round(numeric * 10), 0, 100);
  }

  return clamp(Math.round(((numeric - 1) / 4) * 100), 0, 100);
}

function normalizeSessionRpe(value: unknown): number | null {
  const numeric = toFiniteNumberOrNull(value);
  if (numeric === null) return null;
  return clamp(round(numeric, 0.1), 0, 10);
}

function normalizeNutritionAdherence(value: unknown, unit?: string | null): number | null {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized.includes('target') || normalized.includes('met')) return 95;
    if (normalized.includes('close')) return 75;
    if (normalized.includes('miss')) return 40;
  }

  const numeric = toFiniteNumberOrNull(value);
  if (numeric === null) return null;
  const normalizedUnit = (unit ?? '').toLowerCase();
  if (normalizedUnit === 'fraction' || numeric <= 1) return clamp(Math.round(numeric * 100), 0, 100);
  return clamp(Math.round(numeric), 0, 100);
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (['true', 'yes', 'active', 'reported', 'present'].includes(normalized)) return true;
    if (['false', 'no', 'none', 'clear', 'resolved'].includes(normalized)) return false;
  }
  return null;
}

function normalizeTrackingValue(input: CreateTrackingEntryInput): {
  value: TrackingEntryValue;
  unit: string | null;
  confidencePenalty: string | null;
} {
  const unit = input.unit?.toLowerCase() ?? null;
  const timestampDate = dateFromTimestamp(input.timestamp);

  switch (input.type) {
    case 'body_mass': {
      const fromUnit: BodyMassUnit = unit === 'kg' ? 'kg' : 'lb';
      const normalized = normalizeBodyMass({
        value: input.value,
        fromUnit,
        toUnit: 'lb',
        measuredOn: timestampDate,
        confidence: input.confidence,
      });
      return {
        value: normalized ? round(normalized.value, 0.1) : null,
        unit: 'lb',
        confidencePenalty: normalized ? null : 'Body mass was missing or invalid.',
      };
    }
    case 'sleep_duration': {
      const numeric = toFiniteNumberOrNull(input.value);
      if (numeric === null || numeric <= 0) return { value: null, unit: 'minute', confidencePenalty: 'Sleep duration was missing or invalid.' };
      const minutes = unit === 'hour' || unit === 'hours' || numeric <= 24 ? numeric * 60 : numeric;
      return { value: Math.round(minutes), unit: 'minute', confidencePenalty: null };
    }
    case 'sleep_quality':
    case 'soreness':
    case 'fatigue':
    case 'mood':
    case 'stress':
    case 'readiness':
    case 'pain':
      return {
        value: normalizeScoreToPercent(input.value, input.unit),
        unit: 'percent',
        confidencePenalty: normalizeScoreToPercent(input.value, input.unit) === null ? `${input.type} was missing or invalid.` : null,
      };
    case 'session_rpe':
      return {
        value: normalizeSessionRpe(input.value),
        unit: 'rpe',
        confidencePenalty: normalizeSessionRpe(input.value) === null ? 'Session RPE was missing or invalid.' : null,
      };
    case 'nutrition_adherence':
      return {
        value: normalizeNutritionAdherence(input.value, input.unit),
        unit: 'percent',
        confidencePenalty: normalizeNutritionAdherence(input.value, input.unit) === null ? 'Nutrition adherence was missing or invalid.' : null,
      };
    case 'injury':
    case 'illness':
      return {
        value: normalizeBoolean(input.value),
        unit: null,
        confidencePenalty: normalizeBoolean(input.value) === null ? `${input.type} status was missing or invalid.` : null,
      };
    case 'resting_hr': {
      const numeric = toFiniteNumberOrNull(input.value);
      const safe = numeric == null ? null : clamp(Math.round(numeric), 25, 240);
      return { value: safe, unit: 'bpm', confidencePenalty: safe === null ? 'Resting heart rate was missing or invalid.' : null };
    }
    case 'hrv': {
      const numeric = toFiniteNumberOrNull(input.value);
      const safe = numeric == null ? null : clamp(Math.round(numeric), 5, 300);
      return { value: safe, unit: 'ms', confidencePenalty: safe === null ? 'HRV was missing or invalid.' : null };
    }
    case 'hydration': {
      if (typeof input.value === 'string') return { value: input.value, unit: input.unit ?? null, confidencePenalty: null };
      return {
        value: normalizeScoreToPercent(input.value, input.unit),
        unit: 'percent',
        confidencePenalty: normalizeScoreToPercent(input.value, input.unit) === null ? 'Hydration status was missing or invalid.' : null,
      };
    }
    case 'performance_marker':
    case 'menstrual_cycle':
    case 'coach_note':
      return {
        value: typeof input.value === 'number' || typeof input.value === 'boolean' || typeof input.value === 'string' ? input.value : null,
        unit: input.unit ?? null,
        confidencePenalty: input.value == null ? `${input.type} was missing.` : null,
      };
  }
}

export function createTrackingEntry(input: CreateTrackingEntryInput): TrackingEntry {
  const source = input.source ?? 'user_reported';
  const normalized = normalizeTrackingValue(input);
  const baseConfidence = input.confidence ?? sourceConfidence(source);
  const confidence = normalized.confidencePenalty
    ? normalizeConfidence(Math.min(baseConfidence.score ?? 0.25, 0.3), [normalized.confidencePenalty])
    : baseConfidence;

  return {
    id: input.id,
    athleteId: input.athleteId,
    timestamp: input.timestamp ?? null,
    timezone: normalizeTimeZone(input.timezone ?? 'UTC'),
    type: input.type,
    source,
    value: normalized.value,
    unit: normalized.unit,
    confidence,
    context: input.context ?? {},
    notes: input.notes ?? null,
  };
}

function entryDate(entry: TrackingEntry): ISODateString | null {
  return dateFromTimestamp(entry.timestamp);
}

function isOnOrBefore(entry: TrackingEntry, date: ISODateString): boolean {
  const current = entryDate(entry);
  return current !== null && current <= date;
}

function latestEntry(entries: TrackingEntry[], type: TrackingEntryType, date: ISODateString, lookbackDays = 3): TrackingEntry | null {
  const earliest = addDays(date, -Math.max(0, lookbackDays));
  return entries
    .filter((entry) => entry.type === type && isOnOrBefore(entry, date))
    .filter((entry) => {
      const current = entryDate(entry);
      return current !== null && current >= earliest;
    })
    .sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? '')))[0] ?? null;
}

function latestNumber(entries: TrackingEntry[], type: TrackingEntryType, date: ISODateString, lookbackDays = 3): number | null {
  const value = latestEntry(entries, type, date, lookbackDays)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function latestBoolean(entries: TrackingEntry[], type: TrackingEntryType, date: ISODateString, lookbackDays = 7): boolean | null {
  const value = latestEntry(entries, type, date, lookbackDays)?.value;
  return typeof value === 'boolean' ? value : null;
}

function averageKnown(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

function sleepDurationScore(minutes: number | null): number | null {
  if (minutes === null) return null;
  const hours = minutes / 60;
  if (hours >= 7 && hours <= 9.5) return 88;
  if (hours >= 6 && hours < 7) return 68;
  if (hours > 9.5 && hours <= 10.5) return 72;
  if (hours >= 5) return 48;
  return 28;
}

function severityReserve(value: number | null): number | null {
  return value === null ? null : clamp(100 - value, 0, 100);
}

function hasHardSession(sessions: ComposedSession[]): boolean {
  return sessions.some((session) => (session.intensityRpe.target ?? 0) >= 7 || session.family === 'sparring' || session.family === 'assessment');
}

function hasRecentSparring(sessions: ComposedSession[], date: ISODateString): boolean {
  return sessions.some((session) => {
    if (session.family !== 'sparring' || !session.date) return false;
    const delta = daysBetween(session.date, date);
    return delta >= 0 && delta <= 2;
  });
}

function missingFields(input: {
  subjective: number | null;
  sleepScore: number | null;
  sorenessScore: number | null;
  stressScore: number | null;
  nutritionSupportScore: number | null;
}): UnknownField[] {
  const missing: UnknownField[] = [];
  if (input.subjective === null) missing.push({ field: 'subjective_readiness', reason: 'not_collected' });
  if (input.sleepScore === null) missing.push({ field: 'sleep_duration_or_quality', reason: 'not_collected' });
  if (input.sorenessScore === null) missing.push({ field: 'soreness', reason: 'not_collected' });
  if (input.stressScore === null) missing.push({ field: 'stress', reason: 'not_collected' });
  if (input.nutritionSupportScore === null) missing.push({ field: 'nutrition_adherence', reason: 'not_collected' });
  return missing;
}

function readinessBand(overall: number | null): ReadinessBand {
  if (overall === null) return 'unknown';
  if (overall < 35) return 'red';
  if (overall < 55) return 'orange';
  if (overall < 75) return 'yellow';
  return 'green';
}

function trainingAdjustment(input: {
  band: ReadinessBand;
  riskFlags: RiskFlag[];
  trendFlags: ReadinessTrendFlag[];
  missing: UnknownField[];
}): ReadinessTrainingAdjustment {
  const hasInjuryOrIllness = input.riskFlags.some((flag) => flag.code === 'injury_conflict' || flag.code === 'illness_conflict');
  const baseReasons = [
    input.trendFlags.includes('post_sparring_soreness') ? 'Soreness is elevated after recent sparring.' : null,
    input.trendFlags.includes('low_nutrition_support') ? 'Nutrition support is low for the training context.' : null,
    input.missing.length > 0 ? 'Missing readiness data lowers confidence and should preserve margin.' : null,
    hasInjuryOrIllness ? 'Injury or illness status blocks conflicting training.' : null,
  ].filter((line): line is string => Boolean(line));

  if (input.band === 'red') {
    return {
      type: 'replace_with_mobility',
      intensityCap: 3,
      volumeMultiplier: 0.45,
      avoidHarmfulMerge: true,
      preserveRecoveryDay: true,
      moveHeavySession: true,
      replaceWithMobility: true,
      professionalReviewRecommended: hasInjuryOrIllness,
      reasons: ['Readiness is red.', ...baseReasons],
    };
  }

  if (input.band === 'orange') {
    return {
      type: 'reduce_intensity',
      intensityCap: 5,
      volumeMultiplier: 0.65,
      avoidHarmfulMerge: true,
      preserveRecoveryDay: true,
      moveHeavySession: true,
      replaceWithMobility: false,
      professionalReviewRecommended: hasInjuryOrIllness,
      reasons: ['Readiness is orange.', ...baseReasons],
    };
  }

  if (input.band === 'yellow') {
    return {
      type: 'reduce_volume',
      intensityCap: 7,
      volumeMultiplier: 0.85,
      avoidHarmfulMerge: true,
      preserveRecoveryDay: true,
      moveHeavySession: false,
      replaceWithMobility: false,
      professionalReviewRecommended: false,
      reasons: ['Readiness is yellow.', ...baseReasons],
    };
  }

  if (input.band === 'unknown') {
    return {
      type: 'avoid_harmful_merge',
      intensityCap: 7,
      volumeMultiplier: 0.85,
      avoidHarmfulMerge: true,
      preserveRecoveryDay: true,
      moveHeavySession: false,
      replaceWithMobility: false,
      professionalReviewRecommended: false,
      reasons: ['Readiness is unknown, so the plan should preserve recovery margin.', ...baseReasons],
    };
  }

  return createNoTrainingAdjustment(['Readiness is green and no protective training adjustment was needed.']);
}

function nutritionAdjustment(input: {
  band: ReadinessBand;
  nutritionSupportScore: number | null;
  riskFlags: RiskFlag[];
  trendFlags: ReadinessTrendFlag[];
}): ReadinessNutritionAdjustment {
  const underFueling = input.riskFlags.some((flag) => flag.code === 'under_fueling_risk');
  const lowNutrition = input.nutritionSupportScore !== null && input.nutritionSupportScore < 55;
  const reasons = [
    lowNutrition ? 'Nutrition adherence is low enough to reduce recovery support.' : null,
    underFueling ? 'Under-fueling risk should increase fueling support and pause weight-loss pressure.' : null,
    input.band === 'red' || input.band === 'orange' ? 'Poor readiness should increase recovery nutrition attention.' : null,
  ].filter((line): line is string => Boolean(line));

  if (underFueling || lowNutrition) {
    return {
      type: 'increase_fueling',
      carbohydrateSupport: 'increase',
      proteinSupport: 'increase',
      hydrationSupport: input.trendFlags.includes('hydration_concern') ? 'increase' : 'normal',
      holdWeightLossPressure: underFueling,
      professionalReviewRecommended: input.riskFlags.some((flag) => flag.requiresProfessionalReview),
      reasons,
    };
  }

  if (input.band === 'red' || input.band === 'orange') {
    return {
      type: 'increase_recovery_nutrition',
      carbohydrateSupport: 'increase',
      proteinSupport: 'increase',
      hydrationSupport: 'normal',
      holdWeightLossPressure: false,
      professionalReviewRecommended: false,
      reasons,
    };
  }

  if (input.band === 'unknown') {
    return {
      type: 'improve_tracking_confidence',
      carbohydrateSupport: 'unknown',
      proteinSupport: 'unknown',
      hydrationSupport: 'unknown',
      holdWeightLossPressure: false,
      professionalReviewRecommended: false,
      reasons: ['Nutrition-readiness interaction is unknown until adherence and recovery data are logged.'],
    };
  }

  return createNoNutritionAdjustment(['Nutrition support appears adequate for the available readiness data.']);
}

export function bodyMassHistoryFromTrackingEntries(entries: TrackingEntry[]): BodyMassLogEntry[] {
  return entries
    .filter((entry) => entry.type === 'body_mass' && typeof entry.value === 'number')
    .map((entry) => ({
      date: entryDate(entry) ?? '1970-01-01',
      value: entry.value,
      unit: (entry.unit === 'kg' ? 'kg' : 'lb') as BodyMassUnit,
      source: entry.source,
    }))
    .filter((entry) => normalizeISODate(entry.date) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function detectTrackingAnomalies(entries: TrackingEntry[]): TrackingAnomaly[] {
  const anomalies: TrackingAnomaly[] = [];

  for (const entry of entries) {
    if (entry.value === null && entry.type !== 'coach_note') {
      anomalies.push({
        id: `${entry.id}:missing-value`,
        type: entry.type,
        severity: 'low',
        message: `${entry.type.replace(/_/g, ' ')} is missing or invalid.`,
        entryIds: [entry.id],
        explanation: createExplanation({
          kind: 'missing_data',
          summary: `${entry.type.replace(/_/g, ' ')} entry has no usable value.`,
          reasons: ['Missing tracking data remains unknown and should lower confidence.'],
          impact: 'restricted',
          confidence: entry.confidence,
        }),
      });
    }
  }

  const masses = bodyMassHistoryFromTrackingEntries(entries);
  for (let index = 1; index < masses.length; index += 1) {
    const previous = masses[index - 1];
    const current = masses[index];
    const deltaDays = Math.max(1, daysBetween(previous.date, current.date));
    const delta = Math.abs(Number(current.value) - Number(previous.value));
    if (deltaDays <= 2 && delta >= 5) {
      anomalies.push({
        id: `${current.date}:body-mass-jump`,
        type: 'body_mass',
        severity: 'moderate',
        message: 'Body mass changed abruptly enough to require review before planning around it.',
        entryIds: [],
        explanation: createExplanation({
          kind: 'risk',
          summary: 'Body-mass log jump detected.',
          reasons: ['Large short-term body-mass changes can reflect hydration, logging error, or unsafe loss patterns.'],
          impact: 'restricted',
          confidence: confidenceFromLevel('medium'),
        }),
      });
    }
  }

  return anomalies;
}

export function resolveReadinessState(input: ResolveReadinessInput): TrackingReadinessResult {
  const entries = (input.entries ?? []).filter((entry) => entry.athleteId === input.athleteId);
  const sessions = [...(input.completedSessions ?? []), ...(input.plannedSessions ?? [])];
  const subjectiveScore = latestNumber(entries, 'readiness', input.date);
  const sleepDuration = latestNumber(entries, 'sleep_duration', input.date);
  const sleepQuality = latestNumber(entries, 'sleep_quality', input.date);
  const sleepScore = averageKnown([sleepDurationScore(sleepDuration), sleepQuality]);
  const sorenessSeverity = latestNumber(entries, 'soreness', input.date);
  const sorenessScore = severityReserve(sorenessSeverity);
  const stressScore = severityReserve(latestNumber(entries, 'stress', input.date));
  const fatigueScore = severityReserve(latestNumber(entries, 'fatigue', input.date));
  const painSeverity = latestNumber(entries, 'pain', input.date);
  const nutritionSupportScore = latestNumber(entries, 'nutrition_adherence', input.date);
  const hydrationValue = latestEntry(entries, 'hydration', input.date)?.value;
  const hydrationConcern = typeof hydrationValue === 'number' ? hydrationValue < 45 : typeof hydrationValue === 'string' && /dizzy|dark|thirst|headache/i.test(hydrationValue);
  const injuryReported = latestBoolean(entries, 'injury', input.date) === true || (painSeverity ?? 0) >= 75;
  const illnessReported = latestBoolean(entries, 'illness', input.date) === true;
  const hasHardTraining = hasHardSession(sessions);
  const recentSparring = hasRecentSparring(sessions, input.date);
  const wearableGood = (latestNumber(entries, 'hrv', input.date) ?? 0) >= 75 || (latestNumber(entries, 'resting_hr', input.date) ?? 999) <= 55;
  const missing = missingFields({ subjective: subjectiveScore, sleepScore, sorenessScore, stressScore, nutritionSupportScore });
  const recoveryScore = averageKnown([sleepScore, sorenessScore, stressScore, fatigueScore, nutritionSupportScore]);
  const injuryPenalty = injuryReported ? 45 : (painSeverity ?? 0) >= 55 ? 20 : 0;
  const illnessPenalty = illnessReported ? 50 : 0;
  const acwr = toFiniteNumberOrNull(input.acuteChronicWorkloadRatio);
  const acwrPenalty = acwr == null ? 0 : acwr >= 1.5 ? 28 : acwr >= 1.3 ? 14 : 0;
  const bodyMassHistory = bodyMassHistoryFromTrackingEntries(entries);
  const bodyMassTrend = deriveRecentBodyMassTrend({ history: bodyMassHistory, unit: 'lb' });
  const trendFlags: ReadinessTrendFlag[] = [];

  if (sleepScore === null) trendFlags.push('missing_sleep_data');
  if (sorenessScore === null) trendFlags.push('missing_soreness_data');
  if (subjectiveScore !== null && subjectiveScore <= 35) trendFlags.push('subjective_concern');
  if (wearableGood && subjectiveScore !== null && subjectiveScore <= 35) trendFlags.push('wearable_conflict_subjective_concern');
  if (recentSparring && (sorenessSeverity ?? 0) >= 70) trendFlags.push('post_sparring_soreness');
  if (nutritionSupportScore !== null && nutritionSupportScore < 55) trendFlags.push('low_nutrition_support');
  if (bodyMassTrend.weeklyChange.target !== null && bodyMassTrend.weeklyChange.target < -1.75) trendFlags.push('rapid_body_mass_decline');
  if (injuryReported) trendFlags.push('injury_reported');
  if (illnessReported) trendFlags.push('illness_reported');
  if (acwr !== null && acwr >= 1.3) trendFlags.push('high_training_load');
  if (hydrationConcern) trendFlags.push('hydration_concern');
  if (entries.some((entry) => entry.type === 'menstrual_cycle' && isOnOrBefore(entry, input.date))) trendFlags.push('menstrual_cycle_context');
  if (entries.some((entry) => entry.type === 'coach_note' && isOnOrBefore(entry, input.date))) trendFlags.push('coach_concern');

  let overall = averageKnown([subjectiveScore, sleepScore, sorenessScore, stressScore, nutritionSupportScore, recoveryScore]);
  if (overall !== null) {
    overall = clamp(Math.round(overall - injuryPenalty - illnessPenalty - acwrPenalty), 0, 100);
    if (subjectiveScore !== null && subjectiveScore <= 35) overall = Math.min(overall, subjectiveScore + 10);
    if (recentSparring && (sorenessSeverity ?? 0) >= 70) overall = Math.min(overall, 52);
    if (injuryReported || illnessReported) overall = Math.min(overall, 32);
  }

  const band = readinessBand(overall);
  const knownCoreCount = CORE_READINESS_FIELDS.length - missing.length;
  const confidence = knownCoreCount === 0
    ? UNKNOWN_CONFIDENCE
    : confidenceFromKnownPoints(knownCoreCount, CORE_READINESS_FIELDS.length);
  const riskFlags: RiskFlag[] = [];

  if (missing.length > 0) {
    riskFlags.push(createMissingDataRisk({
      id: `${input.athleteId}:readiness-missing:${input.date}`,
      context: 'Readiness',
      missingFields: missing,
      severity: missing.length >= 3 ? 'moderate' : 'low',
      appliesOn: input.date,
      confidence,
      generatedAt: input.generatedAt,
    }));
  }

  if (band === 'orange' || band === 'red') {
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:poor-readiness:${input.date}`,
      code: 'poor_readiness',
      severity: band === 'red' ? 'critical' : 'high',
      message: 'Readiness is poor enough to constrain training, fueling, and recovery decisions.',
      evidence: [{ metric: 'overall_readiness', value: overall }],
      appliesOn: input.date,
      confidence,
      generatedAt: input.generatedAt,
    }));
  }

  if (injuryReported) {
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:injury-conflict:${input.date}`,
      code: 'injury_conflict',
      severity: 'high',
      evidence: [{ metric: 'injury_or_pain', value: true }],
      appliesOn: input.date,
      confidence,
      generatedAt: input.generatedAt,
    }));
  }

  if (illnessReported) {
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:illness-conflict:${input.date}`,
      code: 'illness_conflict',
      severity: 'high',
      evidence: [{ metric: 'illness', value: true }],
      appliesOn: input.date,
      confidence,
      generatedAt: input.generatedAt,
    }));
  }

  if (nutritionSupportScore !== null && nutritionSupportScore < 55 && hasHardTraining) {
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:under-fueling-readiness:${input.date}`,
      code: 'under_fueling_risk',
      severity: nutritionSupportScore < 40 ? 'high' : 'moderate',
      message: 'Nutrition support is low before or after hard training.',
      evidence: [{ metric: 'nutrition_adherence_percent', value: nutritionSupportScore }],
      appliesOn: input.date,
      confidence,
      generatedAt: input.generatedAt,
    }));
  }

  if (acwr !== null && acwr >= 1.3) {
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:load-readiness:${input.date}`,
      code: 'excessive_training_load',
      severity: acwr >= 1.5 ? 'critical' : 'moderate',
      evidence: [{ metric: 'acwr', value: acwr, threshold: acwr >= 1.5 ? 1.5 : 1.3 }],
      appliesOn: input.date,
      confidence,
      generatedAt: input.generatedAt,
    }));
  }

  const anomalies = detectTrackingAnomalies(entries);
  const finalRisks = sortRiskFlagsBySeverity(dedupeRiskFlags(riskFlags));
  const training = trainingAdjustment({ band, riskFlags: finalRisks, trendFlags, missing });
  const nutrition = nutritionAdjustment({ band, nutritionSupportScore, riskFlags: finalRisks, trendFlags });
  const explanation = overall === null
    ? explainMissingData({
      context: 'Readiness',
      missingFields: missing.length > 0 ? missing : ['readiness_check_in'],
      confidence,
      generatedAt: input.generatedAt,
    })
    : createExplanation({
      kind: 'decision',
      summary: `Readiness is ${band} at ${overall}/100.`,
      reasons: [
        subjectiveScore !== null && subjectiveScore <= 35 ? 'Subjective readiness is low and is respected even if wearable data looks normal.' : null,
        sleepScore !== null && sleepScore < 55 ? 'Readiness reduced because sleep duration or quality is low.' : null,
        recentSparring && (sorenessSeverity ?? 0) >= 70 ? 'Readiness reduced because soreness is high after recent sparring.' : null,
        nutritionSupportScore !== null && nutritionSupportScore < 55 ? 'Nutrition support is low because recent adherence missed the target.' : null,
        missing.length > 0 ? `Confidence is lower because ${missing.map((field) => field.field).join(', ')} data is missing.` : null,
        injuryReported ? 'Injury or pain status blocks conflicting training.' : null,
        illnessReported ? 'Illness status blocks conflicting training.' : null,
      ].filter((line): line is string => Boolean(line)),
      impact: band === 'green' ? 'kept' : band === 'unknown' ? 'restricted' : 'adjusted',
      confidence,
      generatedAt: input.generatedAt,
    });

  const readiness: ReadinessState = {
    date: input.date,
    overallReadiness: overall,
    readinessBand: band,
    confidence,
    subjectiveScore,
    sleepScore,
    sorenessScore,
    stressScore,
    nutritionSupportScore,
    recoveryScore,
    injuryPenalty,
    illnessPenalty,
    trendFlags,
    missingData: missing,
    explanation,
    recommendedTrainingAdjustment: training,
    recommendedNutritionAdjustment: nutrition,
    riskFlags: finalRisks,
    anomalies,
  };

  return {
    readiness,
    riskFlags: finalRisks,
    anomalies,
    bodyMassTrend,
    bodyMassHistory,
  };
}

export function resolveReadinessFromPerformanceState(input: {
  performanceState: PerformanceState;
  date?: ISODateString | null | undefined;
  entries?: TrackingEntry[] | undefined;
  completedSessions?: ComposedSession[] | undefined;
  plannedSessions?: ComposedSession[] | undefined;
  acuteChronicWorkloadRatio?: number | null | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}): TrackingReadinessResult {
  const date = input.date ?? input.performanceState.asOfDate ?? new Date().toISOString().slice(0, 10);

  return resolveReadinessState({
    athleteId: input.performanceState.athlete.athleteId,
    date,
    timezone: input.performanceState.athlete.timeZone,
    entries: input.entries ?? input.performanceState.trackingEntries,
    completedSessions: input.completedSessions ?? input.performanceState.composedSessions,
    plannedSessions: input.plannedSessions ?? input.performanceState.activeTrainingBlock?.sessions ?? [],
    acuteChronicWorkloadRatio: input.acuteChronicWorkloadRatio,
    generatedAt: input.generatedAt,
  });
}
