import type {
  AthleticorePhase,
  ComposedSession,
  ConfidenceValue,
  FoodEntry,
  FoodEntrySource,
  FoodNutrients,
  ISODateString,
  ISODateTimeString,
  MeasurementRange,
  NutritionDataQuality,
  NutritionDataSourceType,
  NutritionTarget,
  PerformanceState,
  PrimaryNutritionAdaptation,
  RecoveryNutritionDirective,
  RiskFlag,
  SessionFuelingDirective,
  SodiumElectrolyteGuidance,
  SourceReference,
  UnknownField,
} from '../types/index.ts';
import { UNKNOWN_CONFIDENCE } from '../types/index.ts';
import { createExplanation, explainConfidence, explainPlanAdjustment } from '../explanation-engine/explanationEngine.ts';
import { createMissingDataRisk, createRiskFlag, dedupeRiskFlags } from '../risk-safety/riskSafetyEngine.ts';
import { confidenceFromLevel, normalizeConfidence } from '../utils/confidence.ts';
import { createMeasurementRange, createUnknownRange } from '../utils/units.ts';
import { toFiniteNumberOrNull, toPositiveNumberOrNull } from '../utils/numbers.ts';
import { createNutritionDataQuality, createUnknownNutritionDataQuality } from '../types/nutrition.ts';

export interface NutritionFuelingInput {
  performanceState: PerformanceState;
  date: ISODateString;
  foodEntries?: FoodEntry[];
  generatedAt?: ISODateTimeString | null;
}

export interface NutritionFuelingResult {
  target: NutritionTarget;
  sessionFuelingDirectives: SessionFuelingDirective[];
  riskFlags: RiskFlag[];
  explanations: NonNullable<NutritionTarget['explanation']>[];
}

export interface CreateFoodEntryInput {
  id: string;
  athleteId: string;
  timestamp?: ISODateTimeString | null;
  mealType: FoodEntry['mealType'];
  foodName: string;
  quantity?: unknown;
  unit?: string | null;
  gramsNormalized?: unknown;
  source?: FoodEntrySource;
  sourceId?: string | null;
  barcode?: string | null;
  brand?: string | null;
  servingSize?: string | null;
  nutrients?: Partial<FoodNutrients>;
  dataQuality?: NutritionDataQuality;
  isVerified?: boolean;
  isUserEstimated?: boolean;
  isRecipe?: boolean;
  isCustomFood?: boolean;
  notes?: string | null;
}

const ENGINE_CONFIDENCE = confidenceFromLevel('medium', [
  'Nutrition and Fueling Engine resolved targets from performance state.',
]);
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, step = 1): number {
  return Math.round(value / step) * step;
}

function range<TUnit extends 'kcal' | 'g' | 'oz' | 'mg' | 'minute' | 'rpe'>(
  target: number | null,
  unit: TUnit,
  options: { spread?: number; min?: number; max?: number; confidence?: ConfidenceValue } = {},
): MeasurementRange<TUnit> {
  if (target == null || !Number.isFinite(target)) {
    return createUnknownRange(unit, options.confidence ?? UNKNOWN_CONFIDENCE);
  }

  const spread = options.spread ?? Math.max(1, target * 0.08);
  return createMeasurementRange({
    min: options.min ?? Math.max(0, round(target - spread)),
    target: round(target),
    max: options.max ?? round(target + spread),
    unit,
    confidence: options.confidence ?? ENGINE_CONFIDENCE,
  });
}

function sessionStress(session: ComposedSession): number {
  const duration = session.durationMinutes.target ?? 0;
  const intensity = session.intensityRpe.target ?? 0;
  return session.stressScore ?? Math.round((duration * intensity) / 10);
}

function bodyWeightLbs(state: PerformanceState): number | null {
  const current = state.bodyMass?.current;
  if (!current) return null;
  return current.unit === 'kg' ? current.value * 2.2046226218 : current.value;
}

function phaseModifier(phase: AthleticorePhase): number {
  switch (phase) {
    case 'camp':
    case 'short_notice_camp':
      return 180;
    case 'competition_week':
    case 'taper':
      return 60;
    case 'recovery':
    case 'deload':
      return -80;
    case 'body_recomposition':
    case 'weight_class_management':
      return -120;
    case 'build':
    case 'maintenance':
    default:
      return 0;
  }
}

function purposeForPhase(phase: AthleticorePhase): NutritionTarget['purpose'] {
  switch (phase) {
    case 'camp':
    case 'short_notice_camp':
      return 'performance';
    case 'competition_week':
    case 'taper':
      return 'fight_week_support';
    case 'recovery':
    case 'deload':
      return 'recovery';
    case 'weight_class_management':
      return 'weight_class_management_support';
    case 'body_recomposition':
      return 'body_composition_support';
    default:
      return 'maintenance';
  }
}

function sessionsForDate(state: PerformanceState, date: ISODateString): ComposedSession[] {
  const all = [
    ...state.composedSessions,
    ...(state.activeTrainingBlock?.sessions ?? []),
    ...(state.journey.activeTrainingBlock?.sessions ?? []),
  ];
  const byId = new Map<string, ComposedSession>();
  for (const session of all) {
    if (session.date === date) {
      byId.set(session.id, session);
    }
  }
  return Array.from(byId.values());
}

function adaptationForSession(session: ComposedSession): PrimaryNutritionAdaptation {
  if (session.family === 'sparring') return 'sparring';
  if (session.family === 'boxing_skill') return 'boxing_skill';
  if (session.family === 'strength') {
    const title = session.title.toLowerCase();
    if (title.includes('power') || title.includes('speed')) return 'power';
    return 'strength';
  }
  if (session.family === 'conditioning' || session.family === 'roadwork') return 'conditioning';
  if (session.family === 'assessment') return 'competition';
  if (session.family === 'recovery' || session.family === 'rest') return 'recovery';
  return 'mixed';
}

function sessionTypeLabel(session: ComposedSession): string {
  if (session.family === 'assessment') return 'competition';
  return session.family;
}

function carbohydrateDemand(session: ComposedSession, phase: AthleticorePhase): number {
  const duration = session.durationMinutes.target ?? 0;
  const intensity = session.intensityRpe.target ?? 0;
  const base = (duration / 60) * (intensity >= 8 ? 55 : intensity >= 6 ? 35 : intensity >= 4 ? 18 : 8);
  const sparringBonus = session.family === 'sparring' ? 25 : session.family === 'boxing_skill' ? 12 : 0;
  const campBonus = phase === 'camp' || phase === 'short_notice_camp' ? 15 : 0;
  const competitionBonus = phase === 'competition_week' && session.family === 'assessment' ? 20 : 0;
  return clamp(Math.round(base + sparringBonus + campBonus + competitionBonus), 0, 110);
}

function proteinDemand(session: ComposedSession): number {
  const intensity = session.intensityRpe.target ?? 0;
  if (session.family === 'strength') return intensity >= 7 ? 38 : 30;
  if (session.family === 'sparring') return 34;
  if (session.family === 'conditioning' || session.family === 'roadwork') return 26;
  if (session.family === 'assessment') return 32;
  return 20;
}

function hydrationDemand(session: ComposedSession): number {
  const duration = session.durationMinutes.target ?? 0;
  const intensity = session.intensityRpe.target ?? 0;
  return clamp(Math.round((duration / 15) * 4 + (intensity >= 7 ? 12 : intensity >= 5 ? 6 : 2)), 8, 56);
}

function fuelingPriority(session: ComposedSession): 'low' | 'medium' | 'high' {
  if (session.family === 'sparring' || session.family === 'assessment') return 'high';
  if ((session.intensityRpe.target ?? 0) >= 7 || (session.durationMinutes.target ?? 0) >= 75) return 'high';
  if ((session.intensityRpe.target ?? 0) >= 5 || (session.durationMinutes.target ?? 0) >= 45) return 'medium';
  return 'low';
}

function createSessionFuelingDirective(input: {
  session: ComposedSession;
  phase: AthleticorePhase;
  generatedAt?: ISODateTimeString | null;
}): SessionFuelingDirective {
  const { session, phase } = input;
  const carbDemand = carbohydrateDemand(session, phase);
  const protein = proteinDemand(session);
  const fluids = hydrationDemand(session);
  const priority = fuelingPriority(session);
  const competitionWeek = phase === 'competition_week' || phase === 'taper';
  const gutComfortConcern = competitionWeek || session.family === 'sparring' || session.family === 'assessment'
    ? 'moderate'
    : priority === 'high'
      ? 'moderate'
      : 'low';
  const pre = [
    carbDemand >= 45 ? 'Use familiar, easy-digesting carbohydrate before the session.' : 'Use a small familiar meal or snack if hungry.',
    gutComfortConcern === 'moderate' ? 'Keep fat and fiber lower near training to protect gut comfort.' : null,
    competitionWeek ? 'Avoid novel foods and new supplements during fight week.' : null,
  ].filter((line): line is string => Boolean(line));
  const during = [
    carbDemand >= 60 ? 'Use carbohydrate plus fluids during long or repeated high-intensity work.' : 'Use fluids during the session; add carbs if duration or intensity runs long.',
    fluids >= 28 ? 'Include electrolytes when sweat loss or session duration is high.' : null,
  ].filter((line): line is string => Boolean(line));
  const post = [
    protein >= 30 ? 'Prioritize protein in the first recovery meal.' : 'Include protein in the next meal.',
    carbDemand >= 45 ? 'Restore carbohydrate after the session so the next training day is not under-fueled.' : null,
  ].filter((line): line is string => Boolean(line));
  const confidence = session.confidence.level === 'unknown' ? confidenceFromLevel('low') : ENGINE_CONFIDENCE;
  const explanation = explainPlanAdjustment({
    summary: `${session.title} fueling was matched to session demand.`,
    reasons: [
      `${session.family} session at RPE ${session.intensityRpe.target ?? 'unknown'} for ${session.durationMinutes.target ?? 'unknown'} minutes.`,
      session.family === 'sparring' ? 'Sparring increases fueling and recovery priority.' : null,
      competitionWeek ? 'Competition week avoids novel foods and supplements.' : null,
    ].filter((line): line is string => Boolean(line)),
    confidence,
    generatedAt: input.generatedAt,
  });

  return {
    id: `${session.id}:fueling`,
    sessionId: session.id,
    date: session.date,
    sessionType: sessionTypeLabel(session),
    intensity: session.intensityRpe,
    durationMinutes: session.durationMinutes,
    primaryAdaptation: adaptationForSession(session),
    carbohydrateDemand: range(carbDemand, 'g', { spread: Math.max(8, carbDemand * 0.15), confidence }),
    proteinRecoveryDemand: range(protein, 'g', { spread: 6, confidence }),
    hydrationDemand: range(fluids, 'oz', { spread: 8, confidence }),
    gutComfortConcern,
    preSessionGuidance: pre,
    duringSessionGuidance: during,
    postSessionGuidance: post,
    confidence,
    explanation,
    priority,
    windows: [
      {
        timing: 'pre',
        carbGrams: range(Math.min(carbDemand, 70), 'g', { spread: 10, confidence }),
        proteinGrams: range(Math.min(protein, 30), 'g', { spread: 5, confidence }),
        fluidOunces: range(Math.min(fluids, 24), 'oz', { spread: 6, confidence }),
        sodiumMg: range(priority === 'high' ? 600 : 300, 'mg', { spread: 150, confidence }),
        notes: pre,
      },
      {
        timing: 'post',
        carbGrams: range(Math.max(15, Math.round(carbDemand * 0.7)), 'g', { spread: 10, confidence }),
        proteinGrams: range(protein, 'g', { spread: 5, confidence }),
        fluidOunces: range(fluids, 'oz', { spread: 8, confidence }),
        sodiumMg: range(priority === 'high' ? 700 : 350, 'mg', { spread: 150, confidence }),
        notes: post,
      },
    ],
    riskFlags: [],
  };
}

function nutritionDataConfidence(foodEntries: FoodEntry[]): ConfidenceValue {
  if (foodEntries.length === 0) {
    return confidenceFromLevel('low', ['No food entries are available for nutrition confidence.']);
  }

  const scores = foodEntries.map((entry) => entry.confidence.score ?? 0.2);
  return normalizeConfidence(scores.reduce((sum, score) => sum + score, 0) / scores.length, [
    `${foodEntries.length} food entr${foodEntries.length === 1 ? 'y' : 'ies'} available for confidence scoring.`,
  ]);
}

function trainingLoadVector(sessions: ComposedSession[]): {
  totalLoad: number;
  hardLoad: number;
  sparringLoad: number;
  strengthLoad: number;
  conditioningLoad: number;
  recoveryLoad: number;
} {
  return sessions.reduce((acc, session) => {
    const stress = sessionStress(session);
    acc.totalLoad += stress;
    if ((session.intensityRpe.target ?? 0) >= 7 || session.family === 'sparring' || session.family === 'assessment') {
      acc.hardLoad += stress;
    }
    if (session.family === 'sparring') acc.sparringLoad += stress;
    if (session.family === 'strength') acc.strengthLoad += stress;
    if (session.family === 'conditioning' || session.family === 'roadwork') acc.conditioningLoad += stress;
    if (session.family === 'recovery') acc.recoveryLoad += stress;
    return acc;
  }, {
    totalLoad: 0,
    hardLoad: 0,
    sparringLoad: 0,
    strengthLoad: 0,
    conditioningLoad: 0,
    recoveryLoad: 0,
  });
}

function bodyMassContext(state: PerformanceState): string | null {
  const plan = state.weightClassPlan;
  if (plan?.status === 'active' || plan?.status === 'planned') {
    return plan.mode === 'fight_week_support'
      ? 'Fight-week body-mass support is active; safety floors must constrain nutrition.'
      : 'Body-mass trend should be supported gradually without aggressive restriction.';
  }
  const goal = state.journey.nutritionPreferences.goal;
  if (goal === 'cut') return 'Gradual body-composition support without unsafe restriction.';
  if (goal === 'bulk') return 'Lean gain support while protecting training quality.';
  return null;
}

function recoveryDirectives(input: {
  sessions: ComposedSession[];
  phase: AthleticorePhase;
  confidence: ConfidenceValue;
  generatedAt?: ISODateTimeString | null;
}): RecoveryNutritionDirective[] {
  const hardSession = input.sessions.some((session) => (session.intensityRpe.target ?? 0) >= 7 || session.family === 'sparring');
  const strength = input.sessions.some((session) => session.family === 'strength');
  const recovery = input.phase === 'recovery' || input.phase === 'deload';
  const focus = hardSession
    ? 'glycogen_restore'
    : strength
      ? 'tissue_repair'
      : recovery
        ? 'hydration_restore'
        : 'none';

  return [
    {
      focus,
      proteinTiming: strength || hardSession ? 'Spread protein across 3-5 feedings with one post-session serving.' : 'Keep normal protein distribution.',
      carbohydrateTiming: hardSession ? 'Put more carbohydrates before and after the key session.' : 'Use balanced meals without forcing extra carbohydrate.',
      hydrationTiming: hardSession ? 'Begin fluids early and replace losses after training.' : 'Keep baseline fluids steady across the day.',
      notes: [
        hardSession ? 'Hard training increases recovery nutrition priority.' : null,
        recovery ? 'Recovery days still avoid under-fueling when readiness is depleted.' : null,
      ].filter((line): line is string => Boolean(line)),
      confidence: input.confidence,
      explanation: createExplanation({
        kind: 'decision',
        summary: `Recovery nutrition focus is ${focus.replace(/_/g, ' ')}.`,
        reasons: ['Recovery directives reflect training load, phase, and readiness context.'],
        impact: focus === 'none' ? 'kept' : 'adjusted',
        confidence: input.confidence,
        generatedAt: input.generatedAt,
      }),
    },
  ];
}

function micronutrientFocus(input: {
  phase: AthleticorePhase;
  sessions: ComposedSession[];
  dataQuality: ConfidenceValue;
}): string[] {
  const focus = new Set<string>();
  if (input.sessions.some((session) => session.family === 'sparring' || session.family === 'assessment')) {
    focus.add('iron');
    focus.add('sodium');
    focus.add('potassium');
  }
  if (input.sessions.some((session) => session.family === 'strength')) {
    focus.add('calcium');
    focus.add('vitamin D');
  }
  if (input.phase === 'camp' || input.phase === 'short_notice_camp' || input.phase === 'competition_week') {
    focus.add('magnesium');
    focus.add('electrolytes');
  }
  if (input.dataQuality.level === 'low' || input.dataQuality.level === 'unknown') {
    focus.add('log completeness');
  }
  return Array.from(focus);
}

function sodiumGuidance(input: {
  sessions: ComposedSession[];
  phase: AthleticorePhase;
  confidence: ConfidenceValue;
}): SodiumElectrolyteGuidance | null {
  if (input.sessions.length === 0 && input.phase !== 'competition_week') return null;
  const hard = input.sessions.some((session) => (session.intensityRpe.target ?? 0) >= 7 || session.family === 'sparring');
  const target = hard ? 900 : input.phase === 'competition_week' ? 700 : 500;

  return {
    sodiumTargetRange: range(target, 'mg', { spread: 200, confidence: input.confidence }),
    electrolyteNotes: [
      hard ? 'Add electrolytes around hard or sweaty training.' : 'Use baseline electrolytes as needed with fluids.',
      input.phase === 'competition_week' ? 'Avoid new electrolyte products in competition week.' : null,
    ].filter((line): line is string => Boolean(line)),
    confidence: input.confidence,
  };
}

function riskFlagsForTarget(input: {
  state: PerformanceState;
  date: ISODateString;
  energyTarget: number;
  weightLbs: number | null;
  foodConfidence: ConfidenceValue;
  missingFields: UnknownField[];
  generatedAt?: ISODateTimeString | null;
}): RiskFlag[] {
  const carriedNutritionRisks = input.state.riskFlags.filter((flag) =>
    flag.status === 'active'
    && (flag.code === 'under_fueling_risk' || flag.code === 'low_nutrition_confidence')
  );
  const riskFlags: RiskFlag[] = [...carriedNutritionRisks];
  if (input.missingFields.length > 0) {
    riskFlags.push(createMissingDataRisk({
      id: `nutrition-missing:${input.date}`,
      context: 'Nutrition target',
      missingFields: input.missingFields,
      appliesOn: input.date,
      generatedAt: input.generatedAt,
    }));
  }
  if (input.foodConfidence.level === 'low' || input.foodConfidence.level === 'unknown') {
    riskFlags.push(createRiskFlag({
      id: `low-nutrition-confidence:${input.date}`,
      code: 'low_nutrition_confidence',
      severity: 'low',
      appliesOn: input.date,
      confidence: input.foodConfidence,
      explanation: explainConfidence({
        context: 'Nutrition tracking',
        confidence: input.foodConfidence,
        generatedAt: input.generatedAt,
      }),
    }));
  }
  if (input.weightLbs && input.energyTarget < input.weightLbs * 11) {
    riskFlags.push(createRiskFlag({
      id: `under-fueling:${input.date}`,
      code: 'under_fueling_risk',
      severity: input.energyTarget < input.weightLbs * 9 ? 'high' : 'moderate',
      appliesOn: input.date,
      evidence: [
        { metric: 'energy_target_kcal', value: input.energyTarget },
        { metric: 'body_mass_lb', value: Math.round(input.weightLbs) },
      ],
      generatedAt: input.generatedAt,
    }));
  }
  return dedupeRiskFlags(riskFlags);
}

function targetConfidence(input: {
  foodConfidence: ConfidenceValue;
  hasBodyMass: boolean;
  sessionCount: number;
}): ConfidenceValue {
  const bodyMassScore = input.hasBodyMass ? 0.75 : 0.25;
  const sessionScore = input.sessionCount > 0 ? 0.75 : 0.55;
  const foodScore = input.foodConfidence.score ?? 0.25;
  return normalizeConfidence((bodyMassScore + sessionScore + foodScore) / 3, [
    input.hasBodyMass ? 'Body mass is available.' : 'Body mass is missing, so energy estimates are less certain.',
    input.sessionCount > 0 ? 'Training sessions are available for fueling demand.' : 'No training sessions were available for this date.',
    ...input.foodConfidence.reasons,
  ]);
}

export function generateNutritionTarget(input: NutritionFuelingInput): NutritionFuelingResult {
  const { performanceState, date } = input;
  const sessions = sessionsForDate(performanceState, date);
  const phase = performanceState.phase.current;
  const weight = bodyWeightLbs(performanceState);
  const load = trainingLoadVector(sessions);
  const foodConfidence = nutritionDataConfidence(input.foodEntries ?? []);
  const missingFields: UnknownField[] = [];
  if (!weight) missingFields.push({ field: 'current_body_mass', reason: 'not_collected' });
  if ((input.foodEntries ?? []).length === 0) missingFields.push({ field: 'food_log_entries', reason: 'not_collected' });

  const confidence = targetConfidence({
    foodConfidence,
    hasBodyMass: Boolean(weight),
    sessionCount: sessions.length,
  });
  const assumedWeight = weight ?? 170;
  const baseEnergy = assumedWeight * 14.2;
  const loadEnergy = load.totalLoad * 4.5 + load.hardLoad * 1.5 + load.sparringLoad * 2;
  const readinessNutritionBump = performanceState.readiness.recommendedNutritionAdjustment.type === 'increase_fueling'
    || performanceState.readiness.recommendedNutritionAdjustment.type === 'increase_recovery_nutrition'
    ? 120
    : 0;
  const readinessProtect = ['red', 'orange'].includes(performanceState.readiness.readinessBand)
    ? 120
    : readinessNutritionBump;
  const nutritionGoal = performanceState.journey.nutritionPreferences.goal;
  const nutritionGoalAdjustment = nutritionGoal === 'cut'
    ? -150
    : nutritionGoal === 'bulk'
      ? 200
      : 0;
  const energyTarget = clamp(
    baseEnergy + phaseModifier(phase) + loadEnergy + readinessProtect,
    assumedWeight * 11.5,
    assumedWeight * 22,
  );
  const bodyMassPlanActive = performanceState.weightClassPlan?.status === 'active' || performanceState.weightClassPlan?.status === 'planned';
  const bodyMassAdjustment = bodyMassPlanActive && performanceState.weightClassPlan?.mode !== 'fight_week_support' ? -150 : 0;
  const safeEnergyTarget = Math.max(assumedWeight * 11.5, energyTarget + bodyMassAdjustment + nutritionGoalAdjustment);
  const proteinPerLb = load.strengthLoad > 0 || bodyMassPlanActive ? 0.95 : phase === 'recovery' || phase === 'deload' ? 0.85 : 0.8;
  const proteinTarget = assumedWeight * proteinPerLb;
  const carbTarget = clamp(
    (assumedWeight / 2.2046226218) * (load.hardLoad > 0 ? 5.2 : load.totalLoad > 35 ? 4.2 : phase === 'recovery' ? 3.2 : 3.6),
    120,
    650,
  );
  const fatTarget = Math.max(45, (safeEnergyTarget - proteinTarget * 4 - carbTarget * 4) / 9);
  const hydrationTarget = 80 + Math.min(70, sessions.reduce((sum, session) => sum + hydrationDemand(session) * 0.5, 0));
  const directives = sessions.map((session) => createSessionFuelingDirective({
    session,
    phase,
    generatedAt: input.generatedAt,
  }));
  const dataQuality = input.foodEntries?.length
    ? createNutritionDataQuality({
        sourceType: 'imported',
        verified: input.foodEntries.some((entry) => entry.isVerified),
        userEstimate: input.foodEntries.some((entry) => entry.isUserEstimated),
        missingFields,
        warnings: foodConfidence.level === 'low' ? ['Food log confidence is low.'] : [],
      })
    : createUnknownNutritionDataQuality(missingFields);
  const risks = riskFlagsForTarget({
    state: performanceState,
    date,
    energyTarget: safeEnergyTarget,
    weightLbs: weight,
    foodConfidence,
    missingFields,
    generatedAt: input.generatedAt,
  });
  const explanation = createExplanation({
    kind: 'decision',
    summary: 'Nutrition target resolved by the Nutrition and Fueling Engine.',
    reasons: [
      `${sessions.length} training session(s) contributed to the target.`,
      load.sparringLoad > 0 ? 'Sparring increased carbohydrate, hydration, and recovery priority.' : null,
      phase === 'camp' || phase === 'short_notice_camp' ? 'Camp phase increased fueling and recovery emphasis.' : null,
      phase === 'build' ? 'Build phase supports sustainable energy for progression.' : null,
      phase === 'competition_week' || phase === 'taper' ? 'Competition week avoids novel foods and supplements.' : null,
      nutritionGoal === 'cut' ? 'Energy support was nudged down gradually without crossing safety floors.' : null,
      nutritionGoal === 'bulk' ? 'Lean-gain support was nudged up while keeping macros training-aware.' : null,
      weight ? 'Body mass informed energy and protein ranges.' : 'Body mass is missing, so estimates are less precise.',
    ].filter((line): line is string => Boolean(line)),
    impact: risks.some((risk) => risk.code === 'under_fueling_risk') ? 'restricted' : 'adjusted',
    confidence,
    generatedAt: input.generatedAt,
  });
  const target: NutritionTarget = {
    id: `${performanceState.athlete.athleteId}:${date}:nutrition-target`,
    date,
    phase,
    purpose: purposeForPhase(phase),
    energyTarget: range(safeEnergyTarget, 'kcal', { spread: 120, confidence }),
    energyTargetRange: range(safeEnergyTarget, 'kcal', { spread: 180, confidence }),
    proteinTarget: range(proteinTarget, 'g', { spread: 10, confidence }),
    proteinTargetRange: range(proteinTarget, 'g', { spread: 15, confidence }),
    carbohydrateTarget: range(carbTarget, 'g', { spread: Math.max(25, carbTarget * 0.12), confidence }),
    carbohydrateTargetRange: range(carbTarget, 'g', { spread: Math.max(35, carbTarget * 0.16), confidence }),
    fatTarget: range(fatTarget, 'g', { spread: 8, confidence }),
    fatTargetRange: range(fatTarget, 'g', { spread: 12, confidence }),
    fiberTargetRange: phase === 'competition_week' || phase === 'taper'
      ? range(22, 'g', { min: 18, max: 30, confidence })
      : range(32, 'g', { min: 25, max: 40, confidence }),
    hydrationTarget: range(hydrationTarget, 'oz', { spread: 12, confidence }),
    sodiumElectrolyteGuidance: sodiumGuidance({ sessions, phase, confidence }),
    micronutrientFocus: micronutrientFocus({ phase, sessions, dataQuality: foodConfidence }),
    sessionFuelingDirectives: directives,
    recoveryDirectives: recoveryDirectives({ sessions, phase, confidence, generatedAt: input.generatedAt }),
    bodyMassGoalContext: bodyMassContext(performanceState),
    confidence,
    explanation,
    riskFlags: risks,
    dataQuality,
    calories: range(safeEnergyTarget, 'kcal', { spread: 120, confidence }),
    proteinGrams: range(proteinTarget, 'g', { spread: 10, confidence }),
    carbGrams: range(carbTarget, 'g', { spread: Math.max(25, carbTarget * 0.12), confidence }),
    fatGrams: range(fatTarget, 'g', { spread: 8, confidence }),
    fluidOunces: range(hydrationTarget, 'oz', { spread: 12, confidence }),
    sodiumMg: sodiumGuidance({ sessions, phase, confidence })?.sodiumTargetRange ?? createUnknownRange('mg', confidence),
    safetyFlags: risks,
  };

  return {
    target,
    sessionFuelingDirectives: directives,
    riskFlags: risks,
    explanations: [
      explanation,
      ...directives.map((directive) => directive.explanation).filter((item): item is NonNullable<typeof item> => item != null),
      ...risks.map((risk) => risk.explanation).filter((item): item is NonNullable<typeof item> => item != null),
    ],
  };
}

function sourceTypeFromFoodSource(source: FoodEntrySource): NutritionDataSourceType {
  if (source === 'barcode') return 'barcode';
  if (source === 'custom') return 'custom';
  if (source === 'recipe') return 'recipe';
  if (source === 'imported') return 'imported';
  if (source === 'unknown') return 'unknown';
  return 'fdc';
}

function normalizedNutrients(nutrients?: Partial<FoodNutrients>): FoodNutrients {
  return {
    energyKcal: toFiniteNumberOrNull(nutrients?.energyKcal),
    proteinG: toFiniteNumberOrNull(nutrients?.proteinG),
    carbohydrateG: toFiniteNumberOrNull(nutrients?.carbohydrateG),
    fatG: toFiniteNumberOrNull(nutrients?.fatG),
    fiberG: toFiniteNumberOrNull(nutrients?.fiberG),
    sugarG: toFiniteNumberOrNull(nutrients?.sugarG),
    sodiumMg: toFiniteNumberOrNull(nutrients?.sodiumMg),
    potassiumMg: toFiniteNumberOrNull(nutrients?.potassiumMg),
    calciumMg: toFiniteNumberOrNull(nutrients?.calciumMg),
    ironMg: toFiniteNumberOrNull(nutrients?.ironMg),
    vitaminDMcg: toFiniteNumberOrNull(nutrients?.vitaminDMcg),
    magnesiumMg: toFiniteNumberOrNull(nutrients?.magnesiumMg),
  };
}

function missingNutrients(nutrients: FoodNutrients): string[] {
  return Object.entries(nutrients)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
}

export function createFoodEntry(input: CreateFoodEntryInput): FoodEntry {
  const source = input.source ?? 'unknown';
  const nutrients = normalizedNutrients(input.nutrients);
  const missing = missingNutrients(nutrients);
  const sourceReference: SourceReference | null = input.sourceId
    ? { source, sourceId: input.sourceId, capturedAt: input.timestamp ?? null }
    : null;
  const missingFields: UnknownField[] = missing.map((field) => ({ field, reason: 'not_collected' }));
  const isUserEstimated = input.isUserEstimated ?? (source === 'custom' || source === 'unknown');
  const isVerified = input.isVerified ?? Boolean(input.sourceId && source !== 'custom' && source !== 'unknown');
  const quality = input.dataQuality ?? createNutritionDataQuality({
    sourceType: sourceTypeFromFoodSource(source),
    verified: isVerified,
    userEstimate: isUserEstimated,
    missingFields,
    source: sourceReference,
    warnings: missing.length > 0 ? ['Missing nutrients are unknown, not zero.'] : [],
  });
  const confidence = quality.confidence;
  const grams = toPositiveNumberOrNull(input.gramsNormalized);
  const quantity = toFiniteNumberOrNull(input.quantity);

  return {
    id: input.id,
    athleteId: input.athleteId,
    timestamp: input.timestamp ?? null,
    mealType: input.mealType,
    foodName: input.foodName,
    quantity,
    unit: input.unit ?? null,
    gramsNormalized: grams,
    source,
    sourceId: input.sourceId ?? null,
    barcode: input.barcode ?? null,
    brand: input.brand ?? null,
    servingSize: input.servingSize ?? null,
    nutrients,
    dataQuality: quality,
    confidence,
    isVerified,
    isUserEstimated,
    isRecipe: input.isRecipe ?? source === 'recipe',
    isCustomFood: input.isCustomFood ?? source === 'custom',
    missingNutrients: missing,
    notes: input.notes ?? null,
    loggedAt: input.timestamp ?? null,
    date: input.timestamp?.slice(0, 10) ?? null,
    name: input.foodName,
    amount: grams != null
      ? range(grams, 'g', { spread: 0, confidence })
      : createUnknownRange('g', confidence),
    calories: nutrients.energyKcal != null
      ? range(nutrients.energyKcal, 'kcal', { spread: 0, confidence })
      : createUnknownRange('kcal', confidence),
    proteinGrams: nutrients.proteinG != null
      ? range(nutrients.proteinG, 'g', { spread: 0, confidence })
      : createUnknownRange('g', confidence),
    carbGrams: nutrients.carbohydrateG != null
      ? range(nutrients.carbohydrateG, 'g', { spread: 0, confidence })
      : createUnknownRange('g', confidence),
    fatGrams: nutrients.fatG != null
      ? range(nutrients.fatG, 'g', { spread: 0, confidence })
      : createUnknownRange('g', confidence),
    sourceReference,
  };
}

export function summarizeFoodLogQuality(entries: FoodEntry[]): NutritionDataQuality {
  if (entries.length === 0) {
    return createUnknownNutritionDataQuality([{ field: 'food_entries', reason: 'not_collected' }]);
  }

  const missingFields = entries.flatMap((entry) => entry.missingNutrients.map((field) => ({
    field,
    reason: 'not_collected' as const,
    note: entry.foodName,
  })));
  const confidence = nutritionDataConfidence(entries);

  return createNutritionDataQuality({
    sourceType: entries.some((entry) => entry.source === 'custom') ? 'custom' : 'imported',
    verified: entries.some((entry) => entry.isVerified),
    userEstimate: entries.some((entry) => entry.isUserEstimated),
    missingFields,
    nutrientCompleteness: confidence,
    servingConfidence: confidence,
    portionConfidence: confidence,
    warnings: confidence.level === 'low' ? ['Food log confidence is low.'] : [],
  });
}
