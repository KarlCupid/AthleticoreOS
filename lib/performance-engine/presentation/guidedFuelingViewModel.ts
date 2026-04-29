import type {
  AthleticorePhase,
  ComposedSession,
  ConfidenceLevel,
  ConfidenceValue,
  MeasurementRange,
  NutritionTarget,
  RecoveryNutritionDirective,
  RiskFlag,
  SessionFuelingDirective,
  WeightClassPlan,
} from '../types/index.ts';
import type { UnifiedPerformanceEngineResult } from '../unified-performance/index.ts';

export interface GuidedFuelingMacroTarget {
  id: 'energy' | 'protein' | 'carbs' | 'fat';
  label: string;
  currentValue: number | null;
  targetValue: number | null;
  currentLabel: string;
  targetLabel: string;
  rangeLabel: string;
  unit: 'kcal' | 'g';
}

export interface GuidedFuelingConfidence {
  level: ConfidenceLevel;
  label: string;
  summary: string;
  missingData: string[];
}

export interface GuidedFuelingViewModel {
  source: 'unified_performance_engine';
  available: boolean;
  date: string | null;
  athleteId: string | null;
  phase: AthleticorePhase | 'unknown';
  phaseLabel: string;
  title: "Today's fueling focus";
  primaryFocus: string;
  whyItMatters: string;
  sessionGuidance: string[];
  recoveryNutritionFocus: string;
  phaseContext: string;
  macroTargets: GuidedFuelingMacroTarget[];
  foodLogConfidence: GuidedFuelingConfidence;
  bodyMassContext: string | null;
  riskHighlights: string[];
  detailLines: string[];
}

export interface BuildGuidedFuelingOptions {
  actuals?: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  } | null;
  loggedMealCount?: number | null;
  foodLogConfidence?: ConfidenceValue | null;
  foodLogMissingData?: string[];
  foodLogEstimatedCount?: number | null;
}

const UNAVAILABLE_GUIDED_FUELING: GuidedFuelingViewModel = {
  source: 'unified_performance_engine',
  available: false,
  date: null,
  athleteId: null,
  phase: 'unknown',
  phaseLabel: 'Unknown',
  title: "Today's fueling focus",
  primaryFocus: 'Fueling context is pending.',
  whyItMatters: "Athleticore needs today's training, readiness, body-mass, and risk context before it can guide fuel.",
  sessionGuidance: ['Session fueling will appear once training demand is available.'],
  recoveryNutritionFocus: 'Keep normal meals, hydration, and sleep steady while context loads.',
  phaseContext: 'Phase context is pending.',
  macroTargets: [],
  foodLogConfidence: {
    level: 'unknown',
    label: 'Unknown confidence',
    summary: 'Food log confidence is unknown until Athleticore can read today\'s nutrition context.',
    missingData: ['Training, readiness, and fuel context'],
  },
  bodyMassContext: null,
  riskHighlights: [],
  detailLines: [],
};

export function buildGuidedFuelingViewModel(
  result: UnifiedPerformanceEngineResult | null | undefined,
  options: BuildGuidedFuelingOptions = {},
): GuidedFuelingViewModel {
  if (!result) return UNAVAILABLE_GUIDED_FUELING;

  const performanceState = result.canonicalOutputs.performanceState;
  const target = result.canonicalOutputs.nutritionTarget;
  const directives = result.canonicalOutputs.sessionFuelingDirectives.length > 0
    ? result.canonicalOutputs.sessionFuelingDirectives
    : target.sessionFuelingDirectives;
  const sessions = sessionsForDate(result.canonicalOutputs.composedSessions, target.date ?? performanceState.asOfDate);
  const weightClassPlan = result.canonicalOutputs.weightClassPlan ?? performanceState.weightClassPlan;
  const risks = activeNutritionRisks([
    ...result.riskFlags,
    ...target.riskFlags,
    ...(weightClassPlan?.riskFlags ?? []),
  ]);
  const recoveryDirective = target.recoveryDirectives[0] ?? null;
  const foodConfidence = options.foodLogConfidence ?? target.dataQuality.confidence;
  const missingData = unique([
    ...target.dataQuality.missingFields.map((field) => humanize(field.field)),
    ...(options.foodLogMissingData ?? []),
  ]);

  return {
    source: 'unified_performance_engine',
    available: true,
    date: target.date ?? performanceState.asOfDate,
    athleteId: performanceState.athlete.athleteId,
    phase: performanceState.phase.current,
    phaseLabel: humanize(performanceState.phase.current),
    title: "Today's fueling focus",
    primaryFocus: buildPrimaryFocus({
      phase: performanceState.phase.current,
      target,
      directives,
      sessions,
      risks,
      recoveryDirective,
      weightClassPlan,
    }),
    whyItMatters: buildWhyItMatters({
      phase: performanceState.phase.current,
      target,
      directives,
      sessions,
      recoveryDirective,
      weightClassPlan,
    }),
    sessionGuidance: buildSessionGuidance(directives, sessions),
    recoveryNutritionFocus: buildRecoveryFocus(recoveryDirective, performanceState.phase.current),
    phaseContext: buildPhaseContext(performanceState.phase.current),
    macroTargets: buildMacroTargets(target, options),
    foodLogConfidence: buildFoodLogConfidence({
      confidence: foodConfidence,
      missingData,
      loggedMealCount: options.loggedMealCount ?? null,
      estimatedCount: options.foodLogEstimatedCount ?? null,
    }),
    bodyMassContext: buildBodyMassContext(target, weightClassPlan),
    riskHighlights: unique(risks.map(riskCopy)).slice(0, 3),
    detailLines: buildDetailLines(target, directives),
  };
}

function buildPrimaryFocus(input: {
  phase: AthleticorePhase;
  target: NutritionTarget;
  directives: SessionFuelingDirective[];
  sessions: ComposedSession[];
  risks: RiskFlag[];
  recoveryDirective: RecoveryNutritionDirective | null;
  weightClassPlan: WeightClassPlan | null;
}): string {
  if (input.risks.some((risk) => risk.code === 'under_fueling_risk')) {
    return 'Fuel has been light for the work on the plan. Today is about getting enough in before and after training.';
  }
  if (input.weightClassPlan?.safetyStatus === 'unsafe' || input.weightClassPlan?.feasibilityStatus === 'unsafe') {
    return 'Fueling stays safety-first today. Athleticore will not chase an aggressive body-mass target.';
  }
  if (isRecoveryPhase(input.phase) || input.recoveryDirective?.focus === 'hydration_restore') {
    return 'Recovery days still need enough food. Today is about restoring, not restricting.';
  }
  if (isHighOutput(input.directives, input.sessions)) {
    return "Today needs more fuel. You've got high-output work planned, so carbs matter more before and after training.";
  }
  if (input.sessions.some((session) => session.family === 'strength')) {
    return 'Protein matters today because heavy strength work is on the plan.';
  }
  if (input.phase === 'camp' || input.phase === 'short_notice_camp') {
    return 'Fuel the camp work so boxing quality and recovery stay connected.';
  }
  return 'Fuel for the work planned today, then keep hydration steady afterward.';
}

function buildWhyItMatters(input: {
  phase: AthleticorePhase;
  target: NutritionTarget;
  directives: SessionFuelingDirective[];
  sessions: ComposedSession[];
  recoveryDirective: RecoveryNutritionDirective | null;
  weightClassPlan: WeightClassPlan | null;
}): string {
  if (input.weightClassPlan) {
    return 'Body-mass context is active, so fueling has to stay connected to readiness, training demand, and safety instead of acting like a diet target.';
  }
  if (input.phase === 'camp' || input.phase === 'short_notice_camp') {
    return 'Camp asks for repeatable boxing quality. Fuel has to support the hard work and the recovery around it.';
  }
  if (input.phase === 'competition_week' || input.phase === 'taper') {
    return 'Fight week is about showing up sharp. Food choices should stay familiar while hydration and recovery stay steady.';
  }
  if (isRecoveryPhase(input.phase) || input.recoveryDirective?.focus !== 'none') {
    return 'Recovery nutrition helps you absorb the work already done so the next phase can move forward.';
  }
  if (isHighOutput(input.directives, input.sessions)) {
    return 'The session demand is higher today, so carbs, fluids, and recovery food matter more than chasing a bare macro number.';
  }
  if (input.phase === 'build') {
    return 'Build phase works best when food is consistent enough to support repeatable training quality.';
  }
  return input.target.explanation?.summary
    ? humanizeSentence(input.target.explanation.summary)
    : 'Fueling is being resolved from training, readiness, phase, body-mass context, and risk together.';
}

function buildSessionGuidance(
  directives: SessionFuelingDirective[],
  sessions: ComposedSession[],
): string[] {
  const directive = prioritizeDirective(directives);
  if (!directive) {
    return ['No session-specific fueling block is needed yet. Keep meals, fluids, and recovery steady.'];
  }

  const session = sessions.find((candidate) => candidate.id === directive.sessionId) ?? null;
  const sessionLabel = session?.title ?? humanize(directive.sessionType);
  const lines = [
    directive.preSessionGuidance[0] ? `Before ${sessionLabel}: ${directive.preSessionGuidance[0]}` : null,
    directive.duringSessionGuidance[0] ? `During ${sessionLabel}: ${directive.duringSessionGuidance[0]}` : null,
    directive.postSessionGuidance[0] ? `After ${sessionLabel}: ${directive.postSessionGuidance[0]}` : null,
  ].filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.slice(0, 3).map(humanizeSentence) : [
    `${sessionLabel} has a session fueling note. Keep food and fluids close to the session window.`,
  ];
}

function buildRecoveryFocus(
  directive: RecoveryNutritionDirective | null,
  phase: AthleticorePhase,
): string {
  if (!directive || directive.focus === 'none') {
    if (isRecoveryPhase(phase)) {
      return 'Keep recovery simple: meals, hydration, and sleep. Recovery still needs enough food.';
    }
    return 'Keep the next meal balanced and hydrate steadily after training.';
  }
  if (directive.focus === 'glycogen_restore') {
    return 'Recovery focus: restore carbs and fluids after the hard work so the next session is not under-fueled.';
  }
  if (directive.focus === 'tissue_repair') {
    return 'Recovery focus: spread protein through the day and include it in the post-session meal.';
  }
  if (directive.focus === 'hydration_restore') {
    return 'Recovery focus: restore fluids and keep meals steady. This is not a restriction day.';
  }
  return 'Recovery focus: support impact and tissue repair with enough food, fluids, and sleep.';
}

function buildPhaseContext(phase: AthleticorePhase): string {
  if (phase === 'build') {
    return 'Build phase: fuel steady enough to make training repeatable.';
  }
  if (phase === 'camp' || phase === 'short_notice_camp') {
    return 'Camp phase: fuel boxing quality, sparring recovery, and the work that carries into fight readiness.';
  }
  if (phase === 'competition_week' || phase === 'taper') {
    return 'Competition week: keep food familiar, protect hydration, and avoid unnecessary experiments.';
  }
  if (isRecoveryPhase(phase)) {
    return 'Recovery phase: food supports restoration, not restriction.';
  }
  return `${humanize(phase)} phase: fuel is matched to the current training and recovery context.`;
}

function buildMacroTargets(
  target: NutritionTarget,
  options: BuildGuidedFuelingOptions,
): GuidedFuelingMacroTarget[] {
  const mealCount = options.loggedMealCount ?? 0;
  return [
    macro('energy', 'Energy', target.energyTargetRange ?? target.energyTarget, 'kcal', options.actuals?.calories ?? null, mealCount),
    macro('protein', 'Protein', target.proteinTargetRange ?? target.proteinTarget, 'g', options.actuals?.protein ?? null, mealCount),
    macro('carbs', 'Carbs', target.carbohydrateTargetRange ?? target.carbohydrateTarget, 'g', options.actuals?.carbs ?? null, mealCount),
    macro('fat', 'Fat', target.fatTargetRange ?? target.fatTarget, 'g', options.actuals?.fat ?? null, mealCount),
  ];
}

function macro(
  id: GuidedFuelingMacroTarget['id'],
  label: string,
  rangeValue: MeasurementRange<'kcal' | 'g'> | null | undefined,
  unit: 'kcal' | 'g',
  current: number | null,
  mealCount: number,
): GuidedFuelingMacroTarget {
  const target = rangeTarget(rangeValue);
  const roundedCurrent = current == null ? null : Math.round(current);
  return {
    id,
    label,
    currentValue: roundedCurrent,
    targetValue: target == null ? null : Math.round(target),
    currentLabel: mealCount > 0 && roundedCurrent != null ? `${roundedCurrent} ${unit} logged` : 'Not logged yet',
    targetLabel: target == null ? 'Target unknown' : `${Math.round(target)} ${unit}`,
    rangeLabel: rangeLabel(rangeValue, unit),
    unit,
  };
}

function buildFoodLogConfidence(input: {
  confidence: ConfidenceValue;
  missingData: string[];
  loggedMealCount: number | null;
  estimatedCount: number | null;
}): GuidedFuelingConfidence {
  const label = confidenceLabel(input.confidence);
  const loggedMeals = input.loggedMealCount ?? 0;
  const estimated = input.estimatedCount ?? 0;
  if (input.confidence.level === 'low' || input.confidence.level === 'unknown') {
    const reason = estimated > 0
      ? `${estimated} logged meal${estimated === 1 ? '' : 's'} used estimated food data.`
      : input.missingData.length > 0
        ? 'Some food or nutrient details are missing.'
        : loggedMeals === 0
          ? 'No meals are logged yet.'
          : 'Food log detail is limited.';
    return {
      level: input.confidence.level,
      label,
      summary: `${reason} That's okay, but Athleticore will be more cautious with big fueling adjustments.`,
      missingData: input.missingData,
    };
  }
  return {
    level: input.confidence.level,
    label,
    summary: 'Food log confidence is strong enough to support today\'s fueling guidance.',
    missingData: input.missingData,
  };
}

function buildBodyMassContext(
  target: NutritionTarget,
  weightClassPlan: WeightClassPlan | null,
): string | null {
  if (weightClassPlan?.safetyStatus === 'unsafe' || weightClassPlan?.feasibilityStatus === 'unsafe') {
    return "This target looks too aggressive for the time available. Athleticore won't build a risky plan around it.";
  }
  if (weightClassPlan) {
    return 'Body-mass or weight-class context is active, so fueling stays tied to training demand, readiness, hydration, and safety.';
  }
  if (target.bodyMassGoalContext) {
    return humanizeSentence(target.bodyMassGoalContext);
  }
  return null;
}

function buildDetailLines(
  target: NutritionTarget,
  directives: SessionFuelingDirective[],
): string[] {
  return unique([
    target.explanation?.summary ?? null,
    ...(target.explanation?.reasons ?? []),
    target.sodiumElectrolyteGuidance?.electrolyteNotes[0] ?? null,
    target.micronutrientFocus.length > 0 ? `Focus nutrients: ${target.micronutrientFocus.slice(0, 4).join(', ')}.` : null,
    directives.length > 0 ? `${directives.length} session fueling note${directives.length === 1 ? '' : 's'} active.` : null,
  ].filter((line): line is string => Boolean(line)).map(humanizeSentence)).slice(0, 5);
}

function activeNutritionRisks(risks: RiskFlag[]): RiskFlag[] {
  const nutritionRisks = risks.filter((risk) =>
    risk.status === 'active'
    && (
      risk.domain === 'nutrition'
      || risk.code === 'under_fueling_risk'
      || risk.code === 'low_nutrition_confidence'
      || risk.code === 'missing_data'
      || risk.code === 'unsafe_weight_class_target'
    ),
  );
  return Array.from(new Map(nutritionRisks.map((risk) => [risk.id || `${risk.code}:${risk.message}`, risk])).values());
}

function riskCopy(risk: RiskFlag): string {
  if (risk.code === 'under_fueling_risk') {
    return 'Fuel has been light relative to the work. The priority is getting enough in, not judging the log.';
  }
  if (risk.code === 'low_nutrition_confidence') {
    return 'Food log confidence is low, so Athleticore will be cautious with major fueling changes.';
  }
  if (risk.code === 'missing_data') {
    return 'Some nutrition data is missing, so Athleticore treats it as unknown instead of filling in zero.';
  }
  if (risk.code === 'unsafe_weight_class_target') {
    return "This target looks too aggressive for the time available. Athleticore won't build a risky plan around it.";
  }
  return humanizeSentence(risk.message);
}

function prioritizeDirective(directives: SessionFuelingDirective[]): SessionFuelingDirective | null {
  return [...directives].sort((a, b) => directiveRank(b) - directiveRank(a))[0] ?? null;
}

function directiveRank(directive: SessionFuelingDirective): number {
  const priority = directive.priority === 'high' ? 3 : directive.priority === 'medium' ? 2 : directive.priority === 'low' ? 1 : 0;
  return priority
    + (rangeTarget(directive.carbohydrateDemand) ?? 0) / 100
    + (rangeTarget(directive.intensity) ?? 0) / 10;
}

function isHighOutput(directives: SessionFuelingDirective[], sessions: ComposedSession[]): boolean {
  return directives.some((directive) =>
    directive.priority === 'high'
    || (rangeTarget(directive.carbohydrateDemand) ?? 0) >= 45
    || (rangeTarget(directive.intensity) ?? 0) >= 7,
  ) || sessions.some((session) =>
    session.family === 'sparring'
    || session.family === 'conditioning'
    || (rangeTarget(session.intensityRpe) ?? 0) >= 7
    || (rangeTarget(session.durationMinutes) ?? 0) >= 75,
  );
}

function isRecoveryPhase(phase: AthleticorePhase): boolean {
  return phase === 'recovery' || phase === 'deload';
}

function sessionsForDate(sessions: ComposedSession[], date: string | null | undefined): ComposedSession[] {
  if (!date) return sessions;
  return sessions.filter((session) => session.date === date);
}

function rangeTarget(range: MeasurementRange<string> | null | undefined): number | null {
  return typeof range?.target === 'number' && Number.isFinite(range.target) ? range.target : null;
}

function rangeLabel(range: MeasurementRange<'kcal' | 'g'> | null | undefined, unit: 'kcal' | 'g'): string {
  if (!range || (range.min == null && range.max == null && range.target == null)) {
    return 'Range unknown';
  }
  if (typeof range.min === 'number' && typeof range.max === 'number') {
    return `${Math.round(range.min)}-${Math.round(range.max)} ${unit}`;
  }
  const target = rangeTarget(range);
  return target == null ? 'Range unknown' : `${Math.round(target)} ${unit}`;
}

function confidenceLabel(confidence: ConfidenceValue): string {
  if (confidence.level === 'unknown') return 'Unknown confidence';
  return `${humanize(confidence.level)} confidence`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function humanizeSentence(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return cleaned;
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
