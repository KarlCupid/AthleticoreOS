import {
  evaluateWeightClassPlan,
  normalizeBodyMassOrNull,
  type UnderFuelingScreenInput,
} from '../performance-engine/body-mass-weight-class/index.ts';
import { confidenceFromLevel } from '../performance-engine/utils/confidence.ts';
import type {
  CarbCycleInput,
  CarbCycleResult,
  CutPhase,
  CutPlanInput,
  CutPlanResult,
  CutPlanWarning,
  CutSafetyFlag,
  CutSafetyInput,
  DailyCutProtocolInput,
  DailyCutProtocolResult,
  RehydrationInput,
  RehydrationPhase,
  RehydrationProtocolResult,
  StallDetectionInput,
  StallDetectionResult,
  WeightCutPlanRow,
  WeightDataPoint,
} from './types/weight_cut.ts';
import type { EngineSafetyWarning, EngineSafetyWarningTier } from './types/safety.ts';
import { ENGINE_SAFETY_POLICY_VERSION } from './types/safety.ts';
import type { FightStatus } from './types/foundational.ts';
import { addDays } from '../utils/date.ts';

const MS_PER_DAY = 86_400_000;
const BASELINE_CALORIE_FLOOR = 1_800;

function round(value: number, precision = 10): number {
  return Math.round(value * precision) / precision;
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / MS_PER_DAY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function planWarning(input: {
  tier: EngineSafetyWarningTier;
  code: string;
  message: string;
  source?: EngineSafetyWarning['source'];
  requiresAcknowledgement?: boolean;
}): EngineSafetyWarning {
  return {
    code: input.code,
    tier: input.tier,
    message: input.message,
    requiresAcknowledgement: input.requiresAcknowledgement ?? (input.tier === 'severe' || input.tier === 'medical'),
    persistent: input.tier === 'severe' || input.tier === 'medical',
    allowProceed: true,
    policyVersion: ENGINE_SAFETY_POLICY_VERSION,
    source: input.source ?? 'weight_cut',
  };
}

function toCutPlanWarning(input: {
  warning: EngineSafetyWarning;
  fightStatus: FightStatus;
  athleteAge?: number | null;
  daysToWeighIn: number | null;
  cutPct: number;
}): CutPlanWarning {
  return {
    severity: input.warning.tier,
    tier: input.warning.tier,
    code: input.warning.code,
    message: input.warning.message,
    requiresAcknowledgement: input.warning.requiresAcknowledgement,
    persistent: input.warning.persistent,
    allowProceed: input.warning.allowProceed,
    policyVersion: input.warning.policyVersion,
    source: input.warning.source,
    amateurAdjusted: input.fightStatus === 'amateur',
    teenSensitive: input.athleteAge != null && input.athleteAge > 0 && input.athleteAge < 18,
    ageUnknown: input.athleteAge == null || input.athleteAge <= 0,
    daysToWeighIn: input.daysToWeighIn,
    cutPct: input.cutPct,
  };
}

function warningFromResult(input: {
  status: ReturnType<typeof evaluateWeightClassPlan>['plan']['feasibilityStatus'];
  riskLevel: ReturnType<typeof evaluateWeightClassPlan>['plan']['riskLevel'];
  explanation: string;
}): EngineSafetyWarning | null {
  if (input.status === 'feasible') return null;
  if (input.status === 'aggressive') {
    return planWarning({
      tier: 'caution',
      code: 'aggressive_weight_class_target',
      message: input.explanation,
      requiresAcknowledgement: false,
    });
  }
  if (input.status === 'insufficient_data') {
    return planWarning({
      tier: 'caution',
      code: 'insufficient_body_mass_data',
      message: input.explanation,
      requiresAcknowledgement: false,
    });
  }

  return planWarning({
    tier: input.riskLevel === 'critical' ? 'medical' : 'severe',
    code: input.status === 'unsafe' ? 'unsafe_weight_class_target' : 'high_risk_weight_class_target',
    message: input.explanation,
    source: 'weight_cut',
  });
}

function historyToBodyMassLog(history: WeightDataPoint[]) {
  return history.map((point) => ({
    date: point.date,
    value: point.weight,
    unit: 'lb' as const,
    source: 'scale',
  }));
}

function evaluateLegacyPlan(input: {
  athleteId?: string;
  asOfDate: string;
  startWeight: number;
  targetWeight: number;
  fightDate: string;
  weighInDate: string;
  fightStatus: FightStatus;
  sport: 'boxing' | 'mma';
  athleteAge?: number | null;
  weightHistory?: WeightDataPoint[];
  underFuelingScreen?: UnderFuelingScreenInput;
}) {
  const confidence = confidenceFromLevel('medium');

  return evaluateWeightClassPlan({
    athleteId: input.athleteId ?? 'legacy-weight-class-plan',
    sport: input.sport,
    competitionDate: input.fightDate,
    weighInDateTime: `${input.weighInDate}T09:00:00.000Z`,
    competitionDateTime: `${input.fightDate}T20:00:00.000Z`,
    asOfDate: input.asOfDate,
    phase: 'weight_class_management',
    currentBodyMass: normalizeBodyMassOrNull({
      value: input.startWeight,
      unit: 'lb',
      measuredOn: input.asOfDate,
      confidence,
    }),
    targetClassMass: normalizeBodyMassOrNull({
      value: input.targetWeight,
      unit: 'lb',
      measuredOn: input.weighInDate,
      confidence,
    }),
    desiredScaleWeight: normalizeBodyMassOrNull({
      value: input.targetWeight,
      unit: 'lb',
      measuredOn: input.weighInDate,
      confidence,
    }),
    bodyMassHistory: input.weightHistory ? historyToBodyMassLog(input.weightHistory) : undefined,
    athleteAgeYears: input.athleteAge ?? null,
    fightOpportunityStatus: daysBetween(input.asOfDate, input.weighInDate) <= 14 ? 'short_notice' : 'confirmed',
    underFuelingScreen: input.underFuelingScreen,
  });
}

function emptyDates(asOfDate: string, weighInDate: string) {
  const daysToWeighIn = Math.max(0, daysBetween(asOfDate, weighInDate));
  const fightWeekStart = addDays(weighInDate, -Math.min(7, daysToWeighIn));
  const prepEnd = addDays(fightWeekStart, -1);

  return {
    chronicPhaseDates: daysToWeighIn > 56 ? { start: asOfDate, end: addDays(weighInDate, -57) } : null,
    intensifiedPhaseDates: {
      start: daysToWeighIn > 7 ? asOfDate : fightWeekStart,
      end: daysToWeighIn > 7 ? prepEnd : weighInDate,
    },
    fightWeekDates: {
      start: fightWeekStart,
      end: weighInDate,
    },
  };
}

export function generateCutPlan(input: CutPlanInput): CutPlanResult {
  const validationErrors: string[] = [];

  if (!Number.isFinite(input.startWeight) || input.startWeight <= 0) validationErrors.push('Start body mass must be a positive number.');
  if (!Number.isFinite(input.targetWeight) || input.targetWeight <= 0) validationErrors.push('Target body mass must be a positive number.');
  if (!input.fightDate) validationErrors.push('Competition date is required.');
  if (!input.weighInDate) validationErrors.push('Weigh-in date is required.');
  if (input.fightDate && input.weighInDate && daysBetween(input.asOfDate, input.weighInDate) < 0) {
    validationErrors.push('Weigh-in date must be today or in the future.');
  }

  const totalChange = validationErrors.length === 0
    ? Math.max(0, input.startWeight - input.targetWeight)
    : 0;
  const totalPct = input.startWeight > 0 ? round((totalChange / input.startWeight) * 100) : 0;
  const dates = emptyDates(input.asOfDate, input.weighInDate || input.asOfDate);
  const daysToWeighIn = input.weighInDate ? Math.max(0, daysBetween(input.asOfDate, input.weighInDate)) : null;

  if (validationErrors.length > 0) {
    const detail = planWarning({
      tier: 'caution',
      code: 'invalid_weight_class_input',
      message: 'Weight-class planning is missing required safe inputs.',
      requiresAcknowledgement: false,
    });

    return {
      valid: false,
      asOfDate: input.asOfDate,
      validationErrors,
      safetyWarnings: [detail.message],
      safetyWarningDetails: [detail],
      cutWarning: toCutPlanWarning({
        warning: detail,
        fightStatus: input.fightStatus,
        athleteAge: input.athleteAge,
        daysToWeighIn,
        cutPct: totalPct,
      }),
      totalCutLbs: totalChange,
      totalCutPct: totalPct,
      dietPhaseTargetLbs: totalChange,
      waterCutAllocationLbs: 0,
      chronicPhaseWeeks: 0,
      intensifiedPhaseWeeks: 0,
      chronicPhaseDates: dates.chronicPhaseDates,
      intensifiedPhaseDates: dates.intensifiedPhaseDates,
      fightWeekDates: dates.fightWeekDates,
      weighInDate: input.weighInDate || input.asOfDate,
      safeWeeklyLossRateLbs: 0,
      calorieFloor: BASELINE_CALORIE_FLOOR,
      maxWaterCutPct: 0,
      estimatedDailyDeficitChronic: 0,
      estimatedDailyDeficitIntensified: 0,
    };
  }

  const evaluation = evaluateLegacyPlan(input);
  const plan = evaluation.plan;
  const warning = warningFromResult({
    status: plan.feasibilityStatus,
    riskLevel: plan.riskLevel,
    explanation: plan.explanation?.summary ?? 'Weight-class target evaluated with safety constraints.',
  });
  const highRiskBlocked = plan.feasibilityStatus === 'high_risk' || plan.feasibilityStatus === 'unsafe';
  const professionalBlocked = plan.professionalReviewRequired && plan.feasibilityStatus !== 'feasible';
  const valid = evaluation.shouldGenerateProtocol && !highRiskBlocked && !professionalBlocked;
  const details = warning ? [warning] : [];
  const safeWeeklyLossRate = round(Math.min(input.startWeight * 0.0075, 1.5));
  const dailyDeficit = valid && daysToWeighIn && daysToWeighIn > 0
    ? Math.round(clamp((totalChange * 3500) / daysToWeighIn, 0, 500))
    : 0;

  return {
    valid,
    asOfDate: input.asOfDate,
    validationErrors: valid
      ? []
      : [
        plan.feasibilityStatus === 'insufficient_data'
          ? 'Insufficient body-mass or timing data for automatic planning.'
          : 'This weight-class target is blocked for automatic plan generation.',
      ],
    safetyWarnings: [
      ...plan.safetyFlags.map((flag) => flag.message),
      ...plan.alternatives.map((alternative) => `${alternative.label}: ${alternative.explanation}`),
    ],
    safetyWarningDetails: details,
    cutWarning: warning
      ? toCutPlanWarning({
        warning,
        fightStatus: input.fightStatus,
        athleteAge: input.athleteAge,
        daysToWeighIn,
        cutPct: totalPct,
      })
      : null,
    totalCutLbs: totalChange,
    totalCutPct: totalPct,
    dietPhaseTargetLbs: totalChange,
    waterCutAllocationLbs: 0,
    chronicPhaseWeeks: dates.chronicPhaseDates ? Math.max(0, daysBetween(dates.chronicPhaseDates.start, dates.chronicPhaseDates.end) / 7) : 0,
    intensifiedPhaseWeeks: Math.max(0, daysBetween(dates.intensifiedPhaseDates.start, dates.intensifiedPhaseDates.end) / 7),
    chronicPhaseDates: dates.chronicPhaseDates,
    intensifiedPhaseDates: dates.intensifiedPhaseDates,
    fightWeekDates: dates.fightWeekDates,
    weighInDate: input.weighInDate,
    safeWeeklyLossRateLbs: safeWeeklyLossRate,
    calorieFloor: BASELINE_CALORIE_FLOOR,
    maxWaterCutPct: 0,
    estimatedDailyDeficitChronic: dailyDeficit,
    estimatedDailyDeficitIntensified: dailyDeficit,
  };
}

export function determineCutPhase(plan: WeightCutPlanRow, dateStr: string): CutPhase {
  const daysToWeighIn = daysBetween(dateStr, plan.weigh_in_date);

  if (daysToWeighIn < 0) return 'rehydration';
  if (daysToWeighIn === 0) return 'weigh_in';
  if (daysToWeighIn <= 7) return 'fight_week_load';
  return 'chronic';
}

export function getDailyCutIntensityCap(plan: WeightCutPlanRow | null | undefined, dateStr: string): number | null {
  if (!plan || plan.status !== 'active') return null;
  const phase = determineCutPhase(plan, dateStr);

  switch (phase) {
    case 'weigh_in':
      return 4;
    case 'fight_week_load':
      return 5;
    default:
      return null;
  }
}

export function computeCarbCycle(input: CarbCycleInput): CarbCycleResult {
  const highDemand = input.isTrainingDay && input.hasHighIntensitySession;

  return {
    adjustedCalories: input.baseCalories,
    adjustedCarbs: input.baseCarbs,
    adjustedFat: input.baseFat,
    adjustedProtein: input.baseProtein,
    cycleType: highDemand ? 'high' : 'moderate',
    message: highDemand
      ? 'High-demand training keeps normal carbohydrate support.'
      : 'Nutrition remains steady; no automatic low-carbohydrate cycling is generated.',
  };
}

export function detectStall(_input: StallDetectionInput): StallDetectionResult {
  return {
    stalled: false,
    stallDurationDays: 0,
    recommendation: 'none',
    refeedDurationDays: 0,
    message: 'Body-mass plateaus require trend review; the engine does not escalate restriction automatically.',
  };
}

function safetyFlag(input: CutSafetyFlag): CutSafetyFlag {
  return input;
}

export function validateCutSafety(input: CutSafetyInput): CutSafetyFlag[] {
  const flags: CutSafetyFlag[] = [];

  if (input.weeklyVelocityLbs < -2.5) {
    flags.push(safetyFlag({
      severity: input.weeklyVelocityLbs < -3.5 ? 'danger' : 'warning',
      code: 'rapid_body_mass_change',
      title: 'Rapid body-mass change',
      message: 'Recent body mass is dropping quickly enough to constrain planning.',
      recommendation: 'Pause weight-loss pressure and review fueling, readiness, and symptoms with qualified support.',
    }));
  }

  if (input.prescribedCalories < Math.max(input.calorieFloor, BASELINE_CALORIE_FLOOR)) {
    flags.push(safetyFlag({
      severity: 'danger',
      code: 'under_fueling_risk',
      title: 'Fueling floor conflict',
      message: 'The requested intake is below the safety floor for automatic planning.',
      recommendation: 'Raise intake and reduce optional training stress until recovery data improves.',
    }));
  }

  if (input.readinessState === 'Depleted' || input.consecutiveDepletedDays >= 3) {
    flags.push(safetyFlag({
      severity: input.consecutiveDepletedDays >= 5 ? 'danger' : 'warning',
      code: 'poor_readiness',
      title: 'Poor readiness',
      message: 'Readiness is low enough to constrain body-mass and training decisions.',
      recommendation: 'Prioritize recovery and do not add extra work to chase body mass.',
    }));
  }

  if (input.safetyContext?.age != null && input.safetyContext.age > 0 && input.safetyContext.age < 18) {
    flags.push(safetyFlag({
      severity: 'danger',
      code: 'professional_review_required',
      title: 'Qualified review required',
      message: 'Minor athletes require qualified review before body-mass reduction planning.',
      recommendation: 'Block automatic weight-class loss planning until qualified review is available.',
    }));
  }

  if (input.acwr >= 1.5) {
    flags.push(safetyFlag({
      severity: 'warning',
      code: 'excessive_training_load',
      title: 'Training load elevated',
      message: 'Training load is elevated while body-mass planning is active.',
      recommendation: 'Reduce optional high-stress sessions and preserve recovery.',
    }));
  }

  if (input.bodyTempF != null && input.bodyTempF >= 100.4) {
    flags.push(safetyFlag({
      severity: 'danger',
      code: 'illness_conflict',
      title: 'Illness screen conflict',
      message: 'Body temperature is elevated and should block automatic weight-class pressure.',
      recommendation: 'Stop automatic planning and seek qualified care if symptoms worsen.',
    }));
  }

  if (
    input.baselineCognitiveScore != null &&
    input.latestCognitiveScore != null &&
    input.latestCognitiveScore > input.baselineCognitiveScore * 1.2
  ) {
    flags.push(safetyFlag({
      severity: 'warning',
      code: 'poor_readiness',
      title: 'Cognitive score changed',
      message: 'Reaction-time change suggests readiness risk.',
      recommendation: 'Constrain training and body-mass pressure until readiness normalizes.',
    }));
  }

  if (input.remainingLbsToTarget > 0 && input.daysToWeighIn <= 7 && input.projectedWeightByWeighIn != null && input.projectedWeightByWeighIn > input.startWeightLbs) {
    flags.push(safetyFlag({
      severity: 'danger',
      code: 'unsafe_weight_class_target',
      title: 'Target not feasible',
      message: 'The current projection does not support the requested class in the remaining timeframe.',
      recommendation: 'Choose a safer class, extend the timeline, or use qualified review.',
    }));
  }

  return flags;
}

function baseCalories(input: DailyCutProtocolInput): number {
  return Math.max(
    BASELINE_CALORIE_FLOOR,
    Math.round(input.baseNutritionTargets.adjustedCalories || input.baseNutritionTargets.tdee || BASELINE_CALORIE_FLOOR),
  );
}

function underFuelingScreenFromProtocol(input: DailyCutProtocolInput): UnderFuelingScreenInput {
  return {
    rapidBodyMassDecline: input.weeklyVelocityLbs < -2.5,
    persistentFatigue: input.readinessState === 'Depleted',
    poorRecovery: input.consecutiveDepletedDays >= 3,
    sleepDisturbance: false,
    lowIntakeRelativeToLoad: baseCalories(input) < Math.max(input.plan.calorie_floor, BASELINE_CALORIE_FLOOR),
  };
}

export function computeDailyCutProtocol(input: DailyCutProtocolInput): DailyCutProtocolResult {
  const { plan, date, currentWeight } = input;
  const cutPhase = determineCutPhase(plan, date);
  const daysToWeighIn = daysBetween(date, plan.weigh_in_date);
  const evaluation = evaluateLegacyPlan({
    athleteId: plan.user_id,
    asOfDate: date,
    startWeight: currentWeight,
    targetWeight: plan.target_weight,
    fightDate: plan.fight_date,
    weighInDate: plan.weigh_in_date,
    fightStatus: plan.fight_status,
    sport: plan.sport,
    athleteAge: input.safetyContext.age,
    weightHistory: input.weightHistory,
    underFuelingScreen: underFuelingScreenFromProtocol(input),
  });
  const target = evaluation.plan;
  const blocking = target.feasibilityStatus === 'high_risk' || target.feasibilityStatus === 'unsafe' || target.professionalReviewRequired;
  const calories = baseCalories(input);
  const safetyFlags = validateCutSafety({
    cutPhase,
    startWeightLbs: plan.start_weight,
    currentWeightLbs: currentWeight,
    weeklyVelocityLbs: input.weeklyVelocityLbs,
    prescribedCalories: calories,
    calorieFloor: plan.calorie_floor,
    readinessState: input.readinessState,
    consecutiveDepletedDays: input.consecutiveDepletedDays,
    acwr: input.acwr,
    urineColor: input.urineColor,
    bodyTempF: input.bodyTempF,
    baselineCognitiveScore: input.baselineCognitiveScore,
    latestCognitiveScore: input.latestCognitiveScore,
    waterCutAllocationLbs: 0,
    remainingLbsToTarget: Math.max(0, currentWeight - plan.target_weight),
    daysToWeighIn,
    fightStatus: plan.fight_status,
    safetyContext: input.safetyContext,
    projectedWeightByWeighIn: null,
  });
  const warning = warningFromResult({
    status: target.feasibilityStatus,
    riskLevel: target.riskLevel,
    explanation: target.explanation?.summary ?? 'Weight-class target evaluated with safety constraints.',
  });
  const hydrationTarget = Math.round(currentWeight * 0.67);

  return {
    date,
    cutPhase,
    daysToWeighIn,
    activeCutWarning: warning
      ? toCutPlanWarning({
        warning,
        fightStatus: plan.fight_status,
        athleteAge: input.safetyContext.age,
        daysToWeighIn,
        cutPct: plan.start_weight > 0 ? round((Math.max(0, plan.start_weight - plan.target_weight) / plan.start_weight) * 100) : 0,
      })
      : null,
    weightDriftLbs: input.weightHistory.length > 0 ? round(currentWeight - input.weightHistory[input.weightHistory.length - 1].weight) : null,
    prescribedCalories: calories,
    prescribedProtein: Math.round(input.baseNutritionTargets.protein),
    prescribedCarbs: Math.round(input.baseNutritionTargets.carbs),
    prescribedFat: Math.round(input.baseNutritionTargets.fat),
    isRefeedDay: false,
    isCarbCycleHigh: false,
    waterTargetOz: hydrationTarget,
    sodiumTargetMg: null,
    sodiumInstruction: 'Keep sodium and electrolytes familiar and predictable.',
    fiberInstruction: cutPhase === 'fight_week_load' || cutPhase === 'weigh_in'
      ? 'Use familiar foods that you already tolerate.'
      : 'Normal familiar foods.',
    trainingIntensityCap: blocking ? 4 : getDailyCutIntensityCap(plan, date),
    trainingRecommendation: blocking
      ? 'Automatic weight-class pressure is blocked; preserve recovery and use qualified review.'
      : 'Keep training aligned with readiness and the active phase.',
    interventionReason: blocking
      ? target.explanation?.summary ?? 'Safety gate blocked automatic body-mass pressure.'
      : null,
    morningProtocol: 'Log body mass, readiness, and symptoms before making plan changes.',
    afternoonProtocol: 'Fuel scheduled training normally and avoid extra work to chase body mass.',
    eveningProtocol: 'Review the trend and prioritize sleep, recovery, and steady meals.',
    safetyFlags,
    rehydrationProtocol: cutPhase === 'rehydration' || cutPhase === 'weigh_in'
      ? computeRehydrationProtocol({
        currentWeight,
        targetWeight: plan.target_weight,
        hoursToFight: 24,
        biologicalSex: input.biologicalSex,
      })
      : null,
  };
}

export function computeRehydrationProtocol(input: RehydrationInput): RehydrationProtocolResult {
  const currentWeight = input.currentWeight ?? input.weighInWeightLbs ?? input.targetWeightLbs ?? input.targetWeight ?? 0;
  const targetWeight = input.targetWeight ?? input.targetWeightLbs ?? currentWeight;
  const hoursAvailable = input.hoursToFight ?? 24;
  const fluidTargetLiters = currentWeight > 0 ? round((currentWeight * 0.35) / 33.814, 10) : 0;
  const phases: RehydrationPhase[] = [
    {
      name: 'Post weigh-in check',
      timeWindow: '0-60 min',
      fluidInstruction: 'Sip steadily with familiar fluids and normal electrolyte support.',
      foodInstruction: 'Start with familiar carbohydrates and protein you have already practiced.',
      sodiumInstruction: 'Use normal familiar electrolyte support; do not force large boluses.',
      targetFluidOz: fluidTargetLiters > 0 ? Math.round((fluidTargetLiters * 33.814) / 3) : 0,
    },
    {
      name: 'Meal window',
      timeWindow: '1-4 hours',
      fluidInstruction: 'Continue steady sipping with meals.',
      foodInstruction: 'Use familiar meals that support glycogen and gut comfort.',
      sodiumInstruction: 'Keep seasoning familiar and predictable.',
      targetFluidOz: fluidTargetLiters > 0 ? Math.round((fluidTargetLiters * 33.814) / 3) : 0,
    },
    {
      name: 'Competition readiness',
      timeWindow: '4+ hours',
      fluidInstruction: 'Use thirst, urine color, stomach comfort, and coach feedback to pace intake.',
      foodInstruction: 'Keep food familiar and stop experimenting.',
      sodiumInstruction: 'Keep electrolyte choices familiar.',
      targetFluidOz: fluidTargetLiters > 0 ? Math.round((fluidTargetLiters * 33.814) / 3) : 0,
    },
  ];

  return {
    phases,
    targetRegainLbs: 0,
    totalFluidTargetLiters: fluidTargetLiters,
    totalSodiumTargetMg: 0,
    hoursAvailable,
    targetWeightByFight: targetWeight,
    weightToRegainLbs: Math.max(0, targetWeight - currentWeight),
    totalFluidOz: Math.round(fluidTargetLiters * 33.814),
    monitorMetrics: [
      'stomach comfort',
      'urine color',
      'dizziness or faintness',
      'body mass trend',
      'coach or clinician feedback',
    ],
    message: 'Post weigh-in recovery should use familiar foods, steady fluids, and symptom monitoring.',
  };
}
