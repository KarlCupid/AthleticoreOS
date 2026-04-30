import type { BodyMassMeasurement, BodyMassUnit } from '../utils/bodyMassUnits.ts';
import { normalizeBodyMass } from '../utils/bodyMassUnits.ts';
import type {
  AthleticorePhase,
  BodyMassChange,
  BodyMassRateOfChange,
  BodyMassSafetyFlag,
  BodyMassTrend,
  ConfidenceValue,
  Explanation,
  ISODateString,
  ISODateTimeString,
  PerformanceState,
  RiskFlag,
  WeightClassFeasibilityStatus,
  WeightClassManagementPhase,
  WeightClassPlan,
  WeightClassPlanAlternative,
  WeightClassPlanMode,
  WeightClassPlanStatus,
  WeightClassRiskLevel,
} from '../types/index.ts';
import { LOW_CONFIDENCE, MEDIUM_CONFIDENCE, UNKNOWN_CONFIDENCE } from '../types/index.ts';
import { createExplanation, explainMissingData } from '../explanation-engine/explanationEngine.ts';
import {
  createMissingDataRisk,
  createProfessionalReviewRisk,
  createRiskFlag,
  dedupeRiskFlags,
  sortRiskFlagsBySeverity,
} from '../risk-safety/riskSafetyEngine.ts';
import { confidenceFromLevel } from '../utils/confidence.ts';
import { addDays, daysBetween, normalizeISODate } from '../utils/dates.ts';
import { toFiniteNumberOrNull, toPositiveNumberOrNull } from '../utils/numbers.ts';
import { createMeasurementRange, createUnknownRange } from '../utils/units.ts';

export interface BodyMassLogEntry {
  date: ISODateString;
  value: unknown;
  unit?: BodyMassUnit;
  source?: string | null;
}

export interface UnderFuelingScreenInput {
  lowIntakeRelativeToLoad?: boolean;
  repeatedMissedNutritionTargetEstimate?: boolean;
  rapidBodyMassDecline?: boolean;
  persistentFatigue?: boolean;
  poorRecovery?: boolean;
  sleepDisturbance?: boolean;
  increasedSoreness?: boolean;
  recurrentIllness?: boolean;
  injuryFrequency?: boolean;
  moodChanges?: boolean;
  reducedPerformance?: boolean;
  menstrualDisruption?: boolean;
  hormonalSymptoms?: boolean;
  repeatedAggressiveWeightClassAttempts?: boolean;
  dizzinessOrFaintness?: boolean;
  obsessiveRestrictionBehaviors?: boolean;
}

export interface WeightClassManagementInput {
  athleteId: string;
  sport: WeightClassPlan['sport'];
  competitionId?: string | null | undefined;
  competitionDate?: ISODateString | null | undefined;
  weighInDateTime?: ISODateTimeString | null | undefined;
  competitionDateTime?: ISODateTimeString | null | undefined;
  asOfDate?: ISODateString | null | undefined;
  phase?: AthleticorePhase | WeightClassManagementPhase | null | undefined;
  currentBodyMass?: BodyMassMeasurement | null | undefined;
  targetClassMass?: BodyMassMeasurement | null | undefined;
  desiredScaleWeight?: BodyMassMeasurement | null | undefined;
  bodyMassHistory?: BodyMassLogEntry[] | undefined;
  targetClassName?: string | null | undefined;
  athleteAgeYears?: number | null | undefined;
  medicallyComplex?: boolean | undefined;
  eatingDisorderRisk?: boolean | undefined;
  repeatedRapidWeightCycling?: boolean | undefined;
  severeRestrictionPattern?: boolean | undefined;
  underFuelingScreen?: UnderFuelingScreenInput | undefined;
  fightOpportunityStatus?: 'tentative' | 'confirmed' | 'short_notice' | 'canceled' | 'rescheduled' | 'completed' | null | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}

export interface WeightClassManagementResult {
  plan: WeightClassPlan;
  riskFlags: RiskFlag[];
  explanations: Explanation[];
  shouldGenerateProtocol: boolean;
}

const ENGINE_CONFIDENCE = confidenceFromLevel('medium', [
  'Body Mass and Weight-Class Management Engine evaluated the target with safety gates.',
]);

function round(value: number, precision = 10): number {
  return Math.round(value * precision) / precision;
}

function todayISO(): ISODateString {
  return new Date().toISOString().slice(0, 10);
}

function dateFromDateTime(value: string | null | undefined): ISODateString | null {
  if (!value) return null;
  return normalizeISODate(value.slice(0, 10)) ?? normalizeISODate(value);
}

function currentFromHistory(history: BodyMassLogEntry[] | undefined, unit: BodyMassUnit): BodyMassMeasurement | null {
  const normalized = normalizeHistory(history, unit);
  return normalized.at(-1) ?? null;
}

function normalizeHistory(history: BodyMassLogEntry[] | undefined, unit: BodyMassUnit): BodyMassMeasurement[] {
  return (history ?? [])
    .map((entry) => normalizeBodyMass({
      value: entry.value,
      fromUnit: entry.unit ?? unit,
      toUnit: unit,
      measuredOn: normalizeISODate(entry.date),
      confidence: confidenceFromLevel(entry.source === 'scale' ? 'high' : 'medium'),
    }))
    .filter((entry): entry is BodyMassMeasurement => entry !== null && entry.measuredOn !== null)
    .sort((a, b) => String(a.measuredOn).localeCompare(String(b.measuredOn)));
}

function rangeForTrend(value: number | null, unit: BodyMassUnit, confidence: ConfidenceValue) {
  if (value === null) {
    return createUnknownRange(unit, UNKNOWN_CONFIDENCE);
  }

  const spread = Math.max(0.1, Math.abs(value) * 0.2);
  return createMeasurementRange({
    min: round(value - spread),
    target: round(value),
    max: round(value + spread),
    unit,
    confidence,
  });
}

export function deriveRecentBodyMassTrend(input: {
  history?: BodyMassLogEntry[] | undefined;
  unit?: BodyMassUnit | undefined;
}): BodyMassTrend {
  const unit = input.unit ?? 'lb';
  const history = normalizeHistory(input.history, unit);

  if (history.length < 2) {
    return {
      direction: 'unknown',
      weeklyChange: createUnknownRange(unit, UNKNOWN_CONFIDENCE),
      confidence: UNKNOWN_CONFIDENCE,
    };
  }

  const first = history[0];
  const last = history[history.length - 1];
  const spanDays = Math.max(1, daysBetween(first.measuredOn as ISODateString, last.measuredOn as ISODateString));
  const weeklyChange = ((last.value - first.value) / spanDays) * 7;
  const confidence =
    history.length >= 14 && spanDays >= 14
      ? confidenceFromLevel('high', ['Body-mass trend uses at least 14 logged entries across at least two weeks.'])
      : history.length >= 7
        ? confidenceFromLevel('medium', ['Body-mass trend uses at least seven logged entries.'])
        : LOW_CONFIDENCE;
  const direction =
    Math.abs(weeklyChange) < 0.25
      ? 'stable'
      : weeklyChange > 0
        ? 'gaining'
        : 'losing';

  return {
    direction,
    weeklyChange: rangeForTrend(weeklyChange, unit, confidence),
    confidence,
  };
}

function requiredChange(current: BodyMassMeasurement | null, desired: BodyMassMeasurement | null, unit: BodyMassUnit): BodyMassChange {
  if (!current || !desired) {
    return { value: null, unit, direction: 'unknown' };
  }

  const change = round(current.value - desired.value);
  return {
    value: change,
    unit,
    direction: change > 0 ? 'loss_required' : change < 0 ? 'gain_or_maintenance' : 'none',
  };
}

function requiredRate(change: BodyMassChange, current: BodyMassMeasurement | null, timeframeDays: number | null): BodyMassRateOfChange {
  if (change.value == null || !current || timeframeDays == null || timeframeDays <= 0) {
    return {
      value: null,
      unit: `${change.unit}_per_week`,
      percentOfBodyMassPerWeek: null,
    };
  }

  const weekly = (change.value / timeframeDays) * 7;
  return {
    value: round(weekly),
    unit: `${change.unit}_per_week`,
    percentOfBodyMassPerWeek: current.value > 0 ? round((weekly / current.value) * 100, 100) : null,
  };
}

function phaseFromInput(input: WeightClassManagementInput, timeframeDays: number | null): AthleticorePhase | WeightClassManagementPhase {
  if (input.phase) return input.phase;
  if (timeframeDays == null) return 'unknown';
  if (timeframeDays <= 1) return 'weigh_in_logistics';
  if (timeframeDays <= 7) return 'competition_week_body_mass_monitoring';
  if (timeframeDays <= 28) return 'weight_class_management';
  return 'gradual_weight_class_preparation';
}

function maxRisk(a: WeightClassRiskLevel, b: WeightClassRiskLevel): WeightClassRiskLevel {
  const order: Record<WeightClassRiskLevel, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
  return order[b] > order[a] ? b : a;
}

function severityForStatus(status: WeightClassFeasibilityStatus): WeightClassRiskLevel {
  switch (status) {
    case 'feasible':
      return 'low';
    case 'aggressive':
      return 'moderate';
    case 'high_risk':
      return 'high';
    case 'unsafe':
      return 'critical';
    case 'insufficient_data':
      return 'moderate';
  }
}

function statusFromRate(input: {
  current: BodyMassMeasurement | null;
  change: BodyMassChange;
  timeframeDays: number | null;
  rate: BodyMassRateOfChange;
}): WeightClassFeasibilityStatus {
  if (!input.current || input.change.value == null || input.timeframeDays == null) return 'insufficient_data';
  if (input.change.value <= 0) return 'feasible';
  if (input.timeframeDays <= 0) return 'unsafe';

  const percentPerWeek = input.rate.percentOfBodyMassPerWeek;
  if (percentPerWeek == null) return 'insufficient_data';

  if (input.timeframeDays <= 3 && input.change.value > 0) return percentPerWeek > 0.35 ? 'unsafe' : 'high_risk';
  if (input.timeframeDays <= 7 && percentPerWeek > 0.75) return 'unsafe';
  if (percentPerWeek <= 0.75) return 'feasible';
  if (percentPerWeek <= 1.0) return 'aggressive';
  if (percentPerWeek <= 1.5) return 'high_risk';
  return 'unsafe';
}

function activeUnderFuelingSignals(screen: UnderFuelingScreenInput | undefined): string[] {
  if (!screen) return [];

  const labels: Array<[keyof UnderFuelingScreenInput, string]> = [
    ['lowIntakeRelativeToLoad', 'low intake relative to training load'],
    ['repeatedMissedNutritionTargetEstimate', 'repeated missed nutrition targets'],
    ['rapidBodyMassDecline', 'rapid body-mass decline'],
    ['persistentFatigue', 'persistent fatigue'],
    ['poorRecovery', 'poor recovery'],
    ['sleepDisturbance', 'sleep disturbance'],
    ['increasedSoreness', 'increased soreness'],
    ['recurrentIllness', 'recurrent illness'],
    ['injuryFrequency', 'frequent injury reports'],
    ['moodChanges', 'mood changes'],
    ['reducedPerformance', 'reduced performance'],
    ['menstrualDisruption', 'voluntarily tracked menstrual disruption'],
    ['hormonalSymptoms', 'voluntarily tracked hormonal symptoms'],
    ['repeatedAggressiveWeightClassAttempts', 'repeated aggressive weight-class attempts'],
    ['dizzinessOrFaintness', 'dizziness or faintness'],
    ['obsessiveRestrictionBehaviors', 'self-reported obsessive restriction behaviors'],
  ];

  return labels.filter(([key]) => screen[key]).map(([, label]) => label);
}

function safetyFlag(input: BodyMassSafetyFlag): BodyMassSafetyFlag {
  return input;
}

function alternatives(input: {
  current: BodyMassMeasurement | null;
  target: BodyMassMeasurement | null;
  timeframeDays: number | null;
  status: WeightClassFeasibilityStatus;
}): WeightClassPlanAlternative[] {
  if (input.status === 'feasible') {
    return [];
  }

  return [
    {
      type: 'choose_safer_class',
      label: 'Choose a safer class',
      explanation: 'Use a class closer to the current trend so performance and health stay ahead of the scale target.',
      targetClassMass: input.current,
      timeframeDays: input.timeframeDays,
    },
    {
      type: 'extend_timeline',
      label: 'Extend the timeline',
      explanation: 'Move the target to a longer runway before revisiting automatic weight-class planning.',
      targetClassMass: input.target,
      timeframeDays: input.timeframeDays == null ? null : Math.max(input.timeframeDays + 28, input.timeframeDays * 2),
    },
    {
      type: 'professional_review',
      label: 'Use qualified review',
      explanation: 'Bring the goal to a qualified clinician, sports dietitian, or coach before acting on it.',
      targetClassMass: input.target,
      timeframeDays: input.timeframeDays,
    },
  ];
}

function implications(input: {
  status: WeightClassFeasibilityStatus;
  riskLevel: WeightClassRiskLevel;
  underFuelingSignals: string[];
  required: BodyMassChange;
}): {
  nutritionImplications: string[];
  trainingImplications: string[];
  hydrationConcerns: string[];
} {
  const nutritionImplications = [
    'Fueling targets should stay tied to training demand and recovery, not only the scale.',
  ];
  const trainingImplications = [
    'Training load should be adjusted only through the Adaptive Training Engine and readiness signals.',
  ];
  const hydrationConcerns = [
    'Fluid and electrolyte habits should stay steady, familiar, and monitored.',
  ];

  if (input.status === 'high_risk' || input.status === 'unsafe') {
    nutritionImplications.push('Automatic weight-loss pressure is blocked until a safer class, longer timeline, or qualified review is available.');
    trainingImplications.push('Avoid adding extra conditioning to chase body mass; preserve performance and recovery.');
  } else if (input.status === 'aggressive') {
    nutritionImplications.push('Use only conservative nutrition adjustments and monitor readiness before continuing.');
  }

  if (input.underFuelingSignals.length > 0) {
    nutritionImplications.push('Under-fueling risk signals are present, so weight-loss pressure should pause while recovery data is reviewed.');
    trainingImplications.push('Readiness and illness or injury signals should constrain additional training stress.');
  }

  if (input.required.value != null && input.required.value <= 0) {
    nutritionImplications.push('No loss is required for this target; prioritize normal fueling and stable performance.');
  }

  return { nutritionImplications, trainingImplications, hydrationConcerns };
}

function buildExplanation(input: {
  status: WeightClassFeasibilityStatus;
  riskLevel: WeightClassRiskLevel;
  required: BodyMassChange;
  rate: BodyMassRateOfChange;
  timeframeDays: number | null;
  confidence: ConfidenceValue;
  generatedAt?: ISODateTimeString | null | undefined;
}): Explanation {
  const requiredText = input.required.value == null
    ? 'the required change is unknown'
    : `${Math.max(0, input.required.value).toFixed(1)} ${input.required.unit}`;
  const rateText = input.rate.value == null
    ? 'an unknown weekly rate'
    : `${input.rate.value.toFixed(1)} ${input.rate.unit.replace('_', '/')}`;

  return createExplanation({
    kind: input.status === 'insufficient_data' ? 'missing_data' : 'decision',
    summary:
      input.status === 'high_risk' || input.status === 'unsafe'
        ? 'This weight-class target is blocked for automatic plan generation.'
        : 'Weight-class target evaluated with safety-first constraints.',
    reasons: [
      `The target requires ${requiredText} across ${input.timeframeDays ?? 'unknown'} day(s).`,
      `The implied rate is ${rateText}.`,
      `Feasibility is ${input.status} with ${input.riskLevel} risk.`,
      'This engine does not create rapid fight-week scale protocols.',
    ],
    impact: input.status === 'high_risk' || input.status === 'unsafe' ? 'restricted' : 'adjusted',
    confidence: input.confidence,
    generatedAt: input.generatedAt,
  });
}

function planStatus(status: WeightClassFeasibilityStatus): WeightClassPlanStatus {
  if (status === 'feasible' || status === 'aggressive') return 'planned';
  if (status === 'insufficient_data') return 'exploratory';
  return 'paused';
}

function planMode(phase: AthleticorePhase | WeightClassManagementPhase, timeframeDays: number | null): WeightClassPlanMode {
  if (phase === 'competition_week_body_mass_monitoring' || phase === 'weigh_in_logistics' || (timeframeDays != null && timeframeDays <= 7)) {
    return 'fight_week_support';
  }
  if (phase === 'long_term_body_composition' || phase === 'gradual_weight_class_preparation') return 'gradual_change';
  return 'monitor';
}

function targetRange(target: BodyMassMeasurement | null, unit: BodyMassUnit, confidence: ConfidenceValue) {
  if (!target) return createUnknownRange(unit, UNKNOWN_CONFIDENCE);

  return createMeasurementRange({
    min: round(target.value - 1),
    target: round(target.value),
    max: round(target.value + 1),
    unit,
    confidence,
  });
}

export function evaluateWeightClassPlan(input: WeightClassManagementInput): WeightClassManagementResult {
  const unit: BodyMassUnit =
    input.currentBodyMass?.unit ?? input.targetClassMass?.unit ?? input.desiredScaleWeight?.unit ?? 'lb';
  const asOfDate = input.asOfDate ?? todayISO();
  const current = input.currentBodyMass ?? currentFromHistory(input.bodyMassHistory, unit);
  const target = input.targetClassMass ?? null;
  const desired = input.desiredScaleWeight ?? target;
  const weighInDate = dateFromDateTime(input.weighInDateTime);
  const competitionDate = input.competitionDate ?? dateFromDateTime(input.competitionDateTime);
  const targetDate = weighInDate ?? competitionDate;
  const timeframeDays = targetDate ? Math.max(0, daysBetween(asOfDate, targetDate)) : null;
  const trend = deriveRecentBodyMassTrend({ history: input.bodyMassHistory, unit });
  const required = requiredChange(current, desired, unit);
  const rate = requiredRate(required, current, timeframeDays);
  const underFuelingSignals = activeUnderFuelingSignals(input.underFuelingScreen);
  const flags: BodyMassSafetyFlag[] = [];
  const riskFlags: RiskFlag[] = [];
  let status = statusFromRate({ current, change: required, timeframeDays, rate });
  let riskLevel = severityForStatus(status);

  if (!current) {
    flags.push(safetyFlag({
      code: 'missing_body_mass_data',
      severity: 'moderate',
      message: 'Current body mass is missing, so feasibility is unknown.',
      blocksPlan: false,
      riskFlagCode: 'missing_data',
    }));
    riskFlags.push(createMissingDataRisk({
      id: `${input.athleteId}:body-mass-missing`,
      context: 'Weight-class planning',
      missingFields: ['current_body_mass'],
      severity: 'moderate',
      appliesOn: asOfDate,
      generatedAt: input.generatedAt,
    }));
  }

  if (!target || !desired) {
    flags.push(safetyFlag({
      code: 'missing_target_class',
      severity: 'moderate',
      message: 'Target class mass is missing, so no automatic plan can be generated.',
      blocksPlan: false,
      riskFlagCode: 'missing_data',
    }));
    riskFlags.push(createMissingDataRisk({
      id: `${input.athleteId}:target-class-missing`,
      context: 'Weight-class planning',
      missingFields: ['target_class_mass'],
      severity: 'moderate',
      appliesOn: asOfDate,
      generatedAt: input.generatedAt,
    }));
  }

  if (timeframeDays == null) {
    flags.push(safetyFlag({
      code: 'missing_timeframe',
      severity: 'moderate',
      message: 'Weigh-in or competition timing is missing, so feasibility is unknown.',
      blocksPlan: false,
      riskFlagCode: 'missing_data',
    }));
    riskFlags.push(createMissingDataRisk({
      id: `${input.athleteId}:timing-missing`,
      context: 'Weight-class planning',
      missingFields: ['weigh_in_or_competition_date'],
      severity: 'moderate',
      appliesOn: asOfDate,
      generatedAt: input.generatedAt,
    }));
  }

  const percentPerWeek = rate.percentOfBodyMassPerWeek ?? 0;
  if (status === 'high_risk' || status === 'unsafe') {
    flags.push(safetyFlag({
      code: status === 'unsafe' ? 'unsafe_required_rate' : 'high_risk_required_rate',
      severity: status === 'unsafe' ? 'critical' : 'high',
      message: 'The required body-mass change is too aggressive for automatic planning.',
      blocksPlan: true,
      riskFlagCode: 'unsafe_weight_class_target',
    }));
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:unsafe-weight-target`,
      code: 'unsafe_weight_class_target',
      severity: status === 'unsafe' ? 'critical' : 'high',
      message: 'The requested weight-class target is too aggressive for the available timeframe.',
      evidence: [
        { metric: 'percent_body_mass_per_week', value: percentPerWeek || null, threshold: 1.0 },
        { metric: 'timeframe_days', value: timeframeDays },
      ],
      appliesOn: asOfDate,
      generatedAt: input.generatedAt,
    }));
  }

  if (trend.weeklyChange.target != null && trend.weeklyChange.target < -1.75) {
    flags.push(safetyFlag({
      code: 'rapid_body_mass_decline',
      severity: 'high',
      message: 'Recent body-mass logs show a rapid decline that should constrain weight-class planning.',
      blocksPlan: status !== 'feasible',
      riskFlagCode: 'rapid_body_mass_change',
    }));
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:rapid-body-mass-change`,
      code: 'rapid_body_mass_change',
      severity: trend.weeklyChange.target < -2.5 ? 'critical' : 'high',
      message: 'Recent body mass is declining rapidly enough to require caution.',
      evidence: [{ metric: 'weekly_body_mass_change', value: trend.weeklyChange.target }],
      appliesOn: asOfDate,
      generatedAt: input.generatedAt,
    }));
    riskLevel = maxRisk(riskLevel, trend.weeklyChange.target < -2.5 ? 'critical' : 'high');
  }

  const isMinor = input.athleteAgeYears != null && input.athleteAgeYears > 0 && input.athleteAgeYears < 18;
  const protectedContext =
    isMinor ||
    input.medicallyComplex ||
    input.eatingDisorderRisk ||
    input.repeatedRapidWeightCycling ||
    input.severeRestrictionPattern;

  if (protectedContext && required.value != null && required.value > 0) {
    const code: BodyMassSafetyFlag['code'] = isMinor
      ? 'minor_athlete_review_required'
      : input.repeatedRapidWeightCycling
        ? 'repeated_rapid_cycling'
        : input.severeRestrictionPattern || input.eatingDisorderRisk
          ? 'severe_restriction_pattern'
          : 'medical_review_required';
    flags.push(safetyFlag({
      code,
      severity: 'high',
      message: 'This athlete context requires qualified review before weight-class loss planning.',
      blocksPlan: status !== 'feasible',
      riskFlagCode: 'professional_review_required',
    }));
    riskFlags.push(createProfessionalReviewRisk({
      id: `${input.athleteId}:professional-review-body-mass`,
      message: 'Qualified review is required before weight-class loss planning can proceed.',
      reasons: ['Minor, medical complexity, restriction risk, or repeated rapid cycling was reported.'],
      appliesOn: asOfDate,
      generatedAt: input.generatedAt,
    }));
    riskLevel = maxRisk(riskLevel, 'high');

    if (status === 'aggressive') {
      status = 'high_risk';
      riskLevel = 'high';
    }
  }

  if (underFuelingSignals.length > 0) {
    const severeSignal = Boolean(input.underFuelingScreen?.dizzinessOrFaintness || input.underFuelingScreen?.obsessiveRestrictionBehaviors);
    flags.push(safetyFlag({
      code: 'under_fueling_screen_positive',
      severity: severeSignal ? 'critical' : 'high',
      message: 'Under-fueling risk signals are present; this is a screen, not a diagnosis.',
      blocksPlan: required.value != null && required.value > 0,
      riskFlagCode: 'under_fueling_risk',
    }));
    riskFlags.push(createRiskFlag({
      id: `${input.athleteId}:under-fueling-screen`,
      code: 'under_fueling_risk',
      severity: severeSignal ? 'critical' : 'high',
      message: 'Under-fueling risk signals are present and weight-loss pressure should pause.',
      evidence: underFuelingSignals.map((signal) => ({ metric: 'screen_signal', value: signal })),
      appliesOn: asOfDate,
      generatedAt: input.generatedAt,
    }));
    riskLevel = maxRisk(riskLevel, severeSignal ? 'critical' : 'high');
    if (required.value != null && required.value > 0 && (status === 'feasible' || status === 'aggressive')) {
      status = 'high_risk';
    }
  }

  if (input.fightOpportunityStatus === 'short_notice' && (status === 'high_risk' || status === 'unsafe')) {
    flags.push(safetyFlag({
      code: 'fight_target_unsafe',
      severity: riskLevel,
      message: 'Short-notice fight timing makes this target unsafe for automatic planning.',
      blocksPlan: true,
      riskFlagCode: 'unsafe_weight_class_target',
    }));
  }

  riskLevel = maxRisk(riskLevel, severityForStatus(status));
  const confidence = status === 'insufficient_data'
    ? LOW_CONFIDENCE
    : current && target && timeframeDays != null
      ? ENGINE_CONFIDENCE
      : UNKNOWN_CONFIDENCE;
  const explanation = buildExplanation({
    status,
    riskLevel,
    required,
    rate,
    timeframeDays,
    confidence,
    generatedAt: input.generatedAt,
  });
  const missingExplanation = flags.some((flag) => flag.riskFlagCode === 'missing_data')
    ? explainMissingData({
      context: 'Weight-class planning',
      missingFields: flags
        .filter((flag) => flag.riskFlagCode === 'missing_data')
        .map((flag) => ({ field: flag.code, reason: 'not_collected' as const })),
      confidence,
      generatedAt: input.generatedAt,
    })
    : null;
  const allExplanations = [explanation, missingExplanation].filter((item): item is Explanation => item !== null);
  const finalRiskFlags = dedupeRiskFlags(riskFlags);
  const professionalReviewRequired = finalRiskFlags.some((flag) => flag.requiresProfessionalReview) || protectedContext || riskLevel === 'critical';
  const implicationSet = implications({ status, riskLevel, underFuelingSignals, required });
  const plan: WeightClassPlan = {
    id: `${input.athleteId}:weight-class:${input.competitionId ?? input.competitionDate ?? asOfDate}`,
    athleteId: input.athleteId,
    sport: input.sport,
    competitionId: input.competitionId ?? null,
    competitionDate,
    weighInDateTime: input.weighInDateTime ?? null,
    competitionDateTime: input.competitionDateTime ?? null,
    currentBodyMass: current,
    targetClassMass: target ?? null,
    desiredScaleWeight: desired ?? null,
    recentBodyMassTrend: trend,
    phase: phaseFromInput(input, timeframeDays),
    timeframeDays,
    requiredChange: required,
    requiredRateOfChange: rate,
    feasibilityStatus: status,
    riskLevel,
    safetyFlags: flags,
    professionalReviewRequired,
    nutritionImplications: implicationSet.nutritionImplications,
    trainingImplications: implicationSet.trainingImplications,
    hydrationConcerns: implicationSet.hydrationConcerns,
    alternatives: alternatives({ current, target: target ?? null, timeframeDays, status }),
    status: planStatus(status),
    mode: planMode(phaseFromInput(input, timeframeDays), timeframeDays),
    targetClassName: input.targetClassName ?? null,
    targetBodyMassRange: targetRange(target ?? null, unit, confidence),
    weighInDate,
    safetyStatus: status === 'unsafe' ? 'unsafe' : status === 'high_risk' || status === 'aggressive' ? 'watch' : status === 'feasible' ? 'acceptable' : 'unknown',
    riskFlags: finalRiskFlags,
    explanation,
    confidence,
  };

  return {
    plan,
    riskFlags: sortRiskFlagsBySeverity(finalRiskFlags),
    explanations: allExplanations,
    shouldGenerateProtocol: status === 'feasible' || (status === 'aggressive' && !professionalReviewRequired),
  };
}

export function evaluateWeightClassPlanFromPerformanceState(input: {
  performanceState: PerformanceState;
  competitionId?: string | null | undefined;
  competitionDate?: ISODateString | null | undefined;
  weighInDateTime?: ISODateTimeString | null | undefined;
  competitionDateTime?: ISODateTimeString | null | undefined;
  targetClassMass?: BodyMassMeasurement | null | undefined;
  desiredScaleWeight?: BodyMassMeasurement | null | undefined;
  bodyMassHistory?: BodyMassLogEntry[] | undefined;
  underFuelingScreen?: UnderFuelingScreenInput | undefined;
  generatedAt?: ISODateTimeString | null | undefined;
}): WeightClassManagementResult {
  const athlete = input.performanceState.athlete;
  const sport = athlete.sport === 'boxing' || athlete.sport === 'mma' ? athlete.sport : 'other_combat_sport';

  return evaluateWeightClassPlan({
    athleteId: athlete.athleteId,
    sport,
    competitionId: input.competitionId,
    competitionDate: input.competitionDate,
    weighInDateTime: input.weighInDateTime,
    competitionDateTime: input.competitionDateTime,
    asOfDate: input.performanceState.asOfDate,
    phase: input.performanceState.phase.current,
    currentBodyMass: input.performanceState.bodyMass?.current ?? null,
    targetClassMass: input.targetClassMass,
    desiredScaleWeight: input.desiredScaleWeight,
    bodyMassHistory: input.bodyMassHistory,
    athleteAgeYears: athlete.ageYears,
    underFuelingScreen: input.underFuelingScreen,
    generatedAt: input.generatedAt,
  });
}

export function normalizeBodyMassOrNull(input: {
  value: unknown;
  unit?: BodyMassUnit;
  measuredOn?: ISODateString | null;
  confidence?: ConfidenceValue;
}): BodyMassMeasurement | null {
  return normalizeBodyMass({
    value: toPositiveNumberOrNull(input.value),
    fromUnit: input.unit ?? 'lb',
    toUnit: input.unit ?? 'lb',
    measuredOn: input.measuredOn ?? null,
    confidence: input.confidence ?? MEDIUM_CONFIDENCE,
  });
}

export function getSafeTargetDate(input: {
  asOfDate: ISODateString;
  timeframeDays: number;
}): ISODateString {
  return addDays(input.asOfDate, Math.max(0, Math.round(toFiniteNumberOrNull(input.timeframeDays) ?? 0)));
}
