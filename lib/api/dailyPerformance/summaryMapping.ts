import {
  DAILY_ENGINE_VERSION,
  getHydrationProtocol,
  type DailyAthleteSummary,
  type DecisionTraceItem,
  type MacrocycleContext,
  type MEDStatus,
  type MissionRiskLevel,
  type NutritionFuelingTarget,
  type ReadinessProfile,
  type StimulusConstraintSet,
} from '../../engine/index.ts';
import type { WorkoutPrescriptionV2 } from '../../engine/types';
import type {
  ComposedSession,
  Explanation,
  NutritionTarget,
  RiskFlag,
  SessionFuelingDirective,
  UnifiedPerformanceEngineResult,
} from '../../performance-engine/index.ts';

function rangeTarget(range: { target?: number | null; min?: number | null; max?: number | null } | null | undefined): number | null {
  const value = range?.target ?? range?.min ?? range?.max ?? null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundedTarget(range: { target?: number | null; min?: number | null; max?: number | null } | null | undefined, fallback = 0): number {
  return Math.round(rangeTarget(range) ?? fallback);
}

function primaryUnifiedSession(result: UnifiedPerformanceEngineResult | null): ComposedSession | null {
  if (!result) return null;
  return result.canonicalOutputs.composedSessions.find((session) => session.date === result.performanceState.asOfDate)
    ?? result.canonicalOutputs.composedSessions[0]
    ?? null;
}

function workoutTypeFromSession(session: ComposedSession | null): DailyAthleteSummary['trainingDirective']['workoutType'] {
  switch (session?.family) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
      return 'practice';
    case 'strength':
      return 'strength';
    case 'conditioning':
    case 'roadwork':
      return 'conditioning';
    case 'recovery':
    case 'rest':
      return 'recovery';
    default:
      return null;
  }
}

function workoutFocusFromSession(session: ComposedSession | null): DailyAthleteSummary['trainingDirective']['focus'] {
  switch (session?.family) {
    case 'sparring':
    case 'boxing_skill':
      return 'sport_specific';
    case 'strength':
      return 'strength';
    case 'conditioning':
    case 'roadwork':
      return 'conditioning';
    case 'recovery':
    case 'rest':
      return 'recovery';
    default:
      return null;
  }
}

function sessionRoleFromUnified(result: UnifiedPerformanceEngineResult | null, session: ComposedSession | null): DailyAthleteSummary['trainingDirective']['sessionRole'] {
  if (!result) return 'recover';
  if (result.finalPlanStatus === 'blocked') return 'recover';
  if (result.canonicalOutputs.readiness.recommendedTrainingAdjustment.replaceWithMobility) return 'recover';
  if (session?.family === 'rest') return 'rest';
  if (session?.family === 'recovery') return 'recover';
  if (session?.family === 'sparring' || session?.family === 'boxing_skill') return 'spar_support';
  if (result.performanceState.phase.current === 'competition_week' || result.performanceState.phase.current === 'taper') return 'taper_sharpen';
  return result.finalPlanStatus === 'ready' ? 'develop' : 'express';
}

function riskLevelFromUnified(result: UnifiedPerformanceEngineResult | null): MissionRiskLevel {
  if (!result) return 'moderate';
  if (result.blockingRiskFlags.some((flag) => flag.severity === 'critical')) return 'critical';
  if (result.riskFlags.some((flag) => flag.severity === 'critical')) return 'critical';
  if (result.riskFlags.some((flag) => flag.severity === 'high')) return 'high';
  if (result.riskFlags.some((flag) => flag.severity === 'moderate')) return 'moderate';
  return 'low';
}

function nutritionSafetyWarningFromRisks(flags: RiskFlag[]): NutritionFuelingTarget['safetyWarning'] {
  if (flags.some((flag) => flag.code === 'under_fueling_risk' && flag.severity === 'critical')) return 'critical_energy_availability';
  if (flags.some((flag) => flag.code === 'under_fueling_risk')) return 'low_energy_availability';
  return 'none';
}

function priorityFromSession(session: ComposedSession | null): NutritionFuelingTarget['prioritySession'] {
  switch (session?.family) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
      return 'boxing_practice';
    case 'strength':
      return 'heavy_sc';
    case 'conditioning':
    case 'roadwork':
      return 'conditioning';
    default:
      return 'recovery';
  }
}

function fuelStateFromUnified(target: NutritionTarget, session: ComposedSession | null): NutritionFuelingTarget['fuelState'] {
  if (target.phase === 'competition_week' || target.phase === 'taper') return 'taper';
  if (session?.family === 'sparring' || session?.family === 'boxing_skill') return 'spar_support';
  if (session?.family === 'strength') return 'strength_power';
  if (session?.family === 'recovery' || session?.family === 'rest') return 'active_recovery';
  if (!session) return 'rest';
  return 'aerobic';
}

function fuelingWindowFromDirective(
  directive: SessionFuelingDirective | null,
  timing: 'pre' | 'intra' | 'post',
) {
  return directive?.windows?.find((window) => window.timing === timing) ?? null;
}

function sessionFuelingPlanFromUnified(input: {
  directive: SessionFuelingDirective | null;
  session: ComposedSession | null;
  priority: NutritionFuelingTarget['prioritySession'];
}): NutritionFuelingTarget['sessionFuelingPlan'] {
  const pre = fuelingWindowFromDirective(input.directive, 'pre');
  const intra = fuelingWindowFromDirective(input.directive, 'intra');
  const post = fuelingWindowFromDirective(input.directive, 'post');
  const sessionLabel = input.session?.title ?? input.directive?.sessionType ?? 'Training support';

  return {
    priority: input.priority,
    priorityLabel: input.priority.replace(/_/g, ' '),
    sessionLabel,
    preSession: {
      label: 'Before training',
      timing: pre ? 'Before session' : 'Use normal meal timing',
      carbsG: roundedTarget(pre?.carbGrams),
      proteinG: roundedTarget(pre?.proteinGrams),
      notes: pre?.notes ?? input.directive?.preSessionGuidance ?? [],
      lowResidue: input.directive?.gutComfortConcern === 'moderate' || input.directive?.gutComfortConcern === 'high',
    },
    intraSession: {
      fluidsOz: roundedTarget(intra?.fluidOunces ?? input.directive?.hydrationDemand, 0),
      electrolytesMg: roundedTarget(intra?.sodiumMg, 0) || null,
      carbsG: roundedTarget(intra?.carbGrams),
      notes: intra?.notes ?? input.directive?.duringSessionGuidance ?? [],
    },
    betweenSessions: null,
    postSession: {
      label: 'After training',
      timing: post ? 'After session' : 'Use normal meals',
      carbsG: roundedTarget(post?.carbGrams),
      proteinG: roundedTarget(post?.proteinGrams ?? input.directive?.proteinRecoveryDemand, 25),
      notes: post?.notes ?? input.directive?.postSessionGuidance ?? [],
    },
    hydrationNotes: input.directive?.duringSessionGuidance ?? [],
    coachingNotes: [
      input.directive?.explanation?.summary ?? 'Session fueling came from the Nutrition and Fueling Engine.',
    ],
  };
}

function nutritionFuelingTargetFromUnified(input: {
  result: UnifiedPerformanceEngineResult | null;
  hydration: ReturnType<typeof getHydrationProtocol>;
  date: string;
}): NutritionFuelingTarget {
  const target = input.result?.canonicalOutputs.nutritionTarget ?? null;
  const session = primaryUnifiedSession(input.result);
  const directive = target?.sessionFuelingDirectives[0] ?? input.result?.canonicalOutputs.sessionFuelingDirectives[0] ?? null;
  const priority = priorityFromSession(session);
  const calories = roundedTarget(target?.energyTargetRange ?? target?.energyTarget);
  const protein = roundedTarget(target?.proteinTargetRange ?? target?.proteinTarget);
  const carbs = roundedTarget(target?.carbohydrateTargetRange ?? target?.carbohydrateTarget);
  const fat = roundedTarget(target?.fatTargetRange ?? target?.fatTarget);
  const hydrationOz = roundedTarget(target?.hydrationTarget, input.hydration.dailyWaterOz ?? 96);
  const sodiumTarget = roundedTarget(target?.sodiumElectrolyteGuidance?.sodiumTargetRange, 0) || null;
  const reasons = [
    target?.explanation?.summary ?? 'Nutrition target resolved from the Unified Performance Engine.',
    ...(target?.explanation?.reasons ?? []),
  ].filter(Boolean);

  return {
    engineVersion: 'nutrition_fueling_engine_v1',
    canonicalPhase: target?.phase ?? input.result?.performanceState.phase.current,
    tdee: calories,
    adjustedCalories: calories,
    protein,
    carbs,
    fat,
    proteinModifier: 1,
    phaseMultiplier: 0,
    weightCorrectionDeficit: 0,
    message: reasons.join(' '),
    source: input.result ? 'daily_activity_adjusted' : 'base',
    fuelState: target ? fuelStateFromUnified(target, session) : 'rest',
    prioritySession: priority,
    deficitClass: target?.purpose === 'body_composition_support' || target?.purpose === 'weight_class_management_support' ? 'steady_deficit' : 'steady_maintain',
    recoveryNutritionFocus: target?.recoveryDirectives[0]?.focus === 'tissue_repair'
      ? 'impact_recovery'
      : target?.recoveryDirectives[0]?.focus ?? 'none',
    sessionDemandScore: Math.max(0, Math.min(95, Math.round(((session?.durationMinutes.target ?? 0) * (session?.intensityRpe.target ?? 0)) / 6))),
    hydrationBoostOz: Math.max(0, hydrationOz - 80),
    hydrationPlan: {
      dailyTargetOz: hydrationOz,
      sodiumTargetMg: sodiumTarget,
      emphasis: priority === 'recovery' ? 'baseline' : 'performance',
      notes: [
        ...(target?.sodiumElectrolyteGuidance?.electrolyteNotes ?? []),
        input.hydration.message,
      ],
    },
    sessionFuelingPlan: sessionFuelingPlanFromUnified({ directive, session, priority }),
    reasonLines: reasons,
    energyAvailability: null,
    fuelingFloorTriggered: Boolean(target?.riskFlags.some((flag) => flag.code === 'under_fueling_risk')),
    deficitBankDelta: 0,
    safetyWarning: nutritionSafetyWarningFromRisks(target?.riskFlags ?? []),
    safetyEvents: [],
    traceLines: input.result?.explanations.map((explanation) => explanation.summary) ?? reasons,
  };
}

function decisionTraceFromExplanations(explanations: Explanation[]): DecisionTraceItem[] {
  return explanations.slice(0, 8).map((explanation) => ({
    subsystem: explanation.kind === 'risk'
      ? 'risk'
      : explanation.summary.toLowerCase().includes('nutrition') || explanation.summary.toLowerCase().includes('fuel')
        ? 'fuel'
        : explanation.summary.toLowerCase().includes('readiness') || explanation.summary.toLowerCase().includes('recovery')
          ? 'recovery'
          : 'training',
    title: explanation.summary,
    detail: explanation.reasons.join(' '),
    humanInterpretation: explanation.reasons[0] ?? null,
    impact: explanation.impact === 'unknown' ? 'adjusted' : explanation.impact,
  }));
}

export function buildDailyAthleteSummaryFromUnified(input: {
  date: string;
  objectiveContext: MacrocycleContext;
  readinessProfile: ReadinessProfile;
  constraintSet: StimulusConstraintSet;
  medStatus: MEDStatus | null;
  hydration: ReturnType<typeof getHydrationProtocol>;
  workoutPrescription: WorkoutPrescriptionV2 | null;
  unifiedPerformance: UnifiedPerformanceEngineResult | null;
}): { summary: DailyAthleteSummary; nutritionTarget: NutritionFuelingTarget } {
  const session = primaryUnifiedSession(input.unifiedPerformance);
  const nutritionTarget = nutritionFuelingTargetFromUnified({
    result: input.unifiedPerformance,
    hydration: input.hydration,
    date: input.date,
  });
  const riskLevel = riskLevelFromUnified(input.unifiedPerformance);
  const explanations = input.unifiedPerformance?.explanations ?? [];
  const trainingReason = session?.explanation?.summary
    ?? input.unifiedPerformance?.canonicalOutputs.trainingBlock.explanation?.summary
    ?? 'Training was resolved from the Unified Performance Engine.';
  const readinessAdjustment = input.unifiedPerformance?.canonicalOutputs.readiness.recommendedTrainingAdjustment;
  const sessionRole = sessionRoleFromUnified(input.unifiedPerformance, session);

  return {
    nutritionTarget,
    summary: {
      date: input.date,
      engineVersion: input.unifiedPerformance?.engineVersion ?? DAILY_ENGINE_VERSION,
      generatedAt: input.unifiedPerformance?.performanceState.generatedAt ?? new Date().toISOString(),
      headline: input.unifiedPerformance?.finalPlanStatus === 'blocked'
        ? 'Plan blocked for safety'
        : input.unifiedPerformance?.canonicalOutputs.trainingBlock.goal
          ? `${input.unifiedPerformance.canonicalOutputs.trainingBlock.goal.replace(/_/g, ' ')} focus`
          : 'Daily athlete summary',
      summary: input.unifiedPerformance?.explanations[0]?.summary
        ?? 'Daily athlete summary was projected from unified performance state.',
      objective: input.objectiveContext.performanceObjective,
      macrocycleContext: input.objectiveContext,
      readinessProfile: input.readinessProfile,
      trainingDirective: {
        sessionRole,
        interventionState: input.unifiedPerformance?.finalPlanStatus === 'blocked' ? 'hard' : input.unifiedPerformance?.finalPlanStatus === 'caution' ? 'soft' : 'none',
        isMandatoryRecovery: sessionRole === 'recover' || Boolean(readinessAdjustment?.replaceWithMobility),
        focus: workoutFocusFromSession(session),
        workoutType: workoutTypeFromSession(session),
        intent: session?.title ?? input.unifiedPerformance?.canonicalOutputs.trainingBlock.explanation?.summary ?? 'Follow the unified performance plan.',
        reason: trainingReason,
        intensityCap: input.unifiedPerformance?.finalPlanStatus === 'blocked' ? 2 : null,
        durationMin: rangeTarget(session?.durationMinutes),
        volumeTarget: input.unifiedPerformance
          ? `${input.unifiedPerformance.canonicalOutputs.composedSessions.length} composed session${input.unifiedPerformance.canonicalOutputs.composedSessions.length === 1 ? '' : 's'}`
          : 'Unified performance state pending',
        keyQualities: session?.tissueLoads?.length ? session.tissueLoads : [session?.family ?? 'recovery'],
        constraintSet: input.constraintSet,
        medStatus: input.medStatus,
        source: 'daily_engine',
        prescription: input.workoutPrescription,
      },
      fuelDirective: {
        state: nutritionTarget.fuelState,
        prioritySession: nutritionTarget.prioritySession,
        deficitClass: nutritionTarget.deficitClass,
        recoveryNutritionFocus: nutritionTarget.recoveryNutritionFocus,
        sessionDemandScore: nutritionTarget.sessionDemandScore,
        calories: nutritionTarget.adjustedCalories,
        protein: nutritionTarget.protein,
        carbs: nutritionTarget.carbs,
        fat: nutritionTarget.fat,
        preSessionCarbsG: nutritionTarget.sessionFuelingPlan.preSession.carbsG,
        intraSessionCarbsG: nutritionTarget.sessionFuelingPlan.intraSession.carbsG,
        postSessionProteinG: nutritionTarget.sessionFuelingPlan.postSession.proteinG,
        intraSessionHydrationOz: nutritionTarget.sessionFuelingPlan.intraSession.fluidsOz,
        hydrationBoostOz: nutritionTarget.hydrationBoostOz,
        sodiumTargetMg: nutritionTarget.hydrationPlan.sodiumTargetMg,
        compliancePriority: nutritionTarget.prioritySession === 'recovery' ? 'recovery' : input.objectiveContext.weightClassState === 'driving' ? 'weight' : 'performance',
        adjustmentFlag: null,
        source: 'daily_engine',
        message: nutritionTarget.message,
        reasons: nutritionTarget.reasonLines,
        sessionFuelingPlan: nutritionTarget.sessionFuelingPlan,
        energyAvailability: nutritionTarget.energyAvailability,
        fuelingFloorTriggered: nutritionTarget.fuelingFloorTriggered,
        safetyWarning: nutritionTarget.safetyWarning,
      },
      hydrationDirective: {
        waterTargetOz: nutritionTarget.hydrationPlan.dailyTargetOz,
        sodiumTargetMg: nutritionTarget.hydrationPlan.sodiumTargetMg,
        protocol: 'Steady hydration support from the Nutrition and Fueling Engine.',
        message: nutritionTarget.hydrationPlan.notes[0] ?? input.hydration.message,
      },
      recoveryDirective: {
        emphasis: input.unifiedPerformance?.canonicalOutputs.readiness.recommendedTrainingAdjustment.type.replace(/_/g, ' ') ?? 'normal recovery',
        sleepTargetHours: 8,
        modalities: readinessAdjustment?.replaceWithMobility ? ['mobility', 'easy breathing'] : ['normal cooldown'],
        restrictions: input.unifiedPerformance?.blockingRiskFlags.map((flag) => flag.message) ?? [],
      },
      riskState: {
        level: riskLevel,
        score: input.unifiedPerformance ? Math.min(100, input.unifiedPerformance.riskFlags.length * 20 + input.unifiedPerformance.blockingRiskFlags.length * 30) : 35,
        label: riskLevel,
        drivers: input.unifiedPerformance?.riskFlags.map((flag) => flag.message) ?? ['Unified performance state is unavailable.'],
        flags: input.readinessProfile.flags,
        anchorSummary: input.unifiedPerformance?.canonicalOutputs.composedSessions.some((item) => item.protectedAnchor)
          ? 'Protected workouts remain fixed anchors.'
          : null,
      },
      decisionTrace: decisionTraceFromExplanations(explanations),
      overrideState: {
        status: input.unifiedPerformance?.finalPlanStatus === 'blocked' ? 'override_available' : 'following_plan',
        note: input.unifiedPerformance?.finalPlanStatus === 'blocked'
          ? 'A blocking risk requires review before progressing.'
          : 'Daily summary follows the Unified Performance Engine output.',
      },
    },
  };
}
